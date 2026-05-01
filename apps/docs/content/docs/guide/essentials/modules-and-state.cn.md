---
title: Modules & State
description: 定义模块状态、动作、reducer、logic 和 program。
---

`Module` 是 Logix 的定义单元。

它描述：

- state
- actions
- logic 的挂载点

`Program` 是从模块装配出来的装配单元。

## State

```ts
import { Schema } from "effect"

const State = Schema.Struct({
  count: Schema.Number,
  isLoading: Schema.Boolean,
})
```

State 通过 `Schema` 定义。

## Actions

```ts
const Actions = {
  increment: Schema.Void,
  decrement: Schema.Void,
  setValue: Schema.Number,
}
```

Actions 描述可能施加到模块状态上的操作。

## 定义模块

```ts
import * as Logix from "@logixjs/core"

export const Counter = Logix.Module.make("Counter", {
  state: State,
  actions: Actions,
})
```

## Reducers 与 logic

纯同步状态变换应进入 reducers：

```ts
const Counter = Logix.Module.make("Counter", {
  state: State,
  actions: Actions,
  reducers: {
    increment: (state) => ({ ...state, count: state.count + 1 }),
  },
})
```

副作用、联动和 watcher 应进入 logic：

```ts
import { Effect } from "effect"

const CounterLogic = Counter.logic("counter-logic", ($) => {
  $.reducer("decrement", (state) => ({ ...state, count: state.count - 1 }))

  return $.onState((s) => s.count).runFork((count) =>
    count === 0 ? Effect.log("count is zero") : Effect.void,
  )
})
```

## 装配 Program

```ts
const CounterProgram = Logix.Program.make(Counter, {
  initial: { count: 0, isLoading: false },
  logics: [CounterLogic],
})
```

Program 是供 Runtime 和 React host 消费的复用装配单元。

## 相关页面

- [Thinking in Logix](./thinking-in-logix)
- [Flows & Effects](./flows-and-effects)
- [Runtime](../../api/core/runtime)
