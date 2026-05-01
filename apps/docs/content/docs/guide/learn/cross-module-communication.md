---
title: Cross-module communication
description: Coordinate modules through imports and runtime-scope service lookup without creating circular ownership.
---

Cross-module communication in Logix follows two main routes:

1. parent-scope child resolution through `imports`
2. runtime-scope service lookup through `$.use(Tag)` / `Effect.service(Tag)`

## Imports

Use `imports` when one Program owns a child Program inside the same parent instance scope.

Default route:

1. Put the child Program in `Program.make(..., { capabilities: { imports } })`.
2. In Logic, resolve the child with `$.imports.get(Child.tag)`.
3. Read with `child.read(selector)`, or subscribe with `$.on(child.changes(selector))`.
4. In React, resolve the child with `host.imports.get(Child.tag)` or `useImportedModule(host, Child.tag)`.

```ts
const ChildProgram = Logix.Program.make(Child, {
  initial: { value: 0 },
})

const HostProgram = Logix.Program.make(Host, {
  initial: { childValue: 0 },
  capabilities: {
    imports: [ChildProgram],
  },
  logics: [HostLogic],
})
```

```ts
const HostLogic = Host.logic("host-logic", ($) =>
  Effect.gen(function* () {
    const child = yield* $.imports.get(Child.tag)
    const value = yield* child.read((s) => s.value)
    yield* $.dispatchers.hostSawChild(value)
  }),
)
```

```ts
const SyncChildLogic = Host.logic("sync-child", ($) =>
  Effect.gen(function* () {
    const child = yield* $.imports.get(Child.tag)

    yield* $.on(child.changes((s) => s.value)).run((value) =>
      $.state.mutate((draft) => {
        draft.childValue = value
      }),
    )
  }),
)
```

`Module` does not enter `imports`. The imported unit is always a `Program`.

## Runtime-scope service access

When logic needs a service, read it from the current runtime scope.

```ts
const api = yield* $.use(SearchApi)
```

`$.use(Tag)` is for runtime-scope service lookup. It is not the child Program resolution route.

## File layout

Keep cross-module imports at the logic layer:

- `module.ts` defines module shape
- `logic.ts` consumes other modules or services

This avoids circular ownership at the file graph level.

## Notes

- UI should depend on the host by default
- imported children should be resolved from the parent instance scope
- services should be read from the current runtime scope
- cross-module coordination should stay inside module or page-level logic
- field external-store source bridges are advanced runtime machinery, not the default route for child composition

## See also

- [useImportedModule](../../api/react/use-imported-module)
- [Bound API ($)](../../api/core/bound-api)
