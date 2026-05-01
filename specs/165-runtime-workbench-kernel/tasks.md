# Tasks: Runtime Workbench Kernel

**Input**: Design documents from `/specs/165-runtime-workbench-kernel/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/README.md](./contracts/README.md), [quickstart.md](./quickstart.md)

**Tests**: Required. This feature creates a shared internal projection kernel, changes DVTools derivation authority, adds CLI and Playground adapters, and must prove no public surface expansion.

**Organization**: Tasks are grouped by dependency. Core projection law lands before host adapters.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel after phase dependencies are satisfied.
- **[Story]**: `[US1]` core projection law, `[US2]` DVTools adapter, `[US3]` CLI adapter, `[US4]` Playground adapter, `[US5]` public surface and docs closure.
- Every task names exact file paths.

## Phase 1: Setup

**Purpose**: Establish target files and failing contracts without changing host behavior.

- [x] T001 Create `packages/logix-core/src/internal/workbench/` with empty `authority.ts`, `projection.ts`, `findings.ts`, `coordinates.ts`, `gaps.ts`, `indexes.ts`, and `index.ts`.
- [x] T002 Create `packages/logix-core/src/internal/workbench-api.ts` as the repo-internal bridge with no root export.
- [x] T003 Add workspace-only `./repo-internal/workbench-api` export and blocked publish export in `packages/logix-core/package.json`.
- [x] T004 [P] Create `packages/logix-core/test/internal/Workbench/Workbench.publicSurface.guard.test.ts` to fail until manifest and root export guards are correct.
- [x] T005 [P] Create `packages/logix-core/test/internal/Workbench/Workbench.authorityBundle.contract.test.ts` with failing tests for truth/context/hint partition.
- [x] T006 [P] Create `packages/logix-core/test/internal/Workbench/Workbench.projectionIndex.contract.test.ts` with failing tests for session-only root and `authorityRef`/`derivedFrom`.
- [x] T007 [P] Create `packages/logix-core/test/internal/Workbench/Workbench.findingAuthority.contract.test.ts` with failing tests for finding classes and repair mirror.
- [x] T008 [P] Create `packages/logix-core/test/internal/Workbench/Workbench.coordinateGaps.contract.test.ts` with failing tests for missing focusRef, artifact key, source digest and runtime coordinate.
- [x] T009 [P] Create `packages/logix-core/test/internal/Workbench/Workbench.shapeSeparation.contract.test.ts` with failing tests for Run result vs `VerificationControlPlaneReport`.

**Checkpoint**: Core workbench tests exist and fail for missing implementation.

## Phase 2: Core Projection Kernel [US1]

**Goal**: Implement pure `AuthorityBundle -> ProjectionIndex` law.

### Tests

- [x] T010 [US1] Run `rtk pnpm -C packages/logix-core exec vitest run test/internal/Workbench/Workbench.authorityBundle.contract.test.ts` and confirm expected failures.
- [x] T011 [US1] Run `rtk pnpm -C packages/logix-core exec vitest run test/internal/Workbench/Workbench.projectionIndex.contract.test.ts` and confirm expected failures.
- [x] T012 [US1] Run `rtk pnpm -C packages/logix-core exec vitest run test/internal/Workbench/Workbench.findingAuthority.contract.test.ts` and confirm expected failures.
- [x] T013 [US1] Run `rtk pnpm -C packages/logix-core exec vitest run test/internal/Workbench/Workbench.coordinateGaps.contract.test.ts` and confirm expected failures.
- [x] T014 [US1] Run `rtk pnpm -C packages/logix-core exec vitest run test/internal/Workbench/Workbench.shapeSeparation.contract.test.ts` and confirm expected failures.

### Implementation

- [x] T015 [US1] Implement `RuntimeWorkbenchAuthorityBundle`, `RuntimeWorkbenchTruthInput`, `RuntimeWorkbenchContextRef`, `RuntimeWorkbenchSelectionHint`, authority refs and input guards in `packages/logix-core/src/internal/workbench/authority.ts`.
- [x] T016 [US1] Implement fixed gap codes and constructors in `packages/logix-core/src/internal/workbench/gaps.ts`.
- [x] T017 [US1] Implement coordinate owner normalization in `packages/logix-core/src/internal/workbench/coordinates.ts`.
- [x] T018 [US1] Implement finding authority lattice and read-only repair mirror in `packages/logix-core/src/internal/workbench/findings.ts`.
- [x] T019 [US1] Implement session-rooted projection helpers and optional lookup indexes in `packages/logix-core/src/internal/workbench/indexes.ts`.
- [x] T020 [US1] Implement `deriveRuntimeWorkbenchProjectionIndex` in `packages/logix-core/src/internal/workbench/projection.ts`.
- [x] T021 [US1] Export only internal kernel symbols from `packages/logix-core/src/internal/workbench/index.ts` and `packages/logix-core/src/internal/workbench-api.ts`.
- [x] T022 [US1] Ensure implementation has no imports from React, Playground, DVTools, CLI, sandbox or browser-only modules.

### Verification

- [x] T023 [US1] Run all core workbench tests from T010 through T014 and make them pass.
- [x] T024 [US1] Run `rtk pnpm -C packages/logix-core typecheck`.

**Checkpoint**: PM-01 through PM-04 pass in core.

## Phase 3: DVTools Adapter [US2]

**Goal**: Collapse DVTools private session/finding/artifact truth into a host adapter over core projection.

### Tests

- [x] T025 [P] [US2] Update `packages/logix-devtools-react/test/internal/workbench-derivation.contract.test.ts` so live and imported inputs compare core projection semantics.
- [x] T026 [P] [US2] Update `packages/logix-devtools-react/test/internal/workbench-gaps.contract.test.ts` to assert gap code set delegates to core workbench gap codes.
- [x] T027 [P] [US2] Update `packages/logix-devtools-react/test/internal/workbench-export.contract.test.ts` to assert selection manifest remains hint-only.
- [x] T028 [P] [US2] Update `packages/logix-devtools-react/test/internal/workbench-state.contract.test.tsx` to assert selected session/finding/artifact is host view state.

### Implementation

- [x] T029 [US2] Refactor `packages/logix-devtools-react/src/internal/state/workbench/model.ts` to remove authority-owned `WorkbenchModel` roots or rename remaining structures as host view state.
- [x] T030 [US2] Refactor `packages/logix-devtools-react/src/internal/state/workbench/normalize.ts` to build `RuntimeWorkbenchAuthorityBundle` truth inputs and context refs.
- [x] T031 [US2] Refactor `packages/logix-devtools-react/src/internal/state/workbench/derive.ts` to call `deriveRuntimeWorkbenchProjectionIndex` and map to UI view state.
- [x] T032 [US2] Keep `packages/logix-devtools-react/src/internal/state/workbench/export.ts` output as canonical evidence package plus hint-only selection manifest.
- [x] T033 [US2] Update `packages/logix-devtools-react/src/internal/state/workbench/index.ts` exports to expose adapter/view-state names, not projection authority names.
- [x] T034 [US2] Update workbench UI components under `packages/logix-devtools-react/src/internal/ui/workbench/` only where property names changed.

### Verification

- [x] T035 [US2] Run `rtk pnpm -C packages/logix-devtools-react exec vitest run test/internal/workbench-derivation.contract.test.ts test/internal/workbench-gaps.contract.test.ts test/internal/workbench-export.contract.test.ts test/internal/workbench-state.contract.test.tsx`.
- [x] T036 [US2] Run `rtk pnpm -C packages/logix-devtools-react typecheck`.

**Checkpoint**: PM-05 passes and DVTools no longer owns cross-host derivation truth.

## Phase 4: CLI Adapter [US3]

**Goal**: Let CLI use projection for focus while keeping CLI/control-plane transport authority.

### Tests

- [x] T037 [P] [US3] Add `packages/logix-cli/test/Integration/workbench-projection.contract.test.ts`.
- [x] T038 [P] [US3] Extend `packages/logix-cli/test/Integration/evidence-selection-input.contract.test.ts` to assert selection affects focus only.
- [x] T039 [P] [US3] Extend `packages/logix-cli/test/Integration/evidence-selection-roundtrip.contract.test.ts` to assert artifact output keys remain evidence/report namespace.

### Implementation

- [x] T040 [US3] Add `packages/logix-cli/src/internal/workbenchProjection.ts` to convert CLI evidence/report/selection input to `RuntimeWorkbenchAuthorityBundle`.
- [x] T041 [US3] Update `packages/logix-cli/src/internal/evidenceInput.ts` only if needed to expose validated evidence/selection data to the adapter without changing CLI schema.
- [x] T042 [US3] Update `packages/logix-cli/src/internal/result.ts` only if needed to include focused projection refs in existing CLI transport artifacts.
- [x] T043 [US3] Ensure CLI does not import from `packages/logix-devtools-react` or consume DVTools-only protocol.

### Verification

- [x] T044 [US3] Run `rtk pnpm -C packages/logix-cli exec vitest run test/Integration/workbench-projection.contract.test.ts test/Integration/evidence-selection-input.contract.test.ts test/Integration/evidence-selection-roundtrip.contract.test.ts`.
- [x] T045 [US3] Run `rtk pnpm -C packages/logix-cli typecheck`.

**Checkpoint**: PM-06 passes.

## Phase 5: Playground Adapter [US4]

**Goal**: Let Playground derive diagnostics/drilldowns from projection while keeping UI state and summaries host-owned.

### Tests

- [x] T046 [P] [US4] Extend `packages/logix-playground/test/derived-summary.contract.test.ts` to assert summary consumes projection but stays host view state.
- [x] T047 [P] [US4] Extend `packages/logix-playground/test/shape-separation.contract.test.ts` to assert projection preserves Run result and Trial report separation.
- [x] T047a [P] [US4] Add `packages/logix-playground/test/workbench-layout.contract.test.tsx` to assert the 17 SSoT display shape: top command bar, file navigator, source editor, right result/diagnostics panel, and bottom `Console / Diagnostics / Trace / Snapshot` strip.

### Implementation

- [x] T048 [US4] Update `packages/logix-playground/src/internal/summary/derivedSummary.ts` to optionally consume projection refs without redefining report authority.
- [x] T049 [US4] Add an internal adapter near `packages/logix-playground/src/internal/summary/` if needed to build `RuntimeWorkbenchAuthorityBundle` from snapshot, preview, run, check and trial states.
- [x] T050 [US4] Ensure `packages/logix-playground/src/Playground.tsx` and shell components do not import core internal workbench directly unless through the internal summary adapter.
- [x] T051 [US4] Ensure source edits, active file, preview lifecycle and panel expansion stay host view state.
- [x] T051a [US4] Reshape `packages/logix-playground/src/internal/components/PlaygroundShell.tsx` and source/result panel components to match `docs/ssot/runtime/17-playground-product-workbench.md` without moving product layout authority into the kernel.

### Verification

- [x] T052 [US4] Run `rtk pnpm -C packages/logix-playground exec vitest run test/derived-summary.contract.test.ts test/shape-separation.contract.test.ts test/workbench-layout.contract.test.tsx`.
- [x] T053 [US4] Run `rtk pnpm -C packages/logix-playground typecheck`.

**Checkpoint**: PM-07 passes.

## Phase 6: Public Surface And Negative Sweep [US5]

**Goal**: Prove no public workbench or second-system vocabulary leaked.

- [x] T054 [P] [US5] Run core public surface guard `rtk pnpm -C packages/logix-core exec vitest run test/internal/Workbench/Workbench.publicSurface.guard.test.ts`.
- [x] T055 [P] [US5] Run negative sweep from [quickstart.md](./quickstart.md) and record output in `specs/165-runtime-workbench-kernel/notes/public-surface-sweep.md`.
- [x] T056 [US5] If negative sweep finds production hits for must-cut names, remove or rename them; if hits are test/history/spec-only, classify them in the notes file.
- [x] T057 [US5] Ensure `packages/logix-core/package.json` publish config blocks `./repo-internal/workbench-api`.
- [x] T058 [US5] Ensure `packages/logix-sandbox/package.json` and `packages/logix-sandbox/src/index.ts` contain no workbench/playground API additions.

**Checkpoint**: PM-08 passes.

## Phase 7: Cross-Package Verification

**Purpose**: Run targeted and workspace gates.

- [x] T059 Run all PM commands from [plan.md](./plan.md).
- [x] T060 Run package typechecks:
  - `rtk pnpm -C packages/logix-core typecheck`
  - `rtk pnpm -C packages/logix-devtools-react typecheck`
  - `rtk pnpm -C packages/logix-cli typecheck`
  - `rtk pnpm -C packages/logix-playground typecheck`
- [x] T061 Run `rtk pnpm typecheck`.
- [x] T062 Run `rtk pnpm test:turbo`.
- [x] T063 Run `rtk pnpm lint` if touched packages are lint-covered.
- [x] T064 Write `specs/165-runtime-workbench-kernel/notes/verification.md` with commands, pass/fail and any skipped gates.
- [x] T065 Write `specs/165-runtime-workbench-kernel/notes/perf-evidence.md` stating whether runtime hot-path perf collection was required.

## Phase 8: Result Writeback

**Purpose**: Make final state authoritative.

- [x] T066 Update `specs/165-runtime-workbench-kernel/spec.md` if implementation discovered accepted boundary refinements.
- [x] T067 Update `specs/165-runtime-workbench-kernel/plan.md`, `data-model.md`, `contracts/README.md` or `quickstart.md` if landed files or commands differ.
- [x] T068 Update `docs/ssot/runtime/14-dvtools-internal-workbench.md` only if DVTools host responsibilities changed beyond already delegated projection law.
- [x] T069 Update `docs/ssot/runtime/09-verification-control-plane.md` only if control-plane semantics changed.
- [x] T070 Move `specs/165-runtime-workbench-kernel/spec.md` status to `Done` only after PM-01 through PM-08 and required writebacks pass.

## Dependencies And Execution Order

- Phase 1 starts immediately.
- Phase 2 blocks all host adapters.
- Phase 3 depends on Phase 2 and existing DVTools tests.
- Phase 4 depends on Phase 2 and existing CLI evidence selection tests.
- Phase 5 depends on Phase 2 and existing Playground summary/shape tests.
- Phase 6 can start after Phase 2, but final sweep should run after all adapters.
- Phase 7 depends on Phases 2 through 6.
- Phase 8 depends on Phase 7.

## Parallel Opportunities

- T004 through T009 can be prepared in parallel.
- T015 through T019 can be implemented in parallel after type names are agreed, but T020 integrates them.
- T025 through T028 can be prepared in parallel.
- T037 through T039 can be prepared in parallel.
- T046 and T047 can be prepared in parallel.
- T054 and T055 can run in parallel after adapters land.

## Single-Track Rule

At no phase may an implementation add a compatibility alias, public facade, new report schema, new evidence envelope, trigger DSL, Driver DSL, raw action dispatch surface, Scenario Playback runner, source coordinate DSL, DVTools protocol consumed by CLI, or kernel-owned CLI report schema.
