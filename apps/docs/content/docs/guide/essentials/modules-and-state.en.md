---
title: Modules & State
description: Learn how to define state and actions in Logix.
---

# Modules & State

In Logix, everything is a Module. A Module is the container for State, Actions, and Logic.

This guide walks you through building a simple counter module from scratch.

### Who is this for?

- You’ve completed the counter example in “Quick Start” and want to understand Module design systematically.
- You’ve used Redux / Zustand and want to compare Logix’s approach.

### Prerequisites

- Basic TypeScript syntax and types
- A rough understanding of “State + Action + Reducer”

### What you’ll get

- Define clear State / Actions schemas for your own product
- Know what belongs in a Module’s `reducers` vs in Logic watchers
- Assemble a reusable module implementation (ModuleImpl) with `Module.make`

## 1. Define State

First, define what the Module state looks like. Logix uses `effect`’s `Schema` to define a strongly typed state structure.

```ts
import { Schema } from 'effect'

// Define State Schema
const State = Schema.Struct({
  count: Schema.Number,
  isLoading: Schema.Boolean,
})
```

## 2. Define Actions

Next, define what operations can happen to the state. Actions are also defined via Schema.

```ts
// Define Actions
const Actions = {
  increment: Schema.Void, // no payload
  decrement: Schema.Void, // no payload
  setValue: Schema.Number, // payload is a number
}
```

## 3. Create the Module blueprint

Now, combine State and Actions into a Module.

```ts
import * as Logix from '@logix/core'

export const CounterDef = Logix.Module.make('Counter', {
  state: State,
  actions: Actions,
})
```

## 4. Implement Logic

After defining the “shape”, implement concrete business logic. A recommended style is for `Module.logic` to return an `Effect.gen`, and write all watchers inside the generator body:

```ts
import { Effect } from 'effect'

const CounterLogic = CounterDef.logic(($) =>
  Effect.gen(function* () {
    // Watch increment
    yield* $.onAction('increment').runFork(
      $.state.update((s) => ({ ...s, count: s.count + 1 })),
    )

    // Watch decrement
    yield* $.onAction('decrement').runFork(
      $.state.update((s) => ({ ...s, count: s.count - 1 })),
    )

    // Watch setValue
    yield* $.onAction('setValue').runFork((value) =>
      $.state.update((s) => ({ ...s, count: value })),
    )
  }),
)
```

The example above updates state through watchers in Logic. For core state changes that are **purely synchronous and have no side effects** (like a counter), you can also declare Primary Reducers via the optional `reducers` field in `Logix.Module`. The Runtime applies them synchronously during `dispatch`. For the separation of responsibilities and a fuller example, see the “Thinking in Logix” page (Primary Reducer vs Watcher).

## 5. Assemble the Implementation

Finally, mount the logic onto the Module and provide initial state.

```ts
export const CounterModule = CounterDef.implement({
  initial: { count: 0, isLoading: false },
  logics: [CounterLogic],
})

export const CounterImpl = CounterModule.impl
```

Now `CounterImpl` can be used in React components.

```tsx
function Counter() {
  const counter = useModule(CounterModule)
  // ...
}
```

## Next

Now that you know how to define state and simple synchronous logic, the next step is handling async flows and side effects.
👉 [Flows & Effects](./flows-and-effects)
