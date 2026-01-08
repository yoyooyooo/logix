---
title: Flow API
description: Low-level API reference for Flow and the Fluent DSL.
---

# Flow API

> **Audience**: library authors, Pattern authors, and anyone interested in the underlying implementation of the Fluent DSL (`$.onState/$.onAction`).  
> For everyday product code, you typically only need the Fluent API on `$` and do not need to call the low-level functions on this page.

In Logix, the Flow API is the set of “low-level Lego bricks” behind the Fluent DSL:

- `$.onState(selector)` / `$.onAction(predicate)` internally uses the Flow API to build Streams and execution strategies.
- Pattern/library code can operate directly on the Flow API to reuse the same concurrency and timing semantics.

## 1. fromState / fromAction: get source streams

```ts
// Derive a stream from the current Module state
const keyword$ = $.flow.fromState((s) => s.keyword)

// Filter a specific Action from the Action stream
const submit$ = $.flow.fromAction(
  (a): a is { _tag: "submit" } => a._tag === "submit",
)
```

## 2. Stream operators: debounce / filter / map …

Flow API exposes a set of operators equivalent or similar to `effect/Stream`, so you can use them in scenarios decoupled from the Bound API:

```ts
yield* keyword$.pipe(
  $.flow.debounce(300),
  $.flow.filter((kw) => kw.length > 2),
  $.flow.map((kw) => kw.trim()),
)
```

The error/environment semantics of these operators follow `Stream`; refer to types for exact behavior.

## 3. Execution strategies: run / runParallel / runLatest / runExhaust

They map one-to-one to `.run*` on the Fluent DSL:

```ts
yield* submit$.pipe(
  $.flow.run(handleSubmit), // sequential
)

yield* keyword$.pipe(
  $.flow.debounce(300),
  $.flow.runLatest(searchEffect), // latest wins
)
```

- `run`: execute handlers sequentially in arrival order.
- `runParallel`: fork one Fiber per event; no concurrency limit.
- `runLatest`: cancel the in-flight Fiber when a new event arrives; keep only the latest.
- `runExhaust`: ignore new events while the handler is running.

## 4. Relation to the Fluent DSL

In terms of types and semantics, the relationship can be summarized as:

- `$.onState(selector).run(handler)` ≈ `$.flow.fromState(selector).pipe($.flow.run(handler))`；
- `$.onAction(predicate).debounce(300).runLatest(handler)` ≈ `$.flow.fromAction(predicate).pipe($.flow.debounce(300), $.flow.runLatest(handler))`。

Implementation-wise, you don’t have to mechanically build the Fluent DSL by composing Flow API calls line-by-line, but you **must preserve semantic equivalence** so DevTools/Intent parsing can map across the two layers.

### See Also

- [Guide: Flows & Effects](../../guide/essentials/flows-and-effects)
- [Guide: Logic flows](../../guide/learn/adding-interactivity)
- [Guide: Error Handling](../../guide/advanced/error-handling)
