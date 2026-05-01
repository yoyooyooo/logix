---
title: Handle
description: Consume modules and services through stable handles inside logic.
---

Inside logic, dependency consumption resolves to a handle.

Two handle shapes matter:

- imported child handle, when consuming a child Program from the parent imports scope
- service handle, when consuming a runtime service tag

## Imported child handle

Use an imported child handle when the consumed dependency is a child Program owned by the current parent scope.

```ts
const child = yield* $.imports.get(Child.tag)
const value = yield* child.read((s) => s.value)
```

Typical capabilities:

- read state
- observe changes
- dispatch actions

The child Program must be provided through `Program.make(..., { capabilities: { imports: [ChildProgram] } })`.

## Service handle

Use a service handle when the consumed dependency is an injected runtime service.

```ts
const api = yield* $.use(UserService)
```

This is appropriate when the external system remains the source of truth and Logix should consume it without mirroring it as module state.

## Notes

- use imported child Programs when the dependency should become a Logix state asset inside the parent scope
- use services when the external system should remain the source of truth

## See also

- [Bound API ($)](./bound-api)
- [Cross-module communication](../../guide/learn/cross-module-communication)
