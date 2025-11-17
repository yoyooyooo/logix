---
title: Route-scoped modal keepalive
description: "Use a Host(imports) to model “scoped globals”: keep modal state within a route, dispose everything when leaving the route."
---

This recipe solves a very common UX requirement:

> Within one route, there are many modals. You want to preserve modal state across open/close as much as possible, but once you leave the route, all modal-related modules under that route should be disposed together to avoid state leaking across routes.

To reduce misuse, we split the guidance into two layers:

- **Sweet spot (recommended default)**: copy/paste; no need to understand Env/Scope details.
- **Advanced (use only when needed)**: for cases where you truly need “Provider-level singletons” or “nested Provider partitioning”.

## Sweet spot: Host(imports) = route-scoped “global”

One-sentence mental model:

> **The route Host module owns the scope**; modal modules are `imports` children whose lifecycle follows the Host; components resolve children only via `host.imports.get(...)`.

### 1) Define modal modules (independent)

```ts
import * as Logix from '@logix/core'
import { Schema } from 'effect'

export const ModalADef = Logix.Module.make('ModalA', {
  state: Schema.Struct({ text: Schema.String }),
  actions: { change: Schema.String },
})

export const ModalA = ModalADef.implement({
  initial: { text: '' },
  // logics: [...]
})
```

Repeat for Modal B/C: `Module.make(...)` + `implement(...)` per modal.

### 2) Define the route Host module, and import modals

```ts
export const RouteHostDef = Logix.Module.make('RouteHost', {
  state: Schema.Struct({}),
  actions: { noop: Schema.Void },
})

export const RouteHost = RouteHostDef.implement({
  initial: {},
  imports: [ModalA.impl /*, ModalB.impl, ...*/],
})
```

### 3) Create the Host instance in the route component (scope anchor)

```tsx
import { useModule } from '@logix/react'

export function RoutePage() {
  const host = useModule(RouteHost.impl, {
    // For multi-instance / multi-tab scenarios, provide a stable scopeId via `useModule` `options.key`
    // (e.g. `route:${routeId}`) so the same route instance can be reused.
    gcTime: 0, // dispose immediately after route unmount (no default short keepalive window)
  })

  // ...
}
```

> Tip: in most routing frameworks, “leaving a route” means the route component unmounts; then the Host scope ends and all imported child modules are disposed together.

### 4) Modal components resolve children only from `host.imports`

```tsx
import { useSelector } from '@logix/react'
import { ModalA } from './modules'

export function ModalAView({ host }: { host: any }) {
  // host is the return value of: const host = useModule(RouteHost.impl, ...)
  const modalA = host.imports.get(ModalA.tag)
  const text = useSelector(modalA, (s) => s.text)
  // ...
  return <div>{text}</div>
}
```

What you get:

- **Closing a modal is only UI unmount**, while the `ModalA` module instance remains alive under `host`.
- **As long as the route Host exists** (route not unmounted), reopening the modal reuses the same state.
- **Leaving the route** (Host unmount) disposes the Host and all modal modules under its `imports` together.

You can think of it as:

> Inside `host.runtime`, there is a minimal injector (imports-scope: `ModuleTag -> ModuleRuntime` mapping).  
> `host.imports.get(ModalA.tag)` resolves one entry from that mapping, so it naturally “follows the host” and won’t be GC’d when the modal component unmounts.

### 4.1) Avoid prop drilling: put host into route Context (recommended)

If modals are far away from the route component (many component layers in-between), prefer `ModuleScope.make(...)` from `@logix/react`, which packages “create host instance + Context Provider + useHost()” as a reusable scope:

```tsx
import { ModuleScope } from '@logix/react'
import { RouteHost } from './modules'

export const RouteHostScope = ModuleScope.make(RouteHost.impl, { gcTime: 0 })
```

> Define `RouteHostScope` at module top-level (don’t call `make` inside component render) so Context identity stays stable.
>
> If a child calls `RouteHostScope.use()` without an ancestor `RouteHostScope.Provider`, it throws immediately to tell you the Provider is missing.

Route page usage:

```tsx
export function RoutePage() {
  return (
    <RouteHostScope.Provider>
      {/* page body */}
      {/* modals */}
    </RouteHostScope.Provider>
  )
}
```

In modal components, resolve the child module handle that belongs to this route host instance:

```tsx
import { useSelector } from '@logix/react'
import { ModalA } from './modules'

export function ModalAView() {
  const modalA = RouteHostScope.useImported(ModalA.tag)
  const text = useSelector(modalA, (s) => s.text)
  return <div>{text}</div>
}
```

> If you need multiple child modules or host state itself, do `const host = RouteHostScope.use()` then `host.imports.get(...)`.
>
> For multi-instance / multi-tab, pass `options.scopeId` to the Provider: `<RouteHostScope.Provider options={{ scopeId: routeKey }} />`.

### Common pitfalls (avoid these)

1. Writing `useModule(ModalA.impl)` / `useModule(ModalA)` inside the modal: this creates an **independent instance** that will be released by gcTime after unmount, so you won’t get “follow Host keepalive”.
2. Writing `useModule(ModalA.tag)` inside the modal: this means a **Provider-environment singleton**, which tends to leak state across routes.

## Advanced: when to use `useModule(ModuleTag)`

If you truly need a “Provider-level singleton”, you can use `useModule(ModuleDef)` or `useModule(ModuleTag)`:

- Typical: current user, global config, global router state (created once at app root, shared across the entire app).
- Constraint: it means “singleton in the nearest RuntimeProvider environment”, not a Host(imports) child instance.

If your goal is a “route-scoped global”, prefer the sweet spot: **Host(imports) + host.imports.get(...)**.
