---
title: "Tutorial: Complex list query"
description: Build a list slice with filter changes, pagination, refresh, and latest-only loading.
---

This tutorial builds a list query slice with:

- filter changes
- pagination
- manual refresh
- auto-reset of the page index
- latest-only loading

## State and actions

```ts
export const UserListState = Schema.Struct({
  filters: Schema.Struct({
    keyword: Schema.String,
    role: Schema.optional(Schema.String),
  }),
  pagination: Schema.Struct({
    page: Schema.Number,
    pageSize: Schema.Number,
    total: Schema.Number,
  }),
  list: Schema.Array(User),
  meta: Schema.Struct({
    isLoading: Schema.Boolean,
    error: Schema.optional(Schema.String),
  }),
})

export const UserListActions = {
  setFilter: Schema.Struct({ key: Schema.String, value: Schema.Any }),
  setPage: Schema.Number,
  refresh: Schema.Void,
}
```

## Logic

The list logic usually contains two flows:

1. reset page index when filters change
2. merge multiple load triggers and execute the latest load

```ts
export const UserListLogic = UserListDef.logic("user-list-logic", ($) =>
  Effect.gen(function* () {
    const loadEffect = Effect.gen(function* () {
      const { filters, pagination } = yield* $.state.read

      yield* $.state.mutate((draft) => {
        draft.meta.isLoading = true
        draft.meta.error = undefined
      })

      const api = yield* $.use(UserApi)
      const result = yield* Effect.tryPromise(() =>
        api.fetchUsers({ ...filters, page: pagination.page, size: pagination.pageSize }),
      ).pipe(Effect.either)

      yield* $.state.mutate((draft) => {
        draft.meta.isLoading = false
        if (result._tag === "Left") {
          draft.meta.error = "Failed to load"
        } else {
          draft.list = result.right.items
          draft.pagination.total = result.right.total
        }
      })
    })

    $.lifecycle.onInitRequired(loadEffect)

    const filters$ = $.onState((s) => s.filters).toStream()
    const pagination$ = $.onState((s) => s.pagination).toStream()
    const refresh$ = $.onAction("refresh").toStream()

    const loadTrigger$ = Stream.mergeAll([filters$, pagination$, refresh$], { concurrency: "unbounded" })

    yield* Effect.all(
      [
        $.onState((s) => s.filters).run(() =>
          $.state.mutate((draft) => {
            draft.pagination.page = 1
          }),
        ),
        $.on(loadTrigger$).debounce(50).runLatest(loadEffect),
      ],
      { concurrency: "unbounded" },
    )
  }),
)
```

## React

The React side remains simple:

- read filter, pagination, list, and loading state
- dispatch filter changes and page changes
- avoid moving orchestration back into the component

## Notes

- filter changes and refresh do not need separate components to own loading orchestration
- page reset remains part of logic, not UI glue
- the load flow stays explicit and latest-only

## Next

- [Modules & State](../essentials/modules-and-state)
- [Flows & Effects](../essentials/flows-and-effects)
- [React integration recipe](../recipes/react-integration)
