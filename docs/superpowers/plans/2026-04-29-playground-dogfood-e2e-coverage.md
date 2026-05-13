# Playground Dogfood E2E Coverage Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available and explicitly authorized for this repo) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

## Implementation Status

Status: implemented and verified on 2026-04-30.

Verification record: `specs/166-playground-driver-scenario-surface/notes/verification.md`

Actual proof files:

- `examples/logix-react/test/browser/playground-proof-recipes.ts`
- `examples/logix-react/test/browser/playground-proof-context.ts`
- `examples/logix-react/test/browser/playground-evidence-coordinate.ts`
- `examples/logix-react/test/browser/playground-gap-harvest.ts`
- `examples/logix-react/test/browser/playground-render-isolation.ts`
- `examples/logix-react/test/browser/playground-proof-packs.ts`
- `examples/logix-react/test/browser/playground-route-contract.playwright.ts`

Execution notes:

- Boundary owner attribution is implemented through `playground-gap-harvest.ts` and `playground-proof-packs.ts`; no separate `playground-boundary-probes.ts` file was needed.
- Region render isolation is implemented through `packages/logix-playground/src/internal/components/renderIsolationProbe.tsx`, `ResizableWorkbench` wrappers and Shell subscription narrowing.
- The route matrix remains in proof recipes. `docs/ssot/runtime/17-playground-product-workbench.md` contains only the Dogfooding Route Proof Law.

**Goal:** Turn `examples/logix-react` `/playground/:id` routes into registry-indexed Playwright dogfooding coverage that proves visible Playground affordances align with runtime evidence, React host render isolation, and active kernel gap pressure.

**Architecture:** Keep `logixReactPlaygroundRegistry` as the only project metadata authority. Add minimal test-only proof recipes, derive route/files/capabilities/pressure metadata from project declarations, run facet proof packs through the existing Playwright runner, assert live operations with one evidence coordinate oracle, split Playground workbench state ownership into region containers before coordinate wiring, add `renderIsolationProbe` for region fanout/remount proof, and add active boundary probes that route failures into existing evidence gap/control-plane/transport/projection faces.

**Tech Stack:** TypeScript, React 19, Vite, Playwright, Vitest, `@logixjs/playground`, `@logixjs/core` runtime evidence and workbench projection internals.

---

## Bound Inputs

- Proposal: `docs/review-plan/proposals/2026-04-29-playground-dogfood-e2e-coverage.md`
- Review ledger: `docs/review-plan/runs/2026-04-29-playground-dogfood-e2e-coverage.md`
- Runtime evidence premise: `docs/superpowers/plans/2026-04-29-playground-runtime-evidence-refresh.md`
- Runtime evidence review: `docs/review-plan/runs/2026-04-29-playground-runtime-reflection-gap.md`
- Product SSoT: `docs/ssot/runtime/17-playground-product-workbench.md`
- Current runner: `examples/logix-react/test/browser/playground-route-contract.playwright.ts`
- Registry: `examples/logix-react/src/playground/registry.ts`

## Preconditions

This plan assumes the runtime evidence refresh is implemented:

- `PlaygroundRuntimeEvidenceEnvelope` or equivalent exists.
- `reflect`, `run`, `dispatch`, `check`, and `trialStartup` write runtime evidence lanes.
- Action/Driver/Raw Dispatch consume runtime reflection manifest action tags.
- Workbench projection consumes runtime evidence envelopes.
- Source-regex action authority is removed from product path.

If these are not true, stop this plan and finish `docs/superpowers/plans/2026-04-29-playground-runtime-evidence-refresh.md` first.

## Non-Goals

- Do not reimplement runtime evidence refresh.
- Do not add public `@logixjs/core` or `@logixjs/playground` APIs.
- Do not add public selector APIs such as `Logix.Select.path(...)` in this plan.
- Do not add nested dirty evidence, broad subscription diagnostics, or runtime render fanout evidence to core in this plan.
- Do not add project metadata only for tests.
- Do not create a second gap taxonomy. `ownerClass` is only test failure attribution.
- Do not copy the route-by-route matrix into SSoT.
- Do not use watch-mode tests.
- Do not run `git add`, `git commit`, `git reset`, `git restore`, `git checkout`, `git clean`, or `git stash` unless the user explicitly asks.

## File Structure

- Create `examples/logix-react/test/browser/playground-proof-recipes.ts`
  - Owns the minimal exact record from project id to `reportLabel`, `proofPackIds`, and optional `assertDemoProof`.
  - Exports `assertProofRecipeCoverage`.
- Create `examples/logix-react/test/browser/playground-proof-context.ts`
  - Builds route, derived project metadata, region locators and common Playwright helpers from a registry project.
- Create `examples/logix-react/test/browser/playground-evidence-coordinate.ts`
  - Owns `EvidenceCoordinate`, `readEvidenceCoordinate`, `assertEvidenceCoordinate`, and trace/diagnostics/snapshot matching helpers.
- Create `examples/logix-react/test/browser/playground-gap-harvest.ts`
  - Owns owner-class typing, no-silent-fallback assertions and bounded failure face assertions.
- Create `examples/logix-react/test/browser/playground-boundary-probes.ts`
  - Owns active boundary probes for `reflection`, `runtime-run`, `runtime-dispatch`, `control-plane-check`, `control-plane-trial`, `transport`, `projection`, and `playground-product`.
- Create `examples/logix-react/test/browser/playground-render-isolation.ts`
  - Owns `renderIsolationProbe`, region counter reading, trigger allowlists, and fanout failure formatting.
- Create `examples/logix-react/test/browser/playground-proof-packs.ts`
  - Owns all-route invariants, facet-derived packs, pressure visual capacity, runtime evidence probe, gap harvest, render isolation and boundary probe orchestration.
- Modify `examples/logix-react/test/browser/playground-route-contract.playwright.ts`
  - Keep Vite server and Chromium lifecycle.
  - Replace hand-written route matrix with recipe/pack runner.
  - Keep bare route and project switcher checks.
- Modify `examples/logix-react/test/playground-registry.contract.test.ts`
  - Add exact registry/proof recipe coverage.
- Modify `packages/logix-playground/src/internal/components/PlaygroundShell.tsx`
  - Narrow Shell to workspace bridge, runtime invoker/session runner, effects, command callbacks and refs.
  - Stop subscribing to all display state in Shell.
- Create `packages/logix-playground/src/internal/components/renderIsolationProbe.tsx`
  - Owns internal test-only `RenderIsolationRegion` wrapper and browser-readable region commit/mount counters.
- Modify `packages/logix-playground/src/internal/layout/ResizableWorkbench.tsx`
  - Wrap each `data-playground-region` region with `RenderIsolationRegion` while preserving region attributes.
- Create or modify `packages/logix-playground/src/internal/components/WorkbenchLayoutRoot.tsx`
  - Owns `ResizableWorkbench`, subscribes only to `layout`, and passes stable region containers.
- Create or modify `packages/logix-playground/src/internal/components/HostCommandBarContainer.tsx`
  - Subscribes only to command bar state and receives stable command callbacks.
- Create or modify `packages/logix-playground/src/internal/components/FilesPanelContainer.tsx`
  - Subscribes only to active file and file-tree revision data.
- Create or modify `packages/logix-playground/src/internal/components/SourcePanelContainer.tsx`
  - Subscribes only to active file and workspace revision data.
- Create or modify `packages/logix-playground/src/internal/components/RuntimeInspectorContainer.tsx`
  - Subscribes only to runtime inspector state and current tab body inputs.
- Create or modify `packages/logix-playground/src/internal/components/BottomPanelContainer.tsx`
  - Subscribes only to bottom tab at tab-bar level and current active body data at body level.
- Modify `packages/logix-playground/src/internal/components/RuntimeInspector.tsx`
  - Preserve `aria-label="Runtime inspector"` and `data-playground-section` locators while splitting tab body ownership where needed.
- Modify `packages/logix-playground/src/internal/components/WorkbenchBottomPanel.tsx`
  - Preserve `Trace detail`, `Snapshot summary`, `Diagnostics detail`, and `data-playground-section` locators while splitting tab body ownership where needed.
- Modify `packages/logix-playground/src/internal/components/FilesPanel.tsx`, `SourcePanel.tsx`, and `HostCommandBar.tsx`
  - Preserve visible labels and region locators while moving subscriptions into containers.
- Modify `packages/logix-playground/src/internal/state/workbenchProgram.ts`
  - Split inspector state into smaller top-level fields or selectors for active tab, advanced dispatch, selected driver/scenario and execution state.
- Modify `packages/logix-playground/src/internal/components/ProgramPanel.tsx`
  - Only if current UI lacks stable evidence coordinate text/attributes.
- Modify `packages/logix-playground/src/internal/components/WorkbenchBottomPanel.tsx`
  - Only if Trace/Snapshot/Diagnostics do not expose evidence coordinate or gap owner fields.
- Modify `packages/logix-playground/src/internal/components/ActionManifestPanel.tsx` and `RawDispatchPanel.tsx`
  - Only if manifest authority and raw-dispatch validation are not readable by E2E.
- Modify `docs/ssot/runtime/17-playground-product-workbench.md`
  - Add a short Dogfooding route proof law covering runtime evidence alignment and React host render isolation.
- Modify `specs/166-playground-driver-scenario-surface/notes/verification.md`
  - Add final verification note with command, case count, proof recipe path, render isolation result, and any discovered kernel gaps.

## Chunk 1: Registry-indexed Proof Recipes

### Task 1: Add exact proof recipe coverage test

**Files:**
- Create: `examples/logix-react/test/browser/playground-proof-recipes.ts`
- Modify: `examples/logix-react/test/playground-registry.contract.test.ts`

- [ ] **Step 1: Write the failing coverage assertion**

Append this test to `examples/logix-react/test/playground-registry.contract.test.ts`:

```ts
import {
  assertProofRecipeCoverage,
  logixReactPlaygroundProofRecipes,
} from './browser/playground-proof-recipes'

it('keeps every registered Playground project covered by a dogfood proof recipe', () => {
  expect(() => assertProofRecipeCoverage(
    logixReactPlaygroundRegistry,
    logixReactPlaygroundProofRecipes,
  )).not.toThrow()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm -C examples/logix-react exec vitest run test/playground-registry.contract.test.ts --reporter=dot
```

Expected: FAIL because `test/browser/playground-proof-recipes.ts` does not exist.

- [ ] **Step 3: Add minimal proof recipe module**

Create `examples/logix-react/test/browser/playground-proof-recipes.ts`:

```ts
import { strict as assert } from 'node:assert'
import type { Page } from 'playwright'
import type { PlaygroundProject } from '@logixjs/playground/Project'

export type ProofPackId =
  | 'run'
  | 'check'
  | 'trialStartup'
  | 'actions'
  | 'drivers'
  | 'scenarios'
  | 'serviceFiles'
  | 'pressureVisualCapacity'
  | 'runtimeEvidenceProbe'
  | 'gapHarvest'
  | 'renderIsolationProbe'
  | 'boundaryProbe'

export interface PlaygroundProofContext {
  readonly page: Page
  readonly baseUrl: string
  readonly project: PlaygroundProject
  readonly route: string
}

export interface PlaygroundRouteProofRecipe {
  readonly projectId: string
  readonly reportLabel: string
  readonly proofPackIds: ReadonlyArray<ProofPackId>
  readonly assertDemoProof?: (ctx: PlaygroundProofContext) => Promise<void>
}

export const logixReactPlaygroundProofRecipes = {
  'logix-react.local-counter': {
    projectId: 'logix-react.local-counter',
    reportLabel: 'local-counter runtime chain',
    proofPackIds: ['run', 'check', 'trialStartup', 'actions', 'drivers', 'scenarios', 'runtimeEvidenceProbe', 'gapHarvest', 'renderIsolationProbe', 'boundaryProbe'],
  },
  'logix-react.pressure.action-dense': {
    projectId: 'logix-react.pressure.action-dense',
    reportLabel: 'action density visual capacity',
    proofPackIds: ['actions', 'pressureVisualCapacity', 'runtimeEvidenceProbe', 'gapHarvest', 'renderIsolationProbe'],
  },
  'logix-react.pressure.state-large': {
    projectId: 'logix-react.pressure.state-large',
    reportLabel: 'state projection visual capacity',
    proofPackIds: ['pressureVisualCapacity', 'runtimeEvidenceProbe', 'gapHarvest'],
  },
  'logix-react.pressure.trace-heavy': {
    projectId: 'logix-react.pressure.trace-heavy',
    reportLabel: 'trace drawer visual capacity',
    proofPackIds: ['pressureVisualCapacity', 'runtimeEvidenceProbe', 'gapHarvest', 'renderIsolationProbe', 'boundaryProbe'],
  },
  'logix-react.pressure.diagnostics-dense': {
    projectId: 'logix-react.pressure.diagnostics-dense',
    reportLabel: 'diagnostics visual capacity',
    proofPackIds: ['check', 'trialStartup', 'pressureVisualCapacity', 'runtimeEvidenceProbe', 'gapHarvest', 'boundaryProbe'],
  },
  'logix-react.pressure.scenario-driver-payload': {
    projectId: 'logix-react.pressure.scenario-driver-payload',
    reportLabel: 'driver scenario payload visual capacity',
    proofPackIds: ['drivers', 'scenarios', 'pressureVisualCapacity', 'runtimeEvidenceProbe', 'gapHarvest'],
  },
  'logix-react.service-source': {
    projectId: 'logix-react.service-source',
    reportLabel: 'service source runtime chain',
    proofPackIds: ['run', 'check', 'trialStartup', 'serviceFiles', 'runtimeEvidenceProbe', 'gapHarvest', 'boundaryProbe'],
  },
} satisfies Record<string, PlaygroundRouteProofRecipe>

export const assertProofRecipeCoverage = (
  registry: ReadonlyArray<PlaygroundProject>,
  recipes: Record<string, PlaygroundRouteProofRecipe>,
): void => {
  const registryIds = registry.map((project) => project.id).sort()
  const recipeIds = Object.keys(recipes).sort()
  assert.deepEqual(recipeIds, registryIds, 'Playground dogfood proof recipes must exactly cover the registry project ids')

  for (const [projectId, recipe] of Object.entries(recipes)) {
    assert.equal(recipe.projectId, projectId, `recipe key and projectId must match for ${projectId}`)
    assert(recipe.reportLabel.length > 0, `recipe ${projectId} must expose a short report label`)
    assert(recipe.proofPackIds.includes('runtimeEvidenceProbe'), `recipe ${projectId} must include runtimeEvidenceProbe`)
    assert(recipe.proofPackIds.includes('gapHarvest'), `recipe ${projectId} must include gapHarvest`)
  }
}
```

- [ ] **Step 4: Run coverage test**

Run:

```bash
rtk pnpm -C examples/logix-react exec vitest run test/playground-registry.contract.test.ts --reporter=dot
```

Expected: PASS.

### Task 2: Enforce no thick proof recipe fields

**Files:**
- Modify: `examples/logix-react/test/browser/playground-proof-recipes.ts`
- Modify: `examples/logix-react/test/playground-registry.contract.test.ts`

- [ ] **Step 1: Add failing negative shape assertion**

Append to the new registry test:

```ts
it('keeps dogfood proof recipes from becoming second project metadata', () => {
  const forbiddenKeys = [
    'route',
    'requiredFiles',
    'expectedInitialTabs',
    'requiredRegions',
    'runtimeChecks',
    'visualPressureChecks',
  ]

  for (const recipe of Object.values(logixReactPlaygroundProofRecipes)) {
    for (const key of forbiddenKeys) {
      expect(Object.prototype.hasOwnProperty.call(recipe, key)).toBe(false)
    }
  }
})
```

- [ ] **Step 2: Run test**

Run:

```bash
rtk pnpm -C examples/logix-react exec vitest run test/playground-registry.contract.test.ts --reporter=dot
```

Expected: PASS if Task 1 used the minimal recipe shape. If it fails, remove forbidden fields from the recipe.

## Chunk 2: Evidence Coordinate And Gap Helpers

### Task 3: Add evidence coordinate helper contract

**Files:**
- Create: `examples/logix-react/test/browser/playground-evidence-coordinate.ts`
- Create: `examples/logix-react/test/browser/playground-evidence-coordinate.contract.test.ts`

- [ ] **Step 1: Write failing helper unit test**

Create `examples/logix-react/test/browser/playground-evidence-coordinate.contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  assertSameEvidenceCoordinate,
  parseEvidenceCoordinateText,
} from './playground-evidence-coordinate'

describe('Playground evidence coordinate test helper', () => {
  it('parses the stable evidence coordinate projection', () => {
    expect(parseEvidenceCoordinateText([
      'projectId=logix-react.local-counter',
      'sourceRevision=3',
      'sourceDigest=playground-source:abc',
      'operationKind=run',
      'operationId=logix-react.local-counter:r3:run:op4',
    ].join('\n'))).toEqual({
      projectId: 'logix-react.local-counter',
      sourceRevision: '3',
      sourceDigest: 'playground-source:abc',
      operationKind: 'run',
      operationId: 'logix-react.local-counter:r3:run:op4',
    })
  })

  it('requires exact coordinate equality across faces', () => {
    const coordinate = parseEvidenceCoordinateText([
      'projectId=logix-react.local-counter',
      'sourceRevision=3',
      'sourceDigest=playground-source:abc',
      'operationKind=run',
      'operationId=logix-react.local-counter:r3:run:op4',
    ].join('\n'))

    expect(() => assertSameEvidenceCoordinate(coordinate, coordinate, 'same coordinate')).not.toThrow()
    expect(() => assertSameEvidenceCoordinate(coordinate, {
      ...coordinate,
      sourceDigest: 'playground-source:other',
    }, 'digest mismatch')).toThrow(/same evidence coordinate/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm -C examples/logix-react exec vitest run test/browser/playground-evidence-coordinate.contract.test.ts --reporter=dot
```

Expected: FAIL because helper file does not exist.

- [ ] **Step 3: Implement helper**

Create `examples/logix-react/test/browser/playground-evidence-coordinate.ts`:

```ts
import { strict as assert } from 'node:assert'
import type { Locator, Page } from 'playwright'

export interface EvidenceCoordinate {
  readonly projectId: string
  readonly sourceRevision: string
  readonly sourceDigest: string
  readonly operationKind: string
  readonly operationId: string
}

const requiredKeys = ['projectId', 'sourceRevision', 'sourceDigest', 'operationKind', 'operationId'] as const

export const parseEvidenceCoordinateText = (text: string): EvidenceCoordinate => {
  const entries = new Map(
    text
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [key, ...rest] = part.split('=')
        return [key, rest.join('=')] as const
      }),
  )
  for (const key of requiredKeys) {
    assert(entries.get(key), `Missing evidence coordinate key ${key} in ${JSON.stringify(text)}`)
  }
  return {
    projectId: entries.get('projectId')!,
    sourceRevision: entries.get('sourceRevision')!,
    sourceDigest: entries.get('sourceDigest')!,
    operationKind: entries.get('operationKind')!,
    operationId: entries.get('operationId')!,
  }
}

export const readEvidenceCoordinate = async (
  locator: Locator,
  label: string,
): Promise<EvidenceCoordinate> => {
  const attr = await locator.getAttribute('data-playground-evidence-coordinate')
  if (attr) return parseEvidenceCoordinateText(attr)
  const text = await locator.textContent()
  assert(text, `${label} should expose evidence coordinate text or data-playground-evidence-coordinate`)
  return parseEvidenceCoordinateText(text)
}

export const assertSameEvidenceCoordinate = (
  expected: EvidenceCoordinate,
  actual: EvidenceCoordinate,
  context: string,
): void => {
  assert.deepEqual(actual, expected, `${context} should share the same evidence coordinate`)
}

export const assertTraceContainsCoordinate = async (
  page: Page,
  expected: EvidenceCoordinate,
  context: string,
): Promise<void> => {
  await selectBottomEvidenceTab(page, 'Trace')
  const trace = page.getByLabel('Trace detail')
  const text = await trace.textContent()
  assert(text?.includes(expected.operationId), `${context} Trace should include operationId ${expected.operationId}`)
  assert(text?.includes(expected.sourceRevision), `${context} Trace should include sourceRevision ${expected.sourceRevision}`)
  assert(text?.includes(expected.sourceDigest), `${context} Trace should include sourceDigest ${expected.sourceDigest}`)
  assert(
    text?.includes('operation.completed') || text?.includes('operation.failed') || text?.includes('evidence.gap'),
    `${context} Trace should include a terminal operation event or evidence gap`,
  )
}

export const selectBottomEvidenceTab = async (
  page: Page,
  tab: 'Console' | 'Diagnostics' | 'Trace' | 'Snapshot' | 'Scenario',
): Promise<void> => {
  await page.getByRole('region', { name: 'Workbench bottom console' }).getByRole('button', { name: tab }).click()
}

export const assertRegionContainsCoordinate = async (
  locator: Locator,
  expected: EvidenceCoordinate,
  context: string,
): Promise<void> => {
  const text = await locator.textContent()
  assert(text?.includes(expected.operationId), `${context} should include operationId ${expected.operationId}`)
  assert(text?.includes(expected.sourceRevision), `${context} should include sourceRevision ${expected.sourceRevision}`)
  assert(text?.includes(expected.sourceDigest), `${context} should include sourceDigest ${expected.sourceDigest}`)
}

export const assertEvidenceCoordinate = async (input: {
  readonly page: Page
  readonly source: Locator
  readonly context: string
  readonly expectedProjectId: string
  readonly expectedOperationKind?: string
  readonly diagnostics?: Locator
  readonly consoleOrState?: Locator
  readonly snapshot?: Locator
}): Promise<EvidenceCoordinate> => {
  const coordinate = await readEvidenceCoordinate(input.source, input.context)
  assert.equal(coordinate.projectId, input.expectedProjectId, `${input.context} projectId should match`)
  if (input.expectedOperationKind) {
    assert.equal(coordinate.operationKind, input.expectedOperationKind, `${input.context} operationKind should match`)
  }
  await assertTraceContainsCoordinate(input.page, coordinate, input.context)

  if (input.diagnostics) {
    await selectBottomEvidenceTab(input.page, 'Diagnostics')
    await assertRegionContainsCoordinate(input.diagnostics, coordinate, `${input.context} Diagnostics detail`)
  }
  if (input.consoleOrState) {
    await selectBottomEvidenceTab(input.page, 'Console')
    await assertRegionContainsCoordinate(input.consoleOrState, coordinate, `${input.context} console/state detail`)
  }

  const snapshot = input.snapshot ?? input.page.getByLabel('Snapshot summary')
  await selectBottomEvidenceTab(input.page, 'Snapshot')
  await assertRegionContainsCoordinate(snapshot, coordinate, `${input.context} Snapshot summary`)

  return coordinate
}
```

- [ ] **Step 4: Run helper test**

Run:

```bash
rtk pnpm -C examples/logix-react exec vitest run test/browser/playground-evidence-coordinate.contract.test.ts --reporter=dot
```

Expected: PASS. This helper must be used by `run`, `check`, `trialStartup`, `actions`, `drivers`, `scenarios`, `serviceFiles`, and `runtimeEvidenceProbe` packs in later tasks.

### Task 4: Add gap harvest helper contract

**Files:**
- Create: `examples/logix-react/test/browser/playground-gap-harvest.ts`
- Create: `examples/logix-react/test/browser/playground-gap-harvest.contract.test.ts`

- [ ] **Step 1: Write failing helper test**

Create `examples/logix-react/test/browser/playground-gap-harvest.contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  assertKnownAuthorityOrGapText,
  formatGapFailure,
  isKnownOwnerClass,
} from './playground-gap-harvest'

describe('Playground gap harvest helpers', () => {
  it('keeps ownerClass as test attribution without creating runtime gap codes', () => {
    expect(isKnownOwnerClass('runtime-dispatch')).toBe(true)
    expect(isKnownOwnerClass('new-runtime-gap-code')).toBe(false)
    expect(formatGapFailure({
      projectId: 'logix-react.local-counter',
      packId: 'boundaryProbe',
      ownerClass: 'runtime-dispatch',
      message: 'dispatch did not expose failed event',
    })).toContain('ownerClass=runtime-dispatch')
  })

  it('accepts only existing authority, failure, or evidence gap faces', () => {
    expect(() => assertKnownAuthorityOrGapText({
      projectId: 'logix-react.local-counter',
      packId: 'gapHarvest',
      ownerClass: 'reflection',
      regionLabel: 'Action workbench',
      text: 'authority=runtime-reflection actionTag=increment',
    })).not.toThrow()
    expect(() => assertKnownAuthorityOrGapText({
      projectId: 'logix-react.local-counter',
      packId: 'gapHarvest',
      ownerClass: 'projection',
      regionLabel: 'Diagnostics detail',
      text: 'rendered empty panel',
    })).toThrow(/ownerClass=projection/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm -C examples/logix-react exec vitest run test/browser/playground-gap-harvest.contract.test.ts --reporter=dot
```

Expected: FAIL because helper file does not exist.

- [ ] **Step 3: Implement helper**

Create `examples/logix-react/test/browser/playground-gap-harvest.ts`:

```ts
import { strict as assert } from 'node:assert'
import type { Locator, Page } from 'playwright'
import type { ProofPackId } from './playground-proof-recipes'

export type GapOwnerClass =
  | 'reflection'
  | 'runtime-run'
  | 'runtime-dispatch'
  | 'control-plane-check'
  | 'control-plane-trial'
  | 'transport'
  | 'projection'
  | 'playground-product'

const ownerClasses = new Set<GapOwnerClass>([
  'reflection',
  'runtime-run',
  'runtime-dispatch',
  'control-plane-check',
  'control-plane-trial',
  'transport',
  'projection',
  'playground-product',
])

export const isKnownOwnerClass = (value: string): value is GapOwnerClass =>
  ownerClasses.has(value as GapOwnerClass)

export const formatGapFailure = (input: {
  readonly projectId: string
  readonly packId: ProofPackId
  readonly ownerClass: GapOwnerClass
  readonly message: string
}): string =>
  `projectId=${input.projectId} packId=${input.packId} ownerClass=${input.ownerClass} ${input.message}`

export const assertNoSilentFallback = async (
  page: Page,
  projectId: string,
  packId: ProofPackId,
): Promise<void> => {
  const body = await page.locator('body').textContent()
  const forbidden = ['[object Event]', 'fallback-source-regex', 'deriveFallbackActionManifestFromSnapshot']
  for (const item of forbidden) {
    assert(
      !body?.includes(item),
      formatGapFailure({ projectId, packId, ownerClass: 'playground-product', message: `forbidden silent fallback leaked ${item}` }),
    )
  }
}

export const assertGapVisible = async (input: {
  readonly page: Page
  readonly projectId: string
  readonly packId: ProofPackId
  readonly ownerClass: GapOwnerClass
  readonly expectedText: string | RegExp
}): Promise<void> => {
  const body = await input.page.locator('body').textContent()
  const matched = typeof input.expectedText === 'string'
    ? body?.includes(input.expectedText)
    : input.expectedText.test(body ?? '')
  assert(
    matched,
    formatGapFailure({
      projectId: input.projectId,
      packId: input.packId,
      ownerClass: input.ownerClass,
      message: `expected visible gap/failure ${String(input.expectedText)}`,
    }),
  )
}

const knownAuthorityOrGap = /runtime-reflection|operation\.accepted|operation\.completed|operation\.failed|evidence\.gap|transportFailure|compile-failure|runtime failure|Runtime reflection manifest unavailable|unavailable|FAIL|PASS/i

export const assertKnownAuthorityOrGapText = (input: {
  readonly projectId: string
  readonly packId: ProofPackId
  readonly ownerClass: GapOwnerClass
  readonly regionLabel: string
  readonly text: string | undefined | null
}): void => {
  assert(
    input.text && knownAuthorityOrGap.test(input.text),
    formatGapFailure({
      projectId: input.projectId,
      packId: input.packId,
      ownerClass: input.ownerClass,
      message: `${input.regionLabel} should expose existing authority, failure, or evidence gap face`,
    }),
  )
}

export const assertKnownAuthorityOrGap = async (input: {
  readonly page: Page
  readonly projectId: string
  readonly packId: ProofPackId
  readonly ownerClass: GapOwnerClass
  readonly region: Locator
  readonly regionLabel: string
}): Promise<void> => {
  await assertKnownAuthorityOrGapText({
    projectId: input.projectId,
    packId: input.packId,
    ownerClass: input.ownerClass,
    regionLabel: input.regionLabel,
    text: await input.region.textContent(),
  })
}

export const assertAllRouteGapHarvest = async (input: {
  readonly page: Page
  readonly projectId: string
  readonly packId: ProofPackId
  readonly hasRun: boolean
  readonly hasCheck: boolean
  readonly hasTrialStartup: boolean
  readonly hasActions: boolean
  readonly expectedMissingAuthorityRegions?: ReadonlyArray<{
    readonly ownerClass: GapOwnerClass
    readonly region: Locator
    readonly regionLabel: string
  }>
}): Promise<void> => {
  const { page, projectId, packId } = input
  await assertNoSilentFallback(page, projectId, packId)

  const assertUnavailable = async (ownerClass: GapOwnerClass, region: Locator, regionLabel: string): Promise<void> => {
    await assertKnownAuthorityOrGap({
      page,
      projectId,
      packId,
      ownerClass,
      region,
      regionLabel,
    })
  }

  if (input.hasActions) {
    await assertKnownAuthorityOrGap({
      page,
      projectId,
      packId,
      ownerClass: 'reflection',
      region: page.getByRole('region', { name: 'Action workbench' }),
      regionLabel: 'Action workbench',
    })
  } else {
    await assertUnavailable(
      'reflection',
      page.getByRole('region', { name: 'Runtime inspector' }),
      'Runtime inspector action unavailable state',
    )
  }

  if (input.hasRun) {
    await assertKnownAuthorityOrGap({
      page,
      projectId,
      packId,
      ownerClass: 'runtime-run',
      region: page.getByRole('region', { name: 'Program result' }),
      regionLabel: 'Program result',
    })
  } else {
    await assertUnavailable(
      'runtime-run',
      page.getByRole('region', { name: 'Program result' }),
      'Program result unavailable state',
    )
  }

  if (input.hasCheck) {
    await page.getByRole('region', { name: 'Workbench bottom console' }).getByRole('button', { name: 'Diagnostics' }).click()
    await assertKnownAuthorityOrGap({
      page,
      projectId,
      packId,
      ownerClass: 'control-plane-check',
      region: page.getByRole('region', { name: 'Check report' }),
      regionLabel: 'Check report',
    })
  } else {
    await assertUnavailable(
      'control-plane-check',
      page.getByRole('region', { name: 'Workbench bottom console' }),
      'Check unavailable state',
    )
  }

  if (input.hasTrialStartup) {
    await page.getByRole('region', { name: 'Workbench bottom console' }).getByRole('button', { name: 'Diagnostics' }).click()
    await assertKnownAuthorityOrGap({
      page,
      projectId,
      packId,
      ownerClass: 'control-plane-trial',
      region: page.getByRole('region', { name: 'Trial report' }),
      regionLabel: 'Trial report',
    })
  } else {
    await assertUnavailable(
      'control-plane-trial',
      page.getByRole('region', { name: 'Workbench bottom console' }),
      'Trial unavailable state',
    )
  }

  for (const item of input.expectedMissingAuthorityRegions ?? []) {
    await assertKnownAuthorityOrGap({
      page,
      projectId,
      packId,
      ownerClass: item.ownerClass,
      region: item.region,
      regionLabel: item.regionLabel,
    })
  }

  await assertKnownAuthorityOrGap({
    page,
    projectId,
    packId,
    ownerClass: 'projection',
    region: page.getByRole('region', { name: 'Workbench bottom console' }),
    regionLabel: 'Workbench bottom console',
  })

  await assertKnownAuthorityOrGap({
    page,
    projectId,
    packId,
    ownerClass: 'transport',
    region: page.getByRole('region', { name: 'Program result' }),
    regionLabel: 'Program result transport/compile/runtime face',
  })
}
```

- [ ] **Step 4: Run helper test**

Run:

```bash
rtk pnpm -C examples/logix-react exec vitest run test/browser/playground-gap-harvest.contract.test.ts --reporter=dot
```

Expected: PASS.

## Chunk 3: Proof Context And Playwright Pack Runner

### Task 5: Add proof context helpers

**Files:**
- Create: `examples/logix-react/test/browser/playground-proof-context.ts`
- Modify: `examples/logix-react/test/browser/playground-route-contract.playwright.ts`

- [ ] **Step 1: Add proof context module**

Create `examples/logix-react/test/browser/playground-proof-context.ts`:

```ts
import { strict as assert } from 'node:assert'
import type { Locator, Page } from 'playwright'
import type { PlaygroundProject } from '@logixjs/playground/Project'

export const routeForPlaygroundProject = (project: PlaygroundProject): string =>
  `/playground/${project.id}`

export const formatProjectLabel = (projectId: string): string =>
  projectId.startsWith('logix-react.') ? projectId.slice('logix-react.'.length) : projectId

export const gotoProjectRoute = async (
  page: Page,
  baseUrl: string,
  project: PlaygroundProject,
): Promise<void> => {
  await page.goto(`${baseUrl}${routeForPlaygroundProject(project)}`, { waitUntil: 'networkidle' })
  await page.getByText('Logix Playground').waitFor({ state: 'visible' })
}

export const getHostCommand = (page: Page, name: string): Locator =>
  page.locator('[data-playground-region="top-command-bar"]').getByRole('button', { name, exact: true })

export const getPressureFixture = (project: PlaygroundProject): {
  readonly activeInspectorTab: string
  readonly activeBottomTab: string
  readonly dataProfile: Readonly<Record<string, number>>
  readonly scrollOwners?: ReadonlyArray<string>
  readonly requiredVisibleRegions?: ReadonlyArray<string>
} | undefined => {
  const pressure = typeof project.fixtures === 'object' && project.fixtures && 'pressure' in project.fixtures
    ? project.fixtures.pressure
    : undefined
  if (!pressure || typeof pressure !== 'object') return undefined
  return pressure as {
    readonly activeInspectorTab: string
    readonly activeBottomTab: string
    readonly dataProfile: Readonly<Record<string, number>>
    readonly scrollOwners?: ReadonlyArray<string>
    readonly requiredVisibleRegions?: ReadonlyArray<string>
  }
}

export const assertNoPageOverflow = async (page: Page, context: string): Promise<void> => {
  const scrollHeight = await page.evaluate(() => document.scrollingElement?.scrollHeight ?? 0)
  const height = page.viewportSize()?.height ?? 768
  assert(scrollHeight <= height + 1, `${context} should not create page overflow: ${scrollHeight}`)
}
```

- [ ] **Step 2: Run typecheck to catch import mistakes**

Run:

```bash
rtk pnpm -C examples/logix-react typecheck
```

Expected: PASS. If it fails on `PlaygroundProject` import shape, adjust to the actual exported type from `@logixjs/playground/Project`.

### Task 6: Add proof packs

**Files:**
- Create: `examples/logix-react/test/browser/playground-proof-packs.ts`
- Modify: `examples/logix-react/test/browser/playground-route-contract.playwright.ts`

- [ ] **Step 1: Add proof pack module**

Create `examples/logix-react/test/browser/playground-proof-packs.ts`:

```ts
import { strict as assert } from 'node:assert'
import type { Page } from 'playwright'
import type { PlaygroundProject } from '@logixjs/playground/Project'
import type { PlaygroundRouteProofRecipe, ProofPackId } from './playground-proof-recipes'
import { assertAllRouteGapHarvest, assertNoSilentFallback } from './playground-gap-harvest'
import { assertEvidenceCoordinate } from './playground-evidence-coordinate'
import { assertRenderIsolationProbe } from './playground-render-isolation'
import {
  assertNoPageOverflow,
  formatProjectLabel,
  getHostCommand,
  getPressureFixture,
  gotoProjectRoute,
  routeForPlaygroundProject,
} from './playground-proof-context'

export interface RunProofPackInput {
  readonly page: Page
  readonly baseUrl: string
  readonly project: PlaygroundProject
  readonly recipe: PlaygroundRouteProofRecipe
}

export const assertAllRouteInvariants = async ({ page, baseUrl, project, recipe }: RunProofPackInput): Promise<void> => {
  await gotoProjectRoute(page, baseUrl, project)
  assert(page.url().endsWith(routeForPlaygroundProject(project)), `${project.id} route should remain stable`)
  await page.getByLabel('Playground project').getByText(formatProjectLabel(project.id)).waitFor({ state: 'visible' })
  await page.getByRole('navigation', { name: 'File navigator' }).waitFor({ state: 'visible' })
  await page.getByLabel('Source editor').waitFor({ state: 'visible' })
  await page.getByRole('region', { name: 'Runtime inspector' }).waitFor({ state: 'visible' })
  await page.getByRole('region', { name: 'Workbench bottom console' }).waitFor({ state: 'visible' })
  if (project.program?.entry) {
    await page.getByRole('navigation', { name: 'File navigator' }).getByRole('button', { name: project.program.entry }).waitFor({ state: 'visible' })
  }
  await assertNoPageOverflow(page, `${project.id} ${recipe.reportLabel}`)
  await assertNoSilentFallback(page, project.id, 'gapHarvest')
}

export const runFacetProofPack = async (
  input: RunProofPackInput,
  packId: ProofPackId,
): Promise<void> => {
  const { page, project } = input
  if (packId === 'run') {
    await getHostCommand(page, 'Run').click()
    const result = page.getByRole('region', { name: 'Program result' }).getByLabel('Run result')
    await result.getByText(/runId|value|count|resultCount/).waitFor({ state: 'visible' })
    await assertEvidenceCoordinate({
      page,
      source: result,
      context: `${project.id} Run`,
      expectedProjectId: project.id,
      expectedOperationKind: 'run',
      snapshot: page.getByLabel('Snapshot summary'),
      consoleOrState: page.getByRole('region', { name: 'Workbench bottom console' }),
    })
    return
  }
  if (packId === 'check') {
    await getHostCommand(page, 'Check').click()
    const report = page.getByRole('region', { name: 'Program result' }).getByRole('region', { name: 'Check report' })
    await report.getByText(/Check report|check|PASS|FAIL|failed/i).waitFor({ state: 'visible' })
    await assertEvidenceCoordinate({
      page,
      source: report,
      diagnostics: page.getByLabel('Diagnostics detail'),
      snapshot: page.getByLabel('Snapshot summary'),
      context: `${project.id} Check`,
      expectedProjectId: project.id,
      expectedOperationKind: 'check',
    })
    return
  }
  if (packId === 'trialStartup') {
    await getHostCommand(page, 'Trial').click()
    const report = page.getByRole('region', { name: 'Program result' }).getByRole('region', { name: 'Trial report' })
    await report.getByText(/Trial report|startup|PASS|FAIL|failed/i).waitFor({ state: 'visible' })
    await assertEvidenceCoordinate({
      page,
      source: report,
      diagnostics: page.getByLabel('Diagnostics detail'),
      snapshot: page.getByLabel('Snapshot summary'),
      context: `${project.id} Trial`,
      expectedProjectId: project.id,
      expectedOperationKind: 'trialStartup',
    })
    return
  }
  if (packId === 'actions') {
    await page.getByRole('region', { name: 'Runtime inspector' }).getByRole('button', { name: 'Actions' }).click()
    await page.getByRole('region', { name: 'Action workbench' }).waitFor({ state: 'visible' })
    return
  }
  if (packId === 'drivers') {
    await page.getByRole('region', { name: 'Runtime inspector' }).getByRole('button', { name: 'Drivers' }).click()
    await page.getByRole('region', { name: 'Runtime inspector' }).getByText(/Drivers|Driver/).waitFor({ state: 'visible' })
    return
  }
  if (packId === 'scenarios') {
    await page.getByRole('region', { name: 'Runtime inspector' }).getByRole('button', { name: 'Drivers' }).click()
    await page.getByText(/Scenario|Async form flow|Counter demo/).first().waitFor({ state: 'visible' })
    return
  }
  if (packId === 'serviceFiles') {
    await page.getByRole('navigation', { name: 'File navigator' }).getByRole('group', { name: /Search client|service/i }).waitFor({ state: 'visible' })
    return
  }
  if (packId === 'pressureVisualCapacity') {
    const pressure = getPressureFixture(project)
    assert(pressure, `${project.id} should have pressure fixture metadata`)
    await page.getByRole('region', { name: 'Runtime inspector' }).getByRole('button', { name: pressure.activeInspectorTab }).waitFor({ state: 'visible' })
    await page.getByRole('region', { name: 'Workbench bottom console' }).getByRole('button', { name: pressure.activeBottomTab }).waitFor({ state: 'attached' })
    return
  }
  if (packId === 'runtimeEvidenceProbe') {
    await getHostCommand(page, 'Run').click()
    const result = page.getByRole('region', { name: 'Program result' }).getByLabel('Run result')
    await result.waitFor({ state: 'visible' })
    const runCoordinate = await assertEvidenceCoordinate({
      page,
      source: result,
      context: `${project.id} runtimeEvidenceProbe`,
      expectedProjectId: project.id,
      expectedOperationKind: 'run',
      snapshot: page.getByLabel('Snapshot summary'),
      consoleOrState: page.getByRole('region', { name: 'Workbench bottom console' }),
    })
    if (project.capabilities?.check) {
      await getHostCommand(page, 'Check').click()
      const report = page.getByRole('region', { name: 'Program result' }).getByRole('region', { name: 'Check report' })
      await report.waitFor({ state: 'visible' })
      await assertEvidenceCoordinate({
        page,
        source: report,
        diagnostics: page.getByLabel('Diagnostics detail'),
        snapshot: page.getByLabel('Snapshot summary'),
        context: `${project.id} runtimeEvidenceProbe Check`,
        expectedProjectId: runCoordinate.projectId,
        expectedOperationKind: 'check',
      })
    }
    return
  }
  if (packId === 'gapHarvest') {
    await assertAllRouteGapHarvest({
      page,
      projectId: project.id,
      packId,
      hasRun: Boolean(project.capabilities?.run),
      hasCheck: Boolean(project.capabilities?.check),
      hasTrialStartup: Boolean(project.capabilities?.trialStartup),
      hasActions: true,
      expectedMissingAuthorityRegions: [
        {
          ownerClass: 'runtime-dispatch',
          region: page.getByRole('region', { name: 'Action workbench' }),
          regionLabel: 'Action workbench dispatch authority',
        },
        {
          ownerClass: 'projection',
          region: page.getByRole('region', { name: 'Workbench bottom console' }),
          regionLabel: 'Workbench projection gap/finding face',
        },
      ],
    })
    return
  }
  if (packId === 'renderIsolationProbe') {
    await assertRenderIsolationProbe({ page, projectId: project.id })
    return
  }
  if (packId === 'boundaryProbe') {
    await assertNoSilentFallback(page, project.id, packId)
    return
  }
}

export const runProjectProofRecipe = async (input: RunProofPackInput): Promise<void> => {
  await assertAllRouteInvariants(input)
  for (const packId of input.recipe.proofPackIds) {
    await runFacetProofPack(input, packId)
  }
  await input.recipe.assertDemoProof?.({
    page: input.page,
    baseUrl: input.baseUrl,
    project: input.project,
    route: routeForPlaygroundProject(input.project),
  })
}
```

- [ ] **Step 2: Run typecheck**

Run:

```bash
rtk pnpm -C examples/logix-react typecheck
```

Expected: PASS. If TypeScript reports that the current UI does not expose `Run result`, `Check report`, `Trial report`, or coordinate-bearing locators, keep the helper code and complete Task 13 before expecting the browser route test to pass.

### Task 7: Route runner uses recipes and packs

**Files:**
- Modify: `examples/logix-react/test/browser/playground-route-contract.playwright.ts`

- [ ] **Step 1: Add failing recipe runner call**

In `main()`, after creating the page, add:

```ts
await run('registry-indexed dogfood proof recipes', () => assertRegistryIndexedDogfoodProofs(page, baseUrl))
```

Add helper:

```ts
async function assertRegistryIndexedDogfoodProofs(page: Page, baseUrl: string): Promise<void> {
  assertProofRecipeCoverage(logixReactPlaygroundRegistry, logixReactPlaygroundProofRecipes)
  for (const project of logixReactPlaygroundRegistry) {
    const recipe = logixReactPlaygroundProofRecipes[project.id]
    assert(recipe, `Missing proof recipe for ${project.id}`)
    await runProjectProofRecipe({ page, baseUrl, project, recipe })
    console.log(`PASS ${project.id} ${recipe.proofPackIds.join(',')}`)
  }
}
```

Import:

```ts
import { logixReactPlaygroundRegistry } from '../../src/playground/registry'
import {
  assertProofRecipeCoverage,
  logixReactPlaygroundProofRecipes,
} from './playground-proof-recipes'
import { runProjectProofRecipe } from './playground-proof-packs'
```

- [ ] **Step 2: Run browser test and observe failures**

Run:

```bash
rtk pnpm -C examples/logix-react test:browser:playground
```

Expected: May fail on selectors, render isolation fanout, or missing coordinate visibility. Record the first real failure and continue with the remaining tasks.

## Chunk 4: Demo-specific Deep Proofs

### Task 8: Add local-counter runtime chain proof

**Files:**
- Modify: `examples/logix-react/test/browser/playground-proof-recipes.ts`
- Modify: `examples/logix-react/test/browser/playground-proof-packs.ts`

- [ ] **Step 1: Add local-counter operation helpers**

Import `assertEvidenceCoordinate` from `./playground-evidence-coordinate` and `PlaygroundProofContext` from `./playground-proof-recipes`, then add these helpers to `examples/logix-react/test/browser/playground-proof-packs.ts`:

```ts
export const assertActionDispatchProof = async (
  input: PlaygroundProofContext,
  actionButtonName: string,
  expectedState: RegExp,
): Promise<void> => {
  const { page, project } = input
  await page.getByRole('region', { name: 'Runtime inspector' }).getByRole('button', { name: 'Actions' }).click()
  await page.getByRole('button', { name: actionButtonName }).click()
  const actionWorkbench = page.getByRole('region', { name: 'Action workbench' })
  await page.getByLabel('Action workbench state preview').getByText(expectedState).waitFor({ state: 'visible' })
  await assertEvidenceCoordinate({
    page,
    source: actionWorkbench.getByLabel('Dispatch result'),
    context: `${project.id} ${actionButtonName}`,
    expectedProjectId: project.id,
    expectedOperationKind: 'dispatch',
    snapshot: page.getByLabel('Snapshot summary'),
    consoleOrState: page.getByLabel('Action workbench state preview'),
  })
}

export const assertDriverDispatchProof = async (
  input: PlaygroundProofContext,
  driverButtonName: string,
  expectedState: RegExp,
): Promise<void> => {
  const { page, project } = input
  await page.getByRole('region', { name: 'Runtime inspector' }).getByRole('button', { name: 'Drivers' }).click()
  await page.getByRole('button', { name: driverButtonName }).click()
  const driverResult = page.getByRole('region', { name: 'Driver detail' }).getByLabel('Driver run result')
  await page.getByLabel('Action workbench state preview').getByText(expectedState).waitFor({ state: 'visible' })
  await assertEvidenceCoordinate({
    page,
    source: driverResult,
    context: `${project.id} ${driverButtonName}`,
    expectedProjectId: project.id,
    expectedOperationKind: 'dispatch',
    snapshot: page.getByLabel('Snapshot summary'),
    consoleOrState: page.getByLabel('Action workbench state preview'),
  })
}

export const assertScenarioDispatchProof = async (
  input: PlaygroundProofContext,
  scenarioButtonName: string,
): Promise<void> => {
  const { page, project } = input
  await page.getByRole('region', { name: 'Runtime inspector' }).getByRole('button', { name: 'Drivers' }).click()
  await page.getByRole('button', { name: scenarioButtonName }).click()
  const scenarioDetail = page.getByRole('region', { name: 'Scenario detail' })
  await scenarioDetail.getByText(/expect \/ passed|expect-state/).waitFor({ state: 'visible' })
  await assertEvidenceCoordinate({
    page,
    source: scenarioDetail.getByLabel('Scenario run result'),
    context: `${project.id} ${scenarioButtonName}`,
    expectedProjectId: project.id,
    expectedOperationKind: 'dispatch',
    snapshot: page.getByLabel('Snapshot summary'),
    consoleOrState: scenarioDetail,
  })
}
```

- [ ] **Step 2: Add local-counter `assertDemoProof`**

Import the helpers into `examples/logix-react/test/browser/playground-proof-recipes.ts`, then add:

```ts
assertDemoProof: async (ctx) => {
  await assertActionDispatchProof(ctx, 'Dispatch increment', /"count": 1/)
  await assertDriverDispatchProof(ctx, 'Run driver Increase', /"count": 2|dispatch increment/)
  await assertScenarioDispatchProof(ctx, 'Run scenario Counter demo')
}
```

- [ ] **Step 3: Run focused browser test**

Run:

```bash
rtk pnpm -C examples/logix-react test:browser:playground
```

Expected: local-counter proof passes or fails with a concrete selector/evidence problem. If `Dispatch result`, `Driver run result`, or `Scenario run result` do not expose coordinates yet, implement Task 13 for those owning regions before weakening these assertions. If state count expectations differ because sessions reset between packs, reset before the demo proof and assert the expected post-reset counts.

### Task 9: Add service-source edit closure

**Files:**
- Modify: `examples/logix-react/test/browser/playground-proof-recipes.ts`

- [ ] **Step 1: Add service-source `assertDemoProof`**

Import `assertEvidenceCoordinate` from `./playground-evidence-coordinate` and `getHostCommand` from `./playground-proof-context`, then add this proof to the `logix-react.service-source` recipe:

```ts
assertDemoProof: async ({ page }) => {
  await page.getByRole('navigation', { name: 'File navigator' }).getByRole('button', { name: '/src/services/search.service.ts' }).click()
  const editor = page.getByLabel('Source editor')
  await editor.click()
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A')
  await page.keyboard.type([
    'export interface SearchResult {',
    '  readonly id: string',
    '  readonly title: string',
    '}',
    '',
    'export const search = (query: string): ReadonlyArray<SearchResult> => [',
    '  { id: "result-1", title: `${query} quickstart` },',
    '  { id: "result-2", title: `${query} reference` },',
    ']',
  ].join('\n'))
  await getHostCommand(page, 'Run').click()
  const result = page.getByRole('region', { name: 'Program result' }).getByLabel('Run result')
  await result.getByText(/"resultCount": 2/).waitFor({ state: 'visible' })
  const coordinate = await assertEvidenceCoordinate({
    page,
    source: result,
    context: 'service-source edited Run',
    expectedProjectId: 'logix-react.service-source',
    expectedOperationKind: 'run',
    snapshot: page.getByLabel('Snapshot summary'),
    consoleOrState: page.getByRole('region', { name: 'Workbench bottom console' }),
  })
  await page.getByRole('region', { name: 'Workbench bottom console' }).getByRole('button', { name: 'Snapshot' }).click()
  const snapshot = page.getByLabel('Snapshot summary')
  await snapshot.getByText('/src/services/search.service.ts').waitFor({ state: 'visible' })
  await snapshot.getByText(coordinate.sourceRevision).waitFor({ state: 'visible' })
  await snapshot.getByText(coordinate.sourceDigest).waitFor({ state: 'visible' })
}
```

- [ ] **Step 2: Run browser test**

Run:

```bash
rtk pnpm -C examples/logix-react test:browser:playground
```

Expected: service-source proof passes and the edited service file, Run result, Trace and Snapshot share one coordinate. If Monaco keyboard input is flaky, use the existing editor fill strategy from `playground-preview.contract.test.tsx` as the implementation reference.

### Task 10: Strengthen pressure visual capacity packs

**Files:**
- Modify: `examples/logix-react/test/browser/playground-proof-packs.ts`

- [ ] **Step 1: Add pressure metadata-driven scroll checks**

Extend the `pressureVisualCapacity` branch:

```ts
if (pressure.dataProfile.actions) {
  await page.getByText(`${pressure.dataProfile.actions} actions`).first().waitFor({ state: 'visible' })
}
if (pressure.dataProfile.stateNodes) {
  await page.getByText(new RegExp(`nodes: ${pressure.dataProfile.stateNodes}`)).first().waitFor({ state: 'visible' })
}
if (pressure.dataProfile.traceEvents) {
  await page.getByText(String(pressure.dataProfile.traceEvents)).first().waitFor({ state: 'visible' })
}
if (pressure.dataProfile.diagnostics) {
  await page.getByText('LC-0001').first().waitFor({ state: 'visible' })
}
if (pressure.dataProfile.payloadBytes) {
  await page.getByLabel('Driver payload JSON').waitFor({ state: 'visible' })
}
```

Then add per-section scroll checks using existing selectors:

```ts
const assertScrollable = async (selector: string, label: string) => {
  const info = await page.locator(selector).evaluate((element) => {
    const style = window.getComputedStyle(element)
    return { scrollHeight: element.scrollHeight, clientHeight: element.clientHeight, overflowY: style.overflowY }
  })
  assert(/auto|scroll/.test(info.overflowY), `${label} should own vertical overflow`)
  assert(info.scrollHeight >= info.clientHeight, `${label} scroll height should be at least its client height`)
}
```

- [ ] **Step 2: Map pressure fixture ids to existing selectors**

Use these mappings in the same branch:

```ts
const pressureId = String((project.fixtures as { pressure?: { id?: string } } | undefined)?.pressure?.id ?? '')
if (pressureId === 'action-dense') await assertScrollable('[data-playground-section="actions-list"]', 'action dense actions list')
if (pressureId === 'state-large') await assertScrollable('[data-playground-section="state"]', 'state large state tree')
if (pressureId === 'trace-heavy') await assertScrollable('[data-playground-section="trace-table"]', 'trace heavy trace table')
if (pressureId === 'diagnostics-dense') await assertScrollable('[data-playground-section="diagnostics-table"]', 'diagnostics dense table')
if (pressureId === 'scenario-driver-payload') await assertScrollable('[data-playground-section="driver-payload"]', 'driver payload editor')
```

- [ ] **Step 3: Run browser test**

Run:

```bash
rtk pnpm -C examples/logix-react test:browser:playground
```

Expected: pressure packs pass and still distinguish visual capacity from runtime evidence probes.

## Chunk 5: Render Isolation And State Ownership

### Task 11: Add render isolation probe helper

**Files:**
- Create: `examples/logix-react/test/browser/playground-render-isolation.ts`
- Create: `packages/logix-playground/src/internal/components/renderIsolationProbe.tsx`
- Modify: `packages/logix-playground/src/internal/layout/ResizableWorkbench.tsx`
- Modify: `examples/logix-react/test/browser/playground-proof-packs.ts`

- [ ] **Step 1: Add internal region render counter**

Create `packages/logix-playground/src/internal/components/renderIsolationProbe.tsx`:

```tsx
import React from 'react'

export type PlaygroundRenderIsolationRegion =
  | 'top-command-bar'
  | 'files-panel'
  | 'source-editor'
  | 'runtime-inspector'
  | 'bottom-evidence-drawer'

export interface PlaygroundRenderIsolationStats {
  readonly commits: Record<string, number>
  readonly mounts: Record<string, number>
}

declare global {
  interface Window {
    __LOGIX_PLAYGROUND_RENDER_ISOLATION_PROBE__?: PlaygroundRenderIsolationStats
  }
}

const ensureStats = (): PlaygroundRenderIsolationStats | undefined => {
  if (typeof window === 'undefined') return undefined
  window.__LOGIX_PLAYGROUND_RENDER_ISOLATION_PROBE__ ??= { commits: {}, mounts: {} }
  return window.__LOGIX_PLAYGROUND_RENDER_ISOLATION_PROBE__
}

export const resetRenderIsolationProbe = (): void => {
  if (typeof window === 'undefined') return
  window.__LOGIX_PLAYGROUND_RENDER_ISOLATION_PROBE__ = { commits: {}, mounts: {} }
}

export const readRenderIsolationProbe = (): PlaygroundRenderIsolationStats => {
  if (typeof window === 'undefined') return { commits: {}, mounts: {} }
  return window.__LOGIX_PLAYGROUND_RENDER_ISOLATION_PROBE__ ?? { commits: {}, mounts: {} }
}

export function RenderIsolationRegion({
  region,
  children,
}: {
  readonly region: PlaygroundRenderIsolationRegion
  readonly children: React.ReactNode
}): React.ReactElement {
  React.useEffect(() => {
    const stats = ensureStats()
    if (!stats) return
    stats.mounts[region] = (stats.mounts[region] ?? 0) + 1
  }, [region])

  React.useEffect(() => {
    const stats = ensureStats()
    if (!stats) return
    stats.commits[region] = (stats.commits[region] ?? 0) + 1
  })

  return <>{children}</>
}
```

This is an internal test probe only. It does not add public API, runtime logs, metrics, or product copy.

- [ ] **Step 2: Wrap stable workbench regions**

In `packages/logix-playground/src/internal/layout/ResizableWorkbench.tsx`, import `RenderIsolationRegion` and wrap each region body without moving `data-playground-region`:

```tsx
<div data-playground-region="files-panel" className="h-full min-h-0 min-w-0 overflow-hidden border-r border-border">
  <RenderIsolationRegion region="files-panel">
    {filesPanel}
  </RenderIsolationRegion>
</div>
```

Apply the same pattern to:

- `top-command-bar`
- `files-panel`
- `source-editor`
- `runtime-inspector`
- `bottom-evidence-drawer`

The wrapper must live inside the existing region element so current Playwright selectors remain valid.

- [ ] **Step 3: Write the Playwright probe helper**

Create `examples/logix-react/test/browser/playground-render-isolation.ts`:

```ts
import { strict as assert } from 'node:assert'
import type { Page } from 'playwright'

export type PlaygroundRegionId =
  | 'top-command-bar'
  | 'files-panel'
  | 'source-editor'
  | 'runtime-inspector'
  | 'bottom-evidence-drawer'

export interface RenderIsolationProbeInput {
  readonly page: Page
  readonly projectId: string
}

interface RenderStats {
  readonly commits: Record<string, number>
  readonly mounts: Record<string, number>
}

const regionIds: ReadonlyArray<PlaygroundRegionId> = [
  'top-command-bar',
  'files-panel',
  'source-editor',
  'runtime-inspector',
  'bottom-evidence-drawer',
]

const resetProbe = async (page: Page): Promise<void> => page.evaluate(() => {
  ;(window as typeof window & {
    __LOGIX_PLAYGROUND_RENDER_ISOLATION_PROBE__?: RenderStats
  }).__LOGIX_PLAYGROUND_RENDER_ISOLATION_PROBE__ = { commits: {}, mounts: {} }
})

const readStats = async (page: Page): Promise<RenderStats> => page.evaluate(() => {
  const probe = (window as typeof window & {
    __LOGIX_PLAYGROUND_RENDER_ISOLATION_PROBE__?: {
      commits: Record<string, number>
      mounts: Record<string, number>
    }
  }).__LOGIX_PLAYGROUND_RENDER_ISOLATION_PROBE__
  return {
    commits: { ...(probe?.commits ?? {}) },
    mounts: { ...(probe?.mounts ?? {}) },
  }
})

const diffStats = (before: RenderStats, after: RenderStats): RenderStats => {
  const commits: Record<string, number> = {}
  const mounts: Record<string, number> = {}
  for (const id of regionIds) {
    commits[id] = (after.commits[id] ?? 0) - (before.commits[id] ?? 0)
    mounts[id] = (after.mounts[id] ?? 0) - (before.mounts[id] ?? 0)
  }
  return { commits, mounts }
}

const assertFanout = (
  projectId: string,
  trigger: string,
  diff: RenderStats,
  allowedRegions: ReadonlyArray<PlaygroundRegionId>,
): void => {
  const allowed = new Set(allowedRegions)
  const committed = Object.entries(diff.commits)
    .filter(([, count]) => count > 0)
    .map(([region]) => region)
  const remounted = Object.entries(diff.mounts)
    .filter(([, count]) => count > 0)
    .map(([region]) => region)
  const disallowedCommits = committed.filter((region) => !allowed.has(region as PlaygroundRegionId))
  const disallowedRemounts = remounted.filter((region) => !allowed.has(region as PlaygroundRegionId))
  assert.equal(
    disallowedCommits.length,
    0,
    `${projectId} ${trigger} committed unrelated regions: ${disallowedCommits.join(', ')}; diff=${JSON.stringify(diff.commits)}`,
  )
  assert.equal(
    disallowedRemounts.length,
    0,
    `${projectId} ${trigger} remounted unrelated regions: ${disallowedRemounts.join(', ')}; diff=${JSON.stringify(diff.mounts)}`,
  )
}

const triggerAndAssert = async (
  page: Page,
  projectId: string,
  trigger: string,
  allowedRegions: ReadonlyArray<PlaygroundRegionId>,
  action: () => Promise<void>,
): Promise<void> => {
  const before = await readStats(page)
  await action()
  await page.waitForTimeout(50)
  const after = await readStats(page)
  assertFanout(projectId, trigger, diffStats(before, after), allowedRegions)
}

export const assertRenderIsolationProbe = async ({ page, projectId }: RenderIsolationProbeInput): Promise<void> => {
  await resetProbe(page)
  await triggerAndAssert(page, projectId, 'inspector tab change', ['runtime-inspector'], async () => {
    await page.getByRole('region', { name: 'Runtime inspector' }).getByRole('button', { name: 'Diagnostics' }).click()
  })
  await triggerAndAssert(page, projectId, 'bottom tab change', ['bottom-evidence-drawer'], async () => {
    await page.getByRole('region', { name: 'Workbench bottom console' }).getByRole('button', { name: 'Trace' }).click()
  })
  await triggerAndAssert(page, projectId, 'file selection', ['files-panel', 'source-editor'], async () => {
    const buttons = page.getByRole('navigation', { name: 'File navigator' }).getByRole('button')
    const count = await buttons.count()
    if (count > 1) await buttons.nth(1).click()
  })
  await triggerAndAssert(page, projectId, 'run command', ['top-command-bar', 'runtime-inspector', 'bottom-evidence-drawer'], async () => {
    await page.locator('[data-playground-region="top-command-bar"]').getByRole('button', { name: 'Run', exact: true }).click()
  })
  await triggerAndAssert(page, projectId, 'check command', ['top-command-bar', 'runtime-inspector', 'bottom-evidence-drawer'], async () => {
    await page.locator('[data-playground-region="top-command-bar"]').getByRole('button', { name: 'Check', exact: true }).click()
  })
  await triggerAndAssert(page, projectId, 'trial command', ['top-command-bar', 'runtime-inspector', 'bottom-evidence-drawer'], async () => {
    await page.locator('[data-playground-region="top-command-bar"]').getByRole('button', { name: 'Trial', exact: true }).click()
  })
  await triggerAndAssert(page, projectId, 'reset command', ['top-command-bar', 'runtime-inspector', 'bottom-evidence-drawer'], async () => {
    await page.locator('[data-playground-region="top-command-bar"]').getByRole('button', { name: 'Reset', exact: true }).click()
  })
}
```

- [ ] **Step 4: Wire the proof pack**

Import `assertRenderIsolationProbe` in `examples/logix-react/test/browser/playground-proof-packs.ts` and handle the `renderIsolationProbe` branch:

```ts
if (packId === 'renderIsolationProbe') {
  await assertRenderIsolationProbe({ page, projectId: project.id })
  return
}
```

- [ ] **Step 5: Run browser test to expose current fanout**

Run:

```bash
rtk pnpm -C examples/logix-react test:browser:playground
```

Expected: FAIL if `PlaygroundShell` still recreates unrelated regions. Keep the failing output as the baseline for Task 12.

### Task 12: Split workbench region ownership and narrow Shell subscriptions

**Files:**
- Modify: `packages/logix-playground/src/internal/components/PlaygroundShell.tsx`
- Create or modify: `packages/logix-playground/src/internal/components/WorkbenchLayoutRoot.tsx`
- Create or modify: `packages/logix-playground/src/internal/components/HostCommandBarContainer.tsx`
- Create or modify: `packages/logix-playground/src/internal/components/FilesPanelContainer.tsx`
- Create or modify: `packages/logix-playground/src/internal/components/SourcePanelContainer.tsx`
- Create or modify: `packages/logix-playground/src/internal/components/RuntimeInspectorContainer.tsx`
- Create or modify: `packages/logix-playground/src/internal/components/BottomPanelContainer.tsx`
- Modify: `packages/logix-playground/src/internal/components/RuntimeInspector.tsx`
- Modify: `packages/logix-playground/src/internal/components/WorkbenchBottomPanel.tsx`
- Modify: `packages/logix-playground/src/internal/state/workbenchProgram.ts`
- Test: `packages/logix-playground/src/internal/components/RuntimeInspector.test.tsx`
- Test: `packages/logix-playground/src/internal/components/WorkbenchBottomPanel.test.tsx`
- Test: `examples/logix-react/test/browser/playground-route-contract.playwright.ts`

- [ ] **Step 1: Preserve locator contract before moving code**

Run:

```bash
rtk rg -n "Runtime inspector|Action workbench|Trace detail|Snapshot summary|Diagnostics detail|data-playground-region|data-playground-section|data-playground-evidence-coordinate" packages/logix-playground/src/internal/components packages/logix-playground/src/internal/layout examples/logix-react/test/browser
```

Expected: Existing locators are visible. Do not remove or rename these locators while splitting containers.

- [ ] **Step 2: Split top-level layout ownership**

Create `WorkbenchLayoutRoot` or equivalent near `PlaygroundShell`.

Required shape:

```ts
interface WorkbenchLayoutRootProps {
  readonly workspace: PlaygroundWorkspace
  readonly projectSwitcher?: React.ReactNode
  readonly backHref?: string
  readonly backLabel?: string
  readonly commands: PlaygroundShellCommands
}
```

Implementation requirements:

- `WorkbenchLayoutRoot` calls `useSelector(workbench, (state) => state.layout)` only.
- It passes stable component instances into `ResizableWorkbench`: `<HostCommandBarContainer />`, `<FilesPanelContainer />`, `<SourcePanelContainer />`, `<RuntimeInspectorContainer />`, `<BottomPanelContainer />`.
- `ResizableWorkbench` keeps the same `data-playground-region` values: `top-command-bar`, `files-panel`, `source-editor`, `runtime-inspector`, `bottom-evidence-drawer`.
- `PlaygroundShell` renders `WorkbenchLayoutRoot` and no longer constructs all five region nodes inline.

- [ ] **Step 3: Move command bar subscriptions into its container**

`HostCommandBarContainer` subscribes only to:

- `runState`
- `checkState`
- `trialStartupState`
- `programSession`
- `workspaceRevision` only if needed to derive current snapshot badge

It receives `onRun`, `onCheck`, `onTrialStartup`, `onReset`, `projectSwitcher`, `backHref`, and `backLabel` as props.

Expected: clicking Inspector tabs or bottom tabs does not commit/remount `top-command-bar`.

- [ ] **Step 4: Move files and source subscriptions into their containers**

`FilesPanelContainer` subscribes only to:

- `activeFile`
- `workspaceRevision` if file changed markers require it

`SourcePanelContainer` subscribes only to:

- `activeFile`
- `workspaceRevision`

Expected: clicking Inspector tabs, bottom tabs, Run, Check, Trial and Reset does not remount `files-panel` or `source-editor`. File selection may commit `files-panel` and `source-editor` only.

- [ ] **Step 5: Split inspector state in `workbenchProgram.ts`**

Replace broad `state.inspector` subscriptions with finer state lanes or selectors:

- `activeInspectorTab`
- `advancedDispatchExpanded`
- `selectedDriverId`
- `selectedScenarioId`
- `driverExecution`
- `scenarioExecution`

Reducers should sink the specific field being changed. Avoid sinking a whole `inspector` object for `selectInspectorTab`, `setDriverExecution`, or `setScenarioExecution`.

If the existing reducer state must keep an `inspector` object temporarily, add exported selector helpers in `workbenchProgram.ts` and ensure containers subscribe to specific nested values only. Do not add a public core selector API.

- [ ] **Step 6: Move runtime inspector subscriptions into its container**

`RuntimeInspectorContainer` subscribes to:

- `activeInspectorTab`
- tab body state needed by the active tab
- `programSession`
- `runState`, `checkState`, `trialStartupState` only for Result/Diagnostics bodies
- `runtimeEvidence.reflect` only for action manifest derivation
- `driverExecution` and `scenarioExecution` only for driver/scenario bodies

It must keep the existing `RuntimeInspector` labels and sections. `selectInspectorTab` should no longer dirty Files, Source, Bottom drawer, or Command bar.

- [ ] **Step 7: Split bottom drawer subscriptions by active tab**

`BottomPanelContainer` subscribes to `bottomTab` for the tab bar.

Current body subscription rules:

- Console body subscribes to `programSession` and session logs/actions only.
- Diagnostics body subscribes to `checkState`, `trialStartupState` and projection fields needed for diagnostics.
- Trace body subscribes to runtime operation events/projection trace fields only.
- Snapshot body subscribes to `workspaceRevision`, current `ProjectSnapshot`, and selected evidence coordinate only.
- Scenario body subscribes to `scenarioExecution` only.

Expected: bottom tab click commits `bottom-evidence-drawer` only. Trace-heavy pressure route remains scrollable.

- [ ] **Step 8: Keep Shell as orchestrator**

After the split, `PlaygroundShell.tsx` may keep:

- `workspace` bridge and source edit/select callbacks
- runtime invoker and session runner creation
- effects for workspace sync, reflection, initial session and pressure default tabs
- command callbacks for Run, Check, Trial, Reset, dispatch, driver, scenario
- refs for current session/actions

It should no longer subscribe to `layout`, `activeFile`, `bottomTab`, `runState`, `checkState`, `trialStartupState`, broad `runtimeEvidence`, broad `inspector`, or region-only display state unless that subscription is needed for an effect or command callback.

- [ ] **Step 9: Run focused component tests**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run src/internal/components/RuntimeInspector.test.tsx src/internal/components/WorkbenchBottomPanel.test.tsx src/internal/components/FilesPanel.test.tsx src/internal/components/SourcePanel.test.tsx --reporter=dot
```

Expected: PASS. If a locator changed, restore the old locator and adjust only internal ownership.

- [ ] **Step 10: Run render isolation route proof**

Run:

```bash
rtk pnpm -C examples/logix-react test:browser:playground
```

Expected: `renderIsolationProbe` passes for `logix-react.local-counter`, `logix-react.pressure.action-dense`, and `logix-react.pressure.trace-heavy`. It covers Inspector tab, bottom tab, file selection, Run, Check, Trial and Reset fanout. Failures must report actual committed/remounted regions.

## Chunk 6: Coordinate Oracle Wiring

### Task 13: Add stable evidence coordinate visibility if missing

**Files:**
- Modify if needed: `packages/logix-playground/src/internal/components/ProgramPanel.tsx`
- Modify if needed: `packages/logix-playground/src/internal/components/WorkbenchBottomPanel.tsx`
- Modify if needed: `packages/logix-playground/src/internal/components/SessionConsolePanel.tsx`
- Modify if needed: `packages/logix-playground/src/internal/components/ActionManifestPanel.tsx`
- Modify if needed: `packages/logix-playground/src/internal/components/DriverPanel.tsx`
- Modify if needed: `packages/logix-playground/src/internal/components/ScenarioPanel.tsx`
- Test: package component tests corresponding to touched components.

- [ ] **Step 1: Run browser proof and inspect first coordinate failure**

Run:

```bash
rtk pnpm -C examples/logix-react test:browser:playground
```

Expected: If coordinate helpers cannot read `data-playground-evidence-coordinate`, identify the owning region.

- [ ] **Step 2: Write failing component test for coordinate visibility**

Add or update these component tests. Each row exposes an existing runtime evidence envelope field through `data-playground-evidence-coordinate` and visible text. Do not create a second coordinate model.

| Component | Test file | Owning label | Evidence source | Required assertion |
| --- | --- | --- | --- | --- |
| `ProgramPanel` | `packages/logix-playground/src/internal/components/ProgramPanel.test.tsx` | `Run result` | `runState.runtimeEvidence` or equivalent run envelope | `screen.getByLabelText('Run result').getAttribute('data-playground-evidence-coordinate')` contains `operationKind=run`, `sourceRevision=`, `sourceDigest=`, `operationId=` |
| `ProgramPanel` | `packages/logix-playground/src/internal/components/ProgramPanel.test.tsx` | `Check report` | `checkState.runtimeEvidence` or equivalent check envelope | `screen.getByRole('region', { name: 'Check report' }).getAttribute('data-playground-evidence-coordinate')` contains `operationKind=check` |
| `ProgramPanel` | `packages/logix-playground/src/internal/components/ProgramPanel.test.tsx` | `Trial report` | `trialStartupState.runtimeEvidence` or equivalent trial envelope | `screen.getByRole('region', { name: 'Trial report' }).getAttribute('data-playground-evidence-coordinate')` contains `operationKind=trialStartup` |
| `ActionManifestPanel` or owning session panel | `packages/logix-playground/src/internal/components/ActionManifestPanel.test.tsx` | `Dispatch result` | latest dispatch evidence envelope | `screen.getByLabelText('Dispatch result').getAttribute('data-playground-evidence-coordinate')` contains `operationKind=dispatch` |
| `DriverPanel` or owning inspector test | `packages/logix-playground/src/internal/components/RuntimeInspector.test.tsx` | `Driver run result` | driver dispatch evidence envelope | `screen.getByLabelText('Driver run result').getAttribute('data-playground-evidence-coordinate')` contains `operationKind=dispatch` |
| `ScenarioPanel` or owning inspector test | `packages/logix-playground/src/internal/components/RuntimeInspector.test.tsx` | `Scenario run result` | scenario driver-step dispatch evidence envelope | `screen.getByLabelText('Scenario run result').getAttribute('data-playground-evidence-coordinate')` contains `operationKind=dispatch` |
| `WorkbenchBottomPanel` | `packages/logix-playground/src/internal/components/WorkbenchBottomPanel.test.tsx` | `Trace detail` | selected runtime evidence operation events | text contains `operationId`, `sourceRevision`, `sourceDigest` |
| `WorkbenchBottomPanel` | `packages/logix-playground/src/internal/components/WorkbenchBottomPanel.test.tsx` | `Snapshot summary` | current `ProjectSnapshot` plus selected evidence envelope | text contains `operationId`, `sourceRevision`, and `sourceDigest` together |
| `SessionConsolePanel` | `packages/logix-playground/src/internal/components/SessionConsolePanel.test.tsx` | `Session console` or `Action workbench state preview` | latest dispatch evidence envelope | text or attribute contains the same coordinate as `Dispatch result` |

Use `operationId=<instanceId>:txn<txnSeq>:op<opSeq>` or the local normalized `operationId` format already exposed by the runtime evidence refresh. The same rendered coordinate string must be parseable by `parseEvidenceCoordinateText`.

- [ ] **Step 3: Implement minimal data attributes**

Expose existing evidence projection only. Do not create new product concepts.

Preferred attribute format:

```text
projectId=<id> sourceRevision=<revision> sourceDigest=<digest> operationKind=<kind> operationId=<id>
```

Every touched component must expose the same string in one of these forms:

- `data-playground-evidence-coordinate` on the owning result/report element.
- Visible or screen-reader text under `Trace detail`, `Diagnostics detail`, `Snapshot summary`, or `Session console`.

Do not add a new production field named `ownerClass`, `gapKind`, or `testProbe`. Test attribution stays in Playwright helper failures.

- [ ] **Step 4: Run focused package tests**

Run the test for the touched component:

```bash
rtk pnpm -C packages/logix-playground exec vitest run src/internal/components/WorkbenchBottomPanel.test.tsx --reporter=dot
```

or the exact touched tests:

```bash
rtk pnpm -C packages/logix-playground exec vitest run src/internal/components/ProgramPanel.test.tsx --reporter=dot
rtk pnpm -C packages/logix-playground exec vitest run src/internal/components/ActionManifestPanel.test.tsx src/internal/components/RuntimeInspector.test.tsx src/internal/components/SessionConsolePanel.test.tsx --reporter=dot
```

Expected: PASS.

### Task 14: Audit coordinate oracle usage across all packs

**Files:**
- Modify: `examples/logix-react/test/browser/playground-proof-packs.ts`
- Modify: `examples/logix-react/test/browser/playground-proof-recipes.ts`
- Test: `examples/logix-react/test/browser/playground-route-contract.playwright.ts`

- [ ] **Step 1: Check required oracle call sites**

Run:

```bash
rtk rg -n "assertEvidenceCoordinate\\(" examples/logix-react/test/browser/playground-proof-packs.ts examples/logix-react/test/browser/playground-proof-recipes.ts examples/logix-react/test/browser/playground-boundary-probes.ts
```

Expected: at least one call for each required surface:

- `run`
- `check`
- `trialStartup`
- `runtimeEvidenceProbe`
- `action dispatch`
- `driver dispatch`
- `scenario dispatch`
- `service-source edited Run`
- active boundary probes that execute runtime operations

- [ ] **Step 2: Check every oracle call includes required faces**

For every `assertEvidenceCoordinate` call:

- `snapshot: page.getByLabel('Snapshot summary')` or an equivalent Snapshot locator must be present.
- Check and Trial calls must pass `diagnostics: page.getByLabel('Diagnostics detail')`.
- Dispatch-oriented calls must pass `consoleOrState` pointing at `Action workbench state preview`, `Driver detail`, `Scenario detail`, or `Workbench bottom console`.
- Runtime Run calls must pass `consoleOrState: page.getByRole('region', { name: 'Workbench bottom console' })` unless the Run result region itself includes console/state detail.

- [ ] **Step 3: Keep service-source edited Run on the same oracle**

The `logix-react.service-source` `assertDemoProof` must read `Run result` through `assertEvidenceCoordinate` after editing `/src/services/search.service.ts`. It must assert `Snapshot summary` contains the edited service path, returned `sourceRevision`, and returned `sourceDigest`.

- [ ] **Step 4: Run browser test**

Run:

```bash
rtk pnpm -C examples/logix-react test:browser:playground
```

Expected: PASS for action, driver, scenario, service source, run, check, trial and runtimeEvidenceProbe coordinate wiring. If any coordinate-bearing label is absent, finish Task 13 for that owning region.

## Chunk 7: Active Boundary Probes

### Task 15: Add boundary probe infrastructure

**Files:**
- Create: `examples/logix-react/test/browser/playground-boundary-probes.ts`
- Modify: `examples/logix-react/test/browser/playground-proof-packs.ts`

- [ ] **Step 1: Create boundary probe module**

Create `examples/logix-react/test/browser/playground-boundary-probes.ts`:

```ts
import { strict as assert } from 'node:assert'
import type { Page } from 'playwright'
import type { PlaygroundProject } from '@logixjs/playground/Project'
import { assertEvidenceCoordinate } from './playground-evidence-coordinate'
import type { GapOwnerClass } from './playground-gap-harvest'
import { assertGapVisible, assertNoSilentFallback } from './playground-gap-harvest'
import { getHostCommand, gotoProjectRoute } from './playground-proof-context'

export interface BoundaryProbeContext {
  readonly page: Page
  readonly baseUrl: string
  readonly project: PlaygroundProject
}

export interface BoundaryProbe {
  readonly ownerClass: GapOwnerClass
  readonly projectId: string
  readonly label: string
  readonly run: (ctx: BoundaryProbeContext) => Promise<void>
}

const replaceSource = async (page: Page, path: string, source: string): Promise<void> => {
  await page.getByRole('navigation', { name: 'File navigator' }).getByRole('button', { name: path }).click()
  const editor = page.getByLabel('Source editor')
  await editor.click()
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A')
  await page.keyboard.type(source)
}

export const localCounterBoundaryProbes: ReadonlyArray<BoundaryProbe> = [
  {
    ownerClass: 'reflection',
    projectId: 'logix-react.local-counter',
    label: 'unknown raw action is rejected by reflection authority',
    run: async ({ page }) => {
      await page.getByRole('region', { name: 'Runtime inspector' }).getByRole('button', { name: 'Actions' }).click()
      await page.getByRole('button', { name: 'Advanced' }).click()
      await page.getByLabel('Raw action JSON').fill('{ "_tag": "missingAction" }')
      await page.getByRole('button', { name: 'Dispatch raw action' }).click()
      await assertGapVisible({
        page,
        projectId: 'logix-react.local-counter',
        packId: 'boundaryProbe',
        ownerClass: 'reflection',
        expectedText: /Unknown action missingAction|runtime-reflection|evidence.gap/,
      })
      const trace = await page.getByLabel('Trace detail').textContent()
      assert(!trace?.includes('operation.completed'), 'unknown raw action must not complete a runtime dispatch')
    },
  },
  {
    ownerClass: 'runtime-dispatch',
    projectId: 'logix-react.local-counter',
    label: 'manifest-valid dispatch failure is surfaced',
    run: async ({ page }) => {
      await replaceSource(page, '/src/main.program.ts', [
        'import { Schema } from "effect"',
        'import * as Logix from "@logixjs/core"',
        '',
        'const Counter = Logix.Module.make("counter", {',
        '  state: Schema.Struct({ count: Schema.Number }),',
        '  actions: { increment: Schema.Void },',
        '  reducers: {',
        '    increment: () => { throw new Error("dispatch boundary probe") },',
        '  },',
        '})',
        '',
        'export const Program = Logix.Program.make(Counter, {',
        '  initial: { count: 0 },',
        '  logics: [],',
        '})',
        '',
        'export const main = () => ({ count: 0 })',
      ].join('\n'))
      await page.getByRole('region', { name: 'Runtime inspector' }).getByRole('button', { name: 'Actions' }).click()
      await page.getByRole('button', { name: 'Dispatch increment' }).click()
      await assertGapVisible({
        page,
        projectId: 'logix-react.local-counter',
        packId: 'boundaryProbe',
        ownerClass: 'runtime-dispatch',
        expectedText: /dispatch boundary probe|dispatch failed|operation.failed|evidence.gap/,
      })
      await assertEvidenceCoordinate({
        page,
        source: page.getByRole('region', { name: 'Action workbench' }).getByLabel('Dispatch result'),
        context: 'runtime-dispatch boundary probe',
        expectedProjectId: 'logix-react.local-counter',
        expectedOperationKind: 'dispatch',
        snapshot: page.getByLabel('Snapshot summary'),
        consoleOrState: page.getByLabel('Action workbench state preview'),
      })
    },
  },
]

export const boundaryProbes: ReadonlyArray<BoundaryProbe> = [
  ...localCounterBoundaryProbes,
]

export const runBoundaryProbesForProject = async (ctx: BoundaryProbeContext): Promise<void> => {
  for (const probe of boundaryProbes.filter((item) => item.projectId === ctx.project.id)) {
    await gotoProjectRoute(ctx.page, ctx.baseUrl, ctx.project)
    await probe.run(ctx)
    await assertNoSilentFallback(ctx.page, ctx.project.id, 'boundaryProbe')
  }
}
```

- [ ] **Step 2: Wire boundary probe runner into proof packs**

Import `runBoundaryProbesForProject` in `examples/logix-react/test/browser/playground-proof-packs.ts`, then replace the `boundaryProbe` branch:

```ts
if (packId === 'boundaryProbe') {
  await runBoundaryProbesForProject(input)
  return
}
```

Keep the existing `gapHarvest` branch from Task 6 as `assertAllRouteGapHarvest(...)`. Do not replace it with `assertNoSilentFallback`; no-silent-fallback is only one subcheck inside all-route gap harvest.

- [ ] **Step 3: Run focused browser test**

Run:

```bash
rtk pnpm -C examples/logix-react test:browser:playground
```

Expected: reflection and runtime-dispatch probes pass, or fail with `ownerClass=reflection` or `ownerClass=runtime-dispatch`.

### Task 16: Add runtime-run boundary probe

**Files:**
- Modify: `examples/logix-react/test/browser/playground-boundary-probes.ts`

- [ ] **Step 1: Add runtime-run probe**

Append to `localCounterBoundaryProbes`:

```ts
{
  ownerClass: 'runtime-run',
  projectId: 'logix-react.local-counter',
  label: 'runtime Run failure is surfaced',
  run: async ({ page }) => {
    await replaceSource(page, '/src/logic/localCounter.logic.ts', [
      'export const counterStep = (() => {',
      '  throw new Error("run boundary probe")',
      '})()',
    ].join('\n'))
    await getHostCommand(page, 'Run').click()
    const result = page.getByRole('region', { name: 'Program result' }).getByLabel('Run result')
    await assertGapVisible({
      page,
      projectId: 'logix-react.local-counter',
      packId: 'boundaryProbe',
      ownerClass: 'runtime-run',
      expectedText: /run boundary probe|operation.failed|runtime/i,
    })
    await assertEvidenceCoordinate({
      page,
      source: result,
      context: 'runtime-run boundary probe',
      expectedProjectId: 'logix-react.local-counter',
      expectedOperationKind: 'run',
      snapshot: page.getByLabel('Snapshot summary'),
      consoleOrState: page.getByRole('region', { name: 'Workbench bottom console' }),
    })
  },
}
```

- [ ] **Step 2: Run browser test**

Run:

```bash
rtk pnpm -C examples/logix-react test:browser:playground
```

Expected: runtime-run probe passes, or fails with a visible `ownerClass=runtime-run` assertion.

### Task 17: Add control-plane check and trial probes

**Files:**
- Modify: `examples/logix-react/test/browser/playground-boundary-probes.ts`

- [ ] **Step 1: Add shared invalid source helper**

Add this helper:

```ts
const replaceLocalCounterWithInvalidSource = (page: Page): Promise<void> =>
  replaceSource(page, '/src/main.program.ts', [
    'import { Schema } from "effect"',
    'import * as Logix from "@logixjs/core"',
    '',
    'const Counter = Logix.Module.make("counter", {',
    '  state: Schema.Struct({ count: Schema.Number }),',
    '  actions: { increment: Schema.Void },',
    '  reducers: { increment: () => ({ count: "invalid" }) },',
    '})',
    '',
    'export const Program = Logix.Program.make(Counter, {',
    '  initial: { count: 0 },',
    '  logics: [],',
    '})',
  ].join('\n'))
```

- [ ] **Step 2: Add control-plane-check probe**

Append:

```ts
{
  ownerClass: 'control-plane-check',
  projectId: 'logix-react.local-counter',
  label: 'Runtime.check failure is surfaced',
  run: async ({ page }) => {
    await replaceLocalCounterWithInvalidSource(page)
    await getHostCommand(page, 'Check').click()
    const report = page.getByRole('region', { name: 'Program result' }).getByRole('region', { name: 'Check report' })
    await assertGapVisible({
      page,
      projectId: 'logix-react.local-counter',
      packId: 'boundaryProbe',
      ownerClass: 'control-plane-check',
      expectedText: /Check report|FAIL|operation.failed|evidence.gap|invalid/i,
    })
    await assertEvidenceCoordinate({
      page,
      source: report,
      diagnostics: page.getByLabel('Diagnostics detail'),
      snapshot: page.getByLabel('Snapshot summary'),
      context: 'control-plane-check boundary probe',
      expectedProjectId: 'logix-react.local-counter',
      expectedOperationKind: 'check',
    })
  },
}
```

- [ ] **Step 3: Add control-plane-trial probe**

Append:

```ts
{
  ownerClass: 'control-plane-trial',
  projectId: 'logix-react.local-counter',
  label: 'Runtime.trial startup failure is surfaced',
  run: async ({ page }) => {
    await replaceLocalCounterWithInvalidSource(page)
    await getHostCommand(page, 'Trial').click()
    const report = page.getByRole('region', { name: 'Program result' }).getByRole('region', { name: 'Trial report' })
    await assertGapVisible({
      page,
      projectId: 'logix-react.local-counter',
      packId: 'boundaryProbe',
      ownerClass: 'control-plane-trial',
      expectedText: /Trial report|startup|FAIL|operation.failed|evidence.gap|invalid/i,
    })
    await assertEvidenceCoordinate({
      page,
      source: report,
      diagnostics: page.getByLabel('Diagnostics detail'),
      snapshot: page.getByLabel('Snapshot summary'),
      context: 'control-plane-trial boundary probe',
      expectedProjectId: 'logix-react.local-counter',
      expectedOperationKind: 'trialStartup',
    })
  },
}
```

- [ ] **Step 4: Run browser test**

Run:

```bash
rtk pnpm -C examples/logix-react test:browser:playground
```

Expected: both control-plane probes pass, or fail with owner-specific gap messages.

### Task 18: Add transport boundary probe through a test-only hook

**Files:**
- Create: `packages/logix-playground/src/internal/runner/playgroundBoundaryTestHooks.ts`
- Create: `packages/logix-playground/src/internal/runner/playgroundBoundaryTestHooks.test.ts`
- Modify: `packages/logix-playground/src/internal/runner/sandboxRunner.ts`
- Modify: `examples/logix-react/test/browser/playground-boundary-probes.ts`

- [ ] **Step 1: Add single-use test hook contract**

Create `packages/logix-playground/src/internal/runner/playgroundBoundaryTestHooks.ts`:

```ts
export type PlaygroundBoundaryTransportOperation = 'run' | 'dispatch' | 'check' | 'trialStartup'

export interface PlaygroundBoundaryTestHooks {
  readonly transportFailures?: Partial<Record<PlaygroundBoundaryTransportOperation, string>>
  readonly projectionGap?: {
    readonly summary: string
  }
}

declare global {
  var __LOGIX_PLAYGROUND_BOUNDARY_TEST_HOOKS__: PlaygroundBoundaryTestHooks | undefined
}

export const consumeBoundaryTransportFailure = (
  operation: PlaygroundBoundaryTransportOperation,
): Error | undefined => {
  const hooks = globalThis.__LOGIX_PLAYGROUND_BOUNDARY_TEST_HOOKS__
  const message = hooks?.transportFailures?.[operation]
  if (!message) return undefined
  delete hooks.transportFailures?.[operation]
  return new Error(message)
}

export const consumeBoundaryProjectionGap = (): PlaygroundBoundaryTestHooks['projectionGap'] | undefined => {
  const hooks = globalThis.__LOGIX_PLAYGROUND_BOUNDARY_TEST_HOOKS__
  const gap = hooks?.projectionGap
  if (!gap) return undefined
  delete hooks.projectionGap
  return gap
}
```

- [ ] **Step 2: Test single-use behavior**

Create `packages/logix-playground/src/internal/runner/playgroundBoundaryTestHooks.test.ts`:

```ts
import { describe, expect, it, afterEach } from 'vitest'
import {
  consumeBoundaryProjectionGap,
  consumeBoundaryTransportFailure,
} from './playgroundBoundaryTestHooks'

afterEach(() => {
  globalThis.__LOGIX_PLAYGROUND_BOUNDARY_TEST_HOOKS__ = undefined
})

describe('playground boundary test hooks', () => {
  it('consumes transport failures once', () => {
    globalThis.__LOGIX_PLAYGROUND_BOUNDARY_TEST_HOOKS__ = {
      transportFailures: { run: 'transport boundary probe' },
    }
    expect(consumeBoundaryTransportFailure('run')?.message).toBe('transport boundary probe')
    expect(consumeBoundaryTransportFailure('run')).toBeUndefined()
  })

  it('consumes projection gaps once', () => {
    globalThis.__LOGIX_PLAYGROUND_BOUNDARY_TEST_HOOKS__ = {
      projectionGap: { summary: 'projection boundary probe' },
    }
    expect(consumeBoundaryProjectionGap()?.summary).toBe('projection boundary probe')
    expect(consumeBoundaryProjectionGap()).toBeUndefined()
  })
})
```

- [ ] **Step 3: Wire run transport failure into sandbox runner**

In `packages/logix-playground/src/internal/runner/sandboxRunner.ts`, import `consumeBoundaryTransportFailure` and add this before `transport.init()` inside `runProgram`:

```ts
const injectedTransportFailure = consumeBoundaryTransportFailure('run')
if (injectedTransportFailure) {
  return projectRunFailure(runId, 'worker', injectedTransportFailure)
}
```

- [ ] **Step 4: Add transport probe**

Append to `boundaryProbes`:

```ts
{
  ownerClass: 'transport',
  projectId: 'logix-react.pressure.trace-heavy',
  label: 'sandbox transport failure is surfaced',
  run: async ({ page }) => {
    await page.evaluate(() => {
      globalThis.__LOGIX_PLAYGROUND_BOUNDARY_TEST_HOOKS__ = {
        transportFailures: { run: 'transport boundary probe' },
      }
    })
    await getHostCommand(page, 'Run').click()
    const result = page.getByRole('region', { name: 'Program result' }).getByLabel('Run result')
    await assertGapVisible({
      page,
      projectId: 'logix-react.pressure.trace-heavy',
      packId: 'boundaryProbe',
      ownerClass: 'transport',
      expectedText: /transport boundary probe|worker|operation.failed|evidence.gap/i,
    })
    await assertEvidenceCoordinate({
      page,
      source: result,
      context: 'transport boundary probe',
      expectedProjectId: 'logix-react.pressure.trace-heavy',
      expectedOperationKind: 'run',
      snapshot: page.getByLabel('Snapshot summary'),
      consoleOrState: page.getByRole('region', { name: 'Workbench bottom console' }),
    })
  },
}
```

- [ ] **Step 5: Run hook and browser tests**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run src/internal/runner/playgroundBoundaryTestHooks.test.ts --reporter=dot
rtk pnpm -C examples/logix-react test:browser:playground
```

Expected: hook test passes and the transport probe surfaces a bounded failure without crashing the shell.

### Task 19: Add projection boundary probe through existing workbench gap face

**Files:**
- Modify: `packages/logix-playground/src/internal/summary/workbenchProjection.ts`
- Modify: `packages/logix-playground/src/internal/summary/workbenchProjection.test.ts`
- Modify: `examples/logix-react/test/browser/playground-boundary-probes.ts`

- [ ] **Step 1: Write failing projection hook test**

Add to `packages/logix-playground/src/internal/summary/workbenchProjection.test.ts`:

```ts
it('projects test hook gaps through the evidence-gap face', () => {
  const snapshot = createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))
  globalThis.__LOGIX_PLAYGROUND_BOUNDARY_TEST_HOOKS__ = {
    projectionGap: {
      summary: 'projection boundary probe',
    },
  }
  const projection = derivePlaygroundWorkbenchProjection({ snapshot })
  expect(JSON.stringify(projection)).toContain('playground-unavailable-check-report')
  expect(JSON.stringify(projection)).toContain('projection boundary probe')
  globalThis.__LOGIX_PLAYGROUND_BOUNDARY_TEST_HOOKS__ = undefined
})
```

The test file already imports `createProjectSnapshot`, `createPlaygroundWorkspace`, and `localCounterProjectFixture`; reuse those imports.

- [ ] **Step 2: Wire projection gap hook**

In `buildPlaygroundRuntimeWorkbenchAuthorityBundle`, import `consumeBoundaryProjectionGap` and add after `truthInputs` is created:

```ts
const projectedBoundaryGap = consumeBoundaryProjectionGap()
if (projectedBoundaryGap) {
  truthInputs.push(explicitGapTruthInput(
    input.snapshot,
    digest,
    'playground-unavailable-check-report',
    projectedBoundaryGap.summary,
    'error',
  ))
}
```

The hook may override only the summary of the existing `playground-unavailable-check-report` gap. It must not introduce a new runtime gap code or taxonomy.

- [ ] **Step 3: Add projection probe**

Append to `boundaryProbes`:

```ts
{
  ownerClass: 'projection',
  projectId: 'logix-react.pressure.diagnostics-dense',
  label: 'workbench projection gap is visible',
  run: async ({ page }) => {
    await page.evaluate(() => {
      globalThis.__LOGIX_PLAYGROUND_BOUNDARY_TEST_HOOKS__ = {
        projectionGap: {
          summary: 'projection boundary probe',
        },
      }
    })
    await getHostCommand(page, 'Check').click()
    await page.getByRole('region', { name: 'Workbench bottom console' }).getByRole('button', { name: 'Diagnostics' }).click()
    await assertGapVisible({
      page,
      projectId: 'logix-react.pressure.diagnostics-dense',
      packId: 'boundaryProbe',
      ownerClass: 'projection',
      expectedText: /playground-unavailable-check-report|projection boundary probe|evidence.gap/i,
    })
  },
}
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run src/internal/summary/workbenchProjection.test.ts --reporter=dot
rtk pnpm -C examples/logix-react test:browser:playground
```

Expected: projection gap appears in the existing diagnostics/trace/projection face.

### Task 20: Add playground-product boundary probe

**Files:**
- Modify: `examples/logix-react/test/browser/playground-boundary-probes.ts`

- [ ] **Step 1: Add service-source product failure probe**

Append to `boundaryProbes`:

```ts
{
  ownerClass: 'playground-product',
  projectId: 'logix-react.service-source',
  label: 'service source bad result shape is bounded',
  run: async ({ page }) => {
    await replaceSource(page, '/src/services/search.service.ts', [
      'export const search = () => ({',
      '  resultCount: "invalid product shape",',
      '})',
    ].join('\n'))
    await getHostCommand(page, 'Run').click()
    const result = page.getByRole('region', { name: 'Program result' }).getByLabel('Run result')
    await assertGapVisible({
      page,
      projectId: 'logix-react.service-source',
      packId: 'boundaryProbe',
      ownerClass: 'playground-product',
      expectedText: /invalid product shape|bounded|runtime|operation.failed|evidence.gap/i,
    })
    await assertEvidenceCoordinate({
      page,
      source: result,
      context: 'playground-product boundary probe',
      expectedProjectId: 'logix-react.service-source',
      expectedOperationKind: 'run',
      snapshot: page.getByLabel('Snapshot summary'),
      consoleOrState: page.getByRole('region', { name: 'Workbench bottom console' }),
    })
  },
}
```

- [ ] **Step 2: Run browser test**

Run:

```bash
rtk pnpm -C examples/logix-react test:browser:playground
```

Expected: all active boundary owner classes are exercised: `reflection`, `runtime-run`, `runtime-dispatch`, `control-plane-check`, `control-plane-trial`, `transport`, `projection`, and `playground-product`. If a probe exposes a kernel gap, keep the failing assertion and record the gap in `specs/166-playground-driver-scenario-surface/notes/verification.md` with owner, route, operation and follow-up proposal path.

## Chunk 8: Docs Writeback And Verification

### Task 21: Write SSoT dogfooding proof law

**Files:**
- Modify: `docs/ssot/runtime/17-playground-product-workbench.md`

- [ ] **Step 1: Add concise proof law**

Add under the Playground route or testing rules section:

```md
## Dogfooding Route Proof Law

`examples/logix-react` `/playground/:id` browser coverage is the executable proof surface for curated Playground demos.

Rules:

- The test matrix is registry-indexed. Route, files, capabilities, drivers, scenarios, service files and pressure metadata are derived from `PlaygroundProject`.
- Each route must prove all-route shell/source/snapshot invariants and at least one runtime evidence probe.
- Runtime alignment uses a single evidence coordinate across result, diagnostics, trace and snapshot faces.
- Playground dogfood proof must cover both runtime evidence alignment and React host render isolation. Local UI controls must not force unrelated workbench regions to re-render or remount; evidence coordinates prove runtime truth alignment, while render isolation probes prove state ownership and subscription boundaries.
- Pressure rows prove visual capacity only; runtime authority is proven by separate runtime evidence probes.
- Boundary probes must route missing authority, compile/transport/runtime failure and projection gaps into existing evidence gap, control-plane, transport or projection faces.
- Boundary probes are dogfooding pressure against runtime boundaries. Passing UI text without matching runtime evidence coordinate does not satisfy this law.
- SSoT does not copy the route-by-route executable matrix.
```

- [ ] **Step 2: Check docs wording for forbidden matrix duplication**

Run:

```bash
rtk rg "local-counter runtime chain|service source runtime chain|action density visual capacity" docs/ssot/runtime/17-playground-product-workbench.md
```

Expected: no matches. The route matrix should stay in test support and the plan/proposal.

### Task 22: Add verification note

**Files:**
- Modify: `specs/166-playground-driver-scenario-surface/notes/verification.md`

- [ ] **Step 1: Append verification entry after implementation**

Append:

```md
## 2026-04-29 Playground Dogfood E2E Coverage

Implementation summary:

- Added registry-indexed proof recipes for all `examples/logix-react` Playground projects.
- Added facet-derived Playwright proof packs, evidence coordinate assertions, gap harvest helpers and active boundary probes.
- Added render isolation probes for selected routes and split Playground region state ownership before evidence coordinate wiring.
- Kept route/files/capabilities/drivers/scenarios/serviceFiles/pressure metadata derived from `PlaygroundProject`.
- Separated pressure visual capacity rows from runtime evidence probes.

Commands run:

- `rtk pnpm -C examples/logix-react exec vitest run test/playground-registry.contract.test.ts --reporter=dot`
- `rtk pnpm -C examples/logix-react test:browser:playground`
- `rtk pnpm -C examples/logix-react typecheck`

Coverage:

- Proof recipe path: `examples/logix-react/test/browser/playground-proof-recipes.ts`
- Project count: 7
- Active boundary owner classes: reflection, runtime-run, runtime-dispatch, control-plane-check, control-plane-trial, transport, projection, playground-product
- Render isolation probes: local-counter, pressure.action-dense, pressure.trace-heavy

Discovered gaps:

- None, or list owner / route / operation / evidence location / follow-up proposal path.
```

- [ ] **Step 2: Keep discovered gaps honest**

If any active boundary probe fails because the runtime or projection face is missing, do not rewrite the test to pass. Record the gap and create or update a proposal under `docs/review-plan/proposals/`.

### Task 23: Final verification gate

**Files:**
- All touched files.

- [ ] **Step 1: Run registry test**

Run:

```bash
rtk pnpm -C examples/logix-react exec vitest run test/playground-registry.contract.test.ts --reporter=dot
```

Expected: PASS.

- [ ] **Step 2: Run browser dogfood route test**

Run:

```bash
rtk pnpm -C examples/logix-react test:browser:playground
```

Expected: PASS, unless an active boundary probe exposes a real kernel gap. If a real gap appears, report it with owner and evidence rather than marking this plan complete.

- [ ] **Step 3: Run example typecheck**

Run:

```bash
rtk pnpm -C examples/logix-react typecheck
```

Expected: PASS.

- [ ] **Step 4: Run package checks if package UI changed**

If any `packages/logix-playground/src/internal/components/**` file changed, run:

```bash
rtk pnpm -C packages/logix-playground typecheck
rtk pnpm -C packages/logix-playground exec vitest run src/internal/components/WorkbenchBottomPanel.test.tsx src/internal/components/ActionManifestPanel.test.tsx --reporter=dot
```

Expected: PASS.

- [ ] **Step 5: Summarize verification**

Report:

- proposal path
- plan path
- proof recipe path
- browser command result
- active boundary probe result
- any discovered kernel gaps
