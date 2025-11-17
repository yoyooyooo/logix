import { test } from 'vitest'
import React from 'react'
import { render } from 'vitest-browser-react'
import { Layer, Schema } from 'effect'
import * as Logix from '@logix/core'
import matrix from '@logix/perf-evidence/assets/matrix.json'
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

const suite = (matrix.suites as any[]).find((s) => s.id === 'txnLanes.urgentBacklog') as any

const readTxnLanesMode = (): 'off' | 'on' | 'default' => {
  const raw = (import.meta.env as any).VITE_LOGIX_PERF_TXN_LANES_MODE as unknown
  if (raw === 'on') return 'on'
  if (raw === 'default') return 'default'
  return 'off'
}

const readTxnLanesYieldStrategy = (): 'baseline' | 'inputPending' => {
  const raw = (import.meta.env as any).VITE_LOGIX_PERF_TXN_LANES_YIELD_STRATEGY as unknown
  return raw === 'inputPending' ? 'inputPending' : 'baseline'
}

const TXN_LANES_MODE = readTxnLanesMode()
const TXN_LANES_YIELD_STRATEGY = readTxnLanesYieldStrategy()

const computeValue = (iters: number, a: number, offset: number): number => {
  let x = (a + offset) | 0
  for (let i = 0; i < iters; i++) {
    x = (Math.imul(x, 1103515245) + 12345) | 0
  }
  return x
}

const nextFrame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()))

const waitForBodyText = async (text: string, timeoutMs: number): Promise<void> => {
  const deadline = performance.now() + timeoutMs
  while (performance.now() < deadline) {
    if (document.body.textContent?.includes(text)) return
    await nextFrame()
  }
  throw new Error(`waitForBodyText timeout: ${text}`)
}

const makeTxnLanesModule = (
  steps: number,
  iters: number,
): { readonly M: any; readonly impl: any; readonly lastKey: string; readonly initialLastValue: number } => {
  const fields: Record<string, any> = {
    a: Schema.Number,
    b: Schema.Number,
  }
  for (let i = 0; i < steps; i++) {
    fields[`d${i}`] = Schema.Number
  }

  type S = Record<string, number>
  const State = Schema.Struct(fields) as unknown as Schema.Schema<S>
  const Actions = { setA: Schema.Number, urgent: Schema.Void }

  const traits: Record<string, any> = {}
  for (let i = 0; i < steps; i++) {
    traits[`d${i}`] = Logix.StateTrait.computed({
      deps: ['a'] as any,
      get: (a: any) => computeValue(iters, a as number, i),
      scheduling: 'deferred',
    } as any)
  }

  const M = Logix.Module.make(`Perf060TxnLanesSteps${steps}`, {
    state: State,
    actions: Actions,
    reducers: {
      setA: Logix.Module.Reducer.mutate((draft, payload: number) => {
        draft.a = payload
      }),
      urgent: Logix.Module.Reducer.mutate((draft) => {
        draft.b = (draft.b ?? 0) + 1
      }),
    },
    traits: Logix.StateTrait.from(State as any)(traits as any),
  })

  const initial: Record<string, number> = {
    a: 0,
    b: 0,
  }
  for (let i = 0; i < steps; i++) {
    initial[`d${i}`] = computeValue(iters, 0, i)
  }

  const impl = M.implement({ initial })
  const lastKey = `d${Math.max(0, steps - 1)}`

  return { M, impl, lastKey, initialLastValue: initial[lastKey] ?? 0 }
}

const App: React.FC<{ readonly moduleTag: any; readonly lastKey: string }> = ({ moduleTag, lastKey }) => {
  const module = useModule(moduleTag) as any
  const b = useModule(module, (s) => (s as any).b as number)
  const dLast = useModule(module, (s) => (s as any)[lastKey] as number)

  return (
    <div>
      <p>B: {b}</p>
      <p>D: {dLast}</p>
      <button type="button" onClick={() => module.actions.setA(0)}>
        SetA0
      </button>
      <button type="button" onClick={() => module.actions.setA(1)}>
        SetA1
      </button>
      <button type="button" onClick={() => module.actions.urgent()}>
        Urgent
      </button>
    </div>
  )
}

const { runs, warmupDiscard, timeoutMs } = getProfileConfig(matrix)

const pointCount = Object.values(suite.axes as Record<string, ReadonlyArray<unknown>>).reduce(
  (acc, levels) => acc * levels.length,
  1,
)

const TEST_TIMEOUT_MS = Math.max(30_000, timeoutMs * pointCount)

test('browser txn lanes: urgent p95 under non-urgent backlog (off vs on)', { timeout: TEST_TIMEOUT_MS }, async () => {
  await withNodeEnv('production', async () => {
    const perfKernelLayer = makePerfKernelLayer()
    const runtimeLayer = Layer.mergeAll(silentDebugLayer, perfKernelLayer) as Layer.Layer<any, never, never>

    const ITERS = 800
    const LANE_BUDGET_MS = 1
    const LANE_MAX_LAG_MS = 50

    type Active = {
      readonly steps: number
      readonly iters: number
      readonly lastKey: string
      readonly runtime: any
      readonly screen: any
      readonly setA0: any
      readonly setA1: any
      readonly urgent: any
      a: 0 | 1
      b: number
    }

    let active: Active | undefined

    const disposeActive = async () => {
      if (!active) return
      active.screen.unmount()
      document.body.innerHTML = ''
      await active.runtime.dispose()
      active = undefined
    }

    const ensureActive = async (steps: number): Promise<Active> => {
      if (active?.steps === steps) return active
      await disposeActive()

      const { M, impl, lastKey, initialLastValue } = makeTxnLanesModule(steps, ITERS)

      const runtime = Logix.Runtime.make(impl, {
        layer: runtimeLayer,
        label: `perf:txnLanes:${TXN_LANES_MODE}:${TXN_LANES_YIELD_STRATEGY}:${steps}`,
        stateTransaction: {
          traitConvergeMode: 'dirty',
          traitConvergeBudgetMs: 100_000,
          traitConvergeDecisionBudgetMs: 100_000,
          traitConvergeTimeSlicing: { enabled: true, debounceMs: 0, maxLagMs: LANE_MAX_LAG_MS },
          ...(TXN_LANES_MODE === 'on'
            ? {
                txnLanes: {
                  enabled: true,
                  budgetMs: LANE_BUDGET_MS,
                  debounceMs: 0,
                  maxLagMs: LANE_MAX_LAG_MS,
                  allowCoalesce: true,
                  yieldStrategy: TXN_LANES_YIELD_STRATEGY,
                },
              }
            : TXN_LANES_MODE === 'off'
              ? { txnLanes: { enabled: false } }
              : {}),
        },
      })

      document.body.innerHTML = ''
      const screen = await render(
        <RuntimeProvider runtime={runtime}>
          <App moduleTag={M.tag} lastKey={lastKey} />
        </RuntimeProvider>,
      )

      const perRunWaitMs = Math.min(10_000, timeoutMs)
      await waitForBodyText(`D: ${String(initialLastValue)}`, perRunWaitMs)

      const setA0 = screen.getByRole('button', { name: 'SetA0' })
      const setA1 = screen.getByRole('button', { name: 'SetA1' })
      const urgent = screen.getByRole('button', { name: 'Urgent' })

      active = { steps, iters: ITERS, lastKey, runtime, screen, setA0, setA1, urgent, a: 0, b: 0 }
      return active
    }

    try {
      const { points, thresholds } = await runMatrixSuite(
        suite,
        { runs, warmupDiscard, timeoutMs },
        async (params: Params) => {
          const steps = params.steps as number
          const ctx = await ensureActive(steps)

          const perRunWaitMs = Math.min(10_000, timeoutMs)

          try {
            const nextA: 0 | 1 = ctx.a === 0 ? 1 : 0
            const expectedLast = computeValue(ctx.iters, nextA, Math.max(0, steps - 1))

            const backlogStartedAt = performance.now()
            if (nextA === 0) {
              await ctx.setA0.click()
            } else {
              await ctx.setA1.click()
            }
            ctx.a = nextA

            ctx.b += 1
            const expectedB = ctx.b

            const urgentScheduledAt = performance.now()
            await new Promise<void>((resolve, reject) => {
              setTimeout(() => {
                ctx.urgent
                  .click()
                  .then(() => resolve())
                  .catch(reject)
              }, 0)
            })

            await waitForBodyText(`B: ${String(expectedB)}`, perRunWaitMs)
            const urgentStableAt = performance.now()

            await waitForBodyText(`D: ${String(expectedLast)}`, perRunWaitMs)
            const caughtUpAt = performance.now()

            return {
              metrics: {
                'e2e.urgentToStableMs': urgentStableAt - urgentScheduledAt,
                'runtime.backlogCatchUpMs': caughtUpAt - backlogStartedAt,
              },
              evidence: {
                'txnLanes.mode': TXN_LANES_MODE,
                'txnLanes.budgetMs': LANE_BUDGET_MS,
                'txnLanes.maxLagMs': LANE_MAX_LAG_MS,
                'txnLanes.yieldStrategy': TXN_LANES_MODE === 'on' ? TXN_LANES_YIELD_STRATEGY : 'baseline',
              },
            }
          } catch (error) {
            const reason = error instanceof Error ? error.message : 'unknown'
            return {
              metrics: {
                'e2e.urgentToStableMs': { unavailableReason: reason },
                'runtime.backlogCatchUpMs': { unavailableReason: reason },
              },
              evidence: {
                'txnLanes.mode': TXN_LANES_MODE,
                'txnLanes.budgetMs': LANE_BUDGET_MS,
                'txnLanes.maxLagMs': LANE_MAX_LAG_MS,
                'txnLanes.yieldStrategy': TXN_LANES_MODE === 'on' ? TXN_LANES_YIELD_STRATEGY : 'baseline',
              },
            }
          }
        },
        { cutOffOn: ['timeout'] },
      )

      const report: PerfReport = {
        schemaVersion: 1,
        meta: {
          createdAt: new Date().toISOString(),
          generator: 'packages/logix-react/test/browser/perf-boundaries/txn-lanes.test.tsx',
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
              'e2e.urgentToStableMs': 'e2e',
              'runtime.backlogCatchUpMs': 'runtime',
            },
            points,
            thresholds,
          },
        ],
      }

      emitPerfReport(report)
    } finally {
      await disposeActive()
    }
  })
})
