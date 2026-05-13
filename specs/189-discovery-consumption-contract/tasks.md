# Tasks: Discovery And Consumption Contract

**Input**: Design documents from `specs/189-discovery-consumption-contract/`
**Prerequisites**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

**Tests**: Required. 189 touches package schema, skill mirror, docs recipes, command guards, result consumption recipes and archived vocabulary sweeps.

**Organization**: Tasks are grouped by user story. Stable command/report/live law stays in [spec.md](./spec.md), `15`, `09` and `18`; this file defines execution order, proof obligations and writeback points.

## Phase 1: Setup And Baseline

**Purpose**: Establish current schema/docs/skill alignment and prevent executable discovery or archived-route drift.

- [x] T001 Review authority in `specs/189-discovery-consumption-contract/spec.md`, `docs/ssot/runtime/15-cli-agent-first-control-plane.md`, `docs/ssot/runtime/09-verification-control-plane.md`, `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md`, `skills/logix-cli/SKILL.md`, `packages/logix-cli/src/schema/commands.v1.json` and `skills/logix-cli/references/commands.v1.json`
- [x] T002 [P] Run current command schema guard baseline for `packages/logix-cli/test/Integration/command-schema.guard.test.ts`
- [x] T003 [P] Run current archived command rejection baseline for `packages/logix-cli/test/Integration/legacy-command-rejection.guard.test.ts` and `packages/logix-cli/test/Integration/archived-command-deletion.guard.test.ts`
- [x] T004 [P] Run current result consumption baseline for `packages/logix-cli/test/Integration/command-result-transport.contract.test.ts`
- [x] T005 [P] Run current live result boundary baseline for `packages/logix-cli/test/Integration/live-command-result.contract.test.ts` and `packages/logix-cli/test/Integration/live-evidence-handoff.e2e.test.ts`
- [x] T006 [P] Compare package schema and skill mirror with `rtk diff -u packages/logix-cli/src/schema/commands.v1.json skills/logix-cli/references/commands.v1.json`
- [x] T007 Classify touched-file size and decomposition risk for `packages/logix-cli/src/internal/commandSchema.ts`, `packages/logix-cli/src/schema/commands.v1.json`, `skills/logix-cli/SKILL.md` and `docs/ssot/runtime/15-cli-agent-first-control-plane.md`

## Phase 2: Foundational Drift Check

**Purpose**: Make schema/mirror/docs drift visible before recipe updates.

- [x] T008 [P] Add or align schema versus skill mirror drift assertions in `packages/logix-cli/test/Integration/command-schema.guard.test.ts`
- [x] T009 [P] Add public root command list assertions in `packages/logix-cli/test/Integration/command-schema.guard.test.ts`
- [x] T010 [P] Add primary output key field assertions for verification and live command families in `packages/logix-cli/test/Integration/command-schema.guard.test.ts`
- [x] T011 [P] Add archived vocabulary absence assertions in `packages/logix-cli/test/Integration/archived-command-deletion.guard.test.ts`
- [x] T012 Preserve schema derived-authority markers in `packages/logix-cli/src/schema/commands.v1.json` and `skills/logix-cli/references/commands.v1.json`

**Checkpoint**: Schema and skill mirror drift fails cheaply without daemon/browser startup.

## Phase 3: User Story 1 - Discover Public Command Grammar (Priority: P1)

**Goal**: Agents discover only `check`, `trial`, `compare` and `live`, and avoid archived routes.

**Independent Test**: Validate package schema and skill mirror against public command expectations and archived-command rejection tests.

### Tests for User Story 1

- [x] T013 [P] [US1] Add command root list assertions in `packages/logix-cli/test/Integration/command-schema.guard.test.ts`
- [x] T014 [P] [US1] Add describe-style discovery rejection assertions in `packages/logix-cli/test/Integration/legacy-command-rejection.guard.test.ts`
- [x] T015 [P] [US1] Add flat live root absence assertions in `packages/logix-cli/test/Integration/archived-command-deletion.guard.test.ts`
- [x] T016 [P] [US1] Add skill mirror command grammar assertions in `packages/logix-cli/test/Integration/command-schema.guard.test.ts`

### Implementation for User Story 1

- [x] T017 [US1] Align package schema command roots and inputs in `packages/logix-cli/src/schema/commands.v1.json`
- [x] T018 [US1] Align skill-local schema mirror in `skills/logix-cli/references/commands.v1.json`
- [x] T019 [US1] Align command discovery guidance in `skills/logix-cli/SKILL.md`
- [x] T020 [US1] Align discovery boundary docs in `docs/ssot/runtime/15-cli-agent-first-control-plane.md`

**Checkpoint**: User Story 1 proves command discovery is static, final and archived-route-free.

## Phase 4: User Story 2 - Consume Verification Result (Priority: P1)

**Goal**: Agents resolve primary verification reports safely for inline, file-backed and error report cases.

**Independent Test**: Run commands with inline and file-backed reports and follow the documented recipe.

### Tests for User Story 2

- [x] T021 [P] [US2] Add primary report lookup assertions in `packages/logix-cli/test/Integration/command-result-transport.contract.test.ts`
- [x] T022 [P] [US2] Add file-over-truncated-inline assertions in `packages/logix-cli/test/Integration/command-result-transport.contract.test.ts`
- [x] T023 [P] [US2] Add non-zero structured result consumption assertions in `packages/logix-cli/test/Integration/command-result-transport.contract.test.ts`
- [x] T024 [P] [US2] Add schema fields for rerun coordinate and primary report output key in `packages/logix-cli/test/Integration/command-schema.guard.test.ts`

### Implementation for User Story 2

- [x] T025 [US2] Align verification result consumption recipe in `skills/logix-cli/SKILL.md`
- [x] T026 [US2] Align report extraction and scheduling guidance in `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
- [x] T027 [US2] Preserve schema mirror fields for `primaryReportOutputKey`, artifacts and rerun coordinate in `packages/logix-cli/src/schema/commands.v1.json` and `skills/logix-cli/references/commands.v1.json`

**Checkpoint**: User Story 2 proves Agents can consume verification output without logs or schema guessing.

## Phase 5: User Story 3 - Consume Live Result As Evidence (Priority: P2)

**Goal**: Agents consume live output as evidence/gap and feed evidence into trial or compare before reading repair hints.

**Independent Test**: Run live status, targets, inspect and export evidence route tests and follow live result recipe.

### Tests for User Story 3

- [x] T028 [P] [US3] Add `primaryLiveOutputKey` consumption assertions in `packages/logix-cli/test/Integration/live-command-result.contract.test.ts`
- [x] T029 [P] [US3] Add live forbidden verification field assertions in `packages/logix-cli/test/Integration/live-command-result.contract.test.ts`
- [x] T030 [P] [US3] Add live evidence handoff recipe assertions in `packages/logix-cli/test/Integration/live-evidence-handoff.e2e.test.ts`
- [x] T031 [P] [US3] Add schema fields for live output key and forbidden report fields in `packages/logix-cli/test/Integration/command-schema.guard.test.ts`

### Implementation for User Story 3

- [x] T032 [US3] Align live result consumption recipe in `skills/logix-cli/SKILL.md`
- [x] T033 [US3] Align live evidence boundary docs in `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
- [x] T034 [US3] Preserve live output key and forbidden-field mirror entries in `packages/logix-cli/src/schema/commands.v1.json` and `skills/logix-cli/references/commands.v1.json`

**Checkpoint**: User Story 3 proves live consumption cannot become verification report consumption.

## Phase 6: Polish, Verification And Writeback

**Purpose**: Make implementation authoritative, validated and discoverable.

- [x] T035 [P] Update `docs/ssot/runtime/09-verification-control-plane.md` only if verification report consumption law changed
- [x] T036 [P] Update `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md` only if live consumption or evidence boundary changed
- [x] T037 [P] Update `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md` only if terminal proof refs changed
- [x] T038 Update 189 quickstart and final status notes in `specs/189-discovery-consumption-contract/quickstart.md`, `specs/189-discovery-consumption-contract/spec.md` and `specs/README.md`
- [x] T039 Run schema and archived command guards listed in `specs/189-discovery-consumption-contract/quickstart.md`
- [x] T040 Run result consumption and live boundary proof listed in `specs/189-discovery-consumption-contract/quickstart.md`
- [x] T041 Run schema mirror diff listed in `specs/189-discovery-consumption-contract/quickstart.md`
- [x] T042 Run final text sweeps listed in `specs/189-discovery-consumption-contract/quickstart.md`
- [x] T043 Run `rtk pnpm check:effect-v4-matrix`, `rtk pnpm typecheck` and `rtk pnpm lint`

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 has no dependencies.
- Phase 2 depends on Phase 1 and blocks all user stories.
- US1 and US2 are P1 and can proceed after Phase 2.
- US3 is P2 and can proceed after Phase 2, but should be rechecked after US1 if schema root or mirror structure changes.
- Phase 6 depends on selected user stories being implemented and proof facts being stable.

### User Story Dependencies

- US1: depends on Phase 2.
- US2: depends on Phase 2 and consumes verification envelope fields from the schema.
- US3: depends on Phase 2 and consumes live envelope fields from the schema.

## Parallel Opportunities

```text
T002, T003, T004, T005, T006 and T007 can run together.
T008, T009, T010 and T011 can run together before T012.
T013, T014, T015 and T016 can be written together before US1 implementation.
T021, T022, T023 and T024 can be written together before US2 implementation.
T028, T029, T030 and T031 can be written together before US3 implementation.
T035, T036 and T037 can run together after implementation facts are stable.
```

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1 command discovery and archived-route guards.
3. Complete US2 verification result consumption recipe.
4. Run schema/mirror/transport proof.

### Full 189 Closure

1. Complete US3 live consumption recipe.
2. Run all quickstart proof commands, schema diff and text sweeps.
3. Complete docs, skill and spec index writebacks.

## Notes

- Do not add `logix describe` or `--describe-json`.
- Do not parse CLI help text as a machine contract.
- Do not own runtime report or live artifact payload truth in the schema.
- Do not revive archived commands or old toolbox vocabulary.
- Do not include `trial --mode scenario`.
