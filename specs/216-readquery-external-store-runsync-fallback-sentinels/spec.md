# Feature Specification: ReadQuery External Store runSync Fallback Sentinels

**Feature Branch**: `216-readquery-external-store-runsync-fallback-sentinels`
**Created**: 2026-05-11
**Status**: Planned
**Priority**: P0
**Input**: RuntimeStore selector notify wave handoff.

## Summary

Guard the React readQuery external-store path so committed RuntimeStore snapshots are preferred, active-listener runSync fallback is counted, and first listener does not create duplicate invalidation.

## Goal

Prevent React readQuery subscription from reintroducing runtime.runSync fixed tax or first-listener extra notify under normal committed snapshots.

## Dependencies

- Previous member specs up to `215` completed or consciously deferred.

## Tax Points Covered

- `active-listener runSync fallback`
- `first-listener extra notify`
- `getSnapshot stale refresh`
- `RuntimeStore snapshot absence`
- `server snapshot mismatch`

## Functional Requirements

- **FR-001**: The implementation MUST target only the tax points listed for `216-readquery-external-store-runsync-fallback-sentinels`.
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

- `packages/logix-react/test/internal/store/RuntimeExternalStore.runSyncFallback.contract.test.tsx`

### Modify

- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- `packages/logix-react/src/internal/hooks/useSelector.ts`
- `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`

## Focused Tests / Commands

```bash
pnpm -C packages/logix-react test test/internal/store/RuntimeExternalStore.runSyncFallback.contract.test.tsx
pnpm -C packages/logix-react test test/Hooks/useSelector.RuntimeStoreSnapshot.contract.test.tsx
pnpm -C packages/logix-react test test/Hooks/useSelector.coreRoute.contract.test.tsx
```

## Acceptance Criteria

- **AC-001**: Committed RuntimeStore snapshot path has runSyncFallbackCount=0.
- **AC-002**: Fallback remains allowed only for explicit no-committed-snapshot bootstrap and is counted.
- **AC-003**: First subscribe does not produce duplicate notify when snapshot is already committed.
- **AC-004**: Test-only counters do not leak into public API or production payloads.

## Non-Goals

- Do not change public useSelector signature.
- Do not reintroduce legacy selector store.
- Do not move selector route policy into React.

## Handoff Requirements

The local agent must update `handoff.md` with changed files, commands, sentinel status, evidence files, classification, and next recommended spec.
