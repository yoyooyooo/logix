import { expect, test } from 'vitest'
import React from 'react'
import { render } from 'vitest-browser-react'
import { Effect, Layer } from 'effect'
import * as Logix from '@logix/core'
import matrix from '@logix/perf-evidence/assets/matrix.json'
import { RuntimeProvider } from '../../../src/RuntimeProvider.js'
import { useModule } from '../../../src/Hooks.js'
import { makePerfCounterIncWatchersLogic, makePerfCounterModule } from '../../../src/internal/store/perfWorkloads.js'
import { emitPerfReport, type PerfReport } from './protocol.js'
import {
  getProfileConfig,
  makePerfKernelLayer,
  runMatrixSuite,
  silentDebugLayer,
  type Params,
  withNodeEnv,
} from './harness.js'

const PerfModule = makePerfCounterModule('PerfDiagnosticsOverheadCounter')

const PerfApp: React.FC = () => {
  const perf = useModule(PerfModule.tag)
  const value = useModule(perf, (s: unknown) => (s as { value: number }).value)

  return (
    <div>
      <p>Value: {value}</p>
      <button type="button" onClick={() => perf.actions.inc()}>
        Increment
      </button>
    </div>
  )
}

const suite = (matrix.suites as any[]).find((s) => s.id === 'diagnostics.overhead.e2e') as any

const diagnosticsLevels = suite.axes.diagnosticsLevel as Array<'off' | 'light' | 'sampled' | 'full'>
const scenarios = suite.axes.scenario as string[]

const { runs, warmupDiscard, timeoutMs } = getProfileConfig(matrix)

const resolveProfileId = (): string => {
  const profile = import.meta.env.VITE_LOGIX_PERF_PROFILE
  const profiles = (matrix as any).defaults?.profiles ?? {}
  if (profile && profiles[profile]) {
    return profile
  }
  return 'matrix.defaults'
}

const TEST_TIMEOUT_MS = Math.max(30_000, timeoutMs * diagnosticsLevels.length * scenarios.length)

type ComparisonSpec = {
  readonly id: string
  readonly kind: 'ratio' | 'delta'
  readonly metric: string
  readonly numeratorRef: string
  readonly denominatorRef: string
}

type ComparisonResult = {
  readonly kind: 'ratio' | 'delta'
  readonly metric: string
  readonly numeratorWhere: Params
  readonly denominatorWhere: Params
  readonly unit: 'ratio' | 'ms'
  readonly stats: {
    readonly median: number
    readonly p95: number
  }
}

const parseRef = (ref: string): Params => {
  const out: Params = {}
  for (const part of ref.split('&')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const k = trimmed.slice(0, eq).trim()
    const v = trimmed.slice(eq + 1).trim()
    if (!k) continue

    if (v === 'true') out[k] = true
    else if (v === 'false') out[k] = false
    else if (/^-?\d+(\.\d+)?$/.test(v)) out[k] = Number(v)
    else out[k] = v
  }
  return out
}

const findPoint = (
  points: ReadonlyArray<
    ReturnType<typeof runMatrixSuite> extends Promise<infer R>
      ? R extends { readonly points: ReadonlyArray<infer P> }
        ? P
        : never
      : never
  >,
  expected: Params,
) => points.find((p) => Object.keys(expected).every((k) => (p as any).params[k] === expected[k])) as any

const computeComparisons = (
  points: ReadonlyArray<
    ReturnType<typeof runMatrixSuite> extends Promise<infer R>
      ? R extends { readonly points: ReadonlyArray<infer P> }
        ? P
        : never
      : never
  >,
  specs: ReadonlyArray<ComparisonSpec>,
): ReadonlyArray<ComparisonResult> => {
  const results: ComparisonResult[] = []

  for (const spec of specs) {
    const numeratorWhere = parseRef(spec.numeratorRef)
    const denominatorWhere = parseRef(spec.denominatorRef)

    const numeratorPoint = findPoint(points, numeratorWhere)
    const denominatorPoint = findPoint(points, denominatorWhere)
    if (!numeratorPoint || !denominatorPoint) {
      continue
    }

    const numMetric = (numeratorPoint.metrics as any[]).find((m) => m.name === spec.metric && m.status === 'ok')
    const denMetric = (denominatorPoint.metrics as any[]).find((m) => m.name === spec.metric && m.status === 'ok')
    if (!numMetric || !denMetric) {
      continue
    }

    const numMedian = numMetric.stats.medianMs as number
    const numP95 = numMetric.stats.p95Ms as number
    const denMedian = denMetric.stats.medianMs as number
    const denP95 = denMetric.stats.p95Ms as number

    if (!Number.isFinite(numMedian) || !Number.isFinite(denMedian) || denMedian <= 0) {
      continue
    }
    if (!Number.isFinite(numP95) || !Number.isFinite(denP95) || denP95 <= 0) {
      continue
    }

    if (spec.kind === 'ratio') {
      results.push({
        kind: 'ratio',
        metric: spec.metric,
        numeratorWhere,
        denominatorWhere,
        unit: 'ratio',
        stats: {
          median: numMedian / denMedian,
          p95: numP95 / denP95,
        },
      })
    } else {
      results.push({
        kind: 'delta',
        metric: spec.metric,
        numeratorWhere,
        denominatorWhere,
        unit: 'ms',
        stats: {
          median: numMedian - denMedian,
          p95: numP95 - denP95,
        },
      })
    }
  }

  return results
}

test(
  'browser diagnostics overhead: off/light/full under click-to-paint scenario',
  { timeout: TEST_TIMEOUT_MS },
  async () => {
    await withNodeEnv('production', async () => {
      const watcherCount = 256
      const diagRuns = Math.min(5, runs)
      const diagWarmupDiscard = 0
      const perfKernelLayer = makePerfKernelLayer()

      const impl = PerfModule.implement({
        initial: { value: 0 },
        logics: [makePerfCounterIncWatchersLogic(PerfModule, watcherCount)],
      })

      const { points, thresholds } = await runMatrixSuite(
        suite,
        { runs: diagRuns, warmupDiscard: diagWarmupDiscard, timeoutMs },
        async (params) => {
          const diagnosticsLevel = params.diagnosticsLevel as 'off' | 'light' | 'sampled' | 'full'
          const scenario = params.scenario as string
          expect(scenario).toBe('watchers.clickToPaint')
          const instrumentation = diagnosticsLevel === 'full' ? 'full' : 'light'
          const debugLayer = Logix.Debug.devtoolsHubLayer(silentDebugLayer as Layer.Layer<any, never, never>, {
            diagnosticsLevel,
          }) as Layer.Layer<any, never, never>

          const runtime = Logix.Runtime.make(impl, {
            stateTransaction: {
              instrumentation,
            },
            layer: Layer.mergeAll(debugLayer, perfKernelLayer) as Layer.Layer<any, never, never>,
            label: `perf:diagnostics:${diagnosticsLevel}:${watcherCount}`,
          })

          // Warm up: avoid triggering module assembly during React render (may introduce Suspense / unstable latency).
          await runtime.runPromise(
            Effect.gen(function* () {
              yield* PerfModule.tag
            }) as Effect.Effect<void, never, any>,
          )

          const app = (
            <RuntimeProvider runtime={runtime}>
              <PerfApp />
            </RuntimeProvider>
          )

          const screen = await render(app)

          try {
            await expect.element(screen.getByText('Value: 0')).toBeInTheDocument()

            const button = screen.getByRole('button', { name: 'Increment' })

            const start = performance.now()
            await button.click()
            await expect.element(screen.getByText(`Value: ${watcherCount}`)).toBeInTheDocument()
            const end = performance.now()

            return {
              metrics: { 'e2e.clickToPaintMs': end - start },
              evidence: {
                'diagnostics.level': diagnosticsLevel,
              },
            }
          } finally {
            screen.unmount()
            await runtime.dispose()
          }
        },
        {
          cutOffOn: ['timeout'],
        },
      )

      const comparisons: ReadonlyArray<ComparisonResult> = computeComparisons(
        points,
        (suite.comparisons ?? []) as ReadonlyArray<ComparisonSpec>,
      )

      const report: PerfReport = {
        schemaVersion: 1,
        meta: {
          createdAt: new Date().toISOString(),
          generator: 'packages/logix-react/test/browser/perf-boundaries/diagnostics-overhead.test.tsx',
          matrixId: matrix.id,
          config: {
            runs: diagRuns,
            warmupDiscard: diagWarmupDiscard,
            timeoutMs,
            headless: matrix.defaults.browser.headless,
            profile: resolveProfileId(),
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
              'e2e.clickToPaintMs': 'diagnostics',
            },
            points,
            thresholds,
            comparisons,
          },
        ],
      }

      emitPerfReport(report)
    })
  },
)
