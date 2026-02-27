---
title: Module
description: Module 定义与实现的 API 参考。
---

`Module` 是 Logix 的核心单元，用于封装状态、逻辑和依赖。

> **业务开发者提示**：
>
> - 日常编码只需记住：`Logix.Module.make` 生成 `ModuleDef` → `ModuleDef.logic(($)=>...)` 写逻辑 → `ModuleDef.build({ initial, logics, ... })` 得到 program module（运行时通过 `createInstance()` 实例化），或直接用 `ModuleDef.layer({ ... })` 走 Layer-first；
> - 完整签名与高级用法（如 `imports` / `processes`）主要面向架构师与库作者。

## 1. Module Definition

使用 `Logix.Module` 定义模块的“形状”（Shape）和契约。

```ts
import * as Logix from '@logixjs/core'
import { Schema } from 'effect'

// 1. 定义 State Schema
const State = Schema.Struct({
  count: Schema.Number,
  isLoading: Schema.Boolean,
})

// 2. 定义 Action Schema (可选)
const Actions = {
  increment: Schema.Void,
  decrement: Schema.Void,
  setValue: Schema.Number,
}

// 3. 创建 ModuleDef 蓝图
export const CounterDef = Logix.Module.make('Counter', {
  state: State,
  actions: Actions,
})
```

### API

#### `Logix.Module.make(id, config)`

- **`id`**: `string` - 模块的唯一标识符。
- **`config`**: `ModuleConfig`
  - **`state`**: `Schema<State>` - 状态的 Schema 定义。
  - **`actions`**: `Record<string, Schema<Payload>>` - Action 的 Payload Schema 定义。
  - **`immerReducers`**: `Record<string, (draft, payload) => void>` - 在模块定义处用 draft 风格写 reducer（运行时会自动包装为不可变更新，并采集更精确的变更路径）。
  - **`reducers`**: `Record<string, (state, action, sink?) => nextState>` - 传统“纯 reducer”写法；需要精细控制时使用。

当 `immerReducers` 与 `reducers` 同时提供且 key 重合时，以 `reducers` 为准。

示例：

```ts
export const CounterDef = Logix.Module.make('Counter', {
  state: State,
  actions: Actions,
  immerReducers: {
    increment: (draft) => {
      draft.count += 1
    },
    setValue: (draft, value) => {
      draft.count = value
    },
  },
  reducers: {
    decrement: (state) => ({ ...state, count: state.count - 1 }),
  },
})
```

## 2. Module Logic

使用 `Module.logic(($) => Effect)` 定义模块的业务逻辑。builder 闭包本身只负责**构造 Effect**，return 的 Effect 会在 Runtime 的 run 段启动；推荐的“安全默认写法”是统一返回一个 `Effect.gen`：

```ts
import { Effect } from 'effect'

export const CounterLogic = CounterDef.logic(($) =>
  Effect.gen(function* () {
    // 多条 watcher 属于长运行：并行启动（不要顺序 yield* 多条 .run*）
    yield* Effect.all(
      [
        // 监听 increment：做副作用（纯同步状态更新更适合放在 reducers/immerReducers）
        $.onAction('increment').run(() => Effect.log('increment')),
        // 监听 count 变化：做日志或联动
        $.onState((state) => state.count).run((count) => Effect.log(`Count changed to ${count}`)),
      ],
      { concurrency: 'unbounded' },
    )
  }),
)
```

### API

#### `Module.logic(implementation)`

- **`implementation`**: `(context: BoundApi) => Effect<void, never, R> | LogicPlan`
  - **`context`**: `BoundApi` - 提供状态访问、Action 监听、依赖注入等能力。
  - **Returns**: 一个 Effect（或 LogicPlan），作为 Logic 的 run 段，在 Runtime Env 就绪后以长期 Fiber 形式运行。

> 提示：builder 闭包内（`return` 之前）只做注册类工作（如 `$.lifecycle` / `$.reducer`），不要直接调用 `$.onAction/$.onState/$.use` 这类 run-only 能力；这些调用应放到 `Effect.gen` 的 generator 体内，由 Runtime 在 run 段执行。像 `Module.logic(($) => $.onAction("inc").run(...))` 这样的写法会在 setup 阶段触发 Phase Guard，被诊断为 `logic::invalid_phase`。

## 2.1 ModuleHandle（只读句柄）

在 Logic 的 run 段中，你可以用 `yield* $.use(OtherModule)` 解析到对方模块的 **`ModuleHandle`**（只读句柄）：它提供 `read/changes/dispatch/actions`，但不暴露直接写 state 的能力。

- 更完整的“ModuleHandle vs ServiceHandle（Tag + Layer）”取舍说明，参见：[Handle（消费面）](./handle)。

- 需要对方的 `ModuleRuntime`（escape hatch）时，用 `yield* OtherModule.tag`
- 需要固定 root provider 单例时，用 `yield* Logix.Root.resolve(OtherModule.tag)`

## 3. Module 实例化（推荐）

使用 `ModuleDef.build` 将模块定义与具体的初始状态和逻辑绑定，得到可运行的 program module。需要底层蓝图时，再通过 `createInstance()` 取出 `ModuleImpl`。  
如果你在做 Effect Layer 组合，也可以直接使用 `ModuleDef.layer(config)`（语义等价于 `build(...).createInstance().layer`）。

```ts
export const CounterModule = CounterDef.build({
  initial: { count: 0, isLoading: false },
  logics: [CounterLogic],
})

export const CounterImpl = CounterModule.createInstance()

export const CounterLayer = CounterDef.layer({
  initial: { count: 0, isLoading: false },
  logics: [CounterLogic],
})
```

### API

#### `ModuleDef.build(config)`

- **`config`**: `ModuleInstanceConfig`
  - **`initial`**: `State` - 模块的初始状态。
  - **`logics`**: `Array<Logic>` - 要挂载的逻辑列表。
  - **`imports`**: `Array<Layer | ModuleImpl>` - (可选) 静态注入依赖与子模块蓝图。
  - **`processes`**: `Array<Effect>` - (可选) 要挂载的长驻流程。
  - **`stateTransaction`**: `ModuleImplementStateTransactionOptions` - (可选) 状态事务配置。

#### `ModuleDef.layer(config)`

- **Type**: `Layer<ModuleRuntime, never, REnv>`
- **Description**: Layer-first 入口，语义等价于 `ModuleDef.build(config).createInstance().layer`。
- **推荐场景**: 需要直接与 `Layer.mergeAll / Layer.provide` 做组合时。

#### `ModuleDef.createInstance(config)` / `Module.createInstance()`

- 前者一步返回 `ModuleImpl`，后者从已 build 的 module 生成 `ModuleImpl`。

#### Legacy 兼容口（不推荐）

- `ModuleDef.implement(config)` 与 `module.impl` 仅保留迁移兼容。
- 命中 legacy 路径会发射 `module_instantiation::legacy_entry` 诊断，并携带 `source`/`hint`。

## 4. Module Runtime

模块对象本身只是静态定义。要在 React 或其他环境中使用，可将其转换为 `ModuleImpl` 后交给 Runtime，或直接走 Layer-first；推荐通过 `createInstance()` / `layer(config)` 完成，不再以 `.impl` 作为主入口。

在 React 中，通常通过 `useModule` 自动处理：

```tsx
const counter = useModule(CounterDef)
```

在纯 TS 环境中（先用 `Logix.Runtime.make` 构造运行环境）：

```ts
const runtime = Logix.Runtime.make(CounterModule.createInstance(), { layer: Layer.empty })

const program = Effect.gen(function* () {
  const counter = yield* CounterDef.tag
  // ...
})

void runtime.runPromise(program)
```

### API

#### `module.createInstance().layer`

- **Type**: `Layer<ModuleRuntime, never, REnv>`
- **Description**: 一个 Effect Layer，用于构建模块运行时。

#### `module.createInstance().withLayer(layer)` / `module.withLayer(layer)`

### See Also

- [Guide: Modules & State](../../guide/essentials/modules-and-state)
- [Guide: Lifecycle](../../guide/essentials/lifecycle)
