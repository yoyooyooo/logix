---
title: Lifecycle
description: Instance readiness, running work, disposal, and React ownership.
---

A Logix module instance has two lifecycle lanes: readiness and running work.

## Readiness

```ts
yield* $.readyAfter(loadConfig, { id: "config" })
```

A readiness requirement must finish before the instance is considered ready. If it fails, acquisition fails and the runtime reports the failure.

## Running work

The effect returned from `Module.logic` may keep running after readiness. Watchers, streams, and long-running tasks live in this lane.

```ts
const logic = Module.logic("watch", ($) =>
  Effect.gen(function* () {
    yield* $.onAction("changed").runLatest(handleChange)
  }),
)
```

## Disposal

Runtime disposal closes the scope and finalizers. Use Effect scopes and service finalizers for resources; do not create a second public destroy hook.

## React ownership

- `useModule(Module.tag)` resolves an already hosted instance.
- `useModule(Program, { key })` creates or reuses a local/keyed instance under the current provider.
- Unmounting a local owner releases its runtime cache entry according to provider policy.
