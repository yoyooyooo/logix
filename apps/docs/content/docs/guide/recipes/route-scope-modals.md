---
title: Route-scope modals
description: Share route-owned Logix instances with ordinary Program keys and imports.
---

A route can own a host Program instance and let modal components use the same runtime scope.

```tsx
function RoutePage({ routeId }: { routeId: string }) {
  const host = useModule(RouteHostProgram, { key: `route:${routeId}` })

  return (
    <>
      <RouteMain host={host} />
      <RouteModal host={host} />
    </>
  )
}
```

If the modal needs a child module, provide the child through Program imports and resolve it with `useImportedModule(...)`.

```ts
const RouteHostProgram = Logix.Program.make(RouteHost, {
  initial,
  capabilities: { imports: [ModalProgram] },
})
```

```tsx
const modal = useImportedModule(host, Modal.tag)
```

Do not use removed scope helper APIs. Prefer explicit Program keys, imports, and ordinary React props/context where appropriate.
