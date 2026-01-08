---
title: Managing state
description: Use $.state and use-case Actions to keep a single source of truth.
---

In Logix, **State is the single source of truth**: each Module owns its own State tree, and all UI rendering, linkage, and side effects revolve around it.

This page focuses on two things:

1. How to safely read and update state via `$.state`.
2. The recommended pattern when “the next step must see the latest state written by the previous step”.

### Who is this for?

- You can write simple Logic and want clearer state read/write strategy in real projects.
- You’ve seen “dispatch + sleep + dispatch” patterns and want a better alternative.

### Prerequisites

- You know the basics from [Modules & State](../essentials/modules-and-state).
- You know `$.state.read / update / mutate` on the Bound API.

### What you’ll get

- A reusable team guideline for state reads/writes
- A pattern to perform “update state → run business step” sequentially inside Logic (instead of assembling timing in callers)
- An intuition for “use-case Actions” and when to introduce them

## 1. Read and write state with $.state

In Logic, you access the current Module’s state via the Bound API (`$`):

- `$.state.read`: read the latest state snapshot
- `$.state.update(prev => next)`: update the whole state with a pure function
- `$.state.mutate(draft => { ... })`: update via a mutable Draft (recommended)
- `$.state.ref(selector?)`: get a subscribable Ref for advanced reactive use cases

Typical usage:

```ts
// Read current state
const state = yield* $.state.read

// Pure functional update
yield*
  $.state.update((prev) => ({
    ...prev,
    count: prev.count + 1,
  }))

// Draft update (recommended)
yield*
  $.state.mutate((draft) => {
    draft.count += 1
    draft.meta.lastUpdatedAt = Date.now()
  })
```

In Effect semantics:

- `read` always returns the latest snapshot.
- `update` / `mutate` run sequentially within the current Logic program; multiple calls apply in code order.
- You don’t need `setTimeout` / `sleep` to “wait for state to update” inside Logic.

## 2. Avoid dispatch + sleep + dispatch in callers

In many products you’ll hit a requirement like:

> “Update the filter first, then reload the list using the updated filter.”

The naive implementation is often:

```ts
// Not recommended: dispatch twice and sleep in between
yield* runtime.dispatch({ _tag: 'setFilter', payload: newFilter })
// sleep(50) or Effect.sleep(...)
yield* runtime.dispatch({ _tag: 'reload', payload: undefined })
```

This has a few problems:

- `dispatch` is “sending a message”; when watchers finish processing is asynchronous.
- Choosing a `sleep` duration is brittle and environment-dependent.
- Callers need internal knowledge (who watches what, when state is written back), which violates intent-first design.

Instead, prefer: **collapse the sequence into a single “use-case Action”**, and perform “update state + next step” sequentially inside Logic.

## 3. Use-case Actions: orchestrate sequentially inside Logic

### 3.1 Define a use-case Action

In the Module, define a dedicated Action for the combined operation:

```ts
const Search = Logix.Module.make('Search', {
  state: Schema.Struct({
    filter: Schema.String,
    items: Schema.Array(Schema.String),
  }),
  actions: {
    setFilter: Schema.String,
    reload: Schema.Void,
    applyFilterAndReload: Schema.Struct({ filter: Schema.String }),
  },
})
```

### 3.2 Use $.state sequentially in Logic

Inside Logic, `$.state.update` and `$.state.read` give you sequential ordering:

```ts
const logic = Search.logic(($) =>
  $.onAction('applyFilterAndReload').run(({ payload }) =>
    Effect.gen(function* () {
      // Step 1: write the latest filter
      yield* $.state.update((s) => ({ ...s, filter: payload.filter }))

      // Optionally read the latest state
      const state = yield* $.state.read

      // Step 2: use the latest filter to run follow-up work (API call / dispatch another Action / etc.)
      yield* runSearchWithFilter(state.filter)
      // Or: yield* $.actions.reload(undefined)
    }),
  ),
)
```

The caller dispatches only one use-case Action:

```ts
yield*
  runtime.dispatch({
    _tag: 'applyFilterAndReload',
    payload: { filter: newFilter },
  })
```

This guarantees:

- State updates and follow-up side effects run sequentially in a single Logic program.
- Callers only care about “start a business use case”, not internal update counts.
- No `sleep` or magic constants are needed; the next step naturally sees the latest state.

> For a fuller example and other scenarios (form submit, batch updates), see
> [Common patterns: use-case Action instead of chained dispatch](../recipes/common-patterns).

## 4. Summary

- Keep state reads/writes inside Logic via `$.state.read / update / mutate`.
- If later steps must see the latest written state, introduce a **use-case Action** and orchestrate sequentially in Logic, instead of chaining dispatches in callers.
- UI components and callers only dispatch intent; Logic owns the “what happens first/next” sequence.

## Next

- Lifecycle and watchers: [Lifecycle and watchers](./lifecycle-and-watchers)
- Cross-module communication: [Cross-module communication](./cross-module-communication)
- Runtime architecture: [Deep dive](./deep-dive)
