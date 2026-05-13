# Handoff: Txn Buffer Clear and Key Materialization Sentinels

**Spec:** `specs/209-txn-buffer-clear-and-key-materialization-sentinels`
**Owner:** local agent
**Status:** Complete

## Implementation Summary

- Changed files:
  - `packages/logix-core/src/internal/runtime/core/txnHotPathSentinels.ts`
  - `packages/logix-core/src/internal/runtime/core/StateTransaction.lifecycle.ts`
  - `packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts`
  - `packages/logix-core/src/internal/runtime/core/mutativePatches.ts`
  - `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnSecondOrderCosts.Sentinels.test.ts`

- Summary:
  - Extended the internal sentinel contract with dirty buffer clear, dirtyPlan Array.from, dirtyPlan Int32Array materialization, list-index Int32Array materialization, and field-path key materialization counters.
  - Added a large-then-small guard proving the small transaction does not inherit the previous large transaction's dirty buffer clear cost.
  - Moved transaction scratch clearing to commit/abort close, with begin retaining residual cleanup as a sentinel-visible fallback.
  - Verified same-phase dirtyPlan reads reuse the cached snapshot and do not rematerialize raw/root arrays.
  - Did not introduce generation stamping or touched-word clear; current sentinel did not justify that extra mechanism.

## Commands Run

| Command | Outcome | Notes |
| --- | --- | --- |
| `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnSecondOrderCosts.Sentinels.test.ts` | FAIL | RED: new 209 counters were undefined before implementation. |
| `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnSecondOrderCosts.Sentinels.test.ts` | PASS | Large-then-small and dirtyPlan cache sentinel passed. |
| `pnpm -C packages/logix-core test test/internal/Runtime/StateTransaction.DirtyPlanSnapshot.test.ts` | PASS | Existing dirty plan snapshot contract passed. |
| `pnpm -C packages/logix-core test test/FieldKernel/FieldKernel.ConvergePlanner.StableRootHash.test.ts` | PASS | Stable root hash planner contract passed. |
| `pnpm -C packages/logix-core test test/internal/FieldPath/FieldPath.toKey.test.ts` | PASS | Field path key contract passed. |
| `pnpm -C packages/logix-core test test/internal/Runtime/StateTransaction.DirtyPlanSnapshot.test.ts test/FieldKernel/FieldKernel.ConvergePlanner.StableRootHash.test.ts` | PASS | Combined focused dirtyPlan/planner rerun passed. |
| `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.diagnosticsOff.ZeroAllocSentinels.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts` | PASS | 208 guard plus full ModuleRuntime internal file passed. |
| `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.commitPublish.EmptyFastPath.test.ts` | PASS | Dispatch shell/commit regression passed; quick perf output is a clue only. |
| `pnpm -C packages/logix-core typecheck` | PASS | Production typecheck passed. |

## Tax Movement Notes

| Phase / Counter | Before | After / Observed | Interpretation |
| --- | --- | --- | --- |
| `dirtyBufferClearEntryCount` | n/a | small txn after 96-path txn observed <=1 entry clear | Previous large dirty buffer is cleared at close, not charged to the next small txn. |
| `dirtyPlanRawPathArrayMaterializeCount` | n/a | 1 per first materialize in covered phase; unchanged on cache hit | Sentinel only; no extra optimization needed. |
| `dirtyPlanRootInt32MaterializeCount` | n/a | 1 per first materialize in covered phase; unchanged on cache hit | Sentinel only; no extra optimization needed. |
| `dirtyPlanListIndexInt32MaterializeCount` | n/a | counter wired at list snapshot clone point | Visible if list evidence materializes sorted Int32 arrays. |
| `fieldPathKeyMaterializeCount` | n/a | wired at runtime patch dedupe `toKey` call site | Kept out of base `field-path.ts` to avoid reverse dependency. |
| generation stamping / touched-word clear | not present | not added | Not justified by current sentinel result. |

## Evidence Files

- n/a. This spec added structural sentinel coverage and focused tests; no formal default/soak perf artifact was written.

## Verification Layer Status

| Layer | Status | Evidence |
| --- | --- | --- |
| Structural sentinel status | passed for covered buffer/key paths | Large-then-small and dirtyPlan cache sentinels passed; key/materialization counters are wired internally. |
| A/B status | available from 210, not used for 209 hard claim | 209 is second-order sentinel-focused. |
| Focused perf status | deferred | No default/soak dispatchShell diff collected in 209. |
| Tax migration classification | `inconclusive` for formal perf | No comparable diff was collected; structural second-order risks are now observable. |
| Migrated risk | buffer clear/key materialization now watchable | Generation stamping/touched-word clear was not introduced because sentinels did not justify it. |

## Claim Boundary

- Allowed claims:
  - Focused structural validation passed for covered buffer clear and dirtyPlan/key materialization sentinels.
  - Formal performance claim deferred until comparable default/soak evidence.
- Forbidden claims:
  - Runtime performance is fixed.
  - No regressions exist.
  - Production performance improved globally.
  - Transaction path is optimal.

## Blockers

- None.

## Next Recommended Spec

- `211-focused-perf-evidence-and-tax-migration-gate`
