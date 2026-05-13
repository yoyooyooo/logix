# Feature Specification: FieldKernel Fallback Reason Tax Report

**Feature Branch**: `227-fieldkernel-fallback-reason-tax-report`
**Created**: 2026-05-11
**Status**: Planned
**Priority**: P1
**Input**: FieldKernel dirty-work tax wave handoff.

## Summary

Unify fallback reason evidence and tax migration classification for field-kernel paths.

## Goal

Create unified field-kernel fallback reason reporting and tax migration classifier.

## Preconditions

- RuntimeStore / Selector Notify wave must be accepted as `tax_removed` / `stable_guarded`, or maintainer-waived.
- Real repository worktree must be used; packed source snapshots are read-only context.

## Tax Points Covered

- fallback reason vocabulary drift
- silent fallback in source/validate/converge
- report hides migrated field-kernel cost
- quick evidence treated as hard

## Functional Requirements

- **FR-001**: The implementation MUST stay within `227-fieldkernel-fallback-reason-tax-report` scope.
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

- `packages/logix-perf-evidence/scripts/ci.field-kernel-dirty-work-tax-report.ts`
- `packages/logix-perf-evidence/scripts/ci.field-kernel-dirty-work-tax-report.test.ts`
- `docs/next/field-kernel-dirty-work-tax-migration-report-template.md`

### Modify

- `packages/logix-core/src/internal/runtime/core/kernelFallbackReason.ts`
- `packages/logix-core/test/Contracts/KernelFallbackReason.contract.test.ts`

## Focused Tests / Commands

- `pnpm -C packages/logix-core test test/Contracts/KernelFallbackReason.contract.test.ts`
- `pnpm -C packages/logix-perf-evidence test scripts/ci.field-kernel-dirty-work-tax-report.test.ts`

## Acceptance Criteria

- **AC-001**: Fallback reason vocabulary covers converge/validate/source/list/dirtyPlan/externalStore.
- **AC-002**: diagnostics=off does not allocate reason payloads.
- **AC-003**: report supports tax_removed/stable_guarded/tax_migrated/inconclusive/failed.
- **AC-004**: report treats quick-only and non-comparable evidence as inconclusive.

## Non-Goals

- Do not expand public API/root exports.
- Do not re-open dispatch shell or selector notify wave except for adjacent test maintenance.
- Do not add AOT/WASM/flat-store behavior.
- Do not claim global runtime performance improvement.

## Handoff Requirements

The local agent must update `handoff.md` with changed files, commands, sentinel status, evidence files, classification, and next recommended spec.
