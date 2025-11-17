import { expect, test } from 'vitest'
import { Effect } from 'effect'
import matrix from '@logix/perf-evidence/assets/matrix.json'
import { emitPerfReport, type PerfReport } from './protocol.js'
import { getProfileConfig, runMatrixSuite, withNodeEnv } from './harness.js'
import {
  makeConvergeTimeSlicingRuntime,
  runConvergeTimeSlicingTxnCommitDirtyAllWithDiagnosticsLevel,
  type ConvergeTimeSlicingRuntime,
} from './converge-time-slicing.runtime.js'
import { readConvergeControlPlaneFromEnv } from './converge-runtime.js'

const suite = (matrix.suites as any[]).find((s) => s.id === 'converge.timeSlicing.txnCommit') as any

const stepsLevels = suite.axes.steps as number[]

const { runs, warmupDiscard, timeoutMs } = getProfileConfig(matrix)

const SAMPLE_BATCH = 5

const resolveProfileId = (): string => {
  const profile = import.meta.env.VITE_LOGIX_PERF_PROFILE
  const profiles = (matrix as any).defaults?.profiles ?? {}
  if (profile && profiles[profile]) {
    return profile
  }
  return 'matrix.defaults'
}

const TEST_TIMEOUT_MS = Math.max(30_000, timeoutMs * stepsLevels.length)

test(
  'browser converge time-slicing: txnCommit on/off under large deferred computed set',
  { timeout: TEST_TIMEOUT_MS },
  async () => {
    await withNodeEnv('production', async () => {
      const controlPlane = readConvergeControlPlaneFromEnv()
      const runtimeByKey = new Map<string, ConvergeTimeSlicingRuntime>()
      const primed = new Set<string>()

      try {
        const { points, thresholds } = await runMatrixSuite(
          suite,
          { runs, warmupDiscard, timeoutMs },
          async (params) => {
            const steps = params.steps as number
            const convergeMode = params.convergeMode as 'dirty'
            const timeSlicing = params.timeSlicing as 'off' | 'on'
            const immediateRatio = params.immediateRatio as number

            const immediateSteps = Math.max(1, Math.floor(steps * immediateRatio))
            const key = `${timeSlicing}:${convergeMode}:${steps}:${immediateSteps}`

            const cached =
              runtimeByKey.get(key) ??
              makeConvergeTimeSlicingRuntime(steps, immediateSteps, convergeMode, timeSlicing, {
                captureDecision: true,
                timeSlicingDebounceMs: 10_000,
                timeSlicingMaxLagMs: 60_000,
              })
            runtimeByKey.set(key, cached)

            if (!primed.has(key)) {
              primed.add(key)
              cached.clearLastConvergeDecision()
              await cached.runtime.runPromise(
                runConvergeTimeSlicingTxnCommitDirtyAllWithDiagnosticsLevel(cached, 1, 'off') as Effect.Effect<
                  void,
                  never,
                  any
                >,
              )
            }

            const start = performance.now()
            await cached.runtime.runPromise(
              Effect.gen(function* () {
                for (let i = 0; i < SAMPLE_BATCH; i++) {
                  cached.clearLastConvergeDecision()
                  yield* runConvergeTimeSlicingTxnCommitDirtyAllWithDiagnosticsLevel(cached, 1, 'off') as Effect.Effect<
                    void,
                    never,
                    any
                  >
                }
              }) as Effect.Effect<void, never, any>,
            )
            const end = performance.now()

            const decision = cached.getLastConvergeDecision() as any
            const summary = decision?.timeSlicing as any
            const scope = typeof summary?.scope === 'string' ? summary.scope : undefined
            const immediateStepCount =
              typeof summary?.immediateStepCount === 'number' ? Math.floor(summary.immediateStepCount) : undefined
            const deferredStepCount =
              typeof summary?.deferredStepCount === 'number' ? Math.floor(summary.deferredStepCount) : undefined

            return {
              metrics: {
                'runtime.txnCommitMs': (end - start) / SAMPLE_BATCH,
              },
              evidence: {
                'converge.timeSlicing.scope': scope ?? { unavailableReason: 'missing' },
                'converge.timeSlicing.immediateStepCount': immediateStepCount ?? { unavailableReason: 'missing' },
                'converge.timeSlicing.deferredStepCount': deferredStepCount ?? { unavailableReason: 'missing' },
                'converge.timeSlicing.deferredDirtyPathCount': Math.max(0, steps - immediateSteps),
              },
            }
          },
          {
            enrichParams: (params) => {
              const steps = params.steps as number
              const immediateRatio = params.immediateRatio as number
              return {
                ...params,
                immediateSteps: Math.max(1, Math.floor(steps * immediateRatio)),
                mutateRoots: 1,
              }
            },
            cutOffOn: ['timeout'],
          },
        )

        const maxSteps = stepsLevels[stepsLevels.length - 1]
        const ratioBudgetId = (suite.budgets[0] as any).id as string
        const ratioThresholds = thresholds.filter((t) => (t.budget as any)?.id === ratioBudgetId)
        expect(ratioThresholds.length).toBeGreaterThan(0)

        const gateFailures = ratioThresholds.filter((t) => t.maxLevel !== maxSteps)
        const hardGatesEnabled = import.meta.env.VITE_LOGIX_PERF_HARD_GATES !== 'off'
        if (hardGatesEnabled && gateFailures.length > 0) {
          const readP95 = (timeSlicing: 'off' | 'on'): number | undefined => {
            const point = points.find(
              (p) =>
                p.status === 'ok' && (p.params as any).timeSlicing === timeSlicing && (p.params as any).steps === 2000,
            )
            const metric = point?.metrics.find((m) => m.name === 'runtime.txnCommitMs')
            return metric && metric.status === 'ok' ? metric.stats.p95Ms : undefined
          }

          const offP95 = readP95('off')
          const onP95 = readP95('on')
          const ratio =
            typeof offP95 === 'number' &&
            Number.isFinite(offP95) &&
            offP95 > 0 &&
            typeof onP95 === 'number' &&
            Number.isFinite(onP95)
              ? onP95 / offP95
              : undefined

          const details = gateFailures
            .map(
              (t) =>
                `where=${JSON.stringify(t.where ?? {})} maxLevel=${String(t.maxLevel)} firstFail=${String(
                  t.firstFailLevel,
                )} reason=${String(t.reason)}`,
            )
            .join('\n')
          throw new Error(
            `perf hard gate failed: ${ratioBudgetId} expected maxLevel=${String(maxSteps)} p95(on/off)=` +
              `${String(onP95)}/${String(offP95)} ratio=${String(ratio)}\n${details}`,
          )
        }

        const report: PerfReport = {
          schemaVersion: 1,
          meta: {
            createdAt: new Date().toISOString(),
            generator: 'packages/logix-react/test/browser/perf-boundaries/converge-time-slicing.test.tsx',
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
              },
              points,
              thresholds,
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
