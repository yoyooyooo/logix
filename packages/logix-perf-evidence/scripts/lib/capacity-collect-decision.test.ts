import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { decideCapacityCollectAction } = require('../../../../.github/scripts/lib/logix-perf-capacity-decision.cjs')

describe('logix-perf capacity collect decision', () => {
  it('贴顶时应强制扩容而不是过早收敛', () => {
    const out = decideCapacityCollectAction({
      summary: {
        floorMedianMaxLevel: 6400,
        p90MedianMaxLevel: 7800,
        p95MedianMaxLevel: 7900,
        averageUpperLimit: 7800,
        dirtyRootsRatioCount: 4,
      },
      iteration: 2,
      maxIterations: 5,
      maxLevel: 8000,
      secondLevel: 6400,
      maxLevelCap: 20000,
      minIterationsBeforeEarlyStop: 2,
      targetFloorMin: 6000,
      initialTopLevel: 8000,
      topEnvelopeStable: true,
      boundaryObserved: true,
      topTimeoutCount: 0,
      topSaturationRatio: 0.95,
      minTopHeadroom: 400,
    })

    expect(out.topSaturated).toBe(true)
    expect(out.shouldExtend).toBe(true)
    expect(out.decision).toBe('top_saturated_extend')
  })

  it('达到稳定收敛条件且非贴顶时应停止扩容', () => {
    const out = decideCapacityCollectAction({
      summary: {
        floorMedianMaxLevel: 6200,
        p90MedianMaxLevel: 6400,
        p95MedianMaxLevel: 6500,
        averageUpperLimit: 6200,
        dirtyRootsRatioCount: 4,
      },
      iteration: 3,
      maxIterations: 5,
      maxLevel: 9000,
      secondLevel: 7200,
      maxLevelCap: 20000,
      minIterationsBeforeEarlyStop: 2,
      targetFloorMin: 6000,
      initialTopLevel: 6000,
      topEnvelopeStable: true,
      boundaryObserved: true,
      topTimeoutCount: 0,
      topSaturationRatio: 0.95,
      minTopHeadroom: 400,
    })

    expect(out.topSaturated).toBe(false)
    expect(out.shouldExtend).toBe(false)
    expect(out.decision).toBe('target_floor_stable_enough')
  })
})
