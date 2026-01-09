import { test } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import matrix from '@logix/perf-evidence/assets/matrix.json'
import { getRuntimeModuleExternalStore } from '../../../src/internal/store/RuntimeExternalStore.js'
import { emitPerfReport, type PerfReport } from './protocol.js'
import { getProfileConfig, makePerfKernelLayer, runMatrixSuite, silentDebugLayer, summarizeMs, withNodeEnv } from './harness.js'

const perfSuite = (matrix.suites as any[]).find((s) => s.id === 'tickScheduler.yieldToHost.backlog') as any
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

const TEST_TIMEOUT_MS = Math.max(90_000, perfTimeoutMs * 2)

test(
  'perf: tickScheduler yield-to-host backlog catch-up (tickScheduler.yieldToHost.backlog)',
  { timeout: TEST_TIMEOUT_MS },
  async () => {
    await withNodeEnv('production', async () => {
      const perfKernelLayer = makePerfKernelLayer()

      const moduleCount = 10
      const ticksPerRun = 1

      const moduleDefs = Array.from({ length: moduleCount }, (_, i) =>
        Logix.Module.make(`PerfTickYieldToHost.M${i}`, {
          state: Schema.Struct({ value: Schema.Number }),
          actions: { set: Schema.Number },
          reducers: {
            set: Logix.Module.Reducer.mutate((draft, payload: number) => {
              ;(draft as any).value = payload
            }),
          },
        }),
      )
      const moduleImpls = moduleDefs.map((m) => m.implement({ initial: { value: 0 } }).impl)

      const Root = Logix.Module.make('PerfTickYieldToHost.Root', {
        state: Schema.Void,
        actions: {},
      })

      type TelemetryCounters = {
        capture: boolean
        degradedTicks: number
        forcedMacrotaskTicks: number
      }

      type TickNotifyHarness = {
        readonly diagnosticsLevel: 'off' | 'full'
        readonly watcherCount: number
        readonly budgetMaxSteps: number
        readonly runtime: any
        readonly moduleRuntimes: ReadonlyArray<any>
        readonly dispose: () => Promise<void>
        runSeq: number
        readonly runOnce: () => Promise<{ readonly p95CatchUpMs: number; readonly degradedTicks: number; readonly forcedMacrotaskTicks: number }>
      }

      const harnessByKey = new Map<string, TickNotifyHarness>()

      const getHarness = async (args: {
        readonly diagnosticsLevel: 'off' | 'full'
        readonly watcherCount: number
        readonly budgetMaxSteps: number
      }): Promise<TickNotifyHarness> => {
        const key = `${args.diagnosticsLevel}:${args.watcherCount}:${args.budgetMaxSteps}`
        const cached = harnessByKey.get(key)
        if (cached) return cached

        const instrumentation = args.diagnosticsLevel === 'full' ? 'full' : 'light'
        const debugLayer = Logix.Debug.devtoolsHubLayer(silentDebugLayer as Layer.Layer<any, never, never>, {
          diagnosticsLevel: args.diagnosticsLevel,
        }) as Layer.Layer<any, never, never>

        const telemetry: TelemetryCounters = {
          capture: false,
          degradedTicks: 0,
          forcedMacrotaskTicks: 0,
        }

        const tickSchedulerLayer = Logix.InternalContracts.tickSchedulerTestLayer({
          maxSteps: args.budgetMaxSteps,
          telemetry: {
            sampleRate: 1,
            onTickDegraded: (event) => {
              if (!telemetry.capture) return
              if (!event.stable) telemetry.degradedTicks += 1
              if (event.forcedMacrotask) telemetry.forcedMacrotaskTicks += 1
            },
          },
        }) as Layer.Layer<any, never, never>

        const runtime = Logix.Runtime.make(
          Root.implement({
            initial: undefined,
            imports: moduleImpls,
          }),
          {
            stateTransaction: { instrumentation },
            layer: Layer.mergeAll(debugLayer, perfKernelLayer, tickSchedulerLayer) as Layer.Layer<any, never, never>,
            label: `perf:tickYield:${args.diagnosticsLevel}:${args.watcherCount}:maxSteps=${args.budgetMaxSteps}`,
          },
        )

        const moduleRuntimes = (await runtime.runPromise(
          Effect.all(moduleDefs.map((m) => m.tag), { concurrency: 'unbounded' }) as any,
        )) as ReadonlyArray<any>

        const storeOptions = { lowPriorityDelayMs: 0, lowPriorityMaxDelayMs: 0 }
        const stores = moduleRuntimes.map((mr) => getRuntimeModuleExternalStore(runtime as any, mr, storeOptions))

        const waitState = { token: 0, remaining: 0, resolve: undefined as undefined | (() => void) }
        const markerSeenToken = new Int32Array(moduleCount)
        const onNoop = () => {}

        const unsubs: Array<() => void> = []
        const perModule = Math.floor(args.watcherCount / moduleCount)
        const remainder = args.watcherCount - perModule * moduleCount

        for (let i = 0; i < stores.length; i++) {
          const store = stores[i]!
          const onMarker = () => {
            const resolve = waitState.resolve
            if (!resolve) return

            if (markerSeenToken[i] === waitState.token) return
            markerSeenToken[i] = waitState.token

            waitState.remaining -= 1
            if (waitState.remaining <= 0) {
              waitState.resolve = undefined
              resolve()
            }
          }

          const count = perModule + (i < remainder ? 1 : 0)
          for (let j = 0; j < Math.max(0, count - 1); j++) {
            unsubs.push(store.subscribe(onNoop))
          }
          unsubs.push(store.subscribe(onMarker))
        }

        // Prime snapshot cache before the first measured tick.
        for (const store of stores) {
          try {
            store.getSnapshot()
          } catch {
            // best-effort
          }
        }

        const runTick = async (logicalTick: number): Promise<{ readonly ms: number; readonly degradedTicks: number; readonly forcedMacrotaskTicks: number }> => {
          waitState.token += 1
          waitState.remaining = stores.length
          const promise = new Promise<void>((resolve) => {
            waitState.resolve = resolve
          })

          telemetry.capture = true
          telemetry.degradedTicks = 0
          telemetry.forcedMacrotaskTicks = 0

          try {
            for (let i = 0; i < moduleRuntimes.length; i++) {
              const mr = moduleRuntimes[i] as any
              const payload = logicalTick * 1000 + i + 1
              runtime.runFork(mr.dispatchLowPriority({ _tag: 'set', payload } as any))
            }

            const start = performance.now()
            await promise
            const end = performance.now()

            return {
              ms: end - start,
              degradedTicks: telemetry.degradedTicks,
              forcedMacrotaskTicks: telemetry.forcedMacrotaskTicks,
            }
          } finally {
            telemetry.capture = false
          }
        }

        const harness: TickNotifyHarness = {
          diagnosticsLevel: args.diagnosticsLevel,
          watcherCount: args.watcherCount,
          budgetMaxSteps: args.budgetMaxSteps,
          runtime,
          moduleRuntimes,
          runSeq: 0,
          runOnce: async () => {
            const base = harness.runSeq * ticksPerRun
            const samples: Array<{ readonly ms: number; readonly degradedTicks: number; readonly forcedMacrotaskTicks: number }> = []
            for (let i = 0; i < ticksPerRun; i++) {
              samples.push(await runTick(base + i))
            }
            harness.runSeq += 1

            return {
              p95CatchUpMs: summarizeMs(samples.map((s) => s.ms)).p95Ms,
              degradedTicks: summarizeMs(samples.map((s) => s.degradedTicks)).p95Ms,
              forcedMacrotaskTicks: summarizeMs(samples.map((s) => s.forcedMacrotaskTicks)).p95Ms,
            }
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
            const budgetMaxSteps = params.budgetMaxSteps as number

            const harness = await getHarness({ diagnosticsLevel, watcherCount, budgetMaxSteps })
            const { p95CatchUpMs, degradedTicks, forcedMacrotaskTicks } = await harness.runOnce()

            return {
              metrics: {
                'runtime.backlogCatchUpMs': p95CatchUpMs,
              },
              evidence: {
                'diagnostics.level': diagnosticsLevel,
                'runtimeStore.adapter': 'runtimeStore',
                'tickScheduler.maxSteps': budgetMaxSteps,
                'tickScheduler.degradedTicks': degradedTicks,
                'tickScheduler.forcedMacrotaskTicks': forcedMacrotaskTicks,
                'workload.modules': moduleCount,
                'workload.ticksPerRun': ticksPerRun,
              },
            }
          },
          { cutOffOn: ['timeout'] },
        )

        const report: PerfReport = {
          schemaVersion: 1,
          meta: {
            createdAt: new Date().toISOString(),
            generator: 'packages/logix-react/test/browser/perf-boundaries/tick-yield-to-host.test.tsx',
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
              requiredEvidence: perfSuite.requiredEvidence,
              metricCategories: {
                'runtime.backlogCatchUpMs': 'runtimeStore',
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
