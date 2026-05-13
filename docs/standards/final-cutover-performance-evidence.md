---
title: Final Cutover Performance Evidence Standard
status: accepted
version: 1
last-updated: 2026-05-11
---

# Final Cutover Performance Evidence Standard

## Scope

This standard governs final Form/kernel cutover performance claims.

## Required Hot Paths

| Hot path | Required evidence |
| --- | --- |
| `negativeBoundaries.dirtyPattern` | dirty/read overlap precision and fallback reason evidence |
| `converge.txnCommit` | dirty-reachable execution, no unrelated full topo, rollback/no partial commit |
| `form.listScopeCheck` | off/light/full diagnostics evidence and incremental path proof |
| `externalStore.ingest.tickNotify` | source/external-store dirty gate and scheduling/coalesce evidence |
| `runtimeStore.noTearing.tickNotify` | listener snapshot, topic retain/release, no-tearing evidence |
| `react.strictSuspenseJitter` | render fanout and interaction jitter evidence |

## Hard Claim Requirements

Hard success requires:

- before and after artifacts;
- environment identity;
- profile identity;
- matrix id/hash when available;
- comparable=true;
- no missing suites;
- no timeouts;
- no unexplained stability warnings;
- no unexplained budgetExceeded on required hot paths;
- risk/cost migration report.

Quick profile output is a diagnostic clue only. It cannot prove final pass.

## Blocker Classification

A result is blocked when:

- any required hot path remains after-only budgetExceeded;
- a broad/focused artifact is incomparable;
- a suite is missing;
- total performance improves by migrating cost to allocation, scheduler latency, diagnostics, no-tearing risk, or user-facing jitter;
- a workaround changes production semantics.
