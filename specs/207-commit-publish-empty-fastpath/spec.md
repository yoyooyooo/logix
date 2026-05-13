# Feature Specification: Commit Publish Empty Fast Path

**Feature Branch**: `207-commit-publish-empty-fastpath`
**Created**: 2026-05-11
**Status**: Planned
**Priority**: P1
**Input**: Runtime transaction fixed-cost wave handoff.

## Summary

After transaction shell and no-op phase costs shrink, commit publish becomes the likely next tax point. This spec gives commit a thin empty path when there are no selector subscribers, no readQuery topics, no devtools sinks, no rowId touched state, and no onCommit hooks. It must preserve no-tearing, topic retain/release, and hook ordering when any of those features are present.

## Goal

Make empty subscriber/topic/hook commit publish path a structural no-op.

## Dependencies

203, 206 recommended before this spec

## Tax Points Covered

- commitTotalMs
- commitPublishCommitMs
- commitRowIdSyncMs
- commitOnCommitBeforeStateUpdateMs
- commitOnCommitAfterStateUpdateMs

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

- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.commitPublish.EmptyFastPath.test.ts`

### Modify

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- `packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`
- `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`

## Focused Tests / Commands

```bash
pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.commitPublish.EmptyFastPath.test.ts
pnpm -C packages/logix-core test test/Runtime/ModuleRuntime/SelectorGraph.topicRetain.contract.test.ts
pnpm -C packages/logix-core test test/internal/Runtime/RuntimeStore.listenerSnapshot.test.ts
pnpm -C packages/logix-react test test/Hooks/useSelector.RuntimeStoreSnapshot.contract.test.tsx
pnpm -C packages/logix-react test test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx
```

## Acceptance Criteria

- **AC-001**: Commit with no subscribers, no topics, no hooks, and no rowId sync requirement does not iterate empty collections or clone hook arrays.
- **AC-002**: Existing selector/no-tearing/topic retain-release tests pass unchanged.
- **AC-003**: The fast path does not suppress commit state update when state actually changed.
- **AC-004**: The dispatch-shell evidence can report commitPublishCommitMs and hook timings without off-path allocation.

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
