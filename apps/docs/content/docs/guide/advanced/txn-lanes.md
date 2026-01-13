---
title: Transaction Lanes (Txn Lanes)
description: Prioritize critical interactions; keep background follow-ups from tailing, with explainability and rollback.
---

When you hit “obvious jank during frequent input/clicks” and the jank is mostly caused by a backlog of **non-critical recompute/derivations/notifications**, Txn Lanes turns that work into a *non-urgent lane* that is “deferrable but bounded”, so critical-interaction p95 is no longer dragged by tail work.

## One-sentence mental model

Roughly split runtime work into two categories:

- **urgent**: interaction-critical path that must finish first (e.g. the core actions within a dispatch / a state-transaction window).
- **non-urgent**: follow-up work that can be delayed (e.g. deferred flush, background recompute, batched notifications), but must catch up within a bound.

Txn Lanes is not about “interrupting a transaction”. It’s about ensuring **post-transaction follow-up work** doesn’t block the next interaction.

## Keywords (≤5)

- `urgent`
- `non-urgent`
- `backlog`
- `budget` (time-sliced budget)
- `evidence` (explainable signals: why yield/coalesce/catch up)

## What it is not

- Not “interruptible transactions”: transactions are still synchronous, IO-free, and committed once per window.
- Not React’s `startTransition`: Txn Lanes delays Logix internal compute/scheduling; `startTransition` delays React render scheduling. They can be combined, but don’t replace each other.

## What you get

- **More stable critical interactions**: urgent work still runs first even when backlog exists.
- **Background work stays bounded**: non-urgent work can be delayed, but has a max-lag bound (no “never catches up”).
- **Explainability**: Devtools/diagnostic events show “why we yielded / why we coalesced / whether starvation protection triggered”.

## When should you enable it?

Treat it as a “stop-the-bleeding / governance lever” for:

- obvious “queue tailing” after you’ve enabled deferred work (e.g. delaying some derivations/convergence/notifications): as input continues, each subsequent interaction becomes slower.
- p95 jank primarily comes from “non-critical recompute/derivations/notifications”, not from IO inside a transaction (transactions already forbid IO).

If your jank comes from “initialization / render-time synchronous blocking”, start with startup policy and cold-start optimization in [React integration](../essentials/react-integration), then consider Txn Lanes.

## How to enable (minimal)

Txn Lanes is enabled by default; you usually only need to tune parameters or explicitly disable it for comparison/rollback.

Explicitly disable (back to baseline):

```ts
Runtime.make(impl, {
  stateTransaction: {
    txnLanes: { enabled: false },
  },
})
```

Tune parameters (keep enabled):

```ts
Runtime.make(impl, {
  stateTransaction: {
    txnLanes: {
      enabled: true,
      budgetMs: 1,
      debounceMs: 0,
      maxLagMs: 50,
      allowCoalesce: true,
      // Progressive enhancement: prioritize input on supported browsers (fallback to baseline otherwise)
      // yieldStrategy: 'inputPending',
    },
  },
})
```

## How to choose (parameters and strategy)

- `budgetMs`: time budget per slice for non-urgent work. Smaller means “yield more aggressively”, but increases scheduling overhead. Start with `1` and tune with evidence.
- `maxLagMs`: max-lag bound for backlog. Smaller means “catch up faster”, but triggers forced catch-up more often. Start with `50`.
- `allowCoalesce`: keep `true` to allow coalescing/canceling intermediate states and avoid tail recompute.
- `yieldStrategy`: prefer `baseline`. Enable `inputPending` only when you confirm platform support and you really need stronger interaction bias (unsupported platforms auto-fallback to baseline).

## How to verify it “really works”

Don’t rely on gut feel — do at least these two:

1. With Devtools/diagnostics enabled, confirm you can see a Txn Lanes evidence summary (backlog, reasons, budget, etc.) aligned with transaction anchors (txnSeq).
2. In a stable scenario, compare off/on: check whether urgent p95 improves, and whether backlog catches up within the bound after input stops.

## How it works with React `startTransition`

- `startTransition` controls **render priority** (some UI updates render later).
- Txn Lanes controls **runtime follow-up scheduling** (recompute/notifications won’t block the next interaction).
- Recommended: use Txn Lanes to govern internal backlog first; when you’re sure some UI updates can render later, then use `startTransition` at the UI layer. Each does its own job.

## Rollback / stop-the-bleeding

When you see anomalies or you need a quick comparison, prefer runtime overrides for rollback:

- `overrideMode: 'forced_off'`: force Txn Lanes off (back to baseline).
- `overrideMode: 'forced_sync'`: force everything synchronous (ignore non-urgent deferral and time-slicing; useful for comparison).

> Tip: keep evidence output enabled during rollback so you can explain “which mode is active / why we rolled back”.

## Progressive enhancement: `inputPending`

On browsers that support `navigator.scheduling.isInputPending`, you can make the “yield decision” for non-urgent work more interaction-biased:

- `yieldStrategy: 'baseline'`: time budget + hard bound only (default; consistent across platforms).
- `yieldStrategy: 'inputPending'`: yield more when there’s pending input; catch up more aggressively when idle; auto-fallback to baseline if unsupported.

It only affects follow-up scheduling **outside transactions**; it does not change transaction semantics.
