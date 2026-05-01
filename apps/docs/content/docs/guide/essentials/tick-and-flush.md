---
title: Tick / Flush
description: Understand the boundary between transaction commits and externally observable snapshots.
---

Tick and flush describe the boundary between:

- in-module transaction work
- externally observable snapshot publication

## Minimal timeline

```text
input -> state:update -> trace:tick -> subscriber notification -> render
```

## Why it exists

This boundary provides:

- batching
- consistency across reads
- explainable degradation when budgets are exceeded

## DevTools reading

The most important `trace:tick` phases are:

- `start`
- `settled`
- `budgetExceeded`

Key fields include:

- `tickSeq`
- `result.stable`
- `result.degradeReason`
- `backlog.deferredPrimary`

## Common guidance

- batch multiple dispatches when they belong to one user intent
- use `Runtime.batch(...)` only as a synchronous boundary
- investigate `budgetExceeded` through evidence before tuning knobs

## See also

- [Performance & optimization](../advanced/performance-and-optimization)
- [Troubleshooting](../advanced/troubleshooting)
