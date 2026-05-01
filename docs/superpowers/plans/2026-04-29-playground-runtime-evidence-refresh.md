# Playground Runtime Evidence Refresh Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available and explicitly authorized for this repo) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Playground Actions, Drivers, Raw Dispatch, Run, Check, Trial, Trace and Workbench Projection consume one runtime-backed evidence refresh pipeline with no product-path source-regex action authority.

**Architecture:** Add a Playground-internal `PlaygroundRuntimeEvidenceEnvelope` and route `reflect`, `run`, `dispatch`, `check`, and `trialStartup` through it. Runtime reflection and operation events come from `@logixjs/core/repo-internal/reflection-api`; Playground keeps only host view state, product metadata and UI projections. Source regex action discovery is removed from product code and may remain only as negative test support if still needed.

**Tech Stack:** TypeScript, React 19, Effect V4, Vitest, React Testing Library, `@logixjs/core/repo-internal/reflection-api`, `@logixjs/sandbox`, pnpm

---

## Bound Inputs

- Proposal: `docs/review-plan/proposals/2026-04-29-playground-runtime-evidence-refresh.md`
- Review ledger: `docs/review-plan/runs/2026-04-29-playground-runtime-reflection-gap.md`
- Product SSoT: `docs/ssot/runtime/17-playground-product-workbench.md`
- Runtime reflection spec: `specs/167-runtime-reflection-manifest/spec.md`
- 167 contracts: `specs/167-runtime-reflection-manifest/contracts/README.md`
- Existing implementation area: `packages/logix-playground/src/**`
- Current user decision: terminal implementation, no compatibility fallback, no staged source-regex product path.

## Non-Goals

- Do not add public `@logixjs/core` APIs.
- Do not add public `@logixjs/playground/internal` exports.
- Do not keep source regex as a usable action fallback.
- Do not create a Playground-owned manifest schema parallel to 167.
- Do not promote Driver, Scenario or product debug batches into runtime authority.
- Do not implement replay, host deep verification or new Devtools surfaces.
- Do not use watch-mode test commands.
- Do not run `git add`, `git commit`, `git reset`, `git restore`, `git checkout`, `git clean`, or `git stash` unless the user explicitly asks.

## File Structure

- Create `packages/logix-playground/src/internal/runner/runtimeEvidence.ts`
  - Owns `PlaygroundRuntimeEvidenceEnvelope`, `PlaygroundRuntimeOperationKind`, source/artifact ref helpers, event helpers and envelope constructors.
  - Keeps evidence DTOs internal to Playground.
- Create `packages/logix-playground/src/internal/runner/runtimeReflectionWrapper.ts`
  - Generates sandbox source that imports `@logixjs/core/repo-internal/reflection-api` and returns `RuntimeReflectionManifest`.
  - Replaces minimum-only action wrapper as the main reflection wrapper.
- Modify `packages/logix-playground/src/internal/runner/actionManifestWrapper.ts`
  - Keep only as a projection helper if still useful; runtime reflection wrapper becomes the normal reflection source.
- Modify `packages/logix-playground/src/internal/runner/projectSnapshotRuntimeInvoker.ts`
  - Rename or narrow internally toward `ProjectSnapshotRuntimeEvidenceInvoker`.
  - Add `reflect`.
  - Return `PlaygroundRuntimeEvidenceEnvelope` for every operation.
- Modify `packages/logix-playground/src/internal/runner/programSessionRunner.ts`
  - Return current operation runtime events or trace refs derived from operation events.
  - Preserve current replay log bounding.
- Modify `packages/logix-playground/src/internal/runner/programSessionRunnerContext.tsx`
  - Update override type to the evidence invoker.
- Modify `packages/logix-playground/src/internal/action/actionManifest.ts`
  - Remove regex-derived product authority.
  - Project action panel view model only from runtime reflection/minimum manifest.
  - Add unavailable view model for missing reflection.
- Modify `packages/logix-playground/src/internal/state/workbenchTypes.ts`
  - Add `RuntimeEvidenceState` for latest reflection/run/dispatch/check/trial envelopes.
- Modify `packages/logix-playground/src/internal/state/workbenchProgram.ts`
  - Add reducer actions to store evidence envelopes and reset them on workspace restart.
- Modify `packages/logix-playground/src/internal/session/programSession.ts`
  - Treat traces as runtime operation event-derived view refs.
  - Keep `ProgramSessionState` as host view cache.
- Modify `packages/logix-playground/src/internal/components/PlaygroundShell.tsx`
  - Trigger runtime reflection refresh from current snapshot.
  - Replace `deriveActionManifestFromSnapshot(snapshot)` with evidence-backed action view model.
  - Feed envelopes into run/check/trial/session/projection flows.
- Modify `packages/logix-playground/src/internal/components/ActionManifestPanel.tsx`
  - Render unavailable state when manifest is missing.
  - Keep buttons disabled unless manifest-backed action exists.
- Modify `packages/logix-playground/src/internal/components/DriverPanel.tsx`
  - Disable or mark Driver entries whose action tag is absent from the manifest.
- Modify `packages/logix-playground/src/internal/components/RawDispatchPanel.tsx`
  - Validate `_tag` against manifest-backed action tags only.
- Modify `packages/logix-playground/src/internal/components/WorkbenchBottomPanel.tsx`
  - Render runtime operation events and evidence gaps in Trace.
- Modify `packages/logix-playground/src/internal/summary/workbenchProjection.ts`
  - Consume `createWorkbenchReflectionBridgeBundle`.
  - Stop synthesizing product debug event batches as runtime operation truth.
- Modify tests under `packages/logix-playground/test/**`
  - Add evidence envelope runner contracts.
  - Update DOM contracts for manifest-backed Actions/Drivers/Raw Dispatch.
  - Add source-regex product path sweep.
- Modify `docs/ssot/runtime/17-playground-product-workbench.md`
  - Only if implementation reveals wording drift beyond the already updated regex authority rule.
- Modify `specs/167-runtime-reflection-manifest/spec.md` and contracts
  - Only if implementation extends `RuntimeOperationKind` with `reflect`.

## Chunk 1: Evidence Envelope And Reflection Runner

### Task 1: Add internal evidence envelope contract

**Files:**
- Create: `packages/logix-playground/src/internal/runner/runtimeEvidence.ts`
- Test: `packages/logix-playground/test/runtime-evidence-envelope.contract.test.ts`

- [ ] **Step 1: Write the failing envelope test**

Create `packages/logix-playground/test/runtime-evidence-envelope.contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  createRuntimeEvidenceEnvelope,
  snapshotSourceDigest,
} from '../src/internal/runner/runtimeEvidence.js'
import { createPlaygroundWorkspace } from '../src/internal/session/workspace.js'
import { createProjectSnapshot } from '../src/internal/snapshot/projectSnapshot.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'

describe('Playground runtime evidence envelope', () => {
  it('creates stable source digest and operation coordinate for a snapshot operation', () => {
    const snapshot = createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))
    const digest = snapshotSourceDigest(snapshot)
    const envelope = createRuntimeEvidenceEnvelope({
      snapshot,
      operationKind: 'reflect',
      opSeq: 1,
      sourceRefs: [{ kind: 'source', path: '/src/main.program.ts', digest }],
      operationEvents: [],
      evidenceGaps: [],
      artifactRefs: [],
    })

    expect(digest).toMatch(/^playground-source:/)
    expect(envelope).toMatchObject({
      sourceDigest: digest,
      sourceRevision: 0,
      operationKind: 'reflect',
      operationCoordinate: {
        instanceId: 'logix-react.local-counter:r0',
        txnSeq: 0,
        opSeq: 1,
      },
      sourceRefs: [{ kind: 'source', path: '/src/main.program.ts', digest }],
      artifactRefs: [],
      operationEvents: [],
      evidenceGaps: [],
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/runtime-evidence-envelope.contract.test.ts
```

Expected: FAIL because `runtimeEvidence.ts` does not exist.

- [ ] **Step 3: Implement minimal envelope helpers**

Create `packages/logix-playground/src/internal/runner/runtimeEvidence.ts`:

```ts
import type {
  MinimumProgramActionManifest,
  RuntimeOperationEvent,
  RuntimeReflectionManifest,
  RuntimeReflectionSourceRef,
} from '@logixjs/core/repo-internal/reflection-api'
import { digestText } from '@logixjs/core/repo-internal/workbench-api'
import type { VerificationControlPlaneReport } from '@logixjs/core/ControlPlane'
import type { ProjectSnapshot } from '../snapshot/projectSnapshot.js'
import type { BoundedLogEntry } from '../session/logs.js'
import type { ProgramSessionTraceRef } from '../session/programSession.js'

export type PlaygroundRuntimeOperationKind = 'reflect' | 'run' | 'dispatch' | 'check' | 'trialStartup'

export interface PlaygroundRuntimeOperationCoordinate {
  readonly instanceId: string
  readonly txnSeq: number
  readonly opSeq: number
}

export interface PlaygroundRuntimeArtifactRef {
  readonly outputKey: string
  readonly kind: string
  readonly digest: string
}

export interface ProjectSnapshotRuntimeOutput {
  readonly kind: 'runtimeOutput'
  readonly operation: 'run' | 'dispatch'
  readonly runId?: string
  readonly value?: unknown
  readonly state?: unknown
  readonly logs?: ReadonlyArray<BoundedLogEntry>
  readonly traces?: ReadonlyArray<ProgramSessionTraceRef>
}

export interface PlaygroundRuntimeEvidenceEnvelope {
  readonly kind: 'runtimeEvidence'
  readonly sourceDigest: string
  readonly sourceRevision: number
  readonly operationKind: PlaygroundRuntimeOperationKind
  readonly operationCoordinate: PlaygroundRuntimeOperationCoordinate
  readonly runtimeOutput?: ProjectSnapshotRuntimeOutput
  readonly controlPlaneReport?: VerificationControlPlaneReport
  readonly reflectionManifest?: RuntimeReflectionManifest
  readonly minimumActionManifest?: MinimumProgramActionManifest
  readonly operationEvents: ReadonlyArray<RuntimeOperationEvent>
  readonly sourceRefs: ReadonlyArray<RuntimeReflectionSourceRef>
  readonly artifactRefs: ReadonlyArray<PlaygroundRuntimeArtifactRef>
  readonly evidenceGaps: ReadonlyArray<RuntimeOperationEvent>
}

export const snapshotSourceDigest = (snapshot: ProjectSnapshot): string =>
  `playground-source:${digestText(JSON.stringify(
    Array.from(snapshot.files.values())
      .map((file) => [file.path, file.hash])
      .sort(([a], [b]) => String(a).localeCompare(String(b))),
  ))}`

export const sourceRefsForSnapshot = (snapshot: ProjectSnapshot): ReadonlyArray<RuntimeReflectionSourceRef> => {
  const digest = snapshotSourceDigest(snapshot)
  return Array.from(snapshot.files.values())
    .map((file) => ({ kind: 'source' as const, path: file.path, digest }))
    .sort((a, b) => a.path.localeCompare(b.path))
}

export const operationCoordinateForSnapshot = (
  snapshot: ProjectSnapshot,
  opSeq: number,
): PlaygroundRuntimeOperationCoordinate => ({
  instanceId: `${snapshot.projectId}:r${snapshot.revision}`,
  txnSeq: snapshot.revision,
  opSeq,
})

export const createRuntimeEvidenceEnvelope = (input: {
  readonly snapshot: ProjectSnapshot
  readonly operationKind: PlaygroundRuntimeOperationKind
  readonly opSeq: number
  readonly runtimeOutput?: ProjectSnapshotRuntimeOutput
  readonly controlPlaneReport?: VerificationControlPlaneReport
  readonly reflectionManifest?: RuntimeReflectionManifest
  readonly minimumActionManifest?: MinimumProgramActionManifest
  readonly operationEvents: ReadonlyArray<RuntimeOperationEvent>
  readonly sourceRefs?: ReadonlyArray<RuntimeReflectionSourceRef>
  readonly artifactRefs: ReadonlyArray<PlaygroundRuntimeArtifactRef>
  readonly evidenceGaps: ReadonlyArray<RuntimeOperationEvent>
}): PlaygroundRuntimeEvidenceEnvelope => ({
  kind: 'runtimeEvidence',
  sourceDigest: snapshotSourceDigest(input.snapshot),
  sourceRevision: input.snapshot.revision,
  operationKind: input.operationKind,
  operationCoordinate: operationCoordinateForSnapshot(input.snapshot, input.opSeq),
  ...(input.runtimeOutput ? { runtimeOutput: input.runtimeOutput } : {}),
  ...(input.controlPlaneReport ? { controlPlaneReport: input.controlPlaneReport } : {}),
  ...(input.reflectionManifest ? { reflectionManifest: input.reflectionManifest } : {}),
  ...(input.minimumActionManifest ? { minimumActionManifest: input.minimumActionManifest } : {}),
  operationEvents: input.operationEvents,
  sourceRefs: input.sourceRefs ?? sourceRefsForSnapshot(input.snapshot),
  artifactRefs: input.artifactRefs,
  evidenceGaps: input.evidenceGaps,
})
```

- [ ] **Step 4: Run envelope test**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/runtime-evidence-envelope.contract.test.ts
```

Expected: PASS.

### Task 2: Add runtime reflection wrapper

**Files:**
- Create: `packages/logix-playground/src/internal/runner/runtimeReflectionWrapper.ts`
- Test: `packages/logix-playground/test/runtime-reflection-wrapper.contract.test.ts`

- [ ] **Step 1: Write the failing wrapper test**

Create `packages/logix-playground/test/runtime-reflection-wrapper.contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createRuntimeReflectionWrapperSource } from '../src/internal/runner/runtimeReflectionWrapper.js'
import { createPlaygroundWorkspace } from '../src/internal/session/workspace.js'
import { createProjectSnapshot } from '../src/internal/snapshot/projectSnapshot.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'

describe('runtime reflection wrapper', () => {
  it('extracts the full runtime reflection manifest from the current Program snapshot', () => {
    const snapshot = createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))
    const source = createRuntimeReflectionWrapperSource(snapshot)

    expect(source).toContain('@logixjs/core/repo-internal/reflection-api')
    expect(source).toContain('extractRuntimeReflectionManifest(Program')
    expect(source).toContain('extractMinimumProgramActionManifest(Program')
    expect(source).toContain('programId: "logix-react.local-counter"')
    expect(source).toContain('revision: 0')
    expect(source).not.toContain('deriveFallbackActionManifestFromSnapshot')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/runtime-reflection-wrapper.contract.test.ts
```

Expected: FAIL because `runtimeReflectionWrapper.ts` does not exist.

- [ ] **Step 3: Implement runtime reflection wrapper**

Create `packages/logix-playground/src/internal/runner/runtimeReflectionWrapper.ts`:

```ts
import type { ProjectSnapshot } from '../snapshot/projectSnapshot.js'
import { snapshotFilesToModuleSource } from './programWrapper.js'
import { sourceRefsForSnapshot } from './runtimeEvidence.js'

export const createRuntimeReflectionWrapperSource = (snapshot: ProjectSnapshot): string => {
  if (!snapshot.programEntry) {
    throw new Error(`Project ${snapshot.projectId} has no Program entry`)
  }

  const moduleSource = snapshotFilesToModuleSource(snapshot)
  const sourceRefs = sourceRefsForSnapshot(snapshot)

  return [
    'import { Effect as __LogixPlaygroundEffect } from "effect"',
    'import * as __LogixPlaygroundReflection from "@logixjs/core/repo-internal/reflection-api"',
    'import * as __LogixPlaygroundLogix from "@logixjs/core"',
    '',
    moduleSource,
    '',
    'export default __LogixPlaygroundEffect.sync(() => {',
    '  void __LogixPlaygroundLogix',
    '  const reflectionManifest = __LogixPlaygroundReflection.extractRuntimeReflectionManifest(Program, {',
    `    programId: ${JSON.stringify(snapshot.projectId)},`,
    `    sourceRefs: ${JSON.stringify(sourceRefs)},`,
    '  })',
    '  const minimumActionManifest = __LogixPlaygroundReflection.extractMinimumProgramActionManifest(Program, {',
    `    programId: ${JSON.stringify(snapshot.projectId)},`,
    `    revision: ${snapshot.revision},`,
    '  })',
    '  return { reflectionManifest, minimumActionManifest }',
    '})',
    '',
  ].join('\n')
}
```

- [ ] **Step 4: Run wrapper test**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/runtime-reflection-wrapper.contract.test.ts
```

Expected: PASS.

### Task 3: Convert runtime invoker to evidence envelopes

**Files:**
- Modify: `packages/logix-playground/src/internal/runner/projectSnapshotRuntimeInvoker.ts`
- Modify: `packages/logix-playground/src/internal/runner/programSessionRunnerContext.tsx`
- Test: `packages/logix-playground/test/project-snapshot-runtime-evidence.contract.test.ts`
- Test: `packages/logix-playground/test/program-run-runtime.contract.test.ts`

- [ ] **Step 1: Write failing invoker evidence test**

Create `packages/logix-playground/test/project-snapshot-runtime-evidence.contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createProjectSnapshotRuntimeInvoker } from '../src/internal/runner/projectSnapshotRuntimeInvoker.js'
import type { InternalSandboxTransport } from '../src/internal/runner/sandboxRunner.js'
import { createPlaygroundWorkspace } from '../src/internal/session/workspace.js'
import { createProjectSnapshot } from '../src/internal/snapshot/projectSnapshot.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'
import { makeControlPlaneReport } from './support/controlPlaneFixtures.js'

describe('ProjectSnapshot runtime evidence invoker', () => {
  it('returns reflection, run, check and trial envelopes sharing the same source digest', async () => {
    const transport: InternalSandboxTransport = {
      init: async () => undefined,
      compile: async () => ({ success: true }),
      run: async ({ runId }) => {
        if (String(runId).includes('reflect')) {
          return {
            stateSnapshot: {
              reflectionManifest: {
                manifestVersion: 'runtime-reflection-manifest@167B',
                programId: 'logix-react.local-counter',
                rootModuleId: 'FixtureCounter',
                rootModule: { moduleId: 'FixtureCounter', digest: 'module:1', actions: [] },
                modules: [],
                actions: [{ actionTag: 'increment', payload: { kind: 'void', validatorAvailable: false }, authority: 'runtime-reflection' }],
                logicUnits: [],
                effects: [],
                processes: [],
                imports: [],
                services: [],
                capabilities: { run: 'available', check: 'available', trial: 'available' },
                sourceRefs: [],
                budget: { truncated: false, originalActionCount: 1 },
                digest: 'runtime-manifest:fixture',
              },
              minimumActionManifest: {
                manifestVersion: 'program-action-manifest@167A',
                programId: 'logix-react.local-counter',
                moduleId: 'FixtureCounter',
                revision: 0,
                digest: 'module:1',
                actions: [{ actionTag: 'increment', payload: { kind: 'void' }, authority: 'runtime-reflection' }],
              },
            },
          }
        }
        if (String(runId).includes('check')) return { stateSnapshot: makeControlPlaneReport('check', 'static') }
        return { stateSnapshot: { count: 1, runId } }
      },
      trial: async () => ({ stateSnapshot: makeControlPlaneReport('trial', 'startup') }),
    }
    const invoker = createProjectSnapshotRuntimeInvoker({ transport })
    const snapshot = createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))

    const reflection = await invoker.reflect(snapshot, 1)
    const run = await invoker.run(snapshot, 2)
    const check = await invoker.check(snapshot, 3)
    const trial = await invoker.trialStartup(snapshot, 4)

    expect(reflection.kind).toBe('runtimeEvidence')
    expect(reflection.operationKind).toBe('reflect')
    expect(reflection.reflectionManifest?.digest).toBe('runtime-manifest:fixture')
    expect(reflection.minimumActionManifest?.actions.map((action) => action.actionTag)).toEqual(['increment'])
    expect(run.sourceDigest).toBe(reflection.sourceDigest)
    expect(check.sourceDigest).toBe(reflection.sourceDigest)
    expect(trial.sourceDigest).toBe(reflection.sourceDigest)
    expect(run.runtimeOutput?.operation).toBe('run')
    expect(check.controlPlaneReport?.summary.status).toBe('passed')
    expect(trial.controlPlaneReport?.summary.mode).toBe('startup')
    expect(run.operationEvents.map((event) => event.name)).toEqual(['operation.accepted', 'operation.completed'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/project-snapshot-runtime-evidence.contract.test.ts
```

Expected: FAIL because `reflect` and envelope output do not exist.

- [ ] **Step 3: Update invoker types**

In `packages/logix-playground/src/internal/runner/projectSnapshotRuntimeInvoker.ts`:

- Import from `runtimeEvidence.ts`.
- Keep the exported name `ProjectSnapshotRuntimeInvoker` if changing it would cause large churn, but change its methods to return `Promise<PlaygroundRuntimeEvidenceEnvelope>`.
- Add `reflect`.
- Keep `ProjectSnapshotTransportFailure` only as an internal conversion detail if needed.

Use this shape:

```ts
export interface ProjectSnapshotRuntimeInvoker {
  readonly reflect: (snapshot: ProjectSnapshot, seq?: number) => Promise<PlaygroundRuntimeEvidenceEnvelope>
  readonly run: (snapshot: ProjectSnapshot, seq?: number) => Promise<PlaygroundRuntimeEvidenceEnvelope>
  readonly dispatch: (input: ProgramSessionDispatchInput) => Promise<PlaygroundRuntimeEvidenceEnvelope>
  readonly check: (snapshot: ProjectSnapshot, seq?: number) => Promise<PlaygroundRuntimeEvidenceEnvelope>
  readonly trialStartup: (snapshot: ProjectSnapshot, seq?: number) => Promise<PlaygroundRuntimeEvidenceEnvelope>
}
```

- [ ] **Step 4: Add operation event helpers**

Still in `projectSnapshotRuntimeInvoker.ts`, add local helpers:

```ts
import {
  createOperationAcceptedEvent,
  createOperationCompletedEvent,
  createOperationFailedEvent,
  createRuntimeOperationEvidenceGap,
  type RuntimeOperationKind,
} from '@logixjs/core/repo-internal/reflection-api'
```

Map Playground operation kinds:

```ts
const runtimeOperationKindOf = (
  operation: PlaygroundRuntimeOperationKind,
): RuntimeOperationKind | undefined => {
  if (operation === 'trialStartup') return 'trial'
  if (operation === 'reflect') return undefined
  return operation
}
```

If `operation === 'reflect'`, create `evidence.gap` only when reflection fails, or use events without `operationKind`. Do not extend 167 in this task unless TypeScript requires it.

- [ ] **Step 5: Implement `reflect`**

Use `createRuntimeReflectionWrapperSource(snapshot)` and `transport.run({ runId })`. Normalize result:

```ts
const reflection = result.stateSnapshot as {
  readonly reflectionManifest?: RuntimeReflectionManifest
  readonly minimumActionManifest?: MinimumProgramActionManifest
}
```

Envelope rules:

- success includes `reflectionManifest`, `minimumActionManifest`, artifact refs for both digests, accepted/completed events.
- compile or runtime failure includes failed event plus evidence gap event with code `runtime-reflection-unavailable`.
- no source regex fallback.

- [ ] **Step 6: Wrap run/check/trial/dispatch in envelopes**

For each operation:

- create accepted event before running.
- create completed event on success.
- create failed event and evidence gap on failure.
- preserve existing `runtimeOutput` and `controlPlaneReport` payloads.
- attach source refs from `sourceRefsForSnapshot(snapshot)`.
- attach artifact refs for reflection manifest only when available in that operation output.

- [ ] **Step 7: Run focused invoker tests**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/project-snapshot-runtime-evidence.contract.test.ts test/program-run-runtime.contract.test.ts
```

Expected: PASS after updating old assertions in `program-run-runtime.contract.test.ts` from top-level `kind: 'runtimeOutput'` to `kind: 'runtimeEvidence'` with nested `runtimeOutput`.

### Task 4: Update Program session runner to expose event-derived traces

**Files:**
- Modify: `packages/logix-playground/src/internal/runner/programSessionRunner.ts`
- Modify: `packages/logix-playground/src/internal/session/programSession.ts`
- Test: `packages/logix-playground/test/program-session-runner.contract.test.ts`
- Test: `packages/logix-playground/test/program-session-state.contract.test.ts`

- [ ] **Step 1: Extend runner test for traces**

In `packages/logix-playground/test/program-session-runner.contract.test.ts`, extend the existing replay test:

```ts
expect(result.traces).toEqual([
  {
    traceId: 'logix-react.local-counter:r0:s1::t0::o2::operation.accepted',
    label: 'operation.accepted dispatch increment',
  },
  {
    traceId: 'logix-react.local-counter:r0:s1::t0::o2::operation.completed',
    label: 'operation.completed dispatch increment',
  },
])
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/program-session-runner.contract.test.ts
```

Expected: FAIL because `traces` is still `[]`.

- [ ] **Step 3: Implement event-derived trace refs**

In `programSessionRunner.ts`, import event helpers and build trace refs for the current operation only:

```ts
import {
  createOperationAcceptedEvent,
  createOperationCompletedEvent,
} from '@logixjs/core/repo-internal/reflection-api'
```

Add:

```ts
const currentActionTag = (input: ProgramSessionDispatchInput): string | undefined =>
  input.actions[input.actions.length - 1]?._tag

const currentOperationTraces = (input: ProgramSessionDispatchInput): ReadonlyArray<ProgramSessionTraceRef> => {
  const actionTag = currentActionTag(input)
  const base = {
    instanceId: input.sessionId,
    txnSeq: 0,
    opSeq: input.operationSeq,
    operationKind: 'dispatch' as const,
    ...(actionTag ? { actionTag } : {}),
  }
  return [createOperationAcceptedEvent(base), createOperationCompletedEvent(base)].map((event) => ({
    traceId: event.eventId,
    label: `${event.name}${event.actionTag ? ` dispatch ${event.actionTag}` : ''}`,
  }))
}
```

Return `traces: currentOperationTraces(input)`.

- [ ] **Step 4: Run session tests**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/program-session-runner.contract.test.ts test/program-session-state.contract.test.ts
```

Expected: PASS.

## Chunk 2: Action Authority And UI Consumption

### Task 5: Remove product-path source regex action authority

**Files:**
- Modify: `packages/logix-playground/src/internal/action/actionManifest.ts`
- Modify: `packages/logix-playground/src/internal/components/ActionManifestPanel.tsx`
- Test: `packages/logix-playground/test/action-manifest.contract.test.ts`
- Test: `packages/logix-playground/src/internal/components/ActionManifestPanel.test.tsx`

- [ ] **Step 1: Rewrite action manifest tests for unavailable state**

In `packages/logix-playground/test/action-manifest.contract.test.ts`, replace regex fallback expectations with:

```ts
import { describe, expect, it } from 'vitest'
import {
  projectActionManifestFromRuntimeEvidence,
  unavailableActionManifest,
} from '../src/internal/action/actionManifest.js'
import { createRuntimeEvidenceEnvelope } from '../src/internal/runner/runtimeEvidence.js'
import { createPlaygroundWorkspace } from '../src/internal/session/workspace.js'
import { createProjectSnapshot } from '../src/internal/snapshot/projectSnapshot.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'

describe('Action manifest view model', () => {
  it('projects actions only from runtime-backed evidence', () => {
    const snapshot = createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))
    const evidence = createRuntimeEvidenceEnvelope({
      snapshot,
      operationKind: 'reflect',
      opSeq: 1,
      minimumActionManifest: {
        manifestVersion: 'program-action-manifest@167A',
        programId: snapshot.projectId,
        moduleId: 'FixtureCounter',
        revision: snapshot.revision,
        digest: 'manifest:counter',
        actions: [{ actionTag: 'increment', payload: { kind: 'void' }, authority: 'runtime-reflection' }],
      },
      operationEvents: [],
      artifactRefs: [],
      evidenceGaps: [],
    })

    expect(projectActionManifestFromRuntimeEvidence(snapshot, evidence)).toMatchObject({
      authorityStatus: 'runtime-reflection',
      manifestDigest: 'manifest:counter',
      actions: [{ actionTag: 'increment', payloadKind: 'void', authority: 'runtime-reflection' }],
      evidenceGaps: [],
    })
  })

  it('does not derive runnable actions from source when evidence is missing', () => {
    const snapshot = createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))
    const manifest = unavailableActionManifest(snapshot, 'Runtime reflection manifest is unavailable.')

    expect(manifest.authorityStatus).toBe('unavailable')
    expect(manifest.actions).toEqual([])
    expect(manifest.evidenceGaps[0]).toMatchObject({
      kind: 'missing-action-manifest',
      source: 'runtime-reflection',
    })
  })
})
```

- [ ] **Step 2: Run action manifest tests**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/action-manifest.contract.test.ts src/internal/components/ActionManifestPanel.test.tsx
```

Expected: FAIL because old regex API is still present and component may still expect `fallback-source-regex`.

- [ ] **Step 3: Replace action manifest implementation**

In `actionManifest.ts`:

- Remove `ProjectSnapshot` source parsing imports.
- Remove regex patterns.
- Remove `deriveFallbackActionManifestFromSnapshot`.
- Remove `deriveActionManifestFromSnapshot`.
- Change `ActionPanelAuthority` to:

```ts
export type ActionPanelAuthority = 'manifest' | 'runtime-reflection'
```

- Change evidence gap source to:

```ts
readonly source: 'runtime-reflection'
```

- Add:

```ts
export const unavailableActionManifest = (
  snapshot: Pick<ProjectSnapshot, 'projectId' | 'revision'>,
  message = 'Runtime reflection manifest is unavailable.',
): ActionPanelViewModel => ({
  projectId: snapshot.projectId,
  revision: snapshot.revision,
  authorityStatus: 'unavailable',
  evidenceGaps: [{ kind: 'missing-action-manifest', source: 'runtime-reflection', message }],
  actions: [],
})
```

- Add:

```ts
export const projectActionManifestFromRuntimeEvidence = (
  snapshot: Pick<ProjectSnapshot, 'projectId' | 'revision'>,
  evidence: PlaygroundRuntimeEvidenceEnvelope | undefined,
): ActionPanelViewModel => {
  if (!evidence?.minimumActionManifest) return unavailableActionManifest(snapshot)
  return projectReflectedActionManifest({ projectId: snapshot.projectId, manifest: evidence.minimumActionManifest })
}
```

- [ ] **Step 4: Update ActionManifestPanel unavailable rendering**

In `ActionManifestPanel.tsx`, when `manifest.authorityStatus === 'unavailable'`:

- Render a visible compact unavailable state in the actions list.
- Keep dispatch buttons absent.
- Keep evidence gap text discoverable by tests.

Use:

```tsx
{manifest.authorityStatus === 'unavailable' ? (
  <div role="status" className="p-3 text-sm text-gray-500">
    Runtime reflection manifest unavailable.
  </div>
) : filteredActions.length === 0 ? (
  <p className="p-3 text-sm text-gray-500">No reflected actions.</p>
) : (
  ...
)}
```

- [ ] **Step 5: Run action manifest tests**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/action-manifest.contract.test.ts src/internal/components/ActionManifestPanel.test.tsx
```

Expected: PASS.

### Task 6: Store latest evidence envelopes in workbench state

**Files:**
- Modify: `packages/logix-playground/src/internal/state/workbenchTypes.ts`
- Modify: `packages/logix-playground/src/internal/state/workbenchProgram.ts`
- Test: `packages/logix-playground/test/workbench-state.contract.test.ts`

- [ ] **Step 1: Add failing workbench evidence state test**

Append to `packages/logix-playground/test/workbench-state.contract.test.ts`:

```ts
it('stores runtime evidence envelopes by operation lane', async () => {
  const state = await readWorkbenchState(
    Effect.gen(function* () {
      const workbench = yield* Effect.service(PlaygroundWorkbench.tag).pipe(Effect.orDie)
      yield* workbench.dispatch({
        _tag: 'recordRuntimeEvidence',
        payload: {
          lane: 'reflect',
          evidence: {
            kind: 'runtimeEvidence',
            sourceDigest: 'playground-source:1',
            sourceRevision: 0,
            operationKind: 'reflect',
            operationCoordinate: { instanceId: 'p:r0', txnSeq: 0, opSeq: 1 },
            operationEvents: [],
            sourceRefs: [],
            artifactRefs: [],
            evidenceGaps: [],
          },
        },
      })
    }),
  )

  expect(state.runtimeEvidence.reflect?.sourceDigest).toBe('playground-source:1')
})
```

- [ ] **Step 2: Run workbench state test**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/workbench-state.contract.test.ts
```

Expected: FAIL because `runtimeEvidence` state is missing.

- [ ] **Step 3: Add runtime evidence state type**

In `workbenchTypes.ts`:

```ts
import type { PlaygroundRuntimeEvidenceEnvelope, PlaygroundRuntimeOperationKind } from '../runner/runtimeEvidence.js'

export interface RuntimeEvidenceState {
  readonly reflect?: PlaygroundRuntimeEvidenceEnvelope
  readonly run?: PlaygroundRuntimeEvidenceEnvelope
  readonly dispatch?: PlaygroundRuntimeEvidenceEnvelope
  readonly check?: PlaygroundRuntimeEvidenceEnvelope
  readonly trialStartup?: PlaygroundRuntimeEvidenceEnvelope
}

export type RuntimeEvidenceLane = PlaygroundRuntimeOperationKind
```

- [ ] **Step 4: Add reducer state and action**

In `workbenchProgram.ts`:

- Add `runtimeEvidence` to schema as `Schema.Unknown as Schema.Schema<RuntimeEvidenceState>`.
- Add initial value `{}`.
- Add action:

```ts
| {
    readonly _tag: 'recordRuntimeEvidence'
    readonly payload: {
      readonly lane: RuntimeEvidenceLane
      readonly evidence: PlaygroundRuntimeEvidenceEnvelope
    }
  }
```

- Add reducer:

```ts
recordRuntimeEvidence: (state, action, sink) => {
  sink?.('runtimeEvidence')
  return {
    ...state,
    runtimeEvidence: {
      ...state.runtimeEvidence,
      [action.payload.lane]: action.payload.evidence,
    },
  }
},
```

- Reset `runtimeEvidence` in `workspaceRestartedSession`.

- [ ] **Step 5: Run workbench state test**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/workbench-state.contract.test.ts
```

Expected: PASS.

### Task 7: Wire reflection evidence into PlaygroundShell

**Files:**
- Modify: `packages/logix-playground/src/internal/components/PlaygroundShell.tsx`
- Modify: `packages/logix-playground/src/internal/runner/programSessionRunnerContext.tsx`
- Test: `packages/logix-playground/test/action-panel-dispatch.contract.test.tsx`
- Test: `packages/logix-playground/test/runtime-reflection-ui.contract.test.tsx`

- [ ] **Step 1: Add failing runtime reflection UI test**

Create `packages/logix-playground/test/runtime-reflection-ui.contract.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PlaygroundPage } from '../src/Playground.js'
import type { ProjectSnapshotRuntimeInvoker } from '../src/internal/runner/projectSnapshotRuntimeInvoker.js'
import type { ProgramSessionRunner } from '../src/internal/runner/programSessionRunner.js'
import { createRuntimeEvidenceEnvelope } from '../src/internal/runner/runtimeEvidence.js'
import { ProgramSessionRunnerProvider } from '../src/internal/runner/programSessionRunnerContext.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'

describe('runtime reflection UI', () => {
  beforeEach(() => {
    window.__LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__ = true
  })

  afterEach(() => {
    delete window.__LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__
  })

  it('renders action buttons from runtime reflection evidence', async () => {
    const runner: ProgramSessionRunner = {
      dispatch: async () => ({ state: { count: 1 }, logs: [], traces: [] }),
    }
    const runtimeInvoker: ProjectSnapshotRuntimeInvoker = {
      reflect: async (snapshot) => createRuntimeEvidenceEnvelope({
        snapshot,
        operationKind: 'reflect',
        opSeq: 1,
        minimumActionManifest: {
          manifestVersion: 'program-action-manifest@167A',
          programId: snapshot.projectId,
          moduleId: 'FixtureCounter',
          revision: snapshot.revision,
          digest: 'manifest:counter',
          actions: [{ actionTag: 'increment', payload: { kind: 'void' }, authority: 'runtime-reflection' }],
        },
        operationEvents: [],
        artifactRefs: [],
        evidenceGaps: [],
      }),
      run: async (snapshot) => createRuntimeEvidenceEnvelope({ snapshot, operationKind: 'run', opSeq: 2, operationEvents: [], artifactRefs: [], evidenceGaps: [] }),
      dispatch: async (input) => createRuntimeEvidenceEnvelope({ snapshot: input.snapshot, operationKind: 'dispatch', opSeq: input.operationSeq, operationEvents: [], artifactRefs: [], evidenceGaps: [] }),
      check: async (snapshot) => createRuntimeEvidenceEnvelope({ snapshot, operationKind: 'check', opSeq: 3, operationEvents: [], artifactRefs: [], evidenceGaps: [] }),
      trialStartup: async (snapshot) => createRuntimeEvidenceEnvelope({ snapshot, operationKind: 'trialStartup', opSeq: 4, operationEvents: [], artifactRefs: [], evidenceGaps: [] }),
    }

    render(
      <ProgramSessionRunnerProvider runner={runner} runtimeInvoker={runtimeInvoker}>
        <PlaygroundPage registry={[localCounterProjectFixture]} projectId="logix-react.local-counter" />
      </ProgramSessionRunnerProvider>,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Dispatch increment' })).toBeTruthy()
    })
    expect(screen.getByRole('region', { name: 'Runtime inspector' }).textContent).not.toContain('fallback-source-regex')
    expect(screen.getByRole('region', { name: 'Workbench bottom console' }).textContent).not.toContain('playground-missing-action-manifest')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/runtime-reflection-ui.contract.test.tsx
```

Expected: FAIL because `PlaygroundShell` still calls `deriveActionManifestFromSnapshot`.

- [ ] **Step 3: Wire reflection refresh effect**

In `PlaygroundShell.tsx`:

- Remove import of `deriveActionManifestFromSnapshot`.
- Import `projectActionManifestFromRuntimeEvidence` and `unavailableActionManifest`.
- Select `runtimeEvidence` from workbench.
- Build action manifest from `runtimeEvidence.reflect`.
- Add a `React.useEffect` keyed by `snapshot.projectId`, `snapshot.revision`, and `snapshot.programEntry?.entry`.

Effect skeleton:

```tsx
React.useEffect(() => {
  if (!snapshot.programEntry) return
  let cancelled = false
  void runtimeInvoker.reflect(snapshot, 1).then(
    (evidence) => {
      if (cancelled) return
      dispatchWorkbench({ _tag: 'recordRuntimeEvidence', payload: { lane: 'reflect', evidence } })
    },
    (error: unknown) => {
      if (cancelled) return
      console.error(error)
    },
  )
  return () => {
    cancelled = true
  }
}, [dispatchWorkbench, runtimeInvoker, snapshot])
```

Do not dispatch regex fallback on error. The view model should remain `unavailableActionManifest(snapshot, message)`.

- [ ] **Step 4: Record operation evidence from run/check/trial**

In `runProgram`, `checkProgram`, and `trialStartup`, after receiving an envelope:

```tsx
dispatchWorkbench({ _tag: 'recordRuntimeEvidence', payload: { lane: result.operationKind, evidence: result } })
```

Then read nested `result.runtimeOutput` or `result.controlPlaneReport`.

- [ ] **Step 5: Update default session runner adapter**

The default session runner currently expects `runtimeInvoker.dispatch` to return `runtimeOutput`. Update it to read:

```ts
if (result.runtimeOutput?.operation === 'dispatch') {
  return {
    state: result.runtimeOutput.state,
    logs: result.runtimeOutput.logs ?? [],
    traces: result.runtimeOutput.traces ?? [],
  }
}
```

Throw the first failed event or evidence gap message when dispatch output is absent.

- [ ] **Step 6: Run UI tests**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/runtime-reflection-ui.contract.test.tsx test/action-panel-dispatch.contract.test.tsx
```

Expected: PASS.

### Task 8: Enforce manifest action tags for Drivers and Raw Dispatch

**Files:**
- Modify: `packages/logix-playground/src/internal/components/DriverPanel.tsx`
- Modify: `packages/logix-playground/src/internal/components/RuntimeInspector.tsx`
- Modify: `packages/logix-playground/src/internal/components/RawDispatchPanel.tsx`
- Modify: `packages/logix-playground/src/internal/components/PlaygroundShell.tsx`
- Test: `packages/logix-playground/test/raw-dispatch-advanced.contract.test.tsx`
- Test: `packages/logix-playground/test/driver-action-equivalence.contract.test.tsx`

- [ ] **Step 1: Add failing driver/action equivalence test**

Create `packages/logix-playground/test/driver-action-equivalence.contract.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PlaygroundPage } from '../src/Playground.js'
import type { ProgramSessionRunner } from '../src/internal/runner/programSessionRunner.js'
import { ProgramSessionRunnerProvider } from '../src/internal/runner/programSessionRunnerContext.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'

describe('Driver and Action authority equivalence', () => {
  beforeEach(() => {
    window.__LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__ = true
  })

  afterEach(() => {
    delete window.__LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__
  })

  it('Driver Increase and Action increment dispatch the same manifest action tag', async () => {
    const dispatched: Array<string> = []
    const runner: ProgramSessionRunner = {
      dispatch: async (input) => {
        dispatched.push(input.actions[input.actions.length - 1]?._tag ?? 'missing')
        return { state: { count: dispatched.length }, logs: [], traces: [] }
      },
    }

    render(
      <ProgramSessionRunnerProvider runner={runner}>
        <PlaygroundPage registry={[localCounterProjectFixture]} projectId="logix-react.local-counter" />
      </ProgramSessionRunnerProvider>,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Dispatch increment' })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Dispatch increment' }))

    const runtimeInspector = screen.getByRole('region', { name: 'Runtime inspector' })
    fireEvent.click(within(runtimeInspector).getByRole('button', { name: 'Drivers' }))
    await waitFor(() => {
      expect(within(runtimeInspector).getByRole('button', { name: 'Run driver Increase' })).toBeTruthy()
    })
    fireEvent.click(within(runtimeInspector).getByRole('button', { name: 'Run driver Increase' }))

    await waitFor(() => {
      expect(dispatched).toEqual(['increment', 'increment'])
    })
  })
})
```

- [ ] **Step 2: Run driver/raw tests**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/driver-action-equivalence.contract.test.tsx test/raw-dispatch-advanced.contract.test.tsx
```

Expected: one or both tests fail until Drivers and Raw Dispatch read manifest-backed availability.

- [ ] **Step 3: Add action-tag lookup**

In `PlaygroundShell.tsx`:

```ts
const manifestActionTags = React.useMemo(
  () => new Set(actionManifest.actions.map((action) => action.actionTag)),
  [actionManifest.actions],
)
```

Before `dispatchAction` runs, reject unknown tags:

```ts
if (!manifestActionTags.has(action._tag)) {
  callbacks?.onFailed?.({ kind: 'manifest', message: `Unknown action ${action._tag}.` })
  return
}
```

Keep Raw Dispatch component validation too. The shell guard protects Driver and Scenario paths.

- [ ] **Step 4: Disable unmatched Drivers**

Pass manifest action tags into `DriverPanel` through `RuntimeInspector`.

In `DriverPanel.tsx`, add:

```ts
readonly availableActionTags?: ReadonlySet<string>
```

Disable a driver when `availableActionTags` exists and does not contain `driver.actionTag`. Use a visible title or status:

```tsx
const unavailable = availableActionTags ? !availableActionTags.has(driver.actionTag) : false
disabled={disabled || unavailable}
title={unavailable ? 'Driver action is not present in the runtime reflection manifest.' : undefined}
```

- [ ] **Step 5: Keep Raw Dispatch validation manifest-only**

In `RawDispatchPanel.tsx`, ensure unknown `_tag` validation uses `manifest.actions` only. Remove any fallback-related status text.

- [ ] **Step 6: Run driver/raw tests**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/driver-action-equivalence.contract.test.tsx test/raw-dispatch-advanced.contract.test.tsx
```

Expected: PASS.

## Chunk 3: Projection, Trace And Diagnostics Evidence

### Task 9: Route workbench projection through reflection bridge bundle

**Files:**
- Modify: `packages/logix-playground/src/internal/summary/workbenchProjection.ts`
- Modify: `packages/logix-playground/src/internal/components/PlaygroundShell.tsx`
- Test: `packages/logix-playground/test/workbench-projection-runtime-evidence.contract.test.ts`
- Test: `packages/logix-playground/test/derived-summary.contract.test.ts`

- [ ] **Step 1: Add failing projection contract**

Create `packages/logix-playground/test/workbench-projection-runtime-evidence.contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildPlaygroundRuntimeWorkbenchAuthorityBundle } from '../src/internal/summary/workbenchProjection.js'
import { createRuntimeEvidenceEnvelope } from '../src/internal/runner/runtimeEvidence.js'
import { createPlaygroundWorkspace } from '../src/internal/session/workspace.js'
import { createProjectSnapshot } from '../src/internal/snapshot/projectSnapshot.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'

describe('Workbench projection runtime evidence', () => {
  it('uses reflection bridge bundle and does not synthesize product debug event truth', () => {
    const snapshot = createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))
    const reflectionEvidence = createRuntimeEvidenceEnvelope({
      snapshot,
      operationKind: 'reflect',
      opSeq: 1,
      minimumActionManifest: {
        manifestVersion: 'program-action-manifest@167A',
        programId: snapshot.projectId,
        moduleId: 'FixtureCounter',
        revision: snapshot.revision,
        digest: 'manifest:counter',
        actions: [{ actionTag: 'increment', payload: { kind: 'void' }, authority: 'runtime-reflection' }],
      },
      operationEvents: [],
      artifactRefs: [{ outputKey: 'reflectionManifest', kind: 'RuntimeReflectionManifest', digest: 'manifest:counter' }],
      evidenceGaps: [],
    })

    const bundle = buildPlaygroundRuntimeWorkbenchAuthorityBundle({
      snapshot,
      runtimeEvidence: { reflect: reflectionEvidence },
      driverExecution: { status: 'passed', driverId: 'increase' },
    })

    expect(bundle.truthInputs.some((input) => input.kind === 'artifact-ref')).toBe(true)
    expect(bundle.truthInputs.some((input) => input.kind === 'debug-event-batch' && input.batchId.startsWith('playground-product:'))).toBe(false)
    expect(JSON.stringify(bundle.truthInputs)).not.toContain('fallback-source-regex')
  })
})
```

- [ ] **Step 2: Run projection test**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/workbench-projection-runtime-evidence.contract.test.ts
```

Expected: FAIL because `runtimeEvidence` input does not exist and product debug batch is still synthesized.

- [ ] **Step 3: Update projection input**

In `workbenchProjection.ts`:

- Import:

```ts
import { createWorkbenchReflectionBridgeBundle } from '@logixjs/core/repo-internal/reflection-api'
import type { RuntimeEvidenceState } from '../state/workbenchTypes.js'
```

- Replace `actionManifest` input with:

```ts
readonly runtimeEvidence?: RuntimeEvidenceState
```

- Keep `driverExecution` and `scenarioExecution` as product metadata only.

- [ ] **Step 4: Remove product debug event batch truth**

Delete `productDebugEventBatch` and any `RuntimeWorkbenchDebugEventRef` import.

If Driver/Scenario metadata still needs projection, add context refs or evidence gaps only when needed. Do not create `debug-event-batch` from product metadata.

- [ ] **Step 5: Add reflection bridge bundle truth inputs**

In `buildPlaygroundRuntimeWorkbenchAuthorityBundle`:

```ts
const reflectionEvidence = input.runtimeEvidence?.reflect
const reflectionBridge = createWorkbenchReflectionBridgeBundle({
  manifest: reflectionEvidence?.reflectionManifest ?? reflectionEvidence?.minimumActionManifest,
  sourceRefs: reflectionEvidence?.sourceRefs,
  operationEvents: [
    ...(reflectionEvidence?.operationEvents ?? []),
    ...(input.runtimeEvidence?.run?.operationEvents ?? []),
    ...(input.runtimeEvidence?.dispatch?.operationEvents ?? []),
    ...(input.runtimeEvidence?.check?.operationEvents ?? []),
    ...(input.runtimeEvidence?.trialStartup?.operationEvents ?? []),
  ],
  evidenceGaps: [
    ...(reflectionEvidence?.evidenceGaps ?? []),
    ...(input.runtimeEvidence?.run?.evidenceGaps ?? []),
    ...(input.runtimeEvidence?.dispatch?.evidenceGaps ?? []),
    ...(input.runtimeEvidence?.check?.evidenceGaps ?? []),
    ...(input.runtimeEvidence?.trialStartup?.evidenceGaps ?? []),
  ],
})
truthInputs.push(...reflectionBridge.truthInputs)
```

Keep context refs from both snapshot and bridge bundle.

- [ ] **Step 6: Update PlaygroundShell projection call**

Pass `runtimeEvidence` instead of `actionManifest`:

```ts
runtimeEvidence,
```

- [ ] **Step 7: Run projection tests**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/workbench-projection-runtime-evidence.contract.test.ts test/derived-summary.contract.test.ts
```

Expected: PASS after updating old gap assertions from `fallback-source-regex` to runtime reflection gap semantics.

### Task 10: Make Trace display runtime operation events and real gaps

**Files:**
- Modify: `packages/logix-playground/src/internal/components/WorkbenchBottomPanel.tsx`
- Test: `packages/logix-playground/test/interaction-evidence-matrix.contract.test.tsx`
- Test: `packages/logix-playground/test/host-command-output.contract.test.tsx`

- [ ] **Step 1: Add failing trace assertion**

In `packages/logix-playground/test/interaction-evidence-matrix.contract.test.tsx`, add:

```tsx
it('shows runtime operation events in bottom Trace after a driver dispatch', async () => {
  const harness = createInteractionEvidenceHarness({
    runner: makeReplayLogRunner(),
  })

  await harness.render()
  await harness.expectReadySession('logix-react.local-counter:r0:s1')
  await harness.runDriver('Increase')
  await harness.openBottomTab('Trace')

  await waitFor(() => {
    expect(harness.traceText()).toContain('operation.accepted')
    expect(harness.traceText()).toContain('operation.completed')
    expect(harness.traceText()).toContain('dispatch increment')
  })
})
```

If the harness lacks these helpers, add them in `packages/logix-playground/test/support/interactionEvidenceHarness.tsx`.

- [ ] **Step 2: Run trace tests**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/interaction-evidence-matrix.contract.test.tsx test/host-command-output.contract.test.tsx
```

Expected: FAIL until Trace renders runtime operation events.

- [ ] **Step 3: Update TraceDetail**

In `WorkbenchBottomPanel.tsx`, render operation events from projection sessions and session traces clearly:

```tsx
{session?.traces.map((trace) => (
  <div key={trace.traceId}>
    runtime-event {trace.label} / {trace.traceId}
  </div>
))}
```

For gaps:

```tsx
{gaps.map((gap) => (
  <div key={gap.id}>
    evidence-gap {gap.code}: {gap.summary}
  </div>
))}
```

Ensure old `playground-missing-action-manifest` appears only when runtime reflection truly failed.

- [ ] **Step 4: Run trace tests**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/interaction-evidence-matrix.contract.test.tsx test/host-command-output.contract.test.tsx
```

Expected: PASS.

### Task 11: Attach Check and Trial evidence to the shared pipeline

**Files:**
- Modify: `packages/logix-playground/src/internal/runner/projectSnapshotRuntimeInvoker.ts`
- Modify: `packages/logix-playground/src/internal/components/PlaygroundShell.tsx`
- Test: `packages/logix-playground/test/host-command-output.contract.test.tsx`
- Test: `packages/logix-playground/test/project-snapshot-runtime-evidence.contract.test.ts`

- [ ] **Step 1: Add check/trial evidence assertions**

In `host-command-output.contract.test.tsx`, after Check and Trial complete, open Trace and assert:

```tsx
fireEvent.click(within(bottom).getByRole('button', { name: 'Trace' }))
await waitFor(() => {
  const trace = within(bottom).getByRole('region', { name: 'Trace detail' })
  expect(trace.textContent).toContain('operation.accepted')
  expect(trace.textContent).toContain('operation.completed')
  expect(trace.textContent).toContain('check')
  expect(trace.textContent).toContain('trial')
})
```

- [ ] **Step 2: Run host command test**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/host-command-output.contract.test.tsx
```

Expected: FAIL until check/trial envelopes are recorded and projected.

- [ ] **Step 3: Ensure check/trial invoker events use runtime kind mapping**

In `projectSnapshotRuntimeInvoker.ts`:

- Check uses operation kind `check`.
- TrialStartup maps to runtime operation kind `trial` in events.
- Envelope operationKind stays `trialStartup`.

- [ ] **Step 4: Record check/trial envelopes in state**

In `PlaygroundShell.tsx`, ensure `checkProgram` and `trialStartup` dispatch `recordRuntimeEvidence` before setting panel state.

- [ ] **Step 5: Run host command test**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/host-command-output.contract.test.tsx
```

Expected: PASS.

## Chunk 4: Sweeps, Docs And Final Verification

### Task 12: Add source-regex product path sweep

**Files:**
- Create: `packages/logix-playground/test/source-regex-authority-sweep.contract.test.ts`
- Modify if needed: `packages/logix-playground/src/internal/action/actionManifest.ts`
- Modify if needed: `packages/logix-playground/src/internal/summary/workbenchProjection.ts`

- [ ] **Step 1: Add failing sweep test**

Create `packages/logix-playground/test/source-regex-authority-sweep.contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { globSync } from 'glob'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

describe('source regex authority sweep', () => {
  it('keeps source-regex action discovery out of Playground product paths', () => {
    const files = globSync('packages/logix-playground/src/internal/**/*.{ts,tsx}', {
      cwd: repoRoot,
      absolute: true,
    })
    const hits = files.flatMap((file) => {
      const text = readFileSync(file, 'utf8')
      const relative = path.relative(repoRoot, file)
      return [
        'deriveActionManifestFromSnapshot',
        'deriveFallbackActionManifestFromSnapshot',
        'fallback-source-regex',
        'actionsBlockPattern',
        'actionEntryPattern',
      ]
        .filter((pattern) => text.includes(pattern))
        .map((pattern) => `${relative}: ${pattern}`)
    })

    expect(hits).toEqual([])
  })
})
```

If `glob` is unavailable as an import, use `fast-glob`, which already exists in the repo root.

- [ ] **Step 2: Run sweep**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/source-regex-authority-sweep.contract.test.ts
```

Expected: FAIL if any product path still contains source-regex authority names.

- [ ] **Step 3: Remove remaining source regex product references**

Delete or rename all product-path hits. If a negative fixture is needed, place it under `packages/logix-playground/test/support/forbiddenSourceRegexAuthorityFixture.ts` and exclude test support from the product sweep.

- [ ] **Step 4: Run sweep again**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/source-regex-authority-sweep.contract.test.ts
```

Expected: PASS.

### Task 13: Guard public API and docs authority

**Files:**
- Modify: `packages/logix-playground/test/public-surface.contract.test.ts`
- Modify if needed: `docs/ssot/runtime/17-playground-product-workbench.md`
- Test: `packages/logix-playground/test/public-surface.contract.test.ts`

- [ ] **Step 1: Extend public surface test for evidence nouns**

In `public-surface.contract.test.ts`, add:

```ts
expect(keys).not.toContain('RuntimeEvidence')
expect(keys).not.toContain('RuntimeEvidenceEnvelope')
expect(keys).not.toContain('ProjectSnapshotRuntimeEvidenceInvoker')
```

In the exports text assertion, add:

```ts
expect(exportsText).not.toContain('RuntimeEvidence')
expect(exportsText).not.toContain('ProjectSnapshotRuntimeEvidenceInvoker')
```

- [ ] **Step 2: Run public surface test**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/public-surface.contract.test.ts
```

Expected: PASS.

- [ ] **Step 3: Check SSoT wording**

Run:

```bash
rtk rg -n "fallback-source-regex|源码正则|source regex|runtime evidence refresh|Runtime Reflection" docs/ssot/runtime/17-playground-product-workbench.md docs/review-plan/proposals/2026-04-29-playground-runtime-evidence-refresh.md
```

Expected:

- `docs/ssot/runtime/17-playground-product-workbench.md` says source regex cannot be product fallback.
- Proposal says `fallback-source-regex` only in negative sweep context.
- No doc says source regex is a usable product fallback.

- [ ] **Step 4: Update docs only if drift remains**

If the previous command finds stale fallback wording, update the SSoT and proposal together. Keep the wording aligned with:

```md
manifest 不可用时展示 unavailable state 与 evidence gap，源码正则不能作为产品 fallback。
```

### Task 14: Final focused verification

**Files:**
- No new files.
- Verify all files touched by this plan.

- [ ] **Step 1: Run focused Playground tests**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run \
  test/runtime-evidence-envelope.contract.test.ts \
  test/runtime-reflection-wrapper.contract.test.ts \
  test/project-snapshot-runtime-evidence.contract.test.ts \
  test/action-manifest.contract.test.ts \
  src/internal/components/ActionManifestPanel.test.tsx \
  test/runtime-reflection-ui.contract.test.tsx \
  test/action-panel-dispatch.contract.test.tsx \
  test/driver-action-equivalence.contract.test.tsx \
  test/raw-dispatch-advanced.contract.test.tsx \
  test/workbench-projection-runtime-evidence.contract.test.ts \
  test/interaction-evidence-matrix.contract.test.tsx \
  test/host-command-output.contract.test.tsx \
  test/source-regex-authority-sweep.contract.test.ts \
  test/public-surface.contract.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run package tests**

Run:

```bash
rtk pnpm -C packages/logix-playground test
```

Expected: PASS.

- [ ] **Step 3: Run package typecheck**

Run:

```bash
rtk pnpm -C packages/logix-playground typecheck
```

Expected: PASS.

- [ ] **Step 4: Run repo typecheck**

Run:

```bash
rtk pnpm typecheck
```

Expected: PASS.

- [ ] **Step 5: Run lint**

Run:

```bash
rtk pnpm lint
```

Expected: PASS.

- [ ] **Step 6: Run public grep proof**

Run:

```bash
rtk rg -n "deriveActionManifestFromSnapshot|deriveFallbackActionManifestFromSnapshot|fallback-source-regex|actionsBlockPattern|actionEntryPattern" packages/logix-playground/src docs/ssot/runtime/17-playground-product-workbench.md docs/review-plan/proposals/2026-04-29-playground-runtime-evidence-refresh.md
```

Expected: only proposal negative sweep mentions may remain; `packages/logix-playground/src` has zero hits.

- [ ] **Step 7: Record verification outcome**

Update `docs/review-plan/proposals/2026-04-29-playground-runtime-evidence-refresh.md` with a short implementation note only if the implementation changed the frozen design, for example if `reflect` required a 167 event law extension. If no design drift occurred, do not add process notes.

## Execution Notes

- Prefer one chunk per implementation checkpoint.
- If a task requires changing 167 `RuntimeOperationKind`, update `specs/167-runtime-reflection-manifest/spec.md`, `specs/167-runtime-reflection-manifest/contracts/README.md`, and core tests in the same chunk.
- If existing tests depend on `ProjectSnapshotRuntimeInvokerOutput.kind === 'runtimeOutput'`, update them to assert `envelope.kind === 'runtimeEvidence'` and nested `envelope.runtimeOutput`.
- Keep `ProgramSessionState` as display cache. Do not make it the operation evidence source.
- Keep Drivers and Scenarios as product metadata. They may select or label actions, but runnable authority comes from manifest action tags.
- Use `apply_patch` for manual file edits.
