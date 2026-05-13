# Feature Specification: Transaction No-Op Phase Elision

**Feature Branch**: `206-transaction-noop-phase-elision`
**Created**: 2026-05-11
**Status**: Planned
**Priority**: P1
**Input**: Runtime transaction fixed-cost wave handoff.

## Summary

Ordinary transactions must not pay full field-kernel and routing phase overhead when the runtime has no field assets, no validate IR, no source entries, no selector subscribers, and no hooks. This spec introduces internal fast-path flags and guards that elide no-op phases without hiding fallback reasons or weakening correctness when assets exist.

## Goal

Skip field/source/validate/selector phases when a module has no assets or no subscribers requiring those phases.

## Dependencies

203, 204, 205 recommended before this spec if files overlap

## Tax Points Covered

- fieldConvergeMs
- scopedValidateMs
- sourceSyncMs
- selector overlap walk
- guard check tax

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

- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.NoopPhaseElision.test.ts`

### Modify

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.fieldConvergeConfig.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- `packages/logix-core/src/internal/field-kernel/source.impl.ts`
- `packages/logix-core/src/internal/field-kernel/validate.impl.ts`
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`

## Focused Tests / Commands

```bash
pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.NoopPhaseElision.test.ts
pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.ListConfigsGuard.Perf.off.test.ts
pnpm -C packages/logix-core test test/internal/FieldKernel/FieldKernel.Source.SyncIdle.DirtyGate.test.ts
pnpm -C packages/logix-core test test/internal/FieldKernel/FieldKernel.Validate.StaticIr.test.ts
pnpm -C packages/logix-core test test/Runtime/Runtime.selectorDirtyOverlap.contract.test.ts
```

## Acceptance Criteria

- **AC-001**: No-field modules skip fieldConverge, scopedValidate, and sourceSync phases while preserving commit semantics.
- **AC-002**: Modules with field/source/validate assets still execute the correct phase with existing fallback reason visibility.
- **AC-003**: No selector subscribers means no selector overlap walk or topic publish iteration.
- **AC-004**: The perf harness phase breakdown can distinguish skipped phase from executed zero-duration phase.

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
