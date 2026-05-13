import { describe, expect, it, vi } from 'vitest'
import type { PlaygroundDriver, PlaygroundScenario } from '../../Project.js'
import { runScenario } from './scenarioRunner.js'

const setCountDriver: PlaygroundDriver = {
  id: 'set-count',
  label: 'Set count',
  operation: 'dispatch',
  actionTag: 'setCount',
  payload: { kind: 'json', value: 1 },
}

describe('scenarioRunner', () => {
  it('maps driver steps to existing session actions and allows scenario payload override', async () => {
    const dispatched: Array<{ readonly _tag: string; readonly payload?: unknown }> = []
    const scenario: PlaygroundScenario = {
      id: 'counter-demo',
      label: 'Counter demo',
      steps: [
        { id: 'set-count-to-seven', kind: 'driver', driverId: 'set-count', payload: 7 },
      ],
    }

    const result = await runScenario({
      scenario,
      scenarioRunId: 'scenario-run-1',
      drivers: [setCountDriver],
      dispatchAction: async (action) => {
        dispatched.push(action)
      },
    })

    expect(dispatched).toEqual([{ _tag: 'setCount', payload: 7 }])
    expect(result.status).toBe('passed')
    expect(result.stepResults).toMatchObject([
      { stepId: 'set-count-to-seven', kind: 'driver', status: 'passed' },
    ])
  })

  it('bounds settle steps with scenario-timeout product failures', async () => {
    vi.useFakeTimers()
    const scenario: PlaygroundScenario = {
      id: 'timeout-demo',
      label: 'Timeout demo',
      steps: [
        { id: 'settle-runtime', kind: 'settle', timeoutMs: 25 },
        { id: 'after-timeout', kind: 'observe', target: 'state' },
      ],
    }

    try {
      const pending = runScenario({
        scenario,
        scenarioRunId: 'scenario-run-timeout',
        drivers: [],
        settle: () => new Promise(() => {}),
      })

      await vi.advanceTimersByTimeAsync(26)
      const result = await pending

      expect(result.status).toBe('failed')
      expect(result.failure).toMatchObject({
        kind: 'scenario-timeout',
        classification: 'product-failure',
      })
      expect(result.stepResults).toMatchObject([
        { stepId: 'settle-runtime', kind: 'settle', status: 'failed' },
      ])
      expect(result.stepResults).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('classifies expectation mismatch as product failure without control-plane report shape', async () => {
    const scenario: PlaygroundScenario = {
      id: 'expect-demo',
      label: 'Expect demo',
      steps: [
        { id: 'expect-count', kind: 'expect', target: 'state', assertion: 'equals', value: { count: 2 } },
      ],
    }

    const result = await runScenario({
      scenario,
      scenarioRunId: 'scenario-run-expect',
      drivers: [],
      read: (target) => target === 'state' ? { count: 1 } : undefined,
    })

    expect(result.status).toBe('failed')
    expect(result.failure).toMatchObject({
      kind: 'scenario-expectation',
      classification: 'product-failure',
    })
    expect(JSON.stringify(result)).not.toContain('controlPlaneReport')
    expect(JSON.stringify(result)).not.toContain('verdict')
  })
})
