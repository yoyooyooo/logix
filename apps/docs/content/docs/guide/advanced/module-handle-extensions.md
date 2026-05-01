---
title: Module Handle Extensions (commands/services)
description: Add convenience commands and injectable services to a custom Module handle in both Logic and React.
---

This is an **author-side enhancement** for custom Modules: when you build a reusable module (e.g. a domain package or infrastructure package), you can let callers receive extra fields like `commands` and `services` on the module handle.

Handle extensions are a convenience surface. They do not create another protocol, another state plane, or another event system. Important state changes still flow through standard capabilities like `dispatch/read/changes/actions`.

Typical goals:

- **Reduce boilerplate**: wrap a sequence of `actions.*` + `read` + “small rules” into a single method.
- **Unify handle shape**: imported child resolution in Logic (`yield* $.imports.get(Module.tag)`) and React (`useModule(ModuleTag)` / `useModule(Program)`) receive the same extension fields.
- **Keep one semantic surface**: Actions stay subscribable/diagnosable/replayable; `commands.*` stays a convenience layer for common call sites.

## When to use (for module authors)

- You’re building a module factory / domain module (e.g. `Form.make(...)`, `@logixjs/domain/Crud`’s `make(...)`) and want callers to write less boilerplate.
- You want to package a set of “composed operations” as `commands.*`, usable from both Logic and React.
- You want to organize injectable capabilities (Tags) as `services.*` so application code can provide Layers more easily.

Default field choice: prefer `commands/services`. Reach for other names only when the domain truly needs them.

## When to use Actions vs convenience commands

- **Action**: the module’s public protocol (schema-backed, subscribable via `$.onAction(...)`, clearer diagnostics and replay). Use it for public commands, cross-module collaboration points, and business intents you want to trace.
- **`commands.*`**: handle-level convenience methods built on top of `dispatch/read`. Use them for high-frequency composed operations, default parameters, or light prechecks that improve call sites.

Rule of thumb: **put “what happened” into Actions; put “how to call it conveniently” into `commands.*`.**

## Core mechanism: extend the module handle/reference

The extension point is `logix.module.handle.extend`: attach it to **`module.tag`**. Logix calls it when constructing the “module handle/reference”, and merges the returned object into the base handle.

> Intuition: `commands/services` are not written into state and do not become Actions. They are extra fields on the handle/reference object.

If you attach the extension function to the module `tag`, runtime will merge your extension fields when building the handle/reference:

```ts
const EXTEND_HANDLE = Symbol.for("logix.module.handle.extend")
;(MyModule.tag as any)[EXTEND_HANDLE] = (_runtime, base) => ({
  ...base,
  commands: { /* ... */ },
  services: { /* ... */ },
})
```

Then:

- In Logic, `yield* $.imports.get(MyModule.tag)` returns an imported child handle that includes `commands/services`.
- In React, `useModule(MyModule.tag)` (or a `Program` built from that module) returns a ref with the same extension fields.
- You still keep the standard capabilities on `base` (`read/changes/dispatch/actions/...`).

## A full example: custom module + services + commands (author-side)

```ts
import * as Logix from "@logixjs/core"
import { Context, Effect, Schema } from "effect"

class Api extends Context.Tag("Todo.Api")<Api, { readonly load: () => Effect.Effect<ReadonlyArray<string>> }>() {}
const services = { api: Api } as const

const StateSchema = Schema.Struct({ items: Schema.Array(Schema.String) })
const Actions = { reload: Schema.Void }

type Ext = {
  readonly services: typeof services
  readonly commands: { readonly reload: () => Effect.Effect<void> }
}

const TodoDef = Logix.Module.make<"Todo", typeof StateSchema, typeof Actions, Ext>("Todo", {
  state: StateSchema,
  actions: Actions,
})

const EXTEND_HANDLE = Symbol.for("logix.module.handle.extend")
;(TodoDef.tag as any)[EXTEND_HANDLE] = (runtime: Logix.ModuleRuntime<any, any>, base: Logix.ModuleHandle<any>) => ({
  ...base,
  services,
  commands: {
    reload: () => runtime.dispatch({ _tag: "reload" } as any),
  },
})

export const TodoProgram = Logix.Program.make(TodoDef, {
  initial: { items: [] },
  logics: [
    TodoDef.logic(($) =>
      Effect.gen(function* () {
        yield* $.onAction("reload").runFork(() =>
          Effect.gen(function* () {
            const api = yield* Effect.serviceOption(services.api)
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

- Application code can use `TodoProgram` (or `TodoDef.tag`) in runtime / React code.
- In Logic, a parent Program can import `TodoProgram` and read `yield* $.imports.get(TodoDef.tag)`, receiving `todo.commands.reload()` and `todo.services.api`.
- In React, `useModule(TodoDef.tag)` or `useModule(TodoProgram)` also gets `commands/services`.

## Make TypeScript aware of the extension fields (types)

Put the extension field types into the 4th generic parameter of `Logix.Module.make(...)` (`Ext`):

```ts
type Ext = { readonly commands: MyCommands; readonly services: MyServices }
const MyModule = Logix.Module.make<"My", typeof StateSchema, typeof Actions, Ext>("My", def)
```

Then return `{ ...base, commands, services }` in the extension function so that the type contract matches the runtime value.

## Notes (avoid footguns)

- Avoid “invisible state mutations” in `commands.*` that bypass Actions; prefer wrapping into `dispatch({ _tag: ... })` or `actions.*(...)`.
- The extension function must return an object, and you usually want to keep `...base`; otherwise you’ll lose `read/changes/dispatch/actions` and other fundamentals.
- Attach `logix.module.handle.extend` to `module.tag`, not the `module` object.
- Don’t put non-serializable large objects (DOM, closures, large instances) into state or diagnostic events; commands/services should also stay lightweight.
- If a convenience command performs IO, you still need to obey transaction-window and Effect concurrency/cancellation constraints (keep IO at Effect boundaries).
