---
title: Logic flows
description: Build long-running business behavior through action streams, state streams, and explicit run policies.
---

Logic flows turn actions and state changes into long-running business behavior.

Two common entry points are:

- `$.onAction(...)`
- `$.onState(...)`

## Example

```ts
SearchModule.logic("search-logic", ($) =>
  $.onState((s) => s.keyword)
    .debounce(300)
    .filter((kw) => kw.length > 2)
    .runLatest((kw) =>
      Effect.gen(function* () {
        const api = yield* $.use(SearchApi)
        const results = yield* api.search(kw)
        yield* $.state.mutate((draft) => {
          draft.results = results
        })
      }),
    ),
)
```

## Run policies

The main policies are:

- `run`
- `runParallel`
- `runLatest`
- `runExhaust`

## Readings of the same logic

The same flow can be expressed as:

- Logic DSL
- reaction helpers
- raw Effect or Stream composition

The public recommendation remains the Logic DSL unless a lower-level abstraction is required.

## Notes

- use `runLatest` for latest-wins flows
- use `runExhaust` when duplicate execution must be blocked
- keep state writes explicit inside the effect body

## See also

- [Flows & Effects](../essentials/flows-and-effects)
- [Common recipes](../recipes/common-patterns)
