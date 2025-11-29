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
- **Logix.ModuleShape**: 将 State 和 Action 的 Schema 组合成一个类型契约，连接 `Logic` 与运行时。

这对应“黄金标准”示例中的 `RegisterStateSchema`, `RegisterActionSchema`, 和 `RegisterShape`。

## 3. 步骤二：定义 Logic（Module-first + Fluent DSL）

在 `src/features/register/logix/logic.ts` 中，通过 `Logix.Module` 与 Bound API `$` 创建一个独立的逻辑单元（通常使用 `Module.logic(($)=>Effect.gen(...))`）。所有业务规则都在这里通过 Fluent Intent API 声明：

- **字段联动**: 使用 `$.onState(s => s.country).then($.state.mutate(...))` 表达「country 变化 → 重置 province」；
- **异步校验**: 使用 `$.onState(s => s.username).debounce(500).filter(...).then(effect, { mode: 'latest' })` 表达「用户名变化 → 防抖 → 过滤 → 最新一次异步校验」；
- **多字段约束**: 使用 `$.onState(s => [s.password, s.confirmPassword] as const).then($.state.mutate(...))` 表达「密码对变化 → 校验一致性」。

所有逻辑都以清晰的 Fluent 链存在，并通过 `yield*` 在 `Effect.gen` 中统一挂载。具体实现可直接参考 `core/examples/01-basic-form.md` 中的 `RegisterLogic`。

## 4. 步骤三：组装 Module / Live

在 `src/features/register/logix/module.ts` 中，将 Schema 与 Logic 组装成一个领域 Module，并生成可注入的 Live Layer：

1.  **Module 定义**: 使用 `Logix.Module('Register', { state: RegisterStateSchema, actions: RegisterActionSchema })` 定义领域模块；
2.  **Logic 挂载**: 通过 `RegisterModule.logic(($)=>Effect.gen(...))` 定义并导出 `RegisterLogic`；
3.  **Live Layer**: 调用 `RegisterModule.live(initialState, RegisterLogic, ...)`，将 Module 与一组 Logic 组合为可注入 Runtime 的 Layer。

这个过程是纯粹的静态组合，没有副作用，易于测试和推理。

## 5. 步骤四：在 React 中接入

UI 层应保持“纯粹”，只负责渲染状态和派发动作。

- 在顶层组件中创建或注入 `RegisterLive` 对应的 Module 实例（通常通过 Runtime/Provider 注入）。
- 使用 `@logix/react` 提供的 `useModule` 和 `useSelector` Hook 来订阅状态。
  - `useSelector(moduleRuntime, s => s.username)`: 细粒度订阅，避免不必要的重渲染。
- 用户的输入或点击等交互，通过 `moduleRuntime.dispatch({ _tag: '...' })` 或 `moduleRuntime.state.update(...)` (通过 Hook 暴露) 触发，驱动 `Logic` 中定义的流开始执行。

核心原则：**业务逻辑停留在 `Logic` 层，React 组件只做数据到视图的映射。**

## 6. 步骤五：调试与验证

- **行为层面**: 验证表单的联动、校验是否符合预期。
- **调试层面**:
  - 利用 DevTools 查看 Action 流和 State 快照。
  - `Flow` 范式使得每个逻辑步骤（防抖、过滤、执行）都成为可观测的节点，极大地简化了复杂异步逻辑的调试。

完成这个流程，你就掌握了 Logix v3 的标准工作流：**Schema → Module/Logic → Live → UI**。所有更复杂的场景都是在这个核心模式上的扩展。
