import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect } from 'vitest'
import { PlaygroundPage } from '../../src/Playground.js'
import type { ProgramSessionRunner } from '../../src/internal/runner/programSessionRunner.js'
import { ProgramSessionRunnerProvider } from '../../src/internal/runner/programSessionRunnerContext.js'
import { localCounterProjectFixture } from './projectFixtures.js'
import { makeRuntimeInvokerWithCounterReflection } from './runtimeInvokerFixtures.js'

export const makeReplayLogRunner = (): ProgramSessionRunner => ({
  dispatch: async (input) => {
    const count = input.actions.reduce((value, action) => {
      if (action._tag === 'increment') return value + 1
      if (action._tag === 'decrement') return value - 1
      return value
    }, 0)
    const currentAction = input.actions[input.actions.length - 1]

    return {
      state: { count },
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
})

export const makeDeferredReplayLogRunner = (delayMs = 1): ProgramSessionRunner => ({
  dispatch: async (input) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
    return makeReplayLogRunner().dispatch(input)
  },
})

export const makeRuntimeFailureRunner = (message = 'boom'): ProgramSessionRunner => ({
  dispatch: async () => {
    throw { kind: 'runtime', message }
  },
})

export const createInteractionEvidenceHarness = (options: {
  readonly runner: ProgramSessionRunner
}) => ({
  render: async () => {
    render(
      <ProgramSessionRunnerProvider runner={options.runner} runtimeInvoker={makeRuntimeInvokerWithCounterReflection()}>
        <PlaygroundPage
          registry={[localCounterProjectFixture]}
          projectId="logix-react.local-counter"
        />
      </ProgramSessionRunnerProvider>,
    )
  },
  expectReadySession: async (sessionId: string) => {
    await waitFor(() => {
      expect(screen.getAllByText(sessionId).length).toBeGreaterThan(0)
    })
  },
  runAction: async (actionTag: string) => {
    fireEvent.click(screen.getByRole('button', { name: `Dispatch ${actionTag}` }))
  },
  runDriver: async (label: string) => {
    fireEvent.click(screen.getByRole('button', { name: `Run driver ${label}` }))
  },
  runScenario: async (label: string) => {
    fireEvent.click(screen.getByRole('button', { name: `Run scenario ${label}` }))
  },
  resetSession: async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
  },
  expectStateCount: async (count: number) => {
    await waitFor(() => {
      expect(screen.getByLabelText('Program state').textContent).toContain(`"count": ${count}`)
    })
  },
  consoleText: () =>
    screen.getByRole('region', { name: 'Workbench bottom console' }).textContent ?? '',
  expectConsoleToContain: async (text: string) => {
    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'Workbench bottom console' }).textContent).toContain(text)
    })
  },
  stateText: () =>
    screen.getByLabelText('Program state').textContent ?? '',
  currentRunnerDispatchLogs: () => {
    const text = screen.getByRole('region', { name: 'Workbench bottom console' }).textContent ?? ''
    return text.match(/\[info\] runner op\d+: dispatch \w+/g) ?? []
  },
  scenarioText: async () => {
    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'Scenario detail' })).toBeTruthy()
    })
    return screen.getByRole('region', { name: 'Scenario detail' }).textContent ?? ''
  },
  bottomDrawer: () =>
    screen.getByRole('region', { name: 'Workbench bottom console' }),
  within,
})
