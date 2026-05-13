# Feature Specification: Txn Queue and Lane Empty Fast Path

**Feature Branch**: `205-txn-queue-lane-empty-fastpath`
**Created**: 2026-05-11
**Status**: Planned
**Priority**: P1
**Input**: Runtime transaction fixed-cost wave handoff.

## Summary

Fixed-cost reduction will expose queue context lookup, policy resolution, backpressure, bookkeeping, wait, and handoff tax. This spec adds an internal empty-path branch for ordinary transactions where there is no backlog, default/urgent lane is known, and no backpressure is active. It must not bypass the queue; it only makes the queue's direct-idle path thinner and easier to measure.

## Goal

Make no-backlog/default-lane transaction enqueue pay only the minimal queue and lane policy cost.

## Dependencies

203

## Tax Points Covered

- queueContextLookupMs
- queueResolvePolicyMs
- queueBackpressureMs
- queueEnqueueBookkeepingMs
- queueStartHandoffMs

## Functional Requirements

- **FR-001**: The implementation MUST target only the tax points listed above for this spec.
- **FR-002**: The implementation MUST preserve public API shape and runtime transaction semantics.
- **FR-003**: The implementation MUST add or update a focused guard before changing production code.
- **FR-004**: The implementation MUST record command outcomes and unresolved blockers in `handoff.md`.
- **FR-005**: The implementation MUST keep evidence fields stable enough for the later tax migration report.

## Non-Functional Requirements

- **NFR-001**: `diagnostics=off` MUST NOT allocate debug/trace payload objects.
- **NFR-002**: Transaction window code MUST remain synchronous and MUST NOT introduce IO, `await`, timers, or write escape hatches.
- **NFR-003**: If any evidence is non-comparable, has stability warnings, or is collected with `quick`, it MUST be labelled as a clue only.
- **NFR-004**: Any optimization that lowers total time but raises another phase MUST be recorded as tax migration, not success.
- **NFR-005**: The work MUST be reviewable as a single spec-sized PR.

## Target Files

### Create

- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.EmptyFastPath.test.ts`

### Modify

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts`

## Focused Tests / Commands

```bash
pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.EmptyFastPath.test.ts
pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts
pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts
pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts
```

## Acceptance Criteria

- **AC-001**: A direct-idle no-backlog dispatch still enters the queue boundary and emits equivalent transaction order semantics.
- **AC-002**: The fast path records or exposes zero/near-zero backpressure and wait timing without fabricating trace payloads when diagnostics are off.
- **AC-003**: Backlog, nonUrgent lane, visibility window, and override cases continue to use the full path.
- **AC-004**: No scheduling starvation or priority inversion is introduced.

## Non-Goals

- Do not add public root exports or public submodules.
- Do not add user-facing config for test-only measurement switches.
- Do not make broad performance claims from this spec alone.
- Do not run destructive git commands.
- Do not batch unrelated tax points into this spec.

## Handoff Requirements

The local agent must update `handoff.md` with:

- changed files;
- focused commands and outcome;
- any phase/tax migration observed;
- any evidence files written;
- next recommended spec.
