---
title: "Task Runner (long chain: pending → IO → writeback)"
---

When you need a “long-chain interaction” (e.g. click → enter loading immediately → wait for request → write back success/failure), prefer the `run*Task` family of APIs.

The goal is: **keep code linear**, while automatically splitting a long chain into multiple commits so the UI can actually observe the `pending` (loading) stage.

## 1. The typical problem

If you write “loading=true → await IO → loading=false + data” inside a single `run*` handler, the UI often only sees the final result and never sees the intermediate loading state.

This is not because `runLatest` is bad — it’s because a long chain must be split into multiple commits: one for `pending`, and one for result writeback.

## 2. Semantics of run*Task

The four methods map one-to-one to existing concurrency suffixes:

- `runTask`: sequential (each trigger queues and runs to completion)
- `runLatestTask`: latest wins (new triggers cancel old tasks; only the latest result is written back)
- `runExhaustTask`: exhaust (ignore new triggers while busy)
- `runParallelTask`: explicit parallel (each trigger runs independently)

Each accepted trigger is split into three stages:

1. `pending`: **commit immediately** (synchronous state writes only, e.g. `loading=true`)
2. `effect`: run the real IO (request/async task)
3. `success` / `failure`: commit again when IO completes

## 3. Example: search (runLatestTask)

```ts
yield* $.onAction("search").runLatestTask({
  pending: (a) =>
    $.state.update((s) => ({
      ...s,
      loading: true,
      keyword: a.payload,
      error: undefined,
    })),

  effect: (a) => api.search(a.payload),

  success: (result) =>
    $.state.update((s) => ({
      ...s,
      loading: false,
      items: result.items,
    })),

  failure: (cause) =>
    $.state.update((s) => ({
      ...s,
      loading: false,
      error: String(cause),
    })),
})
```

What this achieves:

- Every trigger enters `loading=true` first.
- If the user triggers repeatedly, old requests are cancelled and their results are not written back.
- Only the latest success/failure result is eventually written back.

## 4. Usage boundaries

- `run*Task` can only be used at the end of watcher chains like `$.onAction / $.onState / $.on`.
- Don’t call `run*Task` inside reducers / `trait.run` (synchronous transactional logic).
