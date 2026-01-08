---
title: Module Handle Extensions (controller/services)
description: Add ergonomic call sites to a custom Module (works in both Logic `$.use` and React `useModule`).
---

This is an **author-side enhancement** for custom Modules: when you build a reusable module (e.g. a domain package or infrastructure package), you can let callers receive extra fields like `controller` and `services` on the module handle.

Some modules expose `controller.*` (for example `@logixjs/form`). This is not “another state machine”. It is simply bundling common composed operations into convenient methods, and it still works via standard capabilities like `dispatch/read/changes`.

Typical goals:

- **Reduce boilerplate**: wrap a sequence of `actions.*` + `read` + “small rules” into a single method.
- **Unify DX**: the same entry works in Logic (`yield* $.use(Module)`) and React (`useModule(Module)`).
- **Keep the protocol intact**: important state changes still go through Actions (subscribable/diagnosable/replayable); controllers are just sugar.

## When to use (for module authors)

- You’re building a module factory / domain module (e.g. `Form.make(...)`, `CRUDModule.make(...)`) and want callers to write less boilerplate.
- You want to package a set of “composed operations” as `controller.*`, usable from both Logic and React.
- You want to organize injectable capabilities (Tags) as `services.*` so application code can provide Layers more easily.

## When to use Actions vs controllers

- **Action**: the module’s “public protocol” (schema-backed, subscribable via `$.onAction(...)`, clearer diagnostics/replay). Use it for public commands, cross-module collaboration points, and business intents you want to trace.
- **Controller**: handle-level sugar (a wrapper around `dispatch/read`; not a “subscribable event” by itself). Use it to package high-frequency composed operations, default parameters, light validations, etc.

Rule of thumb: **put “what happened” into Actions; put “how to call it more conveniently” into controllers.**

## Core mechanism: extend the return value of `$.use(...)` / `useModule(...)`

The extension point is `logix.module.handle.extend`: attach it to **`module.tag`**. Logix calls it when constructing the “module handle/reference”, and merges the returned object into the base handle.

> Intuition: `controller/services` are not written into state and do not become Actions. They are extra fields on the handle/reference object.

If you attach the extension function to the module `tag`, runtime will merge your extension fields when building the handle/reference:

```ts
const EXTEND_HANDLE = Symbol.for("logix.module.handle.extend")
;(MyModule.tag as any)[EXTEND_HANDLE] = (_runtime, base) => ({
  ...base,
  controller: { /* ... */ },
  services: { /* ... */ },
})
```

Then:

- In Logic, `yield* $.use(MyModule)` returns a handle that includes `controller/services`.
- In React, `useModule(MyModule)` / `useModule(MyModule.tag)` returns a ref with the same extension fields.
- You still keep the standard capabilities on `base` (`read/changes/dispatch/actions/...`).

## A full example: custom module + services + controller (author-side)

```ts
import * as Logix from "@logixjs/core"
import { Context, Effect, Schema } from "effect"

class Api extends Context.Tag("Todo.Api")<Api, { readonly load: () => Effect.Effect<ReadonlyArray<string>> }>() {}
const services = { api: Api } as const

const StateSchema = Schema.Struct({ items: Schema.Array(Schema.String) })
const Actions = { reload: Schema.Void }

type Ext = {
  readonly services: typeof services
  readonly controller: { readonly reload: () => Effect.Effect<void> }
}

const TodoDef = Logix.Module.make<"Todo", typeof StateSchema, typeof Actions, Ext>("Todo", {
  state: StateSchema,
  actions: Actions,
})

const EXTEND_HANDLE = Symbol.for("logix.module.handle.extend")
;(TodoDef.tag as any)[EXTEND_HANDLE] = (runtime: Logix.ModuleRuntime<any, any>, base: Logix.ModuleHandle<any>) => ({
  ...base,
  services,
  controller: {
    reload: () => runtime.dispatch({ _tag: "reload" } as any),
  },
})

export const TodoModule = TodoDef.implement({
  initial: { items: [] },
  logics: [
    TodoDef.logic(($) =>
      Effect.gen(function* () {
        const todo = yield* $.use(TodoDef)
        yield* $.onAction("reload").runFork(() =>
          Effect.gen(function* () {
            const api = yield* Effect.serviceOption(todo.services.api)
            if (api._tag === "None") return
            const items = yield* api.value.load()
            yield* $.state.update(() => ({ items: Array.from(items) }))
          }),
        )
      }),
    ),
  ],
})
```

What you get:

- Application code can use `TodoModule` (or `TodoDef`) as the module itself and compose it into runtime/imports.
- In Logic, the handle returned by `yield* $.use(TodoModule)` (or `TodoDef`) includes `todo.controller.reload()` and `todo.services.api`.
- In React, `useModule(TodoModule)` / `useModule(TodoModule.tag)` also gets `controller/services`.

## Make TypeScript aware of the extension fields (types)

Put the extension field types into the 4th generic parameter of `Logix.Module.make(...)` (`Ext`):

```ts
type Ext = { readonly controller: MyController; readonly services: MyServices }
const MyModule = Logix.Module.make<"My", typeof StateSchema, typeof Actions, Ext>("My", def)
```

Then return `{ ...base, controller, services }` in the extension function so that “type promise” matches the runtime value.

## Notes (avoid footguns)

- Avoid “invisible state mutations” in controllers that bypass Actions; prefer wrapping into `dispatch({ _tag: ... })` or `actions.*(...)`.
- The extension function must return an object, and you usually want to keep `...base` — otherwise you’ll lose `read/changes/dispatch/actions` and other fundamentals.
- Attach `logix.module.handle.extend` to `module.tag`, not the `module` object.
- Don’t put non-serializable large objects (DOM, closures, large instances) into state/diagnostic events; controllers/service Tags should also stay lightweight.
- If a controller performs IO, you still need to obey transaction-window and Effect concurrency/cancellation constraints (keep IO at Effect boundaries).
