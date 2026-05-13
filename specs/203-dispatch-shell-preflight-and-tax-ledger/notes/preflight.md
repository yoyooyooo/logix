# Dispatch Shell Preflight

## Scope

This preflight records current evidence shape before any transaction shell
optimization. It is not a performance claim and does not authorize production
path changes.

## Inspected Files

- `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`
- `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchOuterShell.PerfBoundary.test.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts`
- `packages/logix-react/test/perf-boundaries/contract-preflight.test.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.postCommit.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`

## Current Dispatch Shell Evidence Fields

The browser fixed-cost suite currently covers:

| Evidence field | Meaning | Primary owner |
| --- | --- | --- |
| `runtime.txnCommitMs` | measured public dispatch commit cost per sample | `211` |
| `runtime.entrypointMode` | `reuseScope` vs `resolveEach` axis | `204` |
| `runtime.resolveScopeMsPerDispatch` | module scope acquisition timing | `204` |
| `runtime.dispatchAwaitMsPerDispatch` | awaited public dispatch timing inside sample breakdown | `203` / `211` |
| `runtime.txnPhase.traceCount` | count of captured light txn phase traces | `203` / `208` |
| `runtime.txnPhase.txnPreludeMs` | pre-body transaction setup timing | `203` / `211` |
| `runtime.txnPhase.queueContextLookupMs` | queue context service lookup timing | `205` |
| `runtime.txnPhase.queueResolvePolicyMs` | lane/policy resolve timing | `205` |
| `runtime.txnPhase.queueBackpressureMs` | backpressure timing | `205` |
| `runtime.txnPhase.queueEnqueueBookkeepingMs` | enqueue bookkeeping timing | `205` |
| `runtime.txnPhase.queueWaitMs` | queued wait timing | `205` |
| `runtime.txnPhase.queueStartHandoffMs` | start handoff timing | `205` |
| `runtime.txnPhase.dispatchActionRecordMs` | `action:dispatch` debug record timing | `208` |
| `runtime.txnPhase.dispatchActionCommitHubMs` | action commit hub publish timing | `207` |
| `runtime.txnPhase.dispatchActionCount` | number of dispatch action records in txn | `203` |
| `runtime.txnPhase.bodyShellMs` | sync body runner and async escape guard envelope | `210` / `211` |
| `runtime.txnPhase.asyncEscapeGuardMs` | async escape guard timing | `206` / `208` |
| `runtime.txnPhase.fieldConvergeMs` | field converge phase timing | `206` |
| `runtime.txnPhase.scopedValidateMs` | scoped validate phase timing | `206` |
| `runtime.txnPhase.sourceSyncMs` | source idle sync timing | `206` |
| `runtime.txnPhase.commitTotalMs` | post-commit total timing | `207` |
| `runtime.txnPhase.commitRowIdSyncMs` | row-id sync timing for list configs | `206` / `207` |
| `runtime.txnPhase.commitPublishCommitMs` | commit hub publish timing | `207` |
| `runtime.txnPhase.commitStateUpdateDebugRecordMs` | state update debug record timing | `208` |
| `runtime.txnPhase.commitOnCommitBeforeStateUpdateMs` | `onCommit` timing before state update debug event | `207` |
| `runtime.txnPhase.commitOnCommitAfterStateUpdateMs` | `onCommit` timing after state update debug event | `207` |

The suite also records `module.reducerWriteCount`, `module.stateWidth`,
`module.traitCount`, and `runtime.dispatchesPerSample` for comparability.

## Current Harness Shape

- `dispatch-shell-fixed-cost.test.tsx` runs the primary metric runtime without
  phase timing, then a separate `captureTxnPhaseTiming` runtime with
  diagnostics level `light`.
- `dispatch-shell.runtime.ts` captures `trace:txn-phase` events by replacing
  debug sinks with a test sink. It summarizes numeric fields by average.
- The `reuseScope` mode resolves `rt.module.tag` once per sample batch.
- The `resolveEach` mode resolves `rt.module.tag` for each dispatch.
- Breakdown timing uses `performance.now()` or `Date.now()`.

## Core Probe Coverage

`ModuleRuntime.dispatchOuterShell.PerfBoundary.test.ts` proves a local health
comparison among:

- public action dispatch;
- queued public `setState`;
- direct internal transaction `setState`.

It logs p50/p95 and average deltas. It is a health check, not a budgeted matrix
or a hard performance claim.

`ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts` proves that light
diagnostics currently emits one `trace:txn-phase` event per dispatch and logs
averages for:

- transaction prelude;
- queue context lookup;
- queue resolve policy;
- body shell;
- async escape guard;
- commit total;
- dispatch action debug record;
- dispatch action commit hub;
- residual.

It does not prove zero allocation, no commit publish iteration, no hook clone,
or no transaction-window key/materialization tax.

`contract-preflight.test.ts` is gated by `LOGIX_PREFLIGHT=1`. Without the env
flag, its tests are skipped. It validates matrix and schema surfaces rather
than dispatch-shell runtime behavior.

## Current Runtime Phase Map

`ModuleRuntime.transaction.ts` currently opens the transaction, captures
diagnostics level, resolves queue phase timing service, reads the base state,
begins the transaction, runs the sync body through `runSyncExitWithServices`,
then executes field converge, scoped validate, source sync, commit, and
`trace:txn-phase` emission when diagnostics are not off.

`ModuleRuntime.postCommit.ts` currently handles dirtyAll dev warning,
transaction history bookkeeping for dev/full instrumentation, row-id sync for
list configs, commit hub publish, optional `onCommit`, and `state:update` debug
recording.

`ModuleRuntime.dispatch.ts` currently records `action:dispatch`, publishes the
action commit hub event, and accumulates dispatch phase timing counters when
phase timing is enabled.

## Known Gaps Before Member Specs

- No same-commit A/B switch exists for old vs new transaction shell branches.
- No structural sentinel proves `diagnostics=off` creates no debug event
  payloads in dispatch shell.
- No structural sentinel proves `instrumentation=light` materializes no patch or
  snapshot objects.
- No structural sentinel proves commit publish avoids iteration with no
  subscribers or hooks.
- No structural sentinel proves field/source/validate/selector phases do not run
  when the module has no corresponding assets.
- No structural sentinel proves transaction-window `Array.from`,
  `Object.entries`, spread clone, join/split, or key hash recompute counts stay
  flat.
- No focused default/soak before/after evidence has been collected in this
  spec.

## Claim Boundary

Focused tests in this preflight are health checks. They do not prove global
production performance, absence of regressions, or that the transaction path is
optimal.
