import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PlaygroundPage } from '../src/Playground.js'
import type { ProgramSessionRunner } from '../src/internal/runner/programSessionRunner.js'
import { ProgramSessionRunnerProvider } from '../src/internal/runner/programSessionRunnerContext.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'
import { makeRuntimeInvokerWithCounterReflection } from './support/runtimeInvokerFixtures.js'

describe('Raw dispatch advanced panel', () => {
  beforeEach(() => {
    window.__LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__ = true
  })

  afterEach(() => {
    delete window.__LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__
  })

  it('keeps raw dispatch hidden by default and dispatches only known actions', async () => {
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
          registry={[localCounterProjectFixture]}
          projectId="logix-react.local-counter"
        />
      </ProgramSessionRunnerProvider>,
    )

    expect(screen.queryByRole('region', { name: 'Raw dispatch' })).toBeNull()

    await waitFor(() => {
      expect(screen.getAllByText('logix-react.local-counter:r0:s1').length).toBeGreaterThan(0)
    })

    const runtimeInspector = screen.getByRole('region', { name: 'Runtime inspector' })
    fireEvent.click(within(runtimeInspector).getByRole('button', { name: 'Actions' }))
    await waitFor(() => {
      expect(within(runtimeInspector).getByRole('button', { name: 'Advanced Show' })).toBeTruthy()
    })
    const actionWorkbench = within(runtimeInspector).getByRole('region', { name: 'Action workbench' })
    fireEvent.click(within(actionWorkbench).getByRole('button', { name: 'Advanced Show' }))
    await waitFor(() => {
      expect(within(actionWorkbench).getByRole('region', { name: 'Raw dispatch' })).toBeTruthy()
      expect(within(actionWorkbench).getByRole('button', { name: 'Advanced Hide' }).getAttribute('aria-expanded')).toBe('true')
    })
    expect(within(actionWorkbench).getByLabelText('Raw action JSON')).toBeTruthy()

    fireEvent.change(within(actionWorkbench).getByLabelText('Raw action JSON'), { target: { value: '{ "_tag": "unknown" }' } })
    fireEvent.click(within(actionWorkbench).getByRole('button', { name: 'Dispatch raw action' }))
    expect(within(actionWorkbench).getByRole('alert').textContent).toContain('Unknown action unknown.')
    expect(dispatched).toEqual([])
    expect(screen.getByRole('region', { name: 'Workbench bottom console' }).textContent).not.toContain('dispatch accepted')

    fireEvent.change(within(actionWorkbench).getByLabelText('Raw action JSON'), { target: { value: '{ "_tag": "increment" }' } })
    fireEvent.click(within(actionWorkbench).getByRole('button', { name: 'Dispatch raw action' }))

    await waitFor(() => {
      expect(dispatched).toEqual([{ _tag: 'increment', payload: undefined }])
    })
    expect(within(runtimeInspector).queryByRole('button', { name: 'State' })).toBeNull()
    await waitFor(() => {
      expect(screen.getByLabelText('Action workbench state preview').textContent).toContain('"count": 1')
    })
  })
})
