import { describe, expect, it } from 'vitest'
import {
  classifyExamplesPlaygroundIsolation,
  renderExamplesPlaygroundIsolationMarkdown,
  type ExamplesPlaygroundIsolationInput,
} from './ci.examples-playground-isolation-report.js'

const cleanInput = (overrides: Partial<ExamplesPlaygroundIsolationInput> = {}): ExamplesPlaygroundIsolationInput => ({
  schemaVersion: 1,
  generatedAt: '2026-05-12T00:00:00.000Z',
  profile: 'default',
  runtime: {
    status: 'pass',
    kernelOnly: true,
    publicResidueViolation: 0,
    evidenceRef: 'specs/234-p2-examples-playground-perf-isolation/perf/runtime.default.json',
  },
  playground: {
    status: 'pass',
    productCostSeparated: true,
    kernelPlaygroundCostMixed: 0,
    evidenceRef: 'specs/234-p2-examples-playground-perf-isolation/perf/playground.default.json',
  },
  ...overrides,
})

describe('ci.examples-playground-isolation-report', () => {
  it('classifies isolated default evidence as hard', () => {
    const report = classifyExamplesPlaygroundIsolation(cleanInput())

    expect(report.classification).toBe('isolated')
    expect(report.claimStrength).toBe('hard')
    expect(report.counters['examples.kernelPlaygroundCostMixed']).toBe(0)
    expect(report.counters['examples.publicResidueViolation']).toBe(0)
    expect(report.blockers).toEqual([])
  })

  it('keeps quick evidence provisional', () => {
    const report = classifyExamplesPlaygroundIsolation(cleanInput({ profile: 'quick' }))

    expect(report.classification).toBe('provisional')
    expect(report.claimStrength).toBe('clue')
    expect(report.forbiddenClaims).toContain('Quick/smoke example evidence proves release-safe performance.')
  })

  it('blocks mixed playground cost even when suites pass', () => {
    const report = classifyExamplesPlaygroundIsolation(
      cleanInput({ playground: { status: 'pass', productCostSeparated: false, kernelPlaygroundCostMixed: 1 } }),
    )

    expect(report.classification).toBe('blocked')
    expect(report.blockers.join('\n')).toContain('examples.kernelPlaygroundCostMixed=1')
    expect(report.blockers.join('\n')).toContain('productCostSeparated=true')
  })

  it('marks missing counters as incomplete rather than pass', () => {
    const report = classifyExamplesPlaygroundIsolation(
      cleanInput({ runtime: { status: 'pass', kernelOnly: true }, playground: { status: 'pass', productCostSeparated: true } }),
    )

    expect(report.classification).toBe('incomplete')
    expect(report.missingEvidence.join('\n')).toContain('examples.kernelPlaygroundCostMixed counter is missing')
    expect(report.missingEvidence.join('\n')).toContain('examples.publicResidueViolation counter is missing')
  })

  it('renders boundaries', () => {
    const markdown = renderExamplesPlaygroundIsolationMarkdown(classifyExamplesPlaygroundIsolation(cleanInput({ profile: 'quick' })))

    expect(markdown).toContain('UNKNOWN/missing is not PASS')
    expect(markdown).toContain('product playground/editor costs')
    expect(markdown).toContain('Forbidden Claims')
  })
})
