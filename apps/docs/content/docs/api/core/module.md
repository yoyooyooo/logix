---
title: Module
description: Define a module, attach logic, assemble a program, and consume it through Runtime or React.
---

`Module` is the definition-time unit of Logix.

It defines:

- state schema
- action schema
- logic attachment points

`Program` is the assembly-time unit built from a module.

## Define a module

```ts
import * as Logix from "@logixjs/core"
import { Schema } from "effect"

const CounterState = Schema.Struct({
  count: Schema.Number,
})

const Counter = Logix.Module.make("Counter", {
  state: CounterState,
  actions: {
    increment: Schema.Void,
  },
})
```

## Attach logic

```ts
const CounterLogic = Counter.logic("counter-logic", ($) => {
  $.reducer("increment", (state) => ({
    ...state,
    count: state.count + 1,
  }))

  return Effect.void
})
```

## Assemble a program

```ts
const CounterProgram = Logix.Program.make(Counter, {
  initial: { count: 0 },
  logics: [CounterLogic],
})
```

## Consume in React

```tsx
const counter = useModule(CounterProgram, { key: "counter:1" })
```

or, when a shared instance is already hosted:

```tsx
const counter = useModule(Counter.tag)
```

## Notes

- `Module` defines
- `Program` assembles
- `Runtime` executes

## See also

- [Runtime](./runtime)
- [Bound API ($)](./bound-api)
- [useModule](../react/use-module)
