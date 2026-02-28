import { describe, expect, it } from 'vitest'

import { perfScenarioSuites } from '../browser/perf-scenarios/protocol'

describe('perf scenario contract preflight', () => {
  it('registers non-empty suites with unique ids', () => {
    expect(perfScenarioSuites.length).toBeGreaterThan(0)
    const ids = perfScenarioSuites.map((suite) => suite.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('keeps budgets and evidence declarations consistent', () => {
    for (const suite of perfScenarioSuites) {
      expect(suite.metrics.length).toBeGreaterThan(0)
      expect(suite.budgets.length).toBeGreaterThan(0)
      expect(suite.requiredEvidence.length).toBeGreaterThan(0)

      for (const budget of suite.budgets) {
        expect(suite.metrics).toContain(budget.metric)
        if (budget.type === 'relative') {
          expect(budget.numeratorRef.includes('=')).toBe(true)
          expect(budget.denominatorRef.includes('=')).toBe(true)
        }
      }
    }
  })
})
