# Field Kernel Dirty Work Ledger

## Preflight Ledger

The current owner map and missing sentinel list are recorded in
[field-kernel-dirty-work-preflight-ledger.md](./field-kernel-dirty-work-preflight-ledger.md).

## Primary Tax Points

| Tax Point | Owner | First Sentinel | Focused Evidence |
|---|---|---|---|
| converge full topo under exact dirty | field-kernel converge | `FieldKernel.ConvergePlanner.DeferredReachable.test.ts` | `converge-steps.test.tsx`, `converge-time-slicing.test.tsx` |
| validate full scan under one-row dirty | field-kernel validate / form | `FieldKernel.Validate.ListIncrementalRule.test.ts` | `form-list-scope-check.test.tsx` |
| source unrelated key eval | field-kernel source | `FieldKernel.Source.SyncIdle.DirtyGate.test.ts` | `external-store-ingest.test.tsx` |
| externalStore burst/scheduler/dispose | field-kernel external-store | `ExternalStore.CoalesceWindow/DisposeCancelsFlush/UrgentInterleave` | `external-store-ingest.test.tsx`, `txn-lanes.test.tsx` |
| dirtyPlan/listEvidence clone tax | StateTransaction dirty snapshot | `StateTransaction.DirtyPlanSnapshot.test.ts` + new sentinels | focused allocation counters |
| diagnostics/off fallback payload | field-kernel diagnostics | diagnostics off sentinels | diagnostics overhead only as supporting evidence |

## Second-Order Costs to Watch

- dirtyPlan exact path shifts cost into `Int32Array.from`, `Array.from`, `Map.clear`, `Set.clear`;
- converge plan key hashing recomputes root key/hash per phase;
- source row-scope optimization shifts into listEvidence clone cost;
- validateChanged optimization shifts into changedIndices materialization;
- externalStore coalescing shifts into scheduled timer/fiber retention;
- fallback reason diagnostics shifts into diagnostics=off payload allocation;
- report classifier hides phase increase under total improvement.

## Minimum Counters / Sentinels

```text
convergeFullTopoUnderExactDirtyCount = 0
validateFullScanUnderOneRowDirtyCount = 0
sourceKeyEvalUnrelatedTxnCount = 0
sourceRowKeyEvalOneRowDirtyCount <= 1
externalStorePendingFlushAfterDisposeCount = 0
dirtyPlanMaterializeRepeatedReadCount <= 1 per phase
listEvidenceCloneCount bounded
diagnosticsOffFallbackPayloadAllocCount = 0
fallbackReasonMissingCount = 0
```

## Owner Files

| Area | Files |
| --- | --- |
| converge | `packages/logix-core/src/internal/field-kernel/converge-planner.ts`, `packages/logix-core/src/internal/field-kernel/converge-in-transaction.impl.ts`, `packages/logix-core/src/internal/field-kernel/converge-exec-ir.ts` |
| validate | `packages/logix-core/src/internal/field-kernel/validate.impl.ts` |
| source | `packages/logix-core/src/internal/field-kernel/source.impl.ts` |
| externalStore | `packages/logix-core/src/internal/field-kernel/external-store.ts` |
| dirtyPlan/listEvidence | `packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts`, `StateTransaction.types.ts`, `StateTransaction.lifecycle.ts` |
| fallback/report | `packages/logix-core/src/internal/runtime/core/KernelHotPathAudit.ts`, `kernelFallbackReason.ts`, `packages/logix-perf-evidence/scripts/*field-kernel*` |

## Missing Sentinel Queue

```text
223: runtime execution consumes deferred dirty-reachable ids.
224: validateChanged/list incremental avoids full scan for one-row dirty.
225: source unrelated key eval stays zero; list source row-scope eval stays bounded.
226: repeated dirtyPlan/listEvidence reads hit cache and allocation counters stay bounded.
227: all full fallbacks are reason-coded and diagnostics=off stays payload-free.
228: focused before/after report classifies migrated cost separately from headline totals.
```
