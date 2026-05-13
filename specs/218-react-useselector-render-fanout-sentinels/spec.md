# Feature Specification: React useSelector Render Fanout Sentinels

**Feature Branch**: `218-react-useselector-render-fanout-sentinels`
**Created**: 2026-05-11
**Status**: Planned
**Priority**: P1
**Input**: RuntimeStore selector notify wave handoff.

## Summary

Verify React host consumes core selector route precisely and does not re-render unrelated exact selectors or whole-module subscribers under exact dirty evidence.

## Goal

Prevent host-layer render fanout from masking core selector notify improvements.

## Dependencies

- Previous member specs up to `217` completed or consciously deferred.

## Tax Points Covered

- `unrelated selector render`
- `shared subscription duplication`
- `whole-state selector teaching regression`
- `dynamic selector fallback render storm`
- `strict mode duplicate notify`

## Functional Requirements

- **FR-001**: The implementation MUST target only the tax points listed for `218-react-useselector-render-fanout-sentinels`.
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

- `packages/logix-react/test/Hooks/useSelector.renderFanout.contract.test.tsx`
- `packages/logix-react/test/browser/perf-boundaries/selector-render-fanout.test.tsx`
- `packages/logix-react/test/browser/perf-boundaries/selector-render-fanout.runtime.ts`

### Modify

- `packages/logix-react/src/internal/hooks/useSelector.ts`
- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- `packages/logix-react/test/browser/perf-boundaries/harness.ts`

## Focused Tests / Commands

```bash
pnpm -C packages/logix-react test test/Hooks/useSelector.renderFanout.contract.test.tsx
pnpm -C packages/logix-react test test/Contracts/ReactSelectorRouteOwner.guard.test.ts
pnpm -C packages/logix-react test test/Contracts/ReactSelectorStoreResidue.guard.test.ts
```

## Acceptance Criteria

- **AC-001**: Unrelated exact field selector does not re-render after disjoint dirty write.
- **AC-002**: Multiple components using same selector fingerprint share the expected topic route without duplicate subscription fanout.
- **AC-003**: Whole-state/dynamic fallback remains explicit and diagnosable.
- **AC-004**: StrictMode does not double-retain topics after cleanup.

## Non-Goals

- Do not add a new hook family.
- Do not teach whole-state reads in examples.
- Do not claim product route render performance from this spec alone.

## Handoff Requirements

The local agent must update `handoff.md` with changed files, commands, sentinel status, evidence files, classification, and next recommended spec.
