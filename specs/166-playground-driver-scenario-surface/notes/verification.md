# Verification Notes

## 2026-04-30 Real Check/Trial Diagnostics Demos

Implementation summary:

- Replaced synthetic pressure diagnostics with `packages/logix-playground/src/internal/diagnostics/controlPlaneDiagnostics.ts`, projecting rows only from `ProgramPanelControlPlaneState` reports.
- Updated Runtime inspector and bottom Diagnostics detail to render code, message, authority and evidence from real `Runtime.check` / `Runtime.trial(mode="startup")` reports.
- Removed the old `makePressureDiagnosticRows` path from the pressure fixture.
- Added focused diagnostics demo routes:
  - `logix-react.diagnostics.check-imports`
  - `logix-react.diagnostics.trial-missing-config`
  - `logix-react.diagnostics.trial-missing-service`
  - `logix-react.diagnostics.trial-missing-import`
- Updated browser proof packs so diagnostics demo routes assert real `FAIL` reports, exact code text, authority text and evidence coordinates.
- Updated diagnostics-dense pressure metadata from `diagnostics: 64` to real projection metrics: `realAuthorities`, `projectedReportFields`, `minimumRowsAfterCheckTrial`.

Commands run:

- `rtk pnpm -C packages/logix-playground exec vitest run test/control-plane-diagnostics.contract.test.ts src/internal/components/WorkbenchBottomPanel.test.tsx src/internal/components/RuntimeInspector.test.tsx --reporter=dot` passed: 3 files, 13 tests. Existing Logix React render-phase sync blocking warnings printed.
- `rtk pnpm -C packages/logix-playground typecheck` passed.
- `rtk pnpm -C examples/logix-react test -- --run playground-registry.contract.test.ts --reporter=dot` passed: 1 file, 10 tests.
- `rtk pnpm -C examples/logix-react typecheck` passed.
- `rtk pnpm -C examples/logix-react test:browser:playground` passed, including:
  - `PASS diagnostics demo real Runtime reports`
  - `PASS logix-react.diagnostics.check-imports checkFailure,boundaryProbe`
  - `PASS logix-react.diagnostics.trial-missing-config check,trialFailure,boundaryProbe`
  - `PASS logix-react.diagnostics.trial-missing-service check,trialFailure,boundaryProbe`
  - `PASS logix-react.diagnostics.trial-missing-import check,trialFailure,boundaryProbe`
- `rtk rg -n "LC-0001|Pressure diagnostic|authority=runtime.check|dataProfile\\.diagnostics|makePressureDiagnosticRows" examples/logix-react packages/logix-playground specs/166-playground-driver-scenario-surface -S` returns only negative test/assertion references for `LC-0001` and `Pressure diagnostic`.

Focused checks:

- `runtime.check/static` rows are produced by Check reports, not fixture metadata.
- `runtime.trial/startup` rows are produced by Trial startup reports, not fixture metadata.
- The diagnostics-dense route shows a bounded empty state before Check/Trial run and real Check/Trial authority rows after the commands run.
- Fake Runtime-looking codes such as `LC-0001` are forbidden by component and browser assertions.

## 2026-04-30 Playground Dogfood E2E Coverage

Implementation summary:

- Added registry-indexed proof recipes for all `examples/logix-react` Playground projects.
- Added facet-derived Playwright proof packs, evidence coordinate assertions, gap harvest helpers, render isolation probes and boundary owner attribution.
- Added an internal render isolation region probe around the five workbench regions and a package-level reset fanout regression.
- Split Playground shell state ownership so Shell keeps workspace bridge, runtime invoker/session runner, effects, command callbacks and refs, while display regions subscribe through focused selectors.
- Kept route/files/capabilities/drivers/scenarios/serviceFiles/pressure metadata derived from `PlaygroundProject`.
- Kept the route matrix in `examples/logix-react/test/browser/playground-proof-recipes.ts`; SSoT only records the proof law.

Commands run:

- Red check: `rtk pnpm -C packages/logix-playground exec vitest run test/workbench-layout.contract.test.tsx --reporter=dot` failed before the final Shell ref fix because Reset committed `files-panel`.
- `rtk pnpm -C packages/logix-playground exec vitest run test/workbench-layout.contract.test.tsx --reporter=dot` passed: 1 file, 3 tests.
- `rtk pnpm -C examples/logix-react test:browser:playground` passed and includes registry-indexed proof recipes for 7 projects.
- `rtk pnpm -C packages/logix-playground typecheck` passed.
- `rtk pnpm -C examples/logix-react typecheck` passed.
- `rtk pnpm -C packages/logix-playground exec vitest run src/internal/layout/ResizableWorkbench.test.tsx src/internal/components/RuntimeInspector.test.tsx src/internal/components/WorkbenchBottomPanel.test.tsx test/workbench-state.contract.test.ts test/workbench-layout.contract.test.tsx --reporter=dot` passed: 5 files, 19 tests.
- `rtk pnpm -C examples/logix-react exec vitest run test/playground-registry.contract.test.ts --reporter=dot` passed: 1 file, 10 tests.

Browser proof coverage:

- Proof recipe path: `examples/logix-react/test/browser/playground-proof-recipes.ts`
- Project count: 7
- Projects covered: `logix-react.local-counter`, `logix-react.pressure.action-dense`, `logix-react.pressure.state-large`, `logix-react.pressure.trace-heavy`, `logix-react.pressure.diagnostics-dense`, `logix-react.pressure.scenario-driver-payload`, `logix-react.service-source`
- Active boundary owner classes: `reflection`, `runtime-run`, `runtime-dispatch`, `control-plane-check`, `control-plane-trial`, `transport`, `projection`, `playground-product`
- Render isolation probes: `logix-react.local-counter`, `logix-react.pressure.action-dense`, `logix-react.pressure.trace-heavy`

Discovered gaps:

- None from the completed browser proof run.

Known verification noise:

- Existing Logix React render-phase sync blocking warnings and React `act(...)` warnings still print in package UI tests. The focused commands above exited 0.

## 2026-04-29 Monaco Loading Layout Stabilization

Implementation summary:

- Replaced the bare textarea loading/fallback surface with a Monaco-shaped grid that renders a stable line-number gutter, a decorations/folding reserve column and the editable textarea.
- Fixed Monaco ready options to the same gutter contract: `lineNumbersMinChars`, `lineDecorationsWidth`, `glyphMargin`, `folding` and vertical `padding` are explicit.
- Split Monaco bootstrap from virtual-file synchronization so workspace file array changes update models without sending the editor back through the loading surface.
- Kept the fallback textarea editable, so disabled or unavailable Monaco still has bounded authoring behavior.
- Updated `docs/ssot/runtime/17-playground-product-workbench.md` to require gutter and padding reservation during Monaco loading/fallback.

Commands run:

- `rtk pnpm -C packages/logix-playground exec vitest run src/internal/editor/MonacoSourceEditor.test.tsx --reporter=dot` passed: 1 file, 6 tests.
- `rtk pnpm -C packages/logix-playground typecheck` passed.
- `rtk pnpm -C packages/logix-playground typecheck:test` passed.
- Browser probe against `http://localhost:5175/playground/logix-react.local-counter` with delayed Monaco loading observed `data-editor-engine="textarea"` plus fallback gutter during loading, then `data-editor-engine="monaco"` after ready. The fallback textarea text left and Monaco `.view-line` text left both measured `325px`, so the horizontal text-left delta was `0px`.

## 2026-04-29 Monaco TypeScript Language Service Closure

Implementation summary:

- Added package-owned Monaco TypeScript compiler options in `packages/logix-playground/src/internal/editor/monacoTypeScriptOptions.ts`.
- Configured `typescriptDefaults` and `javascriptDefaults` with `baseUrl: "file:///"`, Node module resolution, package `paths` for `@logixjs/*`, `effect`, React types and virtual source relative imports.
- Added explicit Monaco lib file names `lib.es2020.d.ts`, `lib.dom.d.ts` and `lib.dom.iterable.d.ts` so the TypeScript worker resolves iterable globals used by Effect types.
- Kept the compiler-options helper outside `MonacoSourceEditor.tsx` so Vite React Fast Refresh does not flag the component module for incompatible non-component exports.
- Extended the examples Playwright route contract with a Monaco TypeScript language-service probe: default local-counter source must have no import-line squiggles, and `Logix.` completion must include `Module`.

Commands and probes run:

- `rtk pnpm -C packages/logix-playground exec vitest run src/internal/editor/MonacoSourceEditor.test.tsx --reporter=dot` passed: 1 file, 6 tests.
- `rtk pnpm -C packages/logix-playground typecheck` passed.
- `rtk pnpm -C packages/logix-playground typecheck:test` passed.
- `rtk pnpm -C packages/logix-playground exec vitest run src/internal/editor/MonacoSourceEditor.test.tsx src/internal/components/SourcePanel.test.tsx src/internal/components/ActionManifestPanel.test.tsx test/raw-dispatch-advanced.contract.test.tsx --reporter=dot` passed: 4 files, 10 tests. Existing Logix React render-phase sync warning printed in the raw-dispatch UI test.
- `rtk pnpm -C examples/logix-react typecheck` passed.
- A TypeScript language-service probe using the generated Monaco type bundle and local-counter source returned `Logix.` completions `ControlPlane`, `Module`, `Program`, `Runtime`.
- A browser Playwright probe against `/playground/logix-react.local-counter` showed zero Monaco squiggles on the visible import lines:
  - `from "effect"`
  - `from "@logixjs/core"`
  - `from "./logic/localCounter.logic"`
- A browser Playwright completion probe typed `Logix.` into Monaco and returned suggestions `ControlPlane`, `Module`, `Program`, `Runtime`.

Current unrelated blocker:

- `rtk pnpm -C examples/logix-react test:browser:playground` reaches and passes the new `default Monaco TypeScript language service` step, then currently fails in `default desktop shell regions` because `assertDefaultShellGeometry` still expects the Files panel near the old `220px` default, while the current workbench layout state renders `256px`. Resolving that visual-shell default drift belongs to the layout contract slice.

Focused checks:

- Package imports in Monaco resolve through generated local extraLibs and compiler `paths`.
- Virtual project source files resolve through `file:///src/**` model URIs.
- Monaco import diagnostics are editor feedback only; no Runtime.check, Runtime.trial or diagnostic authority shape changed.

## 2026-04-29 Interaction Evidence Matrix Closure

Implementation summary:

- Added `packages/logix-playground/test/interaction-evidence-matrix.contract.test.tsx` for action, Driver, Scenario, runtime failure and Reset evidence invariants.
- Added `packages/logix-playground/test/support/interactionEvidenceHarness.tsx` as isolated test support for runner variants and scoped UI assertions.
- Updated raw dispatch and host command tests to use region-scoped selectors for repeated labels and inspector tab content.
- Updated `WorkbenchBottomPanel` component tests to use the same region-scoped bottom drawer queries as the product UI contract.
- Wrote the interaction evidence and host-command split back to [../../../docs/ssot/runtime/17-playground-product-workbench.md](../../../docs/ssot/runtime/17-playground-product-workbench.md).
- Consumed the proposal into `spec.md` TD-007A, the UI selector scoping contract and this verification note.

Commands run:

- `rtk pnpm -C packages/logix-playground exec vitest run test/raw-dispatch-advanced.contract.test.tsx test/host-command-output.contract.test.tsx` first reproduced the two selector drift failures: raw dispatch was no longer visible from the default State lane, and global `Diagnostics` matched both inspector and bottom drawer buttons.
- `rtk pnpm -C packages/logix-playground exec vitest run test/raw-dispatch-advanced.contract.test.tsx test/host-command-output.contract.test.tsx` passed after scoping raw dispatch to inspector `Action workbench` and bottom diagnostics to `Workbench bottom console`: 2 files, 2 tests.
- `rtk pnpm -C packages/logix-playground exec vitest run test/interaction-evidence-matrix.contract.test.tsx test/program-session-runner.contract.test.ts src/internal/components/RuntimeInspector.test.tsx test/action-panel-dispatch.contract.test.tsx test/host-command-output.contract.test.tsx test/raw-dispatch-advanced.contract.test.tsx` passed: 6 files, 19 tests.
- `rtk pnpm -C packages/logix-playground exec vitest run src/internal/components/WorkbenchBottomPanel.test.tsx test/interaction-evidence-matrix.contract.test.tsx test/host-command-output.contract.test.tsx test/raw-dispatch-advanced.contract.test.tsx` passed after the component test selector sweep: 4 files, 11 tests.
- `rtk pnpm -C packages/logix-playground typecheck` initially failed because the new test support helper referenced global `expect`; it passed after importing `expect` from `vitest`. It also passed after the component test selector sweep.
- `rtk pnpm -C packages/logix-playground typecheck:test` initially failed for the same helper issue; it passed after the same fix. It also passed after the component test selector sweep.
- `rtk pnpm -C packages/logix-playground test` passed before and after the final selector sweep: 36 files, 95 tests.
- A concurrent run of `rtk pnpm -C packages/logix-playground test` with both typecheck commands timed out once in `test/public-surface.contract.test.ts` on the root dynamic import check. `rtk pnpm -C packages/logix-playground exec vitest run test/public-surface.contract.test.ts --reporter=dot` passed alone, and a subsequent sequential `rtk pnpm -C packages/logix-playground test` passed again: 36 files, 95 tests.

Focused checks:

- Reflected action and curated Driver share the same session evidence path.
- History replay reconstructs state without leaking replay dispatch logs as current operation evidence.
- Scenario driver steps wait for dispatch settle before expectations read state.
- Runtime dispatch failure preserves previous state and records `dispatch failed` evidence.
- Reset clears old dispatch logs and action history.
- Unknown raw dispatch input reports an error without calling the runner or recording dispatch accepted evidence.
- Check and Trial write Diagnostics output and do not create action dispatch logs.

Known verification noise:

- Existing Logix React render-phase sync blocking warnings and React `act(...)` warnings still print in package UI tests. The commands above exited 0 after the fixes.

## 2026-04-29 T139-T140 Actual Resizable Panels Closure

Commands run:

- Red check: `rtk pnpm -C packages/logix-playground test -- --run src/internal/layout/ResizableWorkbench.test.tsx --reporter=dot` failed before implementation because `ResizableWorkbench` exposed no semantic resize separators and reported no panel resize state.
- `rtk pnpm -C packages/logix-playground test -- --run src/internal/layout/ResizableWorkbench.test.tsx --reporter=dot` passed: 1 file, 3 tests.
- `rtk pnpm -C packages/logix-playground test -- --run src/internal/layout/ResizableWorkbench.test.tsx src/internal/components/RuntimeInspector.test.tsx src/internal/components/WorkbenchBottomPanel.test.tsx src/internal/components/ActionManifestPanel.test.tsx src/internal/editor/MonacoSourceEditor.test.tsx --reporter=dot` passed: 5 files, 17 tests. Existing Logix React render-phase sync warnings printed in `RuntimeInspector.test.tsx`.
- `rtk pnpm -C packages/logix-playground typecheck` passed.
- `rtk pnpm -C examples/logix-react typecheck` passed.
- `rtk pnpm -C packages/logix-playground build` passed.
- `rtk pnpm -C examples/logix-react test:browser:playground` passed and includes `PASS resizable workbench handles`.
- `rtk agent-browser --session logix-166 open http://127.0.0.1:5173/playground/logix-react.local-counter`, `snapshot -c -d 5` and a read-only geometry `eval` confirmed the running 5173 route exposes all three resize separators, starts the command bar at `y=0`, keeps state layout at `220 / 380 / 240`, and has `scrollHeight=768` for a `768px` viewport.

Focused checks:

- `ResizableWorkbench` now uses `react-resizable-panels` `Group`, `Panel` and `Separator` primitives for the horizontal Files/Source/Runtime inspector group and vertical Body/Bottom drawer group.
- The visible handles are semantic separators named `Resize files panel`, `Resize runtime inspector` and `Resize bottom drawer`.
- Drag completion normalizes pixel sizes and dispatches `resizeWorkbenchLayout` through `PlaygroundShell`, keeping Files width, Runtime inspector width and Bottom drawer height in `PlaygroundWorkbenchProgram.layout`.
- The direct Playwright route contract drags all three handles at `1366x768`, waits for the root layout state data attributes to change, asserts the corresponding region grows, then rechecks non-overlap and page overflow.

## 2026-04-29 T001-T006/T028-T035 US2 Layout And Component Split

Commands run:

- Red check: `pnpm -C packages/logix-playground test -- --run src/internal/layout/ResizableWorkbench.test.tsx --reporter=dot` failed before implementation because `packages/logix-playground/src/internal/layout/ResizableWorkbench.tsx` did not exist.
- Red check: `pnpm -C packages/logix-playground test -- --run workbench-layout.contract.test.tsx --reporter=dot` failed before implementation because the five `data-playground-region` shell regions were absent.
- Red check: `pnpm -C packages/logix-playground test -- --run workbench-layout.contract.test.tsx --reporter=dot` failed after the first selector test update because `Program result` lacked `data-playground-section="run-result"`.
- Red check: `pnpm -C packages/logix-playground test -- --run workbench-layout.contract.test.tsx --reporter=dot` failed after the tab selector test update because bottom drawer tabs lacked `data-playground-tab`.
- `pnpm -C packages/logix-playground test -- --run workbench-layout.contract.test.tsx --reporter=dot` passed: 1 file, 1 test.
- `pnpm -C packages/logix-playground test -- --run workbench-state.contract.test.ts workbench-layout.contract.test.tsx default-ui-hierarchy.contract.test.tsx host-command-output.contract.test.tsx action-panel-dispatch.contract.test.tsx raw-dispatch-advanced.contract.test.tsx action-payload-input.contract.test.tsx src/internal/layout/ResizableWorkbench.test.tsx src/internal/components/WorkbenchBottomPanel.test.tsx --reporter=dot` passed: 9 files, 15 tests.
- `pnpm -C packages/logix-playground typecheck` passed.

Focused checks:

- `ResizableWorkbench` owns the desktop shell and exposes stable region selectors for top command bar, files panel, source editor, runtime inspector and bottom evidence drawer.
- `layoutState.ts` owns defaults, min/max limits and clamp rules that are now consumed by the `react-resizable-panels` implementation.
- `PlaygroundShell` now composes `HostCommandBar`, `FilesPanel`, `SourcePanel`, `RuntimeInspector` and `WorkbenchBottomPanel` through `ResizableWorkbench`.
- `PlaygroundWorkbenchProgram` stores panel sizes, collapsed flags, inspector selection and bottom tab state; the UI consumes layout and bottom tab state.
- `RuntimeInspector`, `ProgramPanel` and `WorkbenchBottomPanel` expose stable section or tab selectors for state, actions, run result, diagnostics summary and current bottom drawer tabs.

Deferred:

- `data-playground-section="scenario"` remains deferred until US5 introduces real Scenario UI.
- Browser overflow, scroll ownership and non-overlap assertions remain deferred to T113 through T116.

Known verification noise:

- Existing React `act(...)` warnings and Logix React render-phase sync blocking warnings still print in several UI tests. The focused commands exit 0.

## 2026-04-29 T094-T106 Monaco Editor Foundation

Commands run:

- Red check: `pnpm -C packages/logix-playground test -- --run src/internal/editor/MonacoSourceEditor.test.tsx src/internal/components/SourcePanel.test.tsx src/internal/components/ActionManifestPanel.test.tsx raw-dispatch-advanced.contract.test.tsx --reporter=dot` failed before implementation because `MonacoSourceEditor.tsx` did not exist and source/payload/raw dispatch still used direct textareas.
- `pnpm install --offline` completed to refresh package links after adding `monaco-editor` and `@monaco-editor/react`; pnpm printed existing bin-link warnings for `examples/logix-sandbox-mvp` Vitest and root `speckit-kit`.
- `pnpm -C packages/logix-playground test -- --run src/internal/editor/MonacoSourceEditor.test.tsx src/internal/components/SourcePanel.test.tsx src/internal/components/ActionManifestPanel.test.tsx raw-dispatch-advanced.contract.test.tsx --reporter=dot` passed: 4 files, 6 tests.
- `pnpm -C packages/logix-playground typecheck` passed.

Focused checks:

- `packages/logix-playground/package.json` now declares `monaco-editor` and `@monaco-editor/react`.
- `MonacoSourceEditor` is the package-owned editor adapter with stable virtual file URI mapping, model sync for all workspace files, type-bundle extraLib installation and bounded textarea fallback.
- `monacoWorkers.ts` and `workers/ts.worker.ts` provide package-owned worker routing and TypeScript worker boot path.
- `scripts/generate-monaco-type-bundle.ts` generates the checked-in package-owned Monaco extraLib bundle from workspace package dists/src plus approved local pnpm dependency types. Current generated metadata: 1759 files, 10,767,270 bytes, packages `@logixjs/core`, `@logixjs/form`, `@logixjs/react`, `@logixjs/sandbox`, `@standard-schema/spec`, `@types/react`, `@types/react-dom`, `csstype`, `effect`, `fast-check`, `mutative`, `use-sync-external-store`.
- `SourcePanel`, JSON payload editing and advanced raw dispatch now render through `MonacoSourceEditor`.

Manual/browser note:

- Browser-level Monaco completion and diagnostics remain covered by implementation path and typecheck only in this slice. The examples browser runner has been unstable in prior attempts; final browser verification is tracked under T113-T116/T089.

## 2026-04-29 T059-T066 US5 Scenario Playback

Commands run:

- Red check: `pnpm -C packages/logix-playground test -- --run project.contract.test.ts workbench-state.contract.test.ts src/internal/scenario/scenarioRunner.test.ts src/internal/components/RuntimeInspector.test.tsx src/internal/components/WorkbenchBottomPanel.test.tsx --reporter=dot` failed before implementation because `scenarioRunner.ts` did not exist, `scenarioExecution` state was absent and Scenario UI/bottom tab were absent.
- Red check: `pnpm -C examples/logix-react test -- --run playground-registry.contract.test.ts --reporter=dot` failed before implementation because local-counter had no `scenarios` metadata.
- `pnpm -C packages/logix-playground test -- --run project.contract.test.ts workbench-state.contract.test.ts src/internal/scenario/scenarioRunner.test.ts src/internal/components/RuntimeInspector.test.tsx src/internal/components/WorkbenchBottomPanel.test.tsx --reporter=dot` passed: 5 files, 17 tests.
- `pnpm -C examples/logix-react test -- --run playground-registry.contract.test.ts --reporter=dot` passed: 1 file, 7 tests.
- `pnpm -C packages/logix-playground typecheck` passed.
- `pnpm -C examples/logix-react typecheck` passed.

Focused checks:

- `PlaygroundProject` now accepts optional `scenarios` product metadata with driver, wait, settle, observe and expect step variants.
- `scenarioModel.ts` owns UI/product-local Scenario playback result types. No core/react/sandbox public Scenario type was added.
- `scenarioRunner.ts` maps driver steps through `resolveDriverAction`, supports scenario payload override, bounds settle timeout and classifies `expect` mismatch as `scenario-expectation` product failure.
- `WorkbenchInspectorState` now carries serializable `scenarioExecution` state and `setScenarioExecution` reducer.
- `RuntimeInspector` renders `data-playground-section="scenario"` through a `Scenarios` region.
- `WorkbenchBottomPanel` now includes the `Scenario` tab and renders per-step status, duration and failure detail.
- `examples/logix-react/src/playground/projects/local-counter/scenarios.ts` provides the `counter-demo` scenario and the project declaration imports it as author-side metadata, not as `/src/scenarios.ts` virtual runtime source.

Boundary checks:

- Scenario output is a product playback result, not a Run/Check/Trial report.
- The focused Scenario runner test asserts the serialized result contains no `controlPlaneReport` or `verdict` on expectation failure.
- Scenario execution currently runs through existing session dispatch callbacks. Phase 9 projection can classify the resulting evidence for 165 without making Scenario declarations truth inputs.

## 2026-04-29 T067-T074 US6 Service Source Files

Commands run:

- Red check: `pnpm -C packages/logix-playground test -- --run project.contract.test.ts src/internal/source/serviceFiles.test.ts src/internal/components/FilesPanel.test.tsx project-snapshot.contract.test.ts --reporter=dot` failed before implementation because `serviceFiles.ts` did not exist, missing service references were not rejected and `FilesPanel` did not expose service groups.
- Red check: `pnpm -C examples/logix-react test -- --run playground-registry.contract.test.ts --reporter=dot` failed before registry wiring because `logix-react.service-source` was absent.
- `pnpm -C packages/logix-playground test -- --run project.contract.test.ts src/internal/source/serviceFiles.test.ts src/internal/components/FilesPanel.test.tsx project-snapshot.contract.test.ts --reporter=dot` passed: 4 files, 17 tests.
- `pnpm -C examples/logix-react test -- --run playground-registry.contract.test.ts --reporter=dot` passed: 1 file, 8 tests.
- `pnpm -C packages/logix-playground typecheck` passed.
- `pnpm -C examples/logix-react typecheck` initially failed because the registry index union widened after adding service-source; the test now resolves local-counter through the registry API for the fixture assertion.
- `pnpm -C examples/logix-react typecheck` passed.

Focused checks:

- `PlaygroundProject` now accepts optional `serviceFiles` metadata, and normalization rejects references that do not point at existing virtual source files.
- `serviceFiles.ts` normalizes service paths, builds file navigation groups and classifies service-source failures as `service-source`.
- `FilesPanel` groups service source files under their service metadata while preserving normal file selection.
- Service source edits still use the existing `PlaygroundWorkspace.editFile` revision path; `project-snapshot.contract.test.ts` remains green.
- `examples/logix-react/src/playground/projects/service-source/` now uses author-side `files.ts`, `service-files.ts` and `sources/src/services/search.service.ts`.
- `examples/logix-react/src/playground/registry.ts` registers `logix-react.service-source`.

Boundary checks:

- Service role metadata affects navigation and validation hints only.
- Service source files remain ordinary `PlaygroundFile` entries in `ProjectSnapshot.files`.
- No core/react/sandbox service mock or service source public API was added.

## 2026-04-29 T075-T079 Phase 9 Workbench Projection

Commands run:

- Red check: `pnpm -C packages/logix-playground test -- --run src/internal/summary/workbenchProjection.test.ts src/internal/components/WorkbenchBottomPanel.test.tsx derived-summary.contract.test.ts shape-separation.contract.test.ts --reporter=dot` failed before implementation because Driver/Scenario did not produce debug-event-batch truth input, explicit Playground evidence gaps were absent, compile failures were not projected and bottom Trace/Snapshot lanes did not show projection classification.
- Red check: `pnpm -C packages/logix-core test -- --run test/internal/Workbench/Workbench.authorityBundle.contract.test.ts --reporter=dot` failed before repo-internal 165 support because explicit `evidence-gap` truth input was not handled by the projection kernel.
- `pnpm -C packages/logix-core test -- --run test/internal/Workbench/Workbench.authorityBundle.contract.test.ts test/internal/Workbench/Workbench.findingAuthority.contract.test.ts --reporter=dot` passed: 2 files, 5 tests.
- `pnpm -C packages/logix-playground test -- --run src/internal/summary/workbenchProjection.test.ts src/internal/components/WorkbenchBottomPanel.test.tsx derived-summary.contract.test.ts shape-separation.contract.test.ts --reporter=dot` passed: 4 files, 12 tests.
- `pnpm -C packages/logix-core typecheck` passed.
- `pnpm -C packages/logix-playground typecheck` passed.

Focused checks:

- Core repo-internal workbench authority now accepts explicit `evidence-gap` truth inputs and projects them into evidence-gap findings. This is repo-internal kernel support, not a public runtime API.
- `workbenchProjection.ts` now projects Program session state as run-result, Driver/Scenario product execution evidence as `debug-event-batch`, Check/Trial as control-plane reports, and Playground missing-authority states as explicit evidence gaps.
- Missing action manifest, unavailable Check, unavailable startup Trial, compile failure and preview-only failure are now classified separately.
- `derivedSummary.ts` remains JSON-safe and continues to avoid private diagnostic report-looking shapes for Program session output.
- `WorkbenchBottomPanel` Trace lane shows authority and evidence-gap classifications; Snapshot lane includes projection session/gap counts.

Boundary checks:

- Driver declarations, Scenario declarations, Scenario steps and Service role metadata are not truth inputs.
- Driver/Scenario execution enters the bundle only after it becomes session output or stable debug-event-batch evidence.
- `expect` remains product failure; it is not converted into `runtime.compare` or a control-plane verdict.

## 2026-04-29 T037/T108-T112 US2 Pressure Fixtures And Stable DOM Readability

Commands run:

- Red check: `pnpm -C examples/logix-react test -- --run playground-registry.contract.test.ts --reporter=dot` failed before implementation because `logixReactPlaygroundProjectIndex` only contained `logix-react.local-counter`.
- `pnpm -C examples/logix-react typecheck` initially failed because `String.prototype.replaceAll` is outside the current examples TypeScript lib target.
- `pnpm -C examples/logix-react test -- --run playground-registry.contract.test.ts --reporter=dot` passed: 1 file, 5 tests.
- `pnpm -C examples/logix-react typecheck` passed after replacing `replaceAll` with an ES2020-compatible regex replacement.
- `pnpm -C packages/logix-playground test -- --run workbench-state.contract.test.ts workbench-layout.contract.test.tsx default-ui-hierarchy.contract.test.tsx host-command-output.contract.test.tsx action-panel-dispatch.contract.test.tsx raw-dispatch-advanced.contract.test.tsx action-payload-input.contract.test.tsx src/internal/layout/ResizableWorkbench.test.tsx src/internal/components/WorkbenchBottomPanel.test.tsx --reporter=dot` passed: 9 files, 15 tests.
- `pnpm -C packages/logix-playground typecheck` passed.

Focused checks:

- `examples/logix-react/src/playground/projects/pressure/action-dense/index.ts` registers `logix-react.pressure.action-dense` with 74 reflected actions and pressure metadata matching `visual-pressure-cases/01-action-dense.md`.
- `examples/logix-react/src/playground/projects/pressure/state-large/index.ts` registers `logix-react.pressure.state-large` with 420 state-node pressure metadata.
- `examples/logix-react/src/playground/projects/pressure/trace-heavy/index.ts` registers `logix-react.pressure.trace-heavy` with 1200 trace-event pressure metadata.
- `examples/logix-react/src/playground/projects/pressure/diagnostics-dense/index.ts` registers `logix-react.pressure.diagnostics-dense` with 64 diagnostic-row pressure metadata.
- `examples/logix-react/src/playground/projects/pressure/scenario-driver-payload/index.ts` registers `logix-react.pressure.scenario-driver-payload` with 8500-byte payload pressure metadata.
- `examples/logix-react/src/playground/registry.ts` exposes all five pressure projects through the same registry and generated-index-ready project index used by docs consumers.
- `examples/logix-react/test/browser/playground-ui-contract.browser.test.tsx` now contains browser contract assertions for default shell regions and pressure routes, but it is not counted as passing evidence in this slice.
- Package-level DOM tests cover the stable workbench regions, state/actions/run-result/diagnostics selectors and bottom tab selectors for T037's stable jsdom path.

Browser runner status:

- `pnpm -C examples/logix-react test -- --project browser --run test/browser/playground-ui-contract.browser.test.tsx --testTimeout=10000 --reporter=dot` initially hung with no test output for roughly 120 seconds and was terminated by killing the stuck Vitest process.
- After removing the polling assertion, the same command failed quickly because Vite optimized `use-sync-external-store/shim/with-selector`, reloaded the test, then React reported `Invalid hook call` from `useSyncExternalStoreWithSelector` inside `PlaygroundShell`.
- A subsequent run reached real assertions and reported `document.scrollingElement.scrollHeight` at 1242 against viewport 897. The layout was fixed by making the page root a single `h-dvh overflow-hidden` flex shell and making `ResizableWorkbench` consume parent height instead of adding its own viewport height.
- The same run also reported strict-mode multi-match on the project id text in the pressure route browser test. The browser contract now asserts unique shell regions instead of project id text.
- After clearing `examples/logix-react/node_modules/.vite/vitest`, `pnpm -C examples/logix-react test -- --project browser --run test/browser/playground-ui-contract.browser.test.tsx --testTimeout=10000 --reporter=dot` again hung with no test output for roughly 60 seconds and was terminated by killing the stuck Vitest process.
- Existing browser command `pnpm -C examples/logix-react test -- --project browser --run test/browser/playground-preview.contract.test.tsx --testTimeout=10000 --reporter=dot` also hung with no test output for roughly 60 seconds and was terminated by killing the stuck Vitest process.
- Browser overflow, scroll ownership and non-overlap acceptance remain open under T113 through T116. Current passing evidence is registry-level route availability plus jsdom/package DOM selectors.

## 2026-04-29 T107/T113-T116 Browser UI Contract Files And Runner Blocker

Commands run:

- `pnpm -C examples/logix-react test -- --project browser --run test/browser/playground-ui-contract.browser.test.tsx test/browser/playground-inspector-scroll.browser.test.tsx test/browser/playground-evidence-drawer.browser.test.tsx --testTimeout=10000 --reporter=dot` started Chromium and printed `Re-optimizing dependencies because lockfile has changed`, then produced no test-level output for roughly 35 seconds.
- The hung browser run was terminated by killing the pnpm/Vitest/Chromium processes. The final exit code was 143.

Focused checks:

- Stable region selectors are implemented in the workbench shell: top command bar, files panel, source editor, runtime inspector and bottom evidence drawer.
- `playground-ui-contract.browser.test.tsx` now asserts the required region selectors and page overflow boundary.
- `playground-inspector-scroll.browser.test.tsx` now asserts Runtime inspector action/state local scroll ownership under pressure fixtures.
- `playground-evidence-drawer.browser.test.tsx` now asserts bottom Diagnostics and Trace lanes keep overflow inside the drawer.

Blocker:

- Vitest Browser Mode remained unstable in this workspace during this diagnostic slice. It launched Chromium but hung before reporter-level test progress for the 166 Playground browser suite.
- T113-T115 browser assertions were landed first. The final browser acceptance path was later moved to the direct Playwright route contract recorded below.

## 2026-04-29 T047-T049/T051/T056-T058 US4 Driver Metadata MVP

Commands run:

- Red check: `pnpm -C packages/logix-playground test -- --run project.contract.test.ts src/internal/driver/driverRunner.test.ts src/internal/components/RuntimeInspector.test.tsx --reporter=dot` failed before implementation because `src/internal/driver/driverRunner.ts` did not exist and `RuntimeInspector` had no `Drivers` region.
- Red check: `pnpm -C examples/logix-react test -- --run playground-registry.contract.test.ts --reporter=dot` failed before implementation because local-counter had no curated `drivers` metadata.
- `pnpm -C packages/logix-playground test -- --run project.contract.test.ts src/internal/driver/driverRunner.test.ts src/internal/components/RuntimeInspector.test.tsx --reporter=dot` passed: 3 files, 9 tests.
- `pnpm -C examples/logix-react test -- --run playground-registry.contract.test.ts --reporter=dot` passed: 1 file, 6 tests.
- `pnpm -C packages/logix-playground typecheck` initially failed because the new RuntimeInspector test used a non-existent `driver` log source.
- `pnpm -C packages/logix-playground test -- --run project.contract.test.ts src/internal/driver/driverRunner.test.ts src/internal/components/RuntimeInspector.test.tsx action-panel-dispatch.contract.test.tsx raw-dispatch-advanced.contract.test.tsx action-payload-input.contract.test.tsx workbench-layout.contract.test.tsx --reporter=dot` initially failed because `workbench-layout.contract.test.tsx` queried the global `increment` text after the new Driver section also displayed the same action tag.
- `pnpm -C packages/logix-playground test -- --run project.contract.test.ts src/internal/driver/driverRunner.test.ts src/internal/components/RuntimeInspector.test.tsx action-panel-dispatch.contract.test.tsx raw-dispatch-advanced.contract.test.tsx action-payload-input.contract.test.tsx workbench-layout.contract.test.tsx --reporter=dot` passed after scoping the action-name assertions to the `Actions` region: 7 files, 16 tests.
- `pnpm -C packages/logix-playground typecheck` passed after keeping Driver execution logs on the existing `runner` source vocabulary.
- `pnpm -C examples/logix-react typecheck` passed.

Focused checks:

- `PlaygroundProject` now accepts optional `drivers` product metadata with dispatch operation, payload descriptor, examples and read anchors.
- `driverModel.ts` owns UI-local Driver aliases over `PlaygroundDriver`; no core/react/sandbox public Driver type was added.
- `driverRunner.ts` resolves curated dispatch drivers into existing Program session actions without exposing raw action objects as the default UI path.
- `RuntimeInspector` renders a `Drivers` region with `data-playground-section="drivers"` and routes driver execution through the existing session dispatch path.
- `RawDispatchPanel` remains hidden by default in the RuntimeInspector driver test.
- `examples/logix-react/src/playground/projects/local-counter/drivers.ts` provides the `increase` curated driver and the project declaration imports it as author-side metadata, not as `/src/drivers.ts` virtual runtime source.

Deferred:

- T050 and T054 were completed in the follow-up state slice below.

## 2026-04-29 T050/T053-T055 US4 Driver And Raw Dispatch State Closure

Commands run:

- Red check: `pnpm -C packages/logix-playground test -- --run workbench-state.contract.test.ts raw-dispatch-advanced.contract.test.tsx --reporter=dot` failed before implementation because `inspector.driverExecution` was absent and Raw dispatch expansion was not driven by workbench state.
- `pnpm -C packages/logix-playground test -- --run workbench-state.contract.test.ts raw-dispatch-advanced.contract.test.tsx src/internal/components/RuntimeInspector.test.tsx --reporter=dot` passed: 3 files, 5 tests.
- `pnpm -C packages/logix-playground test -- --run workbench-state.contract.test.ts project.contract.test.ts src/internal/driver/driverRunner.test.ts src/internal/components/RuntimeInspector.test.tsx action-manifest.contract.test.ts src/internal/components/ActionManifestPanel.test.tsx action-panel-dispatch.contract.test.tsx raw-dispatch-advanced.contract.test.tsx action-payload-input.contract.test.tsx workbench-layout.contract.test.tsx --reporter=dot` passed: 10 files, 22 tests.
- `pnpm -C packages/logix-playground typecheck` passed.
- `pnpm -C examples/logix-react test -- --run playground-registry.contract.test.ts --reporter=dot` passed: 1 file, 6 tests.
- `pnpm -C examples/logix-react typecheck` passed.
- Sweep for `Runtime.playground`, `Runtime.driver`, `Runtime.scenario`, `runtime.playground`, `runtime.driver`, `runtime.scenario`, `Program.capabilities.mocks`, `source: 'driver'` and `/src/drivers.ts` under core/react/sandbox/playground/example sources found only negative assertions or verification notes.

Focused checks:

- `WorkbenchInspectorState` now carries serializable `driverExecution` state with idle/running/passed/failed variants.
- `PlaygroundWorkbenchProgram` exposes `setDriverExecution` and keeps Driver selection/execution state in the same workbench module as other host UI state.
- `RawDispatchPanel` no longer owns its expansion state with local React state; `RuntimeInspector` receives `advancedDispatchExpanded` and dispatches `setAdvancedDispatchExpanded`.
- Existing `ActionManifestPanel` tests cover fallback authority and evidence gap display; existing payload tests cover JSON validation errors.
- Existing raw dispatch test proves Raw dispatch is hidden by default and rejects action tags missing from the current manifest.

Deferred:

- Driver execution currently maps curated dispatch drivers to the same session dispatch path. Dedicated Driver result presentation can still be expanded in Phase 9 projection work.

## 2026-04-29 T009/T010 Workbench Host State Foundation

Commands run:

- Red check: `pnpm -C packages/logix-playground test -- --run workbench-state.contract.test.ts --reporter=dot` failed as expected before implementation because `initialPlaygroundWorkbenchState.layout` was absent.
- `pnpm -C packages/logix-playground test -- --run workbench-state.contract.test.ts --reporter=dot` passed: 1 file, 3 tests.
- `pnpm -C packages/logix-playground test -- --run workbench-state.contract.test.ts workbench-layout.contract.test.tsx default-ui-hierarchy.contract.test.tsx host-command-output.contract.test.tsx src/internal/components/WorkbenchBottomPanel.test.tsx --reporter=dot` passed: 5 files, 8 tests.
- `pnpm -C packages/logix-playground typecheck` passed.

Focused checks:

- `packages/logix-playground/src/internal/state/workbenchTypes.ts` now defines `WorkbenchLayoutState`, `EditorHostState`, `WorkbenchInspectorState`, inspector tabs and editor status types.
- `packages/logix-playground/src/internal/state/workbenchProgram.ts` now keeps layout, editor and inspector host state in the Logix workbench module.
- New reducer actions cover layout resizing, collapsed state, editor host state, inspector tab selection, advanced raw dispatch expansion, selected driver and selected scenario.
- Existing workbench layout, default hierarchy, host command output and bottom drawer component tests still pass.

Known verification noise:

- Existing React `act(...)` warnings still print in UI tests. The focused command exits 0.

## 2026-04-29 T016/T017/T128 ActionPanelViewModel And 167A Slice

Commands run:

- Red check: `pnpm -C packages/logix-playground test -- --run action-manifest.contract.test.ts --reporter=dot` failed as expected before implementation because fallback view model had no `authorityStatus`, entry `authority` or `evidenceGaps`.
- Red check: `pnpm -C packages/logix-playground test -- --run action-manifest.contract.test.ts src/internal/components/ActionManifestPanel.test.tsx --reporter=dot` failed as expected before UI implementation because fallback authority and evidence gap were not visible.
- Red check: `pnpm -C packages/logix-playground typecheck` failed as expected before 167A helper export because `@logixjs/core/repo-internal/reflection-api` did not export `MinimumProgramActionManifest`.
- `pnpm -C packages/logix-playground test -- --run action-manifest.contract.test.ts src/internal/components/ActionManifestPanel.test.tsx --reporter=dot` passed: 2 files, 3 tests.
- `pnpm -C packages/logix-playground test -- --run action-manifest.contract.test.ts action-manifest-wrapper.contract.test.ts src/internal/components/ActionManifestPanel.test.tsx action-panel-dispatch.contract.test.tsx raw-dispatch-advanced.contract.test.tsx action-payload-input.contract.test.tsx --reporter=dot` passed: 6 files, 10 tests.
- `pnpm -C packages/logix-playground typecheck` passed.
- `pnpm -C packages/logix-core test -- --run test/internal/Reflection/ProgramManifest.Minimum.test.ts --reporter=dot` passed: 1 file, 2 tests.
- `pnpm -C packages/logix-core typecheck` passed.

Focused checks:

- `packages/logix-playground/src/internal/action/actionManifest.ts` now exposes `ActionPanelViewModel` and consumes the 167A `MinimumProgramActionManifest` type from repo-internal core reflection API.
- `projectReflectedActionManifest(...)` projects 167A manifest input into UI state without fallback evidence gaps.
- `deriveFallbackActionManifestFromSnapshot(...)` labels every regex-derived action as `fallback-source-regex` and emits `missing-action-manifest` evidence gap.
- `ActionManifestPanel` renders authority status, entry authority and evidence gaps while keeping JSON parse-only payload handling local to 166.
- `RawDispatchPanel` is gated by the same `ActionPanelViewModel.actions` tags.
- `actionManifestWrapper` now calls `Reflection.extractMinimumProgramActionManifest(Program, { programId, revision })` rather than constructing a private manifest-like DTO.

Sweep classification:

- `rg -n "PlaygroundActionManifest|payloadType"` under `packages/logix-playground` returns no hits after the rename.
- Remaining `fallback-source-regex` and `ActionPanelViewModel` hits are the implementation, tests, active spec/contracts/data model, and verification notes.

## 2026-04-29 G0 Runtime Proof Slice

Commands run:

- `pnpm -C packages/logix-playground typecheck` passed.
- `pnpm -C packages/logix-playground test -- --run --reporter=dot` passed: 20 files, 44 tests.
- `pnpm -C examples/logix-react typecheck` passed.
- `pnpm -C examples/logix-react test -- --run playground-registry.contract.test.ts --reporter=dot` passed: 1 file, 3 tests.

Focused checks:

- Production `PlaygroundShell` no longer imports `createDefaultProgramSessionRunner` or `runLocalProgramSnapshot`.
- `ProjectSnapshotRuntimeInvoker` is the production host boundary for Run, dispatch, Check and Trial output classification.
- Local-counter default project no longer declares preview entry or default `App.tsx`.
- Local-counter virtual Program entry is `/src/main.program.ts`.
- Session opens auto-ready, source edit restarts session, and reset-only UI replaces Start/Close controls.
- Lifecycle commit predicate covers current `projectId + revision + sessionId + opSeq`.

Negative sweep classification:

- Public runtime API sweep only found forbidden-shape documentation, archived/planning notes, or tests that assert absence.
- `createDefaultProgramSessionRunner` and `runLocalProgramSnapshot` have no production source hits.
- `counterStep` remains only in example source, not in production execution simulation.
- `/src/program.ts` remains only in spec negative/historical notes after example and package tests moved to `/src/main.program.ts`.
- `Start session`, `Close session`, and `No active session` remain only in forbidden-shape docs or negative assertions.

Known verification noise:

- Some React tests still print existing `act(...)` warnings and Logix React render-phase sync blocking warnings. The commands exit 0.

Deferred:

- Monaco editor verification is not run in this slice.
- Browser/layout pressure routes are not implemented in this slice.
- Driver and Scenario playback verification is not run in this slice.

## 2026-04-29 T018 Local-counter Source Authority Split

Commands run:

- Red check: `pnpm -C examples/logix-react test -- --run playground-registry.contract.test.ts --reporter=dot` failed as expected before implementation with missing `projects/local-counter/sources/src/logic/localCounter.logic.ts`.
- `pnpm -C examples/logix-react typecheck` passed.
- `pnpm -C examples/logix-react test -- --run playground-registry.contract.test.ts --reporter=dot` passed: 1 file, 4 tests.

Focused checks:

- Local-counter project entry now resolves through `examples/logix-react/src/playground/projects/local-counter/index.ts`.
- Virtual source mapping lives in `examples/logix-react/src/playground/projects/local-counter/files.ts`.
- Author-side source authority lives under `examples/logix-react/src/playground/projects/local-counter/sources/src/**`.
- Registry test verifies `/src/main.program.ts` and `/src/logic/localCounter.logic.ts` content equals the checked-in author-side source files.

## 2026-04-29 T017a Standard Virtual Source Path Helpers

Commands run:

- Red check: `pnpm -C packages/logix-playground test -- --run project.contract.test.ts --reporter=dot` failed as expected before implementation because `playgroundProjectSourcePaths` was absent.
- `pnpm -C packages/logix-playground test -- --run project.contract.test.ts public-surface.contract.test.ts --reporter=dot` passed: 2 files, 8 tests.
- `pnpm -C packages/logix-playground typecheck` passed.
- `pnpm -C examples/logix-react typecheck` passed.
- `pnpm -C examples/logix-react test -- --run playground-registry.contract.test.ts --reporter=dot` passed: 1 file, 4 tests.

Focused checks:

- `packages/logix-playground/src/Project.ts` now exports `playgroundProjectSourcePaths` with `mainProgram`, `previewApp`, `logic(name)`, `service(name)` and `fixture(name)`.
- Helper-generated paths cover `/src/main.program.ts`, `/src/logic/*.logic.ts`, `/src/services/*.service.ts`, `/src/fixtures/*.fixture.ts` and `/src/preview/App.tsx`.
- Invalid source names such as `../escape` throw before producing a virtual path.
- Local-counter `files.ts` consumes `playgroundProjectSourcePaths` for Program and logic virtual paths.

## 2026-04-29 T124-T125 Run Runtime Contract

Commands run:

- `pnpm -C packages/logix-playground test -- --run program-run-runtime.contract.test.ts program-runner.contract.test.ts runtime-consumption.contract.test.tsx --reporter=dot` passed: 3 files, 5 tests.

Focused checks:

- Production `PlaygroundShell` uses `createProjectSnapshotRuntimeInvoker` for Run and has no `runLocalProgramSnapshot` import.
- `program-run-runtime.contract.test.ts` proves Run compiles both r0 and source-edited r1 snapshots and returns different Runtime output values.
- The generated wrapper still calls `Logix.Runtime.run(Program, main, options)`.

## 2026-04-29 US3 Check/Trial Command Output

Commands run:

- Red check: `pnpm -C packages/logix-playground test -- --run host-command-output.contract.test.tsx --reporter=dot` failed as expected before implementation because the `Check report` region only contained its placeholder heading.
- `pnpm -C packages/logix-playground test -- --run host-command-output.contract.test.tsx default-ui-hierarchy.contract.test.tsx action-panel-dispatch.contract.test.tsx --reporter=dot` passed: 3 files, 6 tests. Existing React `act(...)` and render-phase sync warnings were printed, exit code 0.
- `pnpm -C packages/logix-playground typecheck` passed after fixing reducer literal typing and ES2021-compatible test code.
- `pnpm -C packages/logix-playground test -- --run host-command-output.contract.test.tsx program-run-runtime.contract.test.ts project.contract.test.ts --reporter=dot` passed: 3 files, 7 tests.

Focused checks:

- Check and startup Trial buttons now execute through `ProjectSnapshotRuntimeInvoker` and render `VerificationControlPlaneReport` summary fields in the Program result panel.
- Workbench state now tracks Check and Trial command result state separately from Run state.
- Test override support can inject a fake runtime invoker without replacing production sandbox-backed runtime consumption.
- Bottom Diagnostics tab now renders Check and Trial report detail from the same workbench command state.

Additional commands run:

- `pnpm -C packages/logix-playground test -- --run host-command-output.contract.test.tsx workbench-layout.contract.test.tsx --reporter=dot` passed: 2 files, 2 tests.
- `pnpm -C packages/logix-playground test -- --run host-command-output.contract.test.tsx program-run-runtime.contract.test.ts program-runner.contract.test.ts runtime-consumption.contract.test.tsx project.contract.test.ts shape-separation.contract.test.ts derived-summary.contract.test.ts --reporter=dot` passed: 7 files, 17 tests.
- `pnpm -C examples/logix-react typecheck` passed.
- `pnpm -C examples/logix-react test -- --run playground-registry.contract.test.ts --reporter=dot` passed: 1 file, 4 tests.
- Sweep for `createDefaultProgramSessionRunner(`, `runLocalProgramSnapshot(`, `projects/local-counter.ts` and `local-counter.ts` under production Playground/example sources plus active 166 docs returned no hits.

## 2026-04-29 T034/T036 Bottom Tab Testability

Commands run:

- Red check: `pnpm -C packages/logix-playground test -- --run src/internal/components/WorkbenchBottomPanel.test.tsx --reporter=dot` initially found no files because `packages/logix-playground/vitest.config.ts` only included `test/**/*.test.*`.
- Red check after extending Vitest include to `src/**/*.test.*`: `pnpm -C packages/logix-playground test -- --run src/internal/components/WorkbenchBottomPanel.test.tsx --reporter=dot` failed as expected because `Console detail` was missing.
- `pnpm -C packages/logix-playground test -- --run src/internal/components/WorkbenchBottomPanel.test.tsx workbench-layout.contract.test.tsx --reporter=dot` passed: 2 files, 2 tests.
- `pnpm -C packages/logix-playground typecheck` passed.

Focused checks:

- `WorkbenchBottomPanel` now exposes stable `Console detail`, `Diagnostics detail`, `Trace detail` and `Snapshot summary` regions.
- Package Vitest config now includes `src/**/*.test.ts` and `src/**/*.test.tsx` so component tests under `src/internal/**` are collected.

## 2026-04-29 T013 Session Log Helpers

Commands run:

- Red check: `pnpm -C packages/logix-playground test -- --run logs.contract.test.ts --reporter=dot` failed as expected before implementation because `makeLifecycleLog` was absent.
- `pnpm -C packages/logix-playground test -- --run logs.contract.test.ts program-session-state.contract.test.ts program-session-console.contract.test.tsx action-panel-dispatch.contract.test.tsx --reporter=dot` passed: 4 files, 9 tests.
- `pnpm -C packages/logix-playground typecheck` passed.

Focused checks:

- `packages/logix-playground/src/internal/session/logs.ts` now owns lifecycle, operation and runner-error log entry helpers.
- `programSession.ts` uses the helpers for session start, restart, dispatch accept, dispatch completion, dispatch failure and stale logs while preserving existing messages.
- `PlaygroundShell` uses the runner-error helper for dispatch failure logs.

## 2026-04-29 Final Focused Gate For This Batch

Commands run:

- `pnpm -C packages/logix-playground typecheck` passed.
- `pnpm -C packages/logix-playground test -- --run logs.contract.test.ts host-command-output.contract.test.tsx program-run-runtime.contract.test.ts program-runner.contract.test.ts runtime-consumption.contract.test.tsx project.contract.test.ts shape-separation.contract.test.ts derived-summary.contract.test.ts src/internal/components/WorkbenchBottomPanel.test.tsx workbench-layout.contract.test.tsx program-session-state.contract.test.ts program-session-console.contract.test.tsx action-panel-dispatch.contract.test.tsx --reporter=dot` passed: 13 files, 28 tests.
- `pnpm -C examples/logix-react typecheck` passed.
- `pnpm -C examples/logix-react test -- --run playground-registry.contract.test.ts --reporter=dot` passed: 1 file, 4 tests.
- Final sweep for `createDefaultProgramSessionRunner(`, `runLocalProgramSnapshot(`, `projects/local-counter.ts`, `local-counter.ts` and quoted bare `/src/program.ts` under production Playground/example sources, package tests and active 166 docs only hit this verification note.

## 2026-04-29 Phase 10 Full Verification Pass

Commands run:

- `pnpm -C packages/logix-playground typecheck` passed.
- `pnpm -C packages/logix-playground test -- --run --cache '--project=!browser*' --silent=passed-only --reporter=dot --hideSkippedTests` passed: 35 files, 81 tests.
- `pnpm -C examples/logix-react typecheck` passed.
- `pnpm typecheck` passed across 26 workspace projects.
- `pnpm lint` passed: oxlint 0 warnings/errors, eslint 0 warnings.
- `pnpm test:turbo` passed: 15 package tasks successful, then scripts Vitest passed 5 files, 16 tests.

Browser runner status:

- `pnpm -C packages/logix-react exec vitest run test/browser/browser-environment-smoke.test.tsx --project browser --reporter=dot --testTimeout=10000` passed: 1 file, 1 test. The shared browser provider can launch Chromium in this workspace.
- `pnpm -C examples/logix-react test -- --project browser --run test/browser/playground-preview.contract.test.tsx --testTimeout=10000 --reporter=dot` reached assertions in one earlier diagnostic run after dependency optimization and failed on stale assertions: duplicate `Result` region text, duplicate project id text and Monaco source editor no longer being a textarea.
- `pnpm -C examples/logix-react test -- --project browser --run test/browser/playground-ui-contract.browser.test.tsx --testTimeout=10000 --reporter=dot` still timed out with no reporter-level test progress after 60 seconds. Wrapper exit: code 143, timedOut=true.
- `pnpm -C examples/logix-react test -- --project browser --run test/browser/playground-ui-contract.browser.test.tsx -t "default desktop workbench exposes required UI contract regions without page overflow" --testTimeout=10000 --reporter=dot` still timed out with no test-body output after 90 seconds. Wrapper exit: code 143, timedOut=true.
- `pnpm -C examples/logix-react test -- --project browser --run test/browser/playground-preview.contract.test.tsx -t "bare Playground route opens the default React project" --testTimeout=10000 --reporter=dot` still timed out with no reporter-level test progress after 180 seconds. Wrapper exit: code 143, timedOut=true.
- `pgrep -af 'vitest|Chromium|Google Chrome|playwright|pnpm'` showed no Vitest/Chromium/pnpm residue after wrapper termination. The only matching persistent process was an unrelated LM Studio crashpad handler in an earlier check.

Browser conclusion:

- T113-T115 browser assertion files are landed and remain the intended SC-004/SC-013 proof path.
- Passing browser evidence for `examples/logix-react` is unavailable in this workspace because the examples browser project stalls before reporter-level progress on Playground route tests. The root cause is constrained to examples browser project collect/startup or route module graph, not the global browser provider.
- `spec.md` remains `Active`; T093 is not complete because SC-004 and SC-013 require browser/layout acceptance evidence.

Negative sweep classification:

- UI contract sweep: `rg -n "scrollOwners|requiredVisibleRegions|forbiddenOverflow|routeSuggestion" specs/166-playground-driver-scenario-surface/ui-contract.md specs/166-playground-driver-scenario-surface/visual-pressure-cases` found all five visual pressure cases with scroll owners, visible regions, forbidden overflow and deterministic routes.
- Public runtime API sweep for `Runtime.playground`, `Runtime.driver`, `Runtime.scenario`, lowercase runtime variants and `Program.capabilities.*` only hit forbidden-shape docs, active spec constraints, archived/review-plan discussion or sandbox negative tests. No production public runtime API hit.
- Start/Close/No active session sweep only hit forbidden-shape docs, active spec constraints, quickstart checks and negative tests. No production/default UI hit.
- Runtime consumption sweep for `createDefaultProgramSessionRunner(`, `runLocalProgramSnapshot(` and `counterStep =` only hit the local-counter example source and a Monaco fixture string. No production fake runner or local Run implementation hit.
- Source layout sweep for bare `/src/program.ts` only hit historical, migration-debt or negative-contract docs under active 166 artifacts. No example or package source uses it as the Logic-first entry.
- Monaco sweep shows `MonacoSourceEditor`, package-owned workers, `typescriptDefaults`, generated extraLibs and dependency declarations under `packages/logix-playground`; textarea hits are bounded fallback code, fallback tests, or historical/contract text.

Phase 10 closure before direct Playwright acceptance:

- T080-T092 are complete for the current implementation state.
- T093 remained open at this point because SC-004/SC-013 still needed passing browser/layout acceptance evidence. The follow-up direct Playwright acceptance below completes that evidence.

## 2026-04-29 Direct Playwright Browser Acceptance Closure

Commands run:

- Red check: `pnpm exec tsx examples/logix-react/test/browser/playground-route-contract.playwright.ts` failed before implementation because the direct Playwright route contract file did not exist.
- `pnpm -C examples/logix-react test:browser:playground` initially failed after reaching the real page because `getByRole('button', { name: 'Run' })` matched the host command, the curated Driver button and the Scenario button. The contract now scopes host command assertions to `data-playground-region="top-command-bar"`.
- `pnpm -C examples/logix-react test:browser:playground` passed.
- `pnpm -C examples/logix-react typecheck` passed.

Focused checks:

- `examples/logix-react/test/browser/playground-route-contract.playwright.ts` starts the examples Vite dev server directly, launches Chromium through the `playwright` library and verifies `/playground` routes at `1366x768`.
- The direct browser contract covers the default desktop shell regions, required stable `data-playground-region` boxes, positive dimensions, non-overlap ordering and forbidden page-level overflow.
- The contract visits all five pressure routes from `ui-contract.md`: action-dense, state-large, trace-heavy, diagnostics-dense and scenario-driver-payload.
- The contract asserts local scroll ownership for `RuntimeInspector.ActionsList` and `RuntimeInspector.StateTree`.
- The contract asserts Diagnostics and Trace bottom drawer content stays contained inside the bottom evidence drawer and does not create page-level overflow.
- The contract asserts bare `/playground` opens the default `logix-react.local-counter` project and exposes `/src/main.program.ts`.

Browser conclusion:

- Vitest Browser Mode remains unstable for the examples Playground route suite in this workspace, as recorded above.
- SC-004 and SC-013 now use the direct Playwright route contract as the passing browser/layout acceptance evidence.
- T093 is complete and `spec.md` is moved to `Done`.

## 2026-04-29 Post-closure Visual Alignment Review

Review inputs:

- Original source images under `specs/166-playground-driver-scenario-surface/assets/playground-variants/`.
- Markdown contracts under `specs/166-playground-driver-scenario-surface/visual-pressure-cases/`.
- Current routes at `http://localhost:5173/playground/logix-react.pressure.*` with `1366x768` viewport.
- Playwright DOM measurements for top command bar, files panel, source editor, runtime inspector, bottom evidence drawer and inspector sections.

Result at review time:

- The pre-Phase-11 implementation satisfied the weak direct Playwright route contract recorded above: five regions exist, coarse ordering holds and page-level vertical overflow is contained.
- The pre-Phase-11 implementation did not satisfy the visual pressure intent captured by the five source images and pressure Markdown contracts.
- The specific gaps are recorded in [visual-alignment-gap-analysis.md](./visual-alignment-gap-analysis.md).

Key measurements from the reviewed pre-Phase-11 implementation:

- Outer route header height is about `113px`.
- Workbench starts around `y=125` instead of the viewport top.
- Workbench height is about `631px` at a `768px` viewport.
- Main three-column body height is about `345px`.
- Runtime inspector state and action sections each get about `173px`.
- All five pressure routes opened with bottom `Console` selected, despite pressure metadata declaring Snapshot, Trace, Diagnostics or Scenario for several cases.

Gap classification:

- This is a Playground product UI and acceptance gap.
- It does not require new Runtime public API, sandbox product API, Driver/Scenario authoring API or fake runtime output.
- The primary cause is acceptance weakness: T108 through T116 and the direct Playwright route contract proved route/region availability and coarse overflow, but did not prove visual pressure defaults, source-image proportions, materialized data profiles, sticky regions or dense data-surface shape.

Follow-up recorded at review time:

- Phase 11 was added to [tasks.md](../tasks.md) as an open visual pressure alignment slice.
- `spec.md` status is back to `Active, visual alignment reopened`.
- `ui-contract.md` now links this gap note and clarifies that future visual pressure closure must prove the source images and pressure Markdown contracts, not only region selector presence.

## 2026-04-29 Phase 11 Visual Alignment Closure

Implementation summary:

- `PlaygroundPage` normal route now renders the workbench directly as a full-viewport surface; `HostCommandBar` is the single top header.
- `examples/logix-react/src/playground/routes.tsx` no longer passes `backHref="/"` or `backLabel="Examples"` into the Playground route.
- Pressure fixtures now materialize virtual files and visible pressure data for actions, state tree, trace rows, diagnostics rows, driver payload and scenario steps.
- `RuntimeInspector` now has State, Actions, Drivers, Result, Diagnostics and Scenario tabs.
- `WorkbenchBottomPanel` now renders pressure-aware Trace, Diagnostics and Scenario detail surfaces.
- The browser preview contract uses deterministic runner/invoker overrides for component-level route assertions; the real sandbox/runtime path remains covered by the direct Playwright route contract.

Refreshed visual evidence:

- [current-screenshots/action-dense.png](./current-screenshots/action-dense.png)
- [current-screenshots/state-large.png](./current-screenshots/state-large.png)
- [current-screenshots/trace-heavy.png](./current-screenshots/trace-heavy.png)
- [current-screenshots/diagnostics-dense.png](./current-screenshots/diagnostics-dense.png)
- [current-screenshots/scenario-driver-payload.png](./current-screenshots/scenario-driver-payload.png)
- [current-screenshots/current-5173-local-counter.png](./current-screenshots/current-5173-local-counter.png)

Commands run:

- `rtk pnpm -C examples/logix-react exec vitest run test/browser/playground-preview.contract.test.tsx --reporter=dot` passed: 1 file, 4 tests. Existing render-phase sync warnings remain.
- `rtk pnpm -C examples/logix-react test:browser:playground` passed. It visited default, bare and all five pressure routes, asserted default shell geometry, pressure defaults, strict local overflow, dark Monaco, pressure file tree and runtime session behavior.
- `rtk pnpm -C packages/logix-playground typecheck` passed.
- `rtk pnpm -C examples/logix-react typecheck` passed.
- `rtk pnpm -C packages/logix-playground test -- --run src/internal/components/RuntimeInspector.test.tsx src/internal/components/WorkbenchBottomPanel.test.tsx src/internal/components/ActionManifestPanel.test.tsx src/internal/editor/MonacoSourceEditor.test.tsx --reporter=dot` passed: 4 files, 14 tests. Existing render-phase sync warnings remain.
- `rtk pnpm -C packages/logix-playground build` passed.
- `rtk pnpm -C examples/logix-react build` passed with the existing Vite chunk-size warning.

5173 note:

- `http://127.0.0.1:5173/playground/logix-react.local-counter` was reachable during verification.
- `agent-tmux read --json %134` returned `pane target "%134" not found` in this tmux server, so no new process was started in that pane.
- Screenshots were refreshed against the reachable 5173 server.

Closure:

- Phase 11 tasks T129 through T138 are complete in [tasks.md](../tasks.md#phase-11-visual-pressure-alignment-reopen).
- `spec.md` status is returned to `Done, Phase 11 visual pressure alignment closed`.
- [visual-alignment-gap-analysis.md](./visual-alignment-gap-analysis.md) is retained as the historical reopening record and now includes the Phase 11 closure note.

## 2026-04-29 Startup Trial Wrapper Regression

Issue:

- Clicking `Trial` in the real Playground route reported `编译失败: trial wrapper` with `Multiple exports with the same name "default"`.
- Root cause was a wrapper ownership mismatch: Playground generated a `Runtime.trial(...)` executable wrapper with `export default`, then passed it into `SandboxClient.trial()`, which generates its own trial wrapper and `export default`.

Implementation summary:

- `createControlPlaneRunner().trialStartup(...)` now sends plain current `ProjectSnapshot` Program module source to `transport.trial({ moduleExport: "Program" })`.
- `createProgramWrapperSource(...)` now only owns `run` and `check` executable wrappers. Startup Trial wrapper ownership remains in `SandboxClient.trial()`.
- Added Playground boundary coverage asserting Trial module code contains `export const Program` and does not contain `export default` or `Runtime.trial`.
- Added sandbox browser coverage for Program module source that imports both `effect` and `@logixjs/core`.
- Added examples route coverage that clicks top `Trial`, waits for `trial/startup PASS` in Diagnostics and asserts the duplicate default export failure text is absent.

Commands run:

- Red check: `rtk pnpm -C packages/logix-playground test -- --run test/trial-startup.boundary.test.ts --reporter=dot` failed before implementation because `trialStartup` still passed a module string containing `export default` and `Runtime.trial`.
- `rtk pnpm -C packages/logix-playground test -- --run test/trial-startup.boundary.test.ts --reporter=dot` passed: 1 file, 2 tests.
- `rtk pnpm -C packages/logix-sandbox test:browser -- --run test/browser/sandbox-worker-multi-kernel.test.ts --reporter=dot` passed: browser project reported 8 files, 20 tests.
- `rtk pnpm -C examples/logix-react test:browser:playground` first reached a valid Trial report but failed due to an overly broad `PASS` text assertion in the new route test.
- `rtk pnpm -C examples/logix-react test:browser:playground` passed after narrowing the assertion. It included `PASS default top trial diagnostics`.
- `rtk pnpm -C packages/logix-playground typecheck` passed.
- `rtk pnpm -C packages/logix-playground typecheck:test` passed.
- `rtk pnpm -C packages/logix-sandbox typecheck:test` passed.
- `rtk pnpm -C examples/logix-react typecheck` passed.
