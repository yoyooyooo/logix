import { test } from 'vitest'
import React from 'react'
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
  type EvidenceSample,
  type Params,
  withNodeEnv,
} from './harness.js'

const suite = (matrix.suites as any[]).find((s) => s.id === 'txnLanes.urgentBacklog') as any

const readTxnLanesModeOverride = (): 'off' | 'on' | 'default' | undefined => {
  const raw = (import.meta.env as any).VITE_LOGIX_PERF_TXN_LANES_MODE as unknown
  if (raw === 'on') return 'on'
  if (raw === 'off') return 'off'
  if (raw === 'default') return 'default'
  return undefined
}

const readTxnLanesYieldStrategy = (): 'baseline' | 'inputPending' => {
  const raw = (import.meta.env as any).VITE_LOGIX_PERF_TXN_LANES_YIELD_STRATEGY as unknown
  return raw === 'inputPending' ? 'inputPending' : 'baseline'
}

const TXN_LANES_MODE_OVERRIDE = readTxnLanesModeOverride()
const TXN_LANES_YIELD_STRATEGY = readTxnLanesYieldStrategy()

const resolveTxnLanesMode = (params: Params): 'off' | 'on' | 'default' => {
  if (TXN_LANES_MODE_OVERRIDE) return TXN_LANES_MODE_OVERRIDE
  const raw = params.mode
  if (raw === 'on') return 'on'
  if (raw === 'off') return 'off'
  return 'default'
}

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

const TXN_QUEUE_EPSILON_MS = 1

type TxnQueueTraceData = {
  readonly lane: 'urgent' | 'nonUrgent'
  readonly waiterSeq: number
  readonly enqueueAtMs: number
  readonly startAtMs: number
  readonly queueWaitMs: number
  readonly startMode: 'direct_idle' | 'direct_handoff' | 'post_visibility_window'
  readonly visibilityWindowMs?: number
  readonly previousCompletedLane?: 'urgent' | 'nonUrgent'
  readonly activeLaneAtEnqueue?: 'urgent' | 'nonUrgent'
  readonly queueDepthAtStart: {
    readonly urgent: number
    readonly nonUrgent: number
  }
}

const unavailableEvidence = (reason: string): EvidenceSample => ({ unavailableReason: reason })

const isTxnQueueTraceData = (value: unknown): value is TxnQueueTraceData => {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  if (data.lane !== 'urgent' && data.lane !== 'nonUrgent') return false
  if (typeof data.waiterSeq !== 'number' || !Number.isFinite(data.waiterSeq)) return false
  if (typeof data.enqueueAtMs !== 'number' || !Number.isFinite(data.enqueueAtMs)) return false
  if (typeof data.startAtMs !== 'number' || !Number.isFinite(data.startAtMs)) return false
  if (typeof data.queueWaitMs !== 'number' || !Number.isFinite(data.queueWaitMs)) return false
  if (
    data.startMode !== 'direct_idle' &&
    data.startMode !== 'direct_handoff' &&
    data.startMode !== 'post_visibility_window'
  ) {
    return false
  }
  const queueDepthAtStart = data.queueDepthAtStart
  if (!queueDepthAtStart || typeof queueDepthAtStart !== 'object') return false
  return true
}

const isTxnQueueTraceEvent = (event: unknown): event is { readonly type: 'trace:txn-queue'; readonly data: TxnQueueTraceData } => {
  if (!event || typeof event !== 'object') return false
  const record = event as Record<string, unknown>
  return record.type === 'trace:txn-queue' && isTxnQueueTraceData(record.data)
}

const summarizeTxnQueueEvidence = (args: {
  readonly events: ReadonlyArray<unknown>
  readonly backlogStartedAt: number
  readonly backlogActionInvokedAt?: number
  readonly urgentScheduledAt: number
  readonly urgentActionInvokedAt?: number
}): Record<string, EvidenceSample> => {
  const queueEvents = args.events
    .filter(isTxnQueueTraceEvent)
    .map((event) => event.data)
    .sort((a, b) => a.startAtMs - b.startAtMs)

  const firstNonUrgent = queueEvents.find(
    (event) => event.lane === 'nonUrgent' && event.startAtMs >= args.backlogStartedAt - TXN_QUEUE_EPSILON_MS,
  )
  const urgentQueue = queueEvents
    .filter((event) => event.lane === 'urgent' && event.enqueueAtMs >= args.urgentScheduledAt - TXN_QUEUE_EPSILON_MS)
    .sort((a, b) => a.enqueueAtMs - b.enqueueAtMs)[0]

  const missingUrgent = unavailableEvidence('urgentQueueStartMissing')
  const missingNonUrgent = unavailableEvidence('firstNonUrgentQueueStartMissing')

  const urgentEnqueueVsFirstNonUrgentStartMs =
    urgentQueue && firstNonUrgent ? urgentQueue.enqueueAtMs - firstNonUrgent.startAtMs : undefined

  const backlogActionInvokeOffsetMs =
    typeof args.backlogActionInvokedAt === 'number' ? args.backlogActionInvokedAt - args.backlogStartedAt : undefined

  const urgentInvokeDelayFromScheduleMs =
    typeof args.urgentActionInvokedAt === 'number' ? args.urgentActionInvokedAt - args.urgentScheduledAt : undefined

  const urgentInvokeVsFirstNonUrgentStartMs =
    typeof args.urgentActionInvokedAt === 'number' && firstNonUrgent
      ? args.urgentActionInvokedAt - firstNonUrgent.startAtMs
      : undefined

  const urgentQueuedWaiter =
    urgentQueue &&
    urgentQueue.activeLaneAtEnqueue === 'nonUrgent' &&
    urgentQueue.queueWaitMs > TXN_QUEUE_EPSILON_MS
      ? 1
      : 0

  const urgentLateEnqueue =
    urgentQueue &&
    typeof urgentEnqueueVsFirstNonUrgentStartMs === 'number' &&
    urgentEnqueueVsFirstNonUrgentStartMs > 0 &&
    urgentQueue.queueWaitMs <= TXN_QUEUE_EPSILON_MS
      ? 1
      : 0

  return {
    'txnQueue.urgent.enqueueOffsetFromBacklogMs': urgentQueue
      ? Math.max(0, urgentQueue.enqueueAtMs - args.backlogStartedAt)
      : missingUrgent,
    'txnQueue.urgent.startOffsetFromBacklogMs': urgentQueue
      ? Math.max(0, urgentQueue.startAtMs - args.backlogStartedAt)
      : missingUrgent,
    'txnQueue.urgent.enqueueDelayFromScheduleMs': urgentQueue
      ? Math.max(0, urgentQueue.enqueueAtMs - args.urgentScheduledAt)
      : missingUrgent,
    'txnQueue.urgent.invokeDelayFromScheduleMs':
      typeof urgentInvokeDelayFromScheduleMs === 'number' ? Math.max(0, urgentInvokeDelayFromScheduleMs) : missingUrgent,
    'txnQueue.urgent.enqueueDelayFromInvokeMs':
      urgentQueue && typeof args.urgentActionInvokedAt === 'number'
        ? Math.max(0, urgentQueue.enqueueAtMs - args.urgentActionInvokedAt)
        : missingUrgent,
    'txnQueue.urgent.startDelayFromInvokeMs':
      urgentQueue && typeof args.urgentActionInvokedAt === 'number'
        ? Math.max(0, urgentQueue.startAtMs - args.urgentActionInvokedAt)
        : missingUrgent,
    'txnQueue.urgent.startDelayFromScheduleMs': urgentQueue
      ? Math.max(0, urgentQueue.startAtMs - args.urgentScheduledAt)
      : missingUrgent,
    'txnQueue.urgent.queueWaitMs': urgentQueue ? urgentQueue.queueWaitMs : missingUrgent,
    'txnQueue.urgent.startMode.directIdle': urgentQueue?.startMode === 'direct_idle' ? 1 : 0,
    'txnQueue.urgent.startMode.directHandoff': urgentQueue?.startMode === 'direct_handoff' ? 1 : 0,
    'txnQueue.urgent.startMode.postVisibilityWindow': urgentQueue?.startMode === 'post_visibility_window' ? 1 : 0,
    'txnQueue.urgent.visibilityWindowMs': urgentQueue?.visibilityWindowMs ?? 0,
    'txnQueue.urgent.previousCompletedLane.nonUrgent': urgentQueue?.previousCompletedLane === 'nonUrgent' ? 1 : 0,
    'txnQueue.urgent.activeLaneAtEnqueue.nonUrgent': urgentQueue?.activeLaneAtEnqueue === 'nonUrgent' ? 1 : 0,
    'txnQueue.urgent.queueDepthAtStart.urgent': urgentQueue ? urgentQueue.queueDepthAtStart.urgent : missingUrgent,
    'txnQueue.urgent.queueDepthAtStart.nonUrgent': urgentQueue ? urgentQueue.queueDepthAtStart.nonUrgent : missingUrgent,
    'txnQueue.urgent.enqueueVsFirstNonUrgentStartMs':
      typeof urgentEnqueueVsFirstNonUrgentStartMs === 'number'
        ? urgentEnqueueVsFirstNonUrgentStartMs
        : missingNonUrgent,
    'txnQueue.urgent.invokeVsFirstNonUrgentStartMs':
      typeof urgentInvokeVsFirstNonUrgentStartMs === 'number'
        ? urgentInvokeVsFirstNonUrgentStartMs
        : missingNonUrgent,
    'txnQueue.urgent.diagnosis.queuedWaiter': urgentQueuedWaiter,
    'txnQueue.urgent.diagnosis.lateEnqueue': urgentLateEnqueue,
    'txnQueue.urgent.diagnosis.idleDirect':
      urgentQueue?.startMode === 'direct_idle' && urgentQueue.activeLaneAtEnqueue == null ? 1 : 0,
    'txnQueue.backlog.firstNonUrgent.enqueueOffsetFromBacklogMs': firstNonUrgent
      ? Math.max(0, firstNonUrgent.enqueueAtMs - args.backlogStartedAt)
      : missingNonUrgent,
    'txnQueue.backlog.firstNonUrgent.invokeOffsetFromBacklogMs':
      typeof backlogActionInvokeOffsetMs === 'number' ? Math.max(0, backlogActionInvokeOffsetMs) : missingNonUrgent,
    'txnQueue.backlog.firstNonUrgent.enqueueDelayFromInvokeMs':
      firstNonUrgent && typeof args.backlogActionInvokedAt === 'number'
        ? Math.max(0, firstNonUrgent.enqueueAtMs - args.backlogActionInvokedAt)
        : missingNonUrgent,
    'txnQueue.backlog.firstNonUrgent.startOffsetFromBacklogMs': firstNonUrgent
      ? Math.max(0, firstNonUrgent.startAtMs - args.backlogStartedAt)
      : missingNonUrgent,
    'txnQueue.backlog.firstNonUrgent.startDelayFromBacklogMs': firstNonUrgent
      ? Math.max(0, firstNonUrgent.startAtMs - args.backlogStartedAt)
      : missingNonUrgent,
    'txnQueue.backlog.firstNonUrgent.startDelayFromInvokeMs':
      firstNonUrgent && typeof args.backlogActionInvokedAt === 'number'
        ? Math.max(0, firstNonUrgent.startAtMs - args.backlogActionInvokedAt)
        : missingNonUrgent,
    'txnQueue.backlog.firstNonUrgent.queueWaitMs': firstNonUrgent ? firstNonUrgent.queueWaitMs : missingNonUrgent,
    'txnQueue.backlog.firstNonUrgent.startMode.directHandoff':
      firstNonUrgent?.startMode === 'direct_handoff' ? 1 : 0,
    'txnQueue.backlog.firstNonUrgent.previousCompletedLane.urgent':
      firstNonUrgent?.previousCompletedLane === 'urgent' ? 1 : 0,
    'txnQueue.backlog.firstNonUrgent.activeLaneAtEnqueue.urgent':
      firstNonUrgent?.activeLaneAtEnqueue === 'urgent' ? 1 : 0,
  }
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

const App: React.FC<{
  readonly moduleTag: any
  readonly lastKey: string
  readonly onSetAInvoked?: (atMs: number) => void
  readonly onUrgentInvoked?: (atMs: number) => void
}> = ({ moduleTag, lastKey, onSetAInvoked, onUrgentInvoked }) => {
  const module = useModule(moduleTag) as any
  const b = useModule(module, (s) => (s as any).b as number)
  const dLast = useModule(module, (s) => (s as any)[lastKey] as number)

  const handleSetA = (value: number) => {
    onSetAInvoked?.(performance.now())
    module.actions.setA(value)
  }

  const handleUrgent = () => {
    onUrgentInvoked?.(performance.now())
    module.actions.urgent()
  }

  return (
    <div>
      <p>B: {b}</p>
      <p>D: {dLast}</p>
      <button type="button" onClick={() => handleSetA(0)}>
        SetA0
      </button>
      <button type="button" onClick={() => handleSetA(1)}>
        SetA1
      </button>
      <button type="button" onClick={handleUrgent}>
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

test('browser txn lanes: urgent p95 under non-urgent backlog (mode matrix)', { timeout: TEST_TIMEOUT_MS }, async () => {
  await withNodeEnv('production', async () => {
    const perfKernelLayer = makePerfKernelLayer()

    const ITERS = 800
    const LANE_BUDGET_MS = 1
    const LANE_MAX_LAG_MS = 50

    type Active = {
      readonly steps: number
      readonly mode: 'off' | 'on' | 'default'
      readonly iters: number
      readonly lastKey: string
      readonly runtime: any
      readonly screen: any
      readonly setA0: any
      readonly setA1: any
      readonly urgent: any
      readonly queueTraceBuffer: ReturnType<typeof Logix.Debug.makeRingBufferSink>
      readonly actionTrace: {
        backlogActionInvokedAt?: number
        urgentActionInvokedAt?: number
      }
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

    const ensureActive = async (steps: number, mode: 'off' | 'on' | 'default'): Promise<Active> => {
      if (active?.steps === steps && active?.mode === mode) return active
      await disposeActive()

      const { M, impl, lastKey, initialLastValue } = makeTxnLanesModule(steps, ITERS)
      const queueTraceBuffer = Logix.Debug.makeRingBufferSink(2048)
      const actionTrace: {
        backlogActionInvokedAt?: number
        urgentActionInvokedAt?: number
      } = {}
      const debugLayer = Layer.mergeAll(
        Logix.Debug.replace([queueTraceBuffer.sink]),
        Logix.Debug.diagnosticsLevel('light'),
        Logix.Debug.traceMode('on'),
      ) as Layer.Layer<any, never, never>

      const runtime = Logix.Runtime.make(impl, {
        layer: Layer.mergeAll(debugLayer, perfKernelLayer) as Layer.Layer<any, never, never>,
        label: `perf:txnLanes:${mode}:${TXN_LANES_YIELD_STRATEGY}:${steps}`,
        stateTransaction: {
          traitConvergeMode: 'dirty',
          traitConvergeBudgetMs: 100_000,
          traitConvergeDecisionBudgetMs: 100_000,
          traitConvergeTimeSlicing: { enabled: true, debounceMs: 0, maxLagMs: LANE_MAX_LAG_MS },
          ...(mode === 'on'
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
            : mode === 'off'
              ? { txnLanes: { enabled: false } }
              : {}),
        },
      })

      document.body.innerHTML = ''
      const screen = await render(
        <RuntimeProvider runtime={runtime}>
          <App
            moduleTag={M.tag}
            lastKey={lastKey}
            onSetAInvoked={(atMs) => {
              actionTrace.backlogActionInvokedAt = atMs
            }}
            onUrgentInvoked={(atMs) => {
              actionTrace.urgentActionInvokedAt = atMs
            }}
          />
        </RuntimeProvider>,
      )

      const perRunWaitMs = Math.min(10_000, timeoutMs)
      await waitForBodyText(`D: ${String(initialLastValue)}`, perRunWaitMs)

      const setA0 = screen.getByRole('button', { name: 'SetA0' })
      const setA1 = screen.getByRole('button', { name: 'SetA1' })
      const urgent = screen.getByRole('button', { name: 'Urgent' })

      active = {
        steps,
        mode,
        iters: ITERS,
        lastKey,
        runtime,
        screen,
        setA0,
        setA1,
        urgent,
        queueTraceBuffer,
        actionTrace,
        a: 0,
        b: 0,
      }
      return active
    }

    try {
      const { points, thresholds } = await runMatrixSuite(
        suite,
        { runs, warmupDiscard, timeoutMs },
        async (params: Params) => {
          const steps = params.steps as number
          const mode = resolveTxnLanesMode(params)
          const ctx = await ensureActive(steps, mode)

          const perRunWaitMs = Math.min(10_000, timeoutMs)

          try {
            const nextA: 0 | 1 = ctx.a === 0 ? 1 : 0
            const expectedLast = computeValue(ctx.iters, nextA, Math.max(0, steps - 1))

            ctx.queueTraceBuffer.clear()
            ctx.actionTrace.backlogActionInvokedAt = undefined
            ctx.actionTrace.urgentActionInvokedAt = undefined
            const backlogStartedAt = performance.now()
            if (nextA === 0) {
              await ctx.setA0.click()
            } else {
              await ctx.setA1.click()
            }
            ctx.a = nextA

            ctx.b += 1
            const expectedB = ctx.b

            let urgentScheduledAt = 0
            await new Promise<void>((resolve, reject) => {
              setTimeout(() => {
                urgentScheduledAt = performance.now()
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
            const queueEvidence = summarizeTxnQueueEvidence({
              events: ctx.queueTraceBuffer.getSnapshot(),
              backlogStartedAt,
              backlogActionInvokedAt: ctx.actionTrace.backlogActionInvokedAt,
              urgentScheduledAt,
              urgentActionInvokedAt: ctx.actionTrace.urgentActionInvokedAt,
            })

            return {
              metrics: {
                'e2e.urgentToStableMs': urgentStableAt - urgentScheduledAt,
                'runtime.backlogCatchUpMs': caughtUpAt - backlogStartedAt,
              },
              evidence: {
                'txnLanes.mode': mode,
                'txnLanes.budgetMs': LANE_BUDGET_MS,
                'txnLanes.maxLagMs': LANE_MAX_LAG_MS,
                'txnLanes.yieldStrategy': mode === 'on' ? TXN_LANES_YIELD_STRATEGY : 'baseline',
                ...queueEvidence,
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
                'txnLanes.mode': mode,
                'txnLanes.budgetMs': LANE_BUDGET_MS,
                'txnLanes.maxLagMs': LANE_MAX_LAG_MS,
                'txnLanes.yieldStrategy': mode === 'on' ? TXN_LANES_YIELD_STRATEGY : 'baseline',
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
