# Feature Specification: Source ExternalStore Ingest Dirty Gate

**Feature Branch**: `225-source-externalstore-ingest-dirty-gate`
**Created**: 2026-05-11
**Status**: Planned
**Priority**: P0
**Input**: FieldKernel dirty-work tax wave handoff.

## Summary

Ensure source and external-store ingest avoid unrelated work and preserve scheduler/lifecycle law.

## Goal

Ensure source/externalStore ingest avoids unrelated work while preserving scheduler/lifecycle law.

## Preconditions

- RuntimeStore / Selector Notify wave must be accepted as `tax_removed` / `stable_guarded`, or maintainer-waived.
- Real repository worktree must be used; packed source snapshots are read-only context.

## Tax Points Covered

- unrelated source key eval
- list source full row eval
- externalStore burst txn storm
- pending flush after dispose
- urgent delayed by low-priority storm

## Functional Requirements

- **FR-001**: The implementation MUST stay within `225-source-externalstore-ingest-dirty-gate` scope.
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

- `packages/logix-core/test/internal/FieldKernel/FieldKernel.Source.RowScopeDirtyGate.test.ts`

### Modify

- `packages/logix-core/src/internal/field-kernel/source.impl.ts`
- `packages/logix-core/src/internal/field-kernel/external-store.ts`
- `packages/logix-core/src/internal/field-kernel/source.ts`

## Focused Tests / Commands

- `pnpm -C packages/logix-core test test/internal/FieldKernel/FieldKernel.Source.SyncIdle.DirtyGate.test.ts`
- `pnpm -C packages/logix-core test test/internal/FieldKernel/FieldKernel.ExternalStore.CoalesceWindow.test.ts`
- `pnpm -C packages/logix-core test test/internal/FieldKernel/FieldKernel.ExternalStore.DisposeCancelsFlush.test.ts`
- `pnpm -C packages/logix-core test test/internal/FieldKernel/FieldKernel.ExternalStore.UrgentInterleave.test.ts`

## Acceptance Criteria

- **AC-001**: unrelated txn source key eval count is zero.
- **AC-002**: one-row dirty list source evaluates only changed row when evidence exact.
- **AC-003**: source fallback reason is emitted only when gated diagnostics permit.
- **AC-004**: externalStore burst coalesces per policy.
- **AC-005**: dispose cancels pending flush and urgent interleave passes.

## Non-Goals

- Do not expand public API/root exports.
- Do not re-open dispatch shell or selector notify wave except for adjacent test maintenance.
- Do not add AOT/WASM/flat-store behavior.
- Do not claim global runtime performance improvement.

## Handoff Requirements

The local agent must update `handoff.md` with changed files, commands, sentinel status, evidence files, classification, and next recommended spec.
