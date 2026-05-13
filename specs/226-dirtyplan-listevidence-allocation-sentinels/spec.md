# Feature Specification: DirtyPlan ListEvidence Allocation Sentinels

**Feature Branch**: `226-dirtyplan-listevidence-allocation-sentinels`
**Created**: 2026-05-11
**Status**: Planned
**Priority**: P1
**Input**: FieldKernel dirty-work tax wave handoff.

## Summary

Prevent dirtyPlan/listEvidence allocations from becoming the new dirty-work tax.

## Goal

Prevent dirtyPlan/listEvidence exact-path optimizations from shifting cost into allocation/materialization.

## Preconditions

- RuntimeStore / Selector Notify wave must be accepted as `tax_removed` / `stable_guarded`, or maintainer-waived.
- Real repository worktree must be used; packed source snapshots are read-only context.

## Tax Points Covered

- repeated dirtyPlan materialization
- listEvidence clone per consumer
- Array.from/Int32Array.from on empty path
- Map/Set clear after large txn
- key hash recompute

## Functional Requirements

- **FR-001**: The implementation MUST stay within `226-dirtyplan-listevidence-allocation-sentinels` scope.
- **FR-002**: The implementation MUST preserve public API shape, transaction semantics, Program/Runtime assembly law, and diagnostics-off behavior.
- **FR-003**: The implementation MUST add or confirm a focused sentinel before changing production code.
- **FR-004**: The implementation MUST keep fallback paths reason-coded when full work is semantically required.
- **FR-005**: The implementation MUST record command outcomes and blockers in `handoff.md`.
- **FR-006**: The implementation MUST classify any observed cost or risk migration.

## Non-Functional Requirements

- **NFR-001**: `diagnostics=off` MUST NOT allocate debug/trace/fallback payload objects on exact fast paths.
- **NFR-002**: `quick` evidence MUST NOT be used for hard performance claims.
- **NFR-003**: Comparable default/soak evidence is required before any hard performance claim.
- **NFR-004**: Changes MUST remain reviewable as one spec-sized PR.
- **NFR-005**: No packed source/XML/Repomix output may be edited.

## Target Files

### Create

- `packages/logix-core/test/internal/Runtime/StateTransaction.DirtyPlanAllocationSentinels.test.ts`

### Modify

- `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts`
- `packages/logix-core/src/internal/runtime/core/txnHotPathSentinels.ts`

## Focused Tests / Commands

- `pnpm -C packages/logix-core test test/internal/Runtime/StateTransaction.DirtyPlanSnapshot.test.ts`
- `pnpm -C packages/logix-core test test/internal/Runtime/StateTransaction.DirtyPlanAllocationSentinels.test.ts`
- `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime.txnSecondOrderCosts.Sentinels.test.ts`

## Acceptance Criteria

- **AC-001**: same phase repeated dirtyPlan read hits cache.
- **AC-002**: empty evidence uses shared constants where safe.
- **AC-003**: listEvidence clone count is bounded and tested.
- **AC-004**: diagnostics=off does not construct fallback payload.
- **AC-005**: large previous txn does not make small next txn pay unbounded clear tax.

## Non-Goals

- Do not expand public API/root exports.
- Do not re-open dispatch shell or selector notify wave except for adjacent test maintenance.
- Do not add AOT/WASM/flat-store behavior.
- Do not claim global runtime performance improvement.

## Handoff Requirements

The local agent must update `handoff.md` with changed files, commands, sentinel status, evidence files, classification, and next recommended spec.
