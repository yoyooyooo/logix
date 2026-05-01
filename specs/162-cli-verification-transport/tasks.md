# Tasks: CLI Verification Transport

**Input**: Design documents from `/specs/162-cli-verification-transport/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/README.md](./contracts/README.md), [quickstart.md](./quickstart.md)

**Current Planning Status**: This file is the implementation task list for `162`. The existing [checklists/requirements.md](./checklists/requirements.md) is only a specification quality checklist. It cannot be used as implementation completion evidence.

**Tests**: Required. `162` changes CLI transport, control-plane routing, artifact refs, exact rerun coordinates and evidence roundtrip. Every user story below starts with failing tests.

**Organization**: Tasks are grouped by user story so each story can close independently, then all story proof refs are written back to the owner pages.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other tasks after its phase prerequisites are done.
- **[Story]**: Required only inside user-story phases.
- Every task names the exact file path that must be edited, created, or verified.

## Phase 1: Setup

**Purpose**: Reopen `162` as an implementation-ready spec and prevent checklist/status confusion.

- [x] T001 Update `specs/162-cli-verification-transport/spec.md` status to `Active` when implementation starts.
- [x] T002 [P] Add a planning note in `specs/162-cli-verification-transport/spec.md` that `checklists/requirements.md` is not implementation evidence.
- [x] T003 [P] Keep `specs/162-cli-verification-transport/quickstart.md` aligned with this `tasks.md` execution order.
- [x] T004 [P] Ensure `specs/162-cli-verification-transport/checklists/implementation-closure.md` exists and lists all implementation-only close gates.

---

## Phase 2: Foundational

**Purpose**: Shared test harness, source-artifact boundary and transport helpers that block multiple user stories.

- [x] T005 [P] Add CommandResult test helpers in `packages/logix-cli/test/support/commandResult.ts`.
- [x] T006 [P] Add report fixture builders in `packages/logix-cli/test/support/controlPlaneReport.ts`.
- [x] T007 [P] Add source artifact boundary tests in `packages/logix-cli/test/Integration/source-artifact-boundary.contract.test.ts`.
- [x] T008 Implement source provenance artifact production in `packages/logix-cli/src/internal/sourceArtifact.ts`.
- [x] T009 Wire source provenance artifacts into `packages/logix-cli/src/internal/commands/check.ts`.
- [x] T010 Wire source provenance artifacts into `packages/logix-cli/src/internal/commands/trial.ts`.
- [x] T011 Assert source artifacts do not own declaration truth in `packages/logix-cli/test/Integration/source-artifact-boundary.contract.test.ts`.
- [x] T012 [P] Extend schema guard expectations in `packages/logix-cli/test/Integration/command-schema.guard.test.ts`.
- [x] T013 Update static schema mirror in `packages/logix-cli/src/internal/commandSchema.ts`.
- [x] T014 Regenerate or synchronize `packages/logix-cli/src/schema/commands.v1.json` with `packages/logix-cli/src/internal/commandSchema.ts`.

**Checkpoint**: CLI can produce source provenance without changing core report authority, and schema guard still exposes only `check / trial / compare`.

---

## Phase 3: User Story 1 - Exact Rerun Coordinate (Priority: P1)

**Goal**: Agent can reconstruct the same `check` or startup `trial` input from `CommandResult.inputCoordinate`, and can upgrade to the recommended stage without inventing arguments.

**Traceability**: NS-8, NS-10, KF-8

**Independent Test**: Run `logix check` and `logix trial --mode startup`, rebuild commands from `inputCoordinate`, rerun them, and compare normalized machine fields while ignoring only allowed runId/path/outDir differences.

### Tests for User Story 1

- [x] T015 [P] [US1] Add check exact rerun test in `packages/logix-cli/test/Integration/exact-rerun-coordinate.contract.test.ts`.
- [x] T016 [P] [US1] Add startup trial exact rerun test in `packages/logix-cli/test/Integration/exact-rerun-coordinate.contract.test.ts`.
- [x] T017 [P] [US1] Add stage upgrade coordinate test in `packages/logix-cli/test/Integration/exact-rerun-coordinate.contract.test.ts`.
- [x] T018 [P] [US1] Add large or sensitive input ref/digest test in `packages/logix-cli/test/Integration/exact-rerun-coordinate.contract.test.ts`.

### Implementation for User Story 1

- [x] T019 [US1] Add `argvSnapshot` and inherited refs to `CommandInputCoordinate` in `packages/logix-cli/src/internal/inputCoordinate.ts`.
- [x] T020 [US1] Capture normalized argv after config prefix and parser normalization in `packages/logix-cli/src/internal/entry.ts`.
- [x] T021 [US1] Thread normalized argv snapshot into parsed invocations in `packages/logix-cli/src/internal/args.ts`.
- [x] T022 [US1] Include exact rerun coordinate for `check` in `packages/logix-cli/src/internal/commands/check.ts`.
- [x] T023 [US1] Include exact rerun coordinate for startup `trial` in `packages/logix-cli/src/internal/commands/trial.ts`.
- [x] T024 [US1] Include compare refs and inherited evidence refs in `packages/logix-cli/src/internal/commands/compare.ts`.
- [x] T025 [US1] Add normalized CommandResult comparison helper in `packages/logix-cli/test/support/commandResult.ts`.

**Checkpoint**: `GAP-EXACT-RERUN` has proof for same-stage rerun and stage upgrade.

---

## Phase 4: User Story 2 - Stdout Budget And Artifact Transport (Priority: P1)

**Goal**: Agent consumes deterministic `CommandResult` from stdout and can reach full reports through artifact refs when inline output exceeds budget.

**Traceability**: NS-4, NS-8, NS-10, KF-4, KF-8

**Independent Test**: Exercise small report, large report, truncated inline report, file fallback, error report and artifact ordering without parsing human logs.

### Tests for User Story 2

- [x] T026 [P] [US2] Add small report stdout envelope test in `packages/logix-cli/test/Integration/command-result-transport.contract.test.ts`.
- [x] T027 [P] [US2] Add truncation metadata test in `packages/logix-cli/test/Integration/output-budget.contract.test.ts`.
- [x] T028 [P] [US2] Add file fallback test for implicit outDir in `packages/logix-cli/test/Integration/output-budget.contract.test.ts`.
- [x] T029 [P] [US2] Add error report transport gate test in `packages/logix-cli/test/Integration/transport-gate-error.contract.test.ts`.
- [x] T030 [P] [US2] Add deterministic artifact ordering test in `packages/logix-cli/test/Integration/command-result-transport.contract.test.ts`.

### Implementation for User Story 2

- [x] T031 [US2] Enforce deterministic artifact sorting before stdout in `packages/logix-cli/src/internal/entry.ts`.
- [x] T032 [US2] Ensure oversized inline artifacts always include `truncated`, `budgetBytes`, `actualBytes` and `digest` in `packages/logix-cli/src/internal/artifacts.ts`.
- [x] T033 [US2] Ensure budget overflow without explicit `--out` writes file fallback under `.logix/out/<command>/<runId>` in `packages/logix-cli/src/internal/artifacts.ts`.
- [x] T034 [US2] Ensure `makeErrorCommandResult` represents usage/input failures as transport gate failures with no `nextRecommendedStage` in `packages/logix-cli/src/internal/result.ts`.
- [x] T035 [US2] Update output serialization tests so stdout remains a single JSON `CommandResult` in `packages/logix-cli/test/Integration/output-contract.test.ts`.

**Checkpoint**: `GAP-STDOUT-BUDGET`, transport gate failure proof and artifact ordering proof are runnable.

---

## Phase 5: User Story 3 - DVTools Evidence And Selection Roundtrip (Priority: P2)

**Goal**: Agent can pass DVTools canonical evidence package and selection manifest into CLI, then locate report focus, artifact output key, and repair target from CLI output.

**Traceability**: NS-4, NS-8, KF-4, KF-9

**Independent Test**: Use selected session/finding fixtures to run `check` and `trial`, verify selection remains hint-only, artifact keys share `artifacts[].outputKey`, and report focus/artifact links guide repair.

### Tests for User Story 3

- [x] T036 [P] [US3] Add DVTools evidence package fixture in `packages/logix-cli/test/fixtures/dvtools-roundtrip/evidence-package/manifest.json`.
- [x] T037 [P] [US3] Add DVTools selection manifest fixture in `packages/logix-cli/test/fixtures/dvtools-roundtrip/selection-manifest.json`.
- [x] T038 [P] [US3] Add CLI import roundtrip test in `packages/logix-cli/test/Integration/evidence-selection-roundtrip.contract.test.ts`.
- [x] T039 [P] [US3] Add selection artifact key namespace rejection test in `packages/logix-cli/test/Integration/evidence-selection-roundtrip.contract.test.ts`.
- [x] T040 [P] [US3] Add report focus or artifact repair target assertion in `packages/logix-cli/test/Integration/evidence-selection-roundtrip.contract.test.ts`.

### Implementation for User Story 3

- [x] T041 [US3] Persist canonical evidence package refs into `CommandResult.inputCoordinate` in `packages/logix-cli/src/internal/inputCoordinate.ts`.
- [x] T042 [US3] Emit evidence and selection transport artifacts without creating CLI-owned evidence truth in `packages/logix-cli/src/internal/evidenceInput.ts`.
- [x] T043 [US3] Link evidence and selection artifacts from `check` output in `packages/logix-cli/src/internal/commands/check.ts`.
- [x] T044 [US3] Link evidence and selection artifacts from startup `trial` output in `packages/logix-cli/src/internal/commands/trial.ts`.
- [x] T045 [US3] Preserve `focusRef` only as hint or repair locator in `packages/logix-cli/src/internal/evidenceInput.ts`.

**Checkpoint**: `GAP-DVTOOLS-ROUNDTRIP` and the selection side of `GAP-ARTIFACT-LINKING` have proof refs.

---

## Phase 6: User Story 4 - Before/After Compare Closure (Priority: P2)

**Goal**: Agent can run before report, apply repair, rerun exact coordinate, produce after report, and route before/after refs to `logix compare` for a schedulable result.

**Traceability**: NS-3, NS-8, NS-10, KF-3, KF-8

**Independent Test**: Build one proof pack each for Program assembly, source/declaration, and dependency failure families.

### Tests for User Story 4

- [x] T046 [P] [US4] Add Program assembly closure proof test in `packages/logix-cli/test/Integration/repair-closure.program-assembly.e2e.test.ts`.
- [x] T047 [P] [US4] Add source/declaration closure proof test in `packages/logix-cli/test/Integration/repair-closure.source-declaration.e2e.test.ts`.
- [x] T048 [P] [US4] Add dependency closure proof test in `packages/logix-cli/test/Integration/repair-closure.dependency.e2e.test.ts`.
- [x] T049 [P] [US4] Add compare missing report input gate test in `packages/logix-cli/test/Integration/compare.command.test.ts`.

### Implementation for User Story 4

- [x] T050 [US4] Add closure proof helpers in `packages/logix-cli/test/support/closureProofPack.ts`.
- [x] T051 [US4] Ensure `logix compare` reads before/after report refs and delegates only to core compare in `packages/logix-cli/src/internal/commands/compare.ts`.
- [x] T052 [US4] Ensure compare input failures stop at transport gate in `packages/logix-cli/src/internal/commands/compare.ts`.
- [x] T053 [US4] Ensure before/after report artifact refs remain reachable from compare output in `packages/logix-cli/src/internal/commands/compare.ts`.
- [x] T054 [US4] Normalize closure proof outputs for stable comparison in `packages/logix-cli/test/support/closureProofPack.ts`.

**Checkpoint**: `GAP-LOOP-CLOSURE` has CLI-side proof packs for all three required failure families.

---

## Phase 7: Polish & Cross-Cutting Verification

**Purpose**: Validate local package health and prevent public surface drift.

- [x] T055 [P] Run `pnpm -C packages/logix-cli exec vitest run test/Integration/command-schema.guard.test.ts test/Integration/command-result-transport.contract.test.ts test/Integration/output-contract.test.ts test/Integration/output-budget.contract.test.ts test/Integration/exact-rerun-coordinate.contract.test.ts`.
- [x] T056 [P] Run `pnpm -C packages/logix-cli exec vitest run test/Integration/evidence-selection-input.contract.test.ts test/Integration/evidence-selection-roundtrip.contract.test.ts test/Integration/source-artifact-boundary.contract.test.ts`.
- [x] T057 [P] Run `pnpm -C packages/logix-cli exec vitest run test/Integration/compare.command.test.ts test/Integration/repair-closure.program-assembly.e2e.test.ts test/Integration/repair-closure.source-declaration.e2e.test.ts test/Integration/repair-closure.dependency.e2e.test.ts`.
- [x] T058 Run `pnpm -C packages/logix-cli exec tsc -p tsconfig.json --noEmit`.
- [x] T059 Run `pnpm -C packages/logix-cli exec tsc -p tsconfig.test.json --noEmit`.
- [x] T060 Run a text sweep for old toolbox commands in `packages/logix-cli/src`, `packages/logix-cli/test`, `docs/ssot/runtime/15-cli-agent-first-control-plane.md`, and `specs/162-cli-verification-transport`.

---

## Phase 8: Result Writeback

**Purpose**: Make stable implementation results authoritative after all witness tests pass.

- [x] T061 Update proof refs and row statuses in `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md`.
- [x] T062 Update CLI transport adoption text in `docs/ssot/runtime/15-cli-agent-first-control-plane.md`.
- [x] T063 Update DVTools roundtrip text in `docs/ssot/runtime/14-dvtools-internal-workbench.md`.
- [x] T064 Update `specs/162-cli-verification-transport/spec.md` status to `Done` only after all witness tests and writeback tasks pass.
- [x] T065 Mark all completed tasks in `specs/162-cli-verification-transport/tasks.md`.
- [x] T066 Mark implementation close gates in `specs/162-cli-verification-transport/checklists/implementation-closure.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Phase 1.
- **US1 (Phase 3)**: Depends on Phase 2.
- **US2 (Phase 4)**: Depends on Phase 2. Can run in parallel with US1 after shared helpers exist.
- **US3 (Phase 5)**: Depends on Phase 2. Can run after evidence helpers exist.
- **US4 (Phase 6)**: Depends on US1 and US2, because closure packs require exact rerun and stable report artifacts.
- **Polish (Phase 7)**: Depends on selected user stories.
- **Writeback (Phase 8)**: Depends on Phase 7 passing.

### User Story Dependencies

- **US1 Exact Rerun**: MVP and blocker for closure.
- **US2 Stdout Budget**: MVP and blocker for closure.
- **US3 DVTools Roundtrip**: Independent after foundational evidence parsing.
- **US4 Compare Closure**: Requires US1 and US2.

## Parallel Execution Examples

```text
After Phase 2:
  Agent A: T015-T025 exact rerun coordinate
  Agent B: T026-T035 stdout budget and transport
  Agent C: T036-T045 DVTools evidence roundtrip
```

```text
After US1 and US2:
  Agent A: T046 + T050 Program assembly closure
  Agent B: T047 + T054 source/declaration closure
  Agent C: T048 + T051-T053 dependency closure and compare routing
```

## Implementation Strategy

1. Close MVP with US1 and US2 first. This gives Agent stable rerun coordinates and deterministic stdout artifacts.
2. Add US3 to connect DVTools selection to CLI repair coordinates.
3. Add US4 proof packs after exact rerun and artifact transport are stable.
4. Only after all witness tests pass, write results back to `docs/ssot/runtime/15`, `14`, and `16`.
