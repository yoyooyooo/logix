# Feature Specification: Focused Perf Evidence and Tax Migration Gate

**Feature Branch**: `211-focused-perf-evidence-and-tax-migration-gate`
**Created**: 2026-05-11
**Status**: Accepted
**Priority**: P1
**Input**: Runtime transaction fixed-cost wave handoff.

## Summary

This spec completes the wave by requiring a structured evidence package: structural sentinels, same-commit A/B when useful, focused dispatchShell default-profile before/after diff, and a tax migration report. It does not run broad perf by default during architectural churn, but it makes clear what evidence is sufficient for a local claim and what remains only a clue.

## Current Decision

- `211-focused-perf-evidence-and-tax-migration-gate`: accepted
- classification: `tax_removed`
- claimStrength: focused hard
- global performance claim: not made
- archived clean evidence: `specs/211-focused-perf-evidence-and-tax-migration-gate/perf/clean/`

## Goal

Define the evidence set and post-change report required to decide whether the fixed-cost wave moved or removed tax.

## Dependencies

203-210

## Tax Points Covered

- evidence sufficiency
- tax migration classification
- `quick/default/soak claim boundary`
- `matrix/hash/env drift`

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

- `specs/211-focused-perf-evidence-and-tax-migration-gate/perf/README.md`
- `docs/next/runtime-dispatch-shell-tax-migration-report-template.md`
- `packages/logix-perf-evidence/scripts/ci.dispatch-shell-tax-report.ts`

### Modify

- `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`
- `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- `packages/logix-perf-evidence/scripts/diff.ts`
- `packages/logix-perf-evidence/scripts/ci.interpret-artifact.ts`
- `packages/logix-perf-evidence/assets/matrix.json`

## Focused Tests / Commands

```bash
pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts
pnpm -C packages/logix-react test test/perf-boundaries/semantics.test.ts
pnpm -C packages/logix-perf-evidence test scripts/lib/capacity-collect-decision.test.ts
pnpm typecheck
```

## Acceptance Criteria

- **AC-001**: Evidence README lists required surfaces: structural sentinels, focused dispatch shell diff, A/B optional, and final report.
- **AC-002**: Final report can classify tax removed, tax migrated, inconclusive, or failed.
- **AC-003**: Default-profile focused diff must require comparable=true and summary.regressions==0 for any hard claim.
- **AC-004**: Quick profile and dirty/non-comparable results are explicitly marked as clues only.
- **AC-005**: Matrix additions do not create a second suite/budget truth outside matrix.json.

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
