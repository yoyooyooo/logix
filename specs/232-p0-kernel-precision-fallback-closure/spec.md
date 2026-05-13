# Feature Specification: P0 Kernel Precision Fallback Closure

**Feature Branch**: `232-p0-kernel-precision-fallback-closure`
**Created**: 2026-05-12
**Status**: Proposed / local-execution package
**Input**: Kernel performance convergence stage generated from the latest uploaded source/docs/spec snapshots.

## Current Role

Eliminate or hard-gate the highest-risk precision fallbacks across dirtyPlan, source/list dirty gate, selector route, and transaction direct-idle paths. P0 owns the failure modes that turn precise incremental execution into full/fanout work.

## Authority Inputs

- `docs/next/kernel-performance-evidence-lock.md`
- `docs/next/kernel-performance-convergence-p0p1p2.md`
- `docs/next/kernel-performance-convergence-local-agent-handoff.md`
- `docs/next/field-kernel-dirty-work-evidence-protocol.md`
- `docs/next/runtime-store-selector-notify-evidence-protocol.md`
- `specs/230-kernel-performance-evidence-lock/**`
- `packages/logix-perf-evidence/scripts/ci.kernel-performance-evidence-lock.ts`
- `packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-stage-gate.ts`

## Non-Goals

- Do not add public API, public root exports, public submodules, or public authoring nouns.
- Do not change production semantics for benchmark-only wins.
- Do not treat quick/smoke evidence as hard pass.
- Do not edit packed XML/Repomix snapshots.
- Do not weaken existing guardrails or tests to pass this stage.

## User Scenarios & Testing


### User Story 1 - dirtyPlan precision cannot silently degrade (Priority: P1)

As a maintainer, I need unknownWrite, missingRegistry, dirtyAll, nonFieldAuthority, and legacyDirtyInput to be visible and zero in canonical examples.

**Independent Test**: any non-zero dirtyPlan fallback counter blocks the convergence stage gate.

### User Story 2 - source/list/selector cannot fan out through full fallback (Priority: P1)

As a runtime owner, I need source full fallback, row full scans, unrelated key eval, and selector evaluate-all to block hard claims.

**Independent Test**: source/selector fallback counters are present and zero in the P0 manifest.

### User Story 3 - direct-idle path does not pay queue wait/backpressure tax (Priority: P2)

As a local optimizer, I need the no-backlog/default-lane/diagnostics-off path to prove queue wait and backpressure counters stay zero.

**Independent Test**: direct-idle non-zero sentinels block hard claims.


## Functional Requirements


- **FR-001**: P0 evidence must include dirtyPlan fallback counters for unknownWrite, missingRegistry, dirtyAll, nonFieldAuthority, and legacyDirtyInput.
- **FR-002**: P0 evidence must include source full fallback, source row full scan, and unrelated source key eval counters.
- **FR-003**: P0 evidence must include selector evaluate-all, selector dirtyAll fallback, and selector non-field authority fallback counters.
- **FR-004**: P0 evidence must include direct-idle queue wait/backpressure non-zero sentinels.
- **FR-005**: P0 canonical examples must fail the local gate if any required counter is absent or non-zero.


## Non-Functional Requirements

- **NFR-001**: Evidence must be JSON-safe and deterministic for the same input artifacts.
- **NFR-002**: Quick/smoke evidence is clue-only.
- **NFR-003**: Runtime public surface must remain unchanged.
- **NFR-004**: Any migrated cost or migrated risk must block hard claims until explained and accepted.

## Success Criteria


- **SC-001**: All P0 counters are present and zero in the local convergence manifest.
- **SC-002**: Required dirtyPattern, converge txnCommit, source/list, selector, and direct-idle suites are present and pass.
- **SC-003**: No P0 optimization migrates cost into RuntimeStore notify, externalStore snapshot, or React render fanout.
