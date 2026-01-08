---
title: "Bound API ($)"
description: The core context object for writing Logix logic.
---

`BoundApi` (usually abbreviated as `$`) is the core context object for writing Logix logic. It provides pre-bound access for a specific Module Shape and Environment.

> If you only write application logic, you can focus on the **“Quick Reference (Daily Use)”** section and ignore the full interface definition and type details.  
> The full signature mainly serves library authors, pattern authors, and engine implementers.

## Overview

```typescript
interface BoundApi<Sh, R> {
  // State access & updates
  readonly state: {
    readonly read: Effect<State>
    readonly update: (f: (prev: State) => State) => Effect<void>
    readonly mutate: (f: (draft: Draft<State>) => void) => Effect<void>
    readonly ref: () => SubscriptionRef<State>
  }

  // Action dispatching & listening
  readonly actions: {
    readonly dispatch: (action: Action) => Effect<void>
    readonly actions$: Stream<Action>
    // ...and shortcuts generated from actionMap
  }

  // Flow building
  readonly flow: FlowApi<Sh, R>
  readonly onAction: ...
  readonly onState: ...
  readonly on: ...

  // Primary reducer definition (optional)
  readonly reducer: (tag: string, reducer: (state: State, action: Action) => State) => Effect<void>

  // Dependency injection
  readonly use: (tagOrModule) => Effect<Service>

  // Structured matching
  readonly match: (value) => FluentMatch
  readonly matchTag: (value) => FluentMatchTag

  // Lifecycle
  readonly lifecycle: {
    // setup-only: register ≠ execute (scheduled by Runtime at the right time)
    // required init: determines instance availability (blocks the init gate)
    readonly onInitRequired: (eff) => void
    // start tasks: does not block availability (starts after ready)
    readonly onStart: (eff) => void
    // legacy alias: same semantics as onInitRequired
    readonly onInit: (eff) => void
    readonly onDestroy: (eff) => void
    readonly onError: (handler) => void
    readonly onSuspend: (eff) => void
    readonly onResume: (eff) => void
    readonly onReset: (eff) => void
  }

  // Traits (setup-only: declare/contribute capability rules)
  readonly traits: {
    /**
     * Declare/contribute traits during setup. Runtime aggregates them during module initialization
     * and produces the “final trait set”.
     *
     * - Setup-only: calling in the run phase fails after setup is frozen (prevents runtime drift).
     * - Input must be a pure data declaration: final traits must not depend on randomness/time/external IO.
     */
    readonly declare: (traits: Record<string, unknown>) => void
  }
}
```

## Quick Reference (Daily Use)

For most application code, you only need to remember these groups of capabilities on `$`:

- State:
  - `$.state.read`: read the current state snapshot;
  - `$.state.update(prev => next)` / `$.state.mutate(draft => { ... })`: update the state;
- Events & Flow:
  - `$.onAction("tag").run(handler)` / `.runLatest(handler)` / `.runExhaust(handler)`;
  - `$.onState(selector).debounce(300).run(handler)`;
  - `$.reducer("tag", (state, action) => nextState)`: register a primary reducer for an Action tag (pure synchronous function);
- Dependency injection:
  - `const api = yield* $.use(ApiService)`;
  - `const $Other = yield* $.use(OtherModule)`;
- Lifecycle (setup-only registration):
  - `$.lifecycle.onInitRequired(effect)` / `.onStart(effect)` / `.onDestroy(effect)` / `.onError(handler)`.

Other properties (`flow`, `match`, `traits`, etc.) have dedicated examples in Learn / Advanced / Recipes. Use those pages based on your scenario.

> Writing tip: `Module.logic(($) => { ...; return Effect.gen(...) })` is split into two phases by default: **setup** (before `return`) and **run** (the returned Effect).  
> Setup only does **registration** (e.g. `$.lifecycle.*`, `$.reducer`), while the run phase is where you can `yield* $.use/$.onAction/$.onState` and other runtime capabilities.  
> `$.lifecycle.*` must be registered in setup; calling it in run triggers the `logic::invalid_phase` diagnostic.

## State

- **`read`**: read the current state snapshot.
- **`update`**: update state with a pure function.
- **`mutate`**: update state with a `mutative`-style Draft mutation (recommended).
- **`ref`**: access the underlying `SubscriptionRef` for advanced reactive operations.

```typescript
// Read
const { count } = yield* $.state.read

// Update
yield* $.state.mutate((draft) => {
  draft.count++
})
```

## Actions

- **`dispatch`**: dispatch an Action.
- **`actions$`**: the raw Action stream.
- **Shortcuts**: if your Module defines an `actionMap`, you can call `$.actions.increment()` directly.

## Flow

See [Flow API](./flow).

- `$.onAction(...)`
- `$.onState(...)`
- `$.flow.run(...)`

## Dependency Injection

- **`use`**: the unified DI entry point. It can return a Handle for another Module, or a Service instance.

```typescript
const userApi = yield* $.use(UserApi)
const otherModule = yield* $.use(OtherModule)
```

## Pattern Matching

Provides a lightweight Fluent-style pattern matching helper (implemented internally in `@logix/core`). Handlers are expected to return `Effect`.

- **`match(value)`**: match on a value.
- **`matchTag(value)`**: match on a tagged union with a `_tag` field.

```typescript
yield* $.matchTag(action)
  .with('increment', () => ...)
  .with('decrement', () => ...)
  .exhaustive()
```

## Lifecycle

Defines lifecycle hooks for a Module instance.

- **`onInit`**: runs when the module instance is initialized.
- **`onDestroy`**: runs when the module instance is destroyed.
- **`onError`**: catches unhandled errors (defects) from Logic.
- **`onSuspend` / `onResume`**: reacts to platform suspend/resume signals (e.g. app goes background/foreground).

```typescript
Module.logic(($) => {
  $.lifecycle.onInit(Effect.log('Module initialized'))
  return Effect.gen(function* () {
    // run phase: watcher/flow/env access
  })
})
```

## Traits (Setup-only)

`$.traits.declare(...)` is used to declare traits during **setup**, so a reusable Logic can carry its capability rules along when it’s reused/composed.

> [!TIP]
> For a quick mental model (how traits relate to transaction windows, convergence, and packages like Form/Query), start here:
> - [Traits (capability rules and convergence)](../../guide/essentials/traits)

### Key semantics

- **Setup-only**: only allowed in setup; after setup ends, traits are frozen to prevent runtime drift.
- **Synchronous declaration**: `declare` is synchronous (`void`). If you write it inside `LogicPlan.setup`, prefer wrapping it with `Effect.sync(() => $.traits.declare(...))`.
- **Provenance**: by default, the current logic unit’s `logicUnitId` is used as the provenance anchor. For stable cross-composition/replay, prefer explicitly providing `logicUnitId` (see the tip below).
- **Pure data**: trait declarations should be serializable and comparable; they must not depend on randomness/time/external IO to determine the final result.

### Example: make a reusable Logic carry traits

```ts
Module.logic(($) => ({
  setup: Effect.sync(() => {
    // The exact shape depends on the trait DSL of the corresponding package (e.g. state trait / form trait)
    const traits = Logix.StateTrait.from(StateSchema)({
      /* ... */
    })
    $.traits.declare(traits)
  }),
  run: Effect.void,
}))
```

> Tip: for stable provenance, explicitly provide `logicUnitId` via `module.logic(build, { id })` or `withLogic/withLogics(..., { id })`.
