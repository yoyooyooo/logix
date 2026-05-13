# Feature Specification: RuntimeStore Notify Preflight and Tax Ledger

**Feature Branch**: `213-runtime-store-notify-preflight-and-tax-ledger`
**Created**: 2026-05-11
**Status**: Planned
**Priority**: P0
**Input**: RuntimeStore selector notify wave handoff.

## Summary

Build the current tax ledger before code optimization. Identify all notify paths, topic fanout surfaces, selector fallback reasons, listener snapshot behavior, and evidence gaps.

## Goal

Map the RuntimeStore / selector notify path and produce a preflight ledger that future specs must use.

## Dependencies

- Previous member specs up to `212` completed or consciously deferred.

## Tax Points Covered

- `topic dirty map shape`
- `selector graph overlap walk`
- `dirtyAll / missing registry broadcast`
- `listener snapshot clone`
- `callback vs array notify path`
- `first-listener snapshot refresh`
- `readQuery runSync fallback`
- `retained topic lifecycle`
- `React render fanout`

## Functional Requirements

- **FR-001**: The implementation MUST target only the tax points listed for `213-runtime-store-notify-preflight-and-tax-ledger`.
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

- `docs/next/runtime-store-selector-notify-tax-ledger.md`
- `specs/213-runtime-store-notify-preflight-and-tax-ledger/notes/entrypoints.md`

### Modify

- None

## Focused Tests / Commands

```bash
pnpm -C packages/logix-core test test/internal/Runtime/RuntimeStore.listenerSnapshot.test.ts
pnpm -C packages/logix-react test test/Contracts/ReactSelectorRouteOwner.guard.test.ts
```

## Acceptance Criteria

- **AC-001**: Ledger lists exact source/test/perf files for each notify tax point.
- **AC-002**: Each suspected tax has an owner, expected sentinel, and evidence surface.
- **AC-003**: No source behavior changes are made by this spec.
- **AC-004**: Uncertain findings are marked as hypotheses, not facts.

## Non-Goals

- Do not optimize in this spec.
- Do not rewrite RuntimeStore or SelectorGraph.
- Do not modify public API or docs examples.

## Handoff Requirements

The local agent must update `handoff.md` with changed files, commands, sentinel status, evidence files, classification, and next recommended spec.
