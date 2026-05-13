# Feature Specification: Validate Static IR List Incremental Gate

**Feature Branch**: `224-validate-static-ir-list-incremental-gate`
**Created**: 2026-05-11
**Status**: Planned
**Priority**: P0
**Input**: FieldKernel dirty-work tax wave handoff.

## Summary

Ensure static validate IR and list changedIndices drive incremental validation.

## Goal

Ensure validate static IR and list changedIndices prevent full validation for one-row dirty cases.

## Preconditions

- RuntimeStore / Selector Notify wave must be accepted as `tax_removed` / `stable_guarded`, or maintainer-waived.
- Real repository worktree must be used; packed source snapshots are read-only context.

## Tax Points Covered

- runtime validate graph build
- one-row dirty full list scan
- missing validateIr silent fallback
- diagnostics/on cost leaking to off

## Functional Requirements

- **FR-001**: The implementation MUST stay within `224-validate-static-ir-list-incremental-gate` scope.
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

- `packages/logix-core/test/internal/FieldKernel/FieldKernel.Validate.OneRowDirtyNoFullScan.test.ts`

### Modify

- `packages/logix-core/src/internal/field-kernel/validate.impl.ts`
- `packages/logix-core/src/internal/field-kernel/validate.ts`
- `packages/logix-form/src/internal/form/rules.ts`

## Focused Tests / Commands

- `pnpm -C packages/logix-core test test/internal/FieldKernel/FieldKernel.Validate.StaticIr.test.ts`
- `pnpm -C packages/logix-core test test/internal/FieldKernel/FieldKernel.Validate.ListIncrementalRule.test.ts`
- `pnpm -C packages/logix-core test test/internal/FieldKernel/FieldKernel.ListScopeCheck.Perf.off.test.ts`
- `pnpm -C packages/logix-form test test/Form/Form.ListScope.ReValidateGate.test.ts`

## Acceptance Criteria

- **AC-001**: Static IR path does not build runtime graph per txn.
- **AC-002**: one-row dirty calls validateChanged/incremental rule.
- **AC-003**: root-touched/reorder/remove full fallback is explicit.
- **AC-004**: missing_validate_ir fallback is reason-coded.
- **AC-005**: diagnostics=off sentinel passes.

## Non-Goals

- Do not expand public API/root exports.
- Do not re-open dispatch shell or selector notify wave except for adjacent test maintenance.
- Do not add AOT/WASM/flat-store behavior.
- Do not claim global runtime performance improvement.

## Handoff Requirements

The local agent must update `handoff.md` with changed files, commands, sentinel status, evidence files, classification, and next recommended spec.
