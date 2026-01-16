---
title: Lifecycle
description: Understand lifecycle hooks and how they relate to Runtime and React.
---

A Logix Module’s lifecycle is tightly coupled to Effect’s `Scope`.

### Who is this for?

- You can already write basic Logic and want to handle lifecycle concerns correctly (init / cleanup / error reporting).
- You use Logix in React and want to understand how Module lifecycle maps to component mount/unmount.

### Prerequisites

- You know the basics of Module / Logic.
- You’ve read [Flows & Effects](./flows-and-effects) and understand what long-running watchers are.

### What you’ll get

- Know when initialization belongs in `onInit` vs in watchers on Action/State.
- Understand how `onDestroy` relates to React unmount, and what it is good for.
- Design sensible start/destroy behavior and error reporting strategies.

## Scope cheat sheet (what decides “when it gets cut off”)

In Logix, most questions like “when does my logic start / stop / clean up” boil down to: **which `Scope` this logic is attached to**.

- When a `Scope` is closed:
  - long-lived Fibers attached to that Scope are interrupted;
  - `$.lifecycle.onDestroy(...)` / `Effect.addFinalizer(...)` runs (for cleanup).

Three common Scope boundaries:

1. **Runtime Scope (global)**: created by `Logix.Runtime.make(...)`; closed when you call `runtime.dispose()` (or when Node/CLI `Runtime.runProgram/openProgram` closes `ctx.scope`).
2. **Local Module Scope**: created by `useModule(Impl)` / `useLocalModule(Module)` / `ModuleScope`; closed after the last holder unmounts (optionally delayed by `gcTime`).
3. **Provider layer Scope (local Env)**: created by `RuntimeProvider.layer`; closed when the Provider unmounts or the `layer` changes.

> Tip: `Effect.addFinalizer(...)` is tied to “current Scope closes”; it won’t run immediately when a watcher finishes. If you need “cleanup when this Effect finishes”, use `Effect.acquireRelease` / `Effect.ensuring`.

## Main phases

1.  **Mount (Init)**: the module is mounted.
2.  **Running**: the module is running.
3.  **Unmount (Destroy)**: the module is unmounted.

## Hooks

### `onInitRequired` / `onInit`

Required initialization: determines whether an instance becomes usable. Use it for initialization that must finish before entering the business flow (e.g. loading config).

> `onInit` is a legacy alias; it is equivalent to `onInitRequired`.

Tip: `onInitRequired/onInit` runs before watchers start, so it’s not a good place to `dispatch` an Action that relies on `$.onAction/$.onState` watchers. If you want to reuse logic, extract it as a function and call it both from `onInitRequired` and the corresponding watcher.

```ts
$.lifecycle.onInitRequired(
  Effect.gen(function* () {
    yield* Effect.log('Module mounted')
    yield* $.state.update((s) => ({ ...s, ready: true }))
  }),
)
```

### `onStart`

Start tasks: does not block instance availability. It’s a good place to start background work like polling/subscriptions. Failures go through the same error fallback chain.

```ts
$.lifecycle.onStart(Effect.log('Start background tasks'))
```

### `onDestroy`

Runs when the module is unmounted. Use it for cleanup (even though Effect Scope usually handles most cleanup automatically).

```ts
$.lifecycle.onDestroy(Effect.log('Module unmounted'))
```

### `onError`

Runs when background logic throws an unhandled error.

```ts
$.lifecycle.onError((cause) => Effect.logError('Something went wrong', cause))
```

## Recommended Logic ordering (avoid init noise)

Logix Logic has two phases: **setup → run**. Synchronous calls before `return` register lifecycle hooks and reducers; the returned Effect runs as a long-lived Fiber once the environment is ready. A recommended ordering (to avoid reading Services before Env is ready):

1. Register `$.lifecycle.onError/onInit` at the top of the builder.
2. If you need dynamic reducers, call `$.reducer` next (make sure the target Action has not been dispatched yet).
3. Inside `return Effect.gen(...)`, mount watchers/flows via `$.onAction/$.onState` and read Env/Services there.

In dev mode, if you access `$.use/$.onAction/$.onState` during setup, or call `Effect.run*` at the top level, the Runtime will emit diagnostics like `logic::invalid_phase` / `logic::setup_unsafe_effect`.

## React integration

In React, there are two common lifecycles:

- **Global modules (`useModule(Tag)`)**: resolve the same ModuleRuntime instance from the Runtime; component unmount does not dispose it. `onDestroy` runs only when `runtime.dispose()` (or Node/CLI closes `ctx.scope`).
- **Local modules (`useModule(Impl)` / `useLocalModule(Module)`)**: create instances per subtree/`key`; after the last holder unmounts (optionally delayed by `gcTime`), the Scope closes and `onDestroy` runs.

## Next

Congrats—you’ve finished the Essentials section. Next:

- Dive into core concepts: [Describing modules](../learn/describing-modules)
- Advanced topic: [Suspense & Async](../advanced/suspense-and-async)
- Error handling: [Error handling](../advanced/error-handling)
- Scope mental model: [Scope and Resource Lifetime](../advanced/scope-and-resource-lifetime)
- React integration recipes: [React integration](../recipes/react-integration)
