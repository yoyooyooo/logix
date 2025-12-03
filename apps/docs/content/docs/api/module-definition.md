---
title: "Module 定义"
---
在 Logix 中，Module 是业务逻辑的基本单元。一个 Module 包含两部分：
1.  **Shape (定义)**: 状态结构 (State Schema) 和 动作集合 (Action Schema)。
2.  **Runtime (实现)**: 初始状态、逻辑流程 (Logic) 和服务实现。

## 定义 Shape

我们推荐使用 `Schema` (from `@effect/schema`) 来定义 Shape。

### 1. 定义 State Schema

State 通常是一个 Struct。

```typescript
import { Schema } from "effect"

export const State = Schema.Struct({
  count: Schema.Number,
  lastUpdated: Schema.Date,
  user: Schema.optional(Schema.String)
})
```

### 2. 定义 Action Schema

Action 推荐使用 `actionMap` 的形式定义，这样可以获得更好的类型推导和动态 Dispatcher 支持。

```typescript
export const Actions = {
  increment: Schema.Number, // payload 是 number
  reset: Schema.Void,       // 无 payload
  setUser: Schema.String    // payload 是 string
}
```

### 3. 创建 Module 实例

使用 `Module` 工厂函数将 State 和 Actions 组合成一个 Module 实例。

```typescript
import { Logix } from "@logix/core"

export const CounterModule = Logix.Module("Counter", {
  state: State,
  actions: Actions
})
```

`CounterModule` 既是一个值（包含元数据），也是一个 `Context.Tag`，可以用于依赖注入。

## 实现 Logic

Logic 是依附于 Module 运行的 Effect 程序。使用 `CounterModule.logic` 来定义逻辑。

```typescript
import { Effect } from "effect"

// 定义一段逻辑
const CounterLogic = CounterModule.logic(function* ($) {
  // 监听 increment Action
  yield* $.onAction("increment").run(amount =>
    $.state.update(s => ({ ...s, count: s.count + amount }))
  )

  // 监听 reset Action
  yield* $.onAction("reset").run(() =>
    $.state.update(s => ({ ...s, count: 0 }))
  )
})
```

## 组装 ModuleImpl 与 Runtime

最后，使用 `CounterModule.make` 将初始状态和逻辑组装成一个可复用的 ModuleImpl 蓝图，再配合 `LogixRuntime.make` 组装 Runtime。

```typescript
import { Logix, LogixRuntime } from "@logix/core"
import { Layer } from "effect"

export const CounterImpl = CounterModule.make({
  initial: { count: 0, lastUpdated: new Date(), user: undefined },
  logics: [CounterLogic]
})

export const CounterRuntime = LogixRuntime.make(CounterImpl, {
  layer: Layer.empty // 或叠加应用基础设施 Layer
})
```

`CounterImpl` 是可复用的实现蓝图，可以在多个 Runtime 中重复挂载；`CounterRuntime` 则是在给定 Env 下的一棵具体 Runtime 实例，可直接在 React 或 Node 场景中运行。

## 最佳实践

1.  **文件结构**: 推荐将 Module 定义、Logic 实现和 Live Layer 放在同一个文件或目录下（例如 `feature/counter/model.ts`）。
2.  **Schema 复用**: 尽量复用 Schema 定义，保证输入输出类型的一致性。
3.  **Action 命名**: 使用动词开头，清晰表达意图（如 `fetchData`, `updateProfile`）。
