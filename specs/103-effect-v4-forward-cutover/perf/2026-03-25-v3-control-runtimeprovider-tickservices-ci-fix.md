# 2026-03-25 · V3 control RuntimeProvider tick services CI fix

## Context

- worktree:
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/v3-control.accepted-cuts`
- branch:
  - `agent/v3-control-accepted-cuts-20260325`
- PR:
  - `#138`
- triggering CI runs:
  - `23537234324`
  - `23537231410`

## CI failure

Both runs failed on the same new head:

- `headSha=81c1eda5e8d8646eaab99f50087866489293a1cf`

Single failing test:

- `packages/logix-react/test/integration/runtimeProviderTickServices.regression.test.tsx`
- case:
  - `should re-render for dispatchLowPriority (base runtime has no tick services)`

Observed CI symptom:

- expected `low-count` to move `0 -> 1`
- actual stayed at `0`

## Local reproduce

Command:

```bash
pnpm -C packages/logix-react test -- --project unit test/integration/runtimeProviderTickServices.regression.test.tsx
```

Initial local result:

- `7` tests total
- `1` failed
- same failing case as CI

## Root cause

Most suspicious code:

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`

Finding:

- branch introduced a new enqueue-time gate:
  - `shouldCaptureTickSchedulerAtEnqueue(): boolean => shouldObservePostCommit()`
- this is too narrow for the `RuntimeProvider` auto-binding scenario:
  - base runtime starts without tick services
  - `dispatchLowPriority` needs to capture `TickSchedulerTag` from the caller Env at enqueue time
  - when that capture is skipped, commit cannot publish back into the provider-side tick path
  - result: React subscriber never sees the low-priority update

This is consistent with the failing case shape:

- `dispatch` works
- `dispatchBatch` works
- `dispatchLowPriority` fails
- only the path that depends on enqueue-time scheduler capture regresses

## Minimal fix

Changed:

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`

From:

- `shouldCaptureTickSchedulerAtEnqueue(): boolean => shouldObservePostCommit()`

To:

- `shouldCaptureTickSchedulerAtEnqueue(): boolean => true`

Meaning:

- when `tickSchedulerCached` is still empty, always attempt one enqueue-time capture from Env or root context
- keep the existing cached fast path after first successful capture

## Local verification

### React regression file

Command:

```bash
pnpm -C packages/logix-react test -- --project unit test/integration/runtimeProviderTickServices.regression.test.tsx
```

Result after fix:

- `7/7` passed

### Existing v3-control local guard

Command:

```bash
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

Result after fix:

- `13` files passed
- `34` tests passed

## Decision

- accept this fix
- this is a correctness repair for the branch-ready `v3-control` line
- next step is to push and let `#138` rerun CI
