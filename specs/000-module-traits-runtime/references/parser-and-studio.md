# Reference: Parser / Studio 与 Module Traits 的对齐

> 作用：说明 Parser / Studio（包括未来的全双工平台侧）如何理解 Module 图纸与 StateTrait，并与 SDD / v3 文档对齐。  
> 对应 spec：FR-005、FR-012、部分 User Stories（Devtools / Studio 统一消费 Graph）、以及 v3 SDD 相关草案。

---

## 1. 总体目标：把 Module 图纸变成 Studio 可消费的 IR

本特性中，Module 图纸的标准形态为：

```ts
export const CounterWithProfile = Logix.Module.make("CounterWithProfile", {
  state: StateSchema,
  actions: Actions,
  traits: StateTrait.from(StateSchema)({
    // ...
  }),
})
```

Parser / Studio 的核心目标：

- 在不运行业务代码的前提下，从 TS 源码中提取：
  - Module 基本信息（id、文件路径、state/actions 结构）；  
  - traits 结构（StateTraitSpec）与对应的 Program/Graph；  
- 以统一 IR 形式暴露给 Studio / 平台侧：  
  - 用于渲染模块图谱（Module Graph + StateTraitGraph）；  
  - 用于生成/更新 SDD / IntentSpec；  
  - 用于在未来实现“双向同步”（代码 ↔ Studio 编辑）。

---

## 2. AST 识别模式与稳定的 DSL 形状

为了让 Parser 工作简单可靠，需要保持 DSL 形状稳定且可预测。

推荐的 AST 模式：

1. 识别 `Logix.Module.make("ModuleId", { ... })` 调用：
   - 第一参数为模块 ID（字符串字面量为最佳）；  
   - 第二参数为对象字面量或常量引用。  
2. 在第二参数中查找：
   - `state: <SchemaExpr>`：任意 Schema 表达式，但尽量是引用（如 `StateSchema`）；  
   - `actions: <ActionsExpr>`：Action 定义（可选）；  
   - `traits: StateTrait.from(<StateSchemaRef>)(<SpecObject>)`：
     - 要求 `from` 的参数与 `state` 使用的 Schema 在语义上对应（同一个引用或可静态推断等价）。  

Parser 侧可以做两级识别：

1. 只基于 AST 结构识别“这是一个 Module 图纸 + StateTrait.from 的组合”；  
2. 在需要时，调用共享的 `StateTrait.build` 逻辑（见下节），在安全环境中构建 Program/Graph。

这样可以避免在 Parser 中重新实现一套“解析 traits → Graph”的规则。

---

## 3. 共享 StateTrait.build：避免“双实现”

spec 要求 `StateTrait.build` 是纯函数，只依赖：

- `StateSchema`（Schema 对象）；  
- `StateTraitSpec`（由 `StateTrait.from(StateSchema)({ ... })` 得到的 spec 对象）。

实现建议：

- 将 StateTrait 内核设计为可在“非 Runtime 环境”下运行：  
  - 不访问全局可变状态；  
  - 不依赖 RuntimeProvider / Layer 环境；  
  - 失败时只返回结构化错误或抛出同步错误。  
- Parser / Studio 可通过两种方式复用该逻辑：
  1. 在 Node 环境中直接 import `@logixjs/core/StateTrait`，对选定模块执行 build；  
  2. 将 StateTrait 内核编译为可独立运行的 bundle（甚至 WASM），由 Studio 进程/浏览器侧调用。

通过共享 `build`：

- 可以确保 Runtime 与 Studio/Parser 对 traits 的理解完全一致；  
- 避免出现“Studio 画出来的 Graph 和真正 Runtime 行为不一致”的情况。

---

## 4. Studio 视图：从 Module Graph 到 Trait Graph

在 Platform / Studio 侧，Module Graph 与 StateTraitGraph 可以以嵌套方式呈现：

- Module 节点：来源于 v3 / Runtime-Logix 的 Module/Flow 图谱；  
- 每个 Module 节点下挂一张 StateTraitGraph：
  - 字段节点、Trait 类型（computed/source/link）、外部资源节点；  
  - 可选组合 Action/Flow/EffectOp 信息，构成完整“模块内部视图”。

Studio 可以提供的操作包括：

- 只读视图：浏览现有 Module 的 StateTraitGraph，理解字段依赖与资源依赖；  
- 引导式编辑：在图上为字段添加/删除 Trait（例如从“普通字段”升级为“computed”或“source”）；  
- 导出/同步：把修改后的 Trait 变更回写到 TS 源码（见下一节）。

这些能力应与 SDD / IntentSpec 保持对齐：  
- Module 图纸 + StateTraitGraph 可视为实现侧对“状态与数据依赖”的落地表达；  
- SDD 中的 Flow/Intent 可通过映射规则与这些结构互相投影。

---

## 5. 从 Studio 回写代码：受控的元编程

为了支持全双工（代码 ↔ Studio），需要定义一套**受控的回写策略**：

1. Studio 只允许在有限范围内修改代码：
   - 添加/删除/修改 `traits` 槽位中的 entries；  
   - 在必要时对 `StateSchema` 做有限扩展（例如新增 computed 字段）。  
2. 回写方式：
   - 基于 AST 对原文件做结构化编辑（不使用字符串替换）；  
   - 保留用户手写的注释和格式尽量不变。  
3. 冲突处理：
   - 若用户手动修改了同一段 traits 定义，导致 Studio 的 IR 与实际源码不一致：  
     - 首选方案是提示冲突，让用户选择“以源码为准”或“以 Studio 编辑为准”；  
     - Studio 不在暗中覆盖用户修改。

本文件只定义策略方向，具体 AST 编辑工具链可在后续实现阶段确定（例如基于 TS Compiler API / Babel / 自研工具）。

---

## 6. 与 SDD / 平台侧文档的接口

在更上层的 SDD / 平台规划中，Module / Flow / Intent / Runtime 被视为同一条链路上的不同层级：

- Intent / Flow（v3 SDD 文档）：描述“业务想做什么”；  
- Module 图纸：描述“这个模块内部的状态与交互如何组织”；  
- StateTraitGraph：描述“状态字段之间、与外部资源之间的依赖关系”；  
- EffectOp 流：描述“实际运行时发生了什么”。

Parser / Studio 的职责是：

- 把 Module 图纸与 StateTraitGraph 作为“实现端”的结构视图；  
- 与 SDD / IntentSpec 建立映射（例如某些 Trait 与某些 Quality/Constraint 相关）；  
- 为全双工平台提供：
  - 从 Intent/SDD 跳到具体 Module / Trait 的能力；  
  - 从运行时事件回跳到 Intent/SDD 的能力（间接通过 Module / Trait）。

因此，本 reference 文档需要与：

- `docs/specs/sdd-platform/ssot` 中的 SDD / Mapping 文档；  
- `.codex/skills/project-guide/references/runtime-logix` 中的 Runtime / Flow / Module 说明  

保持概念对齐，如要调整术语或映射关系，应优先更新上述上游文档，再回流到本 feature 的 spec / plan / references。

---

## 7. Phase 与后续工作

在当前 plan 中，Parser / Studio 集成被作为 Phase 5（规划级）：

- 本文件完成后，即可作为 Studio / Parser 实现的输入规范；  
- 在真正开始实现前，应先：
  - 确认 StateTrait.build 内核稳定；  
  - 确认 EffectOp / Devtools 已经能稳定提供 Graph + Timeline 信息。

这样可以保证 Parser / Studio 不是在“流沙地基”上做集成，而是站在已经稳定的 Trait / Runtime 契约之上。
