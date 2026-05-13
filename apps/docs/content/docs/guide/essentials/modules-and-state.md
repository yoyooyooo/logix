---
title: Modules & State
description: Define module state, actions, reducers, logic, and programs.
---

`Module` is the definition unit of Logix.

It describes:

- state
- actions
- logic attachment points

`Program` is the assembly unit built from a module.

## State

```ts
import { Schema } from "effect"

const State = Schema.Struct({
  count: Schema.Number,
  isLoading: Schema.Boolean,
})
```

State is defined with `Schema`.

## Actions

```ts
const Actions = {
  increment: Schema.Void,
  decrement: Schema.Void,
  setValue: Schema.Number,
}
```

Actions define the operations that may occur on module state.

## Module definition

```ts
import * as Logix from "@logixjs/core"

export const Counter = Logix.Module.make("Counter", {
  state: State,
  actions: Actions,
})
```

## Reducers and logic

Pure synchronous state transitions belong in reducers:

```ts
const Counter = Logix.Module.make("Counter", {
  state: State,
  actions: Actions,
  reducers: {
    increment: (state) => ({ ...state, count: state.count + 1 }),
  },
})
```

Side effects, linkage, and watchers belong in logic:

```ts
import { Effect } from "effect"

const CounterLogic = Counter.logic("counter-logic", ($) => {
  $.reducer("decrement", (state) => ({ ...state, count: state.count - 1 }))

  return $.onState((s) => s.count).runFork((count) =>
    count === 0 ? Effect.log("count is zero") : Effect.void,
  )
})
```

## Program assembly

```ts
const CounterProgram = Logix.Program.make(Counter, {
  initial: { count: 0, isLoading: false },
  logics: [CounterLogic],
})
```

Programs are the reusable assembly units consumed by Runtime and the React host.

## See also

- [Thinking in Logix](./thinking-in-logix)
- [Flows & Effects](./flows-and-effects)
- [Runtime](../../api/core/runtime)
