---
title: Pattern examples
description: Compose reusable Logix behavior without creating a second runtime or host API.
---

Reusable Logix patterns should stay small and mechanically reducible to the canonical spine.

Use two shapes:

- pure Effect helpers for work that does not need module state
- Logic helpers that accept `$` when they need state, actions, or module-local scheduling

## Pure Effect helper

```ts
import { Effect } from "effect"

export const runBulkOperation = (operation: string) =>
  Effect.gen(function* () {
    const bulk = yield* BulkOperationService
    const ids = ["1", "2", "3"]
    yield* bulk.applyToMany({ ids, operation })
    return ids.length
  })
```

This shape is reusable because it does not know about a Module, Program, Runtime, or React host.

## Logic helper

```ts
import { Effect } from "effect"

export const installDebouncedSearch = ($: any) =>
  $.onAction("keywordChanged").runLatest((action: { readonly payload: string }) =>
    Effect.gen(function* () {
      yield* $.state.mutate((draft: any) => {
        draft.keyword = action.payload
        draft.status = action.payload ? "loading" : "idle"
      })

      if (!action.payload) return
      const results = yield* SearchService.search(action.payload)

      yield* $.state.mutate((draft: any) => {
        draft.results = results
        draft.status = "ready"
      })
    }),
  )
```

Use this shape inside `Module.logic(...)` when the pattern needs Bound API capabilities. Keep the helper narrow: it should not allocate a Runtime, read from React, or invent a different state owner.

## Selection

| Need | Use |
| --- | --- |
| no module state | pure Effect helper |
| module state, actions, watchers, local mutation | Logic helper that accepts `$` |
| UI bindings | React component or toolkit helper reducible to `useModule + useSelector + handle methods` |

## Rules

- Do not create a second action protocol.
- Do not hide writes behind untraceable callbacks.
- Do not make helpers own caches, runtime instances, or React subscriptions.
- Prefer explicit arguments over hidden global state.

## See also

- [Bound API ($)](../../api/core/bound-api)
- [Canonical spine](../essentials/canonical-spine)
