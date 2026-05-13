# Tasks: Entry And Declaration Authority Closure

**Input**: Design documents from `specs/184-entry-declaration-authority/`
**Prerequisites**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

**Tests**: Required. 184 touches CLI entry authority, runtime static declaration pressure, command result transport, archived route guards and Agent rerun stability.

**Organization**: Tasks are grouped by user story. Stable owner law stays in [spec.md](./spec.md), `09`, `15` and `16`; this file defines execution order and lane-local proof commands.

**Family order**: 184 is Wave 1 of the `184 -> 185 -> 186` terminal offline Agent self-verification family. Baselines may run in parallel across the family, but closure must remain ordered: 184 entry/declaration authority, then 185 repair intent join law, then 186 loop orchestration and family writeback.

## Phase 1: Setup And Baseline

**Purpose**: Establish current behavior and prevent scenario/host/debug scope drift.

- [x] T001 Review authority in `specs/184-entry-declaration-authority/spec.md`, `docs/ssot/runtime/09-verification-control-plane.md`, `docs/ssot/runtime/15-cli-agent-first-control-plane.md`, `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md`, `specs/161-verification-pressure-kernel/spec.md` and `specs/162-cli-verification-transport/spec.md`
- [x] T002 [P] Run current CLI entry baseline for `packages/logix-cli/test/Integration/program-entry.contract.test.ts`
- [x] T003 [P] Run current CLI command transport baseline for `packages/logix-cli/test/Integration/check.command.test.ts`, `packages/logix-cli/test/Integration/trial.command.test.ts`, `packages/logix-cli/test/Integration/compare.command.test.ts` and `packages/logix-cli/test/Integration/command-result-transport.contract.test.ts`
- [x] T004 [P] Run current core static check baseline for `packages/logix-core/test/Contracts/RuntimeCheck.contract.test.ts` and `packages/logix-core/test/Contracts/ProgramImports.program-entry.test.ts`
- [x] T005 [P] Run archived route guard baseline for `packages/logix-cli/test/Integration/legacy-command-rejection.guard.test.ts`, `packages/logix-cli/test/Integration/archived-command-deletion.guard.test.ts` and `packages/logix-cli/test/Integration/command-schema.guard.test.ts`
- [x] T006 Classify touched-file size and decomposition risk for `packages/logix-cli/src/internal/entry.ts`, `packages/logix-cli/src/internal/commands/`, `packages/logix-core/src/internal/verification/` and `packages/logix-core/src/internal/observability/`

## Phase 2: Foundational Entry And Report Gates

**Purpose**: Align shared entry failure and artifact result behavior before user-story-specific proof.

- [x] T007 [P] Add or align entry failure machine report helpers in `packages/logix-cli/src/internal/entry.ts`
- [x] T008 [P] Add `162` transport-gate result envelope proof for import/export/entry failure in `packages/logix-cli/test/Integration/program-entry.contract.test.ts`
- [x] T009 [P] Add next-stage null guard for entry failures in `packages/logix-cli/test/Integration/command-result-transport.contract.test.ts`
- [x] T010 [P] Add fake Program and missing blueprint admissibility fixtures in `packages/logix-cli/test/Integration/program-entry.contract.test.ts`
- [x] T011 Align command schema entry docs only if final accepted inputs changed in `packages/logix-cli/src/schema/commands.v1.json`

**Checkpoint**: Entry failures have a standard machine envelope and cannot masquerade as runtime stage output.

## Phase 3: User Story 1 - Reject Bad Entry Deterministically (Priority: P1)

**Goal**: Module, Logic, fake Program, missing export, import failure and missing blueprint inputs produce deterministic structured entry failures.

**Independent Test**: Run CLI verification against bad-entry fixtures and inspect only machine result, primary report artifact and input coordinate.

### Tests for User Story 1

- [x] T012 [P] [US1] Add Module and Logic rejection assertions in `packages/logix-cli/test/Integration/program-entry.contract.test.ts`
- [x] T013 [P] [US1] Add missing export and import failure assertions in `packages/logix-cli/test/Integration/program-entry.contract.test.ts`
- [x] T014 [P] [US1] Add fake Program and missing blueprint assertions in `packages/logix-cli/test/Integration/program-entry.contract.test.ts`
- [x] T015 [P] [US1] Add repeatability assertions for entry failures in `packages/logix-cli/test/Integration/command-result-transport.contract.test.ts`

### Implementation for User Story 1

- [x] T016 [US1] Enforce Program-only admissibility and structured rejection in `packages/logix-cli/src/internal/entry.ts`
- [x] T017 [US1] Preserve input coordinate and primary artifact refs for entry failures through `packages/logix-cli/src/internal/commands/check.ts` and `packages/logix-cli/src/internal/commands/trial.ts`
- [x] T018 [US1] Ensure entry failure scheduling stays null in `packages/logix-cli/src/internal/commands/check.ts`, `packages/logix-cli/src/internal/commands/trial.ts` and `packages/logix-cli/src/internal/liveResult.ts`

**Checkpoint**: User Story 1 closes bad-entry determinism without runtime boot or human log parsing.

## Phase 4: User Story 2 - Check Declaration Without Booting (Priority: P1)

**Goal**: `Runtime.check` reports static declaration pressure while excluding startup-only dependency, readiness, boot and close failures.

**Independent Test**: Run blueprint, imports, duplicate imports, source freshness and declaration digest fixtures; prove startup-only missing service/config/readiness failures are not check findings.

### Tests for User Story 2

- [x] T019 [P] [US2] Add missing blueprint, invalid import and duplicate import static pressure tests in `packages/logix-core/test/Contracts/RuntimeCheck.contract.test.ts`
- [x] T020 [P] [US2] Add source freshness and declaration digest pressure tests in `packages/logix-core/test/Contracts/RuntimeCheck.contract.test.ts`
- [x] T021 [P] [US2] Add no-boot/no-startup-dependency guard tests in `packages/logix-core/test/Contracts/RuntimeCheck.contract.test.ts`
- [x] T022 [P] [US2] Add CLI check projection assertions for declaration pressure in `packages/logix-cli/test/Integration/check.command.test.ts`

### Implementation for User Story 2

- [x] T023 [US2] Materialize static declaration findings in `packages/logix-core/src/internal/verification/` and `packages/logix-core/src/Runtime.ts`
- [x] T024 [US2] Preserve owner coordinates and source artifact refs in `packages/logix-core/src/internal/observability/trialRunReportPipeline.ts`
- [x] T025 [US2] Ensure CLI check command preserves declaration finding artifacts in `packages/logix-cli/src/internal/commands/check.ts`

**Checkpoint**: User Story 2 proves static pressure remains cheap and stage-correct.

## Phase 5: User Story 3 - Preserve Entry Coordinates For Repair (Priority: P2)

**Goal**: Agents can preserve and rerun the same entry coordinate after repairing entry or declaration issues.

**Independent Test**: Run failure and repaired-entry fixtures and compare normalized input coordinate, artifact key set and entry refs.

### Tests for User Story 3

- [x] T026 [P] [US3] Add repaired-entry rerun assertions in `packages/logix-cli/test/Integration/program-entry.contract.test.ts`
- [x] T027 [P] [US3] Add optional compare-entry gate assertions in `packages/logix-cli/test/Integration/compare.command.test.ts`
- [x] T028 [P] [US3] Add normalized coordinate stability assertions in `packages/logix-cli/test/Integration/command-result-transport.contract.test.ts`

### Implementation for User Story 3

- [x] T029 [US3] Preserve exact entry coordinate through failure and repaired runtime-stage result in `packages/logix-cli/src/internal/entry.ts`
- [x] T030 [US3] Apply the same Program gate to optional `compare --entry` handling in `packages/logix-cli/src/internal/commands/compare.ts`
- [x] T031 [US3] Preserve artifact key stability for entry refs in `packages/logix-cli/src/internal/commands/check.ts`, `packages/logix-cli/src/internal/commands/trial.ts` and `packages/logix-cli/src/internal/commands/compare.ts`

**Checkpoint**: User Story 3 proves repair rerun stability over the same entry coordinate.

## Phase 6: Polish, Verification And Writeback

**Purpose**: Make implementation authoritative, validated and discoverable.

- [x] T032 [P] Update `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md` so `TP-ENTRY-01` and the derived index reflect final proof refs
- [x] T033 [P] Update `docs/ssot/runtime/15-cli-agent-first-control-plane.md` only for final CLI entry/schema deltas
- [x] T034 [P] Update `docs/ssot/runtime/09-verification-control-plane.md` only for final declaration pressure or scheduling deltas
- [x] T035 [P] Update `skills/logix-cli/SKILL.md` and `skills/logix-cli/references/commands.v1.json` only if Agent entry guidance or schema mirror changed
- [x] T036 Update 184 quickstart and final status notes in `specs/184-entry-declaration-authority/quickstart.md`, `specs/184-entry-declaration-authority/spec.md` and `specs/README.md`
- [x] T037 Run CLI entry and transport verification listed in `specs/184-entry-declaration-authority/quickstart.md`
- [x] T038 Run core declaration pressure verification listed in `specs/184-entry-declaration-authority/quickstart.md`
- [x] T039 Run final text sweeps listed in `specs/184-entry-declaration-authority/quickstart.md`
- [x] T040 Run `rtk pnpm check:effect-v4-matrix`, `rtk pnpm typecheck` and `rtk pnpm lint`

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 has no dependencies.
- Phase 2 depends on Phase 1 and blocks all user stories.
- US1 and US2 are P1 and can proceed after Phase 2.
- US3 depends on the entry coordinate and artifact behavior stabilized by US1 and US2.
- Phase 6 depends on all in-scope user stories being implemented, lane proof facts being stable, and the 186 family closure gate remaining reachable.

### User Story Dependencies

- US1: depends on Phase 2.
- US2: depends on Phase 2.
- US3: depends on US1 and consumes US2 declaration artifact behavior for repaired-entry proof.

## Parallel Opportunities

```text
T002, T003, T004, T005 and T006 can run together.
T007, T008, T009, T010 and T011 can run together after T001.
T012, T013, T014 and T015 can be written together before US1 implementation.
T019, T020, T021 and T022 can be written together before US2 implementation.
T026, T027 and T028 can be written together before US3 implementation.
T032, T033, T034 and T035 can run together after implementation facts are stable.
```

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1 bad-entry deterministic rejection.
3. Complete US2 static declaration pressure and no-boot proof.
4. Run focused CLI/core verification and update `TP-ENTRY-01`.

### Full 184 Closure

1. Complete US3 rerun and compare-entry preservation.
2. Run all quickstart proof commands and text sweeps.
3. Hand final proof facts to 186 for family SSoT, skill and spec index writebacks.

## Notes

- Do not include `trial --mode scenario`.
- Do not preserve old Module/Logic entry fallback.
- Do not add `logix describe` or old toolbox routes.
- Do not expose raw source, AST, blueprint internals or runtime handles in machine output.
- Do not use natural-language report text as the repair or rerun contract.
