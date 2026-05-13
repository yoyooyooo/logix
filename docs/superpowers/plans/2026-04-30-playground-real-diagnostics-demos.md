# Playground Real Diagnostics Demos Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents are available and explicitly authorized for this repo) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Playground diagnostics pressure rows that look like Runtime output with real `Runtime.check` and `Runtime.trial(mode="startup")` report projections, then add focused demo routes that trigger real trial diagnostic classes.

**Architecture:** Keep Check/Trial authority limited to `VerificationControlPlaneReport` returned by the current snapshot. Add a small Playground-internal projection from `checkState.report` and `trialStartupState.report` to diagnostics table rows. Split diagnostic examples into multiple Playground projects so each route has one intentional failure mode and the UI can prove actual Runtime report content.

**Tech Stack:** TypeScript, React 19, Effect V4, Vitest, React Testing Library, Playwright, `@logixjs/core`, `@logixjs/playground`, `@logixjs/sandbox`, pnpm

---

## Bound Inputs

- User decision: no non-real diagnostics in diagnostics UI; different diagnostic types should come from demo code behavior.
- User decision: multiple demo routes are acceptable to cover more `Runtime.trial` diagnostic classes.
- 166 spec authority: `specs/166-playground-driver-scenario-surface/spec.md`, especially FR-038.
- Pressure case to correct: `specs/166-playground-driver-scenario-surface/visual-pressure-cases/04-diagnostics-dense.md`.
- Current fake row source: `packages/logix-playground/src/internal/pressure/pressureFixture.ts`.
- Current fake row consumers: `packages/logix-playground/src/internal/components/RuntimeInspector.tsx` and `packages/logix-playground/src/internal/components/WorkbenchBottomPanel.tsx`.
- Current real report state: `ProgramPanelControlPlaneState` in `packages/logix-playground/src/internal/state/workbenchTypes.ts`.
- Current demo registry: `examples/logix-react/src/playground/registry.ts`.

## Non-Goals

- Do not invent diagnostic rows that claim `runtime.check` or `runtime.trial` authority without a real report.
- Do not mix Monaco/typecheck diagnostics into Check/Trial authority. If editor diagnostics are later shown, label them as editor/typecheck authority in a separate lane.
- Do not add public `@logixjs/core` APIs.
- Do not add public `@logixjs/playground/internal` exports.
- Do not preserve `diagnostics: 64` as a Runtime claim unless 64 rows are produced from real reports.
- Do not run watch-mode commands.
- Do not run `git add`, `git commit`, `git reset`, `git restore`, `git checkout`, `git clean`, or `git stash` unless the user explicitly asks.

## File Structure

- Create `packages/logix-playground/src/internal/diagnostics/controlPlaneDiagnostics.ts`
  - Owns table-row projection from `ProgramPanelControlPlaneState`.
  - Converts `findings`, `dependencyCauses`, `repairHints`, `lifecycle`, `artifacts`, and explicit no-report states into UI rows.
  - Keeps authority strings derived from real `report.stage/report.mode`.
- Modify `packages/logix-playground/src/internal/components/RuntimeInspector.tsx`
  - Stop importing `makePressureDiagnosticRows`.
  - Render summary counts from projected real rows.
- Modify `packages/logix-playground/src/internal/components/WorkbenchBottomPanel.tsx`
  - Stop importing `makePressureDiagnosticRows`.
  - Render the bottom Diagnostics table from projected real rows.
- Modify `packages/logix-playground/src/internal/pressure/pressureFixture.ts`
  - Remove `PressureDiagnosticRow` and `makePressureDiagnosticRows`, or keep only non-authoritative visual helpers if other tests still need them.
- Create `examples/logix-react/src/playground/projects/diagnostics/shared.ts`
  - Shared helper for diagnostics demo project definitions and virtual file construction.
- Create focused demo project directories under `examples/logix-react/src/playground/projects/diagnostics/`
  - `check-imports/index.ts`: real `Runtime.check` static assembly failure.
  - `trial-missing-config/index.ts`: real `Runtime.trial` missing config dependency.
  - `trial-missing-service/index.ts`: real `Runtime.trial` missing service dependency.
  - `trial-missing-import/index.ts`: real `Runtime.trial` missing child Program import.
  - Optional phase 2: `trial-dispose-timeout/index.ts` and `trial-startup-timeout/index.ts` after trial options are project-configurable.
- Modify `examples/logix-react/src/playground/registry.ts`
  - Register new diagnostics demo projects.
- Modify `examples/logix-react/test/playground-registry.contract.test.ts`
  - Assert registry coverage and expected demo metadata.
- Modify `examples/logix-react/test/browser/playground-proof-recipes.ts`
  - Add proof recipes for the new demo routes.
- Modify `examples/logix-react/test/browser/playground-proof-packs.ts`
  - Add proof packs or demo-specific assertions for failure reports.
- Modify `examples/logix-react/test/browser/playground-route-contract.playwright.ts`
  - Replace `LC-0001` fake-row assertion with real error-code assertions.
- Modify `packages/logix-playground/src/internal/components/WorkbenchBottomPanel.test.tsx`
  - Add component-level table projection assertions.
- Modify `packages/logix-playground/src/internal/components/RuntimeInspector.test.tsx`
  - Add diagnostics summary assertions.
- Modify `specs/166-playground-driver-scenario-surface/visual-pressure-cases/04-diagnostics-dense.md`
  - Update expectations from “64 synthetic diagnostics” to “dense real report rows from Check/Trial projections”.
- Modify `specs/166-playground-driver-scenario-surface/ui-contract.md`
  - Update diagnostics pressure language so it does not imply fake Runtime authority.
- Modify `specs/166-playground-driver-scenario-surface/tasks.md`
  - Add follow-up tasks for real diagnostics demos and remove/clarify completed fake pressure rows.
- Modify `specs/166-playground-driver-scenario-surface/notes/verification.md`
  - Record commands and evidence after implementation.

## Runtime Diagnostic Coverage Target

Cover these real report classes first:

- `Runtime.check`: `PROGRAM_IMPORT_INVALID`, `PROGRAM_IMPORT_DUPLICATE`, `CHECK_STAGE_PASS_ONLY`.
- `Runtime.trial`: missing config, missing service, missing child Program import.
- `Runtime.trial` lifecycle: dispose timeout in phase 2, after Playground can pass `closeScopeTimeout` into sandbox trial.
- `Runtime.trial` timeout: startup timeout in phase 2, after Playground can pass `trialRunTimeoutMs` into sandbox trial.

## Chunk 1: Real Report Diagnostics Projection

### Task 1: Add control-plane diagnostics projection

**Files:**
- Create: `packages/logix-playground/src/internal/diagnostics/controlPlaneDiagnostics.ts`
- Test: `packages/logix-playground/test/control-plane-diagnostics.contract.test.ts`

- [ ] **Step 1: Write the failing projection test**

Create `packages/logix-playground/test/control-plane-diagnostics.contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { makeVerificationControlPlaneReport } from '@logixjs/core/ControlPlane'
import {
  projectControlPlaneDiagnosticRows,
  summarizeControlPlaneDiagnosticRows,
} from '../src/internal/diagnostics/controlPlaneDiagnostics.js'

describe('control-plane diagnostics projection', () => {
  it('projects check findings and trial dependency causes without synthetic pressure rows', () => {
    const checkReport = makeVerificationControlPlaneReport({
      kind: 'VerificationControlPlaneReport',
      stage: 'check',
      mode: 'static',
      verdict: 'FAIL',
      errorCode: 'PROGRAM_IMPORT_INVALID',
      summary: 'runtime.check found static assembly issues',
      environment: { runId: 'run:test:check', host: 'static' },
      artifacts: [{ outputKey: 'module-manifest', kind: 'ModuleManifest', digest: 'manifest:test' }],
      repairHints: [
        {
          code: 'PROGRAM_IMPORT_INVALID',
          canAutoRetry: false,
          upgradeToStage: 'check',
          focusRef: { declSliceId: 'Program.capabilities.imports[2]' },
          reason: 'Program.capabilities.imports only accepts Program entries.',
          suggestedAction: 'repair the Program declaration and rerun runtime.check',
        },
      ],
      findings: [
        {
          kind: 'import',
          code: 'PROGRAM_IMPORT_INVALID',
          ownerCoordinate: 'Program.capabilities.imports[2]',
          summary: 'Program.capabilities.imports only accepts Program entries.',
          focusRef: { declSliceId: 'Program.capabilities.imports[2]' },
        },
      ],
      nextRecommendedStage: 'check',
    })

    const trialReport = makeVerificationControlPlaneReport({
      kind: 'VerificationControlPlaneReport',
      stage: 'trial',
      mode: 'startup',
      verdict: 'FAIL',
      errorCode: 'MissingDependency',
      summary: 'Build-time missing config: provide the missing key(s) in buildEnv.config, or add a default value to Config.',
      environment: {
        runId: 'run:test:trial',
        missingConfigKeys: ['MISSING_CONFIG_KEY'],
        missingServices: [],
        tagIds: [],
        configKeys: ['MISSING_CONFIG_KEY'],
      },
      artifacts: [],
      repairHints: [
        {
          code: 'MissingDependency',
          canAutoRetry: false,
          upgradeToStage: 'trial',
          focusRef: { declSliceId: 'config:MISSING_CONFIG_KEY' },
          reason: 'config dependency missing at config:MISSING_CONFIG_KEY',
          suggestedAction: 'provide the missing dependency through the appropriate runtime capability and rerun runtime.trial',
        },
      ],
      dependencyCauses: [
        {
          kind: 'config',
          phase: 'startup-boot',
          ownerCoordinate: 'config:MISSING_CONFIG_KEY',
          providerSource: 'runtime-overlay',
          focusRef: { declSliceId: 'config:MISSING_CONFIG_KEY' },
          errorCode: 'MissingDependency',
        },
      ],
      findings: [
        {
          kind: 'dependency',
          code: 'MissingDependency',
          ownerCoordinate: 'config:MISSING_CONFIG_KEY',
          summary: 'config dependency missing during startup-boot',
          focusRef: { declSliceId: 'config:MISSING_CONFIG_KEY' },
        },
      ],
      nextRecommendedStage: 'trial',
    })

    const rows = projectControlPlaneDiagnosticRows({
      checkState: { status: 'passed', report: checkReport },
      trialStartupState: { status: 'passed', report: trialReport },
    })

    expect(rows.map((row) => row.code)).toEqual([
      'PROGRAM_IMPORT_INVALID',
      'MissingDependency',
    ])
    expect(rows.map((row) => row.authority)).toEqual([
      'runtime.check/static',
      'runtime.trial/startup',
    ])
    expect(rows.map((row) => row.evidence).join('\n')).toContain('Program.capabilities.imports[2]')
    expect(rows.map((row) => row.evidence).join('\n')).toContain('config:MISSING_CONFIG_KEY')
    expect(rows.map((row) => row.message).join('\n')).not.toContain('Pressure diagnostic')
    expect(rows.map((row) => row.evidence).join('\n')).not.toContain('pressure=')

    expect(summarizeControlPlaneDiagnosticRows(rows)).toEqual({
      errors: 2,
      warnings: 0,
      info: 0,
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/control-plane-diagnostics.contract.test.ts --reporter=dot
```

Expected: FAIL because `controlPlaneDiagnostics.ts` does not exist.

- [ ] **Step 3: Implement minimal projection**

Create `packages/logix-playground/src/internal/diagnostics/controlPlaneDiagnostics.ts`:

```ts
import type { VerificationControlPlaneReport } from '@logixjs/core/ControlPlane'
import type { ProgramPanelControlPlaneState } from '../state/workbenchTypes.js'

export interface ControlPlaneDiagnosticRow {
  readonly id: string
  readonly severity: 'error' | 'warning' | 'info'
  readonly code: string
  readonly source: string
  readonly message: string
  readonly authority: string
  readonly evidence: string
}

export interface ControlPlaneDiagnosticInput {
  readonly checkState: ProgramPanelControlPlaneState
  readonly trialStartupState: ProgramPanelControlPlaneState
}

export const summarizeControlPlaneDiagnosticRows = (
  rows: ReadonlyArray<ControlPlaneDiagnosticRow>,
): { readonly errors: number; readonly warnings: number; readonly info: number } => ({
  errors: rows.filter((row) => row.severity === 'error').length,
  warnings: rows.filter((row) => row.severity === 'warning').length,
  info: rows.filter((row) => row.severity === 'info').length,
})

export const projectControlPlaneDiagnosticRows = (
  input: ControlPlaneDiagnosticInput,
): ReadonlyArray<ControlPlaneDiagnosticRow> => [
  ...rowsFromState('Check', input.checkState),
  ...rowsFromState('Trial', input.trialStartupState),
]

const rowsFromState = (
  label: 'Check' | 'Trial',
  state: ProgramPanelControlPlaneState,
): ReadonlyArray<ControlPlaneDiagnosticRow> => {
  if (state.status === 'failed') {
    return [{
      id: `${label}:command-failed`,
      severity: 'error',
      code: 'PLAYGROUND_COMMAND_FAILED',
      source: label,
      message: state.message,
      authority: `playground.${label.toLowerCase()}`,
      evidence: state.message,
    }]
  }
  if (state.status !== 'passed') return []
  return rowsFromReport(state.report)
}

const rowsFromReport = (report: VerificationControlPlaneReport): ReadonlyArray<ControlPlaneDiagnosticRow> => {
  const authority = `runtime.${report.stage}/${report.mode}`
  const severity = report.verdict === 'FAIL' ? 'error' : report.verdict === 'INCONCLUSIVE' ? 'warning' : 'info'
  const findings = report.findings ?? []

  if (findings.length > 0) {
    return findings.map((finding, index) => ({
      id: `${authority}:finding:${finding.code}:${finding.ownerCoordinate}:${index}`,
      severity,
      code: finding.code,
      source: finding.ownerCoordinate,
      message: finding.summary,
      authority,
      evidence: formatEvidence({
        focusRef: finding.focusRef,
        sourceArtifactRef: finding.sourceArtifactRef,
        artifacts: report.artifacts.map((artifact) => artifact.outputKey),
      }),
    }))
  }

  return [{
    id: `${authority}:summary:${report.errorCode ?? report.verdict}`,
    severity,
    code: report.errorCode ?? report.verdict,
    source: `${report.stage}/${report.mode}`,
    message: report.summary,
    authority,
    evidence: formatEvidence({
      artifacts: report.artifacts.map((artifact) => artifact.outputKey),
      lifecycle: report.lifecycle,
      dependencyCauses: report.dependencyCauses,
    }),
  }]
}

const formatEvidence = (value: unknown): string => JSON.stringify(value)
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/control-plane-diagnostics.contract.test.ts --reporter=dot
```

Expected: PASS.

### Task 2: Replace fake diagnostics rows in UI

**Files:**
- Modify: `packages/logix-playground/src/internal/components/RuntimeInspector.tsx`
- Modify: `packages/logix-playground/src/internal/components/WorkbenchBottomPanel.tsx`
- Modify: `packages/logix-playground/src/internal/pressure/pressureFixture.ts`
- Test: `packages/logix-playground/src/internal/components/WorkbenchBottomPanel.test.tsx`
- Test: `packages/logix-playground/src/internal/components/RuntimeInspector.test.tsx`

- [ ] **Step 1: Add failing DOM tests**

In `packages/logix-playground/src/internal/components/WorkbenchBottomPanel.test.tsx`, add a test that renders Diagnostics with a passed `checkState` report containing `PROGRAM_IMPORT_INVALID` and a passed `trialStartupState` report containing `MissingDependency`. Assert:

```ts
expect(within(bottom).getByText('PROGRAM_IMPORT_INVALID')).toBeTruthy()
expect(within(bottom).getByText('MissingDependency')).toBeTruthy()
expect(within(bottom).getByText('runtime.check/static')).toBeTruthy()
expect(within(bottom).getByText('runtime.trial/startup')).toBeTruthy()
expect(bottom.textContent).not.toContain('Pressure diagnostic')
expect(bottom.textContent).not.toContain('LC-0001')
```

In `packages/logix-playground/src/internal/components/RuntimeInspector.test.tsx`, add a diagnostics tab test that asserts summary counts come from the real projected rows.

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run src/internal/components/WorkbenchBottomPanel.test.tsx src/internal/components/RuntimeInspector.test.tsx --reporter=dot
```

Expected: FAIL because UI still renders pressure rows or does not render report-derived rows.

- [ ] **Step 3: Update `RuntimeInspector.tsx`**

Change imports:

```ts
import {
  projectControlPlaneDiagnosticRows,
  summarizeControlPlaneDiagnosticRows,
} from '../diagnostics/controlPlaneDiagnostics.js'
```

Remove `makePressureDiagnosticRows` from the pressure import.

Inside `DiagnosticsLane`, replace:

```ts
const rows = React.useMemo(() => makePressureDiagnosticRows(pressure), [pressure])
const errors = rows.filter((row) => row.severity === 'error').length
const warnings = rows.filter((row) => row.severity === 'warning').length
const info = rows.filter((row) => row.severity === 'info').length
```

with:

```ts
const rows = React.useMemo(
  () => projectControlPlaneDiagnosticRows({ checkState, trialStartupState }),
  [checkState, trialStartupState],
)
const summary = React.useMemo(() => summarizeControlPlaneDiagnosticRows(rows), [rows])
```

Render `summary.errors`, `summary.warnings`, `summary.info`. For empty rows, render a short status row such as `No Check/Trial diagnostics captured.`.

- [ ] **Step 4: Update `WorkbenchBottomPanel.tsx`**

Change `PressureDiagnosticsTable` into `ControlPlaneDiagnosticsTable`:

```ts
function ControlPlaneDiagnosticsTable({
  checkState,
  trialStartupState,
}: {
  readonly checkState: ProgramPanelControlPlaneState
  readonly trialStartupState: ProgramPanelControlPlaneState
}): React.ReactElement {
  const rows = React.useMemo(
    () => projectControlPlaneDiagnosticRows({ checkState, trialStartupState }),
    [checkState, trialStartupState],
  )

  return (
    <div data-playground-section="diagnostics-table" className="mt-3 min-h-0 flex-1 overflow-auto rounded-md border border-border bg-background">
      <div className="min-w-[980px]">
        <div className="sticky top-0 grid grid-cols-[92px_150px_200px_minmax(260px,1fr)_160px_260px] border-b border-border bg-card px-3 py-2 font-semibold text-foreground">
          <span>severity</span>
          <span>code</span>
          <span>source</span>
          <span>message</span>
          <span>authority</span>
          <span>evidence</span>
        </div>
        {rows.length === 0 ? (
          <div className="px-3 py-4 text-muted-foreground">No Check/Trial diagnostics captured.</div>
        ) : rows.map((row) => (
          <div key={row.id} className="grid grid-cols-[92px_150px_200px_minmax(260px,1fr)_160px_260px] border-b border-border/70 px-3 py-1.5">
            <span>{row.severity}</span>
            <span className="font-mono">{row.code}</span>
            <span className="truncate text-primary">{row.source}</span>
            <span className="truncate text-foreground">{row.message}</span>
            <span className="font-mono">{row.authority}</span>
            <span className="truncate">{row.evidence}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

Update the call site in Diagnostics detail:

```tsx
<ControlPlaneDiagnosticsTable checkState={checkState} trialStartupState={trialStartupState} />
```

- [ ] **Step 5: Remove pressure diagnostic generator**

In `packages/logix-playground/src/internal/pressure/pressureFixture.ts`, remove `PressureDiagnosticRow` and `makePressureDiagnosticRows` if no remaining imports exist.

Run:

```bash
rtk rg -n "makePressureDiagnosticRows|Pressure diagnostic|LC-0001|authority=runtime.check|pressure=.*diagnostic" packages/logix-playground examples/logix-react specs/166-playground-driver-scenario-surface -S
```

Expected: only docs or tests that intentionally mention removed fake data remain. After implementation, production code should have zero matches for `makePressureDiagnosticRows`, `Pressure diagnostic`, and `authority=runtime.check`.

- [ ] **Step 6: Run tests to verify pass**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/control-plane-diagnostics.contract.test.ts src/internal/components/WorkbenchBottomPanel.test.tsx src/internal/components/RuntimeInspector.test.tsx --reporter=dot
```

Expected: PASS.

## Chunk 2: Real Diagnostics Demo Routes

### Task 3: Add shared diagnostics demo project helper

**Files:**
- Create: `examples/logix-react/src/playground/projects/diagnostics/shared.ts`
- Test: `examples/logix-react/test/playground-registry.contract.test.ts`

- [ ] **Step 1: Add failing registry expectations**

Update `examples/logix-react/test/playground-registry.contract.test.ts` to expect these new project IDs:

```ts
const expectedDiagnosticsProjects = [
  'logix-react.diagnostics.check-imports',
  'logix-react.diagnostics.trial-missing-config',
  'logix-react.diagnostics.trial-missing-service',
  'logix-react.diagnostics.trial-missing-import',
] as const
```

Assert every project has:

```ts
expect(project?.program?.entry).toBe('/src/main.program.ts')
expect(project?.capabilities?.check).toBe(true)
expect(project?.capabilities?.trialStartup).toBe(true)
expect(project?.fixtures).toMatchObject({
  diagnosticsDemo: expect.objectContaining({
    expectedCodes: expect.any(Array),
  }),
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm -C examples/logix-react test -- --run playground-registry.contract.test.ts --reporter=dot
```

Expected: FAIL because routes are not registered.

- [ ] **Step 3: Create diagnostics shared helper**

Create `examples/logix-react/src/playground/projects/diagnostics/shared.ts`:

```ts
import {
  definePlaygroundProject,
  playgroundProjectSourcePaths,
  type PlaygroundProject,
} from '@logixjs/playground/Project'

export interface DiagnosticsDemoProjectInput {
  readonly id: string
  readonly title: string
  readonly mainProgram: string
  readonly files?: PlaygroundProject['files']
  readonly expectedCodes: ReadonlyArray<string>
  readonly expectedTrialDependencyKinds?: ReadonlyArray<'config' | 'service' | 'program-import'>
}

export const defineDiagnosticsDemoProject = (input: DiagnosticsDemoProjectInput): PlaygroundProject =>
  definePlaygroundProject({
    id: input.id,
    files: {
      [playgroundProjectSourcePaths.mainProgram]: {
        language: 'ts',
        content: input.mainProgram,
        editable: true,
      },
      '/package.json': {
        language: 'json',
        content: JSON.stringify({ name: input.id, private: true, type: 'module' }, null, 2),
        editable: false,
      },
      '/tsconfig.json': {
        language: 'json',
        content: JSON.stringify({ compilerOptions: { strict: true, module: 'ESNext' } }, null, 2),
        editable: false,
      },
      '/README.md': {
        language: 'md',
        content: `# ${input.title}\n\nReal Runtime.check/Runtime.trial diagnostics demo.`,
        editable: true,
      },
      ...(input.files ?? {}),
    },
    program: {
      entry: playgroundProjectSourcePaths.mainProgram,
    },
    capabilities: {
      run: true,
      check: true,
      trialStartup: true,
    },
    fixtures: {
      diagnosticsDemo: {
        expectedCodes: input.expectedCodes,
        expectedTrialDependencyKinds: input.expectedTrialDependencyKinds ?? [],
      },
    },
  })
```

- [ ] **Step 4: Run registry test again**

Run:

```bash
rtk pnpm -C examples/logix-react test -- --run playground-registry.contract.test.ts --reporter=dot
```

Expected: still FAIL because concrete projects are not created or registered yet.

### Task 4: Add Check static assembly demo

**Files:**
- Create: `examples/logix-react/src/playground/projects/diagnostics/check-imports/index.ts`
- Modify: `examples/logix-react/src/playground/registry.ts`
- Test: `examples/logix-react/test/browser/playground-proof-recipes.ts`
- Test: `examples/logix-react/test/browser/playground-proof-packs.ts`

- [ ] **Step 1: Create demo source**

Create `examples/logix-react/src/playground/projects/diagnostics/check-imports/index.ts`:

```ts
import { defineDiagnosticsDemoProject } from '../shared'

const mainProgram = [
  'import { Effect, Schema } from "effect"',
  'import * as Logix from "@logixjs/core"',
  '',
  'const Child = Logix.Module.make("Diagnostics.CheckImports.Child", {',
  '  state: Schema.Void,',
  '  actions: {},',
  '})',
  '',
  'const Parent = Logix.Module.make("Diagnostics.CheckImports.Parent", {',
  '  state: Schema.Void,',
  '  actions: {},',
  '})',
  '',
  'const ChildProgram = Logix.Program.make(Child, {',
  '  initial: undefined,',
  '  logics: [],',
  '})',
  '',
  'export const Program = Logix.Program.make(Parent, {',
  '  initial: undefined,',
  '  capabilities: {',
  '    imports: [ChildProgram, ChildProgram, Parent as any],',
  '  },',
  '  logics: [],',
  '})',
  '',
  'export const main = () => Effect.succeed({ demo: "check-imports" })',
].join('\\n')

export const logixReactDiagnosticsCheckImportsProject = defineDiagnosticsDemoProject({
  id: 'logix-react.diagnostics.check-imports',
  title: 'Diagnostics Check Imports',
  mainProgram,
  expectedCodes: ['PROGRAM_IMPORT_INVALID', 'PROGRAM_IMPORT_DUPLICATE'],
})
```

- [ ] **Step 2: Register demo**

Modify `examples/logix-react/src/playground/registry.ts` to import and register `logixReactDiagnosticsCheckImportsProject`.

- [ ] **Step 3: Add proof recipe**

Add recipe:

```ts
'logix-react.diagnostics.check-imports': {
  projectId: 'logix-react.diagnostics.check-imports',
  reportLabel: 'real check import diagnostics',
  proofPackIds: ['checkFailure', 'trialStartup', 'runtimeEvidenceProbe', 'gapHarvest', 'boundaryProbe'],
  assertDemoProof: async ({ page }) => {
    await page.getByRole('region', { name: 'Diagnostics detail' }).getByText('PROGRAM_IMPORT_INVALID').waitFor({ state: 'visible' })
    await page.getByRole('region', { name: 'Diagnostics detail' }).getByText('PROGRAM_IMPORT_DUPLICATE').waitFor({ state: 'visible' })
    await page.getByRole('region', { name: 'Diagnostics detail' }).getByText('runtime.check/static').waitFor({ state: 'visible' })
  },
},
```

Add a `checkFailure` proof pack in `playground-proof-packs.ts`:

```ts
if (packId === 'checkFailure') {
  await getHostCommand(page, 'Check').click()
  const report = page.getByRole('region', { name: 'Program result' }).getByRole('region', { name: 'Check report' })
  await report.waitFor({ state: 'visible' })
  await report.getByText('FAIL', { exact: true }).waitFor({ state: 'visible' })
  await assertEvidenceCoordinate({
    page,
    source: report,
    diagnostics: page.getByLabel('Diagnostics detail'),
    snapshot: page.getByLabel('Snapshot summary'),
    context: `${project.id} Check failure`,
    expectedProjectId: project.id,
    expectedOperationKind: 'check',
  })
  return
}
```

Extend `ProofPackId` with `'checkFailure'`.

- [ ] **Step 4: Run focused tests**

Run:

```bash
rtk pnpm -C examples/logix-react test -- --run playground-registry.contract.test.ts --reporter=dot
rtk pnpm -C examples/logix-react typecheck
```

Expected: PASS.

### Task 5: Add Trial missing config demo

**Files:**
- Create: `examples/logix-react/src/playground/projects/diagnostics/trial-missing-config/index.ts`
- Modify: `examples/logix-react/src/playground/registry.ts`
- Test: `examples/logix-react/test/browser/playground-proof-recipes.ts`

- [ ] **Step 1: Create demo source**

Create `examples/logix-react/src/playground/projects/diagnostics/trial-missing-config/index.ts`:

```ts
import { defineDiagnosticsDemoProject } from '../shared'

const mainProgram = [
  'import { Config, Effect, Schema } from "effect"',
  'import * as Logix from "@logixjs/core"',
  '',
  'const Root = Logix.Module.make("Diagnostics.TrialMissingConfig", {',
  '  state: Schema.Void,',
  '  actions: {},',
  '})',
  '',
  'const MissingConfigLogic = Root.logic("missing-config", ($) => {',
  '  $.readyAfter(',
  '    Effect.gen(function* () {',
  '      yield* Config.string("MISSING_CONFIG_KEY")',
  '    }) as any,',
  '  , { id: "missing-config" })',
  '  return Effect.void',
  '})',
  '',
  'export const Program = Logix.Program.make(Root, {',
  '  initial: undefined,',
  '  logics: [MissingConfigLogic],',
  '})',
  '',
  'export const main = () => Effect.succeed({ demo: "trial-missing-config" })',
].join('\\n')

export const logixReactDiagnosticsTrialMissingConfigProject = defineDiagnosticsDemoProject({
  id: 'logix-react.diagnostics.trial-missing-config',
  title: 'Diagnostics Trial Missing Config',
  mainProgram,
  expectedCodes: ['MissingDependency'],
  expectedTrialDependencyKinds: ['config'],
})
```

- [ ] **Step 2: Register and add proof recipe**

Register the project. Add recipe:

```ts
'logix-react.diagnostics.trial-missing-config': {
  projectId: 'logix-react.diagnostics.trial-missing-config',
  reportLabel: 'real trial missing config diagnostics',
  proofPackIds: ['check', 'trialFailure', 'runtimeEvidenceProbe', 'gapHarvest', 'boundaryProbe'],
  assertDemoProof: async ({ page }) => {
    const diagnostics = page.getByRole('region', { name: 'Diagnostics detail' })
    await diagnostics.getByText('MissingDependency').waitFor({ state: 'visible' })
    await diagnostics.getByText('config:MISSING_CONFIG_KEY').waitFor({ state: 'visible' })
    await diagnostics.getByText('runtime.trial/startup').waitFor({ state: 'visible' })
  },
},
```

Add a `trialFailure` proof pack, parallel to `checkFailure`, expecting `FAIL` in the Trial report and `expectedOperationKind: 'trialStartup'`.

- [ ] **Step 3: Run focused tests**

Run:

```bash
rtk pnpm -C examples/logix-react test -- --run playground-registry.contract.test.ts --reporter=dot
rtk pnpm -C examples/logix-react typecheck
```

Expected: PASS.

### Task 6: Add Trial missing service demo

**Files:**
- Create: `examples/logix-react/src/playground/projects/diagnostics/trial-missing-service/index.ts`
- Modify: `examples/logix-react/src/playground/registry.ts`
- Test: `examples/logix-react/test/browser/playground-proof-recipes.ts`

- [ ] **Step 1: Create demo source**

Create `examples/logix-react/src/playground/projects/diagnostics/trial-missing-service/index.ts`:

```ts
import { defineDiagnosticsDemoProject } from '../shared'

const mainProgram = [
  'import { Effect, Schema, ServiceMap } from "effect"',
  'import * as Logix from "@logixjs/core"',
  '',
  'class BusinessService extends ServiceMap.Service<BusinessService, { readonly ping: Effect.Effect<void> }>()("BusinessService") {}',
  '',
  'const Root = Logix.Module.make("Diagnostics.TrialMissingService", {',
  '  state: Schema.Void,',
  '  actions: {},',
  '})',
  '',
  'const MissingServiceLogic = Root.logic<BusinessService>("missing-service", ($) => {',
  '  $.readyAfter(Effect.asVoid(Effect.service(BusinessService).pipe(Effect.orDie)), { id: "business-service" })',
  '  return Effect.void',
  '})',
  '',
  'export const Program = Logix.Program.make(Root, {',
  '  initial: undefined,',
  '  logics: [MissingServiceLogic],',
  '})',
  '',
  'export const main = () => Effect.succeed({ demo: "trial-missing-service" })',
].join('\\n')

export const logixReactDiagnosticsTrialMissingServiceProject = defineDiagnosticsDemoProject({
  id: 'logix-react.diagnostics.trial-missing-service',
  title: 'Diagnostics Trial Missing Service',
  mainProgram,
  expectedCodes: ['MissingDependency'],
  expectedTrialDependencyKinds: ['service'],
})
```

- [ ] **Step 2: Register and add proof recipe**

Register the project. Add recipe assertion for `service:BusinessService`, `MissingDependency`, and `runtime.trial/startup`.

- [ ] **Step 3: Run focused tests**

Run:

```bash
rtk pnpm -C examples/logix-react test -- --run playground-registry.contract.test.ts --reporter=dot
rtk pnpm -C examples/logix-react typecheck
```

Expected: PASS.

### Task 7: Add Trial missing child Program import demo

**Files:**
- Create: `examples/logix-react/src/playground/projects/diagnostics/trial-missing-import/index.ts`
- Modify: `examples/logix-react/src/playground/registry.ts`
- Test: `examples/logix-react/test/browser/playground-proof-recipes.ts`

- [ ] **Step 1: Create demo source**

Create `examples/logix-react/src/playground/projects/diagnostics/trial-missing-import/index.ts`:

```ts
import { defineDiagnosticsDemoProject } from '../shared'

const mainProgram = [
  'import { Effect, Schema } from "effect"',
  'import * as Logix from "@logixjs/core"',
  '',
  'const Child = Logix.Module.make("Diagnostics.TrialMissingImport.Child", {',
  '  state: Schema.Struct({ value: Schema.Number }),',
  '  actions: {},',
  '})',
  '',
  'const Parent = Logix.Module.make("Diagnostics.TrialMissingImport.Parent", {',
  '  state: Schema.Void,',
  '  actions: {},',
  '})',
  '',
  'const MissingImportLogic = Parent.logic("read-child", ($) => {',
  '  $.readyAfter(Effect.service(Child.tag).pipe(Effect.orDie) as any, { id: "read-child" })',
  '  return Effect.void',
  '})',
  '',
  'export const Program = Logix.Program.make(Parent, {',
  '  initial: undefined,',
  '  logics: [MissingImportLogic],',
  '})',
  '',
  'export const main = () => Effect.succeed({ demo: "trial-missing-import" })',
].join('\\n')

export const logixReactDiagnosticsTrialMissingImportProject = defineDiagnosticsDemoProject({
  id: 'logix-react.diagnostics.trial-missing-import',
  title: 'Diagnostics Trial Missing Import',
  mainProgram,
  expectedCodes: ['MissingDependency'],
  expectedTrialDependencyKinds: ['program-import'],
})
```

- [ ] **Step 2: Register and add proof recipe**

Register the project. Add recipe assertion for `Program.capabilities.imports:Diagnostics.TrialMissingImport.Child`, `MissingDependency`, and `runtime.trial/startup`.

- [ ] **Step 3: Run focused tests**

Run:

```bash
rtk pnpm -C examples/logix-react test -- --run playground-registry.contract.test.ts --reporter=dot
rtk pnpm -C examples/logix-react typecheck
```

Expected: PASS.

## Chunk 3: Browser Contracts And 166 Spec Alignment

### Task 8: Replace fake diagnostics browser assertions

**Files:**
- Modify: `examples/logix-react/test/browser/playground-route-contract.playwright.ts`
- Modify: `examples/logix-react/test/browser/playground-proof-packs.ts`
- Modify: `examples/logix-react/test/browser/playground-proof-recipes.ts`

- [ ] **Step 1: Replace `LC-0001` assertions**

Search:

```bash
rtk rg -n "LC-0001|Pressure diagnostic|authority=runtime.check" examples/logix-react/test packages/logix-playground/test -S
```

Expected before implementation: matches exist.

Replace diagnostics-dense expectations with real report expectations:

```ts
await page.getByRole('region', { name: 'Runtime inspector' }).getByRole('button', { name: 'Diagnostics' }).click()
await getHostCommand(page, 'Check').click()
await getHostCommand(page, 'Trial').click()
const diagnostics = page.getByRole('region', { name: 'Diagnostics detail' })
await diagnostics.getByText(/runtime\.check\/static|runtime\.trial\/startup/).first().waitFor({ state: 'visible' })
await expectVisible(diagnostics, 'diagnostics detail')
await assertStrictScrollable(page, '[data-playground-section="diagnostics-table"]', 'Diagnostics table')
```

For the new demo routes, use route-specific proof recipes and assert exact codes.

- [ ] **Step 2: Run browser contract**

Run:

```bash
rtk pnpm -C examples/logix-react test:browser:playground
```

Expected: PASS.

### Task 9: Update 166 pressure docs to truthful diagnostics

**Files:**
- Modify: `specs/166-playground-driver-scenario-surface/visual-pressure-cases/04-diagnostics-dense.md`
- Modify: `specs/166-playground-driver-scenario-surface/ui-contract.md`
- Modify: `specs/166-playground-driver-scenario-surface/tasks.md`
- Modify: `specs/166-playground-driver-scenario-surface/notes/verification.md`

- [ ] **Step 1: Update visual pressure case**

In `04-diagnostics-dense.md`, change the intent from “many Check and Trial findings” with hard `diagnostics: 64` pressure metadata to truthful wording:

```md
## Intent

Prove that real Runtime.check and Runtime.trial diagnostics stay readable while command status, summary counters and source context remain visible. Dense rows must be derived from captured `VerificationControlPlaneReport` fields, including findings, dependency causes, repair hints, lifecycle and artifacts.
```

Update data profile:

```yaml
dataProfile:
  realAuthorities: 2
  projectedReportFields: 5
  minimumRowsAfterCheckTrial: 2
```

Keep layout assertions about sticky header, local scroll and summary visibility.

- [ ] **Step 2: Update UI contract**

In `ui-contract.md`, replace `50+ diagnostics` language with:

```md
| Real Check/Trial report rows | `BottomEvidenceDrawer.DiagnosticsTable` | `DiagnosticsSummary`, `DiagnosticsTable.Header` | `PageBody`, `SourceEditor` |
```

Add note:

```md
Diagnostics rows that claim `runtime.check` or `runtime.trial` authority must be projected from captured `VerificationControlPlaneReport` values. Visual fixtures may stress layout only when labeled as non-authoritative.
```

- [ ] **Step 3: Update tasks**

In `tasks.md`, add follow-up tasks or amend existing T132/T135 notes to say diagnostics rows are real report projections. Do not leave completed tasks claiming fake pressure rows satisfy Check/Trial diagnostics.

- [ ] **Step 4: Update verification notes**

Append a dated section to `notes/verification.md` listing:

```md
## 2026-04-30 Real diagnostics demos

- Removed synthetic diagnostics rows from Check/Trial diagnostics surfaces.
- Added real diagnostics demo routes:
  - `logix-react.diagnostics.check-imports`
  - `logix-react.diagnostics.trial-missing-config`
  - `logix-react.diagnostics.trial-missing-service`
  - `logix-react.diagnostics.trial-missing-import`
- Verified commands:
  - `rtk pnpm -C packages/logix-playground exec vitest run test/control-plane-diagnostics.contract.test.ts src/internal/components/WorkbenchBottomPanel.test.tsx src/internal/components/RuntimeInspector.test.tsx --reporter=dot`
  - `rtk pnpm -C examples/logix-react test -- --run playground-registry.contract.test.ts --reporter=dot`
  - `rtk pnpm -C examples/logix-react typecheck`
  - `rtk pnpm -C examples/logix-react test:browser:playground`
```

- [ ] **Step 5: Run docs text sweep**

Run:

```bash
rtk rg -n "Pressure diagnostic|LC-0001|authority=runtime.check|diagnostics: 64|50\\+ diagnostics" specs/166-playground-driver-scenario-surface packages/logix-playground examples/logix-react -S
```

Expected: no production or active 166 wording that presents synthetic diagnostics as Runtime authority. Historical notes may remain only if explicitly labeled as removed or prior fake pressure data.

## Chunk 4: Phase 2 Trial Timeout Demos

### Task 10: Decide whether to expose per-project trial options

**Files:**
- Modify: `packages/logix-playground/src/Project.ts`
- Modify: `packages/logix-playground/src/internal/snapshot/projectSnapshot.ts`
- Modify: `packages/logix-playground/src/internal/runner/controlPlaneRunner.ts`
- Modify: `packages/logix-playground/src/internal/runner/projectSnapshotRuntimeInvoker.ts`
- Test: `packages/logix-playground/test/trial-startup.boundary.test.ts`

- [ ] **Step 1: Write failing boundary test**

Add a test proving a project can set trial options through product metadata:

```ts
expect(createProjectSnapshot(project).diagnostics.trialStartupOptions).toEqual({
  trialRunTimeoutMs: 20,
  closeScopeTimeout: 10,
})
```

The exact type should be small:

```ts
readonly diagnostics?: {
  readonly trialStartupOptions?: {
    readonly trialRunTimeoutMs?: number
    readonly closeScopeTimeout?: number
  }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/trial-startup.boundary.test.ts --reporter=dot
```

Expected: FAIL because project trial options do not exist.

- [ ] **Step 3: Implement minimal options pass-through**

Add the project metadata type, copy it into `ProjectSnapshot`, then pass values into `transport.trial({ moduleCode, moduleExport: 'Program', runId, trialRunTimeoutMs, closeScopeTimeout })`.

- [ ] **Step 4: Run boundary tests**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/trial-startup.boundary.test.ts --reporter=dot
rtk pnpm -C packages/logix-playground typecheck
```

Expected: PASS.

### Task 11: Add dispose-timeout and startup-timeout demos if Task 10 lands

**Files:**
- Create: `examples/logix-react/src/playground/projects/diagnostics/trial-dispose-timeout/index.ts`
- Create: `examples/logix-react/src/playground/projects/diagnostics/trial-startup-timeout/index.ts`
- Modify: `examples/logix-react/src/playground/registry.ts`
- Modify: `examples/logix-react/test/browser/playground-proof-recipes.ts`

- [ ] **Step 1: Add dispose-timeout demo**

Use demo code equivalent to the core test:

```ts
Root.logic("dispose-timeout", ($) => {
  return Effect.scoped(
    Effect.acquireRelease(
      Effect.void,
      () => Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 50))),
    ),
  )
})
```

Set project trial options:

```ts
diagnostics: {
  trialStartupOptions: {
    closeScopeTimeout: 10,
    trialRunTimeoutMs: 100,
  },
}
```

Assert report includes `DisposeTimeout` or lifecycle `startup-close`.

- [ ] **Step 2: Add startup-timeout demo**

Use a hanging Layer only if current sandbox wrapper can compile it safely:

```ts
const hangingLayer = Layer.effectDiscard(Effect.never) as unknown as Layer.Layer<any, never, never>
export const Program = Logix.Program.make(Root, {
  initial: undefined,
  capabilities: {
    services: hangingLayer,
  },
  logics: [],
})
```

Set `trialRunTimeoutMs: 20`. Assert report includes `TrialRunTimeout`.

- [ ] **Step 3: Run full example verification**

Run:

```bash
rtk pnpm -C examples/logix-react typecheck
rtk pnpm -C examples/logix-react test:browser:playground
```

Expected: PASS. If browser execution becomes flaky due to real timeout demos, keep the routes but exclude timeout demos from the default browser proof recipes and document the reason in `notes/verification.md`.

## Final Verification

Run these after all chosen chunks:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/control-plane-diagnostics.contract.test.ts src/internal/components/WorkbenchBottomPanel.test.tsx src/internal/components/RuntimeInspector.test.tsx test/trial-startup.boundary.test.ts --reporter=dot
rtk pnpm -C packages/logix-playground typecheck
rtk pnpm -C examples/logix-react test -- --run playground-registry.contract.test.ts --reporter=dot
rtk pnpm -C examples/logix-react typecheck
rtk pnpm -C examples/logix-react test:browser:playground
rtk rg -n "Pressure diagnostic|LC-0001|authority=runtime.check|makePressureDiagnosticRows" packages/logix-playground examples/logix-react specs/166-playground-driver-scenario-surface -S
```

Expected:

- All tests pass.
- Text sweep has no production hit for synthetic Runtime diagnostics.
- Any remaining docs hit is explicitly historical or removal evidence.
- `diagnostics-dense` and new diagnostics demo routes show rows that can be traced to captured `VerificationControlPlaneReport`.

## Rollback / Risk Notes

- If a demo compiles but the sandbox trial wrapper cannot execute a dependency failure consistently, keep the demo out of the registry and add the failure evidence to `specs/166-playground-driver-scenario-surface/notes/verification.md`.
- If `Runtime.check` fails before `Runtime.trial` for a trial-focused demo, simplify the source until Check passes and Trial fails for the intended reason.
- If timeout demos make browser contracts slow or flaky, leave timeout coverage to core tests and document Playground support as phase 2.
- If dense visual stress still needs many rows, create a separate non-authoritative visual fixture lane labeled `playground.visual-pressure`, never `runtime.check` or `runtime.trial`.
