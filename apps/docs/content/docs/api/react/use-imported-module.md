---
title: useImportedModule
description: Resolve a child module instance from the parent instance's imports scope.
---

When a module composes child modules via `imports`, the UI often needs to read/dispatch the child module **within the parent instance scope** (e.g. Query, sub-forms, sub-features).

`useImportedModule(parent, childModule)` solves this: it resolves `childModule` from the imports scope of the `parent` instance and returns a `ModuleRef` that you can pass directly to `useSelector` / `useDispatch`.

## Usage

```tsx
import { useImportedModule, useModule, useSelector } from '@logixjs/react'
import { HostImpl, ChildModule } from './modules'

function Page() {
  // For multi-instance scenarios (session/tab/sharding), use key to distinguish parent instances
  const host = useModule(HostImpl, { key: 'SessionA' })

  // Resolve the child module under the host instance scope (won't mix across host instances)
  const child = useImportedModule(host, ChildModule.tag)

  const value = useSelector(child, (s) => s.value)
  return <div>{value}</div>
}
```

You can also use the chained sugar (recommended):

```ts
const child = host.imports.get(ChildModule.tag)
```

## Notes

- `parent` must be a handle with “instance scope semantics” (e.g. the return value of `useModule(HostImpl, { key })`, `useModule(HostImpl)`, or `useLocalModule(...)`). Do not use `useModule(HostModule)` (global singleton semantics) as parent when resolving imports.
- `host.imports.get(ChildModule.tag)` returns a stable `ModuleRef`, safe to use directly in render (no `useMemo` needed).

## Best Practices

- **Prefer UI depends on the Host only**: if you only need to “trigger/orchestrate” child behavior, do it inside Host Logic via `$.use(ChildModule)` (or Link/Process), then expose needed state/actions at the Host boundary.
- **When UI must connect to child modules**: only when UI must render child state directly, or pass the child module ref down as props, use `useImportedModule` / `host.imports.get(...)`.
- **Multi-level imports**: you can chain `host.imports.get(A).imports.get(B)`, but prefer resolving once at the boundary and passing the `ModuleRef` down to avoid deep components “climbing the tree” everywhere.

## See Also

- [API: ModuleScope](./module-scope)
- [Advanced: Composability map](../../guide/advanced/composability)
