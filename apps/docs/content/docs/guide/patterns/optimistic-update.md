---
title: Optimistic updates
description: Keep optimistic state and rollback authority inside runtime logic.
---

Optimistic updates need a rollback path. The runtime should own the previous value, the pending request, and the settlement rule.

## State

```ts
state: Schema.Struct({
  items: Schema.Array(Item),
  pendingIds: Schema.Array(Schema.String),
  lastError: Schema.NullOr(Schema.String),
})
```

Store only the rollback data that the logic needs. Avoid duplicating large object graphs when a small patch is enough.

## Flow

```ts
yield* $.onAction("toggle").runLatest((action) =>
  Effect.gen(function* () {
    const before = yield* $.state.read
    yield* $.state.mutate(applyOptimistic(action.payload))

    const api = yield* $.use(Api)
    yield* api.toggle(action.payload).pipe(
      Effect.catchAll((error) =>
        $.state.update(() => ({ ...before, lastError: String(error) })),
      ),
    )
  }),
)
```

Use one settlement rule per optimistic lane. Do not let the component decide whether the update succeeded.
