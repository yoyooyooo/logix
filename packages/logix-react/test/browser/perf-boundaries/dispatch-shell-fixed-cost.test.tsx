import { test } from 'vitest'
import matrix from '@logixjs/perf-evidence/assets/matrix.json'
import { emitPerfReport, type PerfReport } from './protocol.js'
import { getProfileConfig, runMatrixSuite, withNodeEnv, type MatrixSuite } from './harness.js'
import {
  makeDispatchShellRuntime,
  runDispatchShellSample,
  runDispatchShellSampleWithDiagnosticsLevel,
  runDispatchShellSampleWithBreakdown,
  type DispatchShellSampleBreakdown,
  type DispatchShellEntrypointMode,
  type DispatchShellTxnPhaseTiming,
} from './dispatch-shell.runtime.js'

const suite: MatrixSuite = {
  id: 'dispatchShell.fixedCost',
  title: 'dispatch shell: fixed cost',
  priority: 'P1',
  primaryAxis: 'stateWidth',
  axes: {
    stateWidth: [1, 8, 32, 128, 512, 1024],
    entrypointMode: ['reuseScope', 'resolveEach'],
  },
  metrics: ['runtime.txnCommitMs'],
  budgets: [
    {
      id: 'reuseScope<=12ms',
      type: 'absolute',
      metric: 'runtime.txnCommitMs',
      p95Ms: 12,
    },
    {
      id: 'resolveEach<=reuseScope*1.25',
      type: 'relative',
      metric: 'runtime.txnCommitMs',
      maxRatio: 1.25,
      minDeltaMs: 0.1,
      numeratorRef: 'entrypointMode=resolveEach',
      denominatorRef: 'entrypointMode=reuseScope',
    },
  ],
  requiredEvidence: [
    'module.reducerWriteCount',
    'module.stateWidth',
    'module.traitCount',
    'runtime.dispatchesPerSample',
    'runtime.entrypointMode',
    'runtime.resolveScopeMsPerDispatch',
    'runtime.dispatchAwaitMsPerDispatch',
    'runtime.txnPhase.traceCount',
    'runtime.txnPhase.txnPreludeMs',
    'runtime.txnPhase.queueContextLookupMs',
    'runtime.txnPhase.queueResolvePolicyMs',
    'runtime.txnPhase.queueBackpressureMs',
    'runtime.txnPhase.queueEnqueueBookkeepingMs',
    'runtime.txnPhase.queueWaitMs',
    'runtime.txnPhase.queueStartHandoffMs',
    'runtime.txnPhase.dispatchActionRecordMs',
    'runtime.txnPhase.dispatchActionCommitHubMs',
    'runtime.txnPhase.dispatchActionCount',
    'runtime.txnPhase.bodyShellMs',
    'runtime.txnPhase.asyncEscapeGuardMs',
    'runtime.txnPhase.traitConvergeMs',
    'runtime.txnPhase.scopedValidateMs',
    'runtime.txnPhase.sourceSyncMs',
    'runtime.txnPhase.commitTotalMs',
    'runtime.txnPhase.commitRowIdSyncMs',
    'runtime.txnPhase.commitPublishCommitMs',
    'runtime.txnPhase.commitStateUpdateDebugRecordMs',
    'runtime.txnPhase.commitOnCommitBeforeStateUpdateMs',
    'runtime.txnPhase.commitOnCommitAfterStateUpdateMs',
  ],
}

const { runs, warmupDiscard, timeoutMs } = getProfileConfig(matrix)

const SAMPLE_BATCH = 50
const PHASE_TRACE_BATCH = 5
const EXPECTED_POINT_COUNT = suite.axes.stateWidth.length * suite.axes.entrypointMode.length
const EXPECTED_WORK_MS = timeoutMs * EXPECTED_POINT_COUNT
const TEST_TIMEOUT_MS = Math.max(30_000, Math.ceil(EXPECTED_WORK_MS * 1.2 + 5_000))

const timingEvidence = (
  timing: DispatchShellTxnPhaseTiming | undefined,
  pick: (timing: DispatchShellTxnPhaseTiming) => number | undefined,
): number | { readonly unavailableReason: string } => {
  const value = timing ? pick(timing) : undefined
  return typeof value === 'number' && Number.isFinite(value) ? value : { unavailableReason: 'phaseTimingMissing' }
}

test('browser dispatch shell: fixed cost across state width', { timeout: TEST_TIMEOUT_MS }, async () => {
  await withNodeEnv('production', async () => {
    const metricRuntimeByKey = new Map<number, ReturnType<typeof makeDispatchShellRuntime>>()
    const phaseRuntimeByKey = new Map<number, ReturnType<typeof makeDispatchShellRuntime>>()

    try {
      const { points, thresholds } = await runMatrixSuite(
        suite,
        { runs, warmupDiscard, timeoutMs },
        async (params) => {
          const stateWidth = params.stateWidth as number
          const entrypointMode = params.entrypointMode as DispatchShellEntrypointMode

          const metricRuntime = metricRuntimeByKey.get(stateWidth) ?? makeDispatchShellRuntime(stateWidth)
          metricRuntimeByKey.set(stateWidth, metricRuntime)

          const phaseRuntime =
            phaseRuntimeByKey.get(stateWidth) ?? makeDispatchShellRuntime(stateWidth, { captureTxnPhaseTiming: true })
          phaseRuntimeByKey.set(stateWidth, phaseRuntime)

          const start = performance.now()
          await metricRuntime.runtime.runPromise(runDispatchShellSample(metricRuntime, entrypointMode, SAMPLE_BATCH) as any)
          const end = performance.now()

          phaseRuntime.clearTxnPhaseTimings()
          await phaseRuntime.runtime.runPromise(
            runDispatchShellSampleWithDiagnosticsLevel(phaseRuntime, entrypointMode, PHASE_TRACE_BATCH, 'light') as any,
          )
          const phaseTiming = phaseRuntime.getTxnPhaseTimingSummary()
          const breakdown = (await phaseRuntime.runtime.runPromise(
            runDispatchShellSampleWithBreakdown(phaseRuntime, entrypointMode, PHASE_TRACE_BATCH) as any,
          )) as DispatchShellSampleBreakdown

          return {
            metrics: {
              'runtime.txnCommitMs': (end - start) / SAMPLE_BATCH,
            },
            evidence: {
              'module.reducerWriteCount': 1,
              'module.stateWidth': stateWidth,
              'module.traitCount': 0,
              'runtime.dispatchesPerSample': SAMPLE_BATCH,
              'runtime.entrypointMode': entrypointMode,
              'runtime.resolveScopeMsPerDispatch': breakdown.resolveScopeMsPerDispatch,
              'runtime.dispatchAwaitMsPerDispatch': breakdown.dispatchAwaitMsPerDispatch,
              'runtime.txnPhase.traceCount':
                phaseTiming?.traceCount ?? { unavailableReason: 'phaseTimingMissing' },
              'runtime.txnPhase.txnPreludeMs': timingEvidence(phaseTiming, (value) => value.txnPreludeMs),
              'runtime.txnPhase.queueContextLookupMs': timingEvidence(
                phaseTiming,
                (value) => value.queueContextLookupMs,
              ),
              'runtime.txnPhase.queueResolvePolicyMs': timingEvidence(phaseTiming, (value) => value.queueResolvePolicyMs),
              'runtime.txnPhase.queueBackpressureMs': timingEvidence(phaseTiming, (value) => value.queueBackpressureMs),
              'runtime.txnPhase.queueEnqueueBookkeepingMs': timingEvidence(
                phaseTiming,
                (value) => value.queueEnqueueBookkeepingMs,
              ),
              'runtime.txnPhase.queueWaitMs': timingEvidence(phaseTiming, (value) => value.queueWaitMs),
              'runtime.txnPhase.queueStartHandoffMs': timingEvidence(phaseTiming, (value) => value.queueStartHandoffMs),
              'runtime.txnPhase.dispatchActionRecordMs': timingEvidence(
                phaseTiming,
                (value: any) => value.dispatchActionRecordMs,
              ),
              'runtime.txnPhase.dispatchActionCommitHubMs': timingEvidence(
                phaseTiming,
                (value: any) => value.dispatchActionCommitHubMs,
              ),
              'runtime.txnPhase.dispatchActionCount': timingEvidence(
                phaseTiming,
                (value: any) => value.dispatchActionCount,
              ),
              'runtime.txnPhase.bodyShellMs': timingEvidence(phaseTiming, (value) => value.bodyShellMs),
              'runtime.txnPhase.asyncEscapeGuardMs': timingEvidence(phaseTiming, (value) => value.asyncEscapeGuardMs),
              'runtime.txnPhase.traitConvergeMs': timingEvidence(phaseTiming, (value) => value.traitConvergeMs),
              'runtime.txnPhase.scopedValidateMs': timingEvidence(phaseTiming, (value) => value.scopedValidateMs),
              'runtime.txnPhase.sourceSyncMs': timingEvidence(phaseTiming, (value) => value.sourceSyncMs),
              'runtime.txnPhase.commitTotalMs': timingEvidence(phaseTiming, (value) => value.commitTotalMs),
              'runtime.txnPhase.commitRowIdSyncMs': timingEvidence(phaseTiming, (value) => value.commitRowIdSyncMs),
              'runtime.txnPhase.commitPublishCommitMs': timingEvidence(
                phaseTiming,
                (value) => value.commitPublishCommitMs,
              ),
              'runtime.txnPhase.commitStateUpdateDebugRecordMs': timingEvidence(
                phaseTiming,
                (value) => value.commitStateUpdateDebugRecordMs,
              ),
              'runtime.txnPhase.commitOnCommitBeforeStateUpdateMs': timingEvidence(
                phaseTiming,
                (value) => value.commitOnCommitBeforeStateUpdateMs,
              ),
              'runtime.txnPhase.commitOnCommitAfterStateUpdateMs': timingEvidence(
                phaseTiming,
                (value) => value.commitOnCommitAfterStateUpdateMs,
              ),
            },
          }
        },
        {
          cutOffOn: ['timeout'],
        },
      )

      const report: PerfReport = {
        schemaVersion: 1,
        meta: {
          createdAt: new Date().toISOString(),
          generator: 'packages/logix-react/test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx',
          matrixId: matrix.id,
          config: {
            runs,
            warmupDiscard,
            timeoutMs,
            headless: matrix.defaults.browser.headless,
            profile: (import.meta.env.VITE_LOGIX_PERF_PROFILE as string | undefined) ?? 'matrix.defaults',
            stability: matrix.defaults.stability,
          },
          env: {
            os: navigator.platform || 'unknown',
            arch: 'unknown',
            node: 'unknown',
            browser: {
              name: matrix.defaults.browser.name,
              headless: matrix.defaults.browser.headless,
            },
          },
        },
        suites: [
          {
            id: suite.id,
            title: suite.title,
            priority: suite.priority,
            primaryAxis: suite.primaryAxis,
            budgets: suite.budgets,
            metricCategories: {
              'runtime.txnCommitMs': 'runtime',
            },
            points,
            thresholds,
          },
        ],
      }

      emitPerfReport(report)
    } finally {
      await Promise.allSettled(
        Array.from(metricRuntimeByKey.values())
          .concat(Array.from(phaseRuntimeByKey.values()))
          .map((runtime) => runtime.runtime.dispose()),
      )
    }
  })
})
