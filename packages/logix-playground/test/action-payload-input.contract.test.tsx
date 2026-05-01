import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PlaygroundPage } from '../src/Playground.js'
import { parseActionPayloadInput } from '../src/internal/action/payloadInput.js'
import type { ProgramSessionRunner } from '../src/internal/runner/programSessionRunner.js'
import { ProgramSessionRunnerProvider } from '../src/internal/runner/programSessionRunnerContext.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'
import { makeRuntimeInvokerWithCounterReflection } from './support/runtimeInvokerFixtures.js'

describe('Action payload input', () => {
  beforeEach(() => {
    window.__LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__ = true
  })

  afterEach(() => {
    delete window.__LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__
  })

  it('parses JSON payloads with bounded errors', () => {
    expect(parseActionPayloadInput('3')).toEqual({ success: true, value: 3 })
    expect(parseActionPayloadInput('{')).toMatchObject({ success: false })
    expect(parseActionPayloadInput('"'.padEnd(9_000, 'x'))).toMatchObject({
      success: false,
      message: 'Payload exceeds 8192 bytes.',
    })
  })

  it('keeps JSON text parse failures local to the Playground input parser', () => {
    const parsed = parseActionPayloadInput('{')

    expect(parsed).toMatchObject({ success: false })
    if (parsed.success) throw new Error('expected parse failure')
    expect(parsed.message).toContain('Expected')
    expect(parsed).not.toHaveProperty('issues')
    expect(parsed.message).not.toContain('invalid_type')
    expect(parsed.message).not.toContain('missing_key')
  })

  it('dispatches non-void actions only after payload parses', async () => {
    const dispatched: Array<unknown> = []
    const runner: ProgramSessionRunner = {
      dispatch: async (input) => {
        const lastAction = input.actions[input.actions.length - 1]
        dispatched.push(lastAction)
        return {
          state: { count: lastAction?.payload },
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
      expect(screen.getAllByText('logix-react.local-counter:r0:s1').length).toBeGreaterThan(0)
    })

    fireEvent.change(screen.getByLabelText('Payload for setCount'), { target: { value: '{' } })
    fireEvent.click(screen.getByRole('button', { name: 'Dispatch setCount' }))
    expect(dispatched).toEqual([])
    expect(screen.getByRole('alert').textContent).toContain('Expected')

    fireEvent.change(screen.getByLabelText('Payload for setCount'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Dispatch setCount' }))

    await waitFor(() => {
      expect(dispatched).toEqual([{ _tag: 'setCount', payload: 3 }])
      expect(screen.getByLabelText('Program state').textContent).toContain('"count": 3')
    })
  })
})
