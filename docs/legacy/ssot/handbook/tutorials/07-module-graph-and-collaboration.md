---
title: 模块图谱与跨模块协作 教程 · 剧本集（从 0 到 1）
status: draft
version: 1
---

# 模块图谱与跨模块协作 教程 · 剧本集（从 0 到 1）

> **定位**：本文是 `docs/ssot/handbook/` 的“维护者教程/剧本集”（how-to），用于新成员上手、老成员回味：把 Logix 的 **模块解析语义（imports/root/link）** 与 **跨模块协作的正确写法** 讲清楚，并把常见错误（Missing*）变成“可复现 + 可修复”的知识。  
> **重要**：本文不是裁决来源；凡涉及 MUST/协议/边界的最终口径以 SSoT 为准（`docs/ssot/runtime/**`、`docs/ssot/platform/**`）。

## 0. 最短阅读路径（10–20 分钟先把脑内语言统一）

1. “模块图谱实现笔记（C 面）”：`docs/ssot/handbook/reading-room/long-chain/long-chain-c-module-graph-plane.md`
2. “Module/Logic 与运行时容器关系”：`docs/ssot/runtime/logix-core/api/02-module-and-logic-api.06-runtime-container.md`
3. “解析失败口径（Missing* errors）”：`docs/ssot/runtime/logix-core/observability/09-debugging.md`
4. 三个最短“可复现实证”（直接读测试）：
   - `$.use` missing import：`packages/logix-core/test/internal/Bound/BoundApi.MissingImport.test.ts`
   - React imported module：`packages/logix-react/test/Hooks/useImportedModule.test.tsx`
   - Link：`packages/logix-core/test/Link/Link.test.ts`

## 1. 心智模型：你在和哪三类东西打交道（定义/实现/实例）

这块最容易“看起来能用但解释全断链”，根因通常是：把不同层次的对象混用成同一种“模块”。

### 1.1 `ModuleDef` / `Module` / `ModuleImpl` / `ModuleRuntime`

用一句话区分：

- **`ModuleDef`**：模块定义（蓝图，不含实例），用 `Logix.Module.make(...)` 得到。
- **`Module`**：带 `.impl` 的模块定义（仍然是蓝图，但已经绑定初始 state / imports / processes 等 assembly 信息），用 `ModuleDef.implement(...)` 得到。
- **`ModuleImpl`**：运行时装配用的实现工件（assembly blueprint），React/Runtime 入口消费它。
- **`ModuleRuntime`**：模块实例（真正跑起来的那一份），有 `moduleId/instanceId/getState/dispatch/actions$/changes/...`。

关键锚点（你写教程/Devtools/平台时必须记住）：

- `ModuleTag` 是身份锚点（`Context.Tag`）：`module.tag`。
- `instanceId` 是运行期实例锚点：**同一个 ModuleTag 可以有多个 instanceId**（多实例），所以“只靠 Tag 全局 resolve”一定会有歧义。

代码锚点：

- public：`packages/logix-core/src/Module.ts`
- internal：`packages/logix-core/src/internal/runtime/core/module.ts`

### 1.2 `ModuleHandle` / `ModuleRef`：跨边界的“只读句柄”

跨模块协作时，Logix 不鼓励你“直接拿到别人的 runtime 并随意操作”。对外暴露的是更窄的句柄：

- **`ModuleHandle`（core / Logic 内）**：`$.use(Child)` 的结果，通常只包含 `read/dispatch/actions$/changes/actions` 等面向协作的最小能力。
  - 入口：`packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`（`$.use` 代理 + strict 检查）
- **`ModuleRef`（react / UI 内）**：`useModule(...)`/`host.imports.get(...)` 的结果，包含 `runtime` 但仍受 hooks 与 Provider 约束。
  - 入口：`packages/logix-react/src/internal/store/ModuleRef.ts`

## 2. 核心裁决：模块解析三分法（imports / root / link）

你可以把“跨模块协作”当作三条互斥的语义通道；不要混用，也不要让它们互相 fallback：

1. **imports（strict，树内协作）**：`$.use(Child)` / `host.imports.get(Child.tag)` 只能解析到“父模块实例 scope 内显式 imports 的子模块实例”。
2. **root（global，根单例）**：`Root.resolve(Tag)` 只能解析到“Runtime Tree 根提供者的单例”，且不受 nearer-scope override 影响。
3. **link（显式胶水）**：`Process.link(...)`/`Link.make(...)` 把跨模块协作逻辑显式化成一个独立 Effect（可观测、可诊断、可回放/可 IR 化的前提）。

为什么必须三分法：因为平台/Devtools/测试需要回答三个问题：

- “这个协作关系属于哪一种语义通道？”（否则无法解释实例选择）
- “谁负责提供它？”（否则 wiring 错误无法定位）
- “如何做 deterministic 测试与回放？”（否则 mock/注入会随机失效）

权威口径入口：

- `docs/ssot/runtime/logix-core/api/02-module-and-logic-api.06-runtime-container.md`
- `docs/ssot/handbook/reading-room/long-chain/long-chain-c-module-graph-plane.md`

## 3. 剧本集

### A1. `$.use` strict imports：正确写法（以及为什么它是 run-only）

**目标**：在 Parent 的 run 逻辑里拿到 Child 的只读句柄，并通过 dispatch 协作。

最小写法（伪代码，强调位置与语义，不追求可直接复制）：

1. Parent 必须在 `implement({ imports: [Child.impl] })` 声明 imports；
2. `$.use(Child)` 必须发生在 run 阶段（`setup` 阶段会被相位守卫拒绝）；
3. 通过 `child.dispatch(...)` 或 `child.actions.xxx(...)` 协作（不要偷偷写别人的 state）。

为什么 `$.use` 是 run-only：

- imports-scope 的解析依赖“实例绑定”；在 setup 阶段拿不到稳定的 instance scope；
- 允许在 setup resolve 会让 wiring 错误变成“有时能用、有时 silent fallback”，Devtools/测试无法证明一致性。

代码锚点：

- `$.use` 守卫与 MissingModuleRuntimeError：`packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
- 相位错误构造（LogicPhaseError）：`packages/logix-core/src/internal/runtime/core/LogicDiagnostics.ts`

### A2. `$.use` 失败：`MissingModuleRuntimeError`（最常见 wiring 错误）

**症状**：Effect/Cause 里出现 `MissingModuleRuntimeError`，并带这些关键字段：

- `entrypoint: logic.$.use`
- `mode: strict`
- `tokenId: <ChildModuleId>`
- `from: <ParentModuleId>`
- `fix: ... imports: [Child.impl] ...`

最短复现实证：

- `packages/logix-core/test/internal/Bound/BoundApi.MissingImport.test.ts`

**修复**：把子模块显式加入 imports（不要引入全局 registry 兜底）：

- 在父模块 `implement` 里：`imports: [Child.impl]`
- 或者如果你真正需要的是“全局单例”，改用 `Root.resolve(Child.tag)`（见 A3）

### A3. Root 单例：`Root.resolve(Tag)`（以及为什么它不受 RuntimeProvider.layer 影响）

**你在解决什么**：表达“这个依赖是根单例（global），不是 imports 子模块”。

要点：

- `Root.resolve` 总是从 RootContext 读取；**不会被更近 scope 的 Layer/Context override** 影响。
- 默认 `waitForReady=false`：避免在 layer/setup 期误用导致死锁；run 期可用 `$.root.resolve`（它会按需等待 RootContext ready）。

代码锚点：

- `Root.resolve`：`packages/logix-core/src/internal/root.ts`（对外入口 `packages/logix-core/src/Root.ts`）
- RootContext：`packages/logix-core/src/internal/runtime/core/RootContext.ts`
- 缺失根提供者：`MissingRootProviderError`（同文件，Slim fields + fix[]）

常见误解（必须在教程里反复强调）：

- React 里的 `RuntimeProvider.layer` 是“当前 runtime 环境的依赖注入”，但它**不是** Root.resolve 的覆盖手段。
- 如果你要在 React 环境里拿“当前 runtime 的单例”，请用 `useModule(ModuleTag)`；不要用 `Root.resolve`。

### A4. React：`host.imports.get(Child.tag)`（严格 imports 的 UI 侧等价物）

**目标**：在 React 组件树中拿到“同一个 host 实例 scope”里的子模块实例，并安全订阅/派发。

最短读法（看测试即可）：

- 成功路径：`packages/logix-react/test/Hooks/useImportedModule.test.tsx`
- 分层/孙子模块：`packages/logix-react/test/Hooks/useImportedModule.hierarchical.test.tsx`
- 失败路径（missing import）：同上测试文件内的 missing-import 用例

实现锚点：

- 解析函数：`packages/logix-react/src/internal/store/resolveImportedModuleRef.ts`
- `ModuleRef.imports.get` 接口：`packages/logix-react/src/internal/store/ModuleRef.ts`

错误口径（missing import）：

- `MissingImportedModuleError`，`entrypoint: react.useImportedModule/imports.get`，`mode: strict`
- fix[] 里会同时提示：补 imports / 确认 parent 是 instance scope（`useModule(ParentImpl, { key })`）/ 若想要 singleton 改用 `useModule(Child.tag)` 或 `Root.resolve`

### A5. Link：把“跨模块胶水”显式化（并区分 blackbox vs declarative）

Link 的第一性目标是：把协作关系变成“可见资产”，而不是散落在 watcher/手写逻辑里。

#### A5.1 Blackbox Link（best-effort，不保证 same-tick）

- public 入口：`packages/logix-core/src/Link.ts`（`Link.make` → `Process.link`）
- 运行时实现：`packages/logix-core/src/Process.ts`（会记录一条 best-effort 诊断提示）

适用场景：

- 你只需要“跨模块编排”，不要求同 tick 内强一致收敛；
- 或者你正在从 watcher 胶水迁移，先显式化协作边界再逐步 IR 化。

最短实证：

- `packages/logix-core/test/Link/Link.test.ts`

#### A5.2 Declarative Link（受限 IR，支持强一致/可导出）

`Link.makeDeclarative` / `Process.linkDeclarative` 的定位是：用受限 DSL 导出 `DeclarativeLinkIR`，让跨模块收敛可证明。

关键限制（经常踩坑）：

- `ReadQuery` 必须是 static 且具备 `readsDigest`；否则会 fail-fast，并提示如何修复（用 `ReadQuery.make(...)` 或标注 fieldPaths）。

代码锚点：

- `Process.linkDeclarative`：`packages/logix-core/src/Process.ts`
- IR 结构：`packages/logix-core/src/internal/runtime/core/DeclarativeLinkIR.ts`

## 4. 代码锚点（Code Anchors）

- Module public API：`packages/logix-core/src/Module.ts`
- Bound API（`$`）：`packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
- strict missing import 测试：`packages/logix-core/test/internal/Bound/BoundApi.MissingImport.test.ts`
- Root.resolve：`packages/logix-core/src/internal/root.ts`
- RootContext：`packages/logix-core/src/internal/runtime/core/RootContext.ts`
- React imported module：`packages/logix-react/src/internal/store/resolveImportedModuleRef.ts`
- React hooks tests：`packages/logix-react/test/Hooks/useImportedModule.test.tsx`
- Link / Process.link：`packages/logix-core/src/Link.ts`、`packages/logix-core/src/Process.ts`
- DeclarativeLinkIR：`packages/logix-core/src/internal/runtime/core/DeclarativeLinkIR.ts`

## 5. 验证方式（Evidence）

如果你改了模块解析/协作语义，最短的“不会自欺”的证据路径是：

- strict imports：`packages/logix-core/test/internal/Bound/BoundApi.MissingImport.test.ts`
- React imports：`packages/logix-react/test/Hooks/useImportedModule.test.tsx`
- Root provider：`packages/logix-core/test/Runtime/HierarchicalInjector/hierarchicalInjector.root-provider.test.ts`
- Link：`packages/logix-core/test/Link/Link.test.ts`

## 6. 常见坑（Anti-patterns）

- 用隐式全局 registry 去“自动 resolve module runtime” → 多实例下必然歧义，诊断/回放/测试都会失真。
- 把 imports 当成 root 用（或反之）→ wiring 责任边界不清，最后只能靠猜。
- 在 setup 阶段调用 `$.use` / `$.onAction` 等 run-only API → 相位守卫会 fail-fast；修复方式是把解析移动到 run 段。
- 以为 `RuntimeProvider.layer` 能 override `Root.resolve` → 这是刻意禁止的（Root.resolve 的语义就是“不受 override 影响的根单例”）。
- 用 Blackbox Link 期待 same-tick 强一致 → 需要迁到 Declarative Link（受限 IR）或其它 `C_T` 机制（对齐 073）。

