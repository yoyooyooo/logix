---
title: Quick Start
description: Define a module, assemble a program, mount a runtime, and read state in React.
---

This quick start builds one minimal counter slice.

## Install

```bash
npm install @logixjs/core @logixjs/react effect
```

## Define a module

```ts
import * as Logix from "@logixjs/core"
import { Schema } from "effect"

export const Counter = Logix.Module.make("Counter", {
  state: Schema.Struct({
    count: Schema.Number,
  }),
  actions: {
    inc: Schema.Void,
  },
})
```

## Attach logic

```ts
import { Effect } from "effect"

export const CounterLogic = Counter.logic("counter-logic", ($) =>
  $.onAction("inc").run(() =>
    $.state.mutate((draft) => {
      draft.count += 1
    }),
  ),
)
```

## Assemble a program

```ts
export const CounterProgram = Logix.Program.make(Counter, {
  initial: { count: 0 },
  logics: [CounterLogic],
})
```

## Create a runtime

```ts
import * as Logix from "@logixjs/core"
import { Layer } from "effect"

export const runtime = Logix.Runtime.make(CounterProgram, {
  layer: Layer.empty,
})
```

## Mount it in React

```tsx
import { RuntimeProvider, useDispatch, useModule, useSelector } from "@logixjs/react"

function CounterView() {
  const counter = useModule(Counter.tag)
  const count = useSelector(counter, (s) => s.count)
  const dispatch = useDispatch(counter)

  return <button onClick={() => dispatch({ _tag: "inc", payload: undefined })}>{count}</button>
}

export function App() {
  return (
    <RuntimeProvider runtime={runtime}>
      <CounterView />
    </RuntimeProvider>
  )
}
```

## Next

- [Cancelable search tutorial](./tutorial-first-app)
- [Modules & State](../essentials/modules-and-state)
- [Flows & Effects](../essentials/flows-and-effects)
