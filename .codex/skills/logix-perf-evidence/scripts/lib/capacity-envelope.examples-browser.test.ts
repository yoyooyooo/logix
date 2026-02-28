import { describe, expect, it } from 'vitest'

import { buildCapacityEnvelope } from './capacity-envelope'

const scenarioIds = [
  'route-switch',
  'query-list-refresh',
  'form-cascade-validate',
  'dense-interaction-burst',
  'external-push-sync',
] as const

const scenarioIdToLevel = (scenarioId: (typeof scenarioIds)[number]): number => {
  const index = scenarioIds.indexOf(scenarioId)
  if (index < 0) return 0
  return (index + 1) * 1000
}

describe('buildCapacityEnvelope (examples browser scenarios)', () => {
  it('将真实场景阈值切片映射为可比较的容量包络', () => {
    const thresholds = [
      {
        budget: { id: 'commit.p95<=50ms' },
        where: { loadLevel: 'low', dirtyRootsRatio: 0.2 },
        maxLevel: scenarioIdToLevel('external-push-sync'),
        firstFailLevel: null,
      },
      {
        budget: { id: 'commit.p95<=50ms' },
        where: { loadLevel: 'medium', dirtyRootsRatio: 0.6 },
        maxLevel: scenarioIdToLevel('dense-interaction-burst'),
        firstFailLevel: scenarioIdToLevel('external-push-sync'),
        reason: 'budgetExceeded',
      },
      {
        budget: { id: 'commit.p95<=50ms' },
        where: { loadLevel: 'high', dirtyRootsRatio: 1 },
        maxLevel: scenarioIdToLevel('form-cascade-validate'),
        firstFailLevel: scenarioIdToLevel('dense-interaction-burst'),
        reason: 'budgetExceeded',
      },
    ] as const

    const out = buildCapacityEnvelope({
      suiteId: 'examples.logixReact.scenarios',
      budgetId: 'commit.p95<=50ms',
      scope: {},
      stepsLevels: scenarioIds.map((scenarioId) => scenarioIdToLevel(scenarioId)),
      thresholds,
    })

    expect(out.summary.floorMaxLevel).toBe(scenarioIdToLevel('form-cascade-validate'))
    expect(out.summary.p50MaxLevel).toBe(scenarioIdToLevel('dense-interaction-burst'))
    expect(out.summary.maxObservedLevel).toBe(scenarioIdToLevel('external-push-sync'))
    expect(out.summary.bottlenecks[0]).toEqual({
      dirtyRootsRatio: 1,
      maxLevel: scenarioIdToLevel('form-cascade-validate'),
    })
  })
})

