# Tasks: Professional Logic Playground vNext

**Input**: Design documents from `/specs/166-playground-driver-scenario-surface/`
**Prerequisites**: [spec.md](./spec.md), [plan.md](./plan.md), [data-model.md](./data-model.md), [contracts/README.md](./contracts/README.md), [quickstart.md](./quickstart.md), [ui-contract.md](./ui-contract.md)

## Phase 1: Setup

- [x] T001 Add `react-resizable-panels` or approved local equivalent dependency to `packages/logix-playground/package.json`
- [x] T002 [P] Create `packages/logix-playground/src/internal/layout/ResizableWorkbench.tsx`
- [x] T003 [P] Create `packages/logix-playground/src/internal/layout/layoutState.ts`
- [x] T004 [P] Create `packages/logix-playground/src/internal/components/RuntimeInspector.tsx`
- [x] T005 [P] Create `packages/logix-playground/src/internal/components/HostCommandBar.tsx`
- [x] T006 [P] Create `packages/logix-playground/src/internal/components/FilesPanel.tsx`
- [x] T007 [P] Create `specs/166-playground-driver-scenario-surface/notes/verification.md`
- [x] T008 [P] Create `specs/166-playground-driver-scenario-surface/notes/perf-evidence.md`

## Phase 2: Foundational Workbench State

- [x] T009 Extend `packages/logix-playground/src/internal/state/workbenchTypes.ts` with layout state, editor host state, host command result state and inspector selection state
- [x] T010 Extend `packages/logix-playground/src/internal/state/workbenchProgram.ts` with layout, editor, command and inspector actions
- [x] T011 Update `packages/logix-playground/src/internal/session/programSession.ts` so normal statuses are ready/running/failed with stale as fallback only
- [x] T012 Update `packages/logix-playground/src/internal/session/programSession.ts` to create auto-ready sessions and bounded restart lifecycle logs
- [x] T013 Update `packages/logix-playground/src/internal/session/logs.ts` with bounded lifecycle, command and operation log helpers
- [x] T014 Update tests covering `packages/logix-playground/src/internal/session/programSession.ts` for auto-ready, reset-only and auto restart behavior
- [x] T015 Update `packages/logix-playground/src/internal/session/workspace.ts` so active file prefers Program entry when preview entry is absent
- [x] T016 Integrate 167 minimum Program action manifest slice into `packages/logix-playground/src/internal/action/actionManifest.ts` behind an internal adapter
- [x] T017 Add fallback evidence gap classification for missing 167 manifest in `packages/logix-playground/src/internal/action/actionManifest.ts`
- [x] T017a Document and test standard virtual source path helpers for `/src/main.program.ts`, `/src/logic/*.logic.ts`, `/src/services/*.service.ts`, `/src/fixtures/*.fixture.ts` and `/src/preview/App.tsx` in `packages/logix-playground/src/Project.ts` or project normalization tests
- [x] T117 Create `packages/logix-playground/src/internal/runner/projectSnapshotRuntimeInvoker.ts` to execute current `ProjectSnapshot` through existing `Runtime.run`, `Runtime.openProgram`, `Runtime.check` and `Runtime.trial` faces
- [x] T117a Ensure `projectSnapshotRuntimeInvoker.ts` only emits `runtimeOutput`, `controlPlaneReport`, `transportFailure` or `evidenceGap` and does not own action authority, payload validation, operation vocabulary, state fabrication, session reducer state, Driver semantics or Scenario semantics
- [x] T118 Update `packages/logix-playground/src/internal/runner/programSessionRunner.ts` so production dispatch uses compiled `Runtime.openProgram(Program)` output from `projectSnapshotRuntimeInvoker.ts`
- [x] T119 Update `packages/logix-playground/src/internal/runner/localProgramRun.ts` or replace it so production Run uses compiled `Runtime.run(Program, main)` from `projectSnapshotRuntimeInvoker.ts`
- [x] T120 Move `createDefaultProgramSessionRunner` into test support or mark it fixture-only in `packages/logix-playground/src/internal/runner/defaultProgramSessionRunner.ts`
- [x] T121 Add negative tests proving production `PlaygroundShell` does not import `createDefaultProgramSessionRunner` or `runLocalProgramSnapshot` in `packages/logix-playground/test/runtime-consumption.contract.test.tsx`
- [x] T126 Add lifecycle commit predicate to session reducer: async results may update current state/result/log/trace/diagnostics only when `projectId`, `revision`, `sessionId` and `opSeq` match current session root
- [x] T127 Add stale completion tests for old Run result, old dispatch result and reset/source-edit races in `packages/logix-playground/test/program-session-lifecycle.contract.test.ts`
- [x] T128 Replace 166 manifest-like UI types with `ActionPanelViewModel` consuming 167A minimum manifest DTO or explicit `fallback-source-regex` evidence gap

## Phase 2A: Monaco Source Editor Foundation

**Goal**: Monaco is the normal source editor, with local TypeScript language-service support.

**Independent Test**: Open a Logic-first project, edit `/src/main.program.ts`, receive completions and diagnostics for local imports and `@logixjs/*` imports, then run the edited snapshot.

- [x] T094 Add `monaco-editor` and `@monaco-editor/react` or approved equivalent Monaco adapter dependency to `packages/logix-playground/package.json`
- [x] T095 [P] Create `packages/logix-playground/src/internal/editor/MonacoSourceEditor.tsx`
- [x] T096 [P] Port Monaco worker setup from `examples/logix-sandbox-mvp/src/components/editor/monacoWorkers.ts` into `packages/logix-playground/src/internal/editor/monacoWorkers.ts`
- [x] T097 [P] Port TypeScript worker type-bundle boot path from `examples/logix-sandbox-mvp/src/components/editor/workers/ts.worker.ts` into package-owned worker code
- [x] T098 [P] Create a package-owned Monaco type bundle generator based on `examples/logix-sandbox-mvp/scripts/generate-monaco-type-bundle.ts`
- [x] T099 [P] Generate Monaco extraLibs for `@logixjs/core`, `@logixjs/react`, `@logixjs/sandbox`, `@logixjs/form`, `effect`, React and approved transitive types
- [x] T100 Implement `MonacoSourceEditor` with virtual file URI model management and bounded fallback status
- [x] T101 Update `packages/logix-playground/src/internal/components/SourcePanel.tsx` to use `MonacoSourceEditor` instead of textarea on the default path
- [x] T102 Synchronize all `ProjectSnapshot.files` entries into Monaco models so cross-file imports resolve in the TypeScript language service
- [x] T103 Keep Monaco active model, file navigator active file and workspace source revision aligned
- [x] T104 Add editor tests for Monaco fallback state and virtual URI mapping
- [x] T105 Add browser/manual verification notes for TypeScript completion and diagnostics in `specs/166-playground-driver-scenario-surface/notes/verification.md`
- [x] T106 Replace JSON payload and advanced raw dispatch textareas with the package-owned Monaco editor adapter

## Phase 3: User Story 1 - Logic-first Program Playground (P1)

**Goal**: A Logic-first project opens without preview, starts ready, dispatches reflected actions and auto restarts on source edit.

**Independent Test**: Open `logix-react.local-counter`, dispatch `increment`, edit `counterStep`, dispatch again and observe state/log/trace/revision changes with no preview requirement.

- [x] T018 [US1] Move local-counter to `examples/logix-react/src/playground/projects/local-counter/index.ts` with `files.ts` and `sources/src/**`
- [x] T018a [US1] Remove default `App.tsx`, `preview` entry and preview capability from the local-counter project declaration
- [x] T018b [US1] Rename the local-counter virtual Program entry from `/src/program.ts` to `/src/main.program.ts`
- [x] T019 [US1] Update `packages/logix-playground/src/Project.ts` types so preview is optional and Logic-first project shape is documented through type comments
- [x] T020 [US1] Update `packages/logix-playground/src/internal/snapshot/projectSnapshot.ts` to preserve Logic-first snapshot identity without preview assumptions
- [x] T021 [US1] Update `packages/logix-playground/src/internal/components/PlaygroundShell.tsx` to create a ready Program session on initial load for valid Program projects
- [x] T022 [US1] Update `packages/logix-playground/src/internal/components/PlaygroundShell.tsx` to auto restart session on source edit and reset
- [x] T023 [US1] Remove normal-path Start/Close session wiring from `packages/logix-playground/src/internal/components/PlaygroundShell.tsx`
- [x] T024 [US1] Replace `ProgramSessionPanel` controls in `packages/logix-playground/src/internal/components/ProgramSessionPanel.tsx` with reset-only session summary
- [x] T025 [US1] Update `packages/logix-playground/src/internal/components/SessionConsolePanel.tsx` to show lifecycle restart logs and bounded dispatch logs
- [x] T026 [US1] Add or update tests for open-ready, dispatch and source-edit auto restart in `packages/logix-playground/test/action-panel-dispatch.contract.test.tsx`
- [x] T027 [US1] Add example route assertions for no preview requirement in `examples/logix-react/src/playground`
- [x] T122 [US1] Wire `PlaygroundShell` default session dispatch to `packages/logix-playground/src/internal/runner/programSessionRunner.ts` backed by `projectSnapshotRuntimeInvoker.ts`
- [x] T122a [US1] Remove any remaining legacy wide-adapter production references or keep the old filename only as fixture/test support
- [x] T123 [US1] Add a source-edit dispatch test proving changed `/src/logic/*.logic.ts` output comes from compiled `Runtime.openProgram` execution in `packages/logix-playground/test/action-panel-dispatch.contract.test.tsx`

## Phase 4: User Story 2 - Professional Resizable Workbench (P1)

**Goal**: Files, Source, Runtime inspector and bottom evidence drawer are resizable and preserve a clear primary feedback loop.

**Independent Test**: Resize file panel, inspector and bottom drawer, switch bottom tabs and confirm no overlap at desktop size.

- [x] T028 [US2] Implement `ResizableWorkbench` in `packages/logix-playground/src/internal/layout/ResizableWorkbench.tsx`
- [x] T029 [US2] Implement layout state defaults in `packages/logix-playground/src/internal/layout/layoutState.ts`
- [x] T030 [US2] Move top bar rendering from `PlaygroundShell` into `packages/logix-playground/src/internal/components/HostCommandBar.tsx`
- [x] T031 [US2] Move file tree rendering into `packages/logix-playground/src/internal/components/FilesPanel.tsx`
- [x] T032 [US2] Compose `FilesPanel`, `SourcePanel`, `RuntimeInspector` and `WorkbenchBottomPanel` through `ResizableWorkbench` in `packages/logix-playground/src/internal/components/PlaygroundShell.tsx`
- [x] T033 [US2] Store panel sizes, collapsed states and selected tabs in `PlaygroundWorkbenchProgram` where practical
- [x] T034 [US2] Update `packages/logix-playground/src/internal/components/WorkbenchBottomPanel.tsx` so tab selected state and visible content are testable
- [x] T035 [US2] Add layout tests in `packages/logix-playground/src/internal/layout/ResizableWorkbench.test.tsx`
- [x] T036 [US2] Add component tests for bottom tab switching in `packages/logix-playground/src/internal/components/WorkbenchBottomPanel.test.tsx`
- [x] T037 [US2] Add browser or jsdom assertions for default desktop readability in `examples/logix-react/src/playground`
- [x] T107 [US2] Implement stable region selectors from `specs/166-playground-driver-scenario-surface/ui-contract.md` in `packages/logix-playground/src/internal/components/PlaygroundShell.tsx`
- [x] T108 [P] [US2] Add action-dense pressure fixture route in `examples/logix-react/src/playground/projects/pressure/action-dense/index.ts`
- [x] T109 [P] [US2] Add state-large pressure fixture route in `examples/logix-react/src/playground/projects/pressure/state-large/index.ts`
- [x] T110 [P] [US2] Add trace-heavy pressure fixture route in `examples/logix-react/src/playground/projects/pressure/trace-heavy/index.ts`
- [x] T111 [P] [US2] Add diagnostics-dense pressure fixture route in `examples/logix-react/src/playground/projects/pressure/diagnostics-dense/index.ts`
- [x] T112 [P] [US2] Add scenario-driver-payload pressure fixture route in `examples/logix-react/src/playground/projects/pressure/scenario-driver-payload/index.ts`
- [x] T113 [US2] Add browser assertions for UI contract required regions and forbidden overflow in `examples/logix-react/src/playground/playground-ui-contract.browser.test.ts`
- [x] T114 [US2] Add browser assertions for `RuntimeInspector.ActionsList` and `RuntimeInspector.StateTree` scroll ownership in `examples/logix-react/src/playground/playground-inspector-scroll.browser.test.ts`
- [x] T115 [US2] Add browser assertions for bottom Diagnostics and Trace table scroll ownership in `examples/logix-react/src/playground/playground-evidence-drawer.browser.test.ts`
- [x] T116 [US2] Record UI contract verification results in `specs/166-playground-driver-scenario-surface/notes/verification.md`

## Phase 5: User Story 3 - Run / Check / Trial Outputs (P1)

**Goal**: Top bar commands produce visible, shape-separated outputs or disabled reasons.

**Independent Test**: Click Run, Check and Trial and verify output destinations and shape separation.

- [x] T038 [US3] Replace `localProgramRun.ts` with `projectSnapshotRuntimeInvoker` / `runProjection` bounded Run result carrying run id and revision
- [x] T039 [US3] Implement or complete `packages/logix-playground/src/internal/runner/controlPlaneRunner.ts` for Check and startup Trial output projection
- [x] T040 [US3] Extend `packages/logix-playground/src/internal/state/workbenchProgram.ts` with host command result reducers
- [x] T041 [US3] Update `HostCommandBar` to disable unavailable commands with visible reasons in `packages/logix-playground/src/internal/components/HostCommandBar.tsx`
- [x] T042 [US3] Replace placeholder Program panel with real Run Result and diagnostics summary in `packages/logix-playground/src/internal/components/RuntimeInspector.tsx`
- [x] T043 [US3] Update `packages/logix-playground/src/internal/components/ProgramPanel.tsx` or delete it if `RuntimeInspector` fully replaces it
- [x] T044 [US3] Update `packages/logix-playground/src/internal/components/WorkbenchBottomPanel.tsx` to render Diagnostics detail from Check/Trial state
- [x] T045 [US3] Add command output tests in `packages/logix-playground/test/host-command-output.contract.test.tsx`
- [x] T046 [US3] Add shape separation tests in `packages/logix-playground/test/shape-separation.contract.test.ts` and `packages/logix-playground/test/derived-summary.contract.test.ts`
- [x] T124 [US3] Replace `localProgramRun` production call sites with `projectSnapshotRuntimeInvoker` Run output in `packages/logix-playground/src/internal/components/PlaygroundShell.tsx`
- [x] T124a [US3] Replace any legacy wide-adapter Run wording in production call sites with `projectSnapshotRuntimeInvoker` output classification
- [x] T125 [US3] Add Run contract test proving `Runtime.run(Program, main)` result changes after source edit in `packages/logix-playground/test/program-run-runtime.contract.test.ts`

## Phase 6: User Story 4 - Curated Drivers And Action Workbench (P2)

**Goal**: Docs-friendly Drivers and internal reflected actions share the same session output path, with raw dispatch hidden advanced-only.

**Independent Test**: Execute a curated driver and a reflected action, verify both update state/result/log/trace, and raw dispatch is hidden by default.

- [x] T047 [US4] Extend `PlaygroundProject` with optional `drivers` metadata in `packages/logix-playground/src/Project.ts`
- [x] T048 [US4] Create `packages/logix-playground/src/internal/driver/driverModel.ts`
- [x] T049 [US4] Create `packages/logix-playground/src/internal/driver/driverRunner.ts`
- [x] T050 [US4] Add driver state and reducers to `packages/logix-playground/src/internal/state/workbenchProgram.ts`
- [x] T051 [US4] Add Driver section to `packages/logix-playground/src/internal/components/RuntimeInspector.tsx`
- [x] T052 [US4] Update `packages/logix-playground/src/internal/action/actionManifest.ts` to include action authority and mark regex parsing as `fallback-source-regex`
- [x] T053 [US4] Update `packages/logix-playground/src/internal/components/ActionManifestPanel.tsx` to show manifest/fallback authority and validation errors
- [x] T054 [US4] Hide `RawDispatchPanel` behind advanced state in `packages/logix-playground/src/internal/components/PlaygroundShell.tsx` or `RuntimeInspector.tsx`
- [x] T055 [US4] Gate raw dispatch by current manifest action tags in `packages/logix-playground/src/internal/components/RawDispatchPanel.tsx`
- [x] T056 [US4] Add one curated driver to `examples/logix-react/src/playground/projects/local-counter/drivers.ts`
- [x] T056a [US4] Wire local-counter driver metadata from `examples/logix-react/src/playground/projects/local-counter/drivers.ts` into the project declaration
- [x] T057 [US4] Add driver execution tests in `packages/logix-playground/src/internal/driver/driverRunner.test.ts`
- [x] T058 [US4] Add raw dispatch hidden/default tests in `packages/logix-playground/src/internal/components/RuntimeInspector.test.tsx`

## Phase 7: User Story 5 - Scenario Playback (P2)

**Goal**: Multi-step no-UI demo playback with bounded wait/settle and product-level expect results.

**Independent Test**: Run a scenario all-at-once and step-by-step, observe per-step result and timeout handling.

- [x] T059 [US5] Extend `PlaygroundProject` with optional `scenarios` metadata in `packages/logix-playground/src/Project.ts`
- [x] T060 [US5] Create `packages/logix-playground/src/internal/scenario/scenarioModel.ts`
- [x] T061 [US5] Create `packages/logix-playground/src/internal/scenario/scenarioRunner.ts`
- [x] T062 [US5] Add scenario state and reducers to `packages/logix-playground/src/internal/state/workbenchProgram.ts`
- [x] T063 [US5] Add Scenario section to `packages/logix-playground/src/internal/components/RuntimeInspector.tsx` or bottom drawer
- [x] T064 [US5] Render per-step status, duration, result and failure in `packages/logix-playground/src/internal/components/WorkbenchBottomPanel.tsx`
- [x] T065 [US5] Add at least one scenario to an example project in `examples/logix-react/src/playground/projects`
- [x] T065a [US5] Place scenario metadata in the project directory `scenarios.ts`, not in the virtual runtime source tree
- [x] T066 [US5] Add scenario runner tests in `packages/logix-playground/src/internal/scenario/scenarioRunner.test.ts`

## Phase 8: User Story 6 - Service Source Files (P3)

**Goal**: Service-dependent examples can edit service source through the same source snapshot and prove changed runtime output.

**Independent Test**: Edit a service source file, verify snapshot revision changes, session restarts and subsequent command/driver output changes.

- [x] T067 [US6] Extend `PlaygroundProject` with optional `serviceFiles` metadata in `packages/logix-playground/src/Project.ts`
- [x] T068 [US6] Create `packages/logix-playground/src/internal/source/serviceFiles.ts`
- [x] T069 [US6] Update `FilesPanel` to group service source files in `packages/logix-playground/src/internal/components/FilesPanel.tsx`
- [x] T070 [US6] Add service validation failure classification to `packages/logix-playground/src/internal/session/errors.ts`
- [x] T071 [US6] Ensure service file edit follows normal workspace revision path in `packages/logix-playground/src/internal/session/workspace.ts`
- [x] T072 [US6] Add a service-source example project under `examples/logix-react/src/playground/projects/service-source/` using `sources/src/main.program.ts`, `sources/src/logic/*.logic.ts` and `sources/src/services/*.service.ts`
- [x] T073 [US6] Register service-source project in `examples/logix-react/src/playground/registry.ts`
- [x] T074 [US6] Add service file tests in `packages/logix-playground/src/internal/source/serviceFiles.test.ts`

## Phase 9: Workbench Projection And Summary

- [x] T075 Update `packages/logix-playground/src/internal/summary/workbenchProjection.ts` to build 165 authority bundle inputs from Run/Check/Trial/Driver/Scenario outputs
- [x] T076 Update `packages/logix-playground/src/internal/summary/derivedSummary.ts` to avoid private diagnostic report-looking shapes
- [x] T077 Add evidence gap classification for missing manifest, unavailable check/trial, compile failure and preview-only failure in `packages/logix-playground/src/internal/summary/workbenchProjection.ts`
- [x] T078 Add workbench projection tests in `packages/logix-playground/src/internal/summary/workbenchProjection.test.ts`
- [x] T079 Update bottom Trace and Snapshot lanes in `packages/logix-playground/src/internal/components/WorkbenchBottomPanel.tsx` to show authority/context/gap classification

## Phase 10: Documentation Writeback And Verification

- [x] T080 Update `docs/ssot/runtime/17-playground-product-workbench.md` with final 166 vNext closure details if implementation changes accepted wording
- [x] T081 Update `specs/166-playground-driver-scenario-surface/spec.md` if implementation discovers accepted boundary refinements
- [x] T082 Update `specs/166-playground-driver-scenario-surface/plan.md`, `data-model.md`, `contracts/README.md` or `quickstart.md` if landed files or commands differ
- [x] T083 Run `rtk pnpm -C packages/logix-playground typecheck`
- [x] T084 Run `rtk pnpm -C packages/logix-playground test -- --run --cache '--project=!browser*' --silent=passed-only --reporter=dot --hideSkippedTests`
- [x] T085 Run `rtk pnpm -C examples/logix-react typecheck`
- [x] T086 Run `rtk pnpm typecheck`
- [x] T087 Run `rtk pnpm lint`
- [x] T088 Run `rtk pnpm test:turbo`
- [x] T089 Run browser/layout verification when stable, or record skip reason in `specs/166-playground-driver-scenario-surface/notes/verification.md`
- [x] T090 Run negative sweeps from `specs/166-playground-driver-scenario-surface/quickstart.md`
- [x] T091 Write command outcomes, browser skip notes and negative sweep classification to `specs/166-playground-driver-scenario-surface/notes/verification.md`
- [x] T092 Write runtime hot-path perf note to `specs/166-playground-driver-scenario-surface/notes/perf-evidence.md`
- [x] T093 Move `specs/166-playground-driver-scenario-surface/spec.md` status to `Done` after required acceptance criteria pass. SC-004/SC-013 browser evidence is covered by `pnpm -C examples/logix-react test:browser:playground`; see `notes/verification.md`.

## Phase 11: Visual Pressure Alignment Reopen

**Source**: [notes/visual-alignment-gap-analysis.md](./notes/visual-alignment-gap-analysis.md)

**Goal**: Bring the visible Playground workbench into alignment with the five 166 source images and Markdown pressure contracts, beyond shell selector and overflow containment.

**Independent Test**: At `1366x768`, open each pressure route and verify the expected active tabs, visible data surfaces, sticky regions, local scroll owners and workbench proportions from `ui-contract.md` and `visual-pressure-cases/*.md`.

- [x] T129 Remove the normal-route outer product header from `packages/logix-playground/src/Playground.tsx` so the workbench command bar is the single top header.
- [x] T130 Rebalance default desktop geometry so top command bar, files panel, source editor, runtime inspector and bottom drawer match the 166 shell contract at `1366x768`.
- [x] T131 Consume pressure fixture metadata to initialize default inspector emphasis and bottom tab for each pressure route.
- [x] T132 Materialize action-dense, state-large, trace-heavy, diagnostics-dense and scenario-driver-payload data profiles into visible UI data, not metadata only.
- [x] T133 Rework `RuntimeInspector` into pressure-aware State, Actions, Drivers, Result and Diagnostics lanes or tabs.
- [x] T134 Replace the action-dense card stack with compact searchable/filterable/grouped action rows and a sticky action toolbar.
- [x] T135 Add state tree, trace table, diagnostics table, Driver payload editor and Scenario step-list surfaces required by the pressure contracts.
- [x] T136 Upgrade the direct Playwright browser contract to assert default tabs, data counts, sticky regions, table/list shape and approximate region geometry.
- [x] T137 Add visual or DOM-geometry evidence against the five source images at `1366x768`; add `1440x900` if the implementation changes default sizing.
- [x] T138 Record the visual alignment verification results back to `specs/166-playground-driver-scenario-surface/notes/verification.md`.
- [x] T139 Replace the fixed-grid shell with actual `react-resizable-panels` groups, panels and accessible separators for Files, Runtime inspector and bottom drawer resizing.
- [x] T140 Add direct Playwright drag assertions proving Files width, Runtime inspector width and bottom drawer height change through the visible resize handles without page overflow.
- [x] T141 Replace synthetic diagnostics pressure rows with `Runtime.check` and `Runtime.trial(mode="startup")` control-plane report projections.
- [x] T142 Add focused diagnostics demo routes for real Check import failures and Trial missing config, service and child Program import failures.
- [x] T143 Update registry-indexed browser proof recipes so diagnostics demos assert real failure codes, authorities and evidence coordinates.
- [x] T144 Update diagnostics pressure docs and verification notes to forbid fake Runtime-looking rows such as `LC-0001` and `Pressure diagnostic`.

## Dependencies

- Phase 1 before all implementation.
- Phase 2 before all user stories.
- T117 through T128 must complete before US1 treats action dispatch and Run as production-real.
- Phase 2A before US2 default source editor closure and before docs-ready acceptance.
- 167A minimum manifest closure, tracked by `specs/167-runtime-reflection-manifest/tasks.md` T008 through T014 plus T045 and T048 through T052, must land before 166 treats reflected actions as manifest authority.
- US1 before US2 and US3 because layout and commands need auto-ready session semantics.
- US2 and US3 can proceed in parallel after US1 if file ownership is coordinated.
- US4 depends on G0/G2/G3: real Runtime proof, 167A manifest authority and lifecycle commit predicate.
- US5 depends on US4 plus explicit Driver output classification because scenarios can reference drivers.
- US6 can proceed after US1 and does not require US5.
- Phase 9 depends on US3, US4 and US5 output shapes.
- Phase 11 reopens visual pressure alignment only; it depends on the existing 166 implementation and does not reopen Runtime Proof gates unless the fix changes execution behavior.

## Parallel Opportunities

- T002, T003, T004, T005, T006 can be started in parallel.
- T095 through T099 can be started in parallel after T094.
- T108 through T112 can be started in parallel after T107 if each fixture writes to its own pressure project directory.
- US2 layout files and US3 runner/command files can be split between workers.
- US4 Driver model/runner and Action panel updates can be split if write sets are disjoint.
- US6 service file metadata can proceed while US5 scenario UI is implemented.

## MVP Scope

MVP for first closure:

- Phase 1
- Phase 2
- T117 through T128
- 167A MVP tasks T008 through T014 plus T045 and T048 through T052
- Phase 3

This proves Runtime Proof First without Driver/Scenario/Service Source Files, Monaco or UI pressure counting as closure. Phase 2A, US2 and US3 can run in parallel workstreams, but they close after G0/G1/G2/G3. US4 to US6 then turn the same workbench into docs-ready no-UI demos.
