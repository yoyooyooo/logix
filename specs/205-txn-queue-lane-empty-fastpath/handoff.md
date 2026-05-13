# Handoff: Txn Queue and Lane Empty Fast Path

**Spec:** `specs/205-txn-queue-lane-empty-fastpath`
**Owner:** local agent
**Status:** Complete

## Implementation Summary

- Changed files:
  - `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.EmptyFastPath.test.ts`
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`
  - `specs/205-txn-queue-lane-empty-fastpath/tasks.md`
  - `specs/205-txn-queue-lane-empty-fastpath/checklists/requirements.md`
  - `specs/205-txn-queue-lane-empty-fastpath/handoff.md`

- Notes:
  - Added a focused RED guard for direct-idle urgent dispatch queue phase timing. The old path recorded self-start wait as `queueWaitMs=1` under deterministic clock.
  - Added a backlog guard proving queued urgent work still receives `startMode=direct_handoff` and `activeLaneAtEnqueue=urgent`.
  - Split the enqueue-in-transaction guard into `ensureCanEnqueue()`.
  - Added `tryAcquireBacklogSlotFast(...)` for immediately available backpressure slots. Immediate slot acquisition records `backpressureMs=0`; saturated paths still use the full acquire loop and diagnostics.
  - `enqueueAndMaybeStart(...)` now returns the immediate direct-idle trace so the caller can skip awaiting its own start Deferred while still preserving queue ownership and release through `advanceQueue(...)`.
  - No public API, public config, root export, diagnostics surface, transaction order, scheduling law, or queue bypass changed.

## Commands Run

| Command | Outcome | Notes |
| --- | --- | --- |
| `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.EmptyFastPath.test.ts` | FAIL | RED before implementation: direct-idle queue timing recorded `queueWaitMs=1`; backlog guard passed after diagnostics-level test fix. |
| `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.EmptyFastPath.test.ts` | PASS | 2 tests passed after direct-idle queue branch and immediate backpressure slot path. |
| `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts` | PASS | 5 lane/backpressure tests passed. |
| `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts` | PASS | 3 default-on lane tests passed. |
| `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts` | PASS | 2 override tests passed. |
| `pnpm -C packages/logix-core typecheck` | PASS | Production TypeScript passed. |

## Tax Movement Notes

| Phase / Counter | Before | After / Observed | Interpretation |
| --- | --- | --- | --- |
| `runtime.txnPhase.queueWaitMs` | deterministic direct-idle sample recorded `1` | deterministic direct-idle sample records `0` | `tax_removed` for direct-idle self-start wait |
| `runtime.txnPhase.queueStartHandoffMs` | included direct-idle Deferred handoff shape | direct-idle records `0`; backlog still records `direct_handoff` | `tax_removed` for direct-idle self-handoff |
| `runtime.txnPhase.queueBackpressureMs` | immediately acquired slots could include slot acquisition overhead | immediate slot acquisition records `0`; saturated paths still use full acquire loop | `tax_removed` for no-backpressure path |
| Backlog / nonUrgent / overrides | full path required | lane and override suites passed | `not_migrated` |
| Next suspected tax | n/a | no formal phase diff collected | `206` should inspect noop post-body phases next |

## Evidence Files

- n/a. 205 only adds focused guards and internal queue thinning; formal before/after perf evidence is deferred to 211.

## Verification Layer Status

| Layer | Status | Evidence |
| --- | --- | --- |
| Structural sentinel status | partial via semantic guards | Queue/lane suites prove direct-idle/backlog/override law; allocation sentinels are owned by 208/209. |
| A/B status | available from 210, not used for 205 hard claim | 205 relies on deterministic queue phase guards. |
| Focused perf status | deferred | No default/soak dispatchShell diff collected in 205. |
| Tax migration classification | `tax_removed` locally for direct-idle queue phases, `inconclusive` for formal perf | Queue wait/start/backpressure deterministic timings dropped to 0 in covered path. |
| Migrated risk | body/commit migration unmeasured | 211 focused diff must classify any queue-to-body/commit movement. |

## Claim Boundary

- Allowed claims:
  - Focused validation passed for direct-idle queue/lane empty path while preserving backlog, lane, and override semantics.
  - Formal performance claim deferred until comparable default/soak evidence.
- Forbidden claims:
  - Runtime performance is fixed.
  - No regressions exist.
  - Production performance improved globally.
  - Transaction path is optimal.

## Blockers

- None for 205 focused scope.

## Next Recommended Spec

- `206-transaction-noop-phase-elision`
