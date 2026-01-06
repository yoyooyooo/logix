---
title: "Runtime Logix · 分形 Module 树级 TagIndex 与 Universe 拓扑视图"
status: draft
version: 0.1.0
layer: L9
priority: 2150
related:
  - ../runtime-v3-core/README.md
  - ./04-devtools-and-runtime-tree.md
  - .codex/skills/project-guide/references/runtime-logix/logix-core/impl/01-app-runtime-and-modules.md
  - .codex/skills/project-guide/references/runtime-logix/logix-core/runtime/05-runtime-implementation.md
  - docs/specs/sdd-platform/impl/app-and-universe-view.md
---

# Runtime Logix · 分形 Module 树级 TagIndex 与 Universe 拓扑视图（草案）

> 草稿目的：在已上线的 App 级 Tag 冲突检测基础上，规划一条“分形 Module 树级 TagIndex + Universe 拓扑视图”的演进路线，并约束实现边界，避免一上来就陷入 AST 全解析 / 任意 Layer 深度 inspect 的高成本方案。

本草案回答三件事：

- 我们到底要的“分形树级 TagIndex + Universe 拓扑”是什么，不是什么；
- 如何在现有 `ModuleImpl` / `Logix.Runtime.make` / AppRuntime 设计下，以最小增量拿到可用的 TagIndex 与拓扑信息；
- 哪些能力属于 v1.5+/Studio 阶段推进，而不是 Runtime v1 的硬要求。

## 1. 目标与非目标

### 1.1 目标（What we want）

1. **分形树级 TagIndex**  
   - 输入：某个 Root ModuleImpl（或等价的 ModuleDef 树）；
   - 输出：覆盖整棵分形模块树的 TagIndex，至少能回答：
     - 哪些 Module 在提供某个 Tag（Module Tag / Service Tag）；
     - 哪些 Module 依赖该 Tag（后续结合 IntentRule / Logic 分析）；
     - Tag Key 是否在模块树任意层级发生冲突。

2. **Universe 运行时拓扑视图（最小版）**  
   - 使用上述 TagIndex + Module imports 信息，在 Studio/DevTools 中画出一张“模块/服务星图”：
     - 节点：Module / Service / (可选) Root Runtime；
     - 边：imports（模块组合关系）+ “某模块提供/依赖某 Tag”的连线；
   - 先做到 **只读 + 高亮冲突/缺失**，后续再考虑拖拽编辑等高级交互（交由 `app-and-universe-view.md` 统筹）。

3. **保持 Runtime 轻量与可控**  
   - 不改变现有 Runtime 行为（尤其是 Env 扁平合并的策略）；
   - TagIndex 的构建应当是“按需、可关闭”的调试/平台能力，而不是每次 Runtime 创建都强制执行的重活；
   - 明确“Runtime 负责给出结构化 TagIndex / Module 树”，“平台负责画图与做架构检查”。

### 1.2 非目标（What we explicitly avoid）

- **不在本阶段实现任意 Layer 的深度静态分析**  
  - 即：不尝试对所有 `Layer.mergeAll / Layer.provide` 组合做完全恢复 Tag 拓扑的工作；
  - 优先只在“规范路径”上（ModuleImpl.imports / 未来 ModuleDef.providers/exports）构建 TagIndex。

- **不在 Runtime 层做 AST 级 ModuleDef 提取**  
  - AST → ModuleDef IR 的职责由平台/CLI 工具承担，见 `app-and-universe-view.md`；
  - Runtime 只消费 ModuleImpl / ModuleDef（已经是结构化对象），不直接解析源文件。

- **不在 Runtime v1 中引入强制的 Env 裁剪**  
  - 仍然保持 “Env 扁平合并 + exports 只用于类型/平台检查” 的 v3 取舍；
  - TagIndex 的职责是“检测冲突 + 提供拓扑信息”，而不是“限制 Env 中可见的 Tag 集合”。

## 2. 现状基线：App 级 TagIndex 与 ModuleImpl 分形结构

### 2.1 已有能力回顾

- **AppRuntime 级 TagIndex**（已实现）：  
  - 代码：`packages/logix-core/src/internal/runtime/AppRuntime.ts`；
  - 行为：
    - 基于 `AppModuleEntry.module`（Module Tag）与可选的 `serviceTags` 构建 TagIndex；
    - 合并 Layer 前调用 `validateTags`，发现同一 Tag Key 被多个模块声明时抛 `_tag: "TagCollisionError"`；
    - 错误对象携带结构化 `collisions: { key, conflicts[] }[]`，便于 DevTools/日志消费。

- **分形 ModuleImpl 组合**（已实现）：  
  - 代码：`ModuleTag.implement` + `withLayer/withLayers`（`ModuleFactory.ts`）；  
  - Root Runtime 构建：`Logix.Runtime.make(root, { layer, onError })`（`root` 可为 program module 或其 `.impl`）仅把 **一个 Root ModuleImpl** 作为 `AppModuleEntry` 传给 `makeApp`；
  - 分形结构主要体现为：Root ModuleImpl 的 `imports` 中递归嵌套其他 ModuleImpl / Layer。

### 2.2 现有缺口

- App 级 TagIndex 只观察 `AppModuleEntry[]`，对于 Root ModuleImpl.imports 内部的 Service Tag 完全不可见；
- Universe 视图规划（`app-and-universe-view.md`）更多基于未来的静态 `ModuleDef`，尚未与当前的 ModuleImpl 组合方式做一次“桥接方案”；
- DevTools 草案（`runtime-logix-devtools-and-runtime-tree.md`）没有明确 TagIndex 的来源与结构，只是笼统提到“基于 TagIndex 构建拓扑”。

> 本草案接下来的所有设计，都在“Root ModuleImpl → 分形 ModuleImpl 树 → TagIndex / 拓扑 JSON”这条路径上展开，不直接触碰 AST 与 Layer 内部细节。

## 3. 分阶段方案概览（v1.5+ Studio 路线）

### Phase 1：ModuleImpl 树级 TagIndex（无 AST、无 UI）

**目标**：给一个 Root ModuleImpl，得到一份纯 JSON 的 “分形 Module 树 + TagIndex” 结构，供 CLI/Studio 消费。  
**范围**：

- 定义最小 IR：

```ts
interface FractalModuleNode {
  readonly id: string
  readonly implSymbol?: string           // 可选：导出的 Impl 名称，供平台映射到源文件
  readonly children: ReadonlyArray<FractalModuleNode>

  readonly providedTags: ReadonlyArray<{
    readonly key: string
    readonly tag: Context.Tag<any, any>  // 运行时内部可用，序列化时只导出 key+owner
    readonly source: "module" | "service"
  }>
}

interface FractalTagIndexEntry {
  readonly key: string
  readonly providers: ReadonlyArray<{ moduleId: string }>
}

interface FractalTagIndexSnapshot {
  readonly rootModuleId: string
  readonly modules: ReadonlyArray<FractalModuleNode>
  readonly tags: ReadonlyArray<FractalTagIndexEntry>
}
```

- 提供一个 **运行时内部 API**（不暴露到业务层）：

```ts
// 伪接口：具体挂载位置待定（可在 runtime-logix impl 或内部 DevTools hook 中）
function buildFractalTagIndex(rootImpl: ModuleImpl<any, AnyModuleShape, any>): FractalTagIndexSnapshot
```

- Tag 收集策略（严格限定在“规范路径”）：
  - Module Tag：每个 ModuleImpl.module 都视为一个 Tag Provider（source = "module"）；
  - Service Tag：仅收集在 ModuleImpl 层 **显式注册** 的 Service Tag（例如未来规划中的 `ModuleImpl.providers` / `exports`），不解析任意 Layer；
  - imports：沿 `ModuleImpl.imports` 递归构建子节点关系。

**不做的事**：

- 不尝试从 `Layer.Layer` 本身中发现 Tag（例如 `Layer.succeed(SomeTag, impl)`）；
- 不试图在 Phase 1 中把 Tag 使用方（“谁依赖了某个 Tag”）也一并分析出来——那属于平台/AST 侧的工作。

### Phase 2：与 Universe View / ModuleDef 的桥接（CLI + Studio 最小图）

**目标**：在 `app-and-universe-view.md` 描述的 Universe 视图基础上，把分形 ModuleImpl 树与 ModuleDef IR 串起来，拿到可画图的拓扑 JSON。

- 在 CLI 或 Studio 后端增加一条流程：
  1. 从代码解析 Root ModuleImpl（或由用户/配置指定 Root Impl 符号）；
  2. 通过运行时 Hook 获取 `FractalTagIndexSnapshot`；
  3. 并行解析源代码中的 ModuleDef / Logic / IntentRule，构建 ModuleIR / Tag 使用 IR；
  4. 将运行时 TagIndex 与静态 IR 对齐（通过模块 id / 导出名映射）：
     - 验证 Tag Provider 是否都有对应 ModuleDef / Store；  
     - 将 Tag Provider/Consumer 边加入 Universe 图。

- 在 Studio 中实现最小 Universe 视图：
  - 节点：Root Runtime / Module / Service Tag；
  - 边：
    - imports：`FractalModuleNode.children`；
    - provides：TagIndex.providers → Module 节点；
    - consume（可选）：来自静态 IR 的 “Logic 使用 Tag” 边；
  - 高亮：
    - Tag Key 冲突（多个 providers）；
    - Tag 被消费但没有 provider；
    - Module 没有任何 Tag 提供/消费（孤岛模块）。

### Phase 3：DevTools / Universe 深度集成（可视化 + 调试）

**目标**：将 TagIndex/拓扑视图与 Runtime 调试能力打通，形成 Universe/Runtime Tree 的统一 DevTools 入口。  
这阶段的内容主要留给 `runtime-logix-devtools-and-runtime-tree.md` 和 Studio 规划细化，本草案只做占位：

- 在浏览器 DevTools 或 CLI 中提供：
  - 实时查看当前 Runtime 的 FractalTagIndexSnapshot；
  - 点击某个 Module / Tag 高亮相关 Fiber / 事件 / IntentRule；
  - 将“Tag 冲突错误（TagCollisionError）”与 Universe 视图中的问题边直接关联起来。

## 4. 技术约束与实现边界

为避免实现失控，本草案对“可解析子集”做出以下限定：

1. **ModuleImpl.imports/ providers 写法约束**  
   - `imports` 数组只接受：
     - 其他 ModuleImpl 常量；
     - 少量标准化的 Layer 工厂（例如未来的 `Layer.service(Tag, impl)`），用于托管 Service Tag 提供；
   - 不支持在 imports 数组内写复杂表达式（条件、三元、立即调用）——这部分可以被视为“灰盒”，不纳入分形树。

2. **Tag Provider 列表来源限定**  
   - Phase 1 仅从 ModuleImpl 本身的结构化字段收集 Tag（Module Tag + 显式 Service Tag 列表）；
   - 对“深藏在 Layer 实现内部”的 Tag 提供行为，不承担 100% 覆盖的责任，只在未来若引入标准 Provider API 时再扩展。

3. **性能与开销控制**  
   - FractalTagIndex 构建默认作为 **调试/平台能力**，不在每次 Runtime 创建时自动运行，可以通过：
     - 显式调用 Hook（CLI/Studio）；
     - 或在 Dev 模式下由 RuntimeProvider/DevTools 注入。
   - 对于超大模块树，可以支持简单的深度/宽度限制（只展开 N 层 imports），减少观测开销。

## 5. 路线图与任务拆分（建议）

> 本节给未来实现者一个可执行的 checklist，具体归档到 `runtime-logix-core-gaps-and-production-readiness.md` 与 Studio 相关 Plan 中。

**Phase 1（ModuleImpl 树级 TagIndex · CLI 起步）**

- [ ] 在 runtime-logix impl 层定义 `FractalModuleNode / FractalTagIndexSnapshot` 类型（只在内部使用）；
- [ ] 提供 `buildFractalTagIndex(rootImpl)` 的实现草图：
  - [ ] 递归遍历 `rootImpl.imports` 构建分形 ModuleImpl 树；
  - [ ] 为每个节点收集 Module Tag + 显式 Service Tag（接口形式与现有 AppRuntime `TagInfo` 保持一致）；  
  - [ ] 聚合为 tags 列表（key → providers），并沿用 `TagCollisionError` 语义（多 providers 即冲突，但在 CLI/Studio 场景下可选择“仅标记、不抛错”）。
- [ ] 在 packages/logix-core 增加一组最小单测：
  - [ ] 三个 ModuleImpl，其中两个 imports 某个共享 Service，验证 TagIndex 中 providers 正确；
  - [ ] 人为制造 Tag Key 冲突，验证 `buildFractalTagIndex` 报告冲突信息。

**Phase 2（与 Universe / ModuleDef 桥接）**

- [ ] 在 Studio/CLI 侧实现：
  - [ ] 从 Root Impl 符号出发，调用运行时 Hook 获取 `FractalTagIndexSnapshot`；
  - [ ] 并行构建 `ModuleIR`（见 `app-and-universe-view.md`），并用模块 id 对齐两者；
  - [ ] 定义最小拓扑 JSON（节点/边）格式，供前端渲染。
- [ ] 在 Universe 视图中落一个“最小星图”：
  - [ ] 绘制 Module 节点 + Tag 节点 + imports/provides 边；
  - [ ] 高亮 Tag 冲突/缺失情况。

**Phase 3（DevTools 深度集成）**

- [ ] 在 `runtime-logix-devtools-and-runtime-tree.md` 中补充：
  - [ ] FractalTagIndexSnapshot 与 RuntimeMeta 的集成点；
  - [ ] 在浏览器 DevTools/CLI 中动态获取/刷新 TagIndex 的策略；
  - [ ] 与 DebugSink / Lifecycle / App 级 events$ 的联合使用场景。

---

**小结**：  
本草案把“分形 Module 树级 TagIndex + Universe 拓扑视图”收敛为一条分阶段、可增量实施的路线：  
- 先在 Runtime 侧提供 **结构化 TagIndex + 分形 ModuleImpl 树快照**；  
- 再在 Studio/CLI 侧把它与 ModuleDef/Universe 视图桥接起来；  
- 最后交给 DevTools 和 Universe UI 做交互与调试体验的深挖。  
整个过程都严格控制在“规范路径 + 可解析子集”内，避免在 PoC 阶段就把自己拖进 Layer 级全景分析的泥沼。 
