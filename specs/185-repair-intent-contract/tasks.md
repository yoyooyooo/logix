# Tasks: Repair Intent Contract

**Input**: Design documents from `specs/185-repair-intent-contract/`
**Prerequisites**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

**Tests**: Required. 185 touches verification report repair routing, dependency cause joins, artifact backlinks, live forbidden fields and Agent consumption guidance.

**Organization**: Tasks are grouped by user story. Stable report law stays in [spec.md](./spec.md), `09`, `15` and `18`; this file defines execution order and lane-local proof commands.

**Family order**: 185 is Wave 2 of the `184 -> 185 -> 186` terminal offline Agent self-verification family. It is ordered after 184 and produces report-owned repair intent consumed by 186. It does not consume 184 entry failure facts as a positive repair proof lane. Baselines may run in parallel across the family, but closure must remain ordered.

## Phase 1: Setup And Baseline

**Purpose**: Establish current report behavior and prevent auto-patch/live-repair scope drift.

- [x] T001 Review authority in `specs/185-repair-intent-contract/spec.md`, `docs/ssot/runtime/09-verification-control-plane.md`, `docs/ssot/runtime/15-cli-agent-first-control-plane.md`, `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md` and `specs/184-entry-declaration-authority/spec.md`; treat `specs/186-verification-loop-orchestration/spec.md` only as downstream consumer context
- [x] T002 [P] Run current core verification report baseline for `packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts`
- [x] T003 [P] Run current dependency cause baseline for `packages/logix-core/test/VerificationDependencyCauseSpine.contract.test.ts` and `packages/logix-cli/test/Integration/trial-dependency-spine.contract.test.ts`
- [x] T004 [P] Run current repair closure baseline for `packages/logix-cli/test/Integration/repair-closure.program-assembly.e2e.test.ts`, `packages/logix-cli/test/Integration/repair-closure.source-declaration.e2e.test.ts` and `packages/logix-cli/test/Integration/repair-closure.dependency.e2e.test.ts`
- [x] T005 [P] Run current live forbidden-field baseline for `packages/logix-cli/test/Integration/live-command-result.contract.test.ts`
- [x] T006 Classify touched-file size and decomposition risk for `packages/logix-core/src/internal/verification/`, `packages/logix-core/src/internal/observability/`, `packages/logix-cli/src/internal/commands/` and `packages/logix-cli/src/internal/liveResult.ts`

## Phase 2: Foundational Repair Join Law

**Purpose**: Stabilize shared repair hint validation and artifact backlink integrity before failure-family work.

- [x] T007 [P] Add repair hint artifact backlink validation in `packages/logix-core/src/internal/verification/`
- [x] T008 [P] Add owner-fact join helpers for findings and dependency causes in `packages/logix-core/src/internal/verification/`
- [x] T009 [P] Add unavailable-focus projection helpers in `packages/logix-core/src/internal/observability/trialRunReportPipeline.ts`
- [x] T010 [P] Add top-level scheduling precedence tests in `packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts`
- [x] T011 [P] Add report artifact backlink integrity tests in `packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts`

**Checkpoint**: Repair hints can be validated against owner facts and report artifacts without prose parsing.

## Phase 3: User Story 1 - Localize A Dependency Repair (Priority: P1)

**Goal**: Missing service, config, imported Program and child dependency failures identify what is missing, who owns it, where to provide it and which stage to rerun.

**Independent Test**: Run dependency fixtures and consume only structured report fields.

### Tests for User Story 1

- [x] T012 [P] [US1] Add missing service and config repair routing assertions in `packages/logix-core/test/VerificationDependencyCauseSpine.contract.test.ts`
- [x] T013 [P] [US1] Add missing import and child dependency repair routing assertions in `packages/logix-core/test/VerificationDependencyCauseSpine.contract.test.ts`
- [x] T014 [P] [US1] Add CLI dependency repair field assertions in `packages/logix-cli/test/Integration/trial-dependency-spine.contract.test.ts`
- [x] T015 [P] [US1] Add no-prose-routing assertions in `packages/logix-cli/test/Integration/repair-closure.dependency.e2e.test.ts`

### Implementation for User Story 1

- [x] T016 [US1] Materialize dependency repair owner facts in `packages/logix-core/src/internal/observability/trialRunErrors.ts`
- [x] T017 [US1] Preserve phase, provider source, owner coordinate and child identity in `packages/logix-core/src/internal/observability/trialRunReportPipeline.ts`
- [x] T018 [US1] Preserve dependency repair fields through CLI trial output in `packages/logix-cli/src/internal/commands/trial.ts`

**Checkpoint**: User Story 1 routes common startup dependency repair without parsing prose.

## Phase 4: User Story 2 - Repair Static Declaration Pressure (Priority: P1)

**Goal**: Static check failures for declaration, imports, blueprint and source freshness identify the declaration owner slice without runtime boot.

**Independent Test**: Run static pressure fixtures and assert repair hints join to findings and source artifacts.

### Tests for User Story 2

- [x] T019 [P] [US2] Add duplicate import and invalid import repair hint tests in `packages/logix-core/test/Contracts/RuntimeCheck.contract.test.ts`
- [x] T020 [P] [US2] Add stale source and declaration digest artifact backlink tests in `packages/logix-core/test/Contracts/RuntimeCheck.contract.test.ts`
- [x] T021 [P] [US2] Add CLI check repair projection assertions in `packages/logix-cli/test/Integration/check.command.test.ts`

### Implementation for User Story 2

- [x] T022 [US2] Materialize declaration owner coordinates in `packages/logix-core/src/internal/verification/`
- [x] T023 [US2] Link source freshness repairs to source artifact refs in `packages/logix-core/src/internal/verification/`
- [x] T024 [US2] Preserve static repair hint artifacts through `packages/logix-cli/src/internal/commands/check.ts`

**Checkpoint**: User Story 2 keeps static repairs cheap, structured and artifact-linked.

## Phase 5: User Story 3 - Preserve Canonical Artifact Backlinks (Priority: P2)

**Goal**: Canonical evidence and selection material that contributes to repair remains linked through report artifacts, while live output remains outside repair authority.

**Independent Test**: Run canonical evidence and selection handoff fixtures and inspect `relatedArtifactOutputKeys`; separately guard live forbidden fields.

### Tests for User Story 3

- [x] T025 [P] [US3] Add canonical evidence repair backlink assertions in `packages/logix-cli/test/Integration/evidence-selection-roundtrip.contract.test.ts`
- [x] T026 [P] [US3] Add selection hint-only backlink assertions in `packages/logix-cli/test/Integration/evidence-selection-input.contract.test.ts`
- [x] T027 [P] [US3] Add compare inconclusive repair hint assertions in `packages/logix-core/test/Contracts/VerificationControlPlaneCompare.contract.test.ts`
- [x] T028 [P] [US3] Add live forbidden repair-field assertions in `packages/logix-cli/test/Integration/live-command-result.contract.test.ts`

### Implementation for User Story 3

- [x] T029 [US3] Preserve evidence input artifact refs through verification report materialization in `packages/logix-core/src/internal/verification/`
- [x] T030 [US3] Preserve selection as hint-only provenance in `packages/logix-cli/src/internal/commands/trial.ts` and `packages/logix-cli/src/internal/commands/compare.ts`
- [x] T031 [US3] Ensure compare repair states distinguish closed, regression, mismatch and inconclusive in `packages/logix-core/src/internal/verification/`
- [x] T032 [US3] Keep live output free of repair hints, verdicts and scheduling in `packages/logix-cli/src/internal/liveResult.ts` and `packages/logix-cli/src/internal/commands/live.ts`

**Checkpoint**: User Story 3 proves evidence can support repair only through verification report artifacts.

## Phase 6: Polish, Verification And Writeback

**Purpose**: Make implementation authoritative, validated and discoverable.

- [x] T033 [P] Update `docs/ssot/runtime/09-verification-control-plane.md` only for final repair hint, focus ref or scheduling law deltas
- [x] T034 [P] Update `docs/ssot/runtime/15-cli-agent-first-control-plane.md` only for final CLI report consumption or live forbidden-field deltas
- [x] T035 [P] Update `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md` only for final live boundary deltas
- [x] T036 [P] Update `skills/logix-cli/SKILL.md` only if Agent repair consumption recipe changed
- [x] T037 Update 185 quickstart and final status notes in `specs/185-repair-intent-contract/quickstart.md`, `specs/185-repair-intent-contract/spec.md` and `specs/README.md`
- [x] T038 Run core report and dependency verification listed in `specs/185-repair-intent-contract/quickstart.md`
- [x] T039 Run CLI repair closure and live boundary verification listed in `specs/185-repair-intent-contract/quickstart.md`
- [x] T040 Run final text sweeps listed in `specs/185-repair-intent-contract/quickstart.md`
- [x] T041 Run `rtk pnpm check:effect-v4-matrix`, `rtk pnpm typecheck` and `rtk pnpm lint`

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 has no dependencies.
- Phase 2 depends on Phase 1 and blocks all user stories.
- US1 and US2 are P1 and can proceed after Phase 2.
- US3 depends on Phase 2 and consumes artifact/report behavior from US1 or US2 when available.
- Phase 6 depends on all in-scope user stories being implemented, lane proof facts being stable, and the 186 family closure gate remaining reachable.

### User Story Dependencies

- US1: depends on Phase 2.
- US2: depends on Phase 2.
- US3: depends on Phase 2 and should be rechecked after US1/US2 because it validates artifact joins across report families.

## Parallel Opportunities

```text
T002, T003, T004, T005 and T006 can run together.
T007, T008, T009, T010 and T011 can run together after T001.
T012, T013, T014 and T015 can be written together before US1 implementation.
T019, T020 and T021 can be written together before US2 implementation.
T025, T026, T027 and T028 can be written together before US3 implementation.
T033, T034, T035 and T036 can run together after implementation facts are stable.
```

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1 dependency repair localization.
3. Complete US2 static declaration repair.
4. Run focused core and CLI proof for structured repair consumption.

### Full 185 Closure

1. Complete US3 artifact backlink and live boundary proof.
2. Run all quickstart proof commands and text sweeps.
3. Hand final proof facts to 186 for family SSoT, skill and spec index writebacks.

## Notes

- Do not add automatic patching or a writeback runtime.
- Do not add `RepairReport`, `AgentPolicyReport` or a second taxonomy.
- Do not put `repairHints`, `nextRecommendedStage`, `verdict` or `primaryReportOutputKey` in live command output.
- Do not make prose fields mandatory for machine repair routing.
- Do not include `trial --mode scenario`.
