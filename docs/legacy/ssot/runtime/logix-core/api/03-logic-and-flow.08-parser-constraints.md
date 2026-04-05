# 8. Fluent DSL 的 Hard Constraints（Parser 保障子集）

为了保证平台解析的鲁棒性，当前主线对 Fluent DSL 制定了明确的“白盒子集”约束：

1.  **触发 API 分拆**
    - 本地 State：使用 `$.onState(selector)`，语义等价于 `$.flow.fromState(selector)`；
    - 本地 Action：使用 `$.onAction(predicate)`，语义等价于 `$.flow.fromAction(predicate)`；
    - 任意 Stream（含跨 Module）：使用 `$.on(stream)`，典型用法是 `$.on($Other.changes(...))`。
      现在通过 `$.onState` / `$.onAction` / `$.on` 三个独立API明确区分，Parser 无需推断参数类型。

2.  **StoreHandle 能力边界**
    - `$.use(ModuleSpec)` 返回的句柄仅暴露：`read(selector?)` / `changes(selector)` / `dispatch(action)`；
    - `mutate` / `update` 等写接口只存在于 **当前 Module 的 `$.state`** 中；
    - 任何跨模块直接写入他库 State 的行为被视为违反运行时契约。

3.  **白盒模式的结构约束**
    - Parser 只对形如 `yield* $.onState(...).op1().op2().update/mutate/run*(...)` / `yield* $.onAction(...).op().update/mutate/run*(...)` / `yield* $.on(stream).op().run*(...)` 的 **单语句直接调用** 提供结构化解析；
    - 一旦将 Fluent 链拆解为中间变量或闭包包装（例如 `const flow = $.onState(...).op(); yield* flow.run(effect)`），该段代码即被视为 Raw Mode（黑盒）。

4.  **Intent.IR 的生成路径**
    - 白盒 Fluent 规则会被映射为 IntentRule IR（包括 L1/L2 等规则形态），Intent 不再以单独命名空间形式出现；
    - Raw Mode（裸 `flow.pipe` / 复杂 `Effect.gen`）不会强行还原为 IntentRule，而是以 Code Block 形式出现在 Logic Graph 中。

上述约束是当前主线的“编译期契约”：

- 业务层若遵守这些写法，可以获得稳定的类型推导与平台可视化支持；
- runtime SSoT 与平台实现则可以在这些 Hard Constraints 基础上简化实现，并在违反约束时给出清晰的诊断提示。
