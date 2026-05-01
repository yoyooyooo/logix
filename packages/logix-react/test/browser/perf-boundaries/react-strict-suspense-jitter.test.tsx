import { expect, test } from 'vitest'
import React, { Suspense } from 'react'
import { render } from 'vitest-browser-react'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import matrix from '@logixjs/perf-evidence/assets/matrix.json'
import { RuntimeProvider } from '../../../src/RuntimeProvider.js'
import { fieldValues } from '../../../src/FormProjection.js'
import { useModule, useSelector } from '../../../src/Hooks.js'
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
}

const SuspenseModule = Logix.Module.make('PerfStrictSuspenseJitter', {
  state: State,
  actions: Actions,
})

const makeLogic = (suspenseCycles: number) =>
  SuspenseModule.logic('suspense-module-logic', ($) =>
    Effect.gen(function* () {
      yield* $.onAction('tick').runLatest(() =>
        Effect.gen(function* () {
          yield* $.state.mutate((draft) => {
            draft.value += 1
            draft.ready = suspenseCycles === 0
          })

          for (let index = 0; index < suspenseCycles; index++) {
            yield* Effect.sleep('0 millis')
          }

          if (suspenseCycles > 0) {
            yield* $.state.mutate((draft) => {
              draft.ready = true
            })
          }
        }),
      )
    }),
  )

type SuspenseState = {
  readonly ready: boolean
  readonly value: number
}

const pendingReadyByRuntime = new WeakMap<object, Promise<void>>()

const nextFrame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()))

const waitForReady = (module: any): Promise<void> => {
  const runtimeKey = module.runtime as object
  const cached = pendingReadyByRuntime.get(runtimeKey)
  if (cached) return cached

  const promise = new Promise<void>((resolve, reject) => {
    const poll = () => {
      void Effect.runPromise(module.getState as Effect.Effect<SuspenseState>).then(
        (state) => {
          if (state.ready) {
            pendingReadyByRuntime.delete(runtimeKey)
            resolve()
            return
          }
          void nextFrame().then(poll)
        },
        (error) => {
          pendingReadyByRuntime.delete(runtimeKey)
          reject(error)
        },
      )
    }

    void nextFrame().then(poll)
  })

  pendingReadyByRuntime.set(runtimeKey, promise)
  return promise
}

const SuspenseChild: React.FC<{ readonly module: any }> = ({ module }) => {
  const [ready, value] = useSelector(module, fieldValues(['ready', 'value'] as const)) as readonly [boolean, number]
  const state: SuspenseState = { ready, value }
  if (!state.ready) {
    throw waitForReady(module)
  }
  return <p>{`Value: ${String(state.value)}`}</p>
}

const Fallback: React.FC<{ readonly onRender: () => void }> = ({ onRender }) => {
  onRender()
  return <p>Loading…</p>
}

const App: React.FC<{ readonly onFallbackRender: () => void }> = ({ onFallbackRender }) => {
  const module = useModule(SuspenseModule.tag)
  return (
    <div>
      <Suspense fallback={<Fallback onRender={onFallbackRender} />}>
        <SuspenseChild module={module} />
      </Suspense>
      <button type="button" onClick={() => module.actions.tick()}>
        Tick
      </button>
    </div>
  )
}

const waitForBodyText = async (text: string, timeoutMs: number): Promise<void> => {
  const deadline = performance.now() + timeoutMs
  while (performance.now() < deadline) {
    if (document.body.textContent?.includes(text)) return
    await nextFrame()
  }
  throw new Error(`waitForBodyText timeout: ${text}`)
}

test('browser react strict/suspense jitter: interaction→stable', { timeout: TEST_TIMEOUT_MS }, async () => {
  await withNodeEnv('production', async () => {
    const perfKernelLayer = makePerfKernelLayer()
    const { points, thresholds } = await runMatrixSuite(
      suite,
      { runs, warmupDiscard, timeoutMs },
      async (params: Params) => {
        const reactStrictMode = params.reactStrictMode as boolean
        const mountCycles = params.mountCycles as number
        const suspenseCycles = params.suspenseCycles as number

        const program = Logix.Program.make(SuspenseModule, {
          initial: { ready: true, value: 0 },
          logics: [makeLogic(suspenseCycles)],
        })

        const runtime = Logix.Runtime.make(program, {
          layer: Layer.mergeAll(silentDebugLayer, perfKernelLayer) as Layer.Layer<any, never, never>,
          label: `perf:reactStrictSuspense:${mountCycles}:${suspenseCycles}`,
        })

        let fallbackRenders = 0

        const app = (
          <RuntimeProvider runtime={runtime} fallback={<p>Provider Loading…</p>}>
            <App onFallbackRender={() => fallbackRenders += 1} />
          </RuntimeProvider>
        )

        const wrapped = reactStrictMode ? <React.StrictMode>{app}</React.StrictMode> : app

        document.body.innerHTML = ''
        const screen = await render(wrapped)

        try {
          const button = screen.getByRole('button', { name: 'Tick' })
          const perRunWaitMs = Math.min(10_000, timeoutMs)

          await waitForBodyText('Value: 0', perRunWaitMs)

          for (let cycle = 1; cycle < mountCycles; cycle++) {
            await button.click()
            await waitForBodyText(`Value: ${String(cycle)}`, perRunWaitMs)
          }

          const start = performance.now()
          await button.click()
          await waitForBodyText(`Value: ${String(mountCycles)}`, perRunWaitMs)
          const end = performance.now()

          return {
            metrics: {
              'e2e.interactionToStableMs': end - start,
            },
            evidence: {
              'react.suspenseFallbackRenders': fallbackRenders,
            },
          }
        } catch (error) {
          const reason = error instanceof Error ? error.message : 'unknown'
          return {
            metrics: {
              'e2e.interactionToStableMs': { unavailableReason: reason },
            },
            evidence: {
              'react.suspenseFallbackRenders': fallbackRenders,
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
          requiredEvidence: suite.requiredEvidence,
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
