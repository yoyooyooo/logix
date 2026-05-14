---
title: Module
description: 定义期 state、actions、reducers 与 logic builder。
---

`Module` 是定义对象。它拥有 state schema、action schema、可选同步 reducers，以及 `logic` builder。

## `Module.make`

```ts
const Counter = Logix.Module.make("Counter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { increment: Schema.Void },
  reducers: {
    increment: Logix.Module.Reducer.mutate((draft) => {
      draft.count += 1
    }),
  },
})
```

| 字段 | 含义 |
| --- | --- |
| `state` | module state 的 Effect Schema。 |
| `actions` | action tag 到 payload schema 的 map。 |
| `reducers` | 同步 action reducers。 |
| `services`, `schemas`, `meta`, `dev` | 元数据和集成支持。 |

## `module.logic(id, build, options?)`

```ts
const logic = Counter.logic("counter-logic", ($) => Effect.void)
```

`id` 必填。builder 收到 Bound API `$`，并返回 module instance 的 runtime effect。

## Reducer helper

`Module.Reducer.mutate(fn)` 允许 reducer 通过 draft 写入，同时保持 transaction 语义。

## 边界

`Module` 不是装配单元。initial state、logic units、imports 和 services 通过 `Program.make(Module, config)` 提供。
