# DVTools Internal Workbench Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `159-dvtools-internal-workbench-cutover` as an internal session-first evidence workbench with exportable canonical evidence and no public DVTools surface.

**Architecture:** Keep `@logixjs/devtools-react` public exports null and move all work into `packages/logix-devtools-react/src/internal/**`. Live snapshot, imported evidence package, and `VerificationControlPlaneReport` first normalize into one input model, then derive `scope -> session -> finding -> artifact attachment -> drilldown`. React UI consumes the derived workbench model only, while CLI handoff exports canonical evidence package plus a non-authoritative selection manifest.

**Tech Stack:** TypeScript, React 19, Effect V4 Schema, Vitest, `@testing-library/react`, repo-internal `@logixjs/core` debug/evidence/control-plane APIs.

---

## Execution Status

主干已实现：DVTools 已切到 session-first internal workbench，默认主链为 `scope -> session -> finding -> artifact attachment -> drilldown`，time travel 和旧 overview 默认入口已移出主路径，canonical evidence package 与 selection manifest export 已落地。

验证状态记录在本轮实施结果中：`packages/logix-devtools-react` 的 `typecheck:test` 与 package test 已通过。Chrome DevTools 宿主迁移仍是后续 reopen 项。

## Authority

- Owner Spec: [159 DVTools Internal Workbench Cutover](./spec.md)
- DVTools SSoT: [14 DVTools Internal Workbench](../../docs/ssot/runtime/14-dvtools-internal-workbench.md)
- Verification control plane SSoT: [09 Verification Control Plane](../../docs/ssot/runtime/09-verification-control-plane.md)
- Public API spine: [01 Public API Spine](../../docs/ssot/runtime/01-public-api-spine.md)
- React host boundary: [10 React Host Projection Boundary](../../docs/ssot/runtime/10-react-host-projection-boundary.md)
- Toolkit boundary: [11 Toolkit Layer](../../docs/ssot/runtime/11-toolkit-layer.md)

Implementation must follow these fixed decisions:

- Public survivor set stays zero for `@logixjs/devtools-react`.
- Main chain is `scope -> session -> finding -> artifact attachment`.
- `focusRef` is a stable coordinate on finding or artifact attachment.
- Timeline, inspector, field graph, converge, raw JSON, and time travel are subordinate drilldowns only.
- DVTools exports canonical evidence package plus selection manifest. The manifest is an entry hint for CLI and Agent only.
- No Chrome DevTools or browser extension host migration lands in this plan.
- No compatibility layer, deprecation path, or old layout bridge is allowed.

## File Structure

Create focused derivation files:

- Create: `packages/logix-devtools-react/src/internal/state/workbench/model.ts`
  - Owns normalized input, scope, session, metric, finding, artifact attachment, evidence gap, drilldown selector, and selection manifest types.
- Create: `packages/logix-devtools-react/src/internal/state/workbench/normalize.ts`
  - Converts live debug snapshot, imported evidence package, and control-plane report into one normalized input.
- Create: `packages/logix-devtools-react/src/internal/state/workbench/derive.ts`
  - Implements deterministic derivation from normalized input to workbench model.
- Create: `packages/logix-devtools-react/src/internal/state/workbench/export.ts`
  - Builds canonical evidence package export and selection manifest from selected session, finding, or artifact.
- Create: `packages/logix-devtools-react/src/internal/state/workbench/index.ts`
  - Re-exports the internal workbench derivation API for state and tests.

Modify current state integration:

- Modify: `packages/logix-devtools-react/src/internal/state/model.ts`
  - Replace timeline-first and time-travel state with workbench selection state.
  - Keep layout, theme, and evidence display settings.
- Modify: `packages/logix-devtools-react/src/internal/state/compute.ts`
  - Route live/import/report inputs through `normalize.ts` and `derive.ts`.
  - Preserve low-cost operation summaries only as selected session metrics.
- Modify: `packages/logix-devtools-react/src/internal/state/logic.ts`
  - Add workbench selection actions and canonical evidence import/export actions.
  - Remove default mutation/time-travel actions from the main state reducer path.
- Modify: `packages/logix-devtools-react/src/internal/snapshot/index.ts`
  - Keep snapshot store as producer input only. Do not add session or finding truth here.
- Modify: `packages/logix-devtools-react/src/internal/state/storage.ts`
  - Persist layout/theme/display preferences only. Do not persist evidence truth.

Create workbench UI files:

- Create: `packages/logix-devtools-react/src/internal/ui/workbench/SessionWorkbench.tsx`
  - Main selected session surface.
- Create: `packages/logix-devtools-react/src/internal/ui/workbench/SessionSummary.tsx`
  - Folded replacement for overview strip and operation summary.
- Create: `packages/logix-devtools-react/src/internal/ui/workbench/FindingsList.tsx`
  - Structured findings with focus refs and artifact output keys.
- Create: `packages/logix-devtools-react/src/internal/ui/workbench/ArtifactAttachments.tsx`
  - Artifact list owned by selected finding.
- Create: `packages/logix-devtools-react/src/internal/ui/workbench/EvidenceGapList.tsx`
  - Closed-code evidence gaps.
- Create: `packages/logix-devtools-react/src/internal/ui/workbench/DrilldownHost.tsx`
  - Explicit subordinate drilldown switch for timeline, inspector, field graph, converge, report, and raw JSON.

Modify current UI files:

- Modify: `packages/logix-devtools-react/src/internal/ui/shell/DevtoolsShell.tsx`
  - Render compact header, scope selector, session navigator, and selected session workbench.
- Modify: `packages/logix-devtools-react/src/internal/ui/shell/LogixDevtools.tsx`
  - Keep internal mount wrapper only.
- Modify: `packages/logix-devtools-react/src/internal/ui/shell/LogixIsland.tsx`
  - Keep internal host only.
- Modify: `packages/logix-devtools-react/src/internal/ui/sidebar/Sidebar.tsx`
  - Rewrite as scope selector plus session navigator.
- Modify: `packages/logix-devtools-react/src/internal/ui/timeline/EffectOpTimelineView.tsx`
  - Accept session-scoped events and selected drilldown state.
- Modify: `packages/logix-devtools-react/src/internal/ui/timeline/Timeline.tsx`
  - Keep as drilldown shell only.
- Modify: `packages/logix-devtools-react/src/internal/ui/inspector/Inspector.tsx`
  - Scope to selected session/finding/artifact.
- Modify: `packages/logix-devtools-react/src/internal/ui/graph/FieldGraphView.tsx`
  - Scope to inspector drilldown only.
- Modify: `packages/logix-devtools-react/src/internal/ui/perf/ConvergePerformancePane.tsx`
  - Scope to selected finding evidence refs.
- Modify: `packages/logix-devtools-react/src/internal/ui/perf/ConvergeTimeline.tsx`
  - Scope to selected session range.
- Modify: `packages/logix-devtools-react/src/internal/ui/perf/ConvergeDetailsPanel.tsx`
  - Show artifact and focusRef visibility from selected finding.
- Modify: `packages/logix-devtools-react/src/internal/ui/settings/SettingsPanel.tsx`
  - Keep evidence tiers and display thresholds only.
- Modify: `packages/logix-devtools-react/src/internal/theme/theme.css`
  - Add constrained workbench layout rules with one primary scroll body.

Fold then delete or remove from default import path:

- Delete after folded coverage: `packages/logix-devtools-react/src/internal/ui/overview/OverviewStrip.tsx`
- Delete after folded coverage: `packages/logix-devtools-react/src/internal/ui/overview/OverviewDetails.tsx`
- Delete after folded coverage: `packages/logix-devtools-react/src/internal/ui/summary/OperationSummaryBar.tsx`
- Remove from default path: all time-travel controls and mutation UI state.

Create and update tests:

- Create: `packages/logix-devtools-react/test/internal/public-surface.guard.test.ts`
- Create: `packages/logix-devtools-react/test/internal/workbench-derivation.contract.test.ts`
- Create: `packages/logix-devtools-react/test/internal/workbench-gaps.contract.test.ts`
- Create: `packages/logix-devtools-react/test/internal/workbench-report-placement.contract.test.ts`
- Create: `packages/logix-devtools-react/test/internal/workbench-export.contract.test.ts`
- Create: `packages/logix-devtools-react/test/internal/workbench-state.contract.test.tsx`
- Create: `packages/logix-devtools-react/test/internal/workbench-layout.contract.test.tsx`
- Create: `packages/logix-devtools-react/test/internal/workbench-drilldowns.guard.test.tsx`
- Create: `packages/logix-devtools-react/test/internal/workbench-cost.baseline.test.ts`
- Modify or replace: existing tests under `packages/logix-devtools-react/test/internal/**` and `packages/logix-devtools-react/test/FieldGraphView/**` so test names follow final behavior.

## Chunk 1: Surface Guards And Inventory

Goal: lock the zero public surface and expose current timeline-first residue before implementation churn.

### Task 1.1: Guard public nullity

**Files:**

- Create: `packages/logix-devtools-react/test/internal/public-surface.guard.test.ts`
- Read: `packages/logix-devtools-react/package.json`
- Read: `packages/logix-devtools-react/src/index.tsx`

- [ ] **Step 1: Write public surface guard**

```ts
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const packageRoot = fileURLToPath(new URL('../..', import.meta.url))

const readText = (relativePath: string): string =>
  fs.readFileSync(path.join(packageRoot, relativePath), 'utf8')

const readPackageJson = (): any =>
  JSON.parse(readText('package.json'))

describe('@logixjs/devtools-react public surface', () => {
  it('keeps package root and internal subpaths closed', () => {
    const pkg = readPackageJson()

    expect(pkg.exports['.']).toBeNull()
    expect(pkg.exports['./internal/*']).toBeNull()
    expect(pkg.publishConfig.exports['.']).toBeNull()
    expect(pkg.publishConfig.exports['./internal/*']).toBeNull()
  })

  it('keeps root index empty', () => {
    expect(readText('src/index.tsx').trim()).toBe('export {}')
  })

  it('does not expose runtime devtools or inspect facades', () => {
    const srcFiles = [
      'src/index.tsx',
      'src/internal/ui/shell/LogixDevtools.tsx',
      'src/internal/ui/shell/LogixIsland.tsx',
    ].map(readText).join('\n')

    expect(srcFiles).not.toMatch(/\bRuntime\.devtools\b|\bruntime\.devtools\b/)
    expect(srcFiles).not.toMatch(/\bRuntime\.inspect\b|\bruntime\.inspect\b/)
  })
})
```

- [ ] **Step 2: Run the guard**

Run:

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/internal/public-surface.guard.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: PASS. This locks existing nullity before rewrites.

- [ ] **Step 3: Commit if authorized**

Run only when the implementation session has explicit commit authorization:

```bash
git add packages/logix-devtools-react/test/internal/public-surface.guard.test.ts
git commit -m "test(devtools): guard internal-only public surface"
```

### Task 1.2: Add default path residue guard

**Files:**

- Create: `packages/logix-devtools-react/test/internal/default-path-residue.guard.test.ts`
- Read: `packages/logix-devtools-react/src/internal/ui/shell/DevtoolsShell.tsx`
- Read: `packages/logix-devtools-react/src/internal/state/model.ts`

- [ ] **Step 1: Write failing guard for default path residue**

```ts
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const packageRoot = fileURLToPath(new URL('../..', import.meta.url))
const read = (relativePath: string): string =>
  fs.readFileSync(path.join(packageRoot, relativePath), 'utf8')

describe('DVTools default path residue', () => {
  it('does not import old global bands from DevtoolsShell', () => {
    const shell = read('src/internal/ui/shell/DevtoolsShell.tsx')

    expect(shell).not.toContain('../overview/OverviewStrip')
    expect(shell).not.toContain('../overview/OverviewDetails')
    expect(shell).not.toContain('../summary/OperationSummaryBar')
  })

  it('does not keep default time travel state', () => {
    const model = read('src/internal/state/model.ts')

    expect(model).not.toMatch(/\btimeTravel\b/)
    expect(model).not.toMatch(/\benableTimeTravelUI\b/)
  })
})
```

- [ ] **Step 2: Run and confirm current failure**

Run:

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/internal/default-path-residue.guard.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: FAIL while the old shell and state model still contain global bands and time-travel state.

- [ ] **Step 3: Keep the test failing until chunks 4 and 5**

Do not weaken this guard. It should pass only after the default path is rewritten and time travel is removed from the default model.

### Task 1.3: Capture component disposition as executable inventory

**Files:**

- Create: `packages/logix-devtools-react/test/internal/component-disposition.guard.test.ts`
- Read: `specs/159-dvtools-internal-workbench-cutover/spec.md`
- Read: `packages/logix-devtools-react/src/internal/**`

- [ ] **Step 1: Write inventory guard**

```ts
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = fileURLToPath(new URL('../../../..', import.meta.url))
const spec = fs.readFileSync(
  path.join(repoRoot, 'specs/159-dvtools-internal-workbench-cutover/spec.md'),
  'utf8',
)

const expectedRows = [
  'src/internal/state/model.ts',
  'src/internal/state/compute.ts',
  'src/internal/state/logic.ts',
  'DevtoolsShell',
  'LogixDevtools',
  'LogixIsland',
  'Sidebar',
  'OverviewStrip',
  'OverviewDetails',
  'OperationSummaryBar',
  'EffectOpTimelineView',
  'Timeline',
  'Inspector',
  'FieldGraphView',
  'ConvergePerformancePane',
  'ConvergeTimeline',
  'ConvergeDetailsPanel',
  'SettingsPanel',
  'Time travel controls',
]

describe('159 component disposition freeze', () => {
  it('keeps every current component assigned to one disposition', () => {
    for (const row of expectedRows) {
      const matches = spec.match(new RegExp(row.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []
      expect(matches.length).toBeGreaterThanOrEqual(1)
    }

    expect(spec).not.toMatch(/\bor\b.*disposition|\bTBD\b|candidate/i)
  })
})
```

- [ ] **Step 2: Run inventory guard**

Run:

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/internal/component-disposition.guard.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: PASS. If it fails, update the spec before implementation.

- [ ] **Step 3: Commit if authorized**

```bash
git add packages/logix-devtools-react/test/internal/public-surface.guard.test.ts packages/logix-devtools-react/test/internal/default-path-residue.guard.test.ts packages/logix-devtools-react/test/internal/component-disposition.guard.test.ts
git commit -m "test(devtools): freeze internal workbench cutover guards"
```

## Chunk 2: Derivation Kernel

Goal: implement one normalized derivation path before touching the shell.

### Task 2.1: Define workbench model and closed gap code set

**Files:**

- Create: `packages/logix-devtools-react/src/internal/state/workbench/model.ts`
- Create: `packages/logix-devtools-react/src/internal/state/workbench/index.ts`
- Create: `packages/logix-devtools-react/test/internal/workbench-gaps.contract.test.ts`

- [ ] **Step 1: Write failing gap-code test**

```ts
import { describe, expect, it } from 'vitest'
import { WORKBENCH_EVIDENCE_GAP_CODES } from '../../src/internal/state/workbench/index.js'

describe('DVTools workbench evidence gap codes', () => {
  it('matches the closed 159 gap code set', () => {
    expect(WORKBENCH_EVIDENCE_GAP_CODES).toEqual([
      'missing-runtime-scope',
      'missing-instance-coordinate',
      'missing-txn-coordinate',
      'missing-event-sequence',
      'missing-source-coordinate',
      'missing-artifact-key',
      'missing-static-summary',
      'dropped-evidence',
      'oversized-evidence',
      'truncated-window',
      'report-only-evidence',
      'diagnostics-disabled',
      'non-serializable-payload',
      'legacy-time-travel-data',
    ])
  })
})
```

- [ ] **Step 2: Run and confirm failure**

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/internal/workbench-gaps.contract.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: FAIL because the workbench module does not exist yet.

- [ ] **Step 3: Implement model constants and types**

Create `model.ts` with at least:

```ts
export const WORKBENCH_EVIDENCE_GAP_CODES = [
  'missing-runtime-scope',
  'missing-instance-coordinate',
  'missing-txn-coordinate',
  'missing-event-sequence',
  'missing-source-coordinate',
  'missing-artifact-key',
  'missing-static-summary',
  'dropped-evidence',
  'oversized-evidence',
  'truncated-window',
  'report-only-evidence',
  'diagnostics-disabled',
  'non-serializable-payload',
  'legacy-time-travel-data',
] as const

export type WorkbenchEvidenceGapCode = (typeof WORKBENCH_EVIDENCE_GAP_CODES)[number]

export interface WorkbenchStableCoordinate {
  readonly runtimeLabel: string
  readonly moduleId: string
  readonly instanceId: string
  readonly txnSeq?: number
  readonly opSeq?: number
  readonly eventSeq?: number
  readonly timestamp?: number
}

export interface WorkbenchEvidenceGap {
  readonly code: WorkbenchEvidenceGapCode
  readonly owner: 'empty' | 'session' | 'finding' | 'drilldown' | 'gap-session' | 'evidence-gap-bucket'
  readonly evidenceRefs: ReadonlyArray<string>
  readonly coordinate?: Partial<WorkbenchStableCoordinate>
}
```

Add session, finding, artifact, normalized input, report attachment, drilldown selector, and selection manifest interfaces in the same file. Keep them serializable.

- [ ] **Step 4: Export from `index.ts`**

```ts
export * from './model.js'
```

- [ ] **Step 5: Run test**

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/internal/workbench-gaps.contract.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: PASS.

### Task 2.2: Normalize live/import/report input

**Files:**

- Create: `packages/logix-devtools-react/src/internal/state/workbench/normalize.ts`
- Modify: `packages/logix-devtools-react/src/internal/state/workbench/index.ts`
- Create: `packages/logix-devtools-react/test/internal/workbench-derivation.contract.test.ts`

- [ ] **Step 1: Add failing normalization equivalence test**

```ts
import { describe, expect, it } from 'vitest'
import {
  normalizeImportedEvidencePackage,
  normalizeLiveSnapshot,
} from '../../src/internal/state/workbench/index.js'

const event = (override: Record<string, unknown>) => ({
  kind: 'state',
  label: 'state:update',
  runtimeLabel: 'app',
  moduleId: 'FormModule',
  instanceId: 'form-1',
  timestamp: 100,
  txnSeq: 1,
  opSeq: 1,
  eventSeq: 1,
  meta: {},
  ...override,
})

describe('DVTools normalized input', () => {
  it('normalizes live and imported evidence through the same shape', () => {
    const live = normalizeLiveSnapshot({
      events: [event({ eventSeq: 1 }), event({ eventSeq: 2, opSeq: 2 })],
      latestStates: new Map(),
      runtimes: [],
    } as any)

    const imported = normalizeImportedEvidencePackage({
      events: [event({ eventSeq: 1 }), event({ eventSeq: 2, opSeq: 2 })],
      summary: { staticIrByDigest: {} },
      artifacts: [],
    } as any)

    expect(imported.events).toEqual(live.events)
    expect(imported.source.kind).toBe('imported-evidence')
    expect(live.source.kind).toBe('live-snapshot')
  })
})
```

- [ ] **Step 2: Run and confirm failure**

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/internal/workbench-derivation.contract.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: FAIL because normalization functions do not exist yet.

- [ ] **Step 3: Implement normalizers**

Implement these functions:

```ts
export const normalizeLiveSnapshot = (snapshot: DevtoolsSnapshot): WorkbenchNormalizedInput => {
  return {
    source: { kind: 'live-snapshot' },
    events: normalizeDebugEvents(snapshot.events),
    evidencePackage: undefined,
    report: undefined,
    gaps: [],
  }
}

export const normalizeImportedEvidencePackage = (pkg: unknown): WorkbenchNormalizedInput => {
  return {
    source: { kind: 'imported-evidence' },
    events: normalizeEvidenceEvents(pkg),
    evidencePackage: pkg,
    report: undefined,
    gaps: detectImportGaps(pkg),
  }
}

export const normalizeControlPlaneReport = (report: unknown): WorkbenchNormalizedInput => {
  return {
    source: { kind: 'control-plane-report' },
    events: [],
    evidencePackage: undefined,
    report,
    gaps: [],
  }
}
```

Use structured fields only. Do not parse report summary text or diagnostic message text as authority.

- [ ] **Step 4: Run normalization test**

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/internal/workbench-derivation.contract.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: PASS for normalization equivalence and any existing assertions in that file.

### Task 2.3: Derive sessions by stable coordinates

**Files:**

- Create: `packages/logix-devtools-react/src/internal/state/workbench/derive.ts`
- Modify: `packages/logix-devtools-react/src/internal/state/workbench/index.ts`
- Modify: `packages/logix-devtools-react/test/internal/workbench-derivation.contract.test.ts`

- [ ] **Step 1: Add failing session precedence tests**

Add tests covering:

- runtime/module/instance splits
- `txnSeq` cluster precedence
- `eventSeq` bounded session fallback with `missing-txn-coordinate`
- timestamp as weak sort only
- truncated ring-buffer start producing `truncated-window`

Example assertion:

```ts
it('derives sessions by txnSeq before timestamp', () => {
  const model = deriveWorkbenchModel(
    normalizeLiveSnapshot({
      events: [
        event({ timestamp: 300, txnSeq: 2, opSeq: 1, eventSeq: 3 }),
        event({ timestamp: 100, txnSeq: 1, opSeq: 1, eventSeq: 1 }),
        event({ timestamp: 200, txnSeq: 1, opSeq: 2, eventSeq: 2 }),
      ],
      latestStates: new Map(),
      runtimes: [],
    } as any),
  )

  expect(model.sessions.map((session) => session.coordinate.txnSeqRange)).toEqual([
    { start: 1, end: 1 },
    { start: 2, end: 2 },
  ])
})
```

- [ ] **Step 2: Run and confirm failure**

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/internal/workbench-derivation.contract.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: FAIL until `deriveWorkbenchModel` is implemented.

- [ ] **Step 3: Implement derivation order**

Implement a pure function:

```ts
export const deriveWorkbenchModel = (input: WorkbenchNormalizedInput): WorkbenchModel => {
  const scopeIndex = deriveScopeIndex(input)
  const sessions = deriveSessions(scopeIndex, input.events)
  const findings = deriveFindings({ input, sessions })
  return attachArtifactsAndDrilldowns({ input, scopeIndex, sessions, findings })
}
```

Sorting order must be:

```text
runtimeLabel -> moduleId -> instanceId -> txnSeq -> opSeq -> eventSeq -> timestamp
```

Do not use `timestamp` for identity. Use it only for display and weak ordering after stable coordinates.

- [ ] **Step 4: Run derivation tests**

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/internal/workbench-derivation.contract.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: PASS.

### Task 2.4: Place reports and artifacts without second truth

**Files:**

- Create: `packages/logix-devtools-react/test/internal/workbench-report-placement.contract.test.ts`
- Modify: `packages/logix-devtools-react/src/internal/state/workbench/derive.ts`
- Modify: `packages/logix-devtools-react/src/internal/state/workbench/model.ts`

- [ ] **Step 1: Write failing report placement tests**

```ts
import { describe, expect, it } from 'vitest'
import {
  deriveWorkbenchModel,
  normalizeControlPlaneReport,
} from '../../src/internal/state/workbench/index.js'

describe('DVTools report placement', () => {
  it('attaches report fields to finding or drilldown without report lane', () => {
    const report = {
      stage: 'runtime.trial',
      mode: 'startup',
      verdict: 'failed',
      errorCode: 'runtime-startup-failed',
      summary: 'startup failed',
      repairHints: [{ focusRef: { sourceRef: 'src/form.ts:12' }, summary: 'fix dependency' }],
      artifacts: [{ key: 'startup-log', ref: 'artifact://startup-log' }],
      nextRecommendedStage: 'runtime.trial',
    }

    const model = deriveWorkbenchModel(normalizeControlPlaneReport(report))

    expect((model as any).reportLane).toBeUndefined()
    expect(model.findings[0]?.reportRef).toBeDefined()
    expect(model.findings[0]?.artifacts[0]?.artifactKey).toBe('startup-log')
  })

  it('creates report-only-evidence gap when report has no coordinates', () => {
    const model = deriveWorkbenchModel(normalizeControlPlaneReport({ verdict: 'failed', summary: 'no refs' }))

    expect(model.gaps.map((gap) => gap.code)).toContain('report-only-evidence')
  })
})
```

- [ ] **Step 2: Run and confirm failure**

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/internal/workbench-report-placement.contract.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: FAIL until report placement is implemented.

- [ ] **Step 3: Implement structured report placement**

Report-derived finding must preserve:

- `stage`
- `mode`
- `verdict`
- `errorCode`
- `summary`
- `artifacts`
- `repairHints`
- `nextRecommendedStage`

Artifact attachment minimum fields:

- `artifactKey`
- `artifactKind`
- `artifactRef`
- `evidenceRefs`
- `focusRef`
- `sourceRef`
- `summary`

Missing artifact key must create `missing-artifact-key` on finding.

- [ ] **Step 4: Run report placement tests**

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/internal/workbench-report-placement.contract.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: PASS.

### Task 2.5: Guard against free-text semantic parsing

**Files:**

- Create: `packages/logix-devtools-react/test/internal/workbench-no-free-text.guard.test.ts`
- Modify: `packages/logix-devtools-react/src/internal/state/workbench/derive.ts`

- [ ] **Step 1: Write failing or passing guard depending on implementation timing**

```ts
import { describe, expect, it } from 'vitest'
import { deriveWorkbenchModel, normalizeLiveSnapshot } from '../../src/internal/state/workbench/index.js'

describe('DVTools structured diagnostics authority', () => {
  it('ignores misleading text when structured coordinates disagree', () => {
    const model = deriveWorkbenchModel(normalizeLiveSnapshot({
      events: [{
        kind: 'devtools',
        label: 'diagnostic',
        runtimeLabel: 'app',
        moduleId: 'A',
        instanceId: 'i1',
        timestamp: 1,
        txnSeq: 1,
        opSeq: 1,
        eventSeq: 1,
        message: 'moduleId=B instanceId=i2 artifactKey=fake',
        meta: {
          focusRef: { sourceRef: 'src/a.ts:1' },
          artifactKey: 'real-artifact',
        },
      }],
      latestStates: new Map(),
      runtimes: [],
    } as any))

    expect(JSON.stringify(model)).toContain('real-artifact')
    expect(JSON.stringify(model)).not.toContain('fake')
    expect(model.sessions[0]?.coordinate.moduleId).toBe('A')
  })
})
```

- [ ] **Step 2: Run guard**

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/internal/workbench-no-free-text.guard.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: FAIL if derivation reads message text. PASS if structured-only derivation is already in place.

- [ ] **Step 3: Fix any structured-authority violation**

Remove any semantic parsing of `message`, `summary`, or human text fields. Display text can be shown as copy, but it cannot create module id, finding type, artifact key, focusRef, severity, or report placement.

### Task 2.6: Record derivation cost baseline

**Files:**

- Create: `packages/logix-devtools-react/test/internal/workbench-cost.baseline.test.ts`
- Modify: `packages/logix-devtools-react/src/internal/state/workbench/derive.ts` only if baseline exposes avoidable O(n²) behavior.

- [ ] **Step 1: Add 500-event baseline test**

```ts
import { describe, expect, it } from 'vitest'
import { performance } from 'node:perf_hooks'
import { deriveWorkbenchModel, normalizeLiveSnapshot } from '../../src/internal/state/workbench/index.js'

describe('DVTools workbench derivation baseline', () => {
  it('records 500-event derivation cost', () => {
    const events = Array.from({ length: 500 }, (_, index) => ({
      kind: index % 10 === 0 ? 'react-render' : 'state',
      label: index % 10 === 0 ? 'react:render' : 'state:update',
      runtimeLabel: 'app',
      moduleId: 'FormModule',
      instanceId: 'form-1',
      timestamp: index,
      txnSeq: Math.floor(index / 5) + 1,
      opSeq: (index % 5) + 1,
      eventSeq: index + 1,
      meta: {},
    }))

    const input = normalizeLiveSnapshot({ events, latestStates: new Map(), runtimes: [] } as any)

    const startedAt = performance.now()
    const model = deriveWorkbenchModel(input)
    const durationMs = performance.now() - startedAt

    expect(model.sessions.length).toBeGreaterThan(0)
    expect(durationMs).toBeLessThan(200)
  })
})
```

- [ ] **Step 2: Run baseline locally**

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/internal/workbench-cost.baseline.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: PASS on normal local machine. If unstable, convert the assertion to baseline-only recording, mark `P-011` as residual risk, and document command, machine class, measured duration, and reason in `specs/159-dvtools-internal-workbench-cutover/discussion.md`.

- [ ] **Step 3: Commit if authorized**

```bash
git add packages/logix-devtools-react/src/internal/state/workbench packages/logix-devtools-react/test/internal/workbench-*.test.ts packages/logix-devtools-react/test/internal/workbench-*.contract.test.ts packages/logix-devtools-react/test/internal/workbench-*.guard.test.ts
git commit -m "feat(devtools): add session-first derivation kernel"
```

## Chunk 3: State Integration And Export Loop

Goal: connect derivation to internal state and close the DVTools to CLI evidence loop.

### Task 3.1: Rewrite internal state model around workbench selection

**Files:**

- Modify: `packages/logix-devtools-react/src/internal/state/model.ts`
- Create: `packages/logix-devtools-react/test/internal/workbench-state.contract.test.tsx`

- [ ] **Step 1: Add failing state shape test**

```ts
import { describe, expect, it } from 'vitest'
import { emptyDevtoolsState } from '../../src/internal/state/model.js'

describe('DVTools workbench state', () => {
  it('uses workbench selections without default time travel state', () => {
    expect(emptyDevtoolsState).toMatchObject({
      open: false,
      selectedScopeId: undefined,
      selectedSessionId: undefined,
      selectedFindingId: undefined,
      selectedArtifactKey: undefined,
    })

    expect('timeTravel' in emptyDevtoolsState).toBe(false)
    expect(emptyDevtoolsState.settings).not.toHaveProperty('enableTimeTravelUI')
  })
})
```

- [ ] **Step 2: Run and confirm failure**

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/internal/workbench-state.contract.test.tsx --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: FAIL until state model is rewritten.

- [ ] **Step 3: Modify state model**

`DevtoolsState` should include:

- `selectedScopeId?: string`
- `selectedSessionId?: string`
- `selectedFindingId?: string`
- `selectedArtifactKey?: string`
- `selectedDrilldown?: WorkbenchDrilldownSelector`
- `workbench: WorkbenchModel`
- `importedEvidence?: unknown`
- `controlPlaneReport?: unknown`
- layout, theme, and display settings

Remove default state fields:

- `selectedEventIndex`
- `timelineRange` as a root default concept
- `timeTravel`
- settings `mode: "basic" | "deep"` if it implies old DVTools modes
- `enableTimeTravelUI`

- [ ] **Step 4: Run state shape test**

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/internal/workbench-state.contract.test.tsx --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: PASS.

### Task 3.2: Route compute through normalized derivation

**Files:**

- Modify: `packages/logix-devtools-react/src/internal/state/compute.ts`
- Modify: `packages/logix-devtools-react/test/internal/workbench-state.contract.test.tsx`

- [ ] **Step 1: Add compute contract test**

```ts
import { describe, expect, it } from 'vitest'
import { computeDevtoolsState } from '../../src/internal/state/compute.js'

describe('DVTools compute state', () => {
  it('derives workbench from live snapshot and keeps UI selection as selection only', () => {
    const state = computeDevtoolsState(undefined, {
      events: [{
        kind: 'state',
        label: 'state:update',
        runtimeLabel: 'app',
        moduleId: 'FormModule',
        instanceId: 'form-1',
        timestamp: 1,
        txnSeq: 1,
        opSeq: 1,
        eventSeq: 1,
        meta: {},
      }],
      latestStates: new Map(),
      runtimes: [],
    } as any)

    expect(state.workbench.sessions).toHaveLength(1)
    expect(state.selectedSessionId).toBe(state.workbench.sessions[0]?.id)
  })
})
```

- [ ] **Step 2: Run and confirm failure**

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/internal/workbench-state.contract.test.tsx --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: FAIL until `computeDevtoolsState` uses `deriveWorkbenchModel`.

- [ ] **Step 3: Implement compute integration**

Implementation rules:

- Convert snapshot through `normalizeLiveSnapshot`.
- Convert imported evidence through `normalizeImportedEvidencePackage`.
- Convert report through `normalizeControlPlaneReport`.
- Combine normalized inputs through a single merge function if live, imported, and report coexist.
- Preserve existing selection if the selected id still exists.
- Select first available scope/session/finding only when selection is empty or stale.
- Do not mutate normalized input from UI selection.

- [ ] **Step 4: Run compute contract tests**

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/internal/workbench-state.contract.test.tsx --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: PASS.

### Task 3.3: Add selection and import/export actions

**Files:**

- Modify: `packages/logix-devtools-react/src/internal/state/logic.ts`
- Modify: `packages/logix-devtools-react/src/internal/state/model.ts`
- Create: `packages/logix-devtools-react/test/internal/workbench-export.contract.test.ts`

- [ ] **Step 1: Add export loop contract test**

```ts
import { describe, expect, it } from 'vitest'
import {
  buildWorkbenchEvidenceExport,
  deriveWorkbenchModel,
  normalizeLiveSnapshot,
} from '../../src/internal/state/workbench/index.js'

describe('DVTools evidence export loop', () => {
  it('exports canonical evidence package plus non-authority selection manifest', () => {
    const workbench = deriveWorkbenchModel(normalizeLiveSnapshot({
      events: [{
        kind: 'state',
        label: 'state:update',
        runtimeLabel: 'app',
        moduleId: 'FormModule',
        instanceId: 'form-1',
        timestamp: 1,
        txnSeq: 1,
        opSeq: 1,
        eventSeq: 1,
        meta: {
          focusRef: { sourceRef: 'src/form.ts:1' },
          artifactKey: 'trial-report',
        },
      }],
      latestStates: new Map(),
      runtimes: [],
    } as any))

    const exported = buildWorkbenchEvidenceExport({
      workbench,
      selectedSessionId: workbench.sessions[0]!.id,
      selectedFindingId: workbench.findings[0]?.id,
      selectedArtifactKey: workbench.findings[0]?.artifacts[0]?.artifactKey,
    })

    expect(exported.evidencePackage).toBeDefined()
    expect(exported.selectionManifest).toMatchObject({
      sessionId: workbench.sessions[0]!.id,
    })
    expect(exported.selectionManifest).not.toHaveProperty('sessionTruth')
    expect(exported.selectionManifest).not.toHaveProperty('findingTruth')
    expect(exported.selectionManifest).not.toHaveProperty('reportTruth')
  })
})
```

- [ ] **Step 2: Run and confirm failure**

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/internal/workbench-export.contract.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: FAIL until export builder exists.

- [ ] **Step 3: Implement export builder**

Create `packages/logix-devtools-react/src/internal/state/workbench/export.ts` with:

```ts
export interface WorkbenchEvidenceExport {
  readonly evidencePackage: unknown
  readonly selectionManifest: WorkbenchSelectionManifest
}

export const buildWorkbenchEvidenceExport = (selection: WorkbenchExportSelection): WorkbenchEvidenceExport => {
  return {
    evidencePackage: buildCanonicalEvidencePackage(selection),
    selectionManifest: buildSelectionManifest(selection),
  }
}
```

Selection manifest may include:

- selected session id
- finding id
- artifact key
- focusRef
- runtime/module/instance/txn/op/event coordinates

Selection manifest must not include derived truth objects.

- [ ] **Step 4: Add logic actions**

Add internal actions:

- `selectScope`
- `selectSession`
- `selectFinding`
- `selectArtifact`
- `selectDrilldown`
- `importEvidencePackage`
- `attachControlPlaneReport`
- `clearImportedEvidence`
- `exportSelectedEvidence`

Keep actions internal to `DevtoolsLogic`. Do not add package exports.

- [ ] **Step 5: Run export tests**

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/internal/workbench-export.contract.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: PASS.

### Task 3.4: Prove imported mode uses the same interpreter

**Files:**

- Create: `packages/logix-devtools-react/test/internal/workbench-import-equivalence.contract.test.ts`
- Modify: `packages/logix-devtools-react/src/internal/state/workbench/normalize.ts`
- Modify: `packages/logix-devtools-react/src/internal/state/compute.ts`

- [ ] **Step 1: Write equivalence test**

```ts
import { describe, expect, it } from 'vitest'
import {
  deriveWorkbenchModel,
  normalizeImportedEvidencePackage,
  normalizeLiveSnapshot,
} from '../../src/internal/state/workbench/index.js'

describe('DVTools imported evidence equivalence', () => {
  it('derives the same sessions, findings, artifacts, and gaps from equivalent inputs', () => {
    const events = [
      {
        kind: 'state',
        label: 'state:update',
        runtimeLabel: 'app',
        moduleId: 'FormModule',
        instanceId: 'form-1',
        timestamp: 1,
        txnSeq: 1,
        opSeq: 1,
        eventSeq: 1,
        meta: {},
      },
    ]

    const live = deriveWorkbenchModel(normalizeLiveSnapshot({ events, latestStates: new Map(), runtimes: [] } as any))
    const imported = deriveWorkbenchModel(normalizeImportedEvidencePackage({ events, artifacts: [], summary: {} } as any))

    expect(imported.sessions).toEqual(live.sessions)
    expect(imported.findings).toEqual(live.findings)
    expect(imported.gaps.map((gap) => gap.code)).toEqual(live.gaps.map((gap) => gap.code))
  })
})
```

- [ ] **Step 2: Run and confirm failure or pass**

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/internal/workbench-import-equivalence.contract.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: PASS after chunks 2 and 3. If FAIL, remove import-only derivation branches.

- [ ] **Step 3: Commit if authorized**

```bash
git add packages/logix-devtools-react/src/internal/state packages/logix-devtools-react/test/internal/workbench-*.test.ts packages/logix-devtools-react/test/internal/workbench-*.contract.test.ts
git commit -m "feat(devtools): connect workbench state and evidence export"
```

## Chunk 4: Workbench Shell

Goal: replace the timeline-first default UI with one scrollable session workbench.

### Task 4.1: Build session workbench components

**Files:**

- Create: `packages/logix-devtools-react/src/internal/ui/workbench/SessionWorkbench.tsx`
- Create: `packages/logix-devtools-react/src/internal/ui/workbench/SessionSummary.tsx`
- Create: `packages/logix-devtools-react/src/internal/ui/workbench/FindingsList.tsx`
- Create: `packages/logix-devtools-react/src/internal/ui/workbench/ArtifactAttachments.tsx`
- Create: `packages/logix-devtools-react/src/internal/ui/workbench/EvidenceGapList.tsx`
- Create: `packages/logix-devtools-react/src/internal/ui/workbench/DrilldownHost.tsx`
- Create: `packages/logix-devtools-react/test/internal/workbench-layout.contract.test.tsx`

- [ ] **Step 1: Write render test for session-first default**

```tsx
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SessionWorkbench } from '../../src/internal/ui/workbench/SessionWorkbench.js'

describe('DVTools session workbench', () => {
  it('shows findings and artifact keys before raw timeline drilldown', () => {
    render(
      <SessionWorkbench
        session={{
          id: 'session-1',
          label: 'FormModule form-1 txn 1',
          metrics: { eventCount: 1, txnCount: 1, renderCount: 0 },
          findings: [{
            id: 'finding-1',
            severity: 'warning',
            summary: 'startup degraded',
            focusRef: { sourceRef: 'src/form.ts:1' },
            evidenceRefs: ['event:1'],
            artifacts: [{ artifactKey: 'trial-report', artifactRef: 'artifact://trial-report' }],
          }],
        } as any}
        selectedFindingId="finding-1"
        selectedArtifactKey="trial-report"
        onSelectFinding={vi.fn()}
        onSelectArtifact={vi.fn()}
        onSelectDrilldown={vi.fn()}
      />,
    )

    expect(screen.getByText('startup degraded')).toBeTruthy()
    expect(screen.getByText('trial-report')).toBeTruthy()
    expect(screen.queryByText(/raw timeline/i)).toBeNull()
  })
})
```

- [ ] **Step 2: Run and confirm failure**

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/internal/workbench-layout.contract.test.tsx --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: FAIL until workbench components exist.

- [ ] **Step 3: Implement components**

Rules:

- `SessionWorkbench` owns the main body.
- `SessionSummary` replaces global overview and operation summary.
- `FindingsList` shows severity, summary, focusRef, evidence gap, suggested action, and artifact keys.
- `ArtifactAttachments` shows artifact key, kind, ref, focusRef, sourceRef, and evidence refs.
- `EvidenceGapList` only shows closed codes.
- `DrilldownHost` renders drilldown only after explicit selection.

- [ ] **Step 4: Run workbench render test**

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/internal/workbench-layout.contract.test.tsx --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: PASS for new component test.

### Task 4.2: Rewrite shell and sidebar

**Files:**

- Modify: `packages/logix-devtools-react/src/internal/ui/shell/DevtoolsShell.tsx`
- Modify: `packages/logix-devtools-react/src/internal/ui/sidebar/Sidebar.tsx`
- Modify: `packages/logix-devtools-react/src/internal/theme/theme.css`
- Modify: `packages/logix-devtools-react/test/internal/workbench-layout.contract.test.tsx`
- Existing failing guard: `packages/logix-devtools-react/test/internal/default-path-residue.guard.test.ts`

- [ ] **Step 1: Add shell layout test**

Add assertions:

- compact header is present
- scope selector is present
- session navigator is present
- selected session workbench is present
- raw timeline is absent until drilldown
- workbench body has scrollable style under constrained height

Use `@testing-library/react` and the existing `DevtoolsHooks` test mocking pattern from current integration tests.

- [ ] **Step 2: Run and confirm failure**

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/internal/workbench-layout.contract.test.tsx test/internal/default-path-residue.guard.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: FAIL while `DevtoolsShell` imports old bands.

- [ ] **Step 3: Rewrite `DevtoolsShell`**

Shell structure:

```tsx
<div className="logix-devtools-panel">
  <header className="logix-devtools-header">...</header>
  <div className="logix-devtools-workbench">
    <Sidebar ... />
    <SessionWorkbench ... />
  </div>
</div>
```

CSS rules:

- panel height remains controlled by layout state
- header is compact
- `.logix-devtools-workbench` uses `min-height: 0`
- selected workbench body is the primary scroll container
- drilldowns scroll locally inside `DrilldownHost`

- [ ] **Step 4: Rewrite `Sidebar`**

Sidebar responsibilities:

- scope selector by runtime/module/instance/report source
- session navigator ordered by stable coordinates
- selected scope/session actions only
- no report lane
- no raw event root list

- [ ] **Step 5: Run shell tests**

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/internal/workbench-layout.contract.test.tsx test/internal/default-path-residue.guard.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: PASS for layout and default path residue guard after overview/summary imports are removed.

### Task 4.3: Keep internal mount wrappers internal

**Files:**

- Modify: `packages/logix-devtools-react/src/internal/ui/shell/LogixDevtools.tsx`
- Modify: `packages/logix-devtools-react/src/internal/ui/shell/LogixIsland.tsx`
- Modify: `packages/logix-devtools-react/test/internal/public-surface.guard.test.ts`

- [ ] **Step 1: Add mount wrapper guard assertions**

Extend public surface guard to assert:

- root `src/index.tsx` does not import mount wrappers
- `package.json` does not add toolkit or internal helper export
- mount wrappers do not mention public recipe text

- [ ] **Step 2: Run guard**

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/internal/public-surface.guard.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: PASS.

- [ ] **Step 3: Commit if authorized**

```bash
git add packages/logix-devtools-react/src/internal/ui packages/logix-devtools-react/src/internal/theme/theme.css packages/logix-devtools-react/test/internal/workbench-layout.contract.test.tsx packages/logix-devtools-react/test/internal/default-path-residue.guard.test.ts packages/logix-devtools-react/test/internal/public-surface.guard.test.ts
git commit -m "feat(devtools): replace default shell with session workbench"
```

## Chunk 5: Drilldown Adapters And Legacy Sweep

Goal: keep useful old panels only as scoped drilldowns and remove default mutation/time-travel residue.

### Task 5.1: Adapt timeline and inspector as drilldowns

**Files:**

- Modify: `packages/logix-devtools-react/src/internal/ui/timeline/EffectOpTimelineView.tsx`
- Modify: `packages/logix-devtools-react/src/internal/ui/timeline/Timeline.tsx`
- Modify: `packages/logix-devtools-react/src/internal/ui/inspector/Inspector.tsx`
- Create: `packages/logix-devtools-react/test/internal/workbench-drilldowns.guard.test.tsx`
- Modify: existing `packages/logix-devtools-react/test/internal/EffectOpTimelineView.test.tsx`

- [ ] **Step 1: Write drilldown guard**

```tsx
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DrilldownHost } from '../../src/internal/ui/workbench/DrilldownHost.js'

describe('DVTools drilldown ownership', () => {
  it('does not render timeline without explicit drilldown selector', () => {
    render(<DrilldownHost selector={undefined} session={{ events: [] } as any} finding={undefined} />)

    expect(screen.queryByText(/timeline/i)).toBeNull()
  })

  it('renders timeline from selected session only', () => {
    render(<DrilldownHost selector={{ kind: 'timeline', sessionId: 's1' }} session={{ id: 's1', events: [] } as any} finding={undefined} />)

    expect(screen.getByText(/timeline/i)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run and confirm failure**

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/internal/workbench-drilldowns.guard.test.tsx test/internal/EffectOpTimelineView.test.tsx --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: FAIL until `DrilldownHost` and scoped props exist.

- [ ] **Step 3: Adapt timeline**

Rules:

- Accept already scoped session events.
- No root event list.
- No session creation inside timeline.
- No evidence mutation.
- Field filtering can exist only as drilldown-local display state.

- [ ] **Step 4: Adapt inspector**

Rules:

- Accept selected session, finding, artifact attachment, and focusRef.
- Show raw report fields under explicit report drilldown.
- Show raw JSON under explicit raw drilldown.
- Do not parse text fields into coordinates.

- [ ] **Step 5: Run drilldown tests**

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/internal/workbench-drilldowns.guard.test.tsx test/internal/EffectOpTimelineView.test.tsx --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: PASS.

### Task 5.2: Adapt field graph and converge panes

**Files:**

- Modify: `packages/logix-devtools-react/src/internal/ui/graph/FieldGraphView.tsx`
- Modify: `packages/logix-devtools-react/src/internal/ui/perf/ConvergePerformancePane.tsx`
- Modify: `packages/logix-devtools-react/src/internal/ui/perf/ConvergeTimeline.tsx`
- Modify: `packages/logix-devtools-react/src/internal/ui/perf/ConvergeDetailsPanel.tsx`
- Modify: `packages/logix-devtools-react/test/FieldGraphView/FieldGraphView.test.tsx`
- Modify: `packages/logix-devtools-react/test/internal/ConvergeTimelinePane.test.tsx`
- Modify: `packages/logix-devtools-react/test/internal/ConvergeAudits.test.ts`

- [ ] **Step 1: Add scoped adapter assertions**

Tests must assert:

- Field graph renders only from inspector drilldown props.
- Converge pane reads selected finding evidence refs.
- Converge timeline filters to selected session range.
- Converge details show artifact key and focusRef when available.

- [ ] **Step 2: Run focused tests**

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/FieldGraphView/FieldGraphView.test.tsx test/internal/ConvergeTimelinePane.test.tsx test/internal/ConvergeAudits.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: FAIL until adapters accept scoped props.

- [ ] **Step 3: Implement scoped adapters**

Keep current useful rendering logic. Move root data selection to workbench derivation or `DrilldownHost`.

- [ ] **Step 4: Run focused tests**

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/FieldGraphView/FieldGraphView.test.tsx test/internal/ConvergeTimelinePane.test.tsx test/internal/ConvergeAudits.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: PASS.

### Task 5.3: Rewrite settings and remove time travel from default path

**Files:**

- Modify: `packages/logix-devtools-react/src/internal/ui/settings/SettingsPanel.tsx`
- Modify: `packages/logix-devtools-react/src/internal/state/model.ts`
- Modify: `packages/logix-devtools-react/src/internal/state/logic.ts`
- Modify: `packages/logix-devtools-react/test/internal/TimeTravel.test.tsx`
- Modify: `packages/logix-devtools-react/test/internal/devtools-state-toggle.unit.test.ts`
- Modify: `packages/logix-devtools-react/test/internal/default-path-residue.guard.test.ts`

- [ ] **Step 1: Rewrite time travel test as exclusion guard**

Replace old time travel behavior assertions with:

```tsx
describe('DVTools time travel exclusion', () => {
  it('treats legacy time travel data as gap or drilldown only', () => {
    // Build a snapshot carrying historical time travel data.
    // Assert derived gaps include legacy-time-travel-data.
    // Assert default shell does not render mutation controls.
  })
})
```

- [ ] **Step 2: Run and confirm old assumptions fail**

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/internal/TimeTravel.test.tsx test/internal/devtools-state-toggle.unit.test.ts test/internal/default-path-residue.guard.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: FAIL until time-travel controls and mode toggles are removed.

- [ ] **Step 3: Rewrite settings**

Settings may include:

- evidence tier
- display threshold
- event budget display
- sampling display for evidence explanation
- theme
- layout

Settings must not include:

- old `basic/deep` mode if it implies an old interpretation path
- `enableTimeTravelUI`
- runtime mutation toggle
- recording or profiling default enable switch

- [ ] **Step 4: Run settings and exclusion tests**

```bash
pnpm -C packages/logix-devtools-react exec vitest run test/internal/TimeTravel.test.tsx test/internal/devtools-state-toggle.unit.test.ts test/internal/default-path-residue.guard.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: PASS.

### Task 5.4: Delete folded global bands after coverage moves

**Files:**

- Delete: `packages/logix-devtools-react/src/internal/ui/overview/OverviewStrip.tsx`
- Delete: `packages/logix-devtools-react/src/internal/ui/overview/OverviewDetails.tsx`
- Delete: `packages/logix-devtools-react/src/internal/ui/summary/OperationSummaryBar.tsx`
- Modify or delete old tests:
  - `packages/logix-devtools-react/test/internal/OverviewStrip.test.tsx`
  - any summary-specific tests that no longer match final behavior

- [ ] **Step 1: Move relevant assertions**

Move useful assertions from old overview/summary tests into:

- `packages/logix-devtools-react/test/internal/workbench-layout.contract.test.tsx`
- `packages/logix-devtools-react/test/internal/workbench-derivation.contract.test.ts`

- [ ] **Step 2: Delete folded files**

Delete only after new coverage passes.

- [ ] **Step 3: Run import graph guard**

```bash
rg -n "OverviewStrip|OverviewDetails|OperationSummaryBar" packages/logix-devtools-react/src packages/logix-devtools-react/test
```

Expected: no matches, except intentional historical comments if kept in tests. Prefer zero matches.

- [ ] **Step 4: Commit if authorized**

```bash
git add packages/logix-devtools-react/src/internal/ui packages/logix-devtools-react/src/internal/state packages/logix-devtools-react/test
git commit -m "refactor(devtools): scope legacy panels as drilldowns"
```

## Chunk 6: Docs Closure And Package Verification

Goal: close 159 with proof pack, docs writeback, and package verification.

### Task 6.1: Update spec and discussion with actual closure facts

**Files:**

- Modify: `specs/159-dvtools-internal-workbench-cutover/spec.md`
- Modify: `specs/159-dvtools-internal-workbench-cutover/discussion.md`
- Modify only if facts changed: `docs/ssot/runtime/14-dvtools-internal-workbench.md`
- Modify only if evidence/report law changed: `docs/ssot/runtime/09-verification-control-plane.md`
- Modify only if negative control-plane statement changed: `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
- Modify only if a user-facing helper is proposed: `docs/ssot/runtime/11-toolkit-layer.md`

- [ ] **Step 1: Record implementation status**

Update `spec.md` status from draft to implemented or partially implemented after code and tests land.

- [ ] **Step 2: Close adopted discussion items**

Keep `discussion.md` as non-authority. Remove any accepted item that still lives only in discussion by copying it into `spec.md` or relevant SSoT.

- [ ] **Step 3: Record residual risks**

Required residual risk entries when applicable:

- unstable 500-event baseline
- insufficient `VerificationControlPlaneReport` coordinates
- canonical evidence package export gaps
- any drilldown retained with limited proof

### Task 6.2: Run focused closure proof pack

**Files:** no edits expected unless tests fail.

- [ ] **Step 1: Run typecheck for package tests**

```bash
pnpm -C packages/logix-devtools-react typecheck:test
```

Expected: PASS.

- [ ] **Step 2: Run package tests**

```bash
pnpm -C packages/logix-devtools-react test
```

Expected: PASS.

- [ ] **Step 3: Run package typecheck**

```bash
pnpm -C packages/logix-devtools-react typecheck
```

Expected: PASS.

- [ ] **Step 4: Run public surface and residue sweeps**

```bash
rg -n "\bRuntime\.devtools\b|\bruntime\.devtools\b|\bRuntime\.inspect\b|\bruntime\.inspect\b" packages/logix-devtools-react/src packages/logix-devtools-react/test
rg -n "\btimeTravel\b|\benableTimeTravelUI\b|TimeTravel" packages/logix-devtools-react/src packages/logix-devtools-react/test
rg -n "OverviewStrip|OverviewDetails|OperationSummaryBar" packages/logix-devtools-react/src packages/logix-devtools-react/test
```

Expected:

- first command has zero matches
- second command has zero default-path matches; allowed only in exclusion guard names or comments if unavoidable
- third command has zero matches after folded files are deleted

- [ ] **Step 5: Run broader typecheck only if shared types changed**

```bash
pnpm typecheck
```

Expected: PASS. Run this only if changes touch shared workspace types or repo-internal core evidence/report APIs.

### Task 6.3: Final implementation review

**Files:** no edits expected unless review finds drift.

- [ ] **Step 1: Check authority alignment**

Read:

- `specs/159-dvtools-internal-workbench-cutover/spec.md`
- `docs/ssot/runtime/14-dvtools-internal-workbench.md`
- `docs/ssot/runtime/09-verification-control-plane.md`

Confirm:

- default path is session-first
- export loop uses canonical evidence plus selection manifest
- report placement has no report lane
- artifact attachments are finding-owned
- public surface is closed
- time travel is outside default path

- [ ] **Step 2: Check changed files**

```bash
git status --short
git diff -- packages/logix-devtools-react specs/159-dvtools-internal-workbench-cutover docs/ssot/runtime/14-dvtools-internal-workbench.md docs/ssot/runtime/09-verification-control-plane.md docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md docs/ssot/runtime/11-toolkit-layer.md
```

Expected: only files needed for 159 are changed.

- [ ] **Step 3: Commit final slice if authorized**

```bash
git add packages/logix-devtools-react specs/159-dvtools-internal-workbench-cutover docs/ssot/runtime/14-dvtools-internal-workbench.md docs/ssot/runtime/09-verification-control-plane.md docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md docs/ssot/runtime/11-toolkit-layer.md
git commit -m "feat(devtools): cut over internal evidence workbench"
```

Skip commit if the current implementation session lacks explicit commit authorization.

## Closure Checklist

- [ ] `@logixjs/devtools-react` root export remains empty.
- [ ] `package.json` and `publishConfig.exports` keep `.` and `./internal/*` as `null`.
- [ ] No runtime `devtools` or `inspect` facade exists.
- [ ] Live and imported evidence share the same normalized derivation path.
- [ ] Sessions use stable coordinates before timestamp.
- [ ] Findings carry evidence refs and focusRef or explicit gap.
- [ ] Artifact attachment is subordinate to finding.
- [ ] Report display preserves control-plane report fields.
- [ ] Selection manifest carries entry hints only.
- [ ] Default shell shows scope selector, session navigator, and selected session workbench.
- [ ] Workbench body scrolls under constrained height.
- [ ] Timeline, inspector, field graph, converge, report, and raw JSON are explicit drilldowns.
- [ ] Time travel and mutation controls are absent from default path.
- [ ] Closed gap code set matches `spec.md`.
- [ ] `pnpm -C packages/logix-devtools-react typecheck:test` passes.
- [ ] `pnpm -C packages/logix-devtools-react test` passes.
- [ ] `pnpm -C packages/logix-devtools-react typecheck` passes.

## Execution Notes

- Use `superpowers:executing-plans` for single-agent execution.
- Use `superpowers:subagent-driven-development` only when the harness and current instructions explicitly allow subagents.
- Keep commits optional unless the user explicitly authorizes git commits for the implementation run.
- If implementation changes any core law, update SSoT first, then continue code closure.
