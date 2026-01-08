---
title: Logic flows
description: Write reactive business logic with Effect.
---

In Logix, business logic is no longer scattered across component callbacks. Instead, it lives as **Logic Flows**. A Flow is essentially a reactive pipeline:

`Event Source -> Transformation -> Effect Execution`

### Who is this for?

- You can already write simple `$.onAction / $.onState` logic and want more advanced patterns (debounce + race handling + merging).
- You want to use Logix to host long-running business processes such as search, polling, and batching.

### Prerequisites

- You’ve read [Flows & Effects](../essentials/flows-and-effects) and understand `run / runLatest / runExhaust`.
- You have a basic intuition for Effect and Stream (start with the Logic DSL / Flow API tabs; read Raw Effect only when needed).

### What you’ll get

- Write production-grade logic: “watch state → debounce → async request → update state” using the Fluent DSL.
- Understand the mapping between Logic DSL / Flow API / Raw Effect, preparing you to build reusable Patterns.

## Core APIs

The Bound API (`$`) is the entry point for building Flows:

- **`$.onAction`**: watch Action dispatches
- **`$.onState`**: watch State changes
- **`$.flow`**: stream operators (e.g. `debounce`, `filter`) and execution strategies (e.g. `run`, `runLatest`)

## Example: search autocomplete

This is a classic “watch state → debounce → handle races → async request” scenario.

```typescript tab="Logic DSL"
import { Effect } from 'effect'

SearchModule.logic(($) =>
  Effect.gen(function* () {
    // 1) Watch keyword changes (Logic DSL)
    // $.onState returns a Fluent Flow object you can chain directly.
    yield* $.onState((s) => s.keyword).pipe(
      $.flow.debounce(300), // debounce 300ms
      $.flow.filter((kw) => kw.length > 2), // trigger only when length > 2
      $.flow.runLatest((kw) =>
        Effect.gen(function* () {
          // runLatest handles races
          const api = yield* $.use(SearchApi)
          const results = yield* api.search(kw)
          yield* $.state.update((s) => ({ ...s, results }))
        }),
      ),
    )
  }),
)
```

```typescript tab="Flow API"
import { Effect } from 'effect'

SearchModule.logic(($) =>
  Effect.gen(function* () {
    // 1) Get the raw Stream
    const keyword$ = $.flow.fromState((s) => s.keyword)

    // 2) Define side effect
    const searchEffect = (kw: string) =>
      Effect.gen(function* () {
        const api = yield* $.use(SearchApi)
        const results = yield* api.search(kw)
        yield* $.state.update((s) => ({ ...s, results }))
      })

    // 3) Assemble the Flow manually
    yield* keyword$.pipe(
      $.flow.debounce(300),
      $.flow.filter((kw) => kw.length > 2),
      $.flow.runLatest(searchEffect),
    )
  }),
)
```

```typescript tab="Raw Effect"
import { Effect, Stream } from 'effect'

// This shows how Logix can be implemented with Effect Stream under the hood.
SearchModule.logic(($) =>
  Effect.gen(function* () {
    // 1) Get a Stream from State
    yield* Stream.fromEffect($.state.read).pipe(
      Stream.map((s) => s.keyword),
      Stream.changes, // emit only when value changes
      Stream.debounce('300 millis'),
      Stream.filter((kw) => kw.length > 2),
      // runLatest is essentially a switch map
      Stream.flatMap(
        (kw) =>
          Effect.gen(function* () {
            const api = yield* $.use(SearchApi)
            const results = yield* api.search(kw)
            yield* $.state.update((s) => ({ ...s, results }))
          }),
        { switch: true },
      ),
      Stream.runDrain, // run the stream
    )
  }),
)
```

## Concurrency strategies

Logix provides multiple execution strategies for concurrent events. They map directly to the `FlowBuilder` implementation:

| API               | Semantics              | Typical use cases                                                  |
| :---------------- | :--------------------- | :----------------------------------------------------------------- |
| **`run`**         | **Sequential**         | Default. Runs one Effect at a time; good for ordered operations.   |
| **`runParallel`** | **Unbounded parallel** | Run all events concurrently; good for independent logging/tracking.|
| **`runLatest`**   | **Switch (latest wins)** | Cancel in-flight Effect on new events; good for search/tab switch. |
| **`runExhaust`**  | **Exhaust**            | Ignore new events while running; good for submit (prevent double-click). |
| (removed)         |                        |                                                                    |

## State updates

In Flows, you typically update state with:

- **`$.state.update(prev => next)`**: pure functional update
- **`$.state.mutate(draft => ...)`**: mutable Draft update (recommended; powered by `mutative`)

```typescript
$.onAction('toggle').run(() =>
  $.state.mutate((draft) => {
    draft.isOpen = !draft.isOpen
  }),
)
```

## Composition and reuse

Because Logic is an `Effect` under the hood, you can compose them easily:

```typescript
const FeatureLogic = Effect.all([SearchLogic, PaginationLogic, FilterLogic])
```

## Next

- State management strategies: [Managing state](./managing-state)
- Lifecycle and watcher patterns: [Lifecycle and watchers](./lifecycle-and-watchers)
- Cross-module collaboration: [Cross-module communication](./cross-module-communication)
