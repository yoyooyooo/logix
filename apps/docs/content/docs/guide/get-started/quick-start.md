---
title: Quick Start
description: Define a module, assemble a program, create a runtime, and read it from React.
---

This is the smallest complete Logix route in React.

## Define a module

```ts
import { Schema } from "effect"
import * as Logix from "@logixjs/core"

const Counter = Logix.Module.make("Counter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
    decrement: Schema.Void,
  },
  reducers: {
    increment: Logix.Module.Reducer.mutate((draft) => {
      draft.count += 1
    }),
    decrement: Logix.Module.Reducer.mutate((draft) => {
      draft.count -= 1
    }),
  },
})
```

Reducers are synchronous state transforms. Use logic for effects, subscriptions, services, and long-running work.

## Add logic

```ts
import { Effect } from "effect"

const CounterLogic = Counter.logic("counter-logic", ($) =>
  Effect.gen(function* () {
    yield* $.readyAfter(Effect.log("Counter ready"), { id: "counter-ready" })

    yield* $.onAction("increment").run(() =>
      Effect.log("increment dispatched"),
    )
  }),
)
```

The builder receives `$`, a module-bound API. Synchronous declarations happen immediately inside the builder; the returned `Effect` is the runtime program.

## Assemble a program

```ts
export const CounterProgram = Logix.Program.make(Counter, {
  initial: { count: 0 },
  logics: [CounterLogic],
})
```

`Program.make` is the public assembly boundary. Imports, service layers, state transaction policy, and declarations converge here.

## Mount React

```tsx
import * as Logix from "@logixjs/core"
import {
  RuntimeProvider,
  fieldValue,
  useDispatch,
  useModule,
  useSelector,
} from "@logixjs/react"

const runtime = Logix.Runtime.make(CounterProgram)

function CounterView() {
  const counter = useModule(Counter.tag)
  const count = useSelector(counter, fieldValue("count"))
  const dispatch = useDispatch(counter)

  return (
    <button onClick={() => dispatch({ _tag: "increment", payload: undefined })}>
      {count}
    </button>
  )
}

export function App() {
  return (
    <RuntimeProvider runtime={runtime}>
      <CounterView />
    </RuntimeProvider>
  )
}
```

`RuntimeProvider` owns the runtime projection. `useModule(Counter.tag)` resolves the shared instance from that runtime. `useSelector` subscribes to a precise read; no-argument whole-state reads are not part of the public route.

## Node run

```ts
await Logix.Runtime.run(CounterProgram, ({ module }) =>
  Effect.gen(function* () {
    yield* module.dispatch({ _tag: "increment", payload: undefined })
    return yield* module.getState
  }),
)
```

Use `Runtime.run` for CLI tasks, smoke tests, and one-shot server-side execution.
