import { test, expect } from 'vitest'
import { computeSuiteThresholds, type PointResult, type Budget } from '../browser/perf-boundaries/harness.js'

const PREFLIGHT = process.env.LOGIX_PREFLIGHT === '1'
const preflight = PREFLIGHT ? test : test.skip

const okPoint = (params: Record<string, string | number | boolean>, p95Ms: number): PointResult => ({
  params,
  status: 'ok',
  metrics: [
    {
      name: 'm',
      unit: 'ms',
      status: 'ok',
      stats: { n: 1, medianMs: p95Ms, p95Ms },
    },
  ],
})

preflight('relative budget pairing: missing numerator is unavailable (not regression)', () => {
  const suiteSpec = {
    primaryAxis: 'n',
    axes: {
      n: [1, 2, 3],
      mode: ['full', 'auto'],
    },
  } as const

  const budgets: ReadonlyArray<Budget> = [
    {
      id: 'abs<=25',
      type: 'absolute',
      metric: 'm',
      p95Ms: 25,
    },
    {
      id: 'auto<=full*1.1',
      type: 'relative',
      metric: 'm',
      maxRatio: 1.1,
      numeratorRef: 'mode=auto',
      denominatorRef: 'mode=full',
    },
  ]

  const points: ReadonlyArray<PointResult> = [
    okPoint({ mode: 'full', n: 1 }, 10),
    okPoint({ mode: 'full', n: 2 }, 20),
    okPoint({ mode: 'full', n: 3 }, 30),
    okPoint({ mode: 'auto', n: 1 }, 10.5),
    okPoint({ mode: 'auto', n: 2 }, 21),
    // n=3 auto missing
  ]

  const thresholds = computeSuiteThresholds(suiteSpec as any, points, budgets as any)

  const absFull = thresholds.find((t) => (t.budget as any).id === 'abs<=25' && (t.where as any)?.mode === 'full')
  expect(absFull?.maxLevel).toBe(2)
  expect(absFull?.firstFailLevel).toBe(3)
  expect(absFull?.reason).toBe('budgetExceeded')

  const rel = thresholds.find((t) => (t.budget as any).id === 'auto<=full*1.1')
  expect(rel?.maxLevel).toBe(2)
  expect(rel?.firstFailLevel).toBe(3)
  expect(rel?.reason).toBe('missingNumerator')
})

preflight('relative budget pairing: skipped numerator propagates explicit reason', () => {
  const suiteSpec = {
    primaryAxis: 'n',
    axes: {
      n: [1],
      mode: ['full', 'auto'],
    },
  } as const

  const budgets: ReadonlyArray<Budget> = [
    {
      id: 'auto<=full*1.1',
      type: 'relative',
      metric: 'm',
      maxRatio: 1.1,
      numeratorRef: 'mode=auto',
      denominatorRef: 'mode=full',
    },
  ]

  const points: ReadonlyArray<PointResult> = [
    okPoint({ mode: 'full', n: 1 }, 10),
    {
      params: { mode: 'auto', n: 1 },
      status: 'skipped',
      reason: 'convergeModeAutoNotImplemented',
      metrics: [{ name: 'm', unit: 'ms', status: 'unavailable', unavailableReason: 'skipped' }],
    },
  ]

  const thresholds = computeSuiteThresholds(suiteSpec as any, points, budgets as any)
  const rel = thresholds.find((t) => (t.budget as any).id === 'auto<=full*1.1')
  expect(rel?.maxLevel).toBe(null)
  expect(rel?.firstFailLevel).toBe(1)
  expect(rel?.reason).toBe('numerator:convergeModeAutoNotImplemented')
})
