import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import * as Logix from '../../src/index.js'

describe('ReadQuery.buildGate', () => {
  it('grades a selector at build time and annotates quality metadata', () => {
    const selector = (s: { count: number }) => (s.count > 0 ? s.count : 0)

    const graded = Logix.ReadQuery.gradeReadQueryAtBuild({
      moduleId: 'M',
      input: selector,
      strictGate: {
        mode: 'warn',
      },
      reportId: 'rq_report_manual',
    })

    expect(graded.compiled.quality?.source).toBe('build')
    expect(graded.compiled.quality?.strictGate?.evaluatedAt).toBe('build')
    expect(graded.compiled.quality?.reportId).toBe('rq_report_manual')
    expect(graded.entry.moduleId).toBe('M')
    expect(graded.entry.selectorId).toBe(graded.compiled.selectorId)
    expect(['PASS', 'WARN', 'FAIL']).toContain(graded.entry.strictGateVerdict)
    expect(() => JSON.stringify(graded.entry)).not.toThrow()
  })

  it('builds quality report and marks strict-gate failures in error mode', () => {
    const staticSelector = (s: { count: number }) => s.count
    const dynamicSelector = (s: { count: number }) => (s.count > 0 ? s.count : 0)

    const reportResult = Logix.ReadQuery.buildSelectorQualityReport({
      moduleId: 'M',
      selectors: [staticSelector, dynamicSelector],
      strictGate: {
        mode: 'error',
      },
      generatedAt: '2026-02-25T00:00:00.000Z',
    })

    const { report, graded } = reportResult
    expect(report.reportId).toMatch(/^rq_report_/)
    expect(report.summary.total).toBe(2)
    expect(report.summary.staticCount).toBe(1)
    expect(report.summary.dynamicCount).toBe(1)
    expect(report.summary.failCount).toBe(1)
    expect(Logix.ReadQuery.hasBuildGateFailure(report)).toBe(true)

    for (const item of graded) {
      expect(item.compiled.quality?.source).toBe('build')
      expect(item.compiled.quality?.reportId).toBe(report.reportId)
    }

    expect(() => JSON.stringify(report)).not.toThrow()
  })
})
