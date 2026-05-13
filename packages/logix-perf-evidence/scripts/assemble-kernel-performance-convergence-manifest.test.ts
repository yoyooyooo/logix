import { describe, expect, it } from 'vitest'
import {
  assembleKernelPerformanceConvergenceManifest,
  normalizeKernelPerformanceConvergenceCounters,
  type KernelPerformanceConvergenceAssemblyInput,
} from './assemble-kernel-performance-convergence-manifest.js'
import { KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_COUNTER_IDS } from './ci.kernel-performance-convergence-stage-gate.js'

const zeroCounters = () =>
  Object.fromEntries(KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_COUNTER_IDS.map((id) => [id, 0])) as Record<string, number>

const cleanInput = (overrides: Partial<KernelPerformanceConvergenceAssemblyInput> = {}): KernelPerformanceConvergenceAssemblyInput => ({
  schemaVersion: 1,
  generatedAt: '2026-05-12T00:00:00.000Z',
  envId: 'local-test',
  profile: 'adversarial-default',
  reports: [
    {
      kind: 'AdversarialPerformanceMatrixReport',
      profile: 'adversarial-default',
      comparable: true,
      claimStrength: 'hard',
      classification: 'stable_guarded',
      summary: { regressions: 0, budgetExceeded: 0, timeouts: 0, stabilityWarnings: 0, missingSuites: 0 },
      requiredHotPaths: [],
      migratedCost: [],
      migratedRisk: [],
      evidenceRefs: ['specs/231-adversarial-performance-matrix/perf/reports/local.default.json'],
    },
    {
      kind: 'ExamplesPlaygroundIsolationReport',
      classification: 'isolated',
      claimStrength: 'hard',
      suites: [
        { id: 'examples.runtimeWitness', status: 'pass' },
        { id: 'examples.playgroundNoiseIsolation', status: 'pass' },
      ],
      counters: { 'examples.kernelPlaygroundCostMixed': 0, 'examples.publicResidueViolation': 0 },
      evidenceRefs: ['specs/234-p2-examples-playground-perf-isolation/perf/reports/local.default.json'],
    },
  ],
  stages: [
    { id: 'P0', status: 'validated', evidenceRefs: ['specs/232-p0-kernel-precision-fallback-closure/perf/report.default.json'] },
    { id: 'P1', status: 'validated', evidenceRefs: ['specs/233-p1-kernel-fixed-cost-and-diagnostics-closure/perf/report.default.json'] },
  ],
  suites: [
    { id: 'negativeBoundaries.dirtyPattern', status: 'pass' },
    { id: 'converge.txnCommit', status: 'pass' },
    { id: 'form.listScopeCheck', status: 'pass' },
    { id: 'externalStore.ingest.tickNotify', status: 'pass' },
    { id: 'runtimeStore.noTearing.tickNotify', status: 'pass' },
    { id: 'react.strictSuspenseJitter', status: 'pass' },
    { id: 'diagnostics.overhead', status: 'pass' },
    { id: 'txnQueue.directIdle', status: 'pass' },
    { id: 'dispatchShell.fixedCost', status: 'pass' },
  ],
  counters: zeroCounters(),
  ...overrides,
})

describe('assemble-kernel-performance-convergence-manifest', () => {
  it('assembles final manifest inputs for the existing convergence stage gate', () => {
    const manifest = assembleKernelPerformanceConvergenceManifest(cleanInput())

    expect(manifest.profile).toBe('adversarial-default')
    expect(manifest.comparable).toBe(true)
    expect(manifest.regressions).toBe(0)
    expect(manifest.budgetExceeded).toBe(0)
    expect(manifest.stages?.find((stage) => stage.id === 'adversarialMatrix')?.status).toBe('validated')
    expect(manifest.stages?.find((stage) => stage.id === 'P2')?.status).toBe('validated')
    expect(manifest.suites?.every((suite) => suite.status === 'pass')).toBe(true)
    expect(manifest.counters?.['examples.kernelPlaygroundCostMixed']).toBe(0)
    expect(manifest.migration?.migratedCost).toBe(0)
    expect(manifest.migration?.migratedRisk).toBe(0)
  })

  it('normalizes raw sentinel snapshots into required convergence counters', () => {
    const counters = normalizeKernelPerformanceConvergenceCounters({
      sentinels: {
        txnHotPath: {
          dirtyAllFallbackCountP1Gate: 0,
          debugEventAllocCountOff: 0,
          joinSplitInTxnWindowCount: 0,
        },
        runtimeExternalStore: {
          runSyncFallbackAfterBootCount: 0,
          activeReadQueryRetainCount: 0,
        },
      },
    })

    expect(counters['dirtyPlan.dirtyAll']).toBe(0)
    expect(counters['diagnosticsOff.payloadCount']).toBe(0)
    expect(counters['listEvidence.stringNormalizeHotPath']).toBe(0)
    expect(counters['runtimeStore.runSyncFallbackAfterBoot']).toBe(0)
    expect(counters['runtimeStore.retainedTopicLeak']).toBe(0)
  })

  it('keeps unmapped required counters missing rather than inventing zeros', () => {
    const manifest = assembleKernelPerformanceConvergenceManifest({
      profile: 'default',
      reports: [],
      sentinels: { txnHotPath: { debugEventAllocCountOff: 0 } },
    })

    expect(manifest.counters?.['diagnosticsOff.payloadCount']).toBe(0)
    expect(manifest.counters?.['dirtyPlan.unknownWrite']).toBeUndefined()
    expect(manifest.suites?.find((suite) => suite.id === 'negativeBoundaries.dirtyPattern')?.status).toBe('missing')
  })

  it('prefers explicit exact counters over approximate raw audit mappings', () => {
    const manifest = assembleKernelPerformanceConvergenceManifest({
      counters: { 'source.fullFallback': 0 },
      sentinels: { kernelHotPathAudit: { byArea: { source_dirty_gate: 4 } } },
    })

    expect(manifest.counters?.['source.fullFallback']).toBe(0)
  })
})
