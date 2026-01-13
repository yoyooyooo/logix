---
title: Migrating from Zustand
description: A step-by-step guide to migrate from Zustand to Logix.
---

This guide helps you migrate an existing Zustand-based state management setup to Logix incrementally.

## Concept mapping

| Zustand            | Logix                     | Notes                         |
| ------------------ | ------------------------- | ----------------------------- |
| `createStore`      | `Logix.Module.make`       | define state shape            |
| Store              | Module                    | state container               |
| State              | State Schema              | types defined via Schema      |
| Actions (in store) | Actions + Reducers/Logic  | separate declaration/behavior |
| `set(state)`       | `$.state.update/mutate`   | update state                  |
| `get()`            | `$.state.read`            | read state                    |
| Selectors          | `useSelector(module, fn)` | derive + subscribe            |
| Middleware         | Logic + Flow              | async/effects                 |
| `useStore`         | `useModule`               | React integration             |

## Migration example

### Original Zustand code

```ts
import { create } from 'zustand'

interface CounterState {
  count: number
  increment: () => void
  decrement: () => void
  incrementAsync: () => Promise<void>
}

const useCounterStore = create<CounterState>((set, get) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  incrementAsync: async () => {
    await new Promise((r) => setTimeout(r, 1000))
    set((state) => ({ count: state.count + 1 }))
  },
}))

// Usage
function Counter() {
  const { count, increment } = useCounterStore()
  return <button onClick={increment}>{count}</button>
}
```

### After migrating to Logix

```ts
import * as Logix from '@logixjs/core'
import { Effect, Schema } from 'effect'

// 1) Define a Module (separate declaration and behavior)
const CounterDef = Logix.Module.make('Counter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
    decrement: Schema.Void,
    incrementAsync: Schema.Void,
  },
  // Sync logic can be expressed as reducers
  reducers: {
    increment: (s) => ({ ...s, count: s.count + 1 }),
    decrement: (s) => ({ ...s, count: s.count - 1 }),
  },
})

// 2) Put async logic into Logic
const CounterLogic = CounterDef.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('incrementAsync').run(() =>
      Effect.gen(function* () {
        yield* Effect.sleep(1000)
        yield* $.state.mutate((d) => {
          d.count++
        })
      }),
    )
  }),
)

// 3) Assemble
const CounterModule = CounterDef.implement({
  initial: { count: 0 },
  logics: [CounterLogic],
})
```

```tsx
// React usage
import { useModule, useSelector, useDispatch } from '@logixjs/react'

function Counter() {
  const counter = useModule(CounterModule)
  const count = useSelector(counter, (s) => s.count)
  const dispatch = useDispatch(counter)

  return <button onClick={() => dispatch({ _tag: 'increment' })}>{count}</button>
}
```

## Incremental migration strategy

### 1. Run in parallel

Keep existing Zustand stores and introduce a Logix Runtime in parallel:

```tsx
function App() {
  return (
    <RuntimeProvider runtime={logixRuntime}>
      {/* New features use Logix */}
      <NewFeature />
      {/* Legacy features keep using Zustand; migrate gradually */}
      <LegacyFeature />
    </RuntimeProvider>
  )
}
```

### 2. Migrate one store at a time

For each store:

1. Create the corresponding `Module.make` definition
2. Move Action implementation into `reducers` + `Logic`
3. Replace `useStore` with `useModule` in components
4. After tests/verification, delete the old store

### 3. Shared state (transition period)

If you need to share state during migration:

```ts
// Read Zustand inside Logix Logic
const BridgeLogic = NewModuleDef.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('syncFromZustand').run(() =>
      Effect.sync(() => {
        const zustandState = useOldStore.getState()
        return $.state.update((s) => ({ ...s, legacy: zustandState }))
      }),
    )
  }),
)
```

## Main benefits

After migrating you get:

| Capability       | Zustand                    | Logix                              |
| --------------- | -------------------------- | --------------------------------- |
| Async race control | manual                    | built-in `runLatest/runExhaust`    |
| Cancel requests  | manual AbortController      | handled via Effect semantics       |
| Type safety      | manual                      | Schema-driven inference            |
| Debug tooling    | devtools middleware needed  | built-in DevTools                  |
| Cross-module communication | manual DI            | `$.use` / `Link.make`              |

## FAQ

### Q: Do we need to migrate everything at once?

No. Keep Zustand and Logix running in parallel and migrate modules one by one.

### Q: Will performance be worse?

Logix uses `SubscriptionRef` for fine-grained subscriptions; performance is comparable to Zustand.

### Q: Is the learning curve steep?

The basics (Module + Logic + useModule) are similar to Zustand. Learn advanced Effect capabilities only when needed.

## Next

- [Thinking in Logix](../essentials/thinking-in-logix)
- [Flows & Effects](../essentials/flows-and-effects)
- [Troubleshooting](../advanced/troubleshooting)
