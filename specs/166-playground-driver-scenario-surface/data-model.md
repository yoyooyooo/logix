# Data Model: Professional Logic Playground vNext

This document describes product/internal data shapes for 166. These are not Logix core authoring APIs unless explicitly stated as `@logixjs/playground` project declaration surface.

## PlaygroundProject

Registry-owned declaration consumed by examples and later docs.

Fields:

- `id`: stable project id.
- `files`: virtual source files.
- `program`: optional Program entry. Required for Logic-first runnable projects.
- `preview`: optional preview entry. Only present when project explicitly demonstrates UI preview.
- `capabilities`: optional flags for run/check/trial/preview.
- `drivers`: optional curated driver declarations.
- `scenarios`: optional scenario playback declarations.
- `serviceFiles`: optional service source file role metadata.
- `fixtures`: optional example-local data.

Validation:

- Logic-first projects must have `program.entry`.
- Logic-first projects should use `/src/main.program.ts` as `program.entry`.
- Logic-first projects do not need `preview.entry`.
- Preview-capable projects should place preview entry under `/src/preview/App.tsx`.
- Driver and scenario ids are unique per project.
- Service file paths must exist in `files`.
- Docs and examples must not define duplicate declarations for the same project id.

## PlaygroundFile

Virtual source file.

Fields:

- `language`: `ts`, `tsx`, `js`, `jsx`, `json`, `css` or `md`.
- `content`: current original source content in registry.
- `editable`: whether user can edit in Playground.

Rules:

- Service source files are ordinary `PlaygroundFile` entries.
- `App.tsx` is optional and belongs only to preview-capable projects.
- Standard virtual source paths use role suffixes:
  - `/src/main.program.ts`
  - `/src/logic/<domain>.logic.ts`
  - `/src/services/<service>.service.ts`
  - `/src/fixtures/<fixture>.fixture.ts`
  - `/src/preview/App.tsx`

## PlaygroundSourceLayout

Standard directory contract for docs-ready Playground projects.

User-visible virtual source tree:

```text
/src/main.program.ts
/src/logic/<domain>.logic.ts
/src/services/<service>.service.ts
/src/fixtures/<fixture>.fixture.ts
/src/preview/App.tsx
```

Author-side project declaration tree:

```text
examples/<host>/src/playground/projects/<project-id>/
  index.ts
  files.ts
  drivers.ts
  scenarios.ts
  service-files.ts
  sources/
    src/main.program.ts
    src/logic/<domain>.logic.ts
    src/services/<service>.service.ts
    src/fixtures/<fixture>.fixture.ts
    src/preview/App.tsx
```

Rules:

- `*.program.ts` is the runtime assembly entry and default active file for Logic-first projects.
- `*.logic.ts` holds Logix logic units and domain behavior.
- `*.service.ts` holds ordinary editable service implementation source.
- `*.fixture.ts` holds editable example-local data.
- `src/preview/App.tsx` exists only when `preview.entry` is declared.
- Driver and Scenario files are author-side project metadata. They are not included in `ProjectSnapshot.files` unless a future project explicitly chooses to expose them as ordinary read-only source.
- Bare `/src/program.ts` is historical/temporary debt for current implementation migration, not the recommended shape.

## ProjectSnapshot

Current execution coordinate.

Fields:

- `projectId`
- `revision`
- `files`
- `programEntry`
- `previewEntry`
- `diagnostics`
- `digest` or derived source context when available

State transitions:

```text
registry project
  -> workspace open revision r0
  -> edit file
  -> workspace revision r1
  -> auto restart ProgramSession for r1
```

Rules:

- Run, Check, Trial, Driver, Scenario and Service validation consume the same current snapshot.
- Half-edited buffers cannot be passed to runtime execution.

## ProgramSession

Auto-ready runtime window for one snapshot.

Fields:

- `sessionId`: derived from project id, revision and monotonic session sequence.
- `projectId`
- `revision`
- `status`: `ready`, `running`, `failed` or fallback `stale`.
- `operationSeq`: monotonic operation counter.
- `state`: bounded state projection.
- `lastOperation`
- `logs`: bounded session logs.
- `traces`: bounded trace refs.
- `error`: optional structured failure.

Normal transitions:

```text
open project -> ready
dispatch action -> running -> ready
run driver -> running -> ready
source edit -> ready(new session)
reset -> ready(new session)
failure -> failed or ready with operation failure, depending on failure class
```

Fallback transition:

```text
source edit during in-flight operation -> stale or canceled -> ready(new session)
```

Rules:

- The normal UI must not show closed/no-session state for valid Program projects.
- Reset creates a new session for the current revision.
- Auto restart clears action history, state, logs and traces from previous session and adds one lifecycle log.
- State and operation result come from `ProjectSnapshotRuntimeInvoker` backed by `Runtime.openProgram`, not from source-string simulation.
- Async results can update current state, result, logs, trace or diagnostics only when `projectId`, `revision`, `sessionId` and `operationSeq` match the current session root.
- Non-matching async results become bounded stale lifecycle logs or evidence gaps.

## ProjectSnapshotRuntimeInvoker

Playground-owned host invoker from `ProjectSnapshot` to existing Runtime faces.

Inputs:

- `ProjectSnapshot`
- operation kind: `run`, `dispatch`, `check` or `trialStartup`
- session id and operation sequence for session operations
- JSON payload after Playground-side parsing

Outputs:

- `runtimeOutput`
- `controlPlaneReport`
- `transportFailure`
- `evidenceGap`

Rules:

- It consumes existing `Runtime.run`, `Runtime.openProgram`, `Runtime.check` and `Runtime.trial`.
- It owns source bundling and sandbox transport classification.
- It may attach host provenance such as project id, revision and session id.
- It must not own action authority, payload validation, operation vocabulary, Program state fabrication, session reducer state, Driver semantics or Scenario semantics.
- It does not own reflection manifest, payload validation, runtime event collection or Devtools/CLI shared DTOs.
- Fake/local-counter implementations can only appear in tests or fixture support.

## HostCommandResult

Result of top-bar host commands.

Variants:

- `run-result`: run id, revision, status, bounded value or failure.
- `check-report`: current control-plane report summary/detail.
- `trial-report`: current startup trial report summary/detail.
- `reset-result`: lifecycle event for new session.
- `unavailable`: disabled reason.

Rules:

- Run result is not a diagnostic report.
- Check and Trial reports are not wrapped as Run result.
- Every visible command must write one variant or be disabled.

## ActionPanelViewModel

UI-local action panel projection. The primary authority is the 167A minimum Program action manifest slice.

Fields:

- `projectId`
- `revision`
- `selectedActionTag`
- `payloadEditorState`
- `dispatchButtonState`
- `authorityStatus`: `manifest`, `runtime-reflection`, `fallback-source-regex` or `unavailable`
- `evidenceGaps`

Derived from 167A:

- `actionTag`
- `payloadKind`: `void`, `nonVoid` or `unknown`.
- `authority`: `manifest`, `runtime-reflection` or `fallback-source-regex`.
- optional payload summary when available

Rules:

- `manifest` and `runtime-reflection` come from 167A.
- `fallback-source-regex` is temporary, must be distinguishable in diagnostics/internal state and must produce an evidence gap.
- Raw dispatch can only target manifest-gated action tags.
- Full payload summary, payload validation and example payload seed are owned by 167.
- The view model is not a shared manifest DTO and must not be consumed by CLI, Devtools or core reflection.

## InteractionDriver

Docs-friendly operation declaration.

Fields:

- `id`
- `label`
- `description`
- `operation`: `dispatch` or `invoke`.
- `actionTag` or project-local operation ref.
- `payload`
- `examples`
- `readAnchors`

Rules:

- Driver declaration is product metadata in `PlaygroundProject`.
- It does not become Logix action contract or core authoring API.
- Driver result is session output, not diagnostic authority by itself.
- Driver declarations normally live in author-side `drivers.ts`, not in the virtual runtime source tree.

## ScenarioPlayback

Product-level multi-step demo declaration.

Fields:

- `id`
- `label`
- `description`
- `steps`

Step variants:

- `driver`: reference a project-local driver.
- `wait`: wait bounded time.
- `settle`: wait for runtime/runner idle with timeout.
- `observe`: record current state/result/log/trace anchor.
- `expect`: product assertion over a read anchor.

Execution fields:

- `scenarioRunId`
- `stepResults`
- `status`
- `durationMs`
- `failure`

Rules:

- Step-by-step and run-all share execution semantics.
- Failed or timed-out step stops later steps by default.
- `expect` failure is product failure, not compare truth.
- Scenario declarations normally live in author-side `scenarios.ts`, not in the virtual runtime source tree.

## ServiceSourceFileRole

Product metadata that groups ordinary source files.

Fields:

- `id`
- `label`
- `files`

File role fields:

- `path`
- `label`
- `role`: `service-provider`, `fixture`, `test-double`, `environment` or project-local role string.
- `serviceRef`
- `schemaSummary`

Rules:

- Role metadata only affects navigation, validation hints and context refs.
- Role metadata is not workbench truth input.
- Service source file content is not workbench truth input.

## LayoutState

Playground host view state.

Fields:

- `filesWidth`
- `inspectorWidth`
- `bottomHeight`
- `filesCollapsed`
- `bottomCollapsed`
- `activeBottomTab`
- `activeInspectorTab`
- `advancedDispatchExpanded`
- `selectedDriverId`
- `selectedScenarioId`

Rules:

- Layout state should live in the Playground workbench Logix module when practical.
- Layout state is not Runtime Workbench Kernel input except as optional selection hint when explicitly allowed by 165.

## VisualPressureCase

Structured UI pressure contract derived from the visual mockups.

Fields:

- `id`
- `title`
- `sourceImage`
- `viewport`
- `activeInspectorTab`
- `activeBottomTab`
- `dataProfile`
- `scrollOwners`
- `stickyRegions`
- `requiredVisibleRegions`
- `forbiddenOverflow`
- `routeSuggestion`

Rules:

- Visual pressure cases are implementation and acceptance constraints for `packages/logix-playground`.
- They can drive dogfood fixtures, browser tests, screenshot checks and DOM overflow assertions.
- They are not runtime truth, public authoring API or Runtime Workbench Kernel input.
- Scroll owner names should map to stable DOM selectors or semantic roles in the implemented workbench.

## EditorHostState

Host state for Monaco-backed source editing.

Fields:

- `engine`: `monaco` or fallback `textarea`.
- `activeModelUri`
- `languageServiceStatus`: `idle`, `loading`, `ready` or `error`.
- `typeBundleStatus`: `idle`, `loading`, `ready`, `stale` or `error`.
- `fallbackReason`
- `loadedTypePackages`
- `diagnostics`

Rules:

- Monaco is the normal source editor engine.
- Textarea is only a degraded fallback when Monaco cannot load.
- Monaco models are created from current `ProjectSnapshot.files` virtual paths.
- TypeScript-family files must use Monaco TypeScript language service when available.
- Dependency type information is supplied by generated type bundle or equivalent `extraLibs`; it must not depend on network package loading.
- Editor diagnostics may be displayed as editor feedback or product status, but they are not Runtime control-plane diagnostics.

## WorkbenchAuthorityBundleProjection

Adapter output to 165.

Inputs:

- Run result projection.
- Check/Trial report.
- Produced evidence refs.
- Stable debug event batch.
- Evidence gaps.

Context refs:

- source snapshot digest
- source file span
- project id
- example id
- service source path

Forbidden truth inputs:

- driver declaration
- payload schema
- raw payload
- scenario declaration
- wait/settle semantics
- observe/expect semantics
- service role metadata
- service source body
- half-edited source buffer
- DOM event
- preview host protocol
