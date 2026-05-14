---
title: Bound API ($)
description: The API available inside Module.logic builders.
---

`$` is the Bound API passed to `Module.logic(id, ($) => ...)`. It is already bound to the module shape, runtime, services, imports, state, and action tokens.

## Common members

| Member | Use |
| --- | --- |
| `$.state.read` | Read the current state inside Effect code. |
| `$.state.update(fn)` | Return an Effect that writes a new state value. |
| `$.state.mutate(fn)` | Return an Effect that mutates a draft. |
| `$.onAction(...)` | Build an intent stream from action tokens/tags/schemas. |
| `$.dispatch(...)` / `$.dispatchers.*` | Dispatch actions. |
| `$.use(...)` | Resolve imported modules or services from Env. |
| `$.imports.get(Module.tag)` | Resolve a child Program from `Program.make(..., { capabilities: { imports } })`. |
| `$.fields(...)` | Declare field behavior during the logic builder phase. |
| `$.readyAfter(effect, options?)` | Add startup readiness work during the logic builder phase. |
| `$.effect(token, handler)` | Register an action side-effect handler. |

## Declaration phase versus run phase

Declaration-only calls must happen synchronously in the builder body. Return the long-running effect as the logic's runtime work.

```ts
const Logic = Module.logic("logic-id", ($) => {
  $.fields({
    total: $.fields.computed({
      deps: ["items"],
      get: (items) => items.reduce((sum, item) => sum + item.price, 0),
    }),
  })

  return Effect.gen(function* () {
    yield* $.onAction("checkout").runParallelFork(/* ... */)
  })
})
```

Do not return `{ setup, run }` from public code.

## Imports

Child Programs are provided at assembly time:

```ts
const HostProgram = Logix.Program.make(Host, {
  initial,
  capabilities: { imports: [ChildProgram] },
})
```

Inside host logic:

```ts
const child = yield* $.imports.get(Child.tag)
yield* child.actions.save()
```

## See also

- [Module](./module)
- [Program](./program)
- [useImportedModule](/docs/api/react/use-imported-module)
