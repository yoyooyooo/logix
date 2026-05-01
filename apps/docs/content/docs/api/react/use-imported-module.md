---
title: useImportedModule
description: Resolve a child module instance from a parent instance's imports scope.
---

`useImportedModule(parent, childTag)` resolves a child module from the imports scope of a parent instance.

It is equivalent to:

```ts
parent.imports.get(childTag)
```

## Usage

```tsx
import { useImportedModule, useModule, useSelector } from "@logixjs/react"
import { HostProgram, ChildModule } from "./modules"

function Page() {
  const host = useModule(HostProgram, { key: "session-a" })
  const child = useImportedModule(host, ChildModule.tag)
  const value = useSelector(child, (s) => s.value)

  return <div>{value}</div>
}
```

## When to use it

Use `useImportedModule(...)` when the UI must directly read or dispatch a child module that belongs to a parent instance scope.

If the UI only needs orchestration, prefer resolving or coordinating the child inside the host logic.

## Notes

- `parent` should be an instance-scoped handle.
- `useImportedModule(...)` does not search across runtime scopes.
- `parent.imports.get(childTag)` is the non-hook equivalent and is often sufficient.
- Logic uses `$.imports.get(childTag)` for the same parent-scope child resolution route.

## See also

- [useModule](./use-module)
- [ModuleScope](./module-scope)
- [Cross-module communication](../../guide/learn/cross-module-communication)
