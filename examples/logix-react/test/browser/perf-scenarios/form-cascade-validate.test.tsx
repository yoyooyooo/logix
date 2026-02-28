import { describe, expect, it } from 'vitest'

import { findPerfScenario, scenarioLoadLevels } from './protocol'
import { measureScenarioPoint } from './shared/scenarioHarness'
import { resolvePerfProfileConfig, runScenarioSuite, toSmokeProfile } from './shared/runScenarioSuite'

describe('perf scenario: form-cascade-validate', () => {
  it('runs real form cascade/validation chain with stable budgets', async () => {
    const suite = findPerfScenario('form-cascade-validate')
    expect(suite).toBeDefined()

    const profile = toSmokeProfile(resolvePerfProfileConfig())

    const result = await runScenarioSuite({
      suite: suite!,
      points: scenarioLoadLevels.map((loadLevel) => ({ loadLevel })),
      runPoint: async ({ params }) =>
        measureScenarioPoint({
          scenarioId: 'form-cascade-validate',
          loadLevel: params.loadLevel as 'low' | 'medium' | 'high',
          profile,
          metricNames: suite!.metrics,
          requiredEvidence: suite!.requiredEvidence,
        }),
    })

    expect(result.points.every((point) => point.status === 'ok')).toBe(true)
    expect(
      result.thresholds.some((threshold) => threshold.reason === 'budgetExceeded' || threshold.firstFailLevel != null),
    ).toBe(false)
  })
})
