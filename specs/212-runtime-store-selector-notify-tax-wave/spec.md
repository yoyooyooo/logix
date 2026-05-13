# Feature Specification: RuntimeStore Selector Notify Tax Wave

**Feature Branch**: `212-runtime-store-selector-notify-tax-wave`
**Created**: 2026-05-11
**Status**: Planned
**Priority**: P0
**Input**: RuntimeStore selector notify wave handoff.

## Summary

Group spec for the next performance wave after dispatchShell.fixedCost tax_removed. It targets the non-empty subscriber path: selector route, RuntimeStore topic notify, readQuery external-store snapshots, React useSelector render fanout, and topic lifecycle cleanup.

## Goal

Coordinate a focused RuntimeStore / selector notification fanout wave without reopening dispatch shell fixed-cost work.

## Dependencies

- 202-211 transaction fixed-cost wave accepted or equivalent.

## Tax Points Covered

- `selector topic fanout`
- `RuntimeStore dirty topic notify fanout`
- `readQuery external-store runSync fallback`
- `first-listener extra notify`
- `topic retain/release leak`
- `React useSelector render fanout`
- `selector fallback broadcast`
- `notification evidence/report drift`

## Functional Requirements

- **FR-001**: The implementation MUST target only the tax points listed for `212-runtime-store-selector-notify-tax-wave`.
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

- `docs/next/runtime-store-selector-notify-tax-wave.md`
- `docs/next/runtime-store-selector-notify-evidence-protocol.md`

### Modify

- None

## Focused Tests / Commands

```bash
./scripts/list_focused_commands.sh
./scripts/print_evidence_commands.sh
```

## Acceptance Criteria

- **AC-001**: Member spec order is explicit and does not duplicate member implementation details.
- **AC-002**: The notify tax ledger lists first-order and second-order tax points with owners and evidence surfaces.
- **AC-003**: The evidence protocol states what can and cannot be claimed before comparable default-profile diff exists.
- **AC-004**: No public API or runtime semantics are changed by this group spec.

## Non-Goals

- Do not change dispatch shell fixed-cost code except to keep tests compiling.
- Do not add public selector/readQuery authoring APIs.
- Do not move selector route ownership into React.
- Do not claim global runtime performance improvement.

## Handoff Requirements

The local agent must update `handoff.md` with changed files, commands, sentinel status, evidence files, classification, and next recommended spec.
