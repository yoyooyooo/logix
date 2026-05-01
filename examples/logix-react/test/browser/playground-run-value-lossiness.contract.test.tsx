import { afterEach, beforeEach, expect, test } from 'vitest'
import React from 'react'
import { cleanup, render } from 'vitest-browser-react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProgramSessionRunnerProvider } from '../../../../packages/logix-playground/src/internal/runner/programSessionRunnerContext.js'
import type { ProgramSessionRunner } from '../../../../packages/logix-playground/src/internal/runner/programSessionRunner.js'
import type { ProjectSnapshotRuntimeInvoker } from '../../../../packages/logix-playground/src/internal/runner/projectSnapshotRuntimeInvoker.js'
import { createRuntimeEvidenceEnvelope } from '../../../../packages/logix-playground/src/internal/runner/runtimeEvidence.js'
import { LogixReactPlaygroundRoute } from '../../src/playground/routes'
import '../../src/style.css'

const runner: ProgramSessionRunner = {
  dispatch: async () => ({ state: null, logs: [], traces: [] }),
}

const runtimeInvoker: ProjectSnapshotRuntimeInvoker = {
  reflect: async (snapshot, seq = 1) => createRuntimeEvidenceEnvelope({
    snapshot,
    operationKind: 'reflect',
    opSeq: seq,
    operationEvents: [],
    artifactRefs: [],
    evidenceGaps: [],
  }),
  run: async (snapshot, seq = 1) => {
    const runId = `${snapshot.projectId}:run:r${snapshot.revision}:op${seq}`
    if (snapshot.projectId === 'logix-react.diagnostics.run-failure') {
      return createRuntimeEvidenceEnvelope({
        snapshot,
        operationKind: 'run',
        opSeq: seq,
        runtimeOutput: {
          kind: 'runtimeOutput',
          operation: 'run',
          status: 'failed',
          runId,
          failure: { kind: 'runtime', message: 'run failure demo' },
        },
        operationEvents: [],
        artifactRefs: [],
        evidenceGaps: [],
      })
    }

    const isUndefined = snapshot.projectId === 'logix-react.diagnostics.run-undefined-value'
    return createRuntimeEvidenceEnvelope({
      snapshot,
      operationKind: 'run',
      opSeq: seq,
      runtimeOutput: {
        kind: 'runtimeOutput',
        operation: 'run',
        status: 'passed',
        runId,
        value: null,
        valueKind: isUndefined ? 'undefined' : 'null',
        lossy: isUndefined,
        ...(isUndefined ? { lossReasons: ['undefined-to-null'] } : null),
      },
      operationEvents: [],
      artifactRefs: [],
      evidenceGaps: [],
    })
  },
  dispatch: async (input) => createRuntimeEvidenceEnvelope({
    snapshot: input.snapshot,
    operationKind: 'dispatch',
    opSeq: input.operationSeq,
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

const PlaygroundHarness = ({ route }: { readonly route: string }) => (
  <ProgramSessionRunnerProvider runner={runner} runtimeInvoker={runtimeInvoker}>
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/playground/:id" element={<LogixReactPlaygroundRoute />} />
      </Routes>
    </MemoryRouter>
  </ProgramSessionRunnerProvider>
)

const clickRun = (screen: ReturnType<typeof render> extends Promise<infer R> ? R : never): void => {
  const element = screen
    .getByLabelText('Workbench command bar')
    .getByRole('button', { name: 'Run', exact: true })
    .element()
  if (!(element instanceof HTMLElement)) throw new Error('Run button must be an HTMLElement')
  element.click()
}

beforeEach(() => {
  ;(window as Window & { __LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__?: boolean }).__LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__ = true
})

afterEach(() => {
  delete (window as Window & { __LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__?: boolean }).__LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__
})

test('Run null and undefined routes expose lossiness metadata', async () => {
  const nullScreen = await render(<PlaygroundHarness route="/playground/logix-react.diagnostics.run-null-value" />)
  try {
    clickRun(nullScreen)
    await expect.element(nullScreen.getByText(/"value": null/)).toBeInTheDocument()
    await expect.element(nullScreen.getByText(/"valueKind": "null"/)).toBeInTheDocument()
    await expect.element(nullScreen.getByText(/"lossy": false/)).toBeInTheDocument()
  } finally {
    await cleanup()
  }

  const undefinedScreen = await render(<PlaygroundHarness route="/playground/logix-react.diagnostics.run-undefined-value" />)
  try {
    clickRun(undefinedScreen)
    await expect.element(undefinedScreen.getByText(/"value": null/)).toBeInTheDocument()
    await expect.element(undefinedScreen.getByText(/"valueKind": "undefined"/)).toBeInTheDocument()
    await expect.element(undefinedScreen.getByText(/"lossy": true/)).toBeInTheDocument()
    await expect.element(undefinedScreen.getByText(/undefined-to-null/)).toBeInTheDocument()
  } finally {
    await cleanup()
  }
})

test('Run failure route does not render a successful null value', async () => {
  const screen = await render(<PlaygroundHarness route="/playground/logix-react.diagnostics.run-failure" />)

  try {
    clickRun(screen)
    await expect.element(screen.getByText(/run failure demo/)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Program result' }).element().textContent).not.toContain('"value": null')
  } finally {
    await cleanup()
  }
})
