import { describe, expect, it } from 'vitest'

import { diagnosticsLevels, findPerfScenario, type DiagnosticsLevel } from './protocol'
import { measureScenarioPoint } from './shared/scenarioHarness'
import { resolvePerfProfileConfig, toSmokeProfile } from './shared/runScenarioSuite'

const readMetricP95 = (point: Awaited<ReturnType<typeof measureScenarioPoint>>, metricName: string): number => {
  const metric = point.metrics.find((entry) => entry.name === metricName)
  if (!metric || metric.status !== 'ok') return Number.NaN
  return metric.stats.p95Ms
}

const readEvidenceNumber = (point: Awaited<ReturnType<typeof measureScenarioPoint>>, name: string): number => {
  const evidence = point.evidence?.find((entry) => entry.name === name)
  if (!evidence || evidence.status !== 'ok') return Number.NaN
  return typeof evidence.value === 'number' ? evidence.value : Number.NaN
}

describe('perf scenario: diagnostics overhead tiers', () => {
  it('off/light/sampled/full 能量化诊断开销分档', async () => {
    const suite = findPerfScenario('query-list-refresh')
    expect(suite).toBeDefined()

    const profile = toSmokeProfile(resolvePerfProfileConfig())
    const points = new Map<DiagnosticsLevel, Awaited<ReturnType<typeof measureScenarioPoint>>>()

    for (const diagnosticsLevel of diagnosticsLevels) {
      const point = await measureScenarioPoint({
        scenarioId: 'query-list-refresh',
        loadLevel: 'medium',
        profile,
        metricNames: suite!.metrics,
        requiredEvidence: suite!.requiredEvidence,
        diagnosticsLevel,
      })
      expect(point.status).toBe('ok')
      points.set(diagnosticsLevel, point)
    }

    const offP95 = readMetricP95(points.get('off')!, 'runtime.txnCommitMs')
    const lightP95 = readMetricP95(points.get('light')!, 'runtime.txnCommitMs')
    const sampledP95 = readMetricP95(points.get('sampled')!, 'runtime.txnCommitMs')
    const fullP95 = readMetricP95(points.get('full')!, 'runtime.txnCommitMs')

    expect(Number.isFinite(offP95)).toBe(true)
    expect(Number.isFinite(lightP95)).toBe(true)
    expect(Number.isFinite(sampledP95)).toBe(true)
    expect(Number.isFinite(fullP95)).toBe(true)
    expect(fullP95).toBeGreaterThanOrEqual(offP95 * 0.7)

    const offRatio = readEvidenceNumber(points.get('off')!, 'diagnostics.overheadRatio')
    const lightRatio = readEvidenceNumber(points.get('light')!, 'diagnostics.overheadRatio')
    const sampledRatio = readEvidenceNumber(points.get('sampled')!, 'diagnostics.overheadRatio')
    const fullRatio = readEvidenceNumber(points.get('full')!, 'diagnostics.overheadRatio')

    expect(offRatio).toBeGreaterThanOrEqual(0)
    expect(lightRatio).toBeGreaterThanOrEqual(offRatio)
    expect(sampledRatio).toBeGreaterThanOrEqual(lightRatio)
    expect(fullRatio).toBeGreaterThanOrEqual(sampledRatio)
  })
})
