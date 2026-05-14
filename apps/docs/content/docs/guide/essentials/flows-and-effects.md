---
title: Flows & Effects
description: Attach Effect-based behavior to actions, state changes, and services.
---

Logic is Effect-based behavior mounted onto a Module.

```ts
const SearchLogic = Search.logic("search-logic", ($) =>
  Effect.gen(function* () {
    yield* $.onAction("keywordChanged").runLatest(
      Effect.gen(function* () {
        const state = yield* $.state.read
        // run service work, then write state
      }),
    )
  }),
)
```

## Declaration work

Some work is declared synchronously at the builder root:

```ts
const Logic = Search.logic("logic", ($) => {
  $.readyAfter(loadInitialConfig, { id: "initial-config" })

  return Effect.gen(function* () {
    // run phase
  })
})
```

The public route is not `{ setup, run }`. Keep declarations at the builder root and return the run effect.

## Services

Resolve services with `$.use(ServiceTag)` inside logic. Install service layers through `Program.make(..., { capabilities: { services } })` or `Runtime.make(..., { layer })` depending on ownership.
