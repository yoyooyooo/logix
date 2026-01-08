---
title: "Deep dive: Runtime / Middleware / Lifecycle"
description: Understand Logix core abstractions from a runtime perspective.
---

In enterprise apps, a complex page (e.g. a user management list or an order detail page) can be treated as a micro app. A **Root ModuleImpl + Runtime** (usually constructed via `Logix.Runtime.make`) is the “foundation” of that micro app.

It is responsible for:

1. **Assembly** (`Module.make` + `Runtime.make`): composing APIs, state, and UI capabilities.
2. **Lifecycle** (`Lifecycle`): fetching data on page load and cleaning up resources at the right time.
3. **Guards** (middleware / constraints): handling loading states, error reporting, and permission checks during user interactions.

---

### Who is this for?

- Architects/senior engineers who want to understand Logix’s “full-page app model” from the Runtime perspective (Root ModuleImpl + Runtime).
- Teams that want to abstract reusable page skeletons (admin lists, detail pages, wizards) and use Logix as the foundation.

### Prerequisites

- You know basic usage of Module / ModuleImpl / Runtime.
- You’ve read [Lifecycle](../essentials/lifecycle) and [Lifecycle and watcher patterns](./lifecycle-and-watchers).
- You have some intuition for Effect and Layer (how to compose multiple service Layers).

### What you’ll get

- Design B2B page skeletons from the “Root ModuleImpl + Runtime” perspective.
- Know where to mount lifecycle logic, shared middleware, and debugging/observability.
- Build conceptual ground for future Runtime adapters (CLI, micro-frontend container, etc.).

---

This page uses a CRM user list as an example to show roles of the runtime model. If you care more about building the page step-by-step, start with “Tutorial: Complex list query”. If you care about “how the engine assembles these pieces”, keep reading.

## 1. Define the Module schema

```ts
// UserListModule.ts
	import * as Logix from '@logix/core'
	import { Schema } from 'effect'

	export const UserListDef = Logix.Module.make('UserList', {
	  state: Schema.Struct({
	    list: Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String })),
	    roles: Schema.Array(Schema.String),
	    loading: Schema.Boolean,
	  }),
	  actions: {
	    deleteUser: Schema.String,
	    refresh: Schema.Void,
	  },
	})
```

## 2. Define lifecycle logic

```ts
	// UserListLogic.ts
	import { Effect } from 'effect'

	export const LifecycleLogic = UserListDef.logic(($) => {
	  // page init: fetch data once (setup-only registration; scheduled by the Runtime)
	  $.lifecycle.onInit(
	    Effect.gen(function* () {
      yield* $.state.update((s) => ({ ...s, loading: true }))

      const [users, roles] = yield* Effect.all([UserApi.list(), RoleApi.list()])

      yield* $.state.update((s) => ({
        ...s,
        list: users,
        roles: roles,
        loading: false,
      }))
    }),
  )

  // page destroy: cleanup
  $.lifecycle.onDestroy(Effect.log('Page closed; resources cleaned up'))

  return Effect.void
})
```

## 3. Interaction guards (EffectOp bus & middleware)

Interaction logic (e.g. deleting a user) also lives in Logic and is guarded by middleware.

```ts
	// UserListLogic.ts (continued)
	export const InteractionLogic = UserListDef.logic(($) =>
	  Effect.gen(function* () {
    const delete$ = $.flow.fromAction('deleteUser')

    const deleteImpl = (userId: string) =>
      Effect.gen(function* () {
        yield* UserApi.delete(userId)
        yield* $.state.update((s) => ({
          ...s,
          list: s.list.filter((u) => u.id !== userId),
        }))
        yield* ToastService.success('Deleted')
      })

    // Run a guarded flow:
    // - Runtime lifts each deleteImpl execution to an EffectOp(kind = "flow")
    // - a global MiddlewareStack can attach cross-cutting concerns (error toast / loading, etc.) at the EffectOp layer
    yield* delete$.pipe(
      $.flow.run((userId) =>
        Effect.gen(function* () {
          yield* WithLoading(
            WithErrorToast(
              deleteImpl(userId),
              { name: 'deleteUser' },
            ),
          )
        }),
      ),
    )
  }),
)
```

## 4. Build the runtime (`ModuleDef.implement` + `Logix.Runtime.make`)

Finally, `ModuleDef.implement` composes the pieces, and `Logix.Runtime.make` combines the root program module (or its `ModuleImpl`) with infrastructure Layers into a runnable Runtime.

```typescript
export const UserListModule = UserListDef.implement({
  initial: { list: [], roles: [], loading: false },
  logics: [LifecycleLogic, InteractionLogic],
})

export const UserListImpl = UserListModule.impl

export const UserListRuntime = Logix.Runtime.make(UserListModule, {
  layer: AppInfraLayer,
})
```

This Runtime can be mounted in React via `RuntimeProvider runtime={UserListRuntime}`, and can also be used in tests by running Effects with `UserListRuntime.run*`.

## 5. Domain modules: Form and Query (shared imports)

In real products, “forms” and “queries” are often the two core capabilities of a page. Logix recommends composing them as **regular modules** too:
they are imported into the Root via `imports` as `ModuleImpl`s, sharing the same Runtime, debugging, and replay capability—so you don’t end up with “form state” and “page store state” as two competing sources of truth.

### 5.1 Forms: `@logix/form`

`@logix/form` provides `Form.make(...)` as a high-level entry point. It returns a module object whose `impl` can be imported directly:

```ts
import * as Logix from '@logix/core'
import { Schema } from 'effect'
import * as Form from "@logix/form"

	export const UserForm = Form.make('UserForm', {
	  values: Schema.Struct({ name: Schema.String }),
	  initialValues: { name: '' },

  // Two-phase validation (similar to RHF mode/reValidateMode):
  // - before first submit: controlled by validateOn (default ["onSubmit"])
  // - after first submit: controlled by reValidateOn (default ["onChange"])
  validateOn: ['onSubmit'],
	  reValidateOn: ['onChange'],
	})

	// RootDef = Logix.Module.make(...)
	export const RootModule = RootDef.implement({
	  initial: { /* ... */ },
	  imports: [UserForm.impl],
	})

export const RootImpl = RootModule.impl
```

The form error tree is normalized to the `$list/rows[]` shape: an array field error path like `a.0.x` is written to `errors.a.rows.0.x`. List-level and row-level errors go to `errors.a.$list` and `errors.a.rows.0.$item` respectively (so cross-row validation and per-row hints can coexist).

Besides calling from React components, you can also use default actions in Logic via `$.use(UserForm)` (React/Logic are consistent): `controller.validate` / `controller.validatePaths` / `controller.reset` / `controller.setError` / `controller.clearErrors` / `controller.handleSubmit`.

In React, prefer subscribing to “view state” via selectors, to avoid unnecessary re-renders from subscribing to the entire values/errors tree:

```ts
import { useForm, useFormState } from '@logix/form/react'

const form = useForm(UserForm)
const canSubmit = useFormState(form, (v) => v.canSubmit)
```

For the full form documentation path, see: [Form](../../form).

### 5.2 Queries: `@logix/query`

`@logix/query` collapses “query params → resource loading → result snapshots” into a module: results live in module state (subscribable, debuggable, replayable).

```ts
import { Schema } from 'effect'
import * as Query from '@logix/query'

export const SearchQuery = Query.make('SearchQuery', {
  params: Schema.Struct({ q: Schema.String }),
  initialParams: { q: '' },
  queries: {
    list: {
      resource: { id: 'user/search' },
      deps: ['params.q'],
      key: (state) => (state.params.q ? { q: state.params.q } : undefined),
    },
  },
})
```

When you need caching/dedup/invalidation, inject an external engine in the Runtime scope and enable takeover in the EffectOp middleware layer. For the full beginner → advanced path, see: [Query](./query).

This way, Query and Form both work inside the same “modules → imports → root runtime” composition chain, keeping API shape and debugging workflow consistent.

## Summary

Logix’s “magic” is a set of well-defined transformations:

1. **Schema**: define type contracts.
2. **Module**: define identifiers and dependency relations.
3. **Logic**: define side effects and state changes.
4. **Bound API**: bridge between Logic and Runtime.
5. **Instance**: `Module.implement` composes state and logic into a Root ModuleImpl.
6. **Execution**: `Logix.Runtime.make` assembles and starts the application/page Runtime.

## Next

Congrats — you’ve completed the Learn core concepts. Next:

- Advanced topic: [Suspense & Async](../advanced/suspense-and-async)
- Testing strategy: [Testing](../advanced/testing)
- React integration recipes: [React integration](../recipes/react-integration)
