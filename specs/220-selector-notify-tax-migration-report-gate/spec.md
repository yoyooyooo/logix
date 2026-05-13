# Feature Specification: Selector Notify Tax Migration Report Gate

**Feature Branch**: `220-selector-notify-tax-migration-report-gate`
**Created**: 2026-05-11
**Status**: Planned
**Priority**: P0
**Input**: RuntimeStore selector notify wave handoff.

## Summary

Add a tax migration classifier for selector notify / RuntimeStore no-tearing evidence, analogous to dispatch-shell tax report but scoped to non-empty subscriber paths.

## Goal

Make selector notify outcomes classifiable as tax_removed, tax_migrated, stable_guarded, inconclusive, or failed.

## Dependencies

- Previous member specs up to `219` completed or consciously deferred.

## Tax Points Covered

- `notify total metric movement`
- `render fanout movement`
- `runSync fallback movement`
- `retained topic movement`
- `listener snapshot movement`
- `broadcast fallback movement`

## Functional Requirements

- **FR-001**: The implementation MUST target only the tax points listed for `220-selector-notify-tax-migration-report-gate`.
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

- `packages/logix-perf-evidence/scripts/ci.selector-notify-tax-report.ts`
- `packages/logix-perf-evidence/scripts/ci.selector-notify-tax-report.test.ts`
- `docs/next/runtime-store-selector-notify-tax-migration-report-template.md`

### Modify

- `packages/logix-perf-evidence/README.md`

## Focused Tests / Commands

```bash
pnpm -C packages/logix-perf-evidence test scripts/ci.selector-notify-tax-report.test.ts
pnpm perf ci:selector-notify-tax-report -- --diff <diff> --before <before> --after <after> --profile default --out <report.md> --json-out <report.json>
```

## Acceptance Criteria

- **AC-001**: Report fails hard on regressions, budget violations, missing required metrics, timeout/fail points, or comparable=false when hard claim requested.
- **AC-002**: Report marks migrated_cost if total improves while renderCount/runSyncFallback/retainedTopicCount/broadcastFallback/listenerCloneCount rises.
- **AC-003**: Report allows stable_guarded only when structural counters improve but p95 is stable/no-regression.
- **AC-004**: Report output includes allowed and forbidden claims.

## Non-Goals

- Do not reuse dispatchShell report labels if they obscure selector notify semantics.
- Do not make hard performance claims from same-commit A/B only.
- Do not add production code paths just for the report.

## Handoff Requirements

The local agent must update `handoff.md` with changed files, commands, sentinel status, evidence files, classification, and next recommended spec.
