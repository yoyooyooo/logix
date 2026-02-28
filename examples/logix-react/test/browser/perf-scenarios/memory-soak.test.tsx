import { describe, expect, it } from 'vitest'

import { findPerfScenario } from './protocol'
import { measureScenarioPoint } from './shared/scenarioHarness'
import { resolvePerfProfileConfig, toSmokeProfile } from './shared/runScenarioSuite'

const readEvidenceNumber = (point: Awaited<ReturnType<typeof measureScenarioPoint>>, name: string): number | undefined => {
  const item = point.evidence?.find((entry) => entry.name === name)
  if (!item || item.status !== 'ok') return undefined
  return typeof item.value === 'number' && Number.isFinite(item.value) ? item.value : undefined
}

describe('perf scenario: memory soak', () => {
  it('长时运行可采样 heap 漂移证据', async () => {
    const suite = findPerfScenario('dense-interaction-burst')
    expect(suite).toBeDefined()

    const profile = toSmokeProfile(resolvePerfProfileConfig())
    const point = await measureScenarioPoint({
      scenarioId: 'dense-interaction-burst',
      loadLevel: 'high',
      profile,
      metricNames: suite!.metrics,
      requiredEvidence: suite!.requiredEvidence,
      soakRounds: 6,
    })

    expect(point.status).toBe('ok')

    const heapStart = readEvidenceNumber(point, 'memory.heapStartBytes')
    const heapEnd = readEvidenceNumber(point, 'memory.heapEndBytes')
    const heapDrift = readEvidenceNumber(point, 'memory.heapDriftBytes')
    const heapDriftRatio = readEvidenceNumber(point, 'memory.heapDriftRatio')

    expect(heapStart).toBeDefined()
    expect(heapEnd).toBeDefined()
    expect(heapDrift).toBeDefined()
    expect(heapDriftRatio).toBeDefined()
    expect(Math.abs(heapDriftRatio ?? 0)).toBeLessThan(0.8)
  })
})

