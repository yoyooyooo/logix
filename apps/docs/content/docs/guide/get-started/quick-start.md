---
title: Quick Start
description: Build your first Logix app in under 30 minutes.
---

This guide walks you through building a minimal, runnable counter app from scratch.

> **Who is this for?**
>
> - You’ve read the “Introduction” and want to get a demo running immediately.
> - You’re comfortable with React basics but still new to Logix / Effect.
>
> **Prerequisites**
>
> - You can create a React app (Vite / Next.js, any scaffold is fine).
> - You can write simple TypeScript components.
>
> **What you’ll get**
>
> - Wire a Logix Runtime into your project
> - Define the simplest possible Module and Logic
> - Read state and dispatch Actions from React

## 1. Install

```bash
npm install @logix/core @logix/react effect
```

## 2. Define a Module (State and Actions)

First, define the simplest possible counter Module in any directory:

```typescript
// counter.module.ts
import * as Logix from "@logix/core"
import { Schema } from "effect"

export const CounterDef = Logix.Module.make('Counter', {
  state: Schema.Struct({
    count: Schema.Number,
  }),
  actions: {
    inc: Schema.Void,
  },
})
```

This step does only two things:

- Describe the State shape with Schema: a single `count: number`.
- Define the Actions that can happen: a single `inc` with no payload.

## 3. Write Logic (how Actions are handled)

Next, write the simplest logic: whenever we receive an `inc` Action, increment `count` by 1.

```typescript
// counter.logic.ts
import { Effect } from "effect"
import { CounterDef } from "./counter.module"

export const CounterLogic = CounterDef.logic(($) =>
  Effect.gen(function* () {
    // Listen to the "inc" action and update this Module's state.
    yield* $.onAction("inc").update((prev) => ({
      ...prev,
      count: prev.count + 1,
    }))
  }),
)
```

You can think of `Effect.gen` as “describing a program in synchronous-looking style”, and `yield*` as a rough equivalent of `await`.

## 4. Assemble a Module implementation (a reusable blueprint)

In most real projects, you’ll assemble “ModuleDef + initial state + logic” into a reusable program module (it includes the `.impl` blueprint, consumed by the Runtime and React):

```typescript
// counter.impl.ts
import { CounterDef } from "./counter.module"
import { CounterLogic } from "./counter.logic"

export const CounterModule = CounterDef.implement({
  initial: { count: 0 },
  logics: [CounterLogic],
})

export const CounterImpl = CounterModule.impl
```

From here on, you can use `CounterModule` (or its `CounterImpl`) to create runtime instances—both in React and in tests.

## 5. Create a Runtime and mount it in React

At your app entry, you need to:

1. Construct a Runtime from a root program module (or its `ModuleImpl`).
2. Provide it to the React tree via `RuntimeProvider`.

```tsx
// runtime.ts
import * as Logix from "@logix/core"
import { Layer } from "effect"
import { CounterModule } from "./counter.impl"

// No extra service dependencies yet; Layer.empty is enough.
export const AppRuntime = Logix.Runtime.make(CounterModule, {
  layer: Layer.empty,
})
```

```tsx
// App.tsx (or any app entry)
import { RuntimeProvider } from "@logix/react"
import { AppRuntime } from "./runtime"
import { CounterView } from "./CounterView"

export function App() {
  return (
    <RuntimeProvider runtime={AppRuntime}>
      <CounterView />
    </RuntimeProvider>
  )
}
```

## 6. Read state and dispatch Actions in a component

Finally, use `useModule` and `useSelector` / `useDispatch` inside a component to read state and dispatch Actions:

```tsx
// CounterView.tsx
import { useModule, useSelector, useDispatch } from "@logix/react"
import { CounterDef } from "./counter.module"

export function CounterView() {
  // Get the runtime instance for the Module.
  const counter = useModule(CounterDef)

  // Subscribe only to count to avoid unnecessary re-renders.
  const count = useSelector(counter, (s) => s.count)

  // Dispatch Actions
  const dispatch = useDispatch(CounterDef)

  return (
    <button onClick={() => dispatch({ _tag: "inc" })}>
      Count: {count}
    </button>
  )
}
```

At this point, you’ve completed a full Logix flow:

- Define a Module (State + Actions).
- Orchestrate business logic with `$` inside Logic.
- Create a Runtime and provide it via `RuntimeProvider`.
- Read state and dispatch Actions via React hooks.

Next, consider reading:

- [Tutorial: your first business flow (cancelable search)](./tutorial-first-app)
- (Forms) [Form Quick Start](../../form/quick-start)
- [Modules & State](../essentials/modules-and-state)
- [Flows & Effects](../essentials/flows-and-effects)
