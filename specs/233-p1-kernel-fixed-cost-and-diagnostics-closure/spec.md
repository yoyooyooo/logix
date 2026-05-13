# Feature Specification: P1 Kernel Fixed Cost and Diagnostics Closure

**Feature Branch**: `233-p1-kernel-fixed-cost-and-diagnostics-closure`
**Created**: 2026-05-12
**Status**: Proposed / local-execution package
**Input**: Kernel performance convergence stage generated from the latest uploaded source/docs/spec snapshots.

## Current Role

Reduce or hard-gate second-order fixed costs after P0 precision is locked: dispatch topic fanout allocation, RuntimeStore/ExternalStore fallbacks, diagnostics-off payload leakage, and list evidence string normalization.

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


### User Story 1 - dispatch/store fixed costs remain bounded (Priority: P1)

As a runtime owner, I need no-topic dispatch and RuntimeStore/externalStore paths to avoid avoidable allocation/fallback costs.

**Independent Test**: no-topic fanout allocation and runSync fallback counters are present and zero after boot.

### User Story 2 - diagnostics-off is structurally cheap (Priority: P1)

As a maintainer, I need diagnostics-off to avoid constructing payloads, trace arrays, JSON, or heavy snapshots.

**Independent Test**: diagnostics-off payload counter is zero in local evidence.

### User Story 3 - list evidence avoids hot-path string work (Priority: P2)

As a field-kernel owner, I need list evidence to avoid split/join/normalize work in transaction hot paths when id-first evidence is available.

**Independent Test**: listEvidence.stringNormalizeHotPath is zero or explicitly blocked.


## Functional Requirements


- **FR-001**: P1 evidence must include `dispatch.noTopicFanoutAlloc`.
- **FR-002**: P1 evidence must include `runtimeStore.runSyncFallbackAfterBoot` and `runtimeStore.retainedTopicLeak`.
- **FR-003**: P1 evidence must include `diagnosticsOff.payloadCount`.
- **FR-004**: P1 evidence must include `listEvidence.stringNormalizeHotPath`.
- **FR-005**: P1 must report whether fixed-cost reductions migrate cost into selector route, RuntimeStore notify, externalStore snapshot, React render, or diagnostics phases.


## Non-Functional Requirements

- **NFR-001**: Evidence must be JSON-safe and deterministic for the same input artifacts.
- **NFR-002**: Quick/smoke evidence is clue-only.
- **NFR-003**: Runtime public surface must remain unchanged.
- **NFR-004**: Any migrated cost or migrated risk must block hard claims until explained and accepted.

## Success Criteria


- **SC-001**: P1 counters are present and zero in the local convergence manifest.
- **SC-002**: Required dispatch, diagnostics, RuntimeStore, and externalStore suites pass.
- **SC-003**: No P1 improvement is classified as migrated_cost or migrated_risk.
