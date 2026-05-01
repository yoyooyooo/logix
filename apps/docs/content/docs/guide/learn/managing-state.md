---
title: Managing state
description: Keep state as the single source of truth through `$.state` and use-case actions.
---

Each module owns one state tree.
All rendering, linkage, and effects should continue to orbit that state tree.

## State access

Inside logic, state is accessed through:

- `$.state.read`
- `$.state.mutate(...)`
- `$.state.update(...)`
- `$.state.ref(...)`

```ts
const state = yield* $.state.read

yield* $.state.mutate((draft) => {
  draft.count += 1
})
```

## Recommendation

Prefer `$.state.mutate(...)` for ordinary updates.

Use `$.state.update(...)` when the whole-state replacement is the actual semantic unit.

## Use-case actions

When one step must see the state written by the previous step, move the sequence into one explicit use-case action:

```ts
const logic = Search.logic("search-logic", ($) =>
  $.onAction("applyFilterAndReload").run(({ payload }) =>
    Effect.gen(function* () {
      yield* $.state.mutate((draft) => {
        draft.filter = payload.filter
      })

      const state = yield* $.state.read
      yield* runSearchWithFilter(state.filter)
    }),
  ),
)
```

This keeps timing ownership inside logic instead of pushing it to callers.

## Notes

- avoid dispatch + sleep + dispatch patterns in callers
- let one use-case action own one ordered business sequence

## See also

- [Modules & State](../essentials/modules-and-state)
- [Common recipes](../recipes/common-patterns)
