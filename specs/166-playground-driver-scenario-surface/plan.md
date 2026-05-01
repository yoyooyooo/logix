# Implementation Plan: Professional Logic Playground vNext

**Branch**: `166-playground-driver-scenario-surface` | **Date**: 2026-04-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/166-playground-driver-scenario-surface/spec.md`

## Summary

166 is now the next implementation phase for Logix Playground. The goal is to turn the current MVP into a professional Logic-first runtime workbench:

```text
source snapshot
  -> auto-ready Program session
  -> reflected actions / curated drivers / scenarios
  -> state / result / logs / trace / diagnostics
  -> Runtime Workbench Kernel projection
```

The implementation should remove normal-path UI preview assumptions, make the layout resizable and clarify every command and session state. Driver/Scenario remains in scope, but it is now one capability lane under the broader vNext workbench.

The implementation must also replace the current MVP simulation path with real lower-layer runtime consumption. 166 owns the host/source adapter from `ProjectSnapshot` to executable module and UI projection. It consumes `Runtime.run`, `Runtime.openProgram`, `Runtime.check`, `Runtime.trial`, 165 projection and 167 reflection outputs. It does not own terminal action reflection, payload validation, runtime event collection DTOs or shared CLI/Devtools interpretation.

The first closure is Runtime Proof First. UI pressure, Monaco completion, Driver, Scenario and docs-ready polish can proceed as work, but they do not close 166 until the current `ProjectSnapshot` is proven through existing Runtime faces.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19, Effect 4.0.0-beta.28
**Primary Dependencies**: `@logixjs/core`, `@logixjs/react`, `@logixjs/sandbox`, `effect`, React DOM
**Layout Dependency**: Prefer `react-resizable-panels` or a local equivalent thin wrapper in `packages/logix-playground`; do not couple `@logixjs/playground` to shadcn app-local components.
**Editor Dependency**: Use Monaco as the default source editor through `monaco-editor` and `@monaco-editor/react` or an equivalent thin internal adapter.
**Testing**: Vitest, Testing Library, direct Playwright browser route contract for examples Playground layout, focused non-browser tests for runner/session/projection behavior.
**Target Package**: `packages/logix-playground`
**Dogfood Host**: `examples/logix-react` `/playground/:id`
**Docs Consumer**: `apps/docs` later consumes the same package/registry and is not part of first closure.
**Performance Goals**: Disabled Playground capabilities create zero `logix-core` hot-path overhead. Active workbench output is bounded and stable-id based.
**Constraints**: No new public `Runtime.playground`, `Runtime.driver`, `Runtime.scenario`, `Program.capabilities.mocks` or sandbox-owned product API.
**Scale/Scope**: One Logic-first Runtime Proof project for G0 closure, then Monaco/layout pressure, then one Driver, one Scenario, one Service Source File proof.
**Reflection Dependency**: [../167-runtime-reflection-manifest/spec.md](../167-runtime-reflection-manifest/spec.md) owns terminal reflection. This plan only requires 167A: the minimum Program action manifest slice plus cross-tool consumption law.
**Runtime Consumption Dependency**: Existing `Runtime.run`, `Runtime.openProgram`, `Runtime.check` and `Runtime.trial` are the execution authority. Package-local simulated runner code is test support or migration debt only.

## Constitution Check

- **Runtime-first**: Pass. Playground consumes Program/Runtime/control-plane outputs and does not create a second runtime.
- **Public surface minimalism**: Pass if Driver/Scenario/Service metadata stays under `@logixjs/playground` project declaration and no core/react/sandbox public API is added.
- **Diagnostic authority**: Pass if Check/Trial reports keep their shape and Playground does not invent report schema.
- **Dogfood rule**: Required. Layout state, selected lanes, session state and command status should stay in the Playground workbench Logix module where practical.
- **Effect V4**: Required for any runner/control-plane code.
- **Forward-only**: Required. Remove obsolete UI preview and Start/Close session assumptions rather than preserving compatibility.

Gate risks:

- If the 167 minimum Program action manifest slice is unavailable during implementation, regex fallback may remain only as labelled fallback with evidence gap and removal task.
- If browser transport remains flaky, default Logic-first proof must still pass through local deterministic tests and example route UI tests that do not depend on Sandpack.
- If `ProjectSnapshot -> executable module` bundling cannot support a case, classify it as compile/transport failure in Playground. Do not replace the Runtime output with source-string simulation.

Gate matrix:

| Gate | Closure |
| --- | --- |
| G0 Runtime Proof | Run, dispatch, Check and Trial execute current `ProjectSnapshot` through existing Runtime faces; source edit changes Runtime output; fake runner and local-counter parsing are absent from production UI |
| G1 Execution Boundary | `ProjectSnapshotRuntimeInvoker` only returns `runtimeOutput`, `controlPlaneReport`, `transportFailure` or `evidenceGap` |
| G2 Reflection Authority | Action Workbench consumes 167A minimum manifest when available; regex fallback is evidence gap only |
| G3 Lifecycle Commit | `(projectId, revision, sessionId, opSeq)` gates all async UI mutations |
| G4 Projection Classification | Outputs are classified as runtime output, control-plane report, debug evidence, context ref, host view state or evidence gap |
| G5 Driver/Scenario Quarantine | Driver follows G0/G2/G3; Scenario follows Driver output classification |
| G6 UI Pressure | Visual pressure fixtures prove layout only |

## Phase 0 - Research Decisions

Research output: [research.md](./research.md)

Decisions to apply:

1. **Layout library**: Use `react-resizable-panels` or a local wrapper with equivalent semantics. shadcn Resizable should not be imported directly into the package because shadcn is an app-local component system.
2. **Preview boundary**: Preview stays optional. Logic-first examples do not include default `App.tsx`.
3. **Session semantics**: Auto-ready and reset-only is the normal path.
4. **Command semantics**: Run, Check and Trial must write visible shape-separated outputs. Unwired commands leave the primary toolbar.
5. **Action authority**: 167 minimum Program action manifest slice is the required target for 166 MVP. Regex source parsing is a temporary fallback only.
6. **Driver/Scenario**: Product metadata under Playground project declarations, not authoring API.
7. **Service source**: Ordinary source files with role metadata, not mock APIs.
8. **Editor**: Monaco is the normal source editor. The old sandbox MVP editor, worker and type-bundle pipeline are reference evidence for implementation, but ownership moves to `packages/logix-playground`.
9. **Runtime execution**: 166 consumes existing Runtime faces. `runLocalProgramSnapshot`, `createDefaultProgramSessionRunner` and local-counter `counterStep` parsing are not acceptable production defaults.

## Phase 1 - Design Artifacts

Design artifacts:

- [data-model.md](./data-model.md)
- [contracts/README.md](./contracts/README.md)
- [quickstart.md](./quickstart.md)
- [ui-contract.md](./ui-contract.md)
- [assets/playground-variants/README.md](./assets/playground-variants/README.md)

Visual pressure assets:

- [01-action-dense.png](./assets/playground-variants/01-action-dense.png) - large reflected action manifest.
- [02-state-large.png](./assets/playground-variants/02-state-large.png) - deeply nested state projection.
- [03-trace-heavy.png](./assets/playground-variants/03-trace-heavy.png) - expanded trace evidence drawer.
- [04-diagnostics-dense.png](./assets/playground-variants/04-diagnostics-dense.png) - dense Check/Trial diagnostics.
- [05-scenario-driver-payload.png](./assets/playground-variants/05-scenario-driver-payload.png) - curated Drivers, Scenario playback and payload editing.

Visual pressure contracts:

- [01-action-dense.md](./visual-pressure-cases/01-action-dense.md) - reflected action list scroll ownership.
- [02-state-large.md](./visual-pressure-cases/02-state-large.md) - nested state tree scroll ownership.
- [03-trace-heavy.md](./visual-pressure-cases/03-trace-heavy.md) - trace table drawer ownership.
- [04-diagnostics-dense.md](./visual-pressure-cases/04-diagnostics-dense.md) - diagnostics summary/detail split.
- [05-scenario-driver-payload.md](./visual-pressure-cases/05-scenario-driver-payload.md) - Driver payload and Scenario step lanes.

Primary implementation lanes:

```text
packages/logix-playground/src/
  Project.ts
  Playground.tsx
  internal/
    components/
    editor/
    layout/
    action/
    driver/
    scenario/
    session/
    runner/
    source/
    state/
    summary/

examples/logix-react/src/playground/
  registry.ts
  projects/
```

Standard virtual source paths for new Logic-first projects:

```text
/src/main.program.ts
/src/logic/<domain>.logic.ts
/src/services/<service>.service.ts
/src/fixtures/<fixture>.fixture.ts
/src/preview/App.tsx
```

Rules:

- `*.program.ts` is the Program assembly entry and default active file.
- `*.logic.ts` contains Logix logic units and domain runtime behavior.
- `*.service.ts` and `*.fixture.ts` are ordinary editable source files in the same snapshot.
- `src/preview/App.tsx` exists only for explicit preview-capable projects.
- Driver/Scenario declarations live beside the project declaration as `drivers.ts` and `scenarios.ts`, not inside the virtual runtime source tree by default.

Monaco editor requirements:

```text
ProjectSnapshot.files
  -> Monaco models keyed by file:/// virtual paths
  -> TypeScript language service sees the same virtual source graph
  -> generated type bundle / extraLibs for @logixjs/*, effect, React and approved deps
  -> source edits update ProjectSnapshot revision
  -> Run / Check / Trial / Driver / Scenario consume the edited snapshot
```

Rules:

- Monaco is the default editor for every source file.
- Textarea is only a visible fallback when Monaco fails.
- TypeScript/JavaScript files must expose Monaco language-service completion and diagnostics.
- Type bundle loading must be local/offline for docs-ready routes.
- Monaco diagnostics are editor feedback and do not replace Runtime.check or Runtime.trial.

## Phase 2 - Implementation Strategy

### Slice A - Logic-first Baseline

Goal: make one project open without preview and prove source edit, auto session restart, action dispatch and bounded output.

Work:

- Remove default `App.tsx` and preview capability from the local-counter Logic-first project.
- Rename the local-counter Program virtual entry from `/src/program.ts` to `/src/main.program.ts`.
- Move local-counter project declaration to the standard author-side directory structure.
- Ensure workspace active file prefers Program entry for Logic-first projects.
- Create ready session on open.
- Remove Start/Close controls.
- Keep Reset session.
- Make source edit auto restart the session and write one lifecycle log.

### Slice A2 - Runtime Proof Baseline

Goal: replace local-counter simulation with actual Runtime execution for the current snapshot.

Work:

- Build a package-owned `ProjectSnapshotRuntimeInvoker` that turns current `ProjectSnapshot` into an executable module through existing sandbox transport or local test harness.
- Limit invoker outputs to `runtimeOutput`, `controlPlaneReport`, `transportFailure` or `evidenceGap`.
- Make `Run` call the compiled module's `Runtime.run(Program, main)` path and remove `runLocalProgramSnapshot` from production UI code.
- Make Program session dispatch call the compiled module's `Runtime.openProgram(Program)` path and remove `createDefaultProgramSessionRunner` from production UI code.
- Keep `Runtime.check` and `Runtime.trial(mode="startup")` as the only diagnostic authorities.
- Classify compile, runtime, worker, serialization and timeout failures as `transportFailure`, `runtimeOutput`, `controlPlaneReport` or `evidenceGap` depending on source authority.
- Keep fake runners only under tests/fixtures with names that make fixture status explicit.
- Ensure the invoker does not own action authority, payload validation, operation vocabulary, state fabrication, session reducer state, Driver semantics or Scenario semantics.

### Slice A3 - Lifecycle Commit Predicate

Goal: prevent stale async results from mutating current Playground state after source edit or reset.

Work:

- Add session-root coordinate `{ projectId, revision, sessionId, opSeq }` to Run, Check, Trial, dispatch, Driver and Scenario async results.
- Accept current state/result/log/trace/diagnostics mutation only when all coordinate fields match the current session root.
- Convert non-matching completions into bounded stale lifecycle log or evidence gap.
- Add tests for stale Run, stale dispatch and reset/source-edit races.

### Slice B - Professional Layout

Goal: replace fixed grid with resizable workbench.

Work:

- Add internal resizable shell components.
- Top bar shows project id, revision, session status and command status.
- Left Files, center Source, right Runtime inspector, bottom evidence drawer.
- Store layout state in the workbench Logix module where practical.
- Ensure bottom tabs switch visible content.
- Apply pressure-case layout constraints from [ui-contract.md](./ui-contract.md) and [visual-pressure-cases/](./visual-pressure-cases/): long action lists, large state trees, large trace tables, dense diagnostics and payload/scenario lanes must each own bounded local scrolling and avoid page-level overflow.

### Slice B2 - Monaco Editing

Goal: replace textarea editing with package-owned Monaco editor surfaces and TypeScript language-service backed source experience.

Work:

- Add Monaco dependencies and internal editor adapter under `packages/logix-playground/src/internal/editor`.
- Port the sandbox MVP worker and type-bundle approach into package-owned code.
- Build Monaco models from current `ProjectSnapshot.files`.
- Keep model URI, active file and source edit revision aligned.
- Add generated type bundle support for `@logixjs/*`, `effect`, React and approved transitive types.
- Show editor fallback/status without blocking Program execution when Monaco or type bundle initialization fails.
- Reuse the same Monaco adapter for source files, service files, fixture files, JSON payload editors and advanced raw dispatch editors.

### Slice C - Command Outputs

Goal: every command has a clear output destination.

Work:

- Run writes `Run Result`.
- Check writes Diagnostics summary/detail.
- Trial writes Diagnostics summary/detail.
- Commands are disabled with reasons when unavailable.
- Program hint panel is removed or converted into real Program manifest/result panel.
- Run/Check/Trial outputs are sourced from existing Runtime faces, not package-local result fabrication.

### Slice D - Action Workbench

Goal: make reflected actions a credible internal dogfood surface.

Work:

- Consume 167 minimum Program action manifest slice when available.
- Keep regex fallback only as explicit temporary path.
- Void action direct dispatch.
- Non-void JSON payload parsing; full summary/validation belongs to 167.
- Raw dispatch hidden advanced and manifest-gated.
- Dispatch uses the real Program session runner backed by `Runtime.openProgram`.

### Slice E - Driver And Scenario

Goal: make docs-friendly no-UI interaction available without raw dispatch as the default path.

Work:

- Extend `PlaygroundProject` with optional driver/scenario metadata.
- Add driver panel in Runtime inspector.
- Add scenario lane in bottom drawer or inspector.
- Implement run-all and step-by-step with timeout-bounded wait/settle.
- Product failures stay separate from control-plane verdicts.

### Slice F - Service Source Files

Goal: let examples prove service-dependent behavior can be edited through the same snapshot.

Work:

- Extend `PlaygroundProject` with optional service file role metadata.
- Show service groups in Files.
- Validate service source before execution where applicable.
- Ensure source edit follows same snapshot revision and auto restart path.

### Slice G - Workbench Projection

Goal: align result, diagnostics, trace and snapshot lanes with 165.

Work:

- Build authority bundle adapter from Run/Check/Trial/Driver/Scenario outputs.
- Mark source digest/span as context refs.
- Express missing manifest, compile failure, preview-only failure and unavailable reports as gaps or product failures.
- Remove private report-looking shapes from Playground summary.

## Project Structure

```text
packages/logix-playground/
  src/
    Project.ts
    Playground.tsx
    internal/
      components/
        PlaygroundShell.tsx
        RuntimeInspector.tsx
        WorkbenchBottomPanel.tsx
      layout/
        ResizableWorkbench.tsx
        layoutState.ts
      action/
        actionManifest.ts
        payloadInput.ts
      driver/
        driverModel.ts
        driverRunner.ts
      scenario/
        scenarioModel.ts
        scenarioRunner.ts
      session/
        programSession.ts
        logs.ts
      runner/
        projectSnapshotRuntimeInvoker.ts
        programSessionRunner.ts
        controlPlaneRunner.ts
      source/
        serviceFiles.ts
      state/
        workbenchProgram.ts
      summary/
        workbenchProjection.ts

examples/logix-react/
  src/playground/
    projects/
      local-counter/
        index.ts
        files.ts
        drivers.ts
        scenarios.ts
        service-files.ts
        sources/
          src/main.program.ts
          src/logic/localCounter.logic.ts
      async-driver/
        index.ts
        files.ts
        drivers.ts
        scenarios.ts
        sources/
          src/main.program.ts
          src/logic/asyncDriver.logic.ts
          src/services/search.service.ts
      service-source/
        index.ts
        files.ts
        service-files.ts
        sources/
          src/main.program.ts
          src/logic/serviceSource.logic.ts
          src/services/search.service.ts
```

## Complexity Tracking

No intentional constitution violations.

Accepted temporary debt:

- Regex fallback for action reflection can remain only until the 167 minimum manifest slice lands. It must be named and documented as fallback, not authority.
- Existing sandbox transport can remain as transport if Logic-first default path does not rely on Sandpack packager or network.
- Existing local-counter fake Run/session runner can remain only as test fixture or migration debt. It must not be imported by the production `PlaygroundShell` default path after Slice A2.

## Verification Strategy

Required commands:

```bash
rtk pnpm -C packages/logix-playground typecheck
rtk pnpm -C packages/logix-playground test -- --run --cache '--project=!browser*' --silent=passed-only --reporter=dot --hideSkippedTests
rtk pnpm -C examples/logix-react typecheck
rtk pnpm typecheck
rtk pnpm lint
rtk pnpm test:turbo
```

Browser/layout verification when implementation changes visible layout:

```bash
rtk pnpm -C examples/logix-react test:browser:playground
```

The direct Playwright contract starts the examples Vite dev server and verifies the 166 route/layout acceptance surface at `1366x768`. Vitest Browser Mode tests may remain as component/browser coverage, but the SC-004/SC-013 acceptance gate uses the direct Playwright command.

UI contract verification:

```bash
rtk rg -n "scrollOwners|requiredVisibleRegions|forbiddenOverflow|routeSuggestion" specs/166-playground-driver-scenario-surface/ui-contract.md specs/166-playground-driver-scenario-surface/visual-pressure-cases
```

Browser/layout assertions should cover the five pressure routes or equivalent deterministic fixtures from [ui-contract.md](./ui-contract.md).

Runtime Proof First assertions:

```bash
rtk rg -n "createDefaultProgramSessionRunner\\(|runLocalProgramSnapshot\\(|counterStep\\s*=\\s*" packages/logix-playground/src examples/logix-react/src/playground
```

The remaining allowed hits must be fixture-only, test-only or example source declarations that do not feed production Run/session output.

Current 166 implementation status:

- `packages/logix-playground/src/internal/runner/projectSnapshotRuntimeInvoker.ts` is now the production host boundary from `ProjectSnapshot` to Runtime faces.
- `PlaygroundShell` no longer imports package-local fake session runner or local Run projection.
- `defaultProgramSessionRunner.ts` and `localProgramRun.ts` were removed from production source.
- The default local-counter project is Logic-first: no preview entry, no default `App.tsx`, Program entry is `/src/main.program.ts`.
- Resizable layout, stable UI contract selectors and five pressure projects are implemented. Browser route/layout acceptance is covered by `pnpm -C examples/logix-react test:browser:playground`, with final command status recorded in `notes/verification.md`.
- Monaco is the package-owned editor path for source, service, fixture, JSON payload and advanced raw dispatch surfaces. The checked-in extraLib bundle is generated from workspace packages plus approved local dependency types.
- Driver, Scenario, Service Source Files and 165 Workbench projection integration are implemented as Playground product metadata/projection adapters, with Driver/Scenario declarations and service role metadata kept out of Runtime truth inputs.

Negative sweep:

```bash
rtk rg -n "Runtime\\.playground|Runtime\\.driver|Runtime\\.scenario|runtime\\.playground|runtime\\.driver|runtime\\.scenario|Program\\.capabilities\\.mocks|Start session|Close session|No active session|Sandpack.*diagnostic|Driver/Scenario report schema|createDefaultProgramSessionRunner\\(|runLocalProgramSnapshot\\(|counterStep\\s*=\\s*" packages/logix-core packages/logix-react packages/logix-sandbox packages/logix-playground examples/logix-react docs specs/166-playground-driver-scenario-surface
```

## Writeback Targets

- `docs/ssot/runtime/17-playground-product-workbench.md`
- `specs/166-playground-driver-scenario-surface/spec.md`
- `specs/166-playground-driver-scenario-surface/ui-contract.md`
- `specs/166-playground-driver-scenario-surface/visual-pressure-cases/*.md`
- `specs/166-playground-driver-scenario-surface/tasks.md`
- `specs/166-playground-driver-scenario-surface/notes/verification.md`
- `specs/166-playground-driver-scenario-surface/notes/perf-evidence.md`

## Planning Follow-up From Discussion

[discussion.md](./discussion.md) freezes the adopted plan-optimality-loop laws. Before implementation starts, tasks must keep G0/G1/G2/G3 ahead of Driver, Scenario and UI pressure closure.

## Post-Design Constitution Check

Pass if implementation follows this plan:

- no new core/react/sandbox public authoring APIs
- no preview authority on default Logic-first route
- no private diagnostic report schema
- no unbounded default logs/traces
- no normal-path Start/Close session controls
- all modified public docs/specs use the same Host Command, Driver, Scenario and Service Source Files terms
