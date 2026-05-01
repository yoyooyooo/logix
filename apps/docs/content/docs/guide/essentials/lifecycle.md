---
title: Lifecycle
description: Understand lifecycle hooks through scopes, startup phases, and instance ownership.
---

Lifecycle in Logix is governed by `Scope`.

When a scope closes:

- long-running fibers attached to that scope are interrupted
- destroy or finalizer work runs

## Common scope boundaries

1. `Runtime` scope
2. local module scope
3. provider layer scope

These boundaries decide when logic starts, stops, and cleans up.

## Main hooks

### `onInitRequired`

Use `onInitRequired` for initialization that must complete before the instance becomes usable.

```ts
$.lifecycle.onInitRequired(
  Effect.gen(function* () {
    yield* $.state.mutate((draft) => {
      draft.ready = true
    })
  }),
)
```

### `onStart`

Use `onStart` for background work that does not block readiness.

### `onDestroy`

Use `onDestroy` for teardown work bound to instance shutdown.

### `onError`

Use `onError` to handle unhandled runtime defects from background logic.

## Logic phases

Logic has two phases:

- declaration phase
- run phase

Register lifecycle hooks in the declaration phase.
Run watchers, flows, and dependency reads in the run phase.

## React mapping

- shared instances resolved through `useModule(ModuleTag)` live as long as the hosting runtime
- local instances resolved through `useModule(Program, options?)` live as long as their subtree owners
- advanced local routes such as `useLocalModule(...)` follow component-local ownership

## See also

- [Flows & Effects](./flows-and-effects)
- [React integration](./react-integration)
