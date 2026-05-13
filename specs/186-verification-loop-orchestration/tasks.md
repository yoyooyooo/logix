# Tasks: Verification Loop Orchestration Contract

**Input**: Design documents from `specs/186-verification-loop-orchestration/`
**Prerequisites**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

**Tests**: Required. 186 touches command result transport, exact rerun coordinates, output budgets, stage scheduling, compare closure and Agent loop guidance.

**Organization**: Tasks are grouped by user story. Stable stage and report law stays in [spec.md](./spec.md), `09`, `15` and `16`; this file defines execution order, family closure proof commands and final writeback.

**Family order**: 186 is Wave 3 of the `184 -> 185 -> 186` terminal offline Agent self-verification family, including the final family closure gate inside 186. Baselines may run in parallel across the family, but 186 closure must consume stable 184 entry/declaration facts and stable 185 repair intent facts.

## Phase 1: Setup And Baseline

**Purpose**: Establish current loop behavior and prevent scenario/live/debug scope drift.

- [x] T001 Review authority in `specs/186-verification-loop-orchestration/spec.md`, `docs/ssot/runtime/09-verification-control-plane.md`, `docs/ssot/runtime/15-cli-agent-first-control-plane.md`, `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md`, `specs/184-entry-declaration-authority/spec.md` and `specs/185-repair-intent-contract/spec.md`
- [x] T001A Confirm 184 and 185 have no `discussion.md` with `Must Close Before Implementation` items and no unresolved lane blocker before family closure
- [x] T002 [P] Run current exact rerun baseline for `packages/logix-cli/test/Integration/exact-rerun-coordinate.contract.test.ts`
- [x] T003 [P] Run current command transport baseline for `packages/logix-cli/test/Integration/command-result-transport.contract.test.ts`
- [x] T004 [P] Run current check/trial/compare command baseline for `packages/logix-cli/test/Integration/check.command.test.ts`, `packages/logix-cli/test/Integration/trial.command.test.ts` and `packages/logix-cli/test/Integration/compare.command.test.ts`
- [x] T005 [P] Run current repair closure baseline for `packages/logix-cli/test/Integration/repair-closure.program-assembly.e2e.test.ts`, `packages/logix-cli/test/Integration/repair-closure.source-declaration.e2e.test.ts` and `packages/logix-cli/test/Integration/repair-closure.dependency.e2e.test.ts`
- [x] T006 [P] Run current core compare baseline for `packages/logix-core/test/Contracts/VerificationControlPlaneCompare.contract.test.ts`
- [x] T007 Classify touched-file size and decomposition risk for `packages/logix-cli/src/internal/commands/`, `packages/logix-cli/src/internal/entry.ts` and `packages/logix-core/src/internal/verification/`

## Phase 2: Foundational Transport And Rerun Contracts

**Purpose**: Stabilize shared result, artifact and rerun mechanics before user-story work.

- [x] T008 [P] Add or align primary report lookup guards in `packages/logix-cli/test/Integration/command-result-transport.contract.test.ts`
- [x] T009 [P] Add output budget and file fallback assertions in `packages/logix-cli/test/Integration/command-result-transport.contract.test.ts`
- [x] T010 [P] Add evidence and selection ref preservation assertions in `packages/logix-cli/test/Integration/exact-rerun-coordinate.contract.test.ts`
- [x] T011 [P] Add non-zero structured output consumption assertions in `packages/logix-cli/test/Integration/command-result-transport.contract.test.ts`
- [x] T012 Align shared command result materialization in `packages/logix-cli/src/internal/commands/check.ts`, `packages/logix-cli/src/internal/commands/trial.ts` and `packages/logix-cli/src/internal/commands/compare.ts`

**Checkpoint**: Agents can recover primary reports and rerun coordinates from every command result shape.

## Phase 3: User Story 1 - Resume From A Failed Check (Priority: P1)

**Goal**: An Agent can repair a static failure, rerun the same check and compare before/after reports.

**Independent Test**: Use source/declaration failure fixtures and compare before/after report refs.

### Tests for User Story 1

- [x] T013 [P] [US1] Add failed-check rerun reconstruction assertions in `packages/logix-cli/test/Integration/exact-rerun-coordinate.contract.test.ts`
- [x] T014 [P] [US1] Add source declaration before/after compare assertions in `packages/logix-cli/test/Integration/repair-closure.source-declaration.e2e.test.ts`
- [x] T015 [P] [US1] Add check artifact recovery assertions for file-backed reports in `packages/logix-cli/test/Integration/check.command.test.ts`

### Implementation for User Story 1

- [x] T016 [US1] Preserve check rerun coordinates in `packages/logix-cli/src/internal/commands/check.ts`
- [x] T017 [US1] Preserve source/declaration report refs for compare in `packages/logix-cli/src/internal/commands/compare.ts`
- [x] T018 [US1] Ensure compare can close or explain non-closure for repaired check reports in `packages/logix-core/src/internal/verification/`

**Checkpoint**: User Story 1 proves the cheapest static repair loop is deterministic.

## Phase 4: User Story 2 - Advance From Check To Startup Trial (Priority: P1)

**Goal**: Passing check recommends startup trial without claiming startup has already passed; passing startup trial marks the default offline gate complete.

**Independent Test**: Run a passing check fixture, inspect `nextRecommendedStage`, then run startup trial with the same entry.

### Tests for User Story 2

- [x] T019 [P] [US2] Add check-pass next-stage and pass-boundary assertions in `packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts`
- [x] T020 [P] [US2] Add CLI check-to-startup advancement assertions in `packages/logix-cli/test/Integration/check.command.test.ts`
- [x] T021 [P] [US2] Add startup-trial default gate completion assertions in `packages/logix-cli/test/Integration/trial.command.test.ts`

### Implementation for User Story 2

- [x] T022 [US2] Materialize check pass boundary and startup recommendation in `packages/logix-core/src/internal/verification/`
- [x] T023 [US2] Preserve check-to-trial scheduling output in `packages/logix-cli/src/internal/commands/check.ts`
- [x] T024 [US2] Preserve startup default gate completion in `packages/logix-cli/src/internal/commands/trial.ts`

**Checkpoint**: User Story 2 proves stage separation with an easy Agent advancement path.

## Phase 5: User Story 3 - Compare Safely Across Evidence Inputs (Priority: P2)

**Goal**: Compare closes same-input repairs and rejects non-comparable evidence/declaration/environment mismatches as inconclusive.

**Independent Test**: Compare same-input and mismatched-input report fixtures with evidence refs.

### Tests for User Story 3

- [x] T025 [P] [US3] Add evidence ref same-input compare closure assertions in `packages/logix-cli/test/Integration/compare.command.test.ts`
- [x] T026 [P] [US3] Add declaration/environment mismatch inconclusive assertions in `packages/logix-core/test/Contracts/VerificationControlPlaneCompare.contract.test.ts`
- [x] T027 [P] [US3] Add dependency before/after compare assertions in `packages/logix-cli/test/Integration/repair-closure.dependency.e2e.test.ts`
- [x] T028 [P] [US3] Add program assembly before/after compare assertions in `packages/logix-cli/test/Integration/repair-closure.program-assembly.e2e.test.ts`

### Implementation for User Story 3

- [x] T029 [US3] Preserve before and after report refs as artifacts in `packages/logix-cli/src/internal/commands/compare.ts`
- [x] T030 [US3] Materialize compare admissibility mismatch as inconclusive in `packages/logix-core/src/internal/verification/`
- [x] T031 [US3] Preserve evidence refs and selection refs without inline payload expansion in `packages/logix-cli/src/internal/commands/compare.ts`

**Checkpoint**: User Story 3 prevents false repair closure across mismatched inputs.

## Phase 6: Polish, Verification And Writeback

**Purpose**: Make implementation authoritative, validated and discoverable.

- [x] T032 [P] Update `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md` only for final loop proof refs
- [x] T033 [P] Update `docs/ssot/runtime/15-cli-agent-first-control-plane.md` only for final command result, artifact recovery or loop recipe deltas
- [x] T034 [P] Update `docs/ssot/runtime/09-verification-control-plane.md` only for final scheduling, pass boundary or compare admissibility deltas
- [x] T035 [P] Update `skills/logix-cli/SKILL.md` only if Agent loop consumption recipe changed
- [x] T036 Update 186 quickstart and final status notes in `specs/186-verification-loop-orchestration/quickstart.md`, `specs/186-verification-loop-orchestration/spec.md` and `specs/README.md`
- [x] T037 Run rerun and transport verification listed in `specs/186-verification-loop-orchestration/quickstart.md`
- [x] T038 Run command stage and repair closure verification listed in `specs/186-verification-loop-orchestration/quickstart.md`
- [x] T039 Run core compare verification listed in `specs/186-verification-loop-orchestration/quickstart.md`
- [x] T040 Run final text sweeps listed in `specs/186-verification-loop-orchestration/quickstart.md`
- [x] T041 Run `rtk pnpm check:effect-v4-matrix`, `rtk pnpm typecheck` and `rtk pnpm lint`

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 has no dependencies.
- Phase 2 depends on Phase 1 and blocks all user stories.
- US1 and US2 are P1 and can proceed after Phase 2.
- US3 depends on Phase 2 and consumes compare/report behavior from US1/US2 when available.
- Phase 6 depends on all in-scope user stories being implemented, 184/185 lane proof facts being stable, and family closure proof facts being stable.

### User Story Dependencies

- US1: depends on Phase 2.
- US2: depends on Phase 2.
- US3: depends on Phase 2 and should be rechecked after US1/US2 because compare closure spans report families.

## Parallel Opportunities

```text
T002, T003, T004, T005, T006 and T007 can run together.
T008, T009, T010 and T011 can run together before T012.
T013, T014 and T015 can be written together before US1 implementation.
T019, T020 and T021 can be written together before US2 implementation.
T025, T026, T027 and T028 can be written together before US3 implementation.
T032, T033, T034 and T035 can run together after implementation facts are stable.
```

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1 failed-check rerun and compare closure.
3. Complete US2 check-to-startup advancement.
4. Run focused CLI/core proof for the default offline loop.

### Full 186 Closure

1. Complete US3 evidence-aware compare admissibility.
2. Run all quickstart proof commands and text sweeps.
3. Complete SSoT, skill and spec index writebacks.

## Notes

- Do not include `trial --mode scenario`.
- Do not add `logix verify --stage`.
- Do not treat live output as report truth.
- Do not rely on human logs.
- Do not inline large evidence or selection payloads into rerun coordinates.
