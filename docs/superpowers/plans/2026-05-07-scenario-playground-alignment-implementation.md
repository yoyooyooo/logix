# Scenario Playground Alignment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the reviewed, non-authority alignment slice between verification-owned scenario corpus and Playground scenario metadata.

**Architecture:** Keep `examples/logix/src/verification/**` as the only scenario corpus owner, and add a repo-internal mappability matrix under `examples/logix-react/src/playground/**` that classifies Playground scenario metadata against that corpus. The matrix is a non-executable inventory, not Runtime input, CLI input, public API, report evidence or a projection bridge.

**Tech Stack:** TypeScript, Vitest, pnpm, existing `@logixjs/playground/Project` metadata types, existing examples workspaces.

---

Implementation harness:

- `@superpowers:subagent-driven-development` when subagents are available
- `@superpowers:executing-plans` as the fallback execution path

## Source Contracts

- Spec: `docs/next/logix-api-planning/scenario-playground-alignment-proposal.md`
- Review ledger: `docs/review-plan/runs/2026-05-07-scenario-playground-alignment-optimality-loop.md`
- Verification authority: `docs/ssot/runtime/09-verification-control-plane.md`
- CLI scenario gate: `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
- Playground product metadata contract: `packages/logix-playground/src/Project.ts`

## Scope

Implement now:

- freeze a tiny verification-owned scenario corpus record in `examples/logix/src/verification/**`
- add a non-executable mappability matrix for current Playground scenario metadata
- add guard tests proving the matrix does not become Runtime, CLI or public Playground surface
- update docs/indexes that point readers to the new corpus and matrix

Do not implement now:

- no core-owned scenario executor
- no projection bridge
- no provenance snapshot
- no public scenario API
- no new scenario grammar or exported union
- no CLI productization of `trial --mode scenario`

Repository policy override: this plan intentionally does not include `git add`, `git commit`, `git push`, `git merge` or `git rebase` steps. This repository's `AGENTS.md` forbids those unless the user explicitly asks.

## File Structure

- Create `examples/logix/src/verification/scenario-corpus.ts`
  - Owns the verification-side corpus records.
  - Uses `fixtures/env + steps + expect` vocabulary only.
  - Does not import Playground or React code.
- Modify `examples/logix/src/verification/index.ts`
  - Re-export the corpus and keep `verificationExamples` intact.
  - Add one verification example row for the local counter corpus entry.
- Modify `examples/logix/src/verification/README.md`
  - Document that the corpus is verification-owned and not a Playground projection.
- Create `examples/logix-react/src/playground/scenarioMappability.ts`
  - Owns the repo-internal mapping from Playground metadata to verification corpus ids.
  - Imports only Playground registry/project metadata and plain corpus ids.
  - Does not export from package roots.
- Modify `examples/logix-react/test/playground-registry.contract.test.ts`
  - Add tests for the local-counter mappability row.
  - Prove unsupported/provenance-only classification remains structural.
- Create `examples/logix-react/test/playground-scenario-mappability.guard.test.ts`
  - Guard that the matrix is non-executable and cannot look like a Runtime trial input or report.
- Modify `packages/logix-playground/test/public-surface.contract.test.ts`
  - Guard no mappability or scenario-verification nouns are exported by `@logixjs/playground`.
- Modify `packages/logix-cli/test/Integration/trial.command.test.ts`
  - Strengthen the existing scenario-mode structured-failure test so it cannot emit a `trialReport`.
- Modify `docs/next/logix-api-planning/scenario-playground-alignment-proposal.md`
  - Mark implementation plan link and keep Wave 3/4 explicitly out of scope.
- Modify `docs/next/logix-api-planning/run-state.md`
  - Update current cursor only after implementation is done.

## Chunk 1: Verification Corpus

### Task 1: Add Verification-Owned Scenario Corpus

**Files:**
- Create: `examples/logix/src/verification/scenario-corpus.ts`
- Modify: `examples/logix/src/verification/index.ts`
- Modify: `examples/logix/src/verification/README.md`
- Test: `examples/logix/src/verification/scenario-corpus.ts` through `pnpm -C examples/logix typecheck`

- [x] **Step 1: Write the corpus module**

Create `examples/logix/src/verification/scenario-corpus.ts` with this content:

```ts
export type VerificationScenarioStepKind = 'dispatch' | 'await' | 'read' | 'call' | 'tick'
export type VerificationScenarioExpectationKind = 'equals' | 'includes' | 'exists' | 'count' | 'changed'

export interface VerificationScenarioCorpusEntry {
  readonly id: string
  readonly docs: string
  readonly authority: 'verification-corpus'
  readonly fixtures: {
    readonly env: string
  }
  readonly steps: ReadonlyArray<{
    readonly id: string
    readonly kind: VerificationScenarioStepKind
    readonly target: string
    readonly note: string
  }>
  readonly expect: ReadonlyArray<{
    readonly id: string
    readonly kind: VerificationScenarioExpectationKind
    readonly target: 'state' | 'evidence summary' | 'artifacts' | 'environment'
    readonly note: string
  }>
}

export const verificationScenarioCorpus = [
  {
    id: 'local-counter-increment-state-change',
    docs: 'docs/ssot/runtime/09-verification-control-plane.md',
    authority: 'verification-corpus',
    fixtures: {
      env: 'Program entry with local counter state and declared increment action',
    },
    steps: [
      {
        id: 'dispatch-increment',
        kind: 'dispatch',
        target: 'action:increment',
        note: 'dispatch the declared increment action through a controlled scenario plan',
      },
      {
        id: 'await-settle',
        kind: 'await',
        target: 'runtime-settle',
        note: 'wait for the runtime to settle before reading state',
      },
      {
        id: 'read-counter-state',
        kind: 'read',
        target: 'state:counter',
        note: 'read the counter state through the scenario read coordinate',
      },
    ],
    expect: [
      {
        id: 'counter-state-changed',
        kind: 'changed',
        target: 'state',
        note: 'counter state changed after increment',
      },
    ],
  },
] as const satisfies ReadonlyArray<VerificationScenarioCorpusEntry>

export type VerificationScenarioCorpusId = (typeof verificationScenarioCorpus)[number]['id']

export const verificationScenarioCorpusIds = verificationScenarioCorpus.map((entry) => entry.id)
```

- [x] **Step 2: Run typecheck to expose integration errors**

Run:

```bash
rtk pnpm -C examples/logix typecheck
```

Expected: PASS, or FAIL only if the new module needs local syntax/import fixes. Fix only this module if needed.

- [x] **Step 3: Wire the corpus into the verification index**

Modify `examples/logix/src/verification/index.ts`:

```ts
import { verificationScenarioCorpus } from './scenario-corpus.js'

export { verificationScenarioCorpus, verificationScenarioCorpusIds } from './scenario-corpus.js'

export const verificationExamples = [
  {
    id: 'trial-run-evidence',
    docs: 'docs/ssot/runtime/09-verification-control-plane.md',
    example: 'examples/logix/src/scenarios/trial-run-evidence.ts',
    fixtures: {
      env: 'runtime.trial(mode="startup") with example runtime layer',
    },
    steps: ['load scenario', 'run trial', 'collect standard report'],
    expect: ['verdict=PASS', 'artifacts include trial report'],
  },
  {
    id: 'local-counter-increment-state-change',
    docs: 'docs/ssot/runtime/09-verification-control-plane.md',
    example: 'examples/logix/src/verification/scenario-corpus.ts',
    fixtures: verificationScenarioCorpus[0]!.fixtures,
    steps: verificationScenarioCorpus[0]!.steps.map((step) => `${step.kind}:${step.target}`),
    expect: verificationScenarioCorpus[0]!.expect.map((item) => `${item.kind}:${item.target}`),
  },
  {
    id: 'agent-live-runtime-bridge',
    docs: 'specs/171-agent-live-runtime-bridge/spec.md',
    example: 'examples/logix/src/verification/live-bridge-fixture.ts',
    fixtures: {
      env: 'repo-internal live bridge fixture with one declared action and one invalid dispatch case',
    },
    steps: ['attach fixture runtime', 'list targets', 'deny invalid dispatch', 'export canonical evidence'],
    expect: ['target coordinate is stable', 'invalid dispatch returns operation.denied with noMutation=true', 'evidence export is canonical'],
  },
  {
    id: 'field-kernel-direct-api',
    docs: 'docs/ssot/runtime/06-form-field-kernel-boundary.md',
    example: 'examples/logix/src/scenarios/ir/reflectStaticIr.ts',
    fixtures: {
      env: 'field-kernel direct API sample with static IR export',
    },
    steps: ['load field-kernel scenario', 'inspect fixtures/env', 'compare exported artifacts'],
    expect: ['artifacts include static IR', 'report remains machine-readable'],
  },
] as const
```

- [x] **Step 4: Update verification README**

Modify `examples/logix/src/verification/README.md` by adding this section after `## 模板`:

```md
## Scenario Corpus

- [scenario-corpus.ts](./scenario-corpus.ts) is the verification-owned scenario corpus.
- It uses only `fixtures/env + steps + expect`.
- It is not generated from Playground scenario metadata.
- It is not a public scenario authoring API.
- It is not executable by CLI `trial --mode scenario` until a core-owned scenario executor exists.
```

- [x] **Step 5: Run `examples/logix` typecheck**

Run:

```bash
rtk pnpm -C examples/logix typecheck
```

Expected: PASS.

- [x] **Step 6: Run verification corpus import sweep**

Run:

```bash
rtk rg -n '@logixjs/playground|PlaygroundProject|PlaygroundScenario|PlaygroundDriver' examples/logix/src/verification
```

Expected: no output and exit code 1. This proves the verification corpus does not import Playground.

- [x] **Step 7: Run verification corpus naming sweep**

Run:

```bash
rtk rg -n 'local-counter-increment-state-change|scenario-corpus' examples/logix/src/verification
```

Expected: hits in `scenario-corpus.ts`, `index.ts`, and `README.md`.

- [x] **Step 8: Checkpoint diff**

Run:

```bash
rtk git diff -- examples/logix/src/verification/scenario-corpus.ts examples/logix/src/verification/index.ts examples/logix/src/verification/README.md
```

Expected: only the verification corpus changes. Do not stage or commit unless the user explicitly asks.

## Chunk 2: Playground Mappability Matrix

### Task 2: Add Repo-Internal Playground Mappability Matrix

**Files:**
- Create: `examples/logix-react/src/playground/scenarioMappability.ts`
- Modify: `examples/logix-react/test/playground-registry.contract.test.ts`
- Create: `examples/logix-react/test/playground-scenario-mappability.guard.test.ts`
- Test: `examples/logix-react/test/playground-registry.contract.test.ts`
- Test: `examples/logix-react/test/playground-scenario-mappability.guard.test.ts`

- [x] **Step 1: Write the failing registry test for local-counter mapping**

Add this test to `examples/logix-react/test/playground-registry.contract.test.ts` after the existing local-counter scenario metadata test:

```ts
  it('maps local counter Playground scenario metadata to the verification corpus without creating executable input', async () => {
    const { logixReactPlaygroundScenarioMappability } = await import('../src/playground/scenarioMappability')
    const row = logixReactPlaygroundScenarioMappability.find(
      (candidate) => candidate.projectId === 'logix-react.local-counter',
    )

    expect(row).toMatchObject({
      projectId: 'logix-react.local-counter',
      scenarioId: 'counter-demo',
      corpusId: 'local-counter-increment-state-change',
      classification: 'directly-representable',
      authority: 'playground-mappability-only',
      executable: false,
    })
    expect(row?.stepIntents).toEqual([
      { stepId: 'increase-once', playgroundKind: 'driver', verificationKind: 'dispatch', support: 'direct' },
      { stepId: 'settle-runtime', playgroundKind: 'settle', verificationKind: 'await', support: 'direct' },
      { stepId: 'expect-state', playgroundKind: 'expect', verificationKind: 'expect', support: 'direct' },
    ])
    expect(JSON.stringify(row)).not.toContain('VerificationControlPlaneReport')
    expect(JSON.stringify(row)).not.toContain('verdict')
  })
```

- [x] **Step 2: Run the test and confirm it fails**

Run:

```bash
rtk pnpm -C examples/logix-react exec vitest run test/playground-registry.contract.test.ts --project unit
```

Expected: FAIL because `../src/playground/scenarioMappability` does not exist. Observed failure matched that missing-module condition before the implementation step.

- [x] **Step 3: Add the matrix module**

Create `examples/logix-react/src/playground/scenarioMappability.ts`:

```ts
import { logixReactPlaygroundProjectIndex } from './registry'

export type PlaygroundScenarioMappabilityClassification =
  | 'directly-representable'
  | 'provenance-only'
  | 'unsupported'

export type PlaygroundScenarioMappabilitySupport = 'direct' | 'provenance-only' | 'unsupported'

export interface PlaygroundScenarioMappabilityStep {
  readonly stepId: string
  readonly playgroundKind: 'driver' | 'wait' | 'settle' | 'observe' | 'expect'
  readonly verificationKind: 'dispatch' | 'await' | 'read' | 'call' | 'tick' | 'expect' | null
  readonly support: PlaygroundScenarioMappabilitySupport
}

export interface PlaygroundScenarioMappabilityRow {
  readonly projectId: string
  readonly scenarioId: string
  readonly corpusId: 'local-counter-increment-state-change'
  readonly classification: PlaygroundScenarioMappabilityClassification
  readonly authority: 'playground-mappability-only'
  readonly executable: false
  readonly programEntry: string
  readonly driverActionTags: ReadonlyArray<string>
  readonly readAnchorIds: ReadonlyArray<string>
  readonly stepIntents: ReadonlyArray<PlaygroundScenarioMappabilityStep>
  readonly unsupportedReasons: ReadonlyArray<string>
}

const localCounter = logixReactPlaygroundProjectIndex['logix-react.local-counter']

export const logixReactPlaygroundScenarioMappability = [
  {
    projectId: localCounter.id,
    scenarioId: 'counter-demo',
    corpusId: 'local-counter-increment-state-change',
    classification: 'directly-representable',
    authority: 'playground-mappability-only',
    executable: false,
    programEntry: localCounter.program?.entry ?? '/src/main.program.ts',
    driverActionTags: ['increment'],
    readAnchorIds: ['counter'],
    stepIntents: [
      { stepId: 'increase-once', playgroundKind: 'driver', verificationKind: 'dispatch', support: 'direct' },
      { stepId: 'settle-runtime', playgroundKind: 'settle', verificationKind: 'await', support: 'direct' },
      { stepId: 'expect-state', playgroundKind: 'expect', verificationKind: 'expect', support: 'direct' },
    ],
    unsupportedReasons: [],
  },
] as const satisfies ReadonlyArray<PlaygroundScenarioMappabilityRow>
```

- [x] **Step 4: Run the registry test and confirm it passes**

Run:

```bash
rtk pnpm -C examples/logix-react exec vitest run test/playground-registry.contract.test.ts --project unit
```

Expected: PASS.

- [x] **Step 5: Add guard tests for non-executable, non-authority shape**

Create `examples/logix-react/test/playground-scenario-mappability.guard.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { logixReactPlaygroundScenarioMappability } from '../src/playground/scenarioMappability'

describe('Playground scenario mappability guard', () => {
  it('keeps mappability rows non-executable and outside control-plane report shape', () => {
    for (const row of logixReactPlaygroundScenarioMappability) {
      expect(row.authority).toBe('playground-mappability-only')
      expect(row.executable).toBe(false)
      expect(row).not.toHaveProperty('fixtures')
      expect(row).not.toHaveProperty('steps')
      expect(row).not.toHaveProperty('expect')
      expect(row).not.toHaveProperty('verdict')
      expect(row).not.toHaveProperty('artifacts')
      expect(row).not.toHaveProperty('primaryReportOutputKey')
      expect(row).not.toHaveProperty('report')
    }
  })

  it('does not define a second scenario grammar or projection bridge vocabulary', () => {
    const text = JSON.stringify(logixReactPlaygroundScenarioMappability)

    expect(text).not.toContain('ScenarioVerificationFixture')
    expect(text).not.toContain('VerificationControlPlaneReport')
    expect(text).not.toContain('Runtime.trial')
    expect(text).not.toContain('trialReport')
    expect(text).not.toContain('coreExecutor')
    expect(text).not.toContain('projectionBridge')
  })

  it('classifies all current rows as direct, provenance-only, or unsupported', () => {
    const allowed = new Set(['directly-representable', 'provenance-only', 'unsupported'])

    expect(logixReactPlaygroundScenarioMappability.length).toBeGreaterThan(0)
    for (const row of logixReactPlaygroundScenarioMappability) {
      expect(allowed.has(row.classification)).toBe(true)
      if (row.classification === 'unsupported') {
        expect(row.unsupportedReasons.length).toBeGreaterThan(0)
      }
    }
  })
})
```

- [x] **Step 6: Run the mappability guard test**

Run:

```bash
rtk pnpm -C examples/logix-react exec vitest run test/playground-scenario-mappability.guard.test.ts --project unit
```

Expected: PASS.

- [x] **Step 7: Run example typecheck**

Run:

```bash
rtk pnpm -C examples/logix-react typecheck
```

Expected: PASS.

- [x] **Step 8: Checkpoint diff**

Run:

```bash
rtk git diff -- examples/logix-react/src/playground/scenarioMappability.ts examples/logix-react/test/playground-registry.contract.test.ts examples/logix-react/test/playground-scenario-mappability.guard.test.ts
```

Expected: only mappability matrix and tests. Do not stage or commit unless the user explicitly asks.

## Chunk 3: Authority Guards

### Task 3: Harden Playground and CLI Boundary Guards

**Files:**
- Modify: `packages/logix-playground/test/public-surface.contract.test.ts`
- Modify: `packages/logix-cli/test/Integration/trial.command.test.ts`
- Modify: `packages/logix-cli/src/internal/commands/trial.ts` if scenario-mode transport still emits `trialReport` or Playground vocabulary
- Modify: `packages/logix-cli/src/internal/result.ts` only if the structured failure transport cannot be corrected inside `trial.ts`
- Test: `packages/logix-playground/test/public-surface.contract.test.ts`
- Test: `packages/logix-cli/test/Integration/trial.command.test.ts`

- [x] **Step 1: Strengthen Playground public surface guard**

In `packages/logix-playground/test/public-surface.contract.test.ts`, add these expectations to `does not export internal product nouns from root`:

```ts
    expect(keys).not.toContain('ScenarioMappability')
    expect(keys).not.toContain('PlaygroundScenarioMappability')
    expect(keys).not.toContain('VerificationScenarioCorpus')
    expect(keys).not.toContain('ScenarioVerificationFixture')
```

Then add these expectations to `keeps driver, scenario, session and runtime evidence workbench nouns out of package exports`:

```ts
    expect(exportsText).not.toContain('ScenarioMappability')
    expect(exportsText).not.toContain('VerificationScenarioCorpus')
    expect(exportsText).not.toContain('ScenarioVerificationFixture')
```

- [x] **Step 2: Run Playground public surface guard**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/public-surface.contract.test.ts
```

Expected: PASS.

- [x] **Step 3: Strengthen CLI scenario structured-failure guard**

In `packages/logix-cli/test/Integration/trial.command.test.ts`, extend the test named `does not pretend scenario mode is implemented when scenario input is present`:

```ts
    expect(out.result.primaryReportOutputKey).toBe('errorReport')
    expect(JSON.stringify(out.result)).not.toContain('trialReport')
    expect(JSON.stringify(out.result)).not.toContain('"mode":"startup"')
    expect(JSON.stringify(out.result)).not.toContain('PlaygroundScenario')
    expect(JSON.stringify(out.result)).not.toContain('playground-mappability-only')
```

Keep the existing `CLI_SCENARIO_NOT_IMPLEMENTED` assertion.

- [x] **Step 4: Run CLI trial command test**

Run:

```bash
rtk pnpm -C packages/logix-cli exec vitest run test/Integration/trial.command.test.ts
```

Expected: PASS. If this fails because the command emits `trialReport`, startup mode, or Playground/mappability vocabulary, fix only the scenario-mode structured failure path. Do not remove the existing `errorReport` transport unless the CLI SSoT is updated first.

- [x] **Step 5: Run core/CLI import sweep**

Run:

```bash
rtk rg -n '@logixjs/playground|logix-playground|PlaygroundProject|PlaygroundScenario|PlaygroundDriver' packages/logix-core/src packages/logix-cli/src
```

Expected: no output and exit code 1.

- [x] **Step 6: Run mappability vocabulary sweep**

Run:

```bash
rtk rg -n 'ScenarioVerificationFixture|VerificationControlPlaneReport.*mappability|projectionBridge|coreExecutor' examples/logix-react/src/playground examples/logix-react/test packages/logix-playground/src packages/logix-playground/test
```

Expected: no output except negative assertions inside tests. If there are test hits, confirm they are under `expect(...).not.toContain(...)` or similar negative guards.

- [x] **Step 7: Checkpoint diff**

Run:

```bash
rtk git diff -- packages/logix-playground/test/public-surface.contract.test.ts packages/logix-cli/test/Integration/trial.command.test.ts packages/logix-cli/src/internal/commands/trial.ts packages/logix-cli/src/internal/result.ts
```

Expected: only guard hardening or the smallest CLI structured-failure fix. Do not stage or commit unless the user explicitly asks.

## Chunk 4: Docs Writeback and Final Verification

### Task 4: Update Planning Docs and Run Final Checks

**Files:**
- Modify: `docs/next/logix-api-planning/scenario-playground-alignment-proposal.md`
- Modify: `docs/next/logix-api-planning/run-state.md`
- Test: document checks and targeted runtime checks

- [x] **Step 1: Update proposal implementation status**

In `docs/next/logix-api-planning/scenario-playground-alignment-proposal.md`, update `Review Result`:

```md
- implementation plan: [2026-05-07-scenario-playground-alignment-implementation.md](../../superpowers/plans/2026-05-07-scenario-playground-alignment-implementation.md)
- implementation status: corpus and mappability slice landed
```

After `Wave 2: Mappability Matrix`, add:

```md
Current implementation target:

- verification corpus: `examples/logix/src/verification/scenario-corpus.ts`
- mappability matrix: `examples/logix-react/src/playground/scenarioMappability.ts`
- guard tests: `examples/logix-react/test/playground-scenario-mappability.guard.test.ts`
```

Do not mark Wave 3 or Wave 4 as implemented.

- [x] **Step 2: Update run-state after implementation completes**

In `docs/next/logix-api-planning/run-state.md`, update only the side proposal rows:

```md
| active_work_item | `SIDE-2026-05-07 scenario/playground alignment corpus+mappability slice closed` |
| active_phase | `paused-watch-only-after-side-implementation` |
| active_proof | `targeted typecheck and guard tests` |
| last_completed_step | `verification corpus, Playground mappability matrix and no-second-truth guards landed without scenario executor or projection bridge` |
```

Keep:

```md
| active_proposal | `none` |
```

- [x] **Step 3: Run `examples/logix` typecheck**

Run:

```bash
rtk pnpm -C examples/logix typecheck
```

Expected: PASS.

- [x] **Step 4: Run `examples/logix-react` targeted unit tests**

Run:

```bash
rtk pnpm -C examples/logix-react exec vitest run test/playground-registry.contract.test.ts test/playground-scenario-mappability.guard.test.ts --project unit
```

Expected: PASS.

- [x] **Step 5: Run `examples/logix-react` typecheck**

Run:

```bash
rtk pnpm -C examples/logix-react typecheck
```

Expected: PASS.

- [x] **Step 6: Run Playground public surface test**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/public-surface.contract.test.ts
```

Expected: PASS.

- [x] **Step 7: Run CLI trial structured-failure test**

Run:

```bash
rtk pnpm -C packages/logix-cli exec vitest run test/Integration/trial.command.test.ts
```

Expected: PASS.

- [x] **Step 8: Run authority sweep for verification/core/cli imports**

Run:

```bash
rtk rg -n '@logixjs/playground|logix-playground|PlaygroundProject|PlaygroundScenario|PlaygroundDriver' examples/logix/src/verification packages/logix-core/src packages/logix-cli/src
```

Expected: no output and exit code 1.

- [x] **Step 9: Run authority sweep for mappability file vocabulary**

Run:

```bash
rtk rg -n 'ScenarioVerificationFixture|projectionBridge|coreExecutor|Runtime.trial\\(|trialReport|VerificationControlPlaneReport' examples/logix-react/src/playground/scenarioMappability.ts
```

Expected: no output and exit code 1.

- [x] **Step 10: Run authority sweep for package export leakage**

Run:

```bash
rtk rg -n 'scenarioMappability|VerificationScenarioCorpus|ScenarioVerificationFixture' packages/logix-playground/src packages/logix-playground/package.json packages/logix-cli/src packages/logix-cli/src/schema/commands.v1.json
```

Expected: no output and exit code 1.

- [x] **Step 11: Run document whitespace checks**

Run:

```bash
rtk git diff --check -- docs/next/logix-api-planning/scenario-playground-alignment-proposal.md docs/next/logix-api-planning/run-state.md docs/superpowers/plans/2026-05-07-scenario-playground-alignment-implementation.md
```

Expected: PASS.

- [x] **Step 12: Final checkpoint diff before run-state close**

Run:

```bash
rtk git diff -- examples/logix/src/verification/scenario-corpus.ts examples/logix/src/verification/index.ts examples/logix/src/verification/README.md examples/logix-react/src/playground/scenarioMappability.ts examples/logix-react/test/playground-registry.contract.test.ts examples/logix-react/test/playground-scenario-mappability.guard.test.ts packages/logix-playground/test/public-surface.contract.test.ts packages/logix-cli/test/Integration/trial.command.test.ts packages/logix-cli/src/internal/commands/trial.ts packages/logix-cli/src/internal/result.ts docs/next/logix-api-planning/scenario-playground-alignment-proposal.md docs/next/logix-api-planning/run-state.md docs/superpowers/plans/2026-05-07-scenario-playground-alignment-implementation.md
```

Expected: all changes are within this plan's file set.

- [x] **Step 13: Update run-state only after all checks pass**

Modify `docs/next/logix-api-planning/run-state.md` with the values from Step 2.

- [x] **Step 14: Re-run final checkpoint diff**

Run:

```bash
rtk git diff -- examples/logix/src/verification/scenario-corpus.ts examples/logix/src/verification/index.ts examples/logix/src/verification/README.md examples/logix-react/src/playground/scenarioMappability.ts examples/logix-react/test/playground-registry.contract.test.ts examples/logix-react/test/playground-scenario-mappability.guard.test.ts packages/logix-playground/test/public-surface.contract.test.ts packages/logix-cli/test/Integration/trial.command.test.ts packages/logix-cli/src/internal/commands/trial.ts packages/logix-cli/src/internal/result.ts docs/next/logix-api-planning/scenario-playground-alignment-proposal.md docs/next/logix-api-planning/run-state.md docs/superpowers/plans/2026-05-07-scenario-playground-alignment-implementation.md
```

Expected: same file set plus the final run-state writeback. Do not stage or commit unless the user explicitly asks.

## Stop Gates

Stop and ask for a new authority decision if any implementation step seems to require:

- changing `Runtime.trial` public options
- changing CLI `trial --mode scenario` from structured failure to success
- importing Playground types into `packages/logix-core/src/**`
- exporting mappability from `@logixjs/playground`
- creating a provenance snapshot
- adding a projection bridge
- adding a new scenario fixture grammar or report object

## Success Criteria

- `examples/logix/src/verification/scenario-corpus.ts` exists and uses only `fixtures/env + steps + expect`.
- `examples/logix-react/src/playground/scenarioMappability.ts` exists and is non-executable.
- local-counter Playground scenario maps to `local-counter-increment-state-change`.
- core and CLI source do not import Playground types.
- CLI scenario mode still returns structured failure through `errorReport`, with no `trialReport`, no startup-mode report and no Playground/mappability vocabulary.
- Playground package public surface does not export scenario mappability or verification corpus nouns.
- Proposal and run-state point to the implementation plan without claiming Wave 3/4 implementation.
