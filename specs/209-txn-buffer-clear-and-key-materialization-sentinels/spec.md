# Feature Specification: Txn Buffer Clear and Key Materialization Sentinels

**Feature Branch**: `209-txn-buffer-clear-and-key-materialization-sentinels`
**Created**: 2026-05-11
**Status**: Planned
**Priority**: P1
**Input**: Runtime transaction fixed-cost wave handoff.

## Summary

Once allocation is reduced by reusing containers, clear() and key materialization can become the next tax point. This spec adds guards and limited counters around dirty buffers, list evidence snapshots, dirtyPlan keys, converge plan cache keys, and string path conversions. It should not prematurely implement generation stamping; it first proves whether clear/key costs exist and pins them as observable sentinels.

## Goal

Catch second-order costs caused by buffer reuse, collection clearing, and cache-key materialization.

## Dependencies

208 recommended before this spec

## Tax Points Covered

- `Map/Set clear O(capacity)`
- `Int32Array.from rootIds/list indices`
- Array.from dirty paths
- `stable key/hash recompute`
- `join/split field path roundtrip`

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

- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnSecondOrderCosts.Sentinels.test.ts`

### Modify

- `packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- `packages/logix-core/src/internal/field-kernel/plan-cache.ts`
- `packages/logix-core/src/internal/field-kernel/converge-planner.ts`
- `packages/logix-core/src/internal/field-kernel/field-path.ts`
- `packages/logix-core/test/internal/Runtime/StateTransaction.DirtyPlanSnapshot.test.ts`
- `packages/logix-core/test/FieldKernel/FieldKernel.ConvergePlanner.StableRootHash.test.ts`

## Focused Tests / Commands

```bash
pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnSecondOrderCosts.Sentinels.test.ts
pnpm -C packages/logix-core test test/internal/Runtime/StateTransaction.DirtyPlanSnapshot.test.ts
pnpm -C packages/logix-core test test/FieldKernel/FieldKernel.ConvergePlanner.StableRootHash.test.ts
pnpm -C packages/logix-core test test/FieldPath/FieldPath.toKey.test.ts
```

## Acceptance Criteria

- **AC-001**: Repeated small transactions after one large transaction do not pay full previous-capacity clear cost without visibility.
- **AC-002**: DirtyPlanSnapshot repeated reads within the same phase hit cache and do not recreate root/list arrays.
- **AC-003**: String join/split or Array.from in the transaction window is either absent or counted as a failing sentinel in covered paths.
- **AC-004**: If generation stamping or touched-word clear is introduced, it is justified by the sentinel and covered by behavior tests.

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
