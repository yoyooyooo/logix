# Contracts: Professional Logic Playground vNext

This feature has TypeScript product/internal contracts rather than HTTP endpoints.

## Public Package Boundary Contract

Allowed public surface changes:

- `@logixjs/playground` may extend `PlaygroundProject` declaration with optional `drivers`, `scenarios` and `serviceFiles` product metadata.
- `@logixjs/playground` may expose project declaration helpers when they remain Playground product helpers.
- `@logixjs/playground` may expose `PlaygroundPage` and registry/project id consumption surface.

Forbidden public surface changes:

- `@logixjs/core` exports Driver/Scenario declarations, runners, payload schemas or result schemas.
- `@logixjs/react` exports Driver/Scenario declarations, runners, payload schemas or result schemas.
- `@logixjs/sandbox` exports Driver/Scenario declarations, runners, payload schemas or result schemas.
- `@logixjs/core`, `@logixjs/react` or `@logixjs/sandbox` exports service file declarations, mock runners, mock source schemas or mock result schemas.
- `@logixjs/core` grows `Program.capabilities.drivers`, `Program.capabilities.scenarios`, `Program.capabilities.mocks`, `Runtime.driver`, `Runtime.scenario`, `Runtime.playground` or related root APIs.
- `@logixjs/playground` exposes a public editor adapter or preview adapter contract.

## Logic-first Project Contract

Example shape:

```ts
const project = definePlaygroundProject({
  id: "logix-react.local-counter",
  files: {
    "/src/logic/localCounter.logic.ts": {
      language: "ts",
      content: logicSource,
      editable: true,
    },
    "/src/main.program.ts": {
      language: "ts",
      content: programSource,
      editable: true,
    },
  },
  program: {
    entry: "/src/main.program.ts",
  },
  capabilities: {
    run: true,
    check: true,
    trialStartup: true,
  },
})
```

Rules:

- `preview` is absent unless the project explicitly demonstrates UI preview.
- `App.tsx` is not required for Logic-first projects.
- Logic-first projects should use `/src/main.program.ts` as `program.entry`.
- Domain logic files should use `/src/logic/*.logic.ts`.
- Editable service files should use `/src/services/*.service.ts`.
- Editable fixture/env files should use `/src/fixtures/*.fixture.ts`.
- Preview-capable projects should use `/src/preview/App.tsx` as `preview.entry`.
- Driver and Scenario declarations live in author-side project metadata, usually `drivers.ts` and `scenarios.ts`, and are not virtual runtime source files by default.
- Workspace active file prefers Program entry when preview entry is absent.
- Run, Check, Trial, Driver and Scenario use the same current `ProjectSnapshot`.

## Standard Project Source Layout Contract

Recommended virtual source tree:

```text
/src/main.program.ts
/src/logic/<domain>.logic.ts
/src/services/<service>.service.ts
/src/fixtures/<fixture>.fixture.ts
/src/preview/App.tsx
```

Recommended author-side declaration tree:

```text
examples/logix-react/src/playground/projects/<project-id>/
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

- Use `playgroundProjectSourcePaths` from `@logixjs/playground/Project` for new project declarations instead of hand-writing standard virtual paths.
- `index.ts` exports the single `definePlaygroundProject(...)` value for the project.
- `files.ts` builds `PlaygroundProject.files` with the virtual paths above.
- `drivers.ts`, `scenarios.ts` and `service-files.ts` are optional product metadata modules.
- `sources/**` mirrors the virtual source tree so docs/examples can reuse the same raw source authority.
- Bare `/src/program.ts` is migration debt and should not appear in new Logic-first examples.

## Monaco Editor Contract

Required editor behavior:

- Source editing uses Monaco by default for all `PlaygroundFile` languages.
- JSON payload editors and advanced raw dispatch editors use the same package-owned Monaco adapter on the normal path.
- TypeScript-family files use Monaco TypeScript language service for completion, diagnostics, hover and navigation where available.
- JSON editors use Monaco JSON language support.
- Each `ProjectSnapshot.files` entry has a Monaco model URI derived from its virtual path, for example `file:///src/main.program.ts`.
- Relative imports between virtual files resolve through Monaco models and through the runner's virtual module resolver.
- Current edited source is synchronized into `ProjectSnapshot.files`; runtime execution must not read stale registry originals.
- Approved dependency types for `@logixjs/*`, `effect`, React and required transitive types are supplied through generated extraLibs or equivalent type bundle.

Fallback behavior:

- If Monaco fails to load, a bounded textarea fallback may appear with a visible editor status.
- If type bundle or TS worker initialization fails, source editing may continue, but TypeScript completion/diagnostics status must show the failure.
- Monaco diagnostics are editor feedback. They do not replace `Runtime.check` or `Runtime.trial`.

Reference implementation evidence:

- `examples/logix-sandbox-mvp/src/components/Editor.tsx`
- `examples/logix-sandbox-mvp/src/components/editor/monacoWorkers.ts`
- `examples/logix-sandbox-mvp/src/components/editor/workers/ts.worker.ts`
- `examples/logix-sandbox-mvp/scripts/generate-monaco-type-bundle.ts`

## Session Contract

Internal runner responsibilities:

- Create a ready session for a valid Program project on open.
- Execute dispatch against the current snapshot's compiled `Program` through `Runtime.openProgram`.
- Derive session id from project id, revision and monotonic session sequence.
- Keep monotonic operation sequence.
- Auto restart on source revision change.
- Reset session from current snapshot.
- Reject or cancel stale in-flight results that return for an old session id.
- Bound state, result, logs and trace previews.
- Never fabricate state from source strings on the production path.

Forbidden normal-path UI:

- `Start session`
- `Close session`
- `No active session`
- stale warning after ordinary source edit

Fallback stale state may still exist for race protection.

## Host Command Contract

Top-bar command output:

```text
Run
  -> Run Result panel
  -> run id / revision / status / value or failure

Check
  -> Diagnostics summary/detail
  -> VerificationControlPlaneReport

Trial
  -> Diagnostics summary/detail
  -> VerificationControlPlaneReport

Reset
  -> Program session
  -> lifecycle console log
```

Rules:

- Commands with unavailable authority are disabled with a visible reason.
- Commands must not silently mutate source snapshot.
- Check/Trial report shape stays separate from Run result.
- Run must execute through `Runtime.run(Program, main)` against the current snapshot.
- Check and Trial must consume `Runtime.check` and `Runtime.trial` reports.

## ProjectSnapshotRuntimeInvoker Contract

166 owns a Playground host invoker from current source snapshot to existing Runtime faces:

```text
ProjectSnapshot
  -> executable module bundle
  -> Runtime.run / Runtime.openProgram / Runtime.check / Runtime.trial
  -> runtimeOutput | controlPlaneReport | transportFailure | evidenceGap
```

Rules:

- The invoker owns source graph resolution, virtual module bundling, sandbox transport and worker failure classification.
- The invoker does not define new runtime semantics.
- The invoker does not define terminal reflection manifest, payload validation, operation vocabulary or runtime event collection DTOs.
- The invoker does not own session reducer state, Driver semantics or Scenario semantics.
- Compile, worker, serialization and timeout failures are Playground product failures unless they originate from `Runtime.check` or `Runtime.trial` reports.
- Test-only fake runners must be isolated from production default imports.

## Layout Contract

Normative UI contract:

- [../ui-contract.md](../ui-contract.md)
- [../visual-pressure-cases/](../visual-pressure-cases/)

Required desktop regions:

```text
TopCommandBar
FilesPanel | SourceEditor | RuntimeInspector
BottomEvidenceDrawer
```

Resizable requirements:

- Files panel width is resizable and collapsible.
- Runtime inspector width is resizable.
- Bottom evidence drawer height is resizable and minimizable.
- Resizing uses actual interactive panel primitives in `packages/logix-playground`, currently `react-resizable-panels`.
- Files, Runtime inspector and Bottom drawer handles are accessible `separator` controls with stable labels.
- Dragging a handle must update Playground layout state, not only transient DOM style.
- Default layout keeps source largest.
- Default layout keeps state and actions visible together.
- Bottom tabs visibly switch content.
- Pressure data must scroll in the local owner declared by the relevant visual pressure case.
- Page body must not own vertical scrolling at `1366x768` on the desktop workbench.

State ownership:

- Panel sizes, collapsed state and selected tabs are Playground host state.
- Where practical, they live in `PlaygroundWorkbenchProgram`.
- They are not runtime truth.

## Reflected Action Contract

166 consumes the 167A minimum Program action manifest slice. Playground may project it into UI-local `ActionPanelViewModel` state:

```ts
interface ActionPanelViewModelEntry {
  readonly actionTag: string
  readonly payloadKind: "void" | "nonVoid" | "unknown"
  readonly authority: "manifest" | "runtime-reflection" | "fallback-source-regex"
  readonly selected: boolean
  readonly dispatchDisabledReason?: string
}
```

Rules:

- 167A minimum manifest DTO is produced by `extractMinimumProgramActionManifest` from `@logixjs/core/repo-internal/reflection-api`.
- Playground consumes the 167A DTO through an internal adapter and only exposes the UI-local `ActionPanelViewModel` to Action panel components.
- `manifest` and `runtime-reflection` are provided by 167.
- `fallback-source-regex` is temporary and must produce an evidence gap.
- Void actions dispatch directly.
- Non-void actions require JSON parsing in 166. Full payload validation feedback is owned by 167.
- Raw dispatch is hidden in advanced UI and manifest-gated.
- This UI-local entry is not a manifest authority DTO and must not be shared with CLI, Devtools or core reflection.

## Lifecycle Commit Contract

All async operation results carry:

```ts
interface PlaygroundOperationCoordinate {
  readonly projectId: string
  readonly revision: number
  readonly sessionId: string
  readonly opSeq: number
}
```

Rules:

- Results can mutate current state/result/log/trace/diagnostics only when all coordinate fields match the current session root.
- Non-matching results become bounded stale lifecycle log or evidence gap.
- Source edit and reset close the previous session root.

## Driver Contract

Example shape:

```ts
const project = definePlaygroundProject({
  id: "logix-react.driver-session",
  files,
  program: { entry: "/src/main.program.ts" },
  drivers: [
    {
      id: "increase",
      label: "Increase",
      operation: "dispatch",
      actionTag: "increment",
      payload: { kind: "void" },
      readAnchors: [
        { id: "counter", label: "Counter", target: "state" },
      ],
    },
  ],
})
```

Rules:

- A driver references a curated operation, not arbitrary raw action object passthrough.
- Driver execution uses the current Program session.
- Driver output appears in state/result/log/trace surfaces.
- Driver metadata is not Runtime Workbench Kernel truth input.

## Scenario Contract

Example shape:

```ts
const project = definePlaygroundProject({
  id: "logix-react.async-flow",
  files,
  program: { entry: "/src/main.program.ts" },
  drivers: [
    { id: "search", label: "Search", operation: "dispatch", actionTag: "searchRequested" },
  ],
  scenarios: [
    {
      id: "search-settle",
      label: "Search and settle",
      steps: [
        { id: "dispatch-search", kind: "driver", driverId: "search", payload: { query: "logix" } },
        { id: "settle-results", kind: "settle", timeoutMs: 1000 },
        { id: "expect-results", kind: "expect", target: "state", assertion: "changed" },
      ],
    },
  ],
})
```

Rules:

- Run-all and step-by-step share execution semantics.
- Step-by-step preserves the same Program session between steps.
- Failed or timed-out step stops later steps by default.
- Wait/settle always has timeout.
- `expect` failure is `scenario-expectation` product failure.
- Scenario result does not overwrite Run/Check/Trial report.

## Service Source Files Contract

Example shape:

```ts
const project = definePlaygroundProject({
  id: "logix-react.service-source",
  files: {
    "/src/main.program.ts": programSource,
    "/src/services/search.service.ts": serviceSource,
  },
  program: { entry: "/src/main.program.ts" },
  serviceFiles: [
    {
      id: "search-client",
      label: "Search client",
      files: [
        {
          path: "/src/services/search.service.ts",
          label: "Search service",
          role: "service-provider",
          serviceRef: "SearchClient",
          schemaSummary: "search(query: string) -> SearchResult[]",
        },
      ],
    },
  ],
})
```

Rules:

- Service source file is a normal `PlaygroundFile`.
- Service role metadata only affects navigation, validation hints and context.
- Service edit produces a new snapshot revision and auto session restart.
- Service validation/execution failure is classified separately from payload, compile, runtime, timeout, serialization and worker failures.

## Workbench Adapter Contract

Allowed conversion to 165 authority bundle:

```ts
{
  truthInputs: [
    { kind: "run-result", result: runResultProjection },
    { kind: "control-plane-report", report: checkReport },
    { kind: "debug-event-batch", events: stableRuntimeEvents },
    { kind: "evidence-gap", reason: "missing-action-manifest" },
  ],
  contextRefs: [
    { kind: "source-snapshot", projectId, revision, digest },
    { kind: "source-locator", path: "/src/main.program.ts", provenance: "host" },
  ],
}
```

Forbidden conversion:

- `driver declaration -> truthInputs`
- `payload schema -> truthInputs`
- `raw payload -> truthInputs`
- `scenario declaration -> truthInputs`
- `wait/settle semantics -> truthInputs`
- `observe/expect semantics -> truthInputs`
- `service file role metadata -> truthInputs`
- `service source file body -> truthInputs`
- `half-edited source buffer -> truthInputs`
- `DOM event -> truthInputs`
- `preview host protocol -> truthInputs`

## Negative Contract

Forbidden public or production leakage:

- `Program.capabilities.drivers`
- `Program.capabilities.scenarios`
- `Program.capabilities.mocks`
- `Runtime.driver`
- `Runtime.scenario`
- `Runtime.playground`
- `runtime.driver`
- `runtime.scenario`
- `runtime.playground`
- sandbox-owned driver/scenario API
- sandbox-owned service mock API
- core-owned driver/scenario API
- core-owned service mock API
- React-owned driver/scenario API
- React-owned service mock API
- Driver/Scenario report schema
- Driver/Scenario evidence envelope
- service-source-owned report schema
- service-source-owned evidence envelope
- raw action dispatch default path
- `expect` as compare truth
- Sandpack as diagnostic authority
