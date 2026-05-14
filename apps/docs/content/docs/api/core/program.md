---
title: Program
description: Assembly-time business unit for modules, logic, imports, services, and state policy.
---

`Program.make(Module, config)` is the public assembly boundary. It turns a definition object into a runnable business unit.

## `Program.make`

```ts
const Program = Logix.Program.make(Module, {
  initial,
  logics: [LogicA, LogicB],
  capabilities: {
    imports: [ChildProgram],
    services: [ApiLive, LoggerLive],
  },
  stateTransaction: {
    fieldConvergeMode: "auto",
  },
})
```

## Config

| Field | Meaning |
| --- | --- |
| `initial` | initial state for the module. |
| `logics` | logic units produced by `Module.logic`. |
| `capabilities.imports` | child programs available by module tag. |
| `capabilities.services` | service layers for the program. |
| `stateTransaction` | module-level transaction policy. |

## Why it exists

`Program` is where declarations and runtime assets converge before execution. React local ownership also uses programs: `useModule(Program, { key })`.

## Boundary

Do not bypass `Program.make` with module implementation helpers. `Runtime.make` expects a program.
