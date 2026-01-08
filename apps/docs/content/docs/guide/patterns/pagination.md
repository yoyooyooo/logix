---
title: Pagination loading
description: Implement pagination and infinite scrolling with Logix.
---

# Pagination loading pattern

Pagination is a foundational pattern for list-like UIs. This page shows two common approaches: cursor-based and offset-based pagination.

## Core idea

1. **State shape**: `items[]` + `cursor/page` + `hasMore` + `isLoading`
2. **Action**: `loadMore` triggers loading
3. **Flow**: prevent duplicate requests (`runExhaust`), append data after the request finishes

## Cursor-based pagination

```ts
import * as Logix from '@logixjs/core'
import { Effect, Schema } from 'effect'

const ListDef = Logix.Module.make('List', {
  state: Schema.Struct({
    items: Schema.Array(Schema.Unknown),
    cursor: Schema.NullOr(Schema.String),
    hasMore: Schema.Boolean,
    isLoading: Schema.Boolean,
  }),
  actions: {
    loadMore: Schema.Void,
    reset: Schema.Void,
  },
})

const ListLogic = ListDef.logic(($) =>
  Effect.gen(function* () {
    const api = yield* $.use(ListApi)

    // Use runExhaust to prevent duplicate requests
    yield* $.onAction('loadMore').runExhaust(() =>
      Effect.gen(function* () {
        const state = yield* $.state.read
        if (!state.hasMore || state.isLoading) return

        yield* $.state.mutate((d) => {
          d.isLoading = true
        })

        const { items, nextCursor } = yield* api.fetch(state.cursor)

        yield* $.state.mutate((d) => {
          d.items = [...d.items, ...items]
          d.cursor = nextCursor
          d.hasMore = nextCursor !== null
          d.isLoading = false
        })
      }),
    )

    // Reset list
    yield* $.onAction('reset').run(() =>
      $.state.update(() => ({
        items: [],
        cursor: null,
        hasMore: true,
        isLoading: false,
      })),
    )
  }),
)
```

## Offset-based variant

```ts
const state = Schema.Struct({
  items: Schema.Array(Schema.Unknown),
  page: Schema.Number, // current page index
  pageSize: Schema.Number, // page size
  total: Schema.Number, // total items
  isLoading: Schema.Boolean,
})
```

## React integration

```tsx
function ItemList() {
  const list = useModule(ListModule)
  const { items, hasMore, isLoading } = useSelector(list, (s) => s)
  const dispatch = useDispatch(list)

  return (
    <div>
      {items.map((item) => (
        <Item key={item.id} data={item} />
      ))}

      {hasMore && (
        <button onClick={() => dispatch({ _tag: 'loadMore' })} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  )
}
```

## Common variants

- **Pull to refresh**: `reset` then immediately `loadMore`
- **Infinite scroll**: listen to scroll events and trigger `loadMore` automatically
- **Prefetch**: load earlier when close to bottom

## Related patterns

- [Optimistic update](./optimistic-update)
- [Search + detail linkage](./search-detail)
