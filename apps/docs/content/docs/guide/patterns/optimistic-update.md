---
title: Optimistic updates
description: Implement optimistic updates and rollback strategies with Logix.
---

# Optimistic update pattern

Optimistic updates make the UI respond immediately to user actions while the real request runs in the background. If the request fails, you roll back to the previous state.

## Core idea

1. **Update UI immediately**: mutate state right after the user action
2. **Run the request in the background**: perform the real operation asynchronously
3. **Rollback on failure**: restore the previous state and notify the user

## Basic implementation

```ts
import * as Logix from '@logixjs/core'
import { Effect, Schema } from 'effect'

const TodoDef = Logix.Module.make('Todo', {
  state: Schema.Struct({
    items: Schema.Array(
      Schema.Struct({
        id: Schema.String,
        text: Schema.String,
        done: Schema.Boolean,
      }),
    ),
  }),
  actions: {
    toggle: Schema.String, // itemId
  },
})

const TodoLogic = TodoDef.logic(($) =>
  Effect.gen(function* () {
    const api = yield* $.use(TodoApi)

    yield* $.onAction('toggle').run((itemId) =>
      Effect.gen(function* () {
        // 1) Snapshot the original state
        const original = yield* $.state.read

        // 2) Optimistically update state
        yield* $.state.mutate((d) => {
          const item = d.items.find((i) => i.id === itemId)
          if (item) item.done = !item.done
        })

        // 3) Execute the real request; roll back on failure
        yield* api.toggleTodo(itemId).pipe(
          Effect.catchAll(() =>
            Effect.gen(function* () {
              // Roll back to the original snapshot
              yield* $.state.update(() => original)
              // Optionally notify via toast
              yield* Effect.log('Toggle failed; rolled back')
            }),
          ),
        )
      }),
    )
  }),
)
```

## Enhanced version with retry

```ts
yield*
  api.toggleTodo(itemId).pipe(
    Effect.retry({ times: 2 }), // retry up to 2 times
    Effect.catchAll(() =>
      Effect.gen(function* () {
        yield* $.state.update(() => original)
        yield* $.actions.showError('Operation failed. Please try again later.')
      }),
    ),
  )
```

## Batch optimistic updates

```ts
yield*
  $.onAction('batchToggle').run((itemIds: string[]) =>
    Effect.gen(function* () {
      const original = yield* $.state.read

      // Optimistically update all items
      yield* $.state.mutate((d) => {
        for (const id of itemIds) {
          const item = d.items.find((i) => i.id === id)
          if (item) item.done = !item.done
        }
      })

      // Batch request
      yield* api.batchToggle(itemIds).pipe(Effect.catchAll(() => $.state.update(() => original)))
    }),
  )
```

## Best practices

1. **Use optimistic updates only for simple operations**: complex cascading operations are harder to roll back.
2. **Keep a full snapshot**: ensure you can roll back completely.
3. **Give user feedback**: notify users when rollback happens (toast/notification).
4. **Consider races**: for repeated operations, use `runLatest` or add locking.

## Related patterns

- [Pagination loading](./pagination)
- [Search + detail linkage](./search-detail)
