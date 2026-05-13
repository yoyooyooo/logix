import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PlaygroundPage } from '../src/Playground.js'
import type { ProgramSessionRunner } from '../src/internal/runner/programSessionRunner.js'
import { ProgramSessionRunnerProvider } from '../src/internal/runner/programSessionRunnerContext.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'
import { makeRuntimeInvokerWithCounterReflection } from './support/runtimeInvokerFixtures.js'

describe('Program session console', () => {
  beforeEach(() => {
    window.__LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__ = true
  })

  afterEach(() => {
    delete window.__LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__
  })

  it('shows session id, operation seq and dispatch logs', async () => {
    const runner: ProgramSessionRunner = {
      dispatch: async (input) => ({
        state: { count: input.actions.length },
        logs: [
          {
            level: 'info',
            message: `dispatch ${input.actions[input.actions.length - 1]?._tag ?? 'unknown'}`,
            source: 'runner',
            sessionId: input.sessionId,
            operationSeq: input.operationSeq,
          },
        ],
        traces: [],
      }),
    }

    render(
      <ProgramSessionRunnerProvider runner={runner} runtimeInvoker={makeRuntimeInvokerWithCounterReflection()}>
        <PlaygroundPage
          registry={[localCounterProjectFixture]}
          projectId="logix-react.local-counter"
        />
      </ProgramSessionRunnerProvider>,
    )

    await waitFor(() => {
      expect(screen.getAllByText('logix-react.local-counter:r0:s1').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Dispatch increment' }))

    await waitFor(() => {
      const consoleText = screen.getByRole('region', { name: 'Workbench bottom console' }).textContent
      expect(consoleText).toContain('logix-react.local-counter:r0:s1')
      expect(consoleText).toContain('op1')
      expect(consoleText).toContain('dispatch accepted increment')
      expect(consoleText).toContain('dispatch increment')
      expect(consoleText).toContain('dispatch completed increment')
    })
  })
})
