# Feature Specification: Runtime Transaction Fixed-Cost Tax Wave

**Feature Branch**: `202-runtime-transaction-fixed-cost-tax-wave`
**Created**: 2026-05-11
**Status**: Planned
**Priority**: P0
**Input**: Runtime transaction fixed-cost wave handoff.

## Summary

This group spec ties together dispatch shell fixed-cost reduction, second-order tax sentinels, A/B comparison, focused evidence collection, and the post-change tax migration report. It is index-only for code; implementation happens in member specs 203-211.

## Goal

Coordinate the transaction fixed-cost wave without duplicating member implementation details.

## Dependencies

190-201 or equivalent kernel stabilization applied

## Tax Points Covered

- dispatch shell fixed tax
- `scope/acquisition tax`
- `queue/lane empty-path tax`
- noop phase guard tax
- commit publish empty-path tax
- `diagnostics/instrumentation allocation tax`
- buffer clear and key materialization tax
- evidence comparison drift tax

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

- `docs/next/runtime-transaction-fixed-cost-tax-wave.md`
- `docs/next/runtime-transaction-fixed-cost-evidence-playbook.md`
- `specs/202-runtime-transaction-fixed-cost-tax-wave/checklists/group.members.md`

### Modify

- None

## Focused Tests / Commands

```bash
scripts/list_focused_commands.sh
scripts/print_evidence_commands.sh
```

## Acceptance Criteria

- **AC-001**: Member spec order is explicit and does not duplicate member tasks.
- **AC-002**: The tax ledger lists first-order and second-order tax points with owners and evidence surfaces.
- **AC-003**: The evidence playbook states what can and cannot be claimed before comparable default-profile diff exists.
- **AC-004**: No public API or runtime semantics are changed by this group spec.

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
