import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PlaygroundPage } from '../src/Playground.js'
import type { ProgramSessionRunner } from '../src/internal/runner/programSessionRunner.js'
import { ProgramSessionRunnerProvider } from '../src/internal/runner/programSessionRunnerContext.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'
import { makeRuntimeInvokerWithCounterReflection } from './support/runtimeInvokerFixtures.js'

describe('Action panel dispatch', () => {
  beforeEach(() => {
    window.__LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__ = true
  })

  afterEach(() => {
    delete window.__LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__
  })

  it('clicks reflected actions and shows updated Program state', async () => {
    const dispatchCalls: Array<ReadonlyArray<string>> = []
    const runner: ProgramSessionRunner = {
      dispatch: async (input) => {
        dispatchCalls.push(input.actions.map((action) => action._tag))
        const count = input.actions.reduce((value, action) => {
          if (action._tag === 'increment') return value + 1
          if (action._tag === 'decrement') return value - 1
          return value
        }, 0)

        return {
          state: { count },
          logs: input.actions.map((action) => ({
            level: 'info',
            message: `dispatch ${action._tag}`,
            source: 'runner',
          })),
          traces: [],
        }
      },
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
    expect(screen.queryByRole('button', { name: 'Start session' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Close session' })).toBeNull()
    expect(screen.queryByText('No active session')).toBeNull()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Dispatch increment' })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Dispatch increment' }))

    await waitFor(() => {
      expect(screen.getByLabelText('Program state').textContent).toContain('"count": 1')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Dispatch decrement' }))

    await waitFor(() => {
      expect(screen.getByLabelText('Program state').textContent).toContain('"count": 0')
    })
    expect(screen.getByLabelText('Workbench bottom console').textContent).toContain('dispatch decrement')
    expect(dispatchCalls).toEqual([['increment'], ['increment', 'decrement']])
  })

  it('dispatches once per click under React StrictMode', async () => {
    let dispatchCount = 0
    const runner: ProgramSessionRunner = {
      dispatch: async () => {
        dispatchCount += 1
        return {
          state: { count: dispatchCount },
          logs: [{ level: 'info', message: 'dispatch increment', source: 'runner' }],
          traces: [],
        }
      },
    }

    render(
      <React.StrictMode>
        <ProgramSessionRunnerProvider runner={runner} runtimeInvoker={makeRuntimeInvokerWithCounterReflection()}>
          <PlaygroundPage
            registry={[localCounterProjectFixture]}
            projectId="logix-react.local-counter"
          />
        </ProgramSessionRunnerProvider>
      </React.StrictMode>,
    )

    await waitFor(() => {
      expect(screen.getAllByText('logix-react.local-counter:r0:s1').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Dispatch increment' }))

    await waitFor(() => {
      expect(screen.getByLabelText('Program state').textContent).toContain('"count": 1')
    })
    expect(dispatchCount).toBe(1)
  })

  it('auto restarts the Program session when source changes and clears old dispatch logs', async () => {
    const runner: ProgramSessionRunner = {
      dispatch: async (input) => ({
        state: { count: input.actions.length },
        logs: [{
          level: 'info',
          message: `dispatch ${input.actions[input.actions.length - 1]?._tag ?? 'unknown'}`,
          source: 'runner',
        }],
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
      expect(screen.getByLabelText('Program state').textContent).toContain('"count": 1')
    })

    fireEvent.click(screen.getByRole('button', { name: '/src/logic/localCounter.logic.ts' }))
    await waitFor(() => {
      expect((screen.getByLabelText('Source editor') as HTMLTextAreaElement).value).toContain('counterStep = 1')
    })
    fireEvent.change(screen.getByLabelText('Source editor'), {
      target: { value: 'export const counterStep = 2' },
    })

    await waitFor(() => {
      expect(screen.getAllByText('logix-react.local-counter:r1:s2').length).toBeGreaterThan(0)
      expect(screen.queryByText('Session snapshot r0 is stale after source revision r1.')).toBeNull()
    })

    const consoleText = screen.getByLabelText('Workbench bottom console').textContent ?? ''
    expect(consoleText).toContain('session started logix-react.local-counter:r1:s2')
    expect(consoleText).toContain('session auto restarted from logix-react.local-counter:r0:s1 after source revision r1')
    expect(consoleText).not.toContain('dispatch increment')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Dispatch increment' })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Dispatch increment' }))
    await waitFor(() => {
      expect(screen.getByLabelText('Program state').textContent).toContain('"count": 1')
    })
  })
})
