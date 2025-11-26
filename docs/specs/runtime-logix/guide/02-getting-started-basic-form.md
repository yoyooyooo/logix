# 02 · 第一个 Logix 表单 (v3 标准范式)

> **对应**: `core/examples/01-basic-form.md` (黄金标准实现)
> **目标**: 遵循 v3 Effect-Native 范式，构建一个包含字段联动、异步校验和多字段约束的注册表单。

## 1. 场景复述 (用户语言)

- 一个用户注册表单，包含用户名、密码、国家/省份等字段。
- 需求：
  - 选择国家时，省份自动重置。
  - 用户名输入停止 500ms 后，异步检查重名，并处理竞态。
  - 密码与确认密码不一致时提示错误。

这些行为都属于前端本地逻辑，`runtimeTarget` 明确为 `logix-engine`。

## 2. 步骤一：定义 Schema 与 Shape

在业务模块下（例如 `src/features/register/logix/schema.ts`），使用 `effect/Schema` 定义状态与动作的结构。

- **StateSchema**: 定义表单的数据结构，包括值和错误字段。
- **ActionSchema**: 定义用户可以派发的意图，如提交、重置。
- **Store.Shape**: 将 State 和 Action 的 Schema 组合成一个类型契约，连接 `Logic` 与 `Store`。

这对应“黄金标准”示例中的 `RegisterStateSchema`, `RegisterActionSchema`, 和 `RegisterShape`。

## 3. 步骤二：定义 Logic

在 `src/features/register/logix/logic.ts` 中，使用 `Logic.make` 创建一个独立的逻辑单元。所有业务规则都在这里通过 `Flow` API 声明。

- **字段联动**: 使用 `flow.fromChanges` 监听 `country` 字段的变化，然后通过 `flow.run` 触发 `state.mutate` 来重置 `province`。
- **异步校验**: 同样使用 `flow.fromChanges` 监听 `username`，但链式调用 `flow.debounce(500)` 和 `flow.filter`，最后通过 `flow.runLatest` 执行异步校验 Effect。`runLatest` 会自动处理竞态，确保只有最后一次输入的结果会被采纳。
- **多字段约束**: 使用 `flow.fromChanges` 同时监听 `[password, confirmPassword]` 的元组变化，在 `flow.run` 中执行比较逻辑并更新错误状态。

所有逻辑都以清晰的、可组合的流（Stream）的形式存在，并通过 `Effect.all` 统一挂载。具体实现可直接参考 `core/examples/01-basic-form.md` 中的 `RegisterLogic`。

## 4. 步骤三：组装 Store

在 `src/features/register/logix/store.ts` 中，将之前定义的各个部分组装成一个完整的 `Store` 实例。

1.  **State Layer**: 使用 `Store.State.make(RegisterStateSchema, initialValues)` 创建状态层。
2.  **Action Layer**: 使用 `Store.Actions.make(RegisterActionSchema)` 创建动作层。
3.  **Store 实例**: 调用 `Store.make(StateLayer, ActionLayer, RegisterLogic)`，将状态、动作和逻辑组合在一起。

这个过程是纯粹的静态组合，没有副作用，易于测试和推理。

## 5. 步骤四：在 React 中接入

UI 层应保持“纯粹”，只负责渲染状态和派发动作。

- 在顶层组件中创建或注入 `RegisterStore` 实例。
- 使用 `@logix/react` 提供的 `useStore` 和 `useSelector` Hook 来订阅状态。
  - `useSelector(store, s => s.username)`: 细粒度订阅，避免不必要的重渲染。
- 用户的输入或点击等交互，通过 `store.dispatch({ _tag: '...' })` 或 `store.state.update(...)` (通过 Hook 暴露) 触发，驱动 `Logic` 中定义的流开始执行。

核心原则：**业务逻辑停留在 `Logic` 层，React 组件只做数据到视图的映射。**

## 6. 步骤五：调试与验证

- **行为层面**: 验证表单的联动、校验是否符合预期。
- **调试层面**: 
  - 利用 DevTools 查看 Action 流和 State 快照。
  - `Flow` 范式使得每个逻辑步骤（防抖、过滤、执行）都成为可观测的节点，极大地简化了复杂异步逻辑的调试。

完成这个流程，你就掌握了 Logix v3 的标准工作流：**Schema → Logic → Store → UI**。所有更复杂的场景都是在这个核心模式上的扩展。