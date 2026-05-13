# Feature Specification: RuntimeStore Listener Snapshot and Callback Fast Path

**Feature Branch**: `215-runtime-store-listener-snapshot-and-callback-fastpath`
**Created**: 2026-05-11
**Status**: Planned
**Priority**: P0
**Input**: RuntimeStore selector notify wave handoff.

## Summary

Thin the RuntimeStore non-empty notify path by ensuring listener snapshots are reused, empty topics skip callback/array construction, and callback fast path preserves mutation isolation.

## Goal

Reduce notify overhead without sacrificing no-tearing, stable order, or in-tick subscription mutation isolation.

## Dependencies

- Previous member specs up to `214` completed or consciously deferred.

## Tax Points Covered

- `listener array clone`
- `empty topic callback invocation`
- `topic subscriber count lookup`
- `snapshot version drift`
- `callback path exception handling`

## Functional Requirements

- **FR-001**: The implementation MUST target only the tax points listed for `215-runtime-store-listener-snapshot-and-callback-fastpath`.
- **FR-002**: The implementation MUST preserve public API shape, transaction semantics, and selector route ownership.
- **FR-003**: The implementation MUST add or update a focused guard before changing production code.
- **FR-004**: The implementation MUST record command outcomes and unresolved blockers in `handoff.md`.
- **FR-005**: The implementation MUST classify any observed cost/risk migration instead of hiding it.

## Non-Functional Requirements

- **NFR-001**: `diagnostics=off` MUST NOT allocate debug/trace payload objects on exact fast paths.
- **NFR-002**: RuntimeStore no-tearing and listener mutation isolation MUST be preserved.
- **NFR-003**: React host MUST consume core selector route and MUST NOT own a parallel selector law.
- **NFR-004**: If evidence is quick, dirty, unstable, or non-comparable, it MUST be labelled clue-only.
- **NFR-005**: The work MUST be reviewable as one spec-sized PR.

## Target Files


### Create

- `packages/logix-core/test/internal/Runtime/RuntimeStore.notifyFastPath.contract.test.ts`

### Modify

- `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
- `packages/logix-core/src/internal/runtime/core/JobQueue.ts`

## Focused Tests / Commands

```bash
pnpm -C packages/logix-core test test/internal/Runtime/RuntimeStore.listenerSnapshot.test.ts
pnpm -C packages/logix-core test test/internal/Runtime/RuntimeStore.notifyFastPath.contract.test.ts
pnpm -C packages/logix-core test test/internal/Runtime/TickScheduler.topic-classification.test.ts
```

## Acceptance Criteria

- **AC-001**: Unchanged subscription sets reuse the same listener snapshot reference.
- **AC-002**: Empty dirtyTopics returns empty listeners and does not call callback.
- **AC-003**: Callback fast path snapshots all topics before notify and preserves in-tick subscribe/unsubscribe isolation.
- **AC-004**: Listener throw is best-effort and does not stop other topic listeners.

## Non-Goals

- Do not change listener ordering semantics.
- Do not make notifications async inside RuntimeStore.
- Do not bypass TickScheduler ownership.

## Handoff Requirements

The local agent must update `handoff.md` with changed files, commands, sentinel status, evidence files, classification, and next recommended spec.
