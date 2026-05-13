import { describe, expect, it } from 'vitest'
import { buildStepsGridGuardDecision } from './steps-grid-guard'

describe('steps-grid-guard', () => {
  it('matched 时输出成功标记 env', () => {
    const out = buildStepsGridGuardDecision({
      matched: true,
      beforeHash: 'abc',
      afterHash: 'abc',
      summary: 'converge.txnCommit=[2000,3200,4800]',
    })

    expect(out.matched).toBe(true)
    expect(out.envLines).toEqual([
      'PERF_STEPS_GRID_MATCH=1',
      'PERF_STEPS_GRID_HASH=abc',
      'PERF_STEPS_GRID_SUMMARY=converge.txnCommit=[2000,3200,4800]',
    ])
  })

  it('mismatched 时输出降级到 triage 的 env', () => {
    const out = buildStepsGridGuardDecision({
      matched: false,
      beforeHash: 'beforeHash',
      afterHash: 'afterHash',
      summary: 'ignored',
    })

    expect(out.matched).toBe(false)
    expect(out.envLines).toEqual([
      'PERF_STEPS_GRID_MATCH=0',
      'PERF_STEPS_GRID_HASH_BEFORE=beforeHash',
      'PERF_STEPS_GRID_HASH_AFTER=afterHash',
      'PERF_DIFF_MODE=triage',
    ])
  })
})

