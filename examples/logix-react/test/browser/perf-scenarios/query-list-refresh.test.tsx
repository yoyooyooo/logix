import { describe, expect, it } from 'vitest'

import { findPerfScenario, scenarioLoadLevels } from './protocol'
import { measureScenarioPoint } from './shared/scenarioHarness'
import { resolvePerfProfileConfig, runScenarioSuite, toSmokeProfile } from './shared/runScenarioSuite'

describe('perf scenario: query-list-refresh', () => {
  it('runs real query refresh/retry chain with stable budgets', async () => {
    const suite = findPerfScenario('query-list-refresh')
    expect(suite).toBeDefined()

    const profile = toSmokeProfile(resolvePerfProfileConfig())

    const result = await runScenarioSuite({
      suite: suite!,
      points: scenarioLoadLevels.map((loadLevel) => ({ loadLevel })),
      runPoint: async ({ params }) =>
        measureScenarioPoint({
          scenarioId: 'query-list-refresh',
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
