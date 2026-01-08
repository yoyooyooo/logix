---
title: ModuleScope
description: Turn a Host instance into a reusable scope (Provider + use + useImported).
---

# ModuleScope

`ModuleScope` packages “create a Host module instance + a Context Provider + useHost()” into a reusable scope.

It mainly solves two problems:

1. **Avoid prop drilling**: deep modals/subcomponents can directly access the Host handle that belongs to the current route/page scope.
2. **Fix lifecycle ownership**: the module instance lifetime is owned by the route/page boundary Provider, not by a modal component’s mount/unmount.

## Usage

```ts
import { ModuleScope } from '@logixjs/react'
import { RouteHost } from './modules'

export const RouteHostScope = ModuleScope.make(RouteHost.impl, { gcTime: 0 })
```

Attach the Provider at the route/page boundary:

```tsx
export function RoutePage({ routeKey }: { routeKey: string }) {
  return (
    <RouteHostScope.Provider options={{ scopeId: routeKey }}>
      {/* page body */}
      {/* modals */}
    </RouteHostScope.Provider>
  )
}
```

Get the Host handle in a child component (when you need the host itself or multiple submodules):

```ts
const host = RouteHostScope.use()
```

More commonly: directly get an imported submodule handle (sugar):

```ts
const modalA = RouteHostScope.useImported(ModalA.tag)
```

## Bridge (advanced)

If your component is not in the route/page React tree (e.g. a global overlay rendered with a separate `createRoot`), but you still want to reuse the same “route scope (Host instance)”, use `Bridge`:

```tsx
export function OverlayRoot({ routeKey }: { routeKey: string }) {
  return (
    <RouteHostScope.Bridge scopeId={routeKey}>
      {/* You can keep using use()/useImported() here */}
    </RouteHostScope.Bridge>
  )
}
```

Prerequisites:

- The route/page boundary has a corresponding `<RouteHostScope.Provider options={{ scopeId }}>` (Bridge only “retrieves and reuses”; it does not create).
- The root hosting the Bridge and the root hosting the Provider must share the same app runtime (the same runtime tree).
- The runtime must include the infrastructure required by Bridge: this is satisfied by default when you create the runtime with `Logix.Runtime.make(...)`. If you assemble the runtime manually, refer to the advanced docs (not expanded here).

Failure semantics:

- If `scopeId` is not registered or has been released (owner Provider unmounted / changed scopeId), `Bridge` throws a readable error (to avoid silently reusing or returning a wrong instance).

## Notes

- `Provider.options` is forwarded to the internal `useModule(HostImpl, options)` (where `options.scopeId` is mapped to internal `options.key`). `scopeId` distinguishes/reuses a scope (same scopeId reuses; new scopeId creates a new instance).
- `use()` / `useImported()` throws immediately if the Provider is missing (it does not silently fall back to a “global singleton”).

## See also

- [Advanced: Composability map](../../guide/advanced/composability)
