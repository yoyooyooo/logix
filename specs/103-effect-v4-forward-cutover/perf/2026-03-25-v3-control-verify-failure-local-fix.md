# 2026-03-25 · V3 control verify failure local fix

## Context

- worktree:
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/v3-control.accepted-cuts`
- branch:
  - `agent/v3-control-accepted-cuts-20260325`
- PR:
  - `#138`
- trigger:
  - GitHub `verify` failed on 6 files after `eaa8c2a5`

## CI failure group

- `test/Runtime/Runtime.readQueryStrictGate.test.ts`
- `test/internal/ReplayMode.Sequence.test.ts`
- `test/internal/Runtime/DeclarativeLinkIR.boundary.test.ts`
- `test/internal/Runtime/ModuleAsSource.recognizability.test.ts`
- `test/internal/Runtime/ModuleAsSource.tick.test.ts`
- `test/internal/Runtime/WorkflowRuntime.075.test.ts`

## Local reproduce

Command:

```bash
pnpm -C packages/logix-core test -- \
  test/Runtime/Runtime.readQueryStrictGate.test.ts \
  test/internal/ReplayMode.Sequence.test.ts \
  test/internal/Runtime/DeclarativeLinkIR.boundary.test.ts \
  test/internal/Runtime/ModuleAsSource.recognizability.test.ts \
  test/internal/Runtime/ModuleAsSource.tick.test.ts \
  test/internal/Runtime/WorkflowRuntime.075.test.ts
```

Initial local result:

- `6` files failed
- `9` tests failed
- shared symptom cluster:
  - tick did not advance
  - module-as-source / declarative link did not settle
  - workflow timer trigger summary was missing
  - `readQuery.strictGate warn` timed out
  - replay source sequence collapsed from `loading -> success` to immediate `success`

## Root-cause ranking

### 1. Post-commit observation gate was too narrow

Most suspicious file:

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`

Finding:

- new `shouldObservePostCommit()` only considered:
  - `externalOwnedFieldPaths.length > 0`
  - `selectorGraph.hasAnyEntries()`
  - `runtimeStore.getModuleSubscriberCount(...) > 0`
- this gate skipped `onCommit` for internal semantics that still require post-commit work:
  - declarative link settlement
  - module-as-source propagation
  - workflow timer trigger summary
  - tick advancement paths that depend on scheduler-side commit observation

Minimal hypothesis test:

- temporarily forced `shouldRunPostCommitObservation: () => true`

Result:

- failure count dropped from `9` to `2`
- repaired:
  - `DeclarativeLinkIR.boundary`
  - `ModuleAsSource.recognizability`
  - `ModuleAsSource.tick`
  - `WorkflowRuntime.075`
  - the tick-advancement part of the failure cluster

Accepted fix:

- keep post-commit observation enabled for transaction commits

### 2. Dev/test transaction-body semantics regressed after unconditional `runSyncExit`

Most suspicious file:

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`

Finding:

- branch replaced the old split path with unconditional sync execution:
  - old dev/test path: `fork(body) -> poll/yield -> await`
  - new path: `runSyncExitWithServices(...)`
- this changed ordering for tests that rely on other fibers getting a chance to install/read before the txn body is considered complete

Residual failures after fix 1:

- `test/Runtime/Runtime.readQueryStrictGate.test.ts`
- `test/internal/ReplayMode.Sequence.test.ts`

Minimal hypothesis test:

- restored the old dev/test `fork + poll + await` path
- kept the new sync fast path only for non-dev execution

Result:

- remaining failure count dropped from `2` to `0`

Accepted fix:

- dev/test keeps the old scheduling semantics
- non-dev keeps the sync body-runner path

## Disproved hypothesis

Trial:

- temporarily removed the new `TaskRunner.isInSyncTransactionShadow()` read/write short-circuit in `ModuleRuntime.transaction.ts`

Result:

- no change
- the same 2 tests still failed

Conclusion:

- `shadow` fast-path is not the root cause of this verify failure set
- this trial should not be replayed as the primary fix direction

## Final local gate after fix

Commands:

```bash
pnpm -C packages/logix-core typecheck:test

pnpm -C packages/logix-core test -- \
  test/internal/Runtime/StateTransaction.SingleDirtyPathKey.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.DiagnosticsScopePropagation.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.TransactionOverrides.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.LinkIdFallback.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnLanePolicy.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts \
  test/Runtime/Runtime.readQueryStrictGate.test.ts \
  test/internal/ReplayMode.Sequence.test.ts \
  test/internal/Runtime/DeclarativeLinkIR.boundary.test.ts \
  test/internal/Runtime/ModuleAsSource.recognizability.test.ts \
  test/internal/Runtime/ModuleAsSource.tick.test.ts \
  test/internal/Runtime/WorkflowRuntime.075.test.ts
```

Result:

- `typecheck:test` passed
- `13` files passed
- `34` tests passed

## Scope kept

Only effective code fixes are retained:

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
