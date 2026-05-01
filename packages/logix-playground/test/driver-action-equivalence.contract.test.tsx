import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { definePlaygroundProject } from '../src/Project.js'
import { PlaygroundPage } from '../src/Playground.js'
import type { ProgramSessionRunner } from '../src/internal/runner/programSessionRunner.js'
import { ProgramSessionRunnerProvider } from '../src/internal/runner/programSessionRunnerContext.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'
import { makeRuntimeInvokerWithCounterReflection } from './support/runtimeInvokerFixtures.js'

const projectWithUnknownDriver = definePlaygroundProject({
  ...localCounterProjectFixture,
  drivers: [
    ...(localCounterProjectFixture.drivers ?? []),
    {
      id: 'unknown-driver',
      label: 'Unknown driver',
      operation: 'dispatch' as const,
      actionTag: 'unknown',
      payload: { kind: 'void' as const },
    },
  ],
})

describe('Driver and action dispatch equivalence', () => {
  beforeEach(() => {
    window.__LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__ = true
  })

  afterEach(() => {
    delete window.__LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__
  })

  it('runs action and driver buttons through the same manifest-backed session dispatch path', async () => {
    const dispatchCalls: Array<ReadonlyArray<string>> = []
    const runner: ProgramSessionRunner = {
      dispatch: async (input) => {
        dispatchCalls.push(input.actions.map((action) => action._tag))
        return {
          state: { count: input.actions.length },
          logs: input.actions.map((action) => ({ level: 'info', message: `dispatch ${action._tag}`, source: 'runner' })),
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
      expect(screen.getByRole('button', { name: 'Dispatch increment' })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Dispatch increment' }))
    await waitFor(() => {
      expect(screen.getByLabelText('Program state').textContent).toContain('"count": 1')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Drivers' }))
    fireEvent.click(screen.getByRole('button', { name: 'Run driver Increase' }))
    fireEvent.click(screen.getByRole('button', { name: 'Result' }))

    await waitFor(() => {
      expect(screen.getByLabelText('Program state').textContent).toContain('"count": 2')
    })
    expect(dispatchCalls).toEqual([['increment'], ['increment', 'increment']])
    expect(screen.getByRole('region', { name: 'Workbench bottom console' }).textContent).toContain('dispatch completed increment')
  })

  it('disables drivers whose action tag is absent from runtime reflection manifest', async () => {
    const dispatched: Array<unknown> = []
    const runner: ProgramSessionRunner = {
      dispatch: async (input) => {
        dispatched.push(input.actions[input.actions.length - 1])
        return {
          state: { count: input.actions.length },
          logs: [],
          traces: [],
        }
      },
    }

    render(
      <ProgramSessionRunnerProvider runner={runner} runtimeInvoker={makeRuntimeInvokerWithCounterReflection()}>
        <PlaygroundPage
          registry={[projectWithUnknownDriver]}
          projectId="logix-react.local-counter"
        />
      </ProgramSessionRunnerProvider>,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Drivers' })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Drivers' }))
    const driversRegion = screen.getByRole('region', { name: 'Drivers' })
    const unknownDriver = within(driversRegion).getByRole('button', { name: 'Run driver Unknown driver' })

    expect(unknownDriver).toHaveProperty('disabled', true)
    expect(within(driversRegion).getByText('unknown')).toBeTruthy()
    expect(within(driversRegion).getByText('Unavailable action')).toBeTruthy()

    fireEvent.click(unknownDriver)
    expect(dispatched).toEqual([])
    expect(screen.getByRole('region', { name: 'Workbench bottom console' }).textContent).not.toContain('dispatch accepted unknown')
  })
})
