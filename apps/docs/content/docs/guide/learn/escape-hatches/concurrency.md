---
title: Watcher patterns and concurrency
description: Choose sequential, latest, exhaust, parallel, and forked watcher behavior.
---

Inside `Module.logic(...)`, watchers are usually built from `$.onAction(...)`, `$.onState(...)`, or `$.on(...)`.

## Choose the concurrency model

| Helper | Meaning | Typical use |
| --- | --- | --- |
| `run` | sequential; next trigger waits for previous work | ordered workflows |
| `runLatest` | cancel previous in-flight work and keep the latest | search-as-you-type |
| `runExhaust` | ignore new triggers until current work finishes | prevent duplicate submit |
| `runParallel` | allow explicit parallel work | independent fire-and-track jobs |
| `runFork` and variants | attach a long-lived watcher to the module scope | background watchers |

## Common pattern

```ts
const SearchLogic = Search.logic("search-logic", ($) =>
  Effect.gen(function* () {
    yield* $.onAction("keywordChanged").runLatest(
      Effect.gen(function* () {
        const state = yield* $.state.read
        // service work
      }),
    )
  }),
)
```

## Multiple watchers

```ts
const CounterLogic = Counter.logic("counter-watchers", ($) =>
  Effect.gen(function* () {
    yield* $.onAction("inc").runFork(
      $.state.mutate((state) => {
        state.value += 1
      }),
    )

    yield* $.onAction("dec").runFork(
      $.state.mutate((state) => {
        state.value -= 1
      }),
    )
  }),
)
```

`runFork` attaches the watcher and returns quickly. Use raw `Effect.forkScoped` only when you need manual Fiber control.

## Scope rule

Watchers live under the ModuleRuntime scope. A hosted module lives as long as its runtime. A local/keyed React Program instance lives according to `useModule(Program, options)` and its `gcTime`.
