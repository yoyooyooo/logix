import { describe, expect, it } from 'vitest'
import {
  ADVERSARIAL_REQUIRED_HOT_PATHS,
  classifyAdversarialMatrix,
  type AdversarialMatrixDiffLike,
} from './ci.adversarial-matrix-report.js'
import { classifyExamplesPlaygroundIsolation } from './ci.examples-playground-isolation-report.js'
import { buildKernelPerformanceConvergenceAssemblyInput } from './ci.kernel-performance-convergence-assembly-input.js'

const passingCells = ADVERSARIAL_REQUIRED_HOT_PATHS.map((hotPath) => ({
  cellId: `${hotPath}::seed=1`,
  hotPath,
  status: 'pass' as const,
  axes: { seed: 1 },
}))

const cleanDiff = (overrides: Partial<AdversarialMatrixDiffLike> = {}): AdversarialMatrixDiffLike => ({
  schemaVersion: 1,
  matrixId: 'logix.adversarial.runtime.v1',
  matrixHash: 'sha256:test',
  profile: 'default',
  envId: 'local-test',
  meta: { comparability: { comparable: true } },
  summary: { regressions: 0, budgetExceeded: 0, timeouts: 0, missingSuites: 0, stabilityWarnings: 0 },
  cells: passingCells,
  suites: [
    { id: 'negativeBoundaries.dirtyPattern', status: 'pass' },
    { id: 'converge.txnCommit', status: 'pass' },
    { id: 'form.listScopeCheck', status: 'pass' },
    { id: 'externalStore.ingest.tickNotify', status: 'pass' },
    { id: 'runtimeStore.noTearing.tickNotify', status: 'pass' },
    { id: 'react.strictSuspenseJitter', status: 'pass' },
    { id: 'diagnostics.overhead.e2e', status: 'pass' },
    { id: 'txnLanes.urgentBacklog', status: 'pass' },
    { id: 'dispatchShell.fixedCost', status: 'pass' },
  ],
  ...overrides,
})

describe('ci.kernel-performance-convergence-assembly-input', () => {
  it('builds a final-gate assembly input from existing report artifacts without inventing counters', async () => {
    const diff = cleanDiff()
    const adversarialReport = classifyAdversarialMatrix({ diff, profile: 'adversarial-default' })
    const examplesReport = classifyExamplesPlaygroundIsolation({
      profile: 'default',
      runtime: { status: 'pass', kernelOnly: true, publicResidueViolation: 0, evidenceRef: 'runtime.json' },
      playground: {
        status: 'pass',
        productCostSeparated: true,
        kernelPlaygroundCostMixed: 0,
        evidenceRef: 'playground.json',
      },
    })

    const input = await buildKernelPerformanceConvergenceAssemblyInput({
      generatedAt: '2026-05-13T00:00:00.000Z',
      beforePath: 'before.json',
      afterPath: 'after.json',
      diffPath: 'diff.json',
      adversarialReportPath: 'adversarial.json',
      examplesReportPath: 'examples.json',
      diff,
      adversarialReport,
      examplesReport,
    })

    expect(input.profile).toBe('adversarial-default')
    expect(input.envId).toBe('local-test')
    expect(input.reports).toHaveLength(2)
    expect(input.stages?.find((stage) => stage.id === 'P0')?.status).toBe('validated')
    expect(input.stages?.find((stage) => stage.id === 'P1')?.status).toBe('validated')
    expect(input.suites?.find((suite) => suite.id === 'diagnostics.overhead')?.status).toBe('pass')
    expect(input.suites?.find((suite) => suite.id === 'txnQueue.directIdle')?.status).toBe('pass')
    expect(input.suites?.find((suite) => suite.id === 'examples.runtimeWitness')?.status).toBe('pass')
    expect(input.counters).toBeUndefined()
    expect(input.localCi?.commands?.map((command) => command.result)).toContain('pass')
  })

  it('keeps blocked diff and adversarial results visible to the final gate', async () => {
    const diff = cleanDiff({
      summary: { regressions: 1, budgetExceeded: 0, timeouts: 0, missingSuites: 0, stabilityWarnings: 0 },
    })
    const adversarialReport = classifyAdversarialMatrix({ diff, profile: 'adversarial-default' })

    const input = await buildKernelPerformanceConvergenceAssemblyInput({
      diff,
      diffPath: 'diff.json',
      adversarialReport,
      adversarialReportPath: 'adversarial.json',
    })

    expect(input.stages?.find((stage) => stage.id === 'P0')?.status).toBe('blocked')
    expect(input.stages?.find((stage) => stage.id === 'P1')?.status).toBe('blocked')
    expect(input.localCi?.commands?.find((command) => command.command.includes('perf diff'))?.result).toBe('blocked')
  })

  it('turns collect blocked markers into blocked final-gate stage evidence', async () => {
    const input = await buildKernelPerformanceConvergenceAssemblyInput({
      diffPath: 'diff.json',
      blockedMarkers: [
        {
          path: 'perf/convergence/markers/collect-before.default.timeout.json',
          phase: 'collect-before',
          reason: 'timeout',
        },
      ],
    })

    expect(input.stages?.find((stage) => stage.id === 'P0')?.status).toBe('blocked')
    expect(input.stages?.find((stage) => stage.id === 'P1')?.status).toBe('blocked')
    expect(input.stages?.find((stage) => stage.id === 'P0')?.evidenceRefs).toContain(
      'perf/convergence/markers/collect-before.default.timeout.json',
    )
    expect(input.evidenceRefs).toContain('perf/convergence/markers/collect-before.default.timeout.json')
  })
})
