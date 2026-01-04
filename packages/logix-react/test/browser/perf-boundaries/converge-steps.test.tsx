import { expect, test } from 'vitest'
import { Effect } from 'effect'
import matrix from '@logix/perf-evidence/assets/matrix.json'
import { emitPerfReport, type PerfReport } from './protocol.js'
import { getProfileConfig, runMatrixSuite, summarizeMs, withNodeEnv } from './harness.js'
import {
  makeConvergeRuntime,
  type ConvergeRuntime,
  readConvergeControlPlaneFromEnv,
  runConvergeTxnCommitWithDiagnosticsLevel,
} from './converge-runtime.js'

const suite = (matrix.suites as any[]).find((s) => s.id === 'converge.txnCommit') as any

const stepsLevels = suite.axes.steps as number[]
const dirtyRootsRatioLevels = suite.axes.dirtyRootsRatio as number[]
const convergeModeLevels = suite.axes.convergeMode as Array<'full' | 'dirty' | 'auto'>

const { runs, warmupDiscard, timeoutMs } = getProfileConfig(matrix)

const resolveProfileId = (): string => {
  const profile = import.meta.env.VITE_LOGIX_PERF_PROFILE
  const profiles = (matrix as any).defaults?.profiles ?? {}
  if (profile && profiles[profile]) {
    return profile
  }
  return 'matrix.defaults'
}

const TEST_TIMEOUT_MS = Math.max(
  30_000,
  timeoutMs * stepsLevels.length * dirtyRootsRatioLevels.length * convergeModeLevels.length,
)

const SAMPLE_BATCH = 50

test(
  'browser converge baseline: txnCommit/derive under steps & dirty-roots distributions',
  { timeout: TEST_TIMEOUT_MS },
  async () => {
    await withNodeEnv('production', async () => {
      const controlPlane = readConvergeControlPlaneFromEnv()
      const runtimeByKey = new Map<string, ConvergeRuntime>()

      try {
        const { points, thresholds } = await runMatrixSuite(
          suite,
          { runs, warmupDiscard, timeoutMs },
          async (params) => {
            const convergeMode = params.convergeMode as 'full' | 'dirty' | 'auto'
            const steps = params.steps as number
            const dirtyRootsRatio = params.dirtyRootsRatio as number
            const dirtyRoots = Math.max(1, Math.ceil(steps * dirtyRootsRatio))

            const key = `${convergeMode}:${steps}`
            const cached =
              runtimeByKey.get(key) ??
              makeConvergeRuntime(steps, convergeMode, { captureDecision: true })
            runtimeByKey.set(key, cached)

            const start = performance.now()
            await cached.runtime.runPromise(
              Effect.gen(function* () {
                for (let i = 0; i < SAMPLE_BATCH; i++) {
                  cached.clearLastConvergeDecision()
                  yield* runConvergeTxnCommitWithDiagnosticsLevel(cached, dirtyRoots, 'off') as Effect.Effect<
                    void,
                    never,
                    any
                  >
                }
              }) as Effect.Effect<void, never, any>,
            )
            const end = performance.now()
            const decision = cached.getLastConvergeDecision() as any

            const stepStats = (decision && typeof decision === 'object' ? decision.stepStats : undefined) as any

            const totalSteps =
              typeof stepStats?.totalSteps === 'number' && Number.isFinite(stepStats.totalSteps)
                ? stepStats.totalSteps
                : { unavailableReason: 'decisionMissing' }

            const executedSteps =
              typeof stepStats?.executedSteps === 'number' && Number.isFinite(stepStats.executedSteps)
                ? stepStats.executedSteps
                : { unavailableReason: 'decisionMissing' }

            const affectedSteps =
              typeof stepStats?.affectedSteps === 'number' && Number.isFinite(stepStats.affectedSteps)
                ? stepStats.affectedSteps
                : typeof stepStats?.totalSteps === 'number' && Number.isFinite(stepStats.totalSteps)
                  ? stepStats.totalSteps
                  : { unavailableReason: 'decisionMissing' }

            const executedMode =
              typeof decision?.executedMode === 'string' && decision.executedMode.length > 0
                ? decision.executedMode
                : { unavailableReason: 'decisionMissing' }

            const reasons =
              Array.isArray(decision?.reasons) && decision.reasons.every((x: unknown) => typeof x === 'string')
                ? (decision.reasons as string[]).join(',')
                : { unavailableReason: 'decisionMissing' }

            return {
              metrics: {
                'runtime.txnCommitMs': (end - start) / SAMPLE_BATCH,
                'runtime.decisionMs':
                  convergeMode === 'auto'
                    ? typeof decision?.decisionDurationMs === 'number'
                      ? decision.decisionDurationMs
                      : { unavailableReason: 'decisionMissing' }
                    : { unavailableReason: 'notApplicable' },
              },
              evidence: {
                'converge.executedMode': executedMode,
                'converge.executedSteps': executedSteps,
                'converge.affectedSteps': affectedSteps,
                'converge.totalSteps': totalSteps,
                'converge.reasons': reasons,
              },
            }
          },
          {
            enrichParams: (params) => {
              const steps = params.steps as number
              const dirtyRootsRatio = params.dirtyRootsRatio as number
              return {
                ...params,
                dirtyRoots: Math.max(1, Math.ceil(steps * dirtyRootsRatio)),
              }
            },
            cutOffOn: ['timeout'],
          },
        )

        const maxSteps = stepsLevels[stepsLevels.length - 1]
        const autoRatioBudgetId = 'auto<=full*1.05'
        const autoRatioThresholds = thresholds.filter((t) => (t.budget as any)?.id === autoRatioBudgetId)
        expect(autoRatioThresholds.length).toBeGreaterThan(0)

        const gateFailures = autoRatioThresholds.filter((t) => t.maxLevel !== maxSteps)
        const hardGatesEnabled = import.meta.env.VITE_LOGIX_PERF_HARD_GATES !== 'off'
        if (hardGatesEnabled && gateFailures.length > 0) {
          const details = gateFailures
            .map(
              (t) =>
                `where=${JSON.stringify(t.where ?? {})} maxLevel=${String(t.maxLevel)} firstFail=${String(
                  t.firstFailLevel,
                )} reason=${String(t.reason)}`,
            )
            .join('\n')
          throw new Error(
            `perf hard gate failed: ${autoRatioBudgetId} expected maxLevel=${String(maxSteps)}\n${details}`,
          )
        }

        const overheadRuns = Math.min(5, runs)
        const overheadWarmupDiscard = 0
        const overheadPoints: Array<{
          readonly diagnosticsLevel: 'off' | 'light' | 'full'
          readonly samples: number[]
        }> = [
          { diagnosticsLevel: 'off', samples: [] },
          { diagnosticsLevel: 'light', samples: [] },
          { diagnosticsLevel: 'full', samples: [] },
        ]

        const baselinePoint =
          (suite.baselinePoints as any[] | undefined)?.find(
            (p) =>
              p &&
              typeof p === 'object' &&
              (p as any).convergeMode === 'auto' &&
              (p as any).steps === 2000 &&
              (p as any).dirtyRootsRatio === 0.05,
          ) ??
          (suite.baselinePoints as any[] | undefined)?.find(
            (p) => p && typeof p === 'object' && (p as any).convergeMode === 'auto',
          )

        const overheadScenario =
          baselinePoint && typeof baselinePoint === 'object'
            ? {
                convergeMode: (baselinePoint as any).convergeMode as 'auto',
                steps: (baselinePoint as any).steps as number,
                dirtyRootsRatio: (baselinePoint as any).dirtyRootsRatio as number,
              }
            : { convergeMode: 'auto' as const, steps: 2000, dirtyRootsRatio: 0.05 }

        const overheadDirtyRoots = Math.max(1, Math.ceil(overheadScenario.steps * overheadScenario.dirtyRootsRatio))
        const overheadKey = `${overheadScenario.convergeMode}:${overheadScenario.steps}`
        const overheadRuntime =
          runtimeByKey.get(overheadKey) ??
          makeConvergeRuntime(overheadScenario.steps, overheadScenario.convergeMode, { captureDecision: true })
        runtimeByKey.set(overheadKey, overheadRuntime)

        for (const entry of overheadPoints) {
          for (let i = 0; i < overheadRuns; i++) {
            overheadRuntime.clearLastConvergeDecision()
            const start = performance.now()
            await overheadRuntime.runtime.runPromise(
              runConvergeTxnCommitWithDiagnosticsLevel(
                overheadRuntime,
                overheadDirtyRoots,
                entry.diagnosticsLevel,
              ) as Effect.Effect<void, never, any>,
            )
            const end = performance.now()
            entry.samples.push(end - start)
          }
        }

        const summarizeOverhead = (level: 'off' | 'light' | 'full') => {
          const found = overheadPoints.find((p) => p.diagnosticsLevel === level)
          const trimmed = found?.samples.slice(Math.min(overheadWarmupDiscard, found.samples.length)) ?? []
          return trimmed.length > 0 ? summarizeMs(trimmed) : undefined
        }

        const offStats = summarizeOverhead('off')
        const lightStats = summarizeOverhead('light')
        const fullStats = summarizeOverhead('full')

        const comparisons = []
        if (offStats && lightStats && offStats.medianMs > 0 && offStats.p95Ms > 0) {
          comparisons.push(
            {
              id: 'converge.txnCommit.diagnosticsOverhead.light/off',
              kind: 'ratio',
              metric: 'runtime.txnCommitMs',
              numeratorRef: 'diagnosticsLevel=light',
              denominatorRef: 'diagnosticsLevel=off',
              unit: 'ratio',
              stats: {
                median: lightStats.medianMs / offStats.medianMs,
                p95: lightStats.p95Ms / offStats.p95Ms,
              },
              scenario: overheadScenario,
            },
            {
              id: 'converge.txnCommit.diagnosticsOverhead.light-off',
              kind: 'delta',
              metric: 'runtime.txnCommitMs',
              numeratorRef: 'diagnosticsLevel=light',
              denominatorRef: 'diagnosticsLevel=off',
              unit: 'ms',
              stats: {
                median: lightStats.medianMs - offStats.medianMs,
                p95: lightStats.p95Ms - offStats.p95Ms,
              },
              scenario: overheadScenario,
            },
          )
        }
        if (offStats && fullStats && offStats.medianMs > 0 && offStats.p95Ms > 0) {
          comparisons.push(
            {
              id: 'converge.txnCommit.diagnosticsOverhead.full/off',
              kind: 'ratio',
              metric: 'runtime.txnCommitMs',
              numeratorRef: 'diagnosticsLevel=full',
              denominatorRef: 'diagnosticsLevel=off',
              unit: 'ratio',
              stats: {
                median: fullStats.medianMs / offStats.medianMs,
                p95: fullStats.p95Ms / offStats.p95Ms,
              },
              scenario: overheadScenario,
            },
            {
              id: 'converge.txnCommit.diagnosticsOverhead.full-off',
              kind: 'delta',
              metric: 'runtime.txnCommitMs',
              numeratorRef: 'diagnosticsLevel=full',
              denominatorRef: 'diagnosticsLevel=off',
              unit: 'ms',
              stats: {
                median: fullStats.medianMs - offStats.medianMs,
                p95: fullStats.p95Ms - offStats.p95Ms,
              },
              scenario: overheadScenario,
            },
          )
        }

        const report: PerfReport = {
          schemaVersion: 1,
          meta: {
            createdAt: new Date().toISOString(),
            generator: 'packages/logix-react/test/browser/perf-boundaries/converge-steps.test.tsx',
            matrixId: matrix.id,
            config: {
              runs,
              warmupDiscard,
              timeoutMs,
              headless: matrix.defaults.browser.headless,
              profile: resolveProfileId(),
              stability: matrix.defaults.stability,
              controlPlane,
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
                'runtime.decisionMs': 'runtime',
              },
              points,
              thresholds,
              comparisons: comparisons.length > 0 ? comparisons : undefined,
            },
          ],
        }

        emitPerfReport(report)
      } finally {
        await Promise.allSettled(Array.from(runtimeByKey.values()).map((rt) => rt.runtime.dispose()))
      }
    })
  },
)
