import { describe, expect, it } from 'vitest'
import {
  buildFieldKernelDirtyWorkTaxReport,
  renderFieldKernelDirtyWorkTaxReportMarkdown,
  type PerfDiffLike,
} from './ci.field-kernel-dirty-work-tax-report'

const fieldKernelSuites = [
  'converge.steps',
  'converge.timeSlicing',
  'form.listScopeCheck',
  'externalStore.ingest',
] as const

const watchedEvidence = [
  ['fieldKernel.converge.fullFallbackCount', 2, 0],
  ['fieldKernel.validate.fullScanCount', 2, 0],
  ['fieldKernel.source.rowScopeEvalCount', 3, 1],
  ['fieldKernel.externalStore.flushCount', 4, 2],
  ['fieldKernel.dirtyPlan.materializeCount', 6, 2],
  ['fieldKernel.fallback.unknownWriteCount', 1, 0],
  ['fieldKernel.diagnosticsOff.payloadCount', 0, 0],
] as const

const suite = (
  id: (typeof fieldKernelSuites)[number],
  overrides: Partial<NonNullable<PerfDiffLike['suites']>[number]> = {},
): NonNullable<PerfDiffLike['suites']>[number] => ({
  id,
  metricDeltas: [
    {
      metric: 'p95Ms',
      unit: 'ms',
      compared: 2,
      missing: 0,
      unavailable: 0,
      topRegressions: [],
      topImprovements: [
        {
          params: { rows: 1000, diagnosticsLevel: 'off' },
          deltaMs: { medianMs: -0.4, p95Ms: -0.8 },
          ratio: { median: 0.7, p95: 0.65 },
        },
      ],
    },
  ],
  evidenceDeltas: watchedEvidence.map(([name, before, after]) => ({
    name,
    unit: 'count',
    scope: 'points',
    before: { ok: 2, unavailable: 0, missing: 0, value: before },
    after: { ok: 2, unavailable: 0, missing: 0, value: after },
  })),
  ...overrides,
})

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
    improvements: 4,
    budgetViolations: 0,
  },
  suites: fieldKernelSuites.map((id) => suite(id)),
  ...overrides,
})

describe('ci.field-kernel-dirty-work-tax-report', () => {
  it('allows a hard tax_removed claim for comparable default evidence with lower total and clean watched phases', () => {
    const report = buildFieldKernelDirtyWorkTaxReport({
      diff: baseDiff(),
      profile: 'default',
    })

    expect(report.claimStrength).toBe('hard')
    expect(report.classification).toBe('tax_removed')
    expect(report.gates).toContainEqual(expect.objectContaining({ id: 'comparable', passed: true }))
    expect(report.phaseFindings).toContainEqual(
      expect.objectContaining({
        name: 'fieldKernel.converge.fullFallbackCount',
        interpretation: 'removed',
      }),
    )
  })

  it('classifies total improvement with watched dirty work growth as tax_migrated', () => {
    const firstSuite = suite('converge.steps', {
      evidenceDeltas: watchedEvidence.map(([name, before, after]) => ({
        name,
        unit: 'count',
        scope: 'points',
        before: { ok: 2, unavailable: 0, missing: 0, value: before },
        after: {
          ok: 2,
          unavailable: 0,
          missing: 0,
          value: name === 'fieldKernel.dirtyPlan.materializeCount' ? before + 1 : after,
        },
      })),
    })

    const report = buildFieldKernelDirtyWorkTaxReport({
      diff: baseDiff({
        suites: [firstSuite, suite('converge.timeSlicing'), suite('form.listScopeCheck'), suite('externalStore.ingest')],
      }),
      profile: 'default',
    })

    expect(report.claimStrength).toBe('hard')
    expect(report.classification).toBe('tax_migrated')
    expect(report.migratedCosts).toContain('fieldKernel.dirtyPlan.materializeCount')
  })

  it('accepts current browser perf focused evidence names as field-kernel dirty-work evidence', () => {
    const report = buildFieldKernelDirtyWorkTaxReport({
      diff: baseDiff({
        suites: [
          suite('converge.steps', {
            evidenceDeltas: [
              {
                name: 'converge.executedSteps',
                unit: 'count',
                scope: 'points',
                before: { ok: 2, unavailable: 0, missing: 0, value: 80 },
                after: { ok: 2, unavailable: 0, missing: 0, value: 20 },
              },
              {
                name: 'converge.decisionDurationMs',
                unit: 'ms',
                scope: 'points',
                before: { ok: 2, unavailable: 0, missing: 0, value: 0.2 },
                after: { ok: 2, unavailable: 0, missing: 0, value: 0.2 },
              },
            ],
          }),
          suite('form.listScopeCheck', {
            evidenceDeltas: [
              {
                name: 'cache.evict',
                unit: 'count',
                scope: 'points',
                before: { ok: 2, unavailable: 0, missing: 0, value: 1 },
                after: { ok: 2, unavailable: 0, missing: 0, value: 0 },
              },
            ],
          }),
          suite('externalStore.ingest', {
            evidenceDeltas: [
              {
                name: 'workload.externalStores',
                unit: 'count',
                scope: 'points',
                before: { ok: 2, unavailable: 0, missing: 0, value: 10 },
                after: { ok: 2, unavailable: 0, missing: 0, value: 10 },
              },
            ],
          }),
        ],
      }),
      profile: 'default',
    })

    expect(report.classification).toBe('tax_removed')
    expect(report.phaseFindings.map((finding) => finding.name)).toEqual(
      expect.arrayContaining(['converge.executedSteps', 'cache.evict', 'workload.externalStores']),
    )
  })

  it('does not fail mixed applicable and not-applicable focused evidence when aggregate values exist', () => {
    const report = buildFieldKernelDirtyWorkTaxReport({
      diff: baseDiff({
        suites: [
          suite('form.listScopeCheck', {
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
                    params: { rows: 300, requestedMode: 'auto' },
                    deltaMs: { medianMs: -0.1, p95Ms: -0.2 },
                    ratio: { median: 0.8, p95: 0.75 },
                  },
                ],
              },
              {
                metric: 'runtime.decisionMs',
                unit: 'ms',
                compared: 1,
                missing: 0,
                unavailable: 3,
                topRegressions: [],
                topImprovements: [],
              },
            ],
            evidenceDeltas: [
              {
                name: 'cache.evict',
                unit: 'count',
                scope: 'points',
                before: { ok: 2, unavailable: 2, missing: 0, value: 1 },
                after: { ok: 2, unavailable: 2, missing: 0, value: 0 },
              },
              {
                name: 'converge.decisionDurationMs',
                unit: 'ms',
                scope: 'points',
                before: { ok: 2, unavailable: 2, missing: 0, value: 0.2 },
                after: { ok: 2, unavailable: 2, missing: 0, value: 0.2 },
              },
            ],
          }),
        ],
      }),
      profile: 'default',
    })

    expect(report.classification).toBe('tax_removed')
    expect(report.gates).toContainEqual(expect.objectContaining({ id: 'metricEvidence', passed: true }))
    expect(report.gates).toContainEqual(expect.objectContaining({ id: 'phaseEvidence', passed: true }))
  })

  it('marks quick or incomparable evidence as clue-only inconclusive', () => {
    const quick = buildFieldKernelDirtyWorkTaxReport({
      diff: baseDiff(),
      profile: 'quick',
    })
    const drifted = buildFieldKernelDirtyWorkTaxReport({
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
    const report = buildFieldKernelDirtyWorkTaxReport({
      diff: baseDiff({
        summary: { regressions: 1, improvements: 1, budgetViolations: 1 },
        suites: [
          suite('converge.steps', {
            notes: 'timeout observed',
            evidenceDeltas: [
              {
                name: 'fieldKernel.converge.fullFallbackCount',
                unit: 'count',
                scope: 'points',
                before: { ok: 0, unavailable: 0, missing: 2 },
                after: { ok: 0, unavailable: 0, missing: 2 },
              },
            ],
          }),
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
        'field-kernel suite has timeout/failed marker',
        'watched field-kernel dirty work evidence is missing or unavailable',
      ]),
    )
  })

  it('renders markdown with allowed and forbidden claims', () => {
    const report = buildFieldKernelDirtyWorkTaxReport({ diff: baseDiff(), profile: 'default' })
    const markdown = renderFieldKernelDirtyWorkTaxReportMarkdown(report)

    expect(markdown).toContain('classification: `tax_removed`')
    expect(markdown).toContain('Comparable focused evidence supports FieldKernel dirty-work reduction.')
    expect(markdown).toContain('Global Runtime performance improved.')
  })
})
