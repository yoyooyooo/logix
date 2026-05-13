import { describe, expect, it } from 'vitest'
import { buildDispatchShellTaxReport, renderDispatchShellTaxReportMarkdown, type PerfDiffLike } from './ci.dispatch-shell-tax-report'

const baseDiff = (overrides: Partial<PerfDiffLike> = {}): PerfDiffLike => ({
  schemaVersion: 1,
  meta: {
    comparability: {
      comparable: true,
      allowConfigDrift: false,
      allowEnvDrift: false,
      configMismatches: [],
      envMismatches: [],
      warnings: [],
    },
  },
  summary: {
    regressions: 0,
    improvements: 1,
    budgetViolations: 0,
  },
  suites: [
    {
      id: 'dispatchShell.fixedCost',
      metricDeltas: [
        {
          metric: 'runtime.txnCommitMs',
          unit: 'ms',
          compared: 2,
          missing: 0,
          unavailable: 0,
          topRegressions: [],
          topImprovements: [
            {
              params: { stateWidth: 128, entrypointMode: 'reuseScope' },
              deltaMs: { medianMs: -1.1, p95Ms: -2.2 },
              ratio: { median: 0.8, p95: 0.75 },
            },
          ],
        },
      ],
      evidenceDeltas: [
        {
          name: 'runtime.txnPhase.bodyShellMs',
          unit: 'count',
          scope: 'points',
          before: { ok: 2, unavailable: 0, missing: 0, value: 5 },
          after: { ok: 2, unavailable: 0, missing: 0, value: 2 },
          message: 'body shell improved',
        },
        {
          name: 'runtime.txnPhase.commitPublishCommitMs',
          unit: 'count',
          scope: 'points',
          before: { ok: 2, unavailable: 0, missing: 0, value: 4 },
          after: { ok: 2, unavailable: 0, missing: 0, value: 3.9 },
          message: 'commit stable',
        },
      ],
    },
  ],
  ...overrides,
})

describe('ci.dispatch-shell-tax-report', () => {
  it('allows a hard tax_removed claim for comparable default diff with zero regressions and lower total/phase cost', () => {
    const report = buildDispatchShellTaxReport({
      diff: baseDiff(),
      profile: 'default',
    })

    expect(report.claimStrength).toBe('hard')
    expect(report.classification).toBe('tax_removed')
    expect(report.gates).toContainEqual(expect.objectContaining({ id: 'comparable', passed: true }))
    expect(report.phaseFindings).toContainEqual(
      expect.objectContaining({
        name: 'runtime.txnPhase.bodyShellMs',
        interpretation: 'removed',
      }),
    )
  })

  it('classifies lower total with another phase increase as tax_migrated', () => {
    const report = buildDispatchShellTaxReport({
      diff: baseDiff({
        suites: [
          {
            id: 'dispatchShell.fixedCost',
            metricDeltas: baseDiff().suites[0]!.metricDeltas,
            evidenceDeltas: [
              {
                name: 'runtime.txnPhase.bodyShellMs',
                unit: 'count',
                scope: 'points',
                before: { ok: 2, unavailable: 0, missing: 0, value: 5 },
                after: { ok: 2, unavailable: 0, missing: 0, value: 2 },
                message: 'body shell improved',
              },
              {
                name: 'runtime.txnPhase.commitPublishCommitMs',
                unit: 'count',
                scope: 'points',
                before: { ok: 2, unavailable: 0, missing: 0, value: 4 },
                after: { ok: 2, unavailable: 0, missing: 0, value: 4.8 },
                message: 'commit grew',
              },
            ],
          },
        ],
      }),
      profile: 'soak',
    })

    expect(report.claimStrength).toBe('hard')
    expect(report.classification).toBe('tax_migrated')
    expect(report.phaseFindings).toContainEqual(
      expect.objectContaining({
        name: 'runtime.txnPhase.commitPublishCommitMs',
        interpretation: 'increased',
      }),
    )
  })

  it('marks quick or drifted evidence as clue only even when the numbers improve', () => {
    const quick = buildDispatchShellTaxReport({
      diff: baseDiff(),
      profile: 'quick',
    })

    const drifted = buildDispatchShellTaxReport({
      diff: baseDiff({
        meta: {
          comparability: {
            comparable: false,
            allowConfigDrift: true,
            allowEnvDrift: false,
            configMismatches: ['runs: before=25 after=30'],
            envMismatches: [],
            warnings: [],
          },
        },
      }),
      profile: 'default',
    })

    expect(quick.classification).toBe('inconclusive')
    expect(quick.claimStrength).toBe('clue')
    expect(quick.blockers).toContain('profile=quick is clue-only; hard claims require default or soak')

    expect(drifted.classification).toBe('inconclusive')
    expect(drifted.claimStrength).toBe('clue')
    expect(drifted.blockers).toContain('diff comparability is false')
  })

  it('fails reports with regressions, missing phase evidence, or timeout markers', () => {
    const report = buildDispatchShellTaxReport({
      diff: baseDiff({
        summary: {
          regressions: 1,
          improvements: 1,
          budgetViolations: 0,
        },
        suites: [
          {
            id: 'dispatchShell.fixedCost',
            notes: 'timeout observed',
            metricDeltas: baseDiff().suites[0]!.metricDeltas,
            evidenceDeltas: [
              {
                name: 'runtime.txnPhase.bodyShellMs',
                unit: 'count',
                scope: 'points',
                before: { ok: 0, unavailable: 0, missing: 2 },
                after: { ok: 0, unavailable: 0, missing: 2 },
                message: 'missing',
              },
            ],
          },
        ],
      }),
      profile: 'default',
    })

    expect(report.classification).toBe('failed')
    expect(report.claimStrength).toBe('none')
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        'summary.regressions must be 0 for a hard claim',
        'dispatchShell.fixedCost has timeout/failed marker',
        'phase evidence is missing or unavailable',
      ]),
    )
  })

  it('renders a markdown report with classification and gate outcomes', () => {
    const report = buildDispatchShellTaxReport({ diff: baseDiff(), profile: 'default' })
    const markdown = renderDispatchShellTaxReportMarkdown(report)

    expect(markdown).toContain('classification: `tax_removed`')
    expect(markdown).toContain('claimStrength: `hard`')
    expect(markdown).toContain('comparable')
    expect(markdown).toContain('runtime.txnPhase.bodyShellMs')
  })
})
