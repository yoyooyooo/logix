# Runtime Playground Session Workbench Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan unless the current user request explicitly authorizes subagents. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build a runtime-first Logix Playground where reflected Program actions can be triggered, state changes can be observed, and logs, traces, diagnostics and stale snapshot state can be inspected without depending on Sandpack UI preview.

**Architecture:** `packages/logix-playground` owns the product shell, host state and Program session controller. The current `ProjectSnapshot` is compiled into sandbox wrappers for reflection, run, check, trial and interactive Program operations; runtime truth comes from Logix Program execution, while Sandpack remains an optional preview adapter. `@logixjs/core`, `@logixjs/react` and `@logixjs/sandbox` public surfaces must not grow Playground product APIs.

**Tech Stack:** TypeScript, React 19, Effect V4, Vitest, Vitest browser where stable, `@logixjs/core/repo-internal/reflection-api`, `@logixjs/sandbox`, pnpm, Markdown SSoT docs

---

## Bound Inputs

- `docs/ssot/runtime/17-playground-product-workbench.md`
- `specs/166-playground-driver-scenario-surface/spec.md`
- `specs/165-runtime-workbench-kernel/spec.md`
- `packages/logix-playground/src/**`
- `examples/logix-react/src/playground/**`
- Current user decision: Playground core value is observable Logix runtime behavior: action trigger, state mutation, logs, traces and diagnostics. UI preview is optional.

## Non-Goals

- Do not make Sandpack a runtime truth source.
- Do not require UI preview for action triggering.
- Do not expose Driver, Scenario, raw dispatch, session runner or Playground transport through `@logixjs/core`, `@logixjs/react` or `@logixjs/sandbox` public APIs.
- Do not make arbitrary raw action dispatch the default docs user path. Raw dispatch may exist as an advanced internal workbench affordance after curated and reflected action paths exist.
- Do not implement service source files or scenario playback in this plan. Leave extension points aligned with `166`.
- Do not persist sessions, share links, user scenarios or cloud workspaces.

## File Structure

- `docs/ssot/runtime/17-playground-product-workbench.md`
  - Update vocabulary to include a `Reflected Action Workbench` lane for internal/dev Playground use.
  - Clarify Sandpack is preview-only and cannot satisfy runtime proof.
- `specs/166-playground-driver-scenario-surface/spec.md`
  - Clarify the relationship between reflected actions, curated drivers and raw dispatch.
- `packages/logix-playground/src/internal/action/actionManifest.ts`
  - Replace source-regex action extraction with compiled reflection-backed projection.
  - Keep output small and UI-oriented.
- `packages/logix-playground/src/internal/runner/actionManifestWrapper.ts`
  - Create source wrapper that imports `@logixjs/core/repo-internal/reflection-api` and returns `extractManifest(Program)`.
- `packages/logix-playground/src/internal/session/programSession.ts`
  - Define Program session state, operation IDs, stale handling, state snapshots, logs, traces and errors.
- `packages/logix-playground/src/internal/session/programSessionController.ts`
  - Host-side reducer/controller for start, dispatch, reset, close and source edit stale behavior.
- `packages/logix-playground/src/internal/runner/programSessionWrapper.ts`
  - Create runtime wrapper for start and dispatch operations.
  - First implementation may replay action history against current snapshot; later worker live session protocol can replace the transport behind the same controller.
- `packages/logix-playground/src/internal/runner/programSessionRunner.ts`
  - Transport-neutral API that uses `InternalSandboxTransport`.
- `packages/logix-playground/src/internal/components/ActionManifestPanel.tsx`
  - Enable action buttons for `Schema.Void` actions and JSON payload editor for non-void actions.
- `packages/logix-playground/src/internal/components/ProgramSessionPanel.tsx`
  - Show session status, state JSON, last action, operation IDs, stale badge and reset controls.
- `packages/logix-playground/src/internal/components/ProgramPanel.tsx`
  - Keep one-shot Run result display only.
- `packages/logix-playground/src/internal/components/PlaygroundShell.tsx`
  - Wire session controller, action panel, session panel and bottom console tabs.
- `packages/logix-playground/src/internal/summary/derivedSummary.ts`
  - Add session output, action operations and stale state as host-owned summary inputs.
- `packages/logix-playground/src/internal/summary/workbenchProjection.ts`
  - Feed produced result/log/trace refs into Runtime Workbench Kernel inputs without inventing a new report schema.
- `packages/logix-playground/test/**`
  - Unit, DOM and runner contract tests.
- `examples/logix-react/src/playground/projects/local-counter.ts`
  - Provide `increment` and `decrement` actions and stable state expectations.
- `examples/logix-react/test/**`
  - Browser or DOM proof that `/playground` shows actions and state updates after dispatch.

## Chunk 1: Freeze Product Boundary And Reflection Contract

### Task 1: Update Playground vocabulary and Sandpack boundary

**Files:**
- Modify: `docs/ssot/runtime/17-playground-product-workbench.md`
- Modify: `specs/166-playground-driver-scenario-surface/spec.md`

- [x] **Step 1: Update 17 SSoT**

Add a short section under `Host Command、Service Files、Driver 与 Scenario 边界`:

```md
### Reflected Action Workbench

Reflected Action Workbench 是 Playground 面向维护者、Agent 和内部 dogfooding 的 Program action 操作面。

允许：

- 从编译后的 Program manifest 读取 root Program actions。
- 对 `Schema.Void` action 显示直接 dispatch 按钮。
- 对 non-void action 显示 JSON payload 输入。
- dispatch 后展示 state、result、logs、trace、operation id 和 snapshot revision。

默认边界：

- docs 面默认优先 curated Driver；反射 action 面可以作为 advanced workbench 展示。
- raw dispatch 只允许折叠在 advanced 区，不作为默认用户路径。
- Sandpack 只作为 preview adapter，不是 runtime truth。
```

- [x] **Step 2: Update 166 relationship**

Clarify:

```md
Reflected Action Workbench may be used as an internal dogfooding layer before curated Driver declarations exist. It does not replace curated Driver for user docs. Raw arbitrary dispatch remains advanced-only.
```

- [x] **Step 3: Run docs text sweep**

Run:

```bash
rtk rg -n "Sandpack|raw action dispatch|Interaction Driver|Reflected Action Workbench" docs/ssot/runtime/17-playground-product-workbench.md specs/166-playground-driver-scenario-surface/spec.md
```

Expected: every hit is consistent with the boundary above.

### Task 2: Replace source-regex action extraction with compiled reflection contract

**Files:**
- Modify: `packages/logix-playground/src/internal/action/actionManifest.ts`
- Create: `packages/logix-playground/src/internal/runner/actionManifestWrapper.ts`
- Test: `packages/logix-playground/test/action-manifest.contract.test.ts`
- Test: `packages/logix-playground/test/action-manifest-wrapper.contract.test.ts`

- [x] **Step 1: Write failing wrapper contract**

Add `packages/logix-playground/test/action-manifest-wrapper.contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createPlaygroundWorkspace } from '../src/internal/session/workspace.js'
import { createProjectSnapshot } from '../src/internal/snapshot/projectSnapshot.js'
import { createActionManifestWrapperSource } from '../src/internal/runner/actionManifestWrapper.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'

describe('action manifest wrapper', () => {
  it('generates a reflection-backed wrapper for the current Program snapshot', () => {
    const snapshot = createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))
    const source = createActionManifestWrapperSource(snapshot)

    expect(source).toContain('@logixjs/core/repo-internal/reflection-api')
    expect(source).toContain('Reflection.extractManifest(Program')
    expect(source).toContain('export default')
  })
})
```

- [x] **Step 2: Run the failing test**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/action-manifest-wrapper.contract.test.ts
```

Expected: FAIL because `createActionManifestWrapperSource` does not exist.

- [x] **Step 3: Implement wrapper source**

Create `packages/logix-playground/src/internal/runner/actionManifestWrapper.ts`:

```ts
import type { ProjectSnapshot } from '../snapshot/projectSnapshot.js'
import { snapshotFilesToModuleSource } from './programWrapper.js'

export const createActionManifestWrapperSource = (snapshot: ProjectSnapshot): string => {
  if (!snapshot.programEntry) {
    throw new Error(`Project ${snapshot.projectId} has no Program entry`)
  }

  const moduleSource = snapshotFilesToModuleSource(snapshot)

  return [
    'import { Effect } from "effect"',
    'import * as Reflection from "@logixjs/core/repo-internal/reflection-api"',
    'import * as Logix from "@logixjs/core"',
    '',
    moduleSource,
    '',
    'export default Effect.sync(() => {',
    '  const manifest = Reflection.extractManifest(Program)',
    '  return {',
    `    projectId: ${JSON.stringify(snapshot.projectId)},`,
    `    revision: ${snapshot.revision},`,
    '    moduleId: manifest.moduleId,',
    '    actionKeys: manifest.actionKeys,',
    '    actions: manifest.actions,',
    '  }',
    '})',
    '',
  ].join('\\n')
}
```

Also export `snapshotFilesToModuleSource` from `programWrapper.ts`, keeping it internal.

- [x] **Step 4: Change action manifest derivation**

Update `packages/logix-playground/src/internal/action/actionManifest.ts` to consume a reflected manifest object:

```ts
export interface ReflectedActionManifestInput {
  readonly projectId: string
  readonly revision: number
  readonly moduleId?: string
  readonly actions?: ReadonlyArray<{
    readonly actionTag: string
    readonly payload?: { readonly kind?: 'void' | 'nonVoid' | 'unknown' }
  }>
}

export const projectReflectedActionManifest = (
  input: ReflectedActionManifestInput,
): PlaygroundActionManifest => ({
  projectId: input.projectId,
  revision: input.revision,
  moduleId: input.moduleId,
  actions: (input.actions ?? [])
    .map((action) => ({
      actionTag: action.actionTag,
      payloadKind: action.payload?.kind ?? 'unknown',
    }))
    .sort((a, b) => a.actionTag.localeCompare(b.actionTag)),
})
```

Keep a temporary source-based fallback only for tests that do not mount sandbox transport. Name it `deriveFallbackActionManifestFromSnapshot` and mark it internal fallback in comments.

- [x] **Step 5: Run action manifest tests**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/action-manifest.contract.test.ts test/action-manifest-wrapper.contract.test.ts
```

Expected: PASS.

## Chunk 2: Program Session Controller And Runner

### Task 3: Define Program session state and stale behavior

**Files:**
- Create: `packages/logix-playground/src/internal/session/programSession.ts`
- Create: `packages/logix-playground/test/program-session-state.contract.test.ts`

- [x] **Step 1: Write failing state contract**

Create `packages/logix-playground/test/program-session-state.contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  createInitialProgramSession,
  markProgramSessionStale,
  recordProgramSessionOperation,
} from '../src/internal/session/programSession.js'

describe('Program session state', () => {
  it('creates stable ids and marks source edits stale', () => {
    const session = createInitialProgramSession({
      projectId: 'logix-react.local-counter',
      revision: 0,
      seq: 1,
    })

    expect(session.sessionId).toBe('logix-react.local-counter:r0:s1')
    expect(session.status).toBe('idle')
    expect(session.stale).toBe(false)

    const afterOperation = recordProgramSessionOperation(session, {
      operation: { kind: 'dispatch', actionTag: 'increment', payload: undefined },
      state: { count: 1 },
      logs: [{ level: 'info', message: 'dispatch increment', source: 'runner' }],
      traces: [],
    })

    expect(afterOperation.operationSeq).toBe(1)
    expect(afterOperation.state).toEqual({ count: 1 })

    const stale = markProgramSessionStale(afterOperation, { revision: 2 })
    expect(stale.stale).toBe(true)
    expect(stale.staleReason).toContain('r2')
  })
})
```

- [x] **Step 2: Run test to verify failure**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/program-session-state.contract.test.ts
```

Expected: FAIL because session helpers do not exist.

- [x] **Step 3: Implement session model**

Create `packages/logix-playground/src/internal/session/programSession.ts`:

```ts
import type { BoundedLogEntry } from './logs.js'

export type ProgramSessionStatus = 'idle' | 'starting' | 'ready' | 'running' | 'failed' | 'closed'

export interface ProgramSessionOperation {
  readonly kind: 'dispatch' | 'run'
  readonly actionTag?: string
  readonly payload?: unknown
}

export interface ProgramSessionTraceRef {
  readonly traceId: string
  readonly label: string
}

export interface ProgramSessionState {
  readonly sessionId: string
  readonly projectId: string
  readonly revision: number
  readonly status: ProgramSessionStatus
  readonly operationSeq: number
  readonly stale: boolean
  readonly staleReason?: string
  readonly state?: unknown
  readonly lastOperation?: ProgramSessionOperation
  readonly logs: ReadonlyArray<BoundedLogEntry>
  readonly traces: ReadonlyArray<ProgramSessionTraceRef>
  readonly error?: { readonly kind: string; readonly message: string }
}

export const makeProgramSessionId = (projectId: string, revision: number, seq: number): string =>
  `${projectId}:r${revision}:s${seq}`

export const createInitialProgramSession = (input: {
  readonly projectId: string
  readonly revision: number
  readonly seq: number
}): ProgramSessionState => ({
  sessionId: makeProgramSessionId(input.projectId, input.revision, input.seq),
  projectId: input.projectId,
  revision: input.revision,
  status: 'idle',
  operationSeq: 0,
  stale: false,
  logs: [],
  traces: [],
})

export const recordProgramSessionOperation = (
  session: ProgramSessionState,
  input: {
    readonly operation: ProgramSessionOperation
    readonly state: unknown
    readonly logs: ReadonlyArray<BoundedLogEntry>
    readonly traces: ReadonlyArray<ProgramSessionTraceRef>
  },
): ProgramSessionState => ({
  ...session,
  status: 'ready',
  operationSeq: session.operationSeq + 1,
  state: input.state,
  lastOperation: input.operation,
  logs: input.logs,
  traces: input.traces,
  error: undefined,
})

export const markProgramSessionStale = (
  session: ProgramSessionState,
  input: { readonly revision: number },
): ProgramSessionState => ({
  ...session,
  stale: true,
  staleReason: `Session snapshot r${session.revision} is stale after source revision r${input.revision}.`,
})
```

- [x] **Step 4: Run test**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/program-session-state.contract.test.ts
```

Expected: PASS.

### Task 4: Add session runner wrapper for start and dispatch

**Files:**
- Create: `packages/logix-playground/src/internal/runner/programSessionWrapper.ts`
- Create: `packages/logix-playground/src/internal/runner/programSessionRunner.ts`
- Test: `packages/logix-playground/test/program-session-runner.contract.test.ts`

- [x] **Step 1: Write fake transport runner contract**

Create `packages/logix-playground/test/program-session-runner.contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createProgramSessionRunner } from '../src/internal/runner/programSessionRunner.js'
import { createPlaygroundWorkspace } from '../src/internal/session/workspace.js'
import { createProjectSnapshot } from '../src/internal/snapshot/projectSnapshot.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'

describe('Program session runner', () => {
  it('starts a session and dispatches actions through transport', async () => {
    const calls: Array<unknown> = []
    const runner = createProgramSessionRunner({
      transport: {
        init: async () => calls.push('init'),
        compile: async (code) => {
          calls.push({ compile: code })
          return { success: true }
        },
        run: async (options) => {
          calls.push({ run: options })
          return {
            stateSnapshot: { state: { count: 1 }, logs: [{ level: 'info', message: 'ok', source: 'runner' }] },
            logs: [{ level: 'info', message: 'ok', source: 'runner' }],
          }
        },
      },
    })

    const snapshot = createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))
    const result = await runner.dispatch({
      snapshot,
      sessionId: 'logix-react.local-counter:r0:s1',
      actions: [{ _tag: 'increment', payload: undefined }],
      operationSeq: 1,
    })

    expect(result.state).toEqual({ count: 1 })
    expect(result.logs[0]?.message).toBe('ok')
    expect(JSON.stringify(calls)).toContain('increment')
  })
})
```

- [x] **Step 2: Run test to verify failure**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/program-session-runner.contract.test.ts
```

Expected: FAIL because runner does not exist.

- [x] **Step 3: Implement wrapper source**

Create `packages/logix-playground/src/internal/runner/programSessionWrapper.ts`:

```ts
import type { ProjectSnapshot } from '../snapshot/projectSnapshot.js'
import { snapshotFilesToModuleSource } from './programWrapper.js'

export interface ProgramSessionWrapperInput {
  readonly snapshot: ProjectSnapshot
  readonly actions: ReadonlyArray<{ readonly _tag: string; readonly payload?: unknown }>
  readonly sessionId: string
}

export const createProgramSessionWrapperSource = (input: ProgramSessionWrapperInput): string => {
  const moduleSource = snapshotFilesToModuleSource(input.snapshot)

  return [
    'import { Effect } from "effect"',
    'import * as Logix from "@logixjs/core"',
    '',
    moduleSource,
    '',
    `const __logixPlaygroundActions = ${JSON.stringify(input.actions)}`,
    '',
    'export default Effect.scoped(Effect.gen(function* () {',
    `  const ctx = yield* Logix.Runtime.openProgram(Program, { runId: ${JSON.stringify(input.sessionId)}, handleSignals: false })`,
    '  for (const action of __logixPlaygroundActions) {',
    '    yield* ctx.module.dispatch(action)',
    '  }',
    '  const state = yield* ctx.module.getState',
    '  return { state }',
    '}))',
    '',
  ].join('\\n')
}
```

- [x] **Step 4: Implement runner**

Create `packages/logix-playground/src/internal/runner/programSessionRunner.ts`:

```ts
import type { ProjectSnapshot } from '../snapshot/projectSnapshot.js'
import type { BoundedLogEntry } from '../session/logs.js'
import type { InternalSandboxTransport } from './sandboxRunner.js'
import { createProgramSessionWrapperSource } from './programSessionWrapper.js'

export interface ProgramSessionDispatchInput {
  readonly snapshot: ProjectSnapshot
  readonly sessionId: string
  readonly actions: ReadonlyArray<{ readonly _tag: string; readonly payload?: unknown }>
  readonly operationSeq: number
}

export interface ProgramSessionDispatchResult {
  readonly state: unknown
  readonly logs: ReadonlyArray<BoundedLogEntry>
  readonly traces: ReadonlyArray<{ readonly traceId: string; readonly label: string }>
}

const normalizeStateSnapshot = (value: unknown): unknown =>
  value && typeof value === 'object' && 'state' in value
    ? (value as { readonly state: unknown }).state
    : value

export const createProgramSessionRunner = (options: { readonly transport: InternalSandboxTransport }) => ({
  dispatch: async (input: ProgramSessionDispatchInput): Promise<ProgramSessionDispatchResult> => {
    const code = createProgramSessionWrapperSource(input)
    await options.transport.init()
    const compiled = await options.transport.compile(code, input.snapshot.programEntry?.entry)
    if (!compiled.success) {
      throw new Error(compiled.errors?.join('\\n') ?? 'compile failed')
    }
    const result = await options.transport.run({
      runId: `${input.sessionId}:op${input.operationSeq}`,
      useCompiledCode: true,
    })
    return {
      state: normalizeStateSnapshot(result.stateSnapshot),
      logs: (result.logs ?? []) as ReadonlyArray<BoundedLogEntry>,
      traces: [],
    }
  },
})
```

- [x] **Step 5: Run runner tests**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/program-session-runner.contract.test.ts
```

Expected: PASS.

## Chunk 3: Enable Action Dispatch In UI

### Task 5: Wire ActionManifestPanel to Program session controller

**Files:**
- Modify: `packages/logix-playground/src/internal/components/ActionManifestPanel.tsx`
- Create: `packages/logix-playground/src/internal/components/ProgramSessionPanel.tsx`
- Modify: `packages/logix-playground/src/internal/components/PlaygroundShell.tsx`
- Create: `packages/logix-playground/test/action-panel-dispatch.contract.test.tsx`

- [x] **Step 1: Write UI dispatch contract with fake runner**

Create `packages/logix-playground/test/action-panel-dispatch.contract.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PlaygroundPage } from '../src/Playground.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'

describe('Action panel dispatch', () => {
  it('clicks reflected actions and shows updated Program state', async () => {
    render(<PlaygroundPage registry={[localCounterProjectFixture]} projectId="logix-react.local-counter" />)

    await userEvent.click(screen.getByRole('button', { name: 'Start session' }))
    await userEvent.click(screen.getByRole('button', { name: 'Dispatch increment' }))

    await waitFor(() => {
      expect(screen.getByLabelText('Program state').textContent).toContain('"count"')
    })
  })
})
```

If this test needs a fake runner injection, add an internal-only prop to `PlaygroundShell` or a test-only fixture in `PlaygroundPage` props. Do not export it from package public surface.

- [x] **Step 2: Run test to verify failure**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/action-panel-dispatch.contract.test.tsx
```

Expected: FAIL because buttons are disabled or session panel does not exist.

- [x] **Step 3: Update ActionManifestPanel props**

Change `ActionManifestPanel` to:

```ts
export interface ActionManifestPanelProps {
  readonly manifest: PlaygroundActionManifest
  readonly disabled?: boolean
  readonly onDispatch: (action: { readonly _tag: string; readonly payload?: unknown }) => void
}
```

For void actions:

```tsx
<button
  type="button"
  disabled={disabled}
  aria-label={`Dispatch ${action.actionTag}`}
  onClick={() => onDispatch({ _tag: action.actionTag, payload: undefined })}
>
  Dispatch
</button>
```

For non-void actions, add a small JSON textarea scoped per action:

```tsx
<textarea aria-label={`Payload for ${action.actionTag}`} />
```

Payload parse failure must stay in panel state and must not call `onDispatch`.

- [x] **Step 4: Add ProgramSessionPanel**

Create `packages/logix-playground/src/internal/components/ProgramSessionPanel.tsx`:

```tsx
import React from 'react'
import type { ProgramSessionState } from '../session/programSession.js'

export function ProgramSessionPanel({
  session,
  onStart,
  onReset,
  onClose,
}: {
  readonly session: ProgramSessionState | undefined
  readonly onStart: () => void
  readonly onReset: () => void
  readonly onClose: () => void
}): React.ReactElement {
  return (
    <section aria-label="Program session" className="rounded-lg border border-border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Session</h2>
        <div className="flex gap-2">
          <button type="button" onClick={onStart}>Start session</button>
          <button type="button" onClick={onReset}>Reset session</button>
          <button type="button" onClick={onClose}>Close session</button>
        </div>
      </div>
      <div className="p-3">
        <p className="text-xs text-muted-foreground">{session?.sessionId ?? 'No active session'}</p>
        {session?.stale ? <p role="status">Session stale</p> : null}
        <pre aria-label="Program state" className="mt-2 overflow-auto rounded-md bg-zinc-950 p-3 font-mono text-xs text-zinc-100">
          {JSON.stringify(session?.state ?? null, null, 2)}
        </pre>
      </div>
    </section>
  )
}
```

- [x] **Step 5: Wire PlaygroundShell**

`PlaygroundShell` should:

- create initial session with `createInitialProgramSession`
- start session by dispatching zero actions through runner or by setting session idle ready
- dispatch reflected actions through `createProgramSessionRunner`
- record state/logs/traces into session
- mark session stale when `snapshot.revision` changes after session creation
- disable action buttons when no active session, session running, session stale or compile error exists

- [x] **Step 6: Run UI dispatch tests**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/action-panel-dispatch.contract.test.tsx test/workbench-layout.contract.test.tsx test/default-ui-hierarchy.contract.test.tsx
```

Expected: PASS.

### Task 6: Make examples/local-counter prove +1 and -1

**Files:**
- Modify: `examples/logix-react/src/playground/projects/local-counter.ts`
- Modify: `examples/logix-react/test/playground-registry.contract.test.ts`
- Modify: `examples/logix-react/test/browser/playground-preview.contract.test.tsx`

- [x] **Step 1: Ensure project has both actions**

The Program source must include:

```ts
actions: {
  increment: Schema.Void,
  decrement: Schema.Void,
},
reducers: {
  increment: Logix.Module.Reducer.mutate((draft) => {
    draft.count += counterStep
  }),
  decrement: Logix.Module.Reducer.mutate((draft) => {
    draft.count -= counterStep
  }),
},
```

- [x] **Step 2: Add registry contract**

Assert both actions are present:

```ts
expect(project?.files['/src/program.ts']?.content).toContain('increment: Schema.Void')
expect(project?.files['/src/program.ts']?.content).toContain('decrement: Schema.Void')
```

- [x] **Step 3: Add route-level interaction proof**

In browser test, when the runner is stable, assert:

```ts
await screen.getByRole('button', { name: 'Start session' }).click()
await screen.getByRole('button', { name: 'Dispatch increment' }).click()
await expect.element(screen.getByLabelText('Program state')).toContainText('"count": 1')
await screen.getByRole('button', { name: 'Dispatch decrement' }).click()
await expect.element(screen.getByLabelText('Program state')).toContainText('"count": 0')
```

If Vitest browser remains unstable locally, keep the same proof in `packages/logix-playground` DOM tests and document the browser runner blocker in verification notes.

- [x] **Step 4: Run examples tests**

Run:

```bash
rtk pnpm -C examples/logix-react exec vitest run test/playground-registry.contract.test.ts
rtk pnpm -C examples/logix-react exec vitest run test/browser/playground-preview.contract.test.tsx --testTimeout=10000 --hookTimeout=10000
rtk pnpm -C examples/logix-react typecheck
```

Expected: registry and typecheck PASS. Browser test PASS if local runner is healthy; otherwise record the startup/teardown blocker and keep no lingering processes.

## Chunk 4: Logs, Diagnostics, Summary And Workbench Projection

### Task 7: Show action logs, errors and trace refs in bottom console

**Files:**
- Modify: `packages/logix-playground/src/internal/session/logs.ts`
- Modify: `packages/logix-playground/src/internal/session/programSession.ts`
- Modify: `packages/logix-playground/src/internal/components/PlaygroundShell.tsx`
- Create: `packages/logix-playground/src/internal/components/SessionConsolePanel.tsx`
- Test: `packages/logix-playground/test/program-session-console.contract.test.tsx`

- [x] **Step 1: Write console test**

Create a test that dispatches `increment` through a fake runner and expects bottom Console to show:

```text
dispatch increment
session id
operation seq
```

- [x] **Step 2: Add bounded session logs**

Use existing `appendBoundedLog` from `session/logs.ts`. Add entries for:

- session start
- dispatch accepted
- dispatch completed
- compile failure
- runtime failure
- session stale

- [x] **Step 3: Add SessionConsolePanel**

Render compact log rows with `level`, `source`, `message` and optional operation id.

- [x] **Step 4: Run console tests**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/program-session-console.contract.test.tsx test/derived-summary.contract.test.ts
```

Expected: PASS.

### Task 8: Feed session outputs into derived summary and workbench projection

**Files:**
- Modify: `packages/logix-playground/src/internal/summary/derivedSummary.ts`
- Modify: `packages/logix-playground/src/internal/summary/workbenchProjection.ts`
- Modify: `packages/logix-playground/test/derived-summary.contract.test.ts`
- Modify: `packages/logix-playground/test/shape-separation.contract.test.ts`

- [x] **Step 1: Extend summary contract**

Add assertions:

```ts
expect(summary.programSession?.status).toBe('ready')
expect(summary.programSession?.lastActionTag).toBe('increment')
expect(summary.projection.sessions.map((session) => session.inputKind)).toContain('run-result')
```

The session output can enter projection only as produced result/log/debug refs. It cannot become a new control-plane report.

- [x] **Step 2: Implement summary projection**

Map session state to host summary:

```ts
programSession: {
  status,
  sessionId,
  revision,
  stale,
  lastActionTag,
  operationSeq,
}
```

Map dispatch result as a `run-result` style truth input if it is JSON-safe and bounded.

- [x] **Step 3: Guard shape separation**

Add negative assertion:

```ts
expect(JSON.stringify(summary.programSession)).not.toContain('VerificationControlPlaneReport')
```

- [x] **Step 4: Run summary tests**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/derived-summary.contract.test.ts test/shape-separation.contract.test.ts
```

Expected: PASS.

## Chunk 5: Payload Validation And Advanced Raw Dispatch

### Task 9: Add JSON payload support for non-void actions

**Files:**
- Modify: `packages/logix-playground/src/internal/components/ActionManifestPanel.tsx`
- Create: `packages/logix-playground/src/internal/action/payloadInput.ts`
- Test: `packages/logix-playground/test/action-payload-input.contract.test.tsx`

- [x] **Step 1: Write payload parsing tests**

Cover:

- `Schema.Void` action sends `payload: undefined`
- `Schema.Number` action parses `3`
- invalid JSON displays error and does not dispatch
- overly large JSON is rejected with bounded error

- [x] **Step 2: Implement payload parser**

Create:

```ts
export const parseActionPayloadInput = (
  text: string,
): { readonly success: true; readonly value: unknown } | { readonly success: false; readonly message: string } => {
  try {
    return { success: true, value: JSON.parse(text) }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : String(error) }
  }
}
```

Add byte budget before parse.

- [x] **Step 3: Wire UI**

For non-void actions:

- show payload textarea
- show example payload placeholder based on payload kind
- call `onDispatch({ _tag, payload })` only after valid parse

- [x] **Step 4: Run payload tests**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/action-payload-input.contract.test.tsx
```

Expected: PASS.

### Task 10: Add advanced raw dispatch behind a collapsed panel

**Files:**
- Create: `packages/logix-playground/src/internal/components/RawDispatchPanel.tsx`
- Modify: `packages/logix-playground/src/internal/components/PlaygroundShell.tsx`
- Test: `packages/logix-playground/test/raw-dispatch-advanced.contract.test.tsx`
- Modify: `docs/ssot/runtime/17-playground-product-workbench.md`

- [x] **Step 1: Write advanced-only contract**

Assert raw dispatch is not visible by default:

```ts
expect(screen.queryByRole('region', { name: 'Raw dispatch' })).toBeNull()
```

After clicking `Advanced`, it appears.

- [x] **Step 2: Implement RawDispatchPanel**

Accept JSON:

```json
{ "_tag": "increment" }
```

Normalize missing payload to `undefined`. Reject unknown `_tag` before runner dispatch.

- [x] **Step 3: Update docs boundary**

Document raw dispatch as advanced-only internal workbench affordance, not default docs path.

- [x] **Step 4: Run raw dispatch tests and docs sweep**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/raw-dispatch-advanced.contract.test.tsx
rtk rg -n "raw dispatch|Raw dispatch|advanced" docs/ssot/runtime/17-playground-product-workbench.md packages/logix-playground/src
```

Expected: PASS and all text hits match advanced-only boundary.

## Chunk 6: Verification, Public Surface Guards And Cleanup

### Task 11: Add public surface negative guards

**Files:**
- Modify: `packages/logix-playground/test/public-surface.contract.test.ts`
- Modify: `packages/logix-sandbox/test/Client/Client.TrialBoundary.test.ts`
- Modify: `packages/logix-core/test/PublicSurface/Core.RootExportsBoundary.test.ts`
- Modify: `packages/logix-react/test/**` if existing public surface guards cover root exports

- [x] **Step 1: Guard no public core/react/sandbox leak**

Assert these strings do not appear in public exports:

```ts
expect(JSON.stringify(pkg.exports)).not.toContain('Driver')
expect(JSON.stringify(pkg.exports)).not.toContain('Scenario')
expect(JSON.stringify(pkg.exports)).not.toContain('ProgramSession')
expect(JSON.stringify(pkg.exports)).not.toContain('RawDispatch')
```

For `@logixjs/playground`, internal files stay blocked by `./internal/*: null`.

- [x] **Step 2: Run guards**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/public-surface.contract.test.ts
rtk pnpm -C packages/logix-sandbox exec vitest run test/Client/Client.TrialBoundary.test.ts
rtk pnpm -C packages/logix-core exec vitest run test/PublicSurface/Core.RootExportsBoundary.test.ts
```

Expected: PASS.

### Task 12: Run package and workspace verification

**Files:**
- No code changes unless verification fails.

- [x] **Step 1: Playground package tests**

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run \
  test/action-manifest.contract.test.ts \
  test/action-manifest-wrapper.contract.test.ts \
  test/program-session-state.contract.test.ts \
  test/program-session-runner.contract.test.ts \
  test/action-panel-dispatch.contract.test.tsx \
  test/program-session-console.contract.test.tsx \
  test/derived-summary.contract.test.ts \
  test/shape-separation.contract.test.ts \
  test/workbench-layout.contract.test.tsx \
  test/default-ui-hierarchy.contract.test.tsx \
  test/public-surface.contract.test.ts
```

Expected: PASS.

- [x] **Step 2: Typecheck changed packages**

Run:

```bash
rtk pnpm -C packages/logix-playground typecheck
rtk pnpm -C examples/logix-react typecheck
```

Expected: PASS.

- [x] **Step 3: Examples route proof**

Run:

```bash
rtk pnpm -C examples/logix-react exec vitest run test/playground-registry.contract.test.ts
rtk pnpm -C examples/logix-react exec vitest run test/browser/playground-preview.contract.test.tsx --testTimeout=10000 --hookTimeout=10000
```

Expected: PASS if local browser runner is healthy. If browser runner hangs before test output, stop only the hung vitest process, record blocker, and keep DOM-level Playground tests as the product proof.

- [x] **Step 4: Workspace quality gate**

Run:

```bash
rtk pnpm typecheck
rtk pnpm lint
rtk pnpm test:turbo
```

Expected: PASS.

- [x] **Step 5: Text sweep**

Run:

```bash
rtk rg -n "SnapshotPreviewWitness|PlaygroundRunResult|Runtime\\.playground|runtime\\.playground|Driver/Scenario runner 进入|Sandpack.*truth" \
  packages/logix-playground/src \
  packages/logix-core/src \
  packages/logix-react/src \
  packages/logix-sandbox/src \
  docs/ssot/runtime/17-playground-product-workbench.md \
  specs/166-playground-driver-scenario-surface/spec.md
```

Expected: no forbidden production hits. Any docs hit must be a negative boundary statement.

## Verification Notes

- `packages/logix-playground` package tests passed through `rtk pnpm test:turbo`: 18 files, 38 tests.
- `examples/logix-react` non-browser tests passed through `rtk pnpm test:turbo`: 11 files, 30 tests.
- `rtk pnpm typecheck`, `rtk pnpm lint` and `rtk pnpm test:turbo` passed.
- `rtk pnpm -C examples/logix-react exec vitest run test/browser/playground-preview.contract.test.tsx --testTimeout=10000 --hookTimeout=10000` did not emit test output locally and the tool session stayed open after the process disappeared from `ps`; package-level DOM tests now carry the product proof for action dispatch, state observation, logs and Sandpack-disabled runtime behavior.
- Text sweep leaves only accepted boundary hits: Sandpack as preview adapter or negative authority statement, and Driver/Scenario public-surface text as a forbidden shape.

## Execution Notes

- Do not use `git add`, `git commit`, `git push`, `git reset`, `git restore`, `git checkout --`, `git clean` or `git stash` unless the user explicitly asks.
- All shell commands in this repo must be prefixed with `rtk`.
- Prefer TDD. Write each failing test first, run it, implement the minimum, then rerun.
- If current browser tests hang before test output, do not treat that as feature failure. Kill only the stuck test process and record the local browser-runner blocker.
- If `@logixjs/core/repo-internal/reflection-api` cannot be resolved inside sandbox compile, first update the sandbox internal package manifest or resolver. Do not replace reflection with source regex as final behavior.
- Keep the current source-regex action extraction only as temporary fallback for tests without sandbox transport. Remove or narrow it once reflection-backed runner is stable.

## Acceptance Checklist

- [x] `/playground` shows reflected `increment` and `decrement` actions for `logix-react.local-counter`.
- [x] User can start a Program session.
- [x] Clicking `Dispatch increment` updates Program state from `{ count: 0 }` to `{ count: 1 }`.
- [x] Clicking `Dispatch decrement` updates Program state back to `{ count: 0 }`.
- [x] Source edits mark the active session stale and require reset or new session before dispatch.
- [x] Logs show session start, dispatch accepted and dispatch completed.
- [x] Runtime failures are classified separately from Check/Trial reports.
- [x] Summary and workbench projection preserve Run result vs Trial report shape separation.
- [x] Sandpack preview can be disabled without breaking action dispatch, state observation or diagnostics.
- [x] Public surfaces of core/react/sandbox do not expose Playground Driver, Scenario, ProgramSession or raw dispatch APIs.
