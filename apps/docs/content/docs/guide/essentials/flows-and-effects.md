---
title: Logic and effects
description: How Logix logic uses Effect, services, watchers, and run policies.
---

A `Module.logic` value is an Effect program bound to one module. It registers declarations and returns the work that should run for the lifetime of the module instance.

## Builder shape

```ts
const logic = Module.logic("logic-id", ($) =>
  Effect.gen(function* () {
    yield* $.readyAfter(loadInitialConfig, { id: "initial-config" })

    yield* $.onAction("submitted").runLatest((action) =>
      Effect.gen(function* () {
        const api = yield* $.use(ApiService)
        const saved = yield* api.save(action.payload)
        yield* $.state.mutate((draft) => { draft.saved = saved })
      }),
    )
  }),
)
```

The builder is the single authoring surface. There is no separate public setup object.

## Watchers

`$.onAction(tag)` and `$.onState(selector)` create event streams. The builder methods select how each event is executed.

| Method | Semantics |
| --- | --- |
| `run` | Process each event in order. |
| `runLatest` | Keep only the latest event for this trigger. |
| `runExhaust` | Ignore new events while one is running. |
| `runParallel` | Allow concurrent work. |
| `runTask` variants | Long-running task route with pending/error/writeback structure. |

## Services

Use `$.use(ServiceTag)` to read services from the runtime environment. Provide implementations with `Layer` at `Program.make`, `Runtime.make`, or `RuntimeProvider` boundaries.

## Readiness

`$.readyAfter(effect, { id })` delays module readiness until the effect succeeds. The returned run effect can keep running after readiness; it does not block acquisition unless it is registered as a readiness requirement.
