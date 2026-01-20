import { expect, test } from 'vitest'
import { Context, Effect, Exit, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import matrix from '@logixjs/perf-evidence/assets/matrix.json'
import { getRuntimeModuleExternalStore } from '../../../src/internal/store/RuntimeExternalStore.js'
import { emitPerfReport, type PerfReport } from './protocol.js'
import { getProfileConfig, makePerfKernelLayer, runMatrixSuite, silentDebugLayer, summarizeMs, withNodeEnv } from './harness.js'

const profileConfig = getProfileConfig(matrix)
const perfRuns = Math.min(10, profileConfig.runs)
const perfWarmupDiscard = Math.min(2, profileConfig.warmupDiscard, Math.max(0, perfRuns - 1))
const perfTimeoutMs = Math.max(30_000, profileConfig.timeoutMs)

const resolveProfileId = (): string => {
  const profile = import.meta.env.VITE_LOGIX_PERF_PROFILE
  const profiles = (matrix as any).defaults?.profiles ?? {}
  if (profile && profiles[profile]) {
    return profile
  }
  return 'matrix.defaults'
}

const TEST_TIMEOUT_MS = Math.max(90_000, perfTimeoutMs * 4)

const onNoop = () => {}

const resolveWorkflowMode = (): 'manualWatcher' | 'workflow' => {
  const raw = import.meta.env.VITE_LOGIX_PERF_WORKFLOW_MODE
  if (raw === 'manualWatcher' || raw === 'manual') return 'manualWatcher'
  if (raw === 'workflow' || raw === 'program') return 'workflow'
  return 'workflow'
}

test(
  'perf: workflow submit→notify baseline (workflow.submit.tickNotify)',
  { timeout: TEST_TIMEOUT_MS },
  async () => {
    await withNodeEnv('production', async () => {
      const perfSuite = (matrix.suites as any[]).find((s) => s.id === 'workflow.submit.tickNotify') as any
      expect(perfSuite).toBeDefined()

      class SubmitPort extends Context.Tag('PerfWorkflow.075.SubmitPort')<
        SubmitPort,
        (shouldFail: boolean) => Effect.Effect<void, Error, never>
      >() {}

      const M = Logix.Module.make('PerfWorkflow075.Submit', {
        state: Schema.Struct({ ok: Schema.Number, bad: Schema.Number }),
        actions: { submit: Schema.Struct({ shouldFail: Schema.Boolean }), ok: Schema.Void, bad: Schema.Void },
        reducers: {
          ok: Logix.Module.Reducer.mutate((draft) => {
            ;(draft as any).ok += 1
          }),
          bad: Logix.Module.Reducer.mutate((draft) => {
            ;(draft as any).bad += 1
          }),
        },
      })

      const manualLogic = M.logic<SubmitPort>(($) =>
        Effect.gen(function* () {
          yield* $.onAction('submit').runLatest((action) =>
            Effect.gen(function* () {
              const port = yield* $.use(SubmitPort)
              const shouldFail = Boolean((action as any)?.payload?.shouldFail)
              const exit = yield* Effect.exit(port(shouldFail))
              yield* $.dispatch(Exit.isSuccess(exit) ? 'ok' : 'bad')
            }),
          )
        }),
      )

      const workflow = Logix.Workflow.make({
        localId: 'submit',
        trigger: Logix.Workflow.onAction('submit'),
        policy: { concurrency: 'latest' },
        steps: [
          Logix.Workflow.call({
            key: 'call.submit',
            service: SubmitPort,
            input: Logix.Workflow.payloadPath('/shouldFail'),
            onSuccess: [Logix.Workflow.dispatch({ key: 'dispatch.ok', actionTag: 'ok' })],
            onFailure: [Logix.Workflow.dispatch({ key: 'dispatch.bad', actionTag: 'bad' })],
          }),
        ],
      })

      const manualImpl = M.implement({ initial: { ok: 0, bad: 0 }, logics: [manualLogic] }).impl
      const workflowImpl = M.withWorkflow(workflow).implement({ initial: { ok: 0, bad: 0 } }).impl
      const mode = resolveWorkflowMode()

      const Root = Logix.Module.make('PerfWorkflow075.Root', { state: Schema.Void, actions: {} })
      const perfKernelLayer = makePerfKernelLayer()

      type Harness = {
        readonly diagnosticsLevel: 'off' | 'full'
        readonly watcherCount: number
        readonly runtime: any
        readonly moduleRuntime: any
        readonly dispose: () => Promise<void>
        runSeq: number
        readonly runOnce: () => Promise<number>
      }

      const harnessByKey = new Map<string, Harness>()

      const getHarness = async (args: {
        readonly diagnosticsLevel: 'off' | 'full'
        readonly watcherCount: number
      }): Promise<Harness> => {
        const key = `${args.diagnosticsLevel}:${args.watcherCount}`
        const cached = harnessByKey.get(key)
        if (cached) return cached

        const instrumentation = 'light'
        const debugLayer = Logix.Debug.devtoolsHubLayer(silentDebugLayer as Layer.Layer<any, never, never>, {
          diagnosticsLevel: args.diagnosticsLevel,
        }) as Layer.Layer<any, never, never>

        const impl = mode === 'workflow' ? workflowImpl : manualImpl

        const runtime = Logix.Runtime.make(
          Root.implement({
            initial: undefined,
            imports: [impl],
          }),
          {
            stateTransaction: { instrumentation },
            layer: Layer.mergeAll(
              debugLayer,
              perfKernelLayer,
              Layer.succeed(SubmitPort, (shouldFail) => (shouldFail ? Effect.fail(new Error('boom')) : Effect.void)),
            ) as Layer.Layer<any, never, never>,
            label: `perf:workflow:submit:${mode}:${args.diagnosticsLevel}:${args.watcherCount}`,
          },
        )

        const moduleRuntime = (await runtime.runPromise(M.tag as any)) as any

        const storeOptions = { lowPriorityDelayMs: 16, lowPriorityMaxDelayMs: 50 }
        const store = getRuntimeModuleExternalStore(runtime as any, moduleRuntime, storeOptions)

        const waitState = { token: 0, resolve: undefined as undefined | (() => void) }
        const markerSeenToken = new Int32Array(1)

        const onMarker = () => {
          const resolve = waitState.resolve
          if (!resolve) return

          if (markerSeenToken[0] === waitState.token) return
          markerSeenToken[0] = waitState.token
          waitState.resolve = undefined
          resolve()
        }

        const unsubs: Array<() => void> = []
        for (let i = 0; i < Math.max(0, args.watcherCount - 1); i++) {
          unsubs.push(store.subscribe(onNoop))
        }
        unsubs.push(store.subscribe(onMarker))

        try {
          store.getSnapshot()
        } catch {
          // best-effort: perf harness should still run even if snapshot throws
        }

        const runSubmit = async (): Promise<number> => {
          waitState.token += 1
          const promise = new Promise<void>((resolve) => {
            waitState.resolve = resolve
          })

          const start = performance.now()
          runtime.runFork(moduleRuntime.dispatch({ _tag: 'submit', payload: { shouldFail: false } } as any) as any)
          await promise
          return performance.now() - start
        }

        const harness: Harness = {
          diagnosticsLevel: args.diagnosticsLevel,
          watcherCount: args.watcherCount,
          runtime,
          moduleRuntime,
          runSeq: 0,
          runOnce: async () => {
            const samples: number[] = [await runSubmit()]
            harness.runSeq += 1
            return summarizeMs(samples).p95Ms
          },
          dispose: async () => {
            for (const u of unsubs) {
              try {
                u()
              } catch {
                // ignore best-effort unsubscribe failures
              }
            }
            await runtime.dispose()
          },
        }

        harnessByKey.set(key, harness)
        return harness
      }

      try {
        const { points, thresholds } = await runMatrixSuite(
          perfSuite,
          { runs: perfRuns, warmupDiscard: perfWarmupDiscard, timeoutMs: perfTimeoutMs },
          async (params) => {
            const diagnosticsLevel = params.diagnosticsLevel as 'off' | 'full'
            const watcherCount = params.watchers as number
            const harness = await getHarness({ diagnosticsLevel, watcherCount })

            const p95SubmitMs = await harness.runOnce()

            return {
              metrics: {
                timePerSubmitMs: p95SubmitMs,
              },
              evidence: {
                'diagnostics.level': diagnosticsLevel,
                'workflow.mode': mode,
                'workload.watchers': watcherCount,
              },
            }
          },
        )

        const report: PerfReport = {
          schemaVersion: 1,
          meta: {
            createdAt: new Date().toISOString(),
            generator: `packages/logix-react/test/browser/perf-boundaries/workflow-075.test.tsx#submit(mode=${mode})`,
            matrixId: matrix.id,
            config: {
              runs: perfRuns,
              warmupDiscard: perfWarmupDiscard,
              timeoutMs: perfTimeoutMs,
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
              id: perfSuite.id,
              title: perfSuite.title,
              priority: perfSuite.priority,
              primaryAxis: perfSuite.primaryAxis,
              budgets: perfSuite.budgets,
              metricCategories: {
                timePerSubmitMs: 'workflow',
              },
              points,
              thresholds,
            },
          ],
        }

        emitPerfReport(report)
      } finally {
        for (const h of harnessByKey.values()) {
          await h.dispose()
        }
      }
    })
  },
)

test(
  'perf: workflow delay(timer)→notify baseline (workflow.delay.timer)',
  { timeout: TEST_TIMEOUT_MS },
  async () => {
    await withNodeEnv('production', async () => {
      const perfSuite = (matrix.suites as any[]).find((s) => s.id === 'workflow.delay.timer') as any
      expect(perfSuite).toBeDefined()

      const M = Logix.Module.make('PerfWorkflow075.Delay', {
        state: Schema.Struct({ done: Schema.Number }),
        actions: { start: Schema.Void, done: Schema.Void },
        reducers: {
          done: Logix.Module.Reducer.mutate((draft) => {
            ;(draft as any).done += 1
          }),
        },
      })

      const manualLogic = M.logic(($) =>
        Effect.gen(function* () {
          yield* $.onAction('start').runLatest(() =>
            Effect.gen(function* () {
              // manual baseline: use Effect.sleep (timer-based) + dispatch
              yield* Effect.sleep('0 millis')
              yield* $.dispatch('done')
            }),
          )
        }),
      )

      const workflow = Logix.Workflow.make({
        localId: 'delay',
        trigger: Logix.Workflow.onAction('start'),
        policy: { concurrency: 'latest' },
        steps: [Logix.Workflow.delay({ key: 'delay.0', ms: 0 }), Logix.Workflow.dispatch({ key: 'dispatch.done', actionTag: 'done' })],
      })

      const manualImpl = M.implement({ initial: { done: 0 }, logics: [manualLogic] }).impl
      const workflowImpl = M.withWorkflow(workflow).implement({ initial: { done: 0 } }).impl
      const mode = resolveWorkflowMode()

      const Root = Logix.Module.make('PerfWorkflow075.Delay.Root', { state: Schema.Void, actions: {} })
      const perfKernelLayer = makePerfKernelLayer()

      type Harness = {
        readonly diagnosticsLevel: 'off' | 'full'
        readonly watcherCount: number
        readonly runtime: any
        readonly moduleRuntime: any
        readonly dispose: () => Promise<void>
        runSeq: number
        readonly runOnce: () => Promise<number>
      }

      const harnessByKey = new Map<string, Harness>()

      const getHarness = async (args: {
        readonly diagnosticsLevel: 'off' | 'full'
        readonly watcherCount: number
      }): Promise<Harness> => {
        const key = `${args.diagnosticsLevel}:${args.watcherCount}`
        const cached = harnessByKey.get(key)
        if (cached) return cached

        const instrumentation = 'light'
        const debugLayer = Logix.Debug.devtoolsHubLayer(silentDebugLayer as Layer.Layer<any, never, never>, {
          diagnosticsLevel: args.diagnosticsLevel,
        }) as Layer.Layer<any, never, never>

        const impl = mode === 'workflow' ? workflowImpl : manualImpl

        const runtime = Logix.Runtime.make(
          Root.implement({
            initial: undefined,
            imports: [impl],
          }),
          {
            stateTransaction: { instrumentation },
            layer: Layer.mergeAll(debugLayer, perfKernelLayer) as Layer.Layer<any, never, never>,
            label: `perf:workflow:delay:${mode}:${args.diagnosticsLevel}:${args.watcherCount}`,
          },
        )

        const moduleRuntime = (await runtime.runPromise(M.tag as any)) as any

        const storeOptions = { lowPriorityDelayMs: 16, lowPriorityMaxDelayMs: 50 }
        const store = getRuntimeModuleExternalStore(runtime as any, moduleRuntime, storeOptions)

        const waitState = { token: 0, resolve: undefined as undefined | (() => void) }
        const markerSeenToken = new Int32Array(1)

        const onMarker = () => {
          const resolve = waitState.resolve
          if (!resolve) return

          if (markerSeenToken[0] === waitState.token) return
          markerSeenToken[0] = waitState.token
          waitState.resolve = undefined
          resolve()
        }

        const unsubs: Array<() => void> = []
        for (let i = 0; i < Math.max(0, args.watcherCount - 1); i++) {
          unsubs.push(store.subscribe(onNoop))
        }
        unsubs.push(store.subscribe(onMarker))

        try {
          store.getSnapshot()
        } catch {
          // best-effort
        }

        const runDelay = async (): Promise<number> => {
          waitState.token += 1
          const promise = new Promise<void>((resolve) => {
            waitState.resolve = resolve
          })

          const start = performance.now()
          runtime.runFork(moduleRuntime.dispatch({ _tag: 'start', payload: undefined } as any) as any)
          await promise
          return performance.now() - start
        }

        const harness: Harness = {
          diagnosticsLevel: args.diagnosticsLevel,
          watcherCount: args.watcherCount,
          runtime,
          moduleRuntime,
          runSeq: 0,
          runOnce: async () => {
            const samples: number[] = [await runDelay()]
            harness.runSeq += 1
            return summarizeMs(samples).p95Ms
          },
          dispose: async () => {
            for (const u of unsubs) {
              try {
                u()
              } catch {
                // ignore best-effort unsubscribe failures
              }
            }
            await runtime.dispose()
          },
        }

        harnessByKey.set(key, harness)
        return harness
      }

      try {
        const { points, thresholds } = await runMatrixSuite(
          perfSuite,
          { runs: perfRuns, warmupDiscard: perfWarmupDiscard, timeoutMs: perfTimeoutMs },
          async (params) => {
            const diagnosticsLevel = params.diagnosticsLevel as 'off' | 'full'
            const watcherCount = params.watchers as number
            const harness = await getHarness({ diagnosticsLevel, watcherCount })

            const p95DelayMs = await harness.runOnce()

            return {
              metrics: {
                timePerDelayMs: p95DelayMs,
              },
              evidence: {
                'diagnostics.level': diagnosticsLevel,
                'workflow.mode': mode,
                'workload.watchers': watcherCount,
              },
            }
          },
        )

        const report: PerfReport = {
          schemaVersion: 1,
          meta: {
            createdAt: new Date().toISOString(),
            generator: `packages/logix-react/test/browser/perf-boundaries/workflow-075.test.tsx#delay(mode=${mode})`,
            matrixId: matrix.id,
            config: {
              runs: perfRuns,
              warmupDiscard: perfWarmupDiscard,
              timeoutMs: perfTimeoutMs,
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
              id: perfSuite.id,
              title: perfSuite.title,
              priority: perfSuite.priority,
              primaryAxis: perfSuite.primaryAxis,
              budgets: perfSuite.budgets,
              metricCategories: {
                timePerDelayMs: 'workflow',
              },
              points,
              thresholds,
            },
          ],
        }

        emitPerfReport(report)
      } finally {
        for (const h of harnessByKey.values()) {
          await h.dispose()
        }
      }
    })
  },
)
