import { describe, expect, it } from 'vitest'

import { findPerfScenario, scenarioLoadLevels } from './protocol'
import { measureScenarioPoint } from './shared/scenarioHarness'
import { resolvePerfProfileConfig, runScenarioSuite, toSmokeProfile } from './shared/runScenarioSuite'

describe('perf scenario: dense-interaction-burst', () => {
  it('runs real dense burst chain with stable budgets', async () => {
    const suite = findPerfScenario('dense-interaction-burst')
    expect(suite).toBeDefined()

    const profile = toSmokeProfile(resolvePerfProfileConfig())

    const result = await runScenarioSuite({
      suite: suite!,
      points: scenarioLoadLevels.map((loadLevel) => ({ loadLevel })),
      runPoint: async ({ params }) =>
        measureScenarioPoint({
          scenarioId: 'dense-interaction-burst',
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
