# Feature Specification: Kernel Performance Convergence Final Gate

**Feature Branch**: `235-kernel-performance-convergence-final-gate`
**Created**: 2026-05-12
**Status**: Proposed / local-execution package
**Input**: Kernel performance convergence stage generated from the latest uploaded source/docs/spec snapshots.

## Current Role

Classify the combined P0/P1/P2 convergence evidence and produce the controlled local report used for handoff. This stage is the final gate, not a runtime optimization.

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


### User Story 1 - Combined evidence has one final classification (Priority: P1)

As a maintainer, I need one deterministic report that says whether Matrix, P0, P1, and P2 are complete, provisional, blocked, or incomplete.

**Independent Test**: `ci.kernel-performance-convergence-stage-gate.test.ts` classifies clean default evidence as complete/hard.

### User Story 2 - Missing or non-zero evidence cannot pass (Priority: P1)

As a reviewer, I need missing suites/counters or non-zero fallback counters to prevent hard claims.

**Independent Test**: missing P2 suite returns `incomplete`; non-zero P0 counter returns `blocked`.

### User Story 3 - Cloud limitations remain visible (Priority: P2)

As a local agent, I need the final report to state which validation was not run by the cloud LLM.

**Independent Test**: Markdown renderer includes cloud limitations and forbidden claims.


## Functional Requirements


- **FR-001**: The final gate must require all required stages to be implemented or validated.
- **FR-002**: The final gate must require comparable default/soak evidence for hard claims.
- **FR-003**: The final gate must require zero regressions, budgetExceeded, timeouts, stabilityWarnings, and missingSuites.
- **FR-004**: The final gate must require all required suites to be present and passing.
- **FR-005**: The final gate must require all required counters to be present and zero.
- **FR-006**: The final gate must include allowed claims, forbidden claims, blockers, missing evidence, stage status, and cloud limitations.
- **FR-007**: The final gate must require `migration.migratedCost` and `migration.migratedRisk`; missing or positive unaccepted migration blocks hard claims.


## Non-Functional Requirements

- **NFR-001**: Evidence must be JSON-safe and deterministic for the same input artifacts.
- **NFR-002**: Quick/smoke evidence is clue-only.
- **NFR-003**: Runtime public surface must remain unchanged.
- **NFR-004**: Any migrated cost or migrated risk must block hard claims until explained and accepted.

## Success Criteria


- **SC-001**: `pnpm -C packages/logix-perf-evidence test scripts/ci.kernel-performance-convergence-stage-gate.test.ts` passes locally.
- **SC-002**: A clean default/soak manifest returns `classification=complete` and `claimStrength=hard`.
- **SC-003**: Quick/smoke manifests return `provisional` at best.
- **SC-004**: Missing or non-zero required evidence prevents hard claims.
