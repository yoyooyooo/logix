---
title: Tick / Flush (from input to stable snapshots)
description: A mental model for render consistency, performance boundaries, and the DevTools trace:tick timeline.
---

In Logix, it helps to think of “state changes → what the UI can observe” as two layers:

- **Transaction**: one `dispatch` (or one external input writeback) runs reducer/traits/converge/validate inside the module and produces a pending commit intent.
- **Tick / Flush**: the Runtime batches pending commits, stabilizes them, then publishes an externally readable snapshot and notifies subscribers.

A minimal timeline looks like this:

`Input (click / external store)` → `state:update (transaction commit)` → `trace:tick (flush settled)` → `React subscribers notified` → `render`

> Note: `flush` is not a strict synonym of “render count”. It’s the boundary where a new snapshot becomes readable and subscribers are signaled.

## 1) Why Tick / Flush?

Separating “in-module synchronous transactions” from “externally observable snapshot publication” gives you:

- **Batching**: multiple sync updates can be merged into a single flush (less notification thrash, fewer intermediate states).
- **Consistency**: when a component reads multiple modules, it’s easier to observe snapshots from the same tick (avoid tearing).
- **Governability**: when the system hits budgets or builds backlog, the Runtime can explain what was deferred and why at the flush boundary.

## 2) Reading DevTools (`trace:tick` quick guide)

Once DevTools is enabled, start with `trace:tick` (three phases):

- `phase="start"`: a tick begins (usually triggered by a dispatch or an external input).
- `phase="settled"`: the tick stabilizes and flushes (the snapshot is published).
- `phase="budgetExceeded"`: the tick degraded softly (commonly because non-urgent backlog was deferred); inspect `result/backlog` for details.

Common fields (appear when relevant):

- `tickSeq`: a stable sequence number for this tick (use it to correlate input → flush → subsequent React renders).
- `result.stable / result.degradeReason`: whether a fixpoint was reached; if not, why (budget/cycle, etc.).
- `backlog.deferredPrimary`: what got deferred (often an externalStore or a field), answering “what is this waiting on?”.

Correlate with `action:dispatch` and `state:update`:

- `state:update.commitMode="batch"`: produced by `dispatchBatch([...])` (multiple sync dispatches become one observable commit).
- `state:update.commitMode="lowPriority"`: produced by `dispatchLowPriority(action)` (changes notification cadence, not correctness).

## 3) Common symptoms → what to do

### 3.1 Multiple dispatches for one user intent

Prefer `dispatchBatch([...])` so it becomes “one observable commit”. Avoid relying on intermediate derived states.

### 3.2 A host event triggers multiple external input updates synchronously

Wrap them in `Runtime.batch(() => { ... })` to create a stronger tick boundary so the scheduler flushes after the batch ends.

Constraints:

- `Runtime.batch` is **sync-only**; do not `await` inside and expect mid-flight flushes.
- `Runtime.batch` is not a transaction: no rollback; throwing may still lead to partial commits.

### 3.3 You see `budgetExceeded` / `priority-inversion`

Make it evidence-driven before tuning knobs:

1. Confirm you didn’t mark a UI-critical chain as non-urgent (or hide critical work behind non-urgent recomputation).
2. Reduce churn: avoid unnecessary subscriber wakeups (selector granularity, `select/equals/coalesceWindowMs`, avoid returning fresh objects that break equality).
3. Only then tune/split: lanes, budgets, and splitting overly long dependency chains to prevent permanent backlog.

## Further reading

- [Debugging & DevTools](../advanced/debugging-and-devtools)
- [Performance & optimization](../advanced/performance-and-optimization)
- [Transaction lanes (Txn Lanes)](../advanced/txn-lanes)
