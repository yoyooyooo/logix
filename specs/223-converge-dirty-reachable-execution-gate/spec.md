# Feature Specification: Converge Dirty-Reachable Execution Gate

**Feature Branch**: `223-converge-dirty-reachable-execution-gate`
**Created**: 2026-05-11
**Status**: Planned
**Priority**: P0
**Input**: FieldKernel dirty-work tax wave handoff.

## Summary

Ensure converge executes dirty-reachable closure, not full topo, under exact dirty evidence.

## Goal

Ensure exact dirtyPlan drives converge dirty-reachable execution instead of full topo execution.

## Preconditions

- RuntimeStore / Selector Notify wave must be accepted as `tax_removed` / `stable_guarded`, or maintainer-waived.
- Real repository worktree must be used; packed source snapshots are read-only context.

## Tax Points Covered

- full topo under sparse dirty
- dirtyPlan root hash not in plan key
- legacy dirty input override
- diagnostics/off converge trace allocation

## Functional Requirements

- **FR-001**: The implementation MUST stay within `223-converge-dirty-reachable-execution-gate` scope.
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

- `packages/logix-core/test/FieldKernel/FieldKernel.Converge.DirtyReachableExecution.contract.test.ts`

### Modify

- `packages/logix-core/src/internal/field-kernel/converge-planner.ts`
- `packages/logix-core/src/internal/field-kernel/converge-in-transaction.impl.ts`
- `packages/logix-core/src/internal/field-kernel/converge.types.ts`
- `packages/logix-core/src/internal/field-kernel/converge-legacy-dirty-adapter.ts`

## Focused Tests / Commands

- `pnpm -C packages/logix-core test test/FieldKernel/FieldKernel.ConvergePlanner.DeferredReachable.test.ts`
- `pnpm -C packages/logix-core test test/FieldKernel/FieldKernel.ConvergePlanner.DecisionExecutionSinglePath.test.ts`
- `pnpm -C packages/logix-core test test/FieldKernel/FieldKernel.ConvergePlanner.LegacyDirtyInputGuard.test.ts`
- `pnpm -C packages/logix-core test test/FieldKernel/FieldKernel.Converge.DegradeBudgetRollback.test.ts`

## Acceptance Criteria

- **AC-001**: Exact sparse dirty does not execute unrelated converge steps.
- **AC-002**: dirtyPlan rootKeyHash/rootCount participate in plan key.
- **AC-003**: legacy dirty input cannot override dirtyPlan in hot path.
- **AC-004**: fallback to full topo is reason-coded.
- **AC-005**: rollback/no partial commit semantics pass.

## Non-Goals

- Do not expand public API/root exports.
- Do not re-open dispatch shell or selector notify wave except for adjacent test maintenance.
- Do not add AOT/WASM/flat-store behavior.
- Do not claim global runtime performance improvement.

## Handoff Requirements

The local agent must update `handoff.md` with changed files, commands, sentinel status, evidence files, classification, and next recommended spec.
