---
title: Route-scope modals
description: 使用普通 Program keys 与 imports 共享 route-owned Logix instances。
---

一个 route 可以持有 host Program instance，并让 modal components 使用同一 runtime scope。

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

如果 modal 需要 child module，通过 Program imports 提供 child，并用 `useImportedModule(...)` 解析。

```ts
const RouteHostProgram = Logix.Program.make(RouteHost, {
  initial,
  capabilities: { imports: [ModalProgram] },
})
```

```tsx
const modal = useImportedModule(host, Modal.tag)
```

不要使用已移除的 scope helper APIs。优先使用 explicit Program keys、imports，以及合适的普通 React props/context。
