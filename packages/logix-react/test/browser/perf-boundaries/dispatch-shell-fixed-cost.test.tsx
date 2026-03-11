import { test } from 'vitest'
import matrix from '@logixjs/perf-evidence/assets/matrix.json'
import { emitPerfReport, type PerfReport } from './protocol.js'
import { getProfileConfig, runMatrixSuite, withNodeEnv, type MatrixSuite } from './harness.js'
import {
  makeDispatchShellRuntime,
  runDispatchShellSample,
  type DispatchShellEntrypointMode,
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
  ],
}

const { runs, warmupDiscard, timeoutMs } = getProfileConfig(matrix)

const SAMPLE_BATCH = 50
const EXPECTED_POINT_COUNT = suite.axes.stateWidth.length * suite.axes.entrypointMode.length
const EXPECTED_WORK_MS = timeoutMs * EXPECTED_POINT_COUNT
const TEST_TIMEOUT_MS = Math.max(30_000, Math.ceil(EXPECTED_WORK_MS * 1.2 + 5_000))

test('browser dispatch shell: fixed cost across state width', { timeout: TEST_TIMEOUT_MS }, async () => {
  await withNodeEnv('production', async () => {
    const runtimeByKey = new Map<number, ReturnType<typeof makeDispatchShellRuntime>>()

    try {
      const { points, thresholds } = await runMatrixSuite(
        suite,
        { runs, warmupDiscard, timeoutMs },
        async (params) => {
          const stateWidth = params.stateWidth as number
          const entrypointMode = params.entrypointMode as DispatchShellEntrypointMode

          const runtime = runtimeByKey.get(stateWidth) ?? makeDispatchShellRuntime(stateWidth)
          runtimeByKey.set(stateWidth, runtime)

          const start = performance.now()
          await runtime.runtime.runPromise(runDispatchShellSample(runtime, entrypointMode, SAMPLE_BATCH) as any)
          const end = performance.now()

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
      await Promise.allSettled(Array.from(runtimeByKey.values()).map((runtime) => runtime.runtime.dispose()))
    }
  })
})
