---
title: Module
description: 定义模块、附加 logic、装配 program，并通过 Runtime 或 React 消费它。
---

`Module` 是 Logix 的定义期单元。

它定义：

- state schema
- action schema
- logic 的挂载点

`Program` 是从 `Module` 装配出来的装配期单元。

## 定义模块

```ts
import * as Logix from "@logixjs/core"
import { Schema } from "effect"

const CounterState = Schema.Struct({
  count: Schema.Number,
})

const Counter = Logix.Module.make("Counter", {
  state: CounterState,
  actions: {
    increment: Schema.Void,
  },
})
```

## 附加 logic

```ts
const CounterLogic = Counter.logic("counter-logic", ($) => {
  $.reducer("increment", (state) => ({
    ...state,
    count: state.count + 1,
  }))

  return Effect.void
})
```

## 装配 program

```ts
const CounterProgram = Logix.Program.make(Counter, {
  initial: { count: 0 },
  logics: [CounterLogic],
})
```

## 在 React 中消费

```tsx
const counter = useModule(CounterProgram, { key: "counter:1" })
```

如果共享实例已经由 Runtime 托管：

```tsx
const counter = useModule(Counter.tag)
```

## 说明

- `Module` 负责定义
- `Program` 负责装配
- `Runtime` 负责执行

## 相关页面

- [Runtime](./runtime)
- [Bound API ($)](./bound-api)
- [useModule](../react/use-module)
