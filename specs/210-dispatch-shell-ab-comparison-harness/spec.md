# Feature Specification: Dispatch Shell Same-Commit A/B Comparison Harness

**Feature Branch**: `210-dispatch-shell-ab-comparison-harness`
**Created**: 2026-05-11
**Status**: Planned
**Priority**: P1
**Input**: Runtime transaction fixed-cost wave handoff.

## Summary

Because the repo is undergoing heavy refactor, old commit vs new commit comparisons may be unstable. This spec adds a strictly internal/test-only A/B mode so the agent can compare baseline and fastPath inside the same commit/environment. The mode must not become public runtime config and must be removable after evidence is captured.

## Goal

Provide a test-only same-commit A/B harness for transaction shell fast-path changes.

## Dependencies

203; should be available before interpreting 204-209 changes

## Tax Points Covered

- comparison drift
- environment drift
- phase delta lossiness
- test-only switch leakage

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

- `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-ab-comparison.contract.test.tsx`

### Modify

- `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts`
- `packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx`
- `packages/logix-react/test/browser/perf-boundaries/protocol.ts`
- `packages/logix-react/test/perf-boundaries/contract-preflight.test.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts`

## Focused Tests / Commands

```bash
pnpm -C packages/logix-react test test/browser/perf-boundaries/dispatch-shell-ab-comparison.contract.test.tsx
pnpm -C packages/logix-react test test/perf-boundaries/contract-preflight.test.ts
pnpm -C packages/logix-react test test/perf-boundaries/semantics.test.ts
```

## Acceptance Criteria

- **AC-001**: Harness can run baseline and fastPath modes in the same commit and include mode in evidence.
- **AC-002**: The mode is test-only; it is not a public runtime option and not exported from package roots.
- **AC-003**: Diff interpretation includes total and phase delta, not only runtime.txnCommitMs.
- **AC-004**: A/B output can flag tax migration: total down but commit/queue/diagnostics up.

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
