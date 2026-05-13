import { describe, expect, it } from 'vitest'
import {
  classifyKernelPerformanceConvergence,
  KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_COUNTER_IDS,
  KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_STAGE_IDS,
  KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_SUITE_IDS,
  renderKernelPerformanceConvergenceMarkdown,
  type KernelPerformanceConvergenceManifest,
} from './ci.kernel-performance-convergence-stage-gate.js'

const zeroCounters = (): KernelPerformanceConvergenceManifest['counters'] =>
  Object.fromEntries(KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_COUNTER_IDS.map((id) => [id, 0])) as NonNullable<KernelPerformanceConvergenceManifest['counters']>

const completeManifest = (overrides: Partial<KernelPerformanceConvergenceManifest> = {}): KernelPerformanceConvergenceManifest => ({
  schemaVersion: 1,
  generatedAt: '2026-05-12T00:00:00.000Z',
  profile: 'default',
  comparable: true,
  regressions: 0,
  budgetExceeded: 0,
  timeouts: 0,
  stabilityWarnings: 0,
  missingSuites: 0,
  stages: KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_STAGE_IDS.map((id) => ({
    id,
    status: 'validated',
    evidenceRefs: [`specs/${id}/perf/report.default.json`],
  })),
  suites: KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_SUITE_IDS.map((id) => ({ id, status: 'pass' })),
  counters: zeroCounters(),
  evidenceRefs: ['specs/231-adversarial-performance-matrix/perf/reports/local.default.json'],
  migration: { migratedCost: 0, migratedRisk: 0 },
  ...overrides,
})

describe('ci.kernel-performance-convergence-stage-gate', () => {
  it('allows a hard complete claim for default evidence with all P0/P1/P2 gates clean', () => {
    const report = classifyKernelPerformanceConvergence(completeManifest())

    expect(report.classification).toBe('complete')
    expect(report.claimStrength).toBe('hard')
    expect(report.blockers).toEqual([])
    expect(report.missingEvidence).toEqual([])
    expect(report.gates).toContainEqual(expect.objectContaining({ id: 'stages.allValidatedOrImplemented', status: 'pass' }))
    expect(report.gates).toContainEqual(expect.objectContaining({ id: 'requiredSuites.presentAndPassing', status: 'pass' }))
  })

  it('keeps quick evidence provisional even when all structural gates are clean', () => {
    const report = classifyKernelPerformanceConvergence(completeManifest({ profile: 'quick' }))

    expect(report.classification).toBe('provisional')
    expect(report.claimStrength).toBe('clue')
    expect(report.forbiddenClaims).toContain('Quick/smoke evidence proves release-safe performance.')
  })

  it('blocks when a P0 fallback counter is non-zero', () => {
    const counters = zeroCounters()
    counters['dirtyPlan.unknownWrite'] = 1

    const report = classifyKernelPerformanceConvergence(completeManifest({ counters }))

    expect(report.classification).toBe('blocked')
    expect(report.claimStrength).toBe('none')
    expect(report.blockers.join('\n')).toContain('dirtyPlan.unknownWrite=1')
  })

  it('blocks when unaccepted migrated cost or risk exists', () => {
    const report = classifyKernelPerformanceConvergence(
      completeManifest({ migration: { migratedCost: 1, migratedRisk: 0, notes: 'selectorRouteMs regressed' } }),
    )

    expect(report.classification).toBe('blocked')
    expect(report.claimStrength).toBe('none')
    expect(report.blockers.join('\n')).toContain('migration.noUnacceptedCostOrRisk')
    expect(report.riskOrCostMigration.migratedCost).toBe(1)
  })

  it('marks missing migration evidence as incomplete instead of pass', () => {
    const manifest = completeManifest() as any
    delete manifest.migration

    const report = classifyKernelPerformanceConvergence(manifest)

    expect(report.classification).toBe('incomplete')
    expect(report.missingEvidence.join('\n')).toContain('migration.migratedCost')
  })

  it('marks missing P2 example evidence as incomplete instead of pass', () => {
    const suites = KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_SUITE_IDS
      .filter((id) => id !== 'examples.playgroundNoiseIsolation')
      .map((id) => ({ id, status: 'pass' as const }))

    const report = classifyKernelPerformanceConvergence(completeManifest({ suites }))

    expect(report.classification).toBe('incomplete')
    expect(report.missingEvidence.join('\n')).toContain('examples.playgroundNoiseIsolation')
  })

  it('renders claim boundaries and cloud limitations', () => {
    const markdown = renderKernelPerformanceConvergenceMarkdown(classifyKernelPerformanceConvergence(completeManifest({ profile: 'quick' })))

    expect(markdown).toContain('UNKNOWN/missing is not PASS')
    expect(markdown).toContain('This report makes no broad performance success claim')
    expect(markdown).toContain('Global Runtime performance improved.')
    expect(markdown).toContain('Risk / Cost Migration')
    expect(markdown).toContain('Cloud LLM did not run pnpm install')
  })
})