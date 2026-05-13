# Feature Specification: Dispatch Shell Preflight and Tax Ledger

**Feature Branch**: `203-dispatch-shell-preflight-and-tax-ledger`
**Created**: 2026-05-11
**Status**: Planned
**Priority**: P0
**Input**: Runtime transaction fixed-cost wave handoff.

## Summary

This spec forces the local agent to inspect the current implementation and tests, record the exact baseline shape, and identify which tax point will be touched by each following member spec. It is deliberately mostly documentation and guard setup; it prevents optimizations from starting without knowing the current phase breakdown and sentinel coverage.

## Goal

Establish the local preflight snapshot and tax map before any transaction shell optimization starts.

## Dependencies

202

## Tax Points Covered

- phase evidence completeness
- `implementation/evidence drift`
- premature performance claim risk

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

- `specs/203-dispatch-shell-preflight-and-tax-ledger/notes/preflight.md`
- `docs/next/runtime-dispatch-shell-tax-ledger.md`
- `docs/next/runtime-dispatch-shell-before-after-playbook.md`

### Modify

- `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`
- `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchOuterShell.PerfBoundary.test.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts`

## Focused Tests / Commands

```bash
pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchOuterShell.PerfBoundary.test.ts
pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts
pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts
```

## Acceptance Criteria

- **AC-001**: Preflight notes identify current evidence fields for dispatch shell phase timing.
- **AC-002**: The tax ledger maps every later member spec to exactly one dominant tax point and possible secondary tax migration.
- **AC-003**: No implementation optimization is performed in this spec.
- **AC-004**: Focused tests are recorded as health checks, not as performance claims.

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
