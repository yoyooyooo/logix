import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PlaygroundPage } from '../src/Playground.js'
import type { ProjectSnapshotRuntimeInvoker } from '../src/internal/runner/projectSnapshotRuntimeInvoker.js'
import type { ProgramSessionRunner } from '../src/internal/runner/programSessionRunner.js'
import { ProgramSessionRunnerProvider } from '../src/internal/runner/programSessionRunnerContext.js'
import { makeControlPlaneReport } from './support/controlPlaneFixtures.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'
import { makeRuntimeInvokerWithCounterReflection } from './support/runtimeInvokerFixtures.js'

describe('Host command output', () => {
  beforeEach(() => {
    window.__LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__ = true
  })

  afterEach(() => {
    delete window.__LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__
  })

  it('runs Check and startup Trial through runtime invoker reports', async () => {
    const runner: ProgramSessionRunner = {
      dispatch: async () => ({ state: { count: 0 }, logs: [], traces: [] }),
    }
    const calls: Array<string> = []
    const runtimeInvoker: ProjectSnapshotRuntimeInvoker = makeRuntimeInvokerWithCounterReflection({
      check: async () => {
        calls.push('check')
        return {
          kind: 'runtimeEvidence',
          sourceDigest: 'playground-source:test',
          sourceRevision: 0,
          operationKind: 'check',
          operationCoordinate: { instanceId: 'test:r0', txnSeq: 0, opSeq: 1 },
          controlPlaneReport: makeControlPlaneReport('check', 'static'),
          operationEvents: [],
          sourceRefs: [],
          artifactRefs: [],
          evidenceGaps: [],
        }
      },
      trialStartup: async () => {
        calls.push('trialStartup')
        return {
          kind: 'runtimeEvidence',
          sourceDigest: 'playground-source:test',
          sourceRevision: 0,
          operationKind: 'trialStartup',
          operationCoordinate: { instanceId: 'test:r0', txnSeq: 0, opSeq: 2 },
          controlPlaneReport: makeControlPlaneReport('trial', 'startup'),
          operationEvents: [],
          sourceRefs: [],
          artifactRefs: [],
          evidenceGaps: [],
        }
      },
    })

    render(
      <ProgramSessionRunnerProvider runner={runner} runtimeInvoker={runtimeInvoker}>
        <PlaygroundPage
          registry={[localCounterProjectFixture]}
          projectId="logix-react.local-counter"
        />
      </ProgramSessionRunnerProvider>,
    )

    await waitFor(() => {
      expect(screen.getAllByText('logix-react.local-counter:r0:s1').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Check' }))
    await waitFor(() => {
      const report = screen.getByRole('region', { name: 'Check report' })
      expect(report.textContent).toContain('check passed')
      expect(report.textContent).toContain('PASS')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Trial' }))
    await waitFor(() => {
      const report = screen.getByRole('region', { name: 'Trial report' })
      expect(report.textContent).toContain('trial passed')
      expect(report.textContent).toContain('startup')
    })

    const result = screen.getByRole('region', { name: 'Result' })
    expect(within(result).getByRole('region', { name: 'Check report' }).textContent).toContain('check passed')
    expect(within(result).getByRole('region', { name: 'Trial report' }).textContent).toContain('trial passed')

    const bottom = screen.getByRole('region', { name: 'Workbench bottom console' })
    const consoleText = bottom.textContent ?? ''
    expect(consoleText).not.toContain('dispatch accepted')
    expect(consoleText).not.toContain('runner op')
    expect(calls).toEqual(['check', 'trialStartup'])
  })
})
