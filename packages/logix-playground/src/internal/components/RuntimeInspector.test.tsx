import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PlaygroundPage } from '../../Playground.js'
import type { ActionPanelViewModel } from '../action/actionManifest.js'
import { createProjectSnapshot } from '../snapshot/projectSnapshot.js'
import { createPlaygroundWorkspace } from '../session/workspace.js'
import type { ProgramPanelRunState } from '../state/workbenchTypes.js'
import { createProgramSessionRunner, type ProgramSessionRunner } from '../runner/programSessionRunner.js'
import { ProgramSessionRunnerProvider } from '../runner/programSessionRunnerContext.js'
import { localCounterProjectFixture } from '../../../test/support/projectFixtures.js'
import { makeCheckImportFailureState, makeTrialMissingConfigState } from '../../../test/support/controlPlaneDiagnosticFixtures.js'
import { makeRuntimeInvokerWithCounterReflection } from '../../../test/support/runtimeInvokerFixtures.js'
import { RuntimeInspector } from './RuntimeInspector.js'

const emptyActionManifest: ActionPanelViewModel = {
  projectId: 'logix-react.local-counter',
  revision: 0,
  authorityStatus: 'unavailable',
  evidenceGaps: [],
  actions: [],
}

const idleRunState: ProgramPanelRunState = { status: 'idle' }

describe('RuntimeInspector drivers', () => {
  beforeEach(() => {
    window.__LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__ = true
  })

  afterEach(() => {
    delete window.__LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__
  })

  it('renders curated drivers and keeps raw dispatch advanced-only', async () => {
    const dispatched: Array<ReadonlyArray<string>> = []
    const runner: ProgramSessionRunner = {
      dispatch: async (input) => {
        dispatched.push(input.actions.map((action) => action._tag))
        return {
          state: { count: input.actions.length },
          logs: input.actions.map((action) => ({ level: 'info', message: `driver ${action._tag}`, source: 'runner' })),
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

    expect(screen.queryByRole('region', { name: 'Raw dispatch' })).toBeNull()

    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'Drivers' })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Run driver Increase' }))

    await waitFor(() => {
      expect(dispatched).toEqual([['increment']])
      expect(screen.getByLabelText('Program state').textContent).toContain('"count": 1')
    })
  })

  it('keeps one runner dispatch log per driver click when the runner replays action history', async () => {
    const runner = createProgramSessionRunner({
      transport: {
        init: async () => {},
        compile: async () => ({ success: true }),
        run: async ({ runId }) => {
          const opSeq = Number(runId.match(/:op(\d+)$/)?.[1] ?? 0)
          return {
            stateSnapshot: {
              state: { count: opSeq },
              logs: Array.from({ length: opSeq }, () => ({
                level: 'info' as const,
                message: 'dispatch increment',
                source: 'runner' as const,
              })),
            },
          }
        },
        trial: async () => ({ stateSnapshot: undefined }),
      },
    })

    render(
      <ProgramSessionRunnerProvider runner={runner} runtimeInvoker={makeRuntimeInvokerWithCounterReflection()}>
        <PlaygroundPage
          registry={[localCounterProjectFixture]}
          projectId="logix-react.local-counter"
        />
      </ProgramSessionRunnerProvider>,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Run driver Increase' })).toBeTruthy()
    })

    for (const count of [1, 2, 3]) {
      fireEvent.click(screen.getByRole('button', { name: 'Run driver Increase' }))
      await waitFor(() => {
        expect(screen.getByLabelText('Program state').textContent).toContain(`"count": ${count}`)
      })
    }

    const consoleText = screen.getByRole('region', { name: 'Workbench bottom console' }).textContent ?? ''
    expect(consoleText.match(/\[info\] runner op\d+: dispatch increment/g) ?? []).toHaveLength(3)
    expect(consoleText).toContain('[info] runner op3: dispatch increment')
  })

  it('renders scenario playback controls when project metadata exists', async () => {
    const runner: ProgramSessionRunner = {
      dispatch: async (input) => ({
        state: { count: input.actions.length },
        logs: [],
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
      expect(screen.getByRole('region', { name: 'Scenarios' })).toBeTruthy()
    })

    expect(screen.getByRole('button', { name: 'Run scenario Counter demo' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Step scenario Counter demo' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Scenarios' }).getAttribute('data-playground-section')).toBe('scenario')
  })

  it('waits for async driver dispatch before scenario expectations read state', async () => {
    const runner: ProgramSessionRunner = {
      dispatch: async (input) => {
        await new Promise((resolve) => setTimeout(resolve, 1))
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
          registry={[localCounterProjectFixture]}
          projectId="logix-react.local-counter"
        />
      </ProgramSessionRunnerProvider>,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Run scenario Counter demo' })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Run scenario Counter demo' }))

    await waitFor(() => {
      expect(screen.getByLabelText('Program state').textContent).toContain('"count": 1')
    })

    await waitFor(() => {
      const detail = screen.getByRole('region', { name: 'Scenario detail' }).textContent ?? ''
      expect(detail).toContain('counter-demo')
      expect(detail).toContain('expect-state')
      expect(detail).toContain('passed')
      expect(detail).not.toContain('scenario-expectation')
      expect(detail).not.toContain('Expected state to be changed')
    })
  })

  it('keeps reflected action authority after reset so scenarios can dispatch', async () => {
    const runner: ProgramSessionRunner = {
      dispatch: async (input) => ({
        state: { count: input.actions.length },
        logs: [],
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
      expect(screen.getByRole('button', { name: 'Reset' })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Run scenario Counter demo' })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    fireEvent.click(screen.getByRole('button', { name: 'Drivers' }))
    fireEvent.click(screen.getByRole('button', { name: 'Run scenario Counter demo' }))

    await waitFor(() => {
      const detail = screen.getByRole('region', { name: 'Scenario detail' }).textContent ?? ''
      expect(detail).toContain('expect-state')
      expect(detail).toContain('expect / passed')
      expect(detail).not.toContain('Unknown action increment')
    })
  })

  it('summarizes diagnostics from real control-plane reports', () => {
    render(
      <RuntimeInspector
        snapshot={createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))}
        session={undefined}
        actionManifest={emptyActionManifest}
        runState={idleRunState}
        checkState={makeCheckImportFailureState()}
        trialStartupState={makeTrialMissingConfigState()}
        checkExpanded={false}
        trialExpanded={false}
        activeTab="diagnostics"
        onActiveTabChange={() => {}}
        advancedDispatchExpanded={false}
        onAdvancedDispatchExpandedChange={() => {}}
        onReset={() => {}}
        onDispatch={() => {}}
        scenarioExecution={{ status: 'idle', stepResults: [] }}
      />,
    )

    const diagnostics = screen.getByRole('region', { name: 'Diagnostics summary' })
    expect(diagnostics.textContent).toContain('errors')
    expect(diagnostics.textContent).toContain('2')
    expect(diagnostics.textContent).toContain('PROGRAM_IMPORT_INVALID')
    expect(diagnostics.textContent).toContain('MissingDependency')
    expect(diagnostics.textContent).not.toContain('Pressure diagnostic')
    expect(diagnostics.textContent).not.toContain('LC-0001')
  })
})
