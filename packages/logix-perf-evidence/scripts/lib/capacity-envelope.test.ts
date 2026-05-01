import { describe, expect, it } from 'vitest'
import { buildCapacityEnvelope, parseStepsLevelsOverride } from './capacity-envelope'

describe('parseStepsLevelsOverride', () => {
  it('解析为升序去重的正整数列表', () => {
    expect(parseStepsLevelsOverride('200, 800,2000,800')).toEqual([200, 800, 2000])
  })

  it('遇到非法值时抛错', () => {
    expect(() => parseStepsLevelsOverride('200,abc,400')).toThrow(/Invalid steps level/)
  })

  it('空字符串返回 undefined', () => {
    expect(parseStepsLevelsOverride('   ')).toBeUndefined()
  })
})

describe('buildCapacityEnvelope', () => {
  it('按 dirtyRootsRatio 输出 maxLevel 包络与汇总指标', () => {
    const out = buildCapacityEnvelope({
      suiteId: 'converge.txnCommit',
      budgetId: 'commit.p95<=50ms',
      scope: {
        convergeMode: 'auto',
      },
      stepsLevels: [200, 400, 800, 1600, 3200],
      thresholds: [
        {
          budget: { id: 'commit.p95<=50ms' },
          where: { convergeMode: 'auto', dirtyRootsRatio: 0.1 },
          maxLevel: 3200,
          firstFailLevel: null,
        },
        {
          budget: { id: 'commit.p95<=50ms' },
          where: { convergeMode: 'auto', dirtyRootsRatio: 0.5 },
          maxLevel: 1600,
          firstFailLevel: 3200,
          reason: 'budgetExceeded',
        },
        {
          budget: { id: 'commit.p95<=50ms' },
          where: { convergeMode: 'auto', dirtyRootsRatio: 1 },
          maxLevel: 800,
          firstFailLevel: 1600,
          reason: 'budgetExceeded',
        },
      ],
    })

    expect(out.envelope).toEqual([
      { dirtyRootsRatio: 0.1, maxLevel: 3200, firstFailLevel: null, reason: undefined },
      { dirtyRootsRatio: 0.5, maxLevel: 1600, firstFailLevel: 3200, reason: 'budgetExceeded' },
      { dirtyRootsRatio: 1, maxLevel: 800, firstFailLevel: 1600, reason: 'budgetExceeded' },
    ])

    expect(out.summary.floorMaxLevel).toBe(800)
    expect(out.summary.p50MaxLevel).toBe(1600)
    expect(out.summary.p90MaxLevel).toBe(3200)
    expect(out.summary.maxObservedLevel).toBe(3200)
    expect(out.summary.areaUnderCurveNormalized).toBeCloseTo(0.5875, 5)
    expect(out.summary.bottlenecks[0]).toEqual({ dirtyRootsRatio: 1, maxLevel: 800 })
  })
})
