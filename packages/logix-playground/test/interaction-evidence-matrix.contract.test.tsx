import { describe, expect, it } from 'vitest'
import {
  createInteractionEvidenceHarness,
  makeDeferredReplayLogRunner,
  makeReplayLogRunner,
} from './support/interactionEvidenceHarness.js'

describe('Playground interaction evidence matrix', () => {
  it('renders a local counter session through the shared evidence harness', async () => {
    const harness = createInteractionEvidenceHarness({
      runner: makeReplayLogRunner(),
    })

    await harness.render()
    await harness.expectReadySession('logix-react.local-counter:r0:s1')

    expect(harness.consoleText()).toContain('session started logix-react.local-counter:r0:s1')
  })

  it('exposes one current runner dispatch log when action history is replayed', async () => {
    const harness = createInteractionEvidenceHarness({
      runner: makeReplayLogRunner(),
    })

    await harness.render()
    await harness.expectReadySession('logix-react.local-counter:r0:s1')

    await harness.runAction('increment')
    await harness.expectStateCount(1)
    await harness.runAction('increment')
    await harness.expectStateCount(2)

    expect(harness.currentRunnerDispatchLogs()).toEqual([
      '[info] runner op1: dispatch increment',
      '[info] runner op2: dispatch increment',
    ])
  })

  it('routes reflected action and curated driver through the same session evidence path', async () => {
    const harness = createInteractionEvidenceHarness({
      runner: makeReplayLogRunner(),
    })

    await harness.render()
    await harness.expectReadySession('logix-react.local-counter:r0:s1')

    await harness.runAction('increment')
    await harness.expectStateCount(1)
    await harness.runDriver('Increase')
    await harness.expectStateCount(2)

    expect(harness.currentRunnerDispatchLogs()).toEqual([
      '[info] runner op1: dispatch increment',
      '[info] runner op2: dispatch increment',
    ])
    expect(harness.consoleText()).toContain('dispatch accepted increment')
    expect(harness.consoleText()).toContain('dispatch completed increment')
  })

  it('waits for scenario driver dispatch before scenario expectation reads state', async () => {
    const harness = createInteractionEvidenceHarness({
      runner: makeDeferredReplayLogRunner(),
    })

    await harness.render()
    await harness.expectReadySession('logix-react.local-counter:r0:s1')

    await harness.runScenario('Counter demo')
    await harness.expectStateCount(1)

    const scenarioText = await harness.scenarioText()
    expect(scenarioText).toContain('counter-demo')
    expect(scenarioText).toContain('expect-state')
    expect(scenarioText).toContain('passed')
    expect(scenarioText).not.toContain('Expected state to be changed')
  })

  it('records runtime dispatch failure without replacing previous state', async () => {
    const harness = createInteractionEvidenceHarness({
      runner: {
        dispatch: async (input) => {
          if (input.operationSeq === 1) return makeReplayLogRunner().dispatch(input)
          throw { kind: 'runtime', message: 'Missing reducer for action increment' }
        },
      },
    })

    await harness.render()
    await harness.expectReadySession('logix-react.local-counter:r0:s1')

    await harness.runAction('increment')
    await harness.expectStateCount(1)
    await harness.runDriver('Increase')

    await harness.expectConsoleToContain('dispatch failed increment: Missing reducer for action increment')
    expect(harness.stateText()).toContain('"count": 1')
  })

  it('reset clears session action history and old dispatch logs', async () => {
    const harness = createInteractionEvidenceHarness({
      runner: makeReplayLogRunner(),
    })

    await harness.render()
    await harness.expectReadySession('logix-react.local-counter:r0:s1')
    await harness.runDriver('Increase')
    await harness.expectStateCount(1)

    await harness.resetSession()

    await harness.expectConsoleToContain('session auto restarted from logix-react.local-counter:r0:s1')
    expect(harness.consoleText()).not.toContain('dispatch increment')
  })
})
