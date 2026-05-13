import { describe, expect, it } from 'vitest'
import {
  buildSelectorNotifyTaxReport,
  renderSelectorNotifyTaxReportMarkdown,
  type PerfDiffLike,
} from './ci.selector-notify-tax-report'

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
      id: 'runtimeStore.noTearing.tickNotify',
      metricDeltas: [
        {
          metric: 'timePerTickMs',
          unit: 'ms',
          compared: 2,
          missing: 0,
          unavailable: 0,
          topRegressions: [],
          topImprovements: [
            {
              params: { watchers: 256, diagnosticsLevel: 'off' },
              deltaMs: { medianMs: -0.01, p95Ms: -0.02 },
              ratio: { median: 0.8, p95: 0.75 },
            },
          ],
        },
      ],
      evidenceDeltas: [
        {
          name: 'selectorNotify.notifiedTopicCount',
          unit: 'count',
          scope: 'points',
          before: { ok: 2, unavailable: 0, missing: 0, value: 8 },
          after: { ok: 2, unavailable: 0, missing: 0, value: 4 },
        },
        {
          name: 'selectorNotify.renderCount',
          unit: 'count',
          scope: 'points',
          before: { ok: 2, unavailable: 0, missing: 0, value: 10 },
          after: { ok: 2, unavailable: 0, missing: 0, value: 10 },
        },
        {
          name: 'selectorNotify.runSyncFallbackCount',
          unit: 'count',
          scope: 'points',
          before: { ok: 2, unavailable: 0, missing: 0, value: 1 },
          after: { ok: 2, unavailable: 0, missing: 0, value: 0 },
        },
        {
          name: 'selectorNotify.retainedTopicCount',
          unit: 'count',
          scope: 'points',
          before: { ok: 2, unavailable: 0, missing: 0, value: 0 },
          after: { ok: 2, unavailable: 0, missing: 0, value: 0 },
        },
        {
          name: 'selectorNotify.listenerSnapshotCloneCount',
          unit: 'count',
          scope: 'points',
          before: { ok: 2, unavailable: 0, missing: 0, value: 1 },
          after: { ok: 2, unavailable: 0, missing: 0, value: 1 },
        },
        {
          name: 'selectorNotify.broadcastFallbackCount',
          unit: 'count',
          scope: 'points',
          before: { ok: 2, unavailable: 0, missing: 0, value: 0 },
          after: { ok: 2, unavailable: 0, missing: 0, value: 0 },
        },
      ],
    },
  ],
  ...overrides,
})

describe('ci.selector-notify-tax-report', () => {
  it('allows a hard tax_removed claim for comparable default evidence with lower total and clean watched counters', () => {
    const report = buildSelectorNotifyTaxReport({
      diff: baseDiff(),
      profile: 'default',
    })

    expect(report.claimStrength).toBe('hard')
    expect(report.classification).toBe('tax_removed')
    expect(report.gates).toContainEqual(expect.objectContaining({ id: 'comparable', passed: true }))
    expect(report.watchedFindings).toContainEqual(
      expect.objectContaining({
        name: 'selectorNotify.runSyncFallbackCount',
        interpretation: 'removed',
      }),
    )
  })

  it('classifies total improvement with watched counter growth as tax_migrated', () => {
    const suite = baseDiff().suites[0]!
    const report = buildSelectorNotifyTaxReport({
      diff: baseDiff({
        suites: [
          {
            ...suite,
            evidenceDeltas: suite.evidenceDeltas?.map((delta) =>
              delta.name === 'selectorNotify.renderCount'
                ? {
                    ...delta,
                    before: { ok: 2, unavailable: 0, missing: 0, value: 10 },
                    after: { ok: 2, unavailable: 0, missing: 0, value: 12 },
                  }
                : delta,
            ),
          },
        ],
      }),
      profile: 'default',
    })

    expect(report.claimStrength).toBe('hard')
    expect(report.classification).toBe('tax_migrated')
    expect(report.migratedPhases).toContain('selectorNotify.renderCount')
  })

  it('marks quick or incomparable evidence as clue-only inconclusive', () => {
    const quick = buildSelectorNotifyTaxReport({
      diff: baseDiff(),
      profile: 'quick',
    })
    const drifted = buildSelectorNotifyTaxReport({
      diff: baseDiff({
        meta: {
          comparability: {
            comparable: false,
            allowConfigDrift: false,
            allowEnvDrift: true,
            configMismatches: [],
            envMismatches: ['browser.version'],
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

  it('fails reports with regressions, budget violations, timeout markers, or missing watched evidence', () => {
    const report = buildSelectorNotifyTaxReport({
      diff: baseDiff({
        summary: { regressions: 1, improvements: 1, budgetViolations: 1 },
        suites: [
          {
            id: 'runtimeStore.noTearing.tickNotify',
            notes: 'timeout observed',
            metricDeltas: baseDiff().suites[0]!.metricDeltas,
            evidenceDeltas: [
              {
                name: 'selectorNotify.runSyncFallbackCount',
                unit: 'count',
                scope: 'points',
                before: { ok: 0, unavailable: 0, missing: 2 },
                after: { ok: 0, unavailable: 0, missing: 2 },
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
        'summary.budgetViolations must be 0 for a hard claim',
        'runtimeStore.noTearing.tickNotify has timeout/failed marker',
        'watched selector notify evidence is missing or unavailable',
      ]),
    )
  })

  it('renders markdown with allowed and forbidden claims', () => {
    const report = buildSelectorNotifyTaxReport({ diff: baseDiff(), profile: 'default' })
    const markdown = renderSelectorNotifyTaxReportMarkdown(report)

    expect(markdown).toContain('classification: `tax_removed`')
    expect(markdown).toContain('Comparable focused evidence supports selector notify path improvement.')
    expect(markdown).toContain('Global Runtime performance improved.')
  })
})
