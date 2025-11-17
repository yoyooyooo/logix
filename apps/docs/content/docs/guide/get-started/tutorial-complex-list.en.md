---
title: 'Tutorial: Complex List Query'
description: Build a production-grade list page with filters, pagination, loading, and automatic reset.
---

In admin dashboards, list queries are one of the most common scenarios. In this tutorial, we’ll build a production-grade list page with:

1.  **Multi-source triggers**: clicking “Search”, changing pages, and manual refresh all trigger loading.
2.  **Race handling**: quickly changing conditions automatically cancels in-flight requests.
3.  **Automatic reset**: changing filters resets the page back to page 1.
4.  **State management**: manage Loading, Error, and Data end-to-end.

### Who is this for?

- You already know the basics of Module / Logic and want to apply Logix’s streaming capabilities to real business scenarios.
- You build admin lists/reports with complex filtering and want a “production-grade” reference implementation.

### Prerequisites

- You’ve finished the previous form tutorial, or you have hands-on experience with `$.onState / $.onAction`.
- You know the basic Flow execution strategies (`run / runLatest`, etc.). See [Flows & Effects](../essentials/flows-and-effects).

### What you’ll get

- A template list-page implementation with multi-source triggers, race handling, and automatic reset
- A clear understanding of “split complex interactions into multiple Flows, then merge them with Stream”
- The ability to decide in your own product which logic should be separate Flows and which should be merged

## 1. Define data structures (Schema)

First, define the state structure for the list page.

Create `src/features/users/schema.ts`:

```typescript
import { Schema } from 'effect'
import * as Logix from '@logix/core'

// 1) Define the user entity
const User = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  role: Schema.String,
  status: Schema.String,
})

// 2) Define State
export const UserListState = Schema.Struct({
  // filters
  filters: Schema.Struct({
    keyword: Schema.String,
    role: Schema.optional(Schema.String),
  }),
  // pagination
  pagination: Schema.Struct({
    page: Schema.Number,
    pageSize: Schema.Number,
    total: Schema.Number,
  }),
  // list data
  list: Schema.Array(User),
  // metadata
  meta: Schema.Struct({
    isLoading: Schema.Boolean,
    error: Schema.optional(Schema.String),
  }),
})

// 3) Define Actions
export const UserListActions = {
  setFilter: Schema.Struct({ key: Schema.String, value: Schema.Any }),
  setPage: Schema.Number,
  refresh: Schema.Void,
}

// 4) Define ModuleDef
export const UserListDef = Logix.Module.make('UserList', {
  state: UserListState,
  actions: UserListActions,
})
```

## 2. Write business logic (Logic)

This is the core of the tutorial. We’ll use Logix’s streaming programming model to reduce complex interaction logic into a few clear pipelines.

Create `src/features/users/logic.ts`:

```typescript tab="Logic DSL"
	import { Effect, Stream } from 'effect'
	import { UserListDef } from './schema'
	import { UserApi } from '../../services/UserApi'

	export const UserListLogic = UserListDef.logic(($) => {
  // --- setup-only: register lifecycle ---
  const loadEffect = Effect.gen(function* () {
    // ... (loading logic omitted; same as above) ...
    const { filters, pagination } = yield* $.state.read
    yield* $.state.mutate((d) => {
      d.meta.isLoading = true
      d.meta.error = undefined
    })
    const api = yield* $.use(UserApi)
    const result = yield* Effect.tryPromise(() =>
      api.fetchUsers({ ...filters, page: pagination.page, size: pagination.pageSize }),
    ).pipe(Effect.either)
    yield* $.state.mutate((d) => {
      d.meta.isLoading = false
      if (result._tag === 'Left') d.meta.error = 'Failed to load'
      else {
        d.list = result.right.items
        d.pagination.total = result.right.total
      }
    })
  })

  $.lifecycle.onInit(loadEffect)

  // --- run: mount watchers/flows ---
  return Effect.gen(function* () {
    // --- 1) Define trigger sources ---
    // Use .toStream() to convert DSL objects into Streams so we can merge them.
    const filters$ = $.onState((s) => s.filters).toStream()
    const pagination$ = $.onState((s) => s.pagination).toStream()
    const refresh$ = $.onAction('refresh').toStream()

    // --- 2) Automatically reset page index ---
    yield* $.onState((s) => s.filters).run(() =>
      $.state.mutate((d) => {
        d.pagination.page = 1
      }),
    )

    // --- 3) Merge load signals ---
    const loadTrigger$ = Stream.mergeAll([filters$, pagination$, refresh$], { concurrency: 'unbounded' })

    // --- 4) Execute load logic ---
    // Use $.on(...) to wrap the merged Stream back into a DSL pipeline.
    yield* $.on(loadTrigger$).pipe($.flow.debounce(50), $.flow.runLatest(loadEffect))
  })
})
```

    ```typescript tab="Flow API"
    import { Effect, Stream } from 'effect'
    import { UserListDef } from './schema'

    export const UserListLogic = UserListDef.logic(($) =>
      Effect.gen(function* () {
    // --- 1) Use low-level APIs to get Streams ---
    const filters$ = $.flow.fromState((s) => s.filters)
    const pagination$ = $.flow.fromState((s) => s.pagination)
    // Action Stream needs manual filtering
    const refresh$ = $.flow.actionStream.pipe(Stream.filter((a) => a.type === 'refresh'))

    // --- 2) Automatically reset page index ---
    yield* filters$.pipe(
      $.flow.run(() =>
        $.state.mutate((d) => {
          d.pagination.page = 1
        }),
      ),
    )

    // --- 3) Merge load signals ---
    const loadTrigger$ = Stream.mergeAll([filters$, pagination$, refresh$], { concurrency: 'unbounded' })

    // --- 4) Execute load logic ---
    // Use Stream operators directly.
    yield* loadTrigger$.pipe(
      $.flow.debounce(50),
      $.flow.runLatest(loadEffect), // loadEffect is defined above
    )

    // ...

}),
)

````

## 3. Assemble the Module

```typescript
	import { UserListDef } from './schema'
	import { UserListLogic } from './logic'

	export const UserListModule = UserListDef.implement({
	  initial: {
	    filters: { keyword: '' },
	    pagination: { page: 1, pageSize: 10, total: 0 },
	    list: [],
	    meta: { isLoading: false },
	  },
	  logics: [UserListLogic],
	})
````

## 4. UI implementation

The UI becomes very simple: it only renders and triggers straightforward state changes.

```tsx
	import { useModule, useSelector } from '@logix/react'
	import { UserListModule } from './module'

	export function UserListPage() {
	  const list = useModule(UserListModule)
	  const state = useSelector(list, (s) => s)
	  const actions = list.actions

  return (
    <div>
      {/* Filters */}
      <div className="filters">
        <input
          placeholder="Search users..."
          value={state.filters.keyword}
          onChange={(e) => actions.setFilter({ key: 'keyword', value: e.target.value })}
        />
        <button onClick={() => actions.refresh()}>Refresh</button>
      </div>

      {/* List */}
      {state.meta.isLoading && <div>Loading...</div>}
      {state.meta.error && <div className="error">{state.meta.error}</div>}

      <ul>
        {state.list.map((user) => (
          <li key={user.id}>
            {user.name} - {user.role}
          </li>
        ))}
      </ul>

      {/* Pagination */}
      <div className="pagination">
        <span>Total: {state.pagination.total}</span>
        <button disabled={state.pagination.page === 1} onClick={() => actions.setPage(state.pagination.page - 1)}>
          Previous
        </button>
        <span>Page {state.pagination.page}</span>
        <button onClick={() => actions.setPage(state.pagination.page + 1)}>Next</button>
      </div>
    </div>
  )
}
```

## Key takeaways

1.  **Declarative flows**: instead of manually checking dependencies in `useEffect`, we declared `filters$` and `pagination$` streams.
2.  **Automatic race handling**: `runLatest` ensures that if users quickly navigate, old requests are automatically cancelled and you only render the latest result.
3.  **Cohesive logic**: loading and reset logic live inside `Logic`, fully decoupling the UI layer.
