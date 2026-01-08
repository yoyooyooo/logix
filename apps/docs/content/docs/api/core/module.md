---
title: Module
description: API reference for Module definition and implementation.
---

# Module

`Module` is the core unit in Logix. It encapsulates state, logic, and dependencies.

> **Note for product developers**
>
> - In day-to-day code you only need this chain: `Logix.Module.make` creates a `ModuleDef` → write logic with `ModuleDef.logic(($) => ...)` → get a program module (wrap module, with `.impl`) via `ModuleDef.implement({ initial, logics, ... })`.
> - Full signatures and advanced features (such as `imports` / `processes`) are mainly for architects and library authors.

## 1. Module definition

Use `Logix.Module` to define the module “shape” (contract).

```ts
import * as Logix from '@logixjs/core'
import { Schema } from 'effect'

// 1. Define the State schema
const State = Schema.Struct({
  count: Schema.Number,
  isLoading: Schema.Boolean,
})

// 2. Define Action payload schemas (optional)
const Actions = {
  increment: Schema.Void,
  decrement: Schema.Void,
  setValue: Schema.Number,
}

// 3. Create the ModuleDef blueprint
export const CounterDef = Logix.Module.make('Counter', {
  state: State,
  actions: Actions,
})
```

### API

#### `Logix.Module.make(id, config)`

- **`id`**: `string` - unique module identifier
- **`config`**: `ModuleConfig`
  - **`state`**: `Schema<State>` - schema for state
  - **`actions`**: `Record<string, Schema<Payload>>` - payload schemas for Actions

## 2. Module logic

Use `Module.logic(($) => Effect)` to define business logic. The builder closure is responsible only for **constructing an Effect**. The returned Effect runs in the Runtime run phase as a long-lived Fiber once the Runtime Env is ready.
The recommended “safe default” is to always return a single `Effect.gen`:

```ts
import { Effect } from 'effect'

export const CounterLogic = CounterDef.logic(($) =>
  Effect.gen(function* () {
    // Watch increment: mount a long-lived watcher
    yield* $.onAction('increment').runFork($.state.update((s) => ({ ...s, count: s.count + 1 })))

    // Watch count changes: mount another watcher for logging or linkage
    yield* $.onState((state) => state.count).runFork((count) => Effect.log(`Count changed to ${count}`))
  }),
)
```

### API

#### `Module.logic(implementation)`

- **`implementation`**: `(context: BoundApi) => Effect<void, never, R> | LogicPlan`
  - **`context`**: `BoundApi` - provides state access, Action watching, dependency injection, etc.
  - **Returns**: an Effect (or LogicPlan) that runs in the Logic run phase as a long-lived Fiber once Runtime Env is ready

> Tip: inside the builder closure (before `return`), do registration only (e.g. `$.lifecycle` / `$.reducer`). Do not call run-only capabilities like `$.onAction/$.onState/$.use` there; those calls belong inside the generator body of `Effect.gen`, executed in run phase. A style like `Module.logic(($) => $.onAction("inc").run(...))` triggers the phase guard during setup and is diagnosed as `logic::invalid_phase`.

## 2.1 ModuleHandle (read-only handle)

In the Logic run phase, you can resolve a **`ModuleHandle`** (read-only handle) for another module via `yield* $.use(OtherModule)`. It exposes `read/changes/dispatch/actions`, but does not expose direct state-write capabilities.

- If you need the other side’s `ModuleRuntime` (escape hatch), use `yield* OtherModule.tag`
- If you need a fixed root-provider singleton, use `yield* Logix.Root.resolve(OtherModule.tag)`

## 3. Module implementation

Use `ModuleDef.implement` to bind a module definition to a concrete initial state and logic, producing a runnable program module (wrap module with `.impl`, where `.impl` is the underlying `ModuleImpl` blueprint).

```ts
export const CounterModule = CounterDef.implement({
  initial: { count: 0, isLoading: false },
  logics: [CounterLogic],
})

export const CounterImpl = CounterModule.impl
```

### API

#### `ModuleDef.implement(config)`

- **`config`**: `ModuleImplConfig`
  - **`initial`**: `State` - module initial state
  - **`logics`**: `Array<Logic>` - list of logics to mount
  - **`imports`**: `Array<Layer>` - (optional) statically injected dependency layers

## 4. Module runtime

The module object (and its `.impl`) is only a static definition. To use it in React or other environments, you instantiate it as a `ModuleRuntime`.

In React, you typically rely on `useModule`:

```tsx
const counter = useModule(CounterDef)
```

In pure TS (first build a runtime via `Logix.Runtime.make`):

```ts
const runtime = Logix.Runtime.make(CounterModule, { layer: Layer.empty })

const program = Effect.gen(function* () {
  const counter = yield* CounterDef.tag
  // ...
})

void runtime.runPromise(program)
```

### API

#### `module.impl.layer`

- **Type**: `Layer<ModuleRuntime, never, REnv>`
- **Description**: an Effect Layer for building the module runtime

#### `module.impl.withLayer(layer)` / `module.withLayer(layer)`

### See Also

- [Guide: Modules & State](../../guide/essentials/modules-and-state)
- [Guide: Lifecycle](../../guide/essentials/lifecycle)
