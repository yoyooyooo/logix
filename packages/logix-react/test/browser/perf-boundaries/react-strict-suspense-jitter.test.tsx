import { expect, test } from 'vitest'
import React, { Suspense } from 'react'
import { render } from 'vitest-browser-react'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import matrix from '@logixjs/perf-evidence/assets/matrix.json'
import { RuntimeProvider } from '../../../src/RuntimeProvider.js'
import { useModule } from '../../../src/Hooks.js'
import { emitPerfReport, type PerfReport } from './protocol.js'
import {
  getProfileConfig,
  makePerfKernelLayer,
  runMatrixSuite,
  silentDebugLayer,
  type Params,
  withNodeEnv,
} from './harness.js'

const suite = (matrix.suites as any[]).find((s) => s.id === 'react.strictSuspenseJitter') as any

const { runs, warmupDiscard, timeoutMs } = getProfileConfig(matrix)

const TEST_TIMEOUT_MS = Math.max(
  30_000,
  timeoutMs * (suite.axes.mountCycles as number[]).length * (suite.axes.suspenseCycles as number[]).length,
)

const State = Schema.Struct({
  ready: Schema.Boolean,
  value: Schema.Number,
})

const Actions = {
  tick: Schema.Void,
  resolve: Schema.Number,
}

const SuspenseModule = Logix.Module.make('PerfStrictSuspenseJitter', {
  state: State,
  actions: Actions,
})

const makeLogic = (suspenseCycles: number) =>
  SuspenseModule.logic(($) =>
    Effect.gen(function* () {
      let pendingResolves = 0

      yield* $.onAction('tick').runParallelFork(
        $.state.update((prev) => {
          const nextValue = prev.value + 1
          const nextPending = (pendingResolves + 1) % Math.max(1, suspenseCycles + 1)
          pendingResolves = nextPending
          return {
            ready: suspenseCycles === 0 ? true : nextPending === 0,
            value: nextValue,
          }
        }),
      )
    }),
  )

const SuspenseChild: React.FC<{ readonly module: any }> = ({ module }) => {
  const state = useModule(module, (s: unknown) => s as { ready: boolean; value: number })
  return <p>Value: {state.value}</p>
}

const App: React.FC = () => {
  const module = useModule(SuspenseModule.tag)
  return (
    <div>
      <Suspense fallback={<p>Loading…</p>}>
        <SuspenseChild module={module} />
      </Suspense>
      <button type="button" onClick={() => module.actions.tick()}>
        Tick
      </button>
    </div>
  )
}

test('browser react strict/suspense jitter: interaction→stable', { timeout: TEST_TIMEOUT_MS }, async () => {
  await withNodeEnv('production', async () => {
    const perfKernelLayer = makePerfKernelLayer()
    const { points, thresholds } = await runMatrixSuite(
      suite,
      { runs, warmupDiscard, timeoutMs },
      async (params: Params) => {
        const mountCycles = params.mountCycles as number
        const suspenseCycles = params.suspenseCycles as number

        const impl = SuspenseModule.implement({
          initial: { ready: suspenseCycles === 0, value: 0 },
          logics: [makeLogic(suspenseCycles)],
        })

        const runtime = Logix.Runtime.make(impl, {
          layer: Layer.mergeAll(silentDebugLayer, perfKernelLayer) as Layer.Layer<any, never, never>,
          label: `perf:reactStrictSuspense:${mountCycles}:${suspenseCycles}`,
        })

        const app = (
          <RuntimeProvider runtime={runtime}>
            <App />
          </RuntimeProvider>
        )

        const wrapped = <React.StrictMode>{app}</React.StrictMode>

        document.body.innerHTML = ''
        const screen = await render(wrapped)

        try {
          const button = screen.getByRole('button', { name: 'Tick' })

          const start = performance.now()
          for (let i = 0; i < mountCycles; i++) {
            await button.click()
          }

          await expect.element(screen.getByText(/Value:/)).toBeInTheDocument()

          const end = performance.now()

          return {
            metrics: {
              'e2e.interactionToStableMs': end - start,
            },
          }
        } finally {
          screen.unmount()
          document.body.innerHTML = ''
          await runtime.dispose()
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
        generator: 'packages/logix-react/test/browser/perf-boundaries/react-strict-suspense-jitter.test.tsx',
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
            'e2e.interactionToStableMs': 'e2e',
          },
          points,
          thresholds,
        },
      ],
    }

    emitPerfReport(report)
  })
})
