---
title: Module
description: 定义 Logix 单元的 state、actions、reducers 与 logic authoring。
---

`Logix.Module.make(id, def)` 创建 definition object。Module 不是 runtime instance；它是传给 `Program.make(...)` 的稳定声明对象。

```ts
import { Effect, Schema } from "effect"
import * as Logix from "@logixjs/core"

const CounterState = Schema.Struct({ value: Schema.Number })
const CounterActions = { inc: Schema.Void }

export const Counter = Logix.Module.make("Counter", {
  state: CounterState,
  actions: CounterActions,
})

export const CounterLogic = Counter.logic("counter-logic", ($) =>
  Effect.gen(function* () {
    yield* $.onAction("inc").mutate((state) => {
      state.value += 1
    })
  }),
)
```

## Definition fields

| 字段 | 作用 |
| --- | --- |
| `state` | 模块 state 的 Effect Schema。 |
| `actions` | Action map。每个 key 会成为 action token。 |
| `reducers` / `immerReducers` | 可选 primary state transform。 |
| `effects` | 可选 action side-effect 声明。 |
| `schemas`、`meta`、`services`、`dev` | reflection 与 diagnostics metadata。 |

## Logic authoring

使用 `Module.logic(id, ($) => runEffect)`。`id` 必须显式提供，因为 diagnostics、override 与 evidence 需要稳定 logic-unit identity。

`$.fields(...)`、`$.readyAfter(...)` 这类 declaration-only 调用应写在 builder root，并且位于返回的 run effect 之前：

```ts
export const SearchLogic = Search.logic("search-logic", ($) => {
  $.fields({
    results: $.fields.source({
      resource: "customer.search",
      deps: ["keyword"],
      key: (keyword) => (keyword ? { keyword } : undefined),
    }),
  })

  $.readyAfter(bootstrapSearchIndex, { id: "search-index" })

  return Effect.gen(function* () {
    yield* $.onAction("keywordChanged").runLatest(/* ... */)
  })
})
```

旧的公开 `{ setup, run }` 返回形态不再是当前用户路线。

## Assembly

```ts
export const CounterProgram = Logix.Program.make(Counter, {
  initial: { value: 0 },
  logics: [CounterLogic],
})
```

## See also

- [Program](./program)
- [Bound API](./bound-api)
- [Runtime](./runtime)
