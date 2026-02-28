import { describe, expect, it } from 'vitest'

import { perfScenarioMatrixSuite, type ScenarioId, type ScenarioLoadLevel } from './protocol'
import { expandScenarioMatrixPoints, measureScenarioPoint } from './shared/scenarioHarness'
import { emitScenarioPerfReport, resolvePerfProfileConfig, runScenarioSuite } from './shared/runScenarioSuite'

describe('perf scenario: examples.logixReact.scenarios report', () => {
  it(
    'collects all scenarioId x loadLevel points and emits LOGIX_PERF_REPORT',
    { timeout: 180_000 },
    async () => {
      const profile = resolvePerfProfileConfig()
      const points = expandScenarioMatrixPoints()

    const suiteResult = await runScenarioSuite({
      suite: perfScenarioMatrixSuite,
      points,
      runPoint: async ({ params }) =>
        measureScenarioPoint({
          scenarioId: params.scenarioId as ScenarioId,
          loadLevel: params.loadLevel as ScenarioLoadLevel,
          profile,
          metricNames: perfScenarioMatrixSuite.metrics,
          requiredEvidence: perfScenarioMatrixSuite.requiredEvidence,
        }),
    })

    expect(suiteResult.points.length).toBe(points.length)
    expect(suiteResult.points.every((point) => point.status === 'ok')).toBe(true)

    emitScenarioPerfReport({
      suites: [suiteResult],
      profile,
      generator: 'examples/logix-react/test/browser/perf-scenarios/suite-report.test.tsx',
    })
    },
  )
})
