# Feature Specification: Field Kernel Dirty Work Tax Wave

**Feature Branch**: `221-field-kernel-dirty-work-tax-wave`
**Created**: 2026-05-11
**Status**: Planned
**Priority**: P0
**Input**: FieldKernel dirty-work tax wave handoff.

## Summary

Group spec for dirty-work tax after RuntimeStore/selector notify wave.

## Goal

Coordinate a focused FieldKernel dirty-work wave without reopening dispatch shell or RuntimeStore notify work.

## Preconditions

- RuntimeStore / Selector Notify wave must be accepted as `tax_removed` / `stable_guarded`, or maintainer-waived.
- Real repository worktree must be used; packed source snapshots are read-only context.

## Tax Points Covered

- converge dirty-reachable execution
- validate static-ir/list incremental
- source/externalStore dirty gate
- dirtyPlan/listEvidence allocation
- fallback reason/report drift

## Functional Requirements

- **FR-001**: The implementation MUST stay within `221-field-kernel-dirty-work-tax-wave` scope.
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

- `docs/next/field-kernel-dirty-work-tax-wave.md`
- `docs/next/field-kernel-dirty-work-evidence-protocol.md`

### Modify

- None

## Focused Tests / Commands

- `./scripts/list_focused_commands.sh`
- `./scripts/print_evidence_commands.sh`

## Acceptance Criteria

- **AC-001**: Member spec order is explicit.
- **AC-002**: Dirty-work ledger exists.
- **AC-003**: Evidence protocol distinguishes clue vs hard claim.
- **AC-004**: No public API or runtime semantics are changed by group spec.

## Non-Goals

- Do not expand public API/root exports.
- Do not re-open dispatch shell or selector notify wave except for adjacent test maintenance.
- Do not add AOT/WASM/flat-store behavior.
- Do not claim global runtime performance improvement.

## Handoff Requirements

The local agent must update `handoff.md` with changed files, commands, sentinel status, evidence files, classification, and next recommended spec.
