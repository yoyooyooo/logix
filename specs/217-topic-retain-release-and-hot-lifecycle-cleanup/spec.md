# Feature Specification: Topic Retain/Release and Hot Lifecycle Cleanup

**Feature Branch**: `217-topic-retain-release-and-hot-lifecycle-cleanup`
**Created**: 2026-05-11
**Status**: Planned
**Priority**: P1
**Input**: RuntimeStore selector notify wave handoff.

## Summary

Ensure selector/readQuery topics retained by React stores are released on unmount, hot lifecycle replacement, route switch, and module disposal.

## Goal

Close retained-topic lifecycle leaks that can turn old subscribers into hidden notify fanout.

## Dependencies

- Previous member specs up to `216` completed or consciously deferred.

## Tax Points Covered

- `retained topic growth`
- `module instance topic leak`
- `HMR route switch leak`
- `duplicate retained readQuery topic`
- `dispose pending callback leak`

## Functional Requirements

- **FR-001**: The implementation MUST target only the tax points listed for `217-topic-retain-release-and-hot-lifecycle-cleanup`.
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

- `packages/logix-react/test/internal/store/RuntimeExternalStore.topicRetainRelease.contract.test.tsx`

### Modify

- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- `packages/logix-react/src/internal/store/RuntimeExternalStore.hotLifecycle.ts`
- `packages/logix-react/src/internal/store/ModuleCache.ts`
- `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`

## Focused Tests / Commands

```bash
pnpm -C packages/logix-react test test/internal/store/RuntimeExternalStore.topicCleanup.contract.test.tsx
pnpm -C packages/logix-react test test/internal/store/RuntimeExternalStore.topicRetainRelease.contract.test.tsx
pnpm -C packages/logix-core test test/Runtime/ModuleRuntime/SelectorGraph.topicRetain.contract.test.ts
```

## Acceptance Criteria

- **AC-001**: Unmount releases retained readQuery topic.
- **AC-002**: Hot lifecycle replacement leaves retainedTopicCount=0 for old instance.
- **AC-003**: Route switch / module dispose does not leave orphan topic listeners.
- **AC-004**: Retain/release counters are test-only or diagnostics-gated and not public API.

## Non-Goals

- Do not introduce global cleanup sweep as normal hot path.
- Do not change module identity semantics.
- Do not alter HMR public surface.

## Handoff Requirements

The local agent must update `handoff.md` with changed files, commands, sentinel status, evidence files, classification, and next recommended spec.
