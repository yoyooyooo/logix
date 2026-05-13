---
title: Route-scoped modal keepalive
description: Keep modal state within a route by letting a host instance own imported child modules.
---

This recipe models route-scoped modal state through one host instance.

The route host owns scope.
Modal modules are imported children resolved from that host scope.

## Host program

```ts
export const RouteHostProgram = Logix.Program.make(RouteHostDef, {
  initial: {},
  capabilities: {
    imports: [ModalAProgram],
  },
})
```

## Route boundary

```tsx
export function RoutePage() {
  const host = useModule(RouteHostProgram, { gcTime: 0 })
  return <ModalAView host={host} />
}
```

## Modal resolution

```tsx
function ModalAView({ host }: { host: any }) {
  const modalA = host.imports.get(ModalA.tag)
  const text = useSelector(modalA, (s) => s.text)
  return <div>{text}</div>
}
```

With this structure:

- closing a modal only unmounts UI
- leaving the route disposes the host and its imported modal modules together

## ModuleScope variant

When prop drilling is undesirable, `ModuleScope` can package the same pattern:

```ts
export const RouteHostScope = ModuleScope.make(RouteHostProgram, { gcTime: 0 })
```

## See also

- [ModuleScope](../../api/react/module-scope)
- [useImportedModule](../../api/react/use-imported-module)
