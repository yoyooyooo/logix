import { describe, expect, it } from 'vitest'
import { logixReactPlaygroundScenarioMappability } from '../src/playground/scenarioMappability'

describe('Playground scenario mappability guard', () => {
  it('keeps mappability rows non-executable and outside control-plane report shape', () => {
    for (const row of logixReactPlaygroundScenarioMappability) {
      expect(row.authority).toBe('playground-mappability-only')
      expect(row.executable).toBe(false)
      expect(row).not.toHaveProperty('fixtures')
      expect(row).not.toHaveProperty('steps')
      expect(row).not.toHaveProperty('expect')
      expect(row).not.toHaveProperty('verdict')
      expect(row).not.toHaveProperty('artifacts')
      expect(row).not.toHaveProperty('primaryReportOutputKey')
      expect(row).not.toHaveProperty('report')
    }
  })

  it('does not define a second scenario grammar or projection bridge vocabulary', () => {
    const text = JSON.stringify(logixReactPlaygroundScenarioMappability)

    expect(text).not.toContain('ScenarioVerificationFixture')
    expect(text).not.toContain('VerificationControlPlaneReport')
    expect(text).not.toContain('Runtime.trial')
    expect(text).not.toContain('trialReport')
    expect(text).not.toContain('coreExecutor')
    expect(text).not.toContain('projectionBridge')
  })

  it('classifies all current rows as direct, provenance-only, or unsupported', () => {
    const allowed = new Set(['directly-representable', 'provenance-only', 'unsupported'])
    const unsupportedRows = logixReactPlaygroundScenarioMappability.filter(
      (row) => row.classification === 'unsupported',
    )

    expect(logixReactPlaygroundScenarioMappability.length).toBeGreaterThan(0)
    for (const row of logixReactPlaygroundScenarioMappability) {
      expect(allowed.has(row.classification)).toBe(true)
    }
    for (const row of unsupportedRows) {
      expect(row.unsupportedReasons.length).toBeGreaterThan(0)
    }
  })
})
