---
title: Module
description: API Reference for Module Definition and Implementation
---

# Module

`Module` 是 Logix 的核心单元，用于封装状态、逻辑和依赖。

> **业务开发者提示**：  
> - 日常编码只需记住：`Logix.Module` 定义模块 → `Module.logic(($)=>...)` 写逻辑 → `Module.implement({ initial, logics, ... })` 组装实现；  
> - 完整签名与高级用法（如 `imports` / `processes`）主要面向架构师与库作者。

## 1. Module Definition

使用 `Logix.Module` 定义模块的“形状”（Shape）和契约。

```ts
import * as Logix from '@logix/core'
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

// 3. 创建 Module 蓝图
export const CounterModule = Logix.Module.make('Counter', {
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

## 2. Module Logic

使用 `Module.logic(($) => Effect)` 定义模块的业务逻辑。builder 闭包本身只负责**构造 Effect**，return 的 Effect 会在 Runtime 的 run 段启动；推荐的“安全默认写法”是统一返回一个 `Effect.gen`：

```ts
import { Effect } from "effect"

export const CounterLogic = CounterModule.logic(($) =>
  Effect.gen(function* () {
    // 监听 increment：挂一条长期 watcher
    yield* $.onAction("increment").runFork(
      $.state.update((s) => ({ ...s, count: s.count + 1 })),
    )

    // 监听 count 变化：再挂一条 watcher 做日志或联动
    yield* $.onState((state) => state.count).runFork((count) =>
      Effect.log(`Count changed to ${count}`),
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

## 3. Module Implementation

使用 `Module.implement` 将 Module 蓝图与具体的初始状态和逻辑绑定，生成可运行的 `ModuleImpl`。

```ts
export const CounterImpl = CounterModule.implement({
  initial: { count: 0, isLoading: false },
  logics: [CounterLogic],
})
```

### API

#### `Module.implement(config)`

- **`config`**: `ModuleImplConfig`
  - **`initial`**: `State` - 模块的初始状态。
  - **`logics`**: `Array<Logic>` - 要挂载的逻辑列表。
  - **`imports`**: `Array<Layer>` - (可选) 静态注入的依赖层。

## 4. Module Runtime

`ModuleImpl` 本身只是一个静态定义。要在 React 或其他环境中使用，需要将其实例化为 `ModuleRuntime`。

在 React 中，通常通过 `useModule` 自动处理：

```tsx
const counter = useModule(CounterImpl)
```

在纯 TS 环境中：

```ts
const runtime = yield * CounterImpl.layer
```

### API

#### `ModuleImpl.layer`

- **Type**: `Layer<ModuleRuntime, never, REnv>`
- **Description**: 一个 Effect Layer，用于构建模块运行时。

#### `ModuleImpl.withLayer(layer)`

### See Also

- [Guide: Modules & State](../../guide/essentials/modules-and-state)
- [Guide: Lifecycle](../../guide/essentials/lifecycle)
