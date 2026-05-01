---
title: ModuleScope
description: Package a host instance into a reusable scope with Provider, use, and useImported helpers.
---

`ModuleScope` turns a host instance into a reusable scope.

It is an advanced helper for cases where a route or page should own one host instance and deep descendants should resolve that host or its imports without prop drilling.

## Usage

```ts
import { ModuleScope } from "@logixjs/react"
import { RouteHostProgram } from "./modules"

export const RouteHostScope = ModuleScope.make(RouteHostProgram, { gcTime: 0 })
```

```tsx
export function RoutePage({ routeKey }: { routeKey: string }) {
  return (
    <RouteHostScope.Provider options={{ scopeId: routeKey }}>
      <PageBody />
    </RouteHostScope.Provider>
  )
}
```

Child components may resolve:

```ts
const host = RouteHostScope.use()
const modalA = RouteHostScope.useImported(ModalA.tag)
```

## Bridge

`Bridge` reuses an already-registered scope from another React root:

```tsx
export function OverlayRoot({ routeKey }: { routeKey: string }) {
  return (
    <RouteHostScope.Bridge scopeId={routeKey}>
      <Overlay />
    </RouteHostScope.Bridge>
  )
}
```

## Notes

- `ModuleScope` is an advanced scope helper
- it does not create a second host law
- the provider owns scope lifetime
- `use()` and `useImported()` fail fast when the provider is missing

## See also

- [useImportedModule](./use-imported-module)
- [useModule](./use-module)
