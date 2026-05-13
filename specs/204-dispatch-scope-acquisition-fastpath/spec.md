# Feature Specification: Dispatch Scope Acquisition Fast Path

**Feature Branch**: `204-dispatch-scope-acquisition-fastpath`
**Created**: 2026-05-11
**Status**: Planned
**Priority**: P1
**Input**: Runtime transaction fixed-cost wave handoff.

## Summary

The dispatch shell suite distinguishes `reuseScope` and `resolveEach`. This spec optimizes internal acquisition and bound executor reuse so that repeated public dispatch does not rebuild avoidable scope/service lookup state. The target is to reduce scope lookup tax while preserving hierarchical injector, imported module, and multi-instance isolation laws.

## Goal

Reduce `resolveEach` acquisition overhead without changing module/runtime acquisition semantics.

## Dependencies

203

## Tax Points Covered

- resolveScopeMsPerDispatch
- runtime handle acquisition
- scope closure reconstruction

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

- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchScopeAcquisition.FastPath.test.ts`

### Modify

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.registry.ts`
- `packages/logix-core/src/internal/runtime/core/RuntimeKernel.selection.ts`
- `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`

## Focused Tests / Commands

```bash
pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchScopeAcquisition.FastPath.test.ts
pnpm -C packages/logix-core test test/internal/Runtime/HierarchicalInjector/hierarchicalInjector.strict-isolation.test.ts
pnpm -C packages/logix-core test test/Runtime/Runtime.openProgram.multiRoot.isolated.test.ts
pnpm -C packages/logix-react test test/Hooks/useImportedModule.hierarchical.test.tsx
```

## Acceptance Criteria

- **AC-001**: A focused guard proves bound runtime acquisition is reused when the same module runtime is already resolved.
- **AC-002**: A focused guard proves imported module and hierarchical override resolution still isolate correctly.
- **AC-003**: `resolveEach` remains semantically distinct in the perf harness but does not pay avoidable repeated construction cost.
- **AC-004**: No public config or public API is added for acquisition caching.

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
