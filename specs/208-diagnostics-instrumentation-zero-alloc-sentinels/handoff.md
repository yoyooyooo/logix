# Handoff: Diagnostics and Instrumentation Zero-Alloc Sentinels

**Spec:** `specs/208-diagnostics-instrumentation-zero-alloc-sentinels`
**Owner:** local agent
**Status:** Complete

## Implementation Summary

- Changed files:
  - `packages/logix-core/src/internal/runtime/core/txnHotPathSentinels.ts`
  - `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`
  - `packages/logix-core/src/internal/runtime/core/StateTransaction.patch.ts`
  - `packages/logix-core/src/internal/runtime/core/StateTransaction.lifecycle.ts`
  - `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
  - `packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts`
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.postCommit.ts`
  - `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.diagnosticsOff.ZeroAllocSentinels.test.ts`
  - `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`

- Summary:
  - Added internal disabled-by-default txn hot path sentinels for debug off entry attempts, light patch/snapshot materialization, join/split in txn window, and P1 dirtyAll fallback.
  - Guarded diagnostics-off public dispatch so action/state debug payloads are not constructed or passed into `Debug.record` even when sinks are installed.
  - Kept `Debug.record` direct-call off semantics intact for direct API tests.
  - Updated event-observation tests to explicitly provide `diagnosticsLevel='light'` when they assert Debug ring contents.

## Commands Run

| Command | Outcome | Notes |
| --- | --- | --- |
| `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.diagnosticsOff.ZeroAllocSentinels.test.ts` | FAIL | RED: missing `txnHotPathSentinels.ts`, expected before implementation. |
| `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.diagnosticsOff.ZeroAllocSentinels.test.ts` | FAIL | GREEN iteration exposed real off-path Debug.record entries: 16 dispatch-window attempts from action/state events. |
| `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.diagnosticsOff.ZeroAllocSentinels.test.ts` | PASS | New sentinels all 0 in covered diagnostics=off/light paths. |
| `pnpm -C packages/logix-core test test/Debug/Debug.OffSemantics.NoDrift.test.ts` | PASS | Off vs full behavior remains state-equivalent; off evidence exports no debug events. |
| `pnpm -C packages/logix-core test test/observability/DebugSink.record.off.test.ts` | PASS | Direct `Debug.record` off semantics still do not inject timestamp. |
| `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.AsyncEscapeGuard.Perf.off.test.ts` | PASS | Diagnostics=off async escape guard perf test passed; latest observed sync p95 0.192ms, failFast p95 0.140ms. |
| `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.commitPublish.EmptyFastPath.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.NoopPhaseElision.test.ts` | PASS | Light phase, commit publish, and 206 no-op phase regressions passed. |
| `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts -t "StateTransaction"` | PASS | Vitest ran the full file: 46 tests passed. |
| `pnpm -C packages/logix-core typecheck` | PASS | Production typecheck passed. |

## Tax Movement Notes

| Phase / Counter | Before | After / Observed | Interpretation |
| --- | --- | --- | --- |
| `debugEventAllocCount.off` | 16 attempts in dispatch window during first GREEN iteration | 0 in new guard | Removed for covered public dispatch hot path. |
| `patchObjectMaterializeCount.light` | n/a | 0 | Guarded by light StateTransaction test. |
| `snapshotObjectMaterializeCount.light` | n/a | 0 | Guarded by light StateTransaction test. |
| `joinSplitInTxnWindowCount` | n/a | 0 | Covered path uses id/array path and avoids string split/join sentinel. |
| `dirtyAllFallbackCount.p1Gate` | n/a | 0 | Covered reducer dispatch and light StateTransaction stay field-path based. |

## Evidence Files

- n/a. This spec added sentinel guards, not broad perf evidence files.

## Verification Layer Status

| Layer | Status | Evidence |
| --- | --- | --- |
| Structural sentinel status | passed for covered off/light paths | `debugEventAllocCount.off`, `patchObjectMaterializeCount.light`, `snapshotObjectMaterializeCount.light`, `joinSplitInTxnWindowCount`, and `dirtyAllFallbackCount.p1Gate` were 0 in focused tests. |
| A/B status | available from 210, not used for 208 hard claim | 208 is sentinel-focused. |
| Focused perf status | clue-only | Async escape and light phase tests passed; no default/soak diff collected. |
| Tax migration classification | `inconclusive` for formal perf | Sentinel proof passed, but no comparable diff was collected. |
| Migrated risk | light/full diagnostic overhead remains watched | 208 prevents off-path allocation drift; broader diagnostic tier cost needs future focused evidence if claimed. |

## Claim Boundary

- Allowed claims:
  - Focused structural validation passed for covered diagnostics-off and instrumentation-light sentinels.
  - Formal performance claim deferred until comparable default/soak evidence.
- Forbidden claims:
  - Runtime performance is fixed.
  - No regressions exist.
  - Production performance improved globally.
  - Transaction path is optimal.

## Blockers

- None.

## Next Recommended Spec

- `209-txn-buffer-clear-and-key-materialization-sentinels`
