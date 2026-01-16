---
title: Scope and Resource Lifetime
description: A practical mental model for “when logic starts, when it gets interrupted, and when cleanup runs” in Effect / Logix.
---

Many “mysterious bugs” have the same root cause:

> You assumed a piece of logic is attached to lifecycle A, but it is actually attached to lifecycle B’s `Scope`.

Once you get `Scope` right, `onDestroy`, cancellation, interruption, finalizers, and React Strict Mode mount/unmount behavior all become explainable with one model.

## 1) What is a `Scope`?

In Effect, a `Scope` is a **resource attachment point**:

- resources register themselves on a `Scope` (connections, subscriptions, background Fibers, registry entries, …);
- when the `Scope` is closed:
  - long-lived Fibers attached to it are interrupted;
  - registered finalizers run (cleanup).

## 2) The 4 APIs you must be able to map

These four APIs form the minimal “resource lifetime” grammar:

1. `Effect.scoped(effect)`: open a temporary Scope, run `effect`, and close the Scope automatically.
2. `Layer.scoped(Tag, effect)`: mount a lifecycle-managed service onto the current Scope.
3. `Effect.forkScoped(effect)`: attach a Fiber to the current Scope (interrupted on Scope close).
4. `Effect.addFinalizer(cleanup)`: register cleanup on the current Scope (runs on Scope close).

> Key point: `Effect.addFinalizer(...)` runs when the **current Scope closes**, not when the current Fiber finishes.
> If you need “cleanup when this Effect finishes”, use `Effect.acquireRelease` / `Effect.ensuring`.

## 3) The 3 questions to locate the Scope boundary

To answer “when does it get cut off / when does cleanup happen”, ask:

1. **Who created the current Scope?** (`Effect.scoped` / `Layer.buildWithScope` / a React hook / your host code)
2. **Who closes it?** (`runtime.dispose()` / `Scope.close(...)` / React unmount / key change / GC)
3. **What is attached to it?** (Fibers forked via `forkScoped`, cleanup registered via `addFinalizer`)

## 4) Common Scope boundaries in Logix (know these by heart)

Logix “productizes” lifecycles, but it’s still Scope underneath:

### 4.1 Runtime Scope (global)

- held by the Runtime created via `Logix.Runtime.make(...)`
- typical close:
  - the host calls `runtime.dispose()`;
  - Node/CLI uses `Runtime.runProgram/openProgram`, which closes `ctx.scope` on finish/signal.
- React: `RuntimeProvider` does **not** automatically call `runtime.dispose()` (a runtime may be shared). Therefore:
  - typical SPA: export a module-level singleton runtime (don’t create it in render) and you usually don’t need an explicit dispose;
  - micro-frontends / repeated mount-unmount / tests: call `runtime.dispose()` at the host boundary that created the runtime (e.g. micro-frontend `unmount()`, or your React root teardown).
- impact: global modules resolved via `useModule(Tag)` run `onDestroy` here.

### 4.2 Local Module Scope (local / multi-instance)

- created/managed by `useModule(Impl)` / `useLocalModule(Module)` / `ModuleScope` (usually with caching and `gcTime`)
- typical close: after the last holder unmounts (optionally delayed by `gcTime`)
- impact: local module `onDestroy` is “instance scope closes”, not “a single component unmounts”.

### 4.3 `RuntimeProvider.layer` Scope (local Env)

- each `RuntimeProvider.layer` builds its `Layer` inside an independent Scope
- typical close: Provider unmounts, or the `layer` reference changes and triggers a rebuild
- impact: affects only subtree Env overrides (services / logger / debug sinks, etc.), not `runtime.dispose()`.

## 5) `addFinalizer` vs `ensuring/acquireRelease`: don’t mix them up

### 5.1 You want “cleanup when Scope closes” → use `addFinalizer`

Typical: register/unregister, subscribe/unsubscribe, registry entries.

```ts
const Logic = M.logic(($) =>
  Effect.gen(function* () {
    const unsubscribe = subscribeSomething()
    yield* Effect.addFinalizer(() => Effect.sync(() => unsubscribe()))
  }),
)
```

### 5.2 You want “cleanup when this Effect finishes” → use `ensuring/acquireRelease`

Typical: open → use → close, even on failure/interruption.

```ts
const program = Effect.acquireRelease(
  Effect.sync(() => openResource()),
  (res) => Effect.sync(() => closeResource(res)),
).pipe(Effect.flatMap((res) => useResource(res)))
```

## 6) Common pitfalls (worth checking in code review)

- Treating `useModule(Tag)` as “local state disposed on component unmount”: wrong. It’s Runtime-scoped; lifetime is driven by `runtime.dispose()`.
- Creating a new `Layer` / new deps array every render under `RuntimeProvider`: causes frequent Provider layer Scope rebuilds; memoize with `useMemo`.
- Doing IO / reading Env in the setup phase of `logic()`: likely to trigger `logic::invalid_phase` / `logic::setup_unsafe_effect`; move IO into `onInitRequired/onStart` or run-phase watchers.
- Expecting `addFinalizer` to run when a watcher finishes: wrong. `addFinalizer` is Scope-bound; use `ensuring/acquireRelease` for task-level cleanup.

## Next

- Watcher mounting/stopping patterns: [Lifecycle and Watchers](../learn/lifecycle-and-watchers).
- “Actually cancel the HTTP request”: [Cancelable IO (cancellation and timeouts)](./resource-cancellation).
