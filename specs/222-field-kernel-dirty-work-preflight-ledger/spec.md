# Feature Specification: Field Kernel Dirty Work Preflight Ledger

**Feature Branch**: `222-field-kernel-dirty-work-preflight-ledger`
**Created**: 2026-05-11
**Status**: Planned
**Priority**: P0
**Input**: FieldKernel dirty-work tax wave handoff.

## Summary

Build the ledger before changing field-kernel behavior.

## Goal

Build the current field-kernel dirty-work ledger before production changes.

## Preconditions

- RuntimeStore / Selector Notify wave must be accepted as `tax_removed` / `stable_guarded`, or maintainer-waived.
- Real repository worktree must be used; packed source snapshots are read-only context.

## Tax Points Covered

- current converge/validate/source/externalStore/dirtyPlan tax inventory
- existing guard coverage
- missing sentinel list

## Functional Requirements

- **FR-001**: The implementation MUST stay within `222-field-kernel-dirty-work-preflight-ledger` scope.
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

- `docs/next/field-kernel-dirty-work-preflight-ledger.md`

### Modify

- `FIELD_KERNEL_DIRTY_WORK_LEDGER.md`
- `specs/222-field-kernel-dirty-work-preflight-ledger/handoff.md`

## Focused Tests / Commands

- `pnpm -C packages/logix-core test test/FieldKernel/FieldKernel.ConvergePlanner.DecisionExecutionSinglePath.test.ts`
- `pnpm -C packages/logix-core test test/internal/FieldKernel/FieldKernel.Source.SyncIdle.DirtyGate.test.ts`

## Acceptance Criteria

- **AC-001**: Tax ledger names owner files and tests.
- **AC-002**: Preflight records unrelated worktree changes.
- **AC-003**: No production code is changed except documentation/ledger.
- **AC-004**: Missing sentinels are classified by priority.

## Non-Goals

- Do not expand public API/root exports.
- Do not re-open dispatch shell or selector notify wave except for adjacent test maintenance.
- Do not add AOT/WASM/flat-store behavior.
- Do not claim global runtime performance improvement.

## Handoff Requirements

The local agent must update `handoff.md` with changed files, commands, sentinel status, evidence files, classification, and next recommended spec.
