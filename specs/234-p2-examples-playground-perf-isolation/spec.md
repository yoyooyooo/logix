# Feature Specification: P2 Examples and Playground Performance Isolation

**Feature Branch**: `234-p2-examples-playground-perf-isolation`
**Created**: 2026-05-12
**Status**: Proposed / local-execution package
**Input**: Kernel performance convergence stage generated from the latest uploaded source/docs/spec snapshots.

## Current Role

Separate kernel runtime evidence from product playground/editor costs so examples can support kernel claims without Monaco, Sandpack, type-bundle, route UI, or worker costs polluting runtime evidence.

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


### User Story 1 - runtime examples are isolated from playground product cost (Priority: P1)

As a reviewer, I need canonical runtime examples to report kernel evidence separately from editor/playground UI costs.

**Independent Test**: examples.runtimeWitness suite passes without mixing playground editor costs into the kernel manifest.

### User Story 2 - playground noise is reported as product cost (Priority: P1)

As a maintainer, I need Monaco/Sandpack/type-bundle/worker costs reported under playground/product evidence, not kernel hot-path evidence.

**Independent Test**: examples.playgroundNoiseIsolation suite passes and `examples.kernelPlaygroundCostMixed=0`.

### User Story 3 - public residue does not reintroduce old performance surface (Priority: P2)

As an API owner, I need examples/docs to avoid public residue that would create a second host/read/runtime path.

**Independent Test**: public residue sweep reports `examples.publicResidueViolation=0`.


## Functional Requirements


- **FR-001**: P2 evidence must include `examples.runtimeWitness` and `examples.playgroundNoiseIsolation` suite statuses.
- **FR-002**: P2 evidence must include `examples.kernelPlaygroundCostMixed` and `examples.publicResidueViolation` counters.
- **FR-003**: Kernel claims must exclude Monaco, Sandpack, type-bundle generation, editor worker startup, route layout, and product UI costs unless separately labeled.
- **FR-004**: Example docs must not introduce public performance shortcuts, second runtime/read law, or playground-owned selector route policy.


## Non-Functional Requirements

- **NFR-001**: Evidence must be JSON-safe and deterministic for the same input artifacts.
- **NFR-002**: Quick/smoke evidence is clue-only.
- **NFR-003**: Runtime public surface must remain unchanged.
- **NFR-004**: Any migrated cost or migrated risk must block hard claims until explained and accepted.

## Success Criteria


- **SC-001**: Runtime canonical examples have isolated evidence artifacts.
- **SC-002**: Playground/editor costs are reported separately or excluded from kernel claims.
- **SC-003**: Public residue violations are zero in the local report.
