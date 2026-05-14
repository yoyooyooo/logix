---
title: Module
description: Define state, actions, reducers, and logic authoring for a Logix unit.
---

`Logix.Module.make(id, def)` creates the definition object. A Module is not the runtime instance. It is the stable declaration object used by `Program.make(...)`.

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

| Field | Purpose |
| --- | --- |
| `state` | Effect Schema for module state. |
| `actions` | Action map. Each key becomes an action token. |
| `reducers` / `immerReducers` | Optional primary state transforms. |
| `effects` | Optional action side-effect declarations. |
| `schemas`, `meta`, `services`, `dev` | Reflection and diagnostics metadata. |

## Logic authoring

Use `Module.logic(id, ($) => runEffect)`. The `id` is required because diagnostics, overrides, and evidence need stable logic-unit identity.

Declaration-only calls, such as `$.fields(...)` and `$.readyAfter(...)`, belong at the builder root before the returned run effect:

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

The old public `{ setup, run }` return shape is not the current user route.

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
