import { afterEach, beforeEach, expect, test } from 'vitest'
import React from 'react'
import { cleanup, render } from 'vitest-browser-react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProgramSessionRunnerProvider } from '../../../../packages/logix-playground/src/internal/runner/programSessionRunnerContext.js'
import type { ProgramSessionRunner } from '../../../../packages/logix-playground/src/internal/runner/programSessionRunner.js'
import type { ProjectSnapshotRuntimeInvoker } from '../../../../packages/logix-playground/src/internal/runner/projectSnapshotRuntimeInvoker.js'
import type { ProjectSnapshot } from '../../../../packages/logix-playground/src/internal/snapshot/projectSnapshot.js'
import { createRuntimeEvidenceEnvelope } from '../../../../packages/logix-playground/src/internal/runner/runtimeEvidence.js'
import { LogixReactPlaygroundRoute } from '../../src/playground/routes'
import '../../src/style.css'

const extractCounterStep = (snapshot: ProjectSnapshot): number => {
  const source = snapshot.files.get('/src/logic/localCounter.logic.ts')?.content ?? ''
  const match = source.match(/counterStep\s*=\s*(-?\d+)/)
  const step = match ? Number(match[1]) : 1
  return Number.isFinite(step) ? step : 1
}

const reduceCounterActions = (
  snapshot: ProjectSnapshot,
  actions: ReadonlyArray<{ readonly _tag: string }>,
): { readonly count: number } => {
  const step = extractCounterStep(snapshot)
  const count = actions.reduce((value, action) => {
    if (action._tag === 'increment') return value + step
    if (action._tag === 'decrement') return value - step
    return value
  }, 0)
  return { count }
}

const browserContractRunner: ProgramSessionRunner = {
  dispatch: async (input) => {
    const currentAction = input.actions[input.actions.length - 1]
    return {
      state: reduceCounterActions(input.snapshot, input.actions),
      logs: currentAction
        ? [{
            level: 'info',
            message: `dispatch ${currentAction._tag}`,
            source: 'runner',
            sessionId: input.sessionId,
            operationSeq: input.operationSeq,
          }]
        : [],
      traces: [],
    }
  },
}

const browserContractRuntimeInvoker: ProjectSnapshotRuntimeInvoker = {
  reflect: async (snapshot, seq = 1) => createRuntimeEvidenceEnvelope({
    snapshot,
    operationKind: 'reflect',
    opSeq: seq,
    minimumActionManifest: {
      manifestVersion: 'program-action-manifest@167A',
      programId: snapshot.projectId,
      moduleId: 'FixtureCounter',
      revision: snapshot.revision,
      digest: `manifest:${snapshot.projectId}:r${snapshot.revision}`,
      actions: [
        { actionTag: 'decrement', payload: { kind: 'void' }, authority: 'runtime-reflection' },
        { actionTag: 'increment', payload: { kind: 'void' }, authority: 'runtime-reflection' },
      ],
    },
    operationEvents: [],
    artifactRefs: [],
    evidenceGaps: [],
  }),
  run: async (snapshot, seq = 1) => createRuntimeEvidenceEnvelope({
    snapshot,
    operationKind: 'run',
    opSeq: seq,
    runtimeOutput: {
      kind: 'runtimeOutput',
      operation: 'run',
      runId: `${snapshot.projectId}:run:r${snapshot.revision}:op${seq}`,
      value: { count: extractCounterStep(snapshot) },
    },
    operationEvents: [],
    artifactRefs: [],
    evidenceGaps: [],
  }),
  dispatch: async (input) => createRuntimeEvidenceEnvelope({
    snapshot: input.snapshot,
    operationKind: 'dispatch',
    opSeq: input.operationSeq,
    runtimeOutput: {
      kind: 'runtimeOutput',
      operation: 'dispatch',
      state: reduceCounterActions(input.snapshot, input.actions),
      logs: [],
      traces: [],
    },
    operationEvents: [],
    artifactRefs: [],
    evidenceGaps: [],
  }),
  check: async (snapshot, seq = 1) => createRuntimeEvidenceEnvelope({
    snapshot,
    operationKind: 'check',
    opSeq: seq,
    operationEvents: [],
    artifactRefs: [],
    evidenceGaps: [],
  }),
  trialStartup: async (snapshot, seq = 1) => createRuntimeEvidenceEnvelope({
    snapshot,
    operationKind: 'trialStartup',
    opSeq: seq,
    operationEvents: [],
    artifactRefs: [],
    evidenceGaps: [],
  }),
}

const PlaygroundHarness = ({ route = '/playground/logix-react.local-counter' }: { readonly route?: string }) => (
  <ProgramSessionRunnerProvider runner={browserContractRunner} runtimeInvoker={browserContractRuntimeInvoker}>
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/playground" element={<LogixReactPlaygroundRoute />} />
        <Route path="/playground/:id" element={<LogixReactPlaygroundRoute />} />
      </Routes>
    </MemoryRouter>
  </ProgramSessionRunnerProvider>
)

type PlaygroundScreen = Awaited<ReturnType<typeof render>>

const clickButton = (screen: PlaygroundScreen, name: string, exact = true): void => {
  const element = screen.getByRole('button', { name, exact }).element()
  if (!(element instanceof HTMLElement)) throw new Error(`Expected button ${name} to be an HTMLElement`)
  element.click()
}

const clickCommand = (screen: PlaygroundScreen, name: string): void => {
  const element = screen
    .getByLabelText('Workbench command bar')
    .getByRole('button', { name, exact: true })
    .element()
  if (!(element instanceof HTMLElement)) throw new Error(`Expected command ${name} to be an HTMLElement`)
  element.click()
}

beforeEach(() => {
  ;(window as Window & { __LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__?: boolean }).__LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__ = true
})

afterEach(() => {
  delete (window as Window & { __LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__?: boolean }).__LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__
})

test('registered React project renders the runtime workbench', async () => {
  const screen = await render(<PlaygroundHarness />)

  try {
    await expect.element(screen.getByText('Logix Playground')).toBeInTheDocument()
    await expect.element(screen.getByLabelText('Workbench command bar')).toBeInTheDocument()
    await expect.element(screen.getByText('Examples')).not.toBeInTheDocument()
    await expect.element(screen.getByText('Example Gallery')).not.toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: '/src/logic/localCounter.logic.ts', exact: true })).toBeInTheDocument()
    await expect.element(screen.getByRole('region', { name: 'Result', exact: true })).toBeInTheDocument()
    await expect.element(screen.getByRole('region', { name: 'Action workbench' })).toBeInTheDocument()
    await expect.element(screen.getByRole('region', { name: 'Actions', exact: true })).toBeInTheDocument()
    await expect.element(screen.getByRole('region', { name: 'Actions', exact: true }).getByText('increment', { exact: true })).toBeInTheDocument()
    await expect.element(screen.getByRole('region', { name: 'Actions', exact: true }).getByText('decrement', { exact: true })).toBeInTheDocument()
    await expect.element(screen.getByText('setCount')).not.toBeInTheDocument()
    await expect.element(
      screen.getByLabelText('Program session').getByText('logix-react.local-counter:r0:s1', { exact: true }),
    ).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Start session' })).not.toBeInTheDocument()

    clickButton(screen, 'Dispatch increment')
    await expect.element(screen.getByLabelText('Program state').getByText(/"count": 1/)).toBeInTheDocument()
    clickButton(screen, 'Dispatch decrement')
    await expect.element(screen.getByLabelText('Program state').getByText(/"count": 0/)).toBeInTheDocument()
    await expect.element(screen.getByText('dispatch completed decrement')).toBeInTheDocument()

    clickButton(screen, 'Trace')
    await expect.element(screen.getByLabelText('Trace detail')).toBeInTheDocument()
    clickButton(screen, 'Snapshot')
    await expect.element(screen.getByText(/"projectId": "logix-react.local-counter"/)).toBeInTheDocument()
  } finally {
    await cleanup()
  }
})

test('bare Playground route opens the default React project', async () => {
  const screen = await render(<PlaygroundHarness route="/playground" />)

  try {
    await expect.element(screen.getByText('Logix Playground')).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: '/src/main.program.ts', exact: true })).toBeInTheDocument()
    await expect.element(screen.getByRole('region', { name: 'Program result' })).toBeInTheDocument()
  } finally {
    await cleanup()
  }
})

test('shared source edit updates runtime Run output', async () => {
  const screen = await render(<PlaygroundHarness />)

  try {
    clickButton(screen, '/src/logic/localCounter.logic.ts')
    const editor = screen.getByLabelText('Source editor')
    await editor.fill('export const counterStep = 3')
    await expect.element(
      screen.getByLabelText('Workbench command bar').getByText('r1', { exact: true }),
    ).toBeInTheDocument()

    clickCommand(screen, 'Run')
    await expect.element(screen.getByText(/"count": 3/)).toBeInTheDocument()

  } finally {
    await cleanup()
  }
})

test('reset restarts the session without reverting edited source', async () => {
  const screen = await render(<PlaygroundHarness />)

  try {
    clickButton(screen, '/src/logic/localCounter.logic.ts')
    const editor = screen.getByLabelText('Source editor')
    await editor.fill('export const counterStep = 4')
    await expect.element(
      screen.getByLabelText('Workbench command bar').getByText('r1', { exact: true }),
    ).toBeInTheDocument()

    clickCommand(screen, 'Run')
    await expect.element(screen.getByText(/"count": 4/)).toBeInTheDocument()
    clickCommand(screen, 'Reset')
    await expect.element(
      screen.getByLabelText('Workbench command bar').getByText('r1', { exact: true }),
    ).toBeInTheDocument()
    clickCommand(screen, 'Run')
    await expect.element(screen.getByText(/"count": 4/)).toBeInTheDocument()
  } finally {
    await cleanup()
  }
})
