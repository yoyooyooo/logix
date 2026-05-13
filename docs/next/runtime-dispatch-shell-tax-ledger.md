# Runtime Dispatch Shell Tax Ledger

## Role

This ledger maps dispatch shell fixed-cost tax points to owner specs and
evidence fields. It is the local preflight ledger for the `203-211` wave.

## First-Order Tax Points

| Dominant tax point | Owner spec | Primary evidence | Secondary migration to watch |
| --- | --- | --- | --- |
| Evidence drift and premature claim risk | `203` | preflight notes, focused test health | none, docs/spec only |
| Same-commit branch comparison | `210` | internal A/B harness result | harness allocation or semantic drift |
| Scope / runtime acquisition | `204` | `runtime.resolveScopeMsPerDispatch`, `runtime.entrypointMode` | queue/context lookup rising after scope work |
| Queue context and lane policy empty path | `205` | `queueContextLookupMs`, `queueResolvePolicyMs`, `queueBackpressureMs`, `queueEnqueueBookkeepingMs`, `queueStartHandoffMs` | commit publish or body shell rising after queue work |
| No-op field/source/validate/selector phases | `206` | `fieldConvergeMs`, `scopedValidateMs`, `sourceSyncMs`, selector dirty overlap guards | dirtyAll fallback or source/list config guard cost |
| Commit publish and hook empty path | `207` | `commitPublishCommitMs`, `commitTotalMs`, `commitOnCommitBeforeStateUpdateMs`, `commitOnCommitAfterStateUpdateMs` | action commit hub, debug record, or hook clone cost |
| Diagnostics and instrumentation allocation | `208` | `commitStateUpdateDebugRecordMs`, `debugEventAllocCount.off`, `patchObjectMaterializeCount.light`, `snapshotObjectMaterializeCount.light` | off path clean while light/full tiers regress |
| Buffer clear and key materialization | `209` | clear counters, key/materialization counters, transaction-window sentinel counts | small transaction after large transaction slowdown |
| Focused diff and migration classification | `211` | comparable default/soak diff, `summary.regressions`, migration report | non-comparable evidence or unexplained stability warning |

## Phase Field Ownership

| Phase field | Owner | Notes |
| --- | --- | --- |
| `runtime.txnPhase.txnPreludeMs` | `203` / `211` | pre-body shell context, useful as drift signal |
| `runtime.resolveScopeMsPerDispatch` | `204` | compare `reuseScope` and `resolveEach` |
| `runtime.dispatchAwaitMsPerDispatch` | `211` | aggregate dispatch wait clue, not enough alone |
| `runtime.txnPhase.queueContextLookupMs` | `205` | queue context lookup fixed cost |
| `runtime.txnPhase.queueResolvePolicyMs` | `205` | lane/default policy fixed cost |
| `runtime.txnPhase.queueBackpressureMs` | `205` | backlog path must preserve semantics |
| `runtime.txnPhase.queueEnqueueBookkeepingMs` | `205` | empty backlog bookkeeping tax |
| `runtime.txnPhase.queueWaitMs` | `205` | should remain stable for no-backlog fast path |
| `runtime.txnPhase.queueStartHandoffMs` | `205` | handoff timing for queue start |
| `runtime.txnPhase.dispatchActionRecordMs` | `208` | debug record cost must be zero-allocation when off |
| `runtime.txnPhase.dispatchActionCommitHubMs` | `207` | publish semantics cannot be bypassed |
| `runtime.txnPhase.bodyShellMs` | `210` / `211` | target shell envelope, watch queue/commit migration |
| `runtime.txnPhase.asyncEscapeGuardMs` | `206` / `208` | guard must stay semantic, no async escape weakening |
| `runtime.txnPhase.fieldConvergeMs` | `206` | skip only when no field program/assets require it |
| `runtime.txnPhase.scopedValidateMs` | `206` | skip only when no pending validate requests |
| `runtime.txnPhase.sourceSyncMs` | `206` | skip only when no source/list assets require it |
| `runtime.txnPhase.commitTotalMs` | `207` / `211` | aggregate post-commit tax |
| `runtime.txnPhase.commitRowIdSyncMs` | `206` / `207` | list-config dependent |
| `runtime.txnPhase.commitPublishCommitMs` | `207` | empty subscriber/topic path must be structural no-op |
| `runtime.txnPhase.commitStateUpdateDebugRecordMs` | `208` | disabled diagnostics must not construct payloads |
| `runtime.txnPhase.commitOnCommitBeforeStateUpdateMs` | `207` | no hooks means no callback array clone |
| `runtime.txnPhase.commitOnCommitAfterStateUpdateMs` | `207` | no hooks means no callback array clone |

## Migration Rules

Treat these as `tax_migrated` unless the owner spec explains and fixes the new
cost:

- scope phase improves while queue context or lane policy rises;
- body shell improves while any `queue*` phase rises;
- transaction shell improves while `commitPublishCommitMs` or `commitTotalMs`
  rises;
- timing is flat or better while allocation/materialization sentinel fails;
- small transactions are slower after large transactions;
- key/materialization counts rise after a key-cache or buffer reuse change;
- median improves while p95 regresses.

## Stop Rules

Do not proceed with an implementation if the fix requires a public API or public
config switch, bypasses the transaction queue, changes transaction order,
expands diagnostics/public surface, weakens tests, or requires claiming success
from quick/non-comparable evidence.
