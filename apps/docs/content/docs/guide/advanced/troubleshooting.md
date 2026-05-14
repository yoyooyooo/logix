---
title: Troubleshooting
description: Diagnose missing providers, imports, services, selector breadth, and lifecycle failures.
---

Start from the boundary that failed.

## Provider missing

A React hook that cannot find a runtime needs a `RuntimeProvider` above it, or a test wrapper that supplies one.

## Import missing

A parent program that reads a child tag must import the child program.

```ts
Logix.Program.make(Parent, {
  initial,
  capabilities: { imports: [ChildProgram] },
})
```

`Runtime.check` can report missing program imports before startup.

## Service missing

If logic uses `$.use(Api)`, provide the service layer at program, runtime, or provider scope.

## Broad selector

A selector that returns a new object on every commit can re-render often. Use `fieldValue`, `fieldValues`, or an equality function.

## Lifecycle failure

If acquisition fails, inspect readiness effects registered through `$.readyAfter` and provider `onError` output.
