---
title: Canonical spine
description: The stable object model for authoring, assembly, execution, React projection, and evidence.
---

Most Logix code should follow one spine:

```text
Module      definition object
Logic       behavior declared on a Module
Program     assembled business unit
Runtime     execution container
React host  provider + hooks that project runtime instances
Evidence    check / trial / compare reports
```

## Object roles

| Object | Created by | Role |
| --- | --- | --- |
| `Module` | `Logix.Module.make(id, def)` | Declares state schema, actions, reducers, metadata, and logic builder. |
| `Logic` | `Module.logic(id, ($) => runEffect)` | Adds behavior. Do declaration work at the builder root; return the run effect. |
| `Program` | `Logix.Program.make(Module, config)` | Freezes initial state, logics, imports, services, and transaction options. |
| `Runtime` | `Logix.Runtime.make(Program, options?)` | Owns execution, module runtimes, scheduling, services, diagnostics, and disposal. |
| React host | `RuntimeProvider`, `useModule`, `useSelector`, `useDispatch` | Projects runtime instances into React without creating a second truth source. |
| Verification | `Runtime.check`, `Runtime.trial`, `Runtime.compare` | Produces structured control-plane reports. |

## Default application shape

```ts
import { Effect, Schema } from "effect"
import * as Logix from "@logixjs/core"

const CounterState = Schema.Struct({ value: Schema.Number })
const CounterActions = { inc: Schema.Void }

const Counter = Logix.Module.make("Counter", {
  state: CounterState,
  actions: CounterActions,
})

const CounterLogic = Counter.logic("counter-logic", ($) =>
  Effect.gen(function* () {
    yield* $.onAction("inc").mutate((state) => {
      state.value += 1
    })
  }),
)

export const CounterProgram = Logix.Program.make(Counter, {
  initial: { value: 0 },
  logics: [CounterLogic],
})

export const runtime = Logix.Runtime.make(CounterProgram)
```

## Rules of thumb

- Do not pass raw module objects to `useModule(...)`; use a hosted `Module.tag` or a `Program`.
- Do not use no-argument `useSelector(handle)`; pass an exact selector or descriptor.
- Do not create package-local React hook families for Form, Query, or domain packages.
- Do not treat Devtools, CLI, or docs examples as a second runtime truth source.
- Put remote resource ownership in service/query layers; keep companion/local facts synchronous.

## See also

- [Modules & State](./modules-and-state)
- [React integration](./react-integration)
- [Runtime API](/docs/api/core/runtime)
- [Program API](/docs/api/core/program)
