import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const {
  createBudgetController,
  detectBudgetZone,
  nextSampleTarget,
} = require('../../../../../.github/scripts/lib/logix-perf-budget-controller.cjs')

describe('logix-perf-budget-controller', () => {
  it('应在触发预留时间后拒绝新采样', () => {
    let now = 0
    const controller = createBudgetController({
      nowMs: () => now,
      timeBudgetMinutes: 1,
      reserveMinutes: 0.25,
      maxTotalCollects: 10,
      minCollectEstimateSeconds: 10,
    })

    // 预算 60s，预留 15s。推进到 34s 后，可用剩余 11s，默认估计采样 10s，允许一次。
    now = 34_000
    const first = controller.canRunCollect()
    expect(first.ok).toBe(true)

    controller.recordCollect({ durationMs: 10_000 })

    // 推进到 36s，剩余 24s，可用剩余仅 9s，< 估计采样时长，应拒绝。
    now = 36_000
    const second = controller.canRunCollect()
    expect(second.ok).toBe(false)
    expect(second.reasonCode).toBe('time_budget_reserve')
  })

  it('应按预算分区动态下调采样数量', () => {
    expect(detectBudgetZone({ remainingRatio: 0.8 })).toBe('green')
    expect(detectBudgetZone({ remainingRatio: 0.35 })).toBe('yellow')
    expect(detectBudgetZone({ remainingRatio: 0.2 })).toBe('orange')
    expect(detectBudgetZone({ remainingRatio: 0.1 })).toBe('red')

    expect(nextSampleTarget({ zone: 'green', samplesPerIteration: 3, minSamplesPerIteration: 1 })).toBe(3)
    expect(nextSampleTarget({ zone: 'yellow', samplesPerIteration: 3, minSamplesPerIteration: 1 })).toBe(2)
    expect(nextSampleTarget({ zone: 'orange', samplesPerIteration: 3, minSamplesPerIteration: 1 })).toBe(1)
    expect(nextSampleTarget({ zone: 'red', samplesPerIteration: 3, minSamplesPerIteration: 1 })).toBe(1)
  })
})
