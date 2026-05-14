---
title: Quick Start
description: Build a counter Program and mount it in React.
---

## 1. Define a Module and Logic

```ts
import { Effect, Schema } from "effect"
import * as Logix from "@logixjs/core"

const CounterState = Schema.Struct({ value: Schema.Number })
const CounterActions = { inc: Schema.Void }

export const Counter = Logix.Module.make("Counter", {
  state: CounterState,
  actions: CounterActions,
})

export const CounterLogic = Counter.logic("counter-logic", ($) =>
  Effect.gen(function* () {
    yield* $.onAction("inc").mutate((state) => {
      state.value += 1
    })
  }),
)
```

## 2. Assemble a Program

```ts
export const CounterProgram = Logix.Program.make(Counter, {
  initial: { value: 0 },
  logics: [CounterLogic],
})
```

## 3. Create a Runtime

```ts
export const runtime = Logix.Runtime.make(CounterProgram)
```

## 4. Mount and use in React

```tsx
import { RuntimeProvider, useDispatch, useModule, useSelector } from "@logixjs/react"
import { Counter, runtime } from "./counter"

function CounterView() {
  const counter = useModule(Counter.tag)
  const value = useSelector(counter, (state) => state.value)
  const dispatch = useDispatch(counter)

  return <button onClick={() => dispatch({ _tag: "inc", payload: undefined })}>{value}</button>
}

export function App() {
  return (
    <RuntimeProvider runtime={runtime}>
      <CounterView />
    </RuntimeProvider>
  )
}
```

## What happened

- `Module` declared state and actions.
- `Logic` reacted to the `inc` action.
- `Program` assembled the runnable unit.
- `Runtime` created the execution container.
- React consumed a hosted instance through `useModule(Counter.tag)` and exact state reads through `useSelector(...)`.
