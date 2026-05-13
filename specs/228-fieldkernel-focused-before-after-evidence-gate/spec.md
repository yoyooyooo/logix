# Feature Specification: FieldKernel Focused Before/After Evidence Gate

**Feature Branch**: `228-fieldkernel-focused-before-after-evidence-gate`
**Created**: 2026-05-11
**Status**: Planned
**Priority**: P1
**Input**: FieldKernel dirty-work tax wave handoff.

## Summary

Collect and classify comparable focused evidence for converge/list/source/external-store paths.

## Goal

Collect and classify comparable focused evidence for field-kernel dirty-work paths.

## Preconditions

- RuntimeStore / Selector Notify wave must be accepted as `tax_removed` / `stable_guarded`, or maintainer-waived.
- Real repository worktree must be used; packed source snapshots are read-only context.

## Tax Points Covered

- evidence incomparability
- missing suite
- phase evidence missing
- tax migration hidden by total improvement

## Functional Requirements

- **FR-001**: The implementation MUST stay within `228-fieldkernel-focused-before-after-evidence-gate` scope.
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

- `specs/228-fieldkernel-focused-before-after-evidence-gate/perf/README.md`

### Modify

- `docs/next/field-kernel-dirty-work-before-after-playbook.md`
- `docs/next/field-kernel-dirty-work-evidence-protocol.md`
- `docs/next/field-kernel-dirty-work-tax-migration-report-template.md`
- `packages/logix-perf-evidence/README.md`
- `packages/logix-perf-evidence/scripts/ci.field-kernel-dirty-work-tax-report.ts`
- `packages/logix-perf-evidence/scripts/ci.field-kernel-dirty-work-tax-report.test.ts`
- `specs/228-fieldkernel-focused-before-after-evidence-gate/handoff.md`

## Focused Tests / Commands

- `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/converge-steps.test.tsx`
- `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/converge-time-slicing.test.tsx`
- `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/form-list-scope-check.test.tsx`
- `pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/external-store-ingest.test.tsx`
- `pnpm -C packages/logix-perf-evidence test scripts/ci.field-kernel-dirty-work-tax-report.test.ts`

## Acceptance Criteria

- **AC-001**: before/after artifacts are clean or classification remains inconclusive.
- **AC-002**: diff comparable=true for hard claim.
- **AC-003**: report classification is produced.
- **AC-004**: allowed/forbidden claims are stated in handoff.
- **AC-005**: artifacts are stored under specs/228/perf.

## Non-Goals

- Do not expand public API/root exports.
- Do not re-open dispatch shell or selector notify wave except for adjacent test maintenance.
- Do not add AOT/WASM/flat-store behavior.
- Do not claim global runtime performance improvement.

## Handoff Requirements

The local agent must update `handoff.md` with changed files, commands, sentinel status, evidence files, classification, and next recommended spec.
