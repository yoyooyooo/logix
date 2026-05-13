import { describe, expect, it } from 'vitest'
import {
  KERNEL_PERFORMANCE_EVIDENCE_LOCK_COUNTER_IDS,
  KERNEL_PERFORMANCE_EVIDENCE_LOCK_REQUIRED_SUITES,
  classifyKernelPerformanceEvidenceLock,
  renderKernelPerformanceEvidenceLockMarkdown,
  type KernelPerformanceEvidenceLockManifest,
} from './ci.kernel-performance-evidence-lock.js'

const zeroCounters = Object.fromEntries(KERNEL_PERFORMANCE_EVIDENCE_LOCK_COUNTER_IDS.map((id) => [id, 0]))
const passingSuites = KERNEL_PERFORMANCE_EVIDENCE_LOCK_REQUIRED_SUITES.map((id) => ({ id, status: 'pass' as const }))

const baseManifest = (override: Partial<KernelPerformanceEvidenceLockManifest> = {}): KernelPerformanceEvidenceLockManifest => ({
  schemaVersion: 1,
  generatedAt: '2026-05-12T00:00:00.000Z',
  profile: 'default',
  comparable: true,
  regressions: 0,
  budgetExceeded: 0,
  timeouts: 0,
  stabilityWarnings: 0,
  missingSuites: 0,
  suites: passingSuites,
  counters: zeroCounters,
  evidenceRefs: ['specs/230-kernel-performance-evidence-lock/perf/report.local.default.md'],
  ...override,
})

describe('Kernel Performance Evidence Lock classifier', () => {
  it('locks default-profile evidence only when hard gates and all fallback counters are clean', () => {
    const report = classifyKernelPerformanceEvidenceLock(baseManifest())

    expect(report.classification).toBe('locked')
    expect(report.claimStrength).toBe('hard')
    expect(report.blockers).toEqual([])
    expect(report.missingEvidence).toEqual([])
    expect(report.watchedCounters.every((counter) => counter.passed)).toBe(true)
    expect(report.requiredSuites.every((suite) => suite.status === 'pass')).toBe(true)
  })

  it('keeps quick evidence provisional even when counters are clean', () => {
    const report = classifyKernelPerformanceEvidenceLock(baseManifest({ profile: 'quick' }))

    expect(report.classification).toBe('provisional')
    expect(report.claimStrength).toBe('clue')
    expect(report.blockers).toEqual(['profile.hardClaimEligible: profile=quick; quick/smoke evidence is a clue only, not a hard release claim.'])
    expect(report.allowedClaims.join('\n')).toContain('clue only')
  })

  it('blocks when dirtyPlan or selector fallback counters are non-zero', () => {
    const report = classifyKernelPerformanceEvidenceLock(
      baseManifest({
        counters: {
          ...zeroCounters,
          'dirtyPlan.unknownWrite': 1,
          'selector.evaluateAll': 2,
        },
      }),
    )

    expect(report.classification).toBe('blocked')
    expect(report.claimStrength).toBe('none')
    expect(report.blockers).toContain('counter:dirtyPlan.unknownWrite: dirtyPlan.unknownWrite=1; canonical kernel path is not locked.')
    expect(report.blockers).toContain('counter:selector.evaluateAll: selector.evaluateAll=2; canonical kernel path is not locked.')
  })

  it('marks missing suite/counter evidence as incomplete rather than pass', () => {
    const counters = { ...zeroCounters }
    delete counters['source.fullFallback']
    const report = classifyKernelPerformanceEvidenceLock(
      baseManifest({
        suites: passingSuites.slice(0, -1),
        counters,
      }),
    )

    expect(report.classification).toBe('incomplete')
    expect(report.claimStrength).toBe('none')
    expect(report.missingEvidence.some((item) => item.includes('source.fullFallback'))).toBe(true)
    expect(report.missingEvidence.some((item) => item.includes('examples.playgroundNoiseIsolation'))).toBe(true)
  })

  it('renders forbidden claims and cloud validation limitations', () => {
    const report = classifyKernelPerformanceEvidenceLock(
      baseManifest({
        cloud: { unableToVerify: ['Did not run local default-profile browser perf sweep.'] },
      }),
    )
    const markdown = renderKernelPerformanceEvidenceLockMarkdown(report)

    expect(markdown).toContain('# Kernel Performance Evidence Lock Report')
    expect(markdown).toContain('This report makes no broad performance success claim')
    expect(markdown).toContain('Global Runtime performance improved')
    expect(markdown).toContain('Did not run local default-profile browser perf sweep')
  })
})
