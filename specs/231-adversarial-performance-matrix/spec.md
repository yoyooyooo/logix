# Feature Specification: Adversarial Performance Matrix

**Feature Branch**: `231-adversarial-performance-matrix`
**Created**: 2026-05-12
**Status**: Proposed / local-execution package
**Input**: Kernel performance convergence stage generated from the latest uploaded source/docs/spec snapshots.

## Current Role

Create the shared matrix and evidence pipeline used by all P0/P1/P2 optimizations. This stage does not optimize runtime by itself; it makes failures attributable by cell, phase, fallback reason, and risk/cost migration.

## Authority Inputs

- `docs/next/kernel-performance-evidence-lock.md`
- `docs/next/adversarial-performance-matrix.md`
- `docs/next/kernel-performance-convergence-p0p1p2.md`
- `docs/next/kernel-performance-convergence-local-agent-handoff.md`
- `docs/next/field-kernel-dirty-work-evidence-protocol.md`
- `docs/next/runtime-store-selector-notify-evidence-protocol.md`
- `specs/230-kernel-performance-evidence-lock/**`
- `packages/logix-perf-evidence/scripts/ci.kernel-performance-evidence-lock.ts`
- `packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-stage-gate.ts`
- `packages/logix-perf-evidence/scripts/ci.adversarial-matrix-report.ts`

## Non-Goals

- Do not add public API, public root exports, public submodules, or public authoring nouns.
- Do not change production semantics for benchmark-only wins.
- Do not treat quick/smoke evidence as hard pass.
- Do not edit packed XML/Repomix snapshots.
- Do not weaken existing guardrails or tests to pass this stage.

## User Scenarios & Testing


### User Story 1 - Matrix cells are stable and comparable (Priority: P1)

As a maintainer, I need stable cell IDs and matrix hashes so before/after artifacts cannot be compared across incompatible workloads.

**Independent Test**: same axes produce the same cell ID; changed axes produce a different ID.

### User Story 2 - Phase attribution identifies where cost moved (Priority: P1)

As a local optimizer, I need total p95 failures decomposed into dirtyPlan, source, selector, store, externalStore, React, and diagnostics phases.

**Independent Test**: a sample diff with improved total but regressed selectorRoute is classified as migrated cost.

### User Story 3 - Quick evidence cannot become a release claim (Priority: P2)

As a reviewer, I need quick profile output to be useful for triage while forbidden for hard release claims.

**Independent Test**: quick profile report has `claimStrength=clue` at best.


## Functional Requirements


- **FR-001**: Matrix evidence must include `matrixId`, `matrixHash`, `cellId`, `profile`, `envId`, axes, sample metadata, primary metric, phase attribution, counters, and classification.
- **FR-002**: Required hot paths must include dirtyPattern, converge txnCommit, form list scope, externalStore ingest, runtimeStore no-tearing notify, React strict suspense jitter, diagnostics overhead, transaction direct-idle, dispatch fixed cost, runtime examples, and playground noise isolation.
- **FR-003**: Matrix profiles must distinguish quick, default, and soak.
- **FR-004**: Phase attribution must separate total cost from dirtyPlan/source/selector/store/externalStore/React/diagnostics phases.
- **FR-005**: Cost/risk migration must block hard claims.


## Non-Functional Requirements

- **NFR-001**: Evidence must be JSON-safe and deterministic for the same input artifacts.
- **NFR-002**: Quick/smoke evidence is clue-only.
- **NFR-003**: Runtime public surface must remain unchanged.
- **NFR-004**: Any migrated cost or migrated risk must block hard claims until explained and accepted.

## Success Criteria


- **SC-001**: Local default or soak matrix artifacts can be classified by the convergence stage gate.
- **SC-002**: Quick matrix evidence is never hard-claim eligible.
- **SC-003**: Missing required hot paths produce `incomplete`, not `pass`.
- **SC-004**: Migrated cost/risk produces `blocked` or a documented blocker.
