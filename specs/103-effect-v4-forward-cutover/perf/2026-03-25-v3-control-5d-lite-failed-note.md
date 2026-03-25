# 2026-03-25 · V3 control 5D-lite failed note

## Scope

- worktree:
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/v3-control.accepted-cuts`
- branch:
  - `agent/v3-control-accepted-cuts-20260325`
- attempted idea:
  - reuse one explicit continuation handle across deferred-flush slices
  - do not bring full sequence metadata yet

## Minimal patch shape

Patch only touched deferred-flush call sites in:

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`

Mechanically it did two things:

1. create one deferred continuation handle before the slicing loop
2. feed that handle into each `runDeferredConvergeFlush(...)` slice

## Local verification

- targeted control that still passed:
  - `pnpm -C packages/logix-core test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnLanePolicy.test.ts -t "captured policy snapshot keeps seq-1 semantics when later override re-captures seq-2"`
- hard blocker:
  - `pnpm -C packages/logix-core test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts`

Failure:

- `deferred flush should not block an urgent transaction when txnLanes is enabled`
- timeout:
  - `5000ms`

## Interpretation

这条试刀说明：

- deferred-flush continuation 不能只做“handle 复用”这一半
- 只复用 handle，而不把 sequence / slice anchor / recapture boundary 一起补齐，会直接打穿 time-slicing lane 保证

因此当前不能把它当成一个安全的“半步 5D”。

## Decision

- classify as `failed`
- revert the patch
- if later继续做 `5D`，必须按更完整的 sequence-aware 形态来做，不能只上 handle reuse
