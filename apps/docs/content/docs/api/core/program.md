---
title: Program
description: The canonical assembly boundary for a Module.
---

`Program.make(Module, config)` is the public assembly route. It turns a definition object into the business unit that Runtime and React consume.

```ts
const CounterProgram = Logix.Program.make(Counter, {
  initial: { value: 0 },
  logics: [CounterLogic],
  capabilities: {
    services: AppLayer,
    imports: [ChildProgram],
  },
})
```

## Config

| Field | Purpose |
| --- | --- |
| `initial` | Initial state for the module. |
| `logics` | Logic units mounted into this Program. |
| `capabilities.services` | Service `Layer` or array of layers. |
| `capabilities.imports` | Child Programs available through `$.imports.get(...)` / `useImportedModule(...)`. |
| `stateTransaction` | Transaction instrumentation and tuning options. |

## Why Program is the boundary

- It keeps authoring (`Module`) separate from assembly (`Program`).
- It centralizes initial state, services, imports, and transaction policy.
- It is the input for `Runtime.make(...)`, `Runtime.run(...)`, `Runtime.check(...)`, and `Runtime.trial(...)`.
- It is also the local-instance input for `useModule(Program, options)`.

## Non-goals

`Program.make(...)` is not a compatibility wrapper around old module implementations. Do not add a second assembly helper for a domain package; domain packages should return a Program or a value that reduces to this route.

## See also

- [Module](./module)
- [Runtime](./runtime)
- [useModule](/docs/api/react/use-module)
