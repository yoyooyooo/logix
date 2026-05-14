---
title: useImportedModule
description: Resolve a child Program from a parent instance import scope.
---

`useImportedModule(parent, childTag)` resolves a child module from the import scope of a parent instance.

The child must be provided as a Program at assembly time:

```ts
const HostProgram = Logix.Program.make(Host, {
  initial,
  capabilities: {
    imports: [ChildProgram],
  },
})
```

React usage:

```tsx
const host = useModule(HostProgram, { key: "session-a" })
const child = useImportedModule(host, Child.tag)
const childValue = useSelector(child, (state) => state.value)
```

Use this when the UI must read or dispatch a child instance that belongs to a parent instance scope.

## Boundaries

- It does not search across unrelated runtime scopes.
- It does not create the child Program by itself.
- It does not replace `Program.make(..., { capabilities: { imports } })`.

## See also

- [Program](/docs/api/core/program)
- [useModule](./use-module)
