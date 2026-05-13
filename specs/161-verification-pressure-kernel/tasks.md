# Tasks: Verification Pressure Kernel

**Input**: Design documents from `/specs/161-verification-pressure-kernel/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required. This spec changes `@logixjs/core` runtime control-plane kernel semantics.

**Organization**: Tasks are grouped by user story so each story remains independently testable.

## Phase 1: Setup

**Purpose**: Confirm the implementation entry is admitted and align the spec status.

- [X] T001 Confirm checklist gate and implementation context in `specs/161-verification-pressure-kernel/checklists/requirements.md`
- [X] T002 Move feature status to Active in `specs/161-verification-pressure-kernel/spec.md`

---

## Phase 2: Foundational

**Purpose**: Establish the shared report model and proof-kernel extension points used by all stories.

- [X] T003 Inspect existing control-plane report, check, trial and compare entry points in `packages/logix-core/src/ControlPlane.ts`
- [X] T004 Inspect existing verification proof-kernel internals in `packages/logix-core/src/internal/verification/proofKernel.ts`
- [X] T005 Inspect existing trial report pipeline and startup error projection in `packages/logix-core/src/internal/observability/trialRunReportPipeline.ts`
- [X] T006 Define shared pressure, focus, lifecycle, admissibility and repeatability fields in `packages/logix-core/src/ControlPlane.ts`
- [X] T007 Wire shared pressure helpers through `packages/logix-core/src/internal/verification/proofKernel.types.ts`

---

## Phase 3: User Story 1 - Static Check Pressure (Priority: P1)

**Goal**: `runtime.check` reports static assembly pressure without booting runtime.

**Traceability**: NS-3, NS-8, KF-3

**Independent Test**: Run only `runtime.check` contract tests and prove missing blueprint, invalid imports, duplicate imports and declaration freshness report structured pressure with no startup evidence.

### Tests for User Story 1

- [X] T008 [P] [US1] Add no-startup and static pressure contract tests in `packages/logix-core/test/Contracts/RuntimeCheck.contract.test.ts`
- [X] T009 [P] [US1] Add Program-only import pressure tests in `packages/logix-core/test/Contracts/ProgramImports.program-entry.test.ts`
- [X] T010 [P] [US1] Add declaration freshness and sourceRef pressure tests in `packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts`

### Implementation for User Story 1

- [X] T011 [US1] Implement static pressure collection in `packages/logix-core/src/internal/verification/staticCheck.ts`
- [X] T012 [US1] Connect static pressure into check report generation in `packages/logix-core/src/Runtime.ts`
- [X] T013 [US1] Ensure PASS coverage boundary is emitted for check-stage PASS in `packages/logix-core/src/Runtime.ts`

---

## Phase 4: User Story 2 - Startup Dependency Cause (Priority: P1)

**Goal**: Startup trial reports typed dependency cause pressure for service, config, Program import, child dependency, phase, provider source and owner coordinate.

**Traceability**: NS-3, NS-8, NS-10, KF-3, KF-8

**Independent Test**: Run startup observability tests and inspect dependency cause IR, repair hints and lifecycle summary without parsing free-text messages.

### Tests for User Story 2

- [X] T014 [P] [US2] Add missing service typed cause tests in `packages/logix-core/test/observability/Observability.trialRunModule.missingService.test.ts`
- [X] T015 [P] [US2] Add missing and invalid config typed cause tests in `packages/logix-core/test/observability/Observability.trialRunModule.missingConfig.test.ts`
- [X] T016 [P] [US2] Add Program import and child dependency cause tests in `packages/logix-core/test/Contracts/ProgramImports.program-entry.test.ts`
- [X] T017 [P] [US2] Add boot and close dual-summary tests in `packages/logix-core/test/observability/Observability.trialRunModule.disposeTimeout.test.ts`

### Implementation for User Story 2

- [X] T018 [US2] Implement typed dependency cause projection in `packages/logix-core/src/internal/observability/trialRunEnvironment.ts`
- [X] T019 [US2] Preserve boot and close dual summary in `packages/logix-core/src/Runtime.ts`
- [X] T020 [US2] Link lifecycle artifacts by `artifacts[].outputKey` in `packages/logix-core/src/Runtime.ts`

---

## Phase 5: User Story 3 - Comparable And Repeatable Report (Priority: P2)

**Goal**: Reports expose current-stage PASS, unique next-stage scheduling, compare admissibility and repeatability normalization.

**Traceability**: NS-4, NS-8, NS-10, KF-4, KF-9

**Independent Test**: Complete before -> repair -> rerun -> compare proof packs for Program assembly, source/declaration and dependency failure families.

### Tests for User Story 3

- [X] T021 [P] [US3] Add compare admissibility tests in `packages/logix-core/test/Contracts/VerificationControlPlaneCompare.contract.test.ts`
- [X] T022 [P] [US3] Add PASS and next-stage semantics tests in `packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts`
- [X] T023 [P] [US3] Add repeatability stability tests in `packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts`
- [X] T024 [P] [US3] Add before-repair-rerun-compare proof pack tests in `packages/logix-core/test/Contracts/VerificationControlPlaneCompare.contract.test.ts`

### Implementation for User Story 3

- [X] T025 [US3] Implement compare admissibility digest checks in `packages/logix-core/src/ControlPlane.ts`
- [X] T026 [US3] Implement repeatability normalizer helpers in `packages/logix-core/src/ControlPlane.ts`
- [X] T027 [US3] Enforce unique `nextRecommendedStage` scheduling semantics in `packages/logix-core/src/ControlPlane.ts`

---

## Phase 6: Documentation And Writeback

**Purpose**: Promote stable outcomes to the authority pages referenced by the plan.

- [X] T028 Update verification control-plane authority in `docs/ssot/runtime/09-verification-control-plane.md`
- [X] T029 Update capabilities owner boundary in `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
- [X] T030 Update pressure matrix proof refs in `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md`
- [X] T031 Update implementation quickstart evidence in `specs/161-verification-pressure-kernel/quickstart.md`

---

## Phase 7: Validation

**Purpose**: Prove the feature and close the spec without adding compatibility layers.

- [X] T032 Run targeted core contract tests from `specs/161-verification-pressure-kernel/quickstart.md`
- [X] T033 Run `pnpm -C packages/logix-core exec tsc -p tsconfig.json --noEmit`
- [X] T034 Run SSoT and naming sweep for `Probe`, `Witness`, `Pressure`, `CAP-PRESS`, `TASK` in touched production code under `packages/logix-core/src`
- [X] T035 Move feature status to Done in `specs/161-verification-pressure-kernel/spec.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 must finish before implementation.
- Phase 2 blocks all user stories.
- US1 and US2 can proceed after Phase 2.
- US3 depends on the shared report fields from Phase 2 and can run after US1 or US2 report shape stabilizes.
- Documentation writeback depends on implemented behavior.
- Validation depends on code and documentation writeback.

### Parallel Opportunities

- T008, T009 and T010 can be written in parallel.
- T014, T015, T016 and T017 can be written in parallel.
- T021, T022, T023 and T024 can be written in parallel.
- T028, T029 and T030 can be updated in parallel after behavior stabilizes.

## Implementation Strategy

1. Complete setup and shared report model tasks.
2. Deliver US1 as the MVP because it preserves the default cheap gate.
3. Deliver US2 on the existing startup proof-kernel route.
4. Deliver US3 compare and repeatability closure.
5. Write SSoT proof refs back and run targeted validation.
