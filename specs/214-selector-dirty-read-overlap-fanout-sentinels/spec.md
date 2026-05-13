# Feature Specification: Selector Dirty/Read Overlap Fanout Sentinels

**Feature Branch**: `214-selector-dirty-read-overlap-fanout-sentinels`
**Created**: 2026-05-11
**Status**: Planned
**Priority**: P0
**Input**: RuntimeStore selector notify wave handoff.

## Summary

Ensure exact selector routes only mark topics whose reads overlap committed dirty roots/paths. Broadcast fallback must be explicit, counted, and never silent.

## Goal

Prevent selector dirty/read overlap from degenerating into broad topic notify fanout under exact dirty evidence.

## Dependencies

- Previous member specs up to `213` completed or consciously deferred.

## Tax Points Covered

- `selector dirty/read overlap fanout`
- `dirtyAll broadcast fallback`
- `missing registry fallback`
- `dynamic selector no-read fallback`
- `selector fingerprint/topic mismatch`

## Functional Requirements

- **FR-001**: The implementation MUST target only the tax points listed for `214-selector-dirty-read-overlap-fanout-sentinels`.
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

- `packages/logix-core/test/Runtime/Runtime.selectorNotifyFanout.contract.test.ts`
- `packages/logix-core/test/Runtime/Runtime.selectorBroadcastFallbackReason.contract.test.ts`

### Modify

- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- `packages/logix-core/src/internal/runtime/core/selectorRoute.dirty.ts`
- `packages/logix-core/src/internal/runtime/core/selectorRoute.types.ts`
- `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`

## Focused Tests / Commands

```bash
pnpm -C packages/logix-core test test/Runtime/Runtime.selectorNotifyFanout.contract.test.ts
pnpm -C packages/logix-core test test/Runtime/Runtime.selectorDirtyOverlap.contract.test.ts
pnpm -C packages/logix-core test test/Runtime/Runtime.selectorDirtyFallback.contract.test.ts
```

## Acceptance Criteria

- **AC-001**: Unrelated exact dirty roots do not mark unrelated selector topics.
- **AC-002**: Dirty/read overlap count equals or bounds dirty topic count in exact mode.
- **AC-003**: dirtyAll and missing authority broadcast paths carry explicit fallback reason.
- **AC-004**: Diagnostics=off does not allocate fallback payload objects on the exact fast path.

## Non-Goals

- Do not alter selector public hook API.
- Do not reject existing dynamic selectors beyond already-defined strict-gate behavior.
- Do not add new public ReadQuery namespace or descriptor family.

## Handoff Requirements

The local agent must update `handoff.md` with changed files, commands, sentinel status, evidence files, classification, and next recommended spec.
