# Quickstart: Professional Logic Playground vNext

## Read The Current Authority

```bash
rtk sed -n '1,260p' docs/ssot/runtime/17-playground-product-workbench.md
rtk sed -n '1,260p' specs/165-runtime-workbench-kernel/spec.md
rtk sed -n '1,260p' specs/166-playground-driver-scenario-surface/spec.md
rtk sed -n '1,260p' specs/166-playground-driver-scenario-surface/plan.md
rtk sed -n '1,260p' specs/166-playground-driver-scenario-surface/contracts/README.md
rtk sed -n '1,260p' specs/166-playground-driver-scenario-surface/ui-contract.md
rtk sed -n '1,220p' specs/166-playground-driver-scenario-surface/visual-pressure-cases/01-action-dense.md
```

## Inspect Current Implementation

```bash
rtk sed -n '1,340p' packages/logix-playground/src/internal/components/PlaygroundShell.tsx
rtk sed -n '1,260p' packages/logix-playground/src/internal/components/ProgramSessionPanel.tsx
rtk sed -n '1,260p' packages/logix-playground/src/internal/components/ActionManifestPanel.tsx
rtk sed -n '1,260p' packages/logix-playground/src/internal/components/WorkbenchBottomPanel.tsx
rtk sed -n '1,260p' packages/logix-playground/src/internal/state/workbenchProgram.ts
rtk sed -n '1,220p' examples/logix-react/src/playground/projects/local-counter/index.ts
rtk sed -n '1,220p' examples/logix-react/src/playground/projects/local-counter/files.ts
rtk sed -n '1,220p' examples/logix-react/src/playground/projects/local-counter/sources/src/main.program.ts
rtk sed -n '1,220p' examples/logix-react/src/playground/projects/local-counter/sources/src/logic/localCounter.logic.ts
```

## Run The Example Route

```bash
rtk pnpm -C examples/logix-react dev
```

Open:

```text
http://localhost:5173/playground/logix-react.local-counter
```

Expected vNext behavior:

- page opens as a full-viewport tool
- no UI preview is required for Logic-first project
- source editor is Monaco on the normal path
- TypeScript completion and diagnostics are available for source files
- Program entry is `/src/main.program.ts`
- domain behavior lives under `/src/logic/*.logic.ts`
- service examples use `/src/services/*.service.ts`
- session is ready on load
- state and actions are visible together
- Run / Check / Trial / Reset have clear output destinations
- Run and action dispatch use compiled `Runtime.run` / `Runtime.openProgram` output, not local-counter source parsing
- source edit auto restarts the session
- files, runtime inspector and bottom drawer resize through visible separator handles

## Verify Package

```bash
rtk pnpm -C packages/logix-playground typecheck
rtk pnpm -C packages/logix-playground test -- --run --cache '--project=!browser*' --silent=passed-only --reporter=dot --hideSkippedTests
```

## Verify Example Host

```bash
rtk pnpm -C examples/logix-react typecheck
rtk pnpm -C examples/logix-react test:browser:playground
```

The direct Playwright browser contract starts the examples Vite dev server and verifies the visual pressure contract at `1366x768`:

- default `/playground/logix-react.local-counter` shell regions, approximate geometry and forbidden page overflow
- actual dragging of Files, Runtime inspector and Bottom drawer resize handles
- all five visual pressure routes from [ui-contract.md](./ui-contract.md)
- pressure-specific inspector and bottom tab defaults
- materialized pressure file tree, action/state/trace/diagnostics/driver/scenario surfaces
- strict local scroll ownership for stressed action lists, state tree, trace table, diagnostics table, driver payload editor and scenario list
- dark Monaco source editor rendering
- bottom evidence drawer containment for diagnostics-dense, trace-heavy and scenario-driver-payload pressure
- bare `/playground` default project routing

Historical reopening evidence is recorded in [notes/visual-alignment-gap-analysis.md](./notes/visual-alignment-gap-analysis.md). Current refreshed screenshots are under [notes/current-screenshots/](./notes/current-screenshots/).

## Verify Workspace

```bash
rtk pnpm typecheck
rtk pnpm lint
rtk pnpm test:turbo
```

## Manual Acceptance Script

1. Open `/playground/logix-react.local-counter`.
2. Confirm no default `App.tsx` or preview panel is required.
3. Confirm the file tree uses `/src/main.program.ts` and `/src/logic/localCounter.logic.ts`.
4. Confirm Driver/Scenario metadata does not appear as runtime source files by default.
5. Confirm source editor is Monaco, not the default textarea path.
6. Confirm TypeScript completion works for local imports and `@logixjs/*` imports.
7. Confirm Monaco diagnostics appear for a temporary TypeScript error.
8. Confirm session status is ready without pressing Start.
9. Click `increment`.
10. Confirm state changes, last operation changes, console logs dispatch, trace has operation ref.
11. Edit `counterStep`.
12. Confirm session auto restarts and logs one lifecycle restart entry.
13. Click `increment` again.
14. Confirm output reflects the new snapshot revision.
15. Click Run.
16. Confirm Run Result shows run id, revision and JSON-safe value.
17. Click Check and Trial.
18. Confirm reports appear under Diagnostics summary/detail or disabled reasons are visible.
19. Drag the Files, Runtime inspector and bottom drawer resize handles.
20. Confirm each dragged region changes size and the page body still does not scroll.
21. Confirm state and actions remain readable at default desktop size.
22. Open or mount each visual pressure case fixture from `ui-contract.md`.
23. Confirm the declared scroll owner scrolls and `PageBody` does not scroll at `1366x768`.
24. Confirm sticky regions stay visible while their local owner scrolls.

## UI Contract Sweep

```bash
rtk rg -n "scrollOwners|requiredVisibleRegions|forbiddenOverflow|routeSuggestion" specs/166-playground-driver-scenario-surface/ui-contract.md specs/166-playground-driver-scenario-surface/visual-pressure-cases
```

Expected:

- each visual pressure case declares at least one scroll owner
- each visual pressure case declares required visible regions
- each visual pressure case forbids `PageBody` overflow
- each visual pressure case has a deterministic route suggestion or fixture mapping

Suggested browser routes or equivalent deterministic fixtures:

```text
/playground/logix-react.pressure.action-dense
/playground/logix-react.pressure.state-large
/playground/logix-react.pressure.trace-heavy
/playground/logix-react.pressure.diagnostics-dense
/playground/logix-react.pressure.scenario-driver-payload
```

## Negative Sweep

```bash
rtk rg -n "Runtime\\.playground|Runtime\\.driver|Runtime\\.scenario|runtime\\.playground|runtime\\.driver|runtime\\.scenario|Program\\.capabilities\\.drivers|Program\\.capabilities\\.scenarios|Program\\.capabilities\\.mocks" packages/logix-core packages/logix-react packages/logix-sandbox packages/logix-playground examples/logix-react docs specs/166-playground-driver-scenario-surface
```

```bash
rtk rg -n "Start session|Close session|No active session|Run the Program against the current snapshot|Sandpack.*diagnostic|Driver/Scenario report schema|service-source-owned report schema" packages/logix-playground examples/logix-react docs/ssot/runtime/17-playground-product-workbench.md specs/166-playground-driver-scenario-surface
```

Expected:

- no production/default UI hits for Start session, Close session or No active session
- no public runtime API hits
- no Sandpack diagnostic authority hit
- remaining spec hits must be negative-contract or historical explanation only

## Runtime Consumption Sweep

```bash
rtk rg -n "createDefaultProgramSessionRunner\\(|runLocalProgramSnapshot\\(|counterStep\\s*=\\s*" packages/logix-playground/src examples/logix-react/src/playground
```

Expected:

- no production `PlaygroundShell` default path imports fixture runner or fake Run implementation
- local-counter `counterStep` may remain in example source only
- fake runner hits, if any, are test support or fixture-only and named accordingly

## Source Layout Sweep

```bash
rtk rg -n "\"/src/program\\.ts\"|'/src/program\\.ts'|/src/program\\.ts" examples/logix-react/src/playground packages/logix-playground specs/166-playground-driver-scenario-surface
```

Expected:

- no new Logic-first examples use bare `/src/program.ts`
- remaining hits are historical, migration-debt notes or negative examples
- the recommended Logic-first entry is `/src/main.program.ts`

## Monaco Sweep

```bash
rtk rg -n "textarea|Source editor|MonacoSourceEditor|monaco-editor|@monaco-editor/react|typescriptDefaults|extraLibs" packages/logix-playground examples/logix-react specs/166-playground-driver-scenario-surface
```

Expected:

- default source editing path uses package-owned Monaco components
- textarea hits are fallback-only or tests that explicitly exercise fallback
- type bundle / extraLibs setup is local and does not fetch dependency types from remote package CDNs

## Evidence Writeback

Record final verification notes in:

```text
specs/166-playground-driver-scenario-surface/notes/verification.md
specs/166-playground-driver-scenario-surface/notes/perf-evidence.md
```

Perf note rule:

- If only Playground package/UI state changes are touched, state that runtime hot-path perf collection was not required.
- If `packages/logix-core` runtime core paths, diagnostic protocol or public API are touched, collect and link focused before/after evidence.
