---
title: Pattern examples
description: Compare store-agnostic functional patterns with state-aware Bound API patterns.
---

Pattern code in Logix usually falls into two shapes:

- functional patterns
- Bound API patterns

## Functional pattern

A functional pattern is store-agnostic and returns an `Effect`:

```ts
export const runBulkOperation = (config: { operation: string }) =>
  Effect.gen(function* () {
    const bulk = yield* BulkOperationService
    const ids = ["1", "2", "3"]

    yield* bulk.applyToMany({ ids, operation: config.operation })
    return ids.length
  })
```

Use this shape when the pattern should stay independent of a specific module.

## Bound API pattern

A Bound API pattern is state-aware and accepts `$` explicitly:

```ts
export const runCascadePattern = <Sh extends Logix.AnyModuleShape, R, T, Data>(
  $: Logix.Module.BoundApi<Sh, R>,
  config: {
    source: (s: Logix.Module.StateOf<Sh>) => T | undefined | null
    loader: (val: T) => Effect.Effect<Data, never, any>
    onReset: (draft: unknown) => void
    onSuccess: (draft: unknown, data: Data) => void
  },
) =>
  $.onState(config.source).runLatest((val) =>
    Effect.gen(function* () {
      yield* $.state.mutate((draft) => {
        config.onReset(draft)
      })
      if (val == null) return

      const data = yield* config.loader(val)
      yield* $.state.mutate((draft) => {
        config.onSuccess(draft, data)
      })
    }),
  )
```

Use this shape when the pattern depends on module state, watchers, or local mutation.

## Selection

- use a functional pattern when store ownership should stay outside the pattern
- use a Bound API pattern when the pattern must consume state, watchers, or module-local mutations

## See also

- [Bound API ($)](../../api/core/bound-api)
- [Common recipes](./common-patterns)
