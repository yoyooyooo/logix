import { describe, expect, it } from 'vitest'

import { resolveDiffConclusion } from './shared/runScenarioSuite'

describe('perf scenario diff comparability gate', () => {
  it('comparable=false 时只给 triage 线索，不输出硬结论', () => {
    const result = resolveDiffConclusion({
      comparable: false,
      regressions: 99,
    })

    expect(result.mode).toBe('triage')
    expect(result.verdict).toBe('needs-triage')
    expect(result.reason).toBe('comparability=false')
  })

  it('comparable=true 且有回归时输出硬失败', () => {
    const result = resolveDiffConclusion({
      comparable: true,
      regressions: 1,
    })

    expect(result.mode).toBe('hard')
    expect(result.verdict).toBe('fail')
  })
})

