import { expect, test } from 'vitest'
import React from 'react'
import { render } from 'vitest-browser-react'
import { Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import matrix from '@logixjs/perf-evidence/assets/matrix.json'
import { RuntimeProvider } from '../../../src/RuntimeProvider.js'
import { useModule } from '../../../src/Hooks.js'
import { RuntimeContext } from '../../../src/internal/provider/ReactContext.js'
import { emitPerfReport, type PerfReport } from './protocol.js'
import {
  getProfileConfig,
  makePerfKernelLayer,
  runMatrixSuite,
  silentDebugLayer,
  type Params,
  withNodeEnv,
} from './harness.js'

const suite = (matrix.suites as any[]).find((s) => s.id === 'react.deferPreload') as any

const { runs, warmupDiscard, timeoutMs } = getProfileConfig(matrix)

const TEST_TIMEOUT_MS = Math.max(30_000, timeoutMs * (suite.axes.mountCycles as number[]).length)

const State = Schema.Struct({ count: Schema.Number })
const Actions = { inc: Schema.Void }

const Counter = Logix.Module.make('PerfReactDeferPreload.Counter', { state: State, actions: Actions })
const CounterModule = Counter.implement({ initial: { count: 0 }, logics: [] })
const CounterImpl = CounterModule.impl

const App: React.FC = () => {
  const ref = useModule(CounterImpl)
  const count = useModule(ref, (s) => (s as { count: number }).count)
  return <p>Count: {count}</p>
}

test('browser react defer+preload: no double fallback/suspend', { timeout: TEST_TIMEOUT_MS }, async () => {
  await withNodeEnv('production', async () => {
    const perfKernelLayer = makePerfKernelLayer()
    const { points, thresholds } = await runMatrixSuite(
      suite,
      { runs, warmupDiscard, timeoutMs },
      async (params: Params) => {
        const preloadEnabled = params.preloadEnabled as boolean

        const runtime = Logix.Runtime.make(CounterImpl, {
          layer: Layer.mergeAll(silentDebugLayer, perfKernelLayer) as Layer.Layer<any, never, never>,
          label: `perf:reactDeferPreload:${preloadEnabled}`,
        })

        let gatingFallbackRenders = 0
        let suspenseFallbackRenders = 0

        const Fallback: React.FC = () => {
          const ctx = React.useContext(RuntimeContext)
          if (ctx) suspenseFallbackRenders += 1
          else gatingFallbackRenders += 1
          return <p>Loading…</p>
        }

        const policy = preloadEnabled ? { mode: 'defer' as const, preload: [CounterImpl] } : { mode: 'defer' as const }

        const app = (
          <RuntimeProvider runtime={runtime} policy={policy} fallback={<Fallback />}>
            <App />
          </RuntimeProvider>
        )

        const start = performance.now()
        const screen = await render(app)
        try {
          await expect.element(screen.getByText('Count: 0')).toBeInTheDocument()
          const end = performance.now()

          if (preloadEnabled) {
            expect(suspenseFallbackRenders).toBe(0)
          }

          return {
            metrics: {
              'e2e.bootToReadyMs': end - start,
            },
            evidence: {
              'react.defer.gatingFallbackRenders': gatingFallbackRenders,
              'react.defer.suspenseFallbackRenders': suspenseFallbackRenders,
            },
          }
        } finally {
          screen.unmount()
          await runtime.dispose()
        }
      },
      { cutOffOn: ['timeout'] },
    )

    const report: PerfReport = {
      schemaVersion: 1,
      meta: {
        createdAt: new Date().toISOString(),
        generator: 'packages/logix-react/test/browser/perf-boundaries/react-defer-preload.test.tsx',
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
          requiredEvidence: suite.requiredEvidence,
          metricCategories: {
            'e2e.bootToReadyMs': 'e2e',
          },
          points,
          thresholds,
        },
      ],
    }

    emitPerfReport(report)
  })
})
