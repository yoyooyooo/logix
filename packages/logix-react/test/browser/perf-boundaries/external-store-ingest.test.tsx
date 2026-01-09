import { expect, test } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import matrix from '@logixjs/perf-evidence/assets/matrix.json'
import { getRuntimeModuleExternalStore, getRuntimeReadQueryExternalStore } from '../../../src/internal/store/RuntimeExternalStore.js'
import { emitPerfReport, type PerfReport } from './protocol.js'
import { getProfileConfig, makePerfKernelLayer, runMatrixSuite, silentDebugLayer, summarizeMs, withNodeEnv } from './harness.js'

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    const raf = (globalThis as any).requestAnimationFrame as ((cb: () => void) => void) | undefined
    if (typeof raf === 'function') {
      raf(() => resolve())
    } else {
      setTimeout(() => resolve(), 0)
    }
  })

const requireGc = (): (() => void) => {
  const gc = (globalThis as any).gc as (() => void) | undefined
  if (typeof gc !== 'function') {
    throw new Error('Missing globalThis.gc (enable chromium: --js-flags=--expose-gc)')
  }
  return gc
}

const readUsedHeapBytes = (): number => {
  const memory = (globalThis as any).performance?.memory as { readonly usedJSHeapSize?: unknown } | undefined
  const used = memory?.usedJSHeapSize
  if (typeof used !== 'number' || !Number.isFinite(used)) {
    throw new Error('Missing performance.memory.usedJSHeapSize (enable chromium: --enable-precise-memory-info)')
  }
  return used
}

const forceGc = async (): Promise<void> => {
  const gc = requireGc()
  for (let i = 0; i < 3; i++) {
    gc()
    await nextFrame()
  }
}

const makeManualStore = <T,>(initial: T) => {
  let current = initial
  const listeners = new Set<() => void>()
  const store: Logix.ExternalStore.ExternalStore<T> = {
    getSnapshot: () => current,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
  const set = (next: T) => {
    current = next
    for (const listener of listeners) listener()
  }
  return { store, set }
}

const perfSuite = (matrix.suites as any[]).find((s) => s.id === 'externalStore.ingest.tickNotify') as any
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

test(
  'perf: externalStore ingest→notify baseline (externalStore.ingest.tickNotify)',
  { timeout: TEST_TIMEOUT_MS },
  async () => {
    await withNodeEnv('production', async () => {
      const perfKernelLayer = makePerfKernelLayer()

      const moduleCount = 10
      const ticksPerRun = 1

      const Root = Logix.Module.make('PerfExternalStoreIngest.Root', {
        state: Schema.Void,
        actions: {},
      })

      type IngestNotifyHarness = {
        readonly diagnosticsLevel: 'off' | 'full'
        readonly watcherCount: number
        readonly runtime: any
        readonly moduleRuntimes: ReadonlyArray<any>
        readonly dispose: () => Promise<void>
        runSeq: number
        readonly runOnce: () => Promise<number>
      }

      const harnessByKey = new Map<string, IngestNotifyHarness>()

      const getHarness = async (args: {
        readonly diagnosticsLevel: 'off' | 'full'
        readonly watcherCount: number
      }): Promise<IngestNotifyHarness> => {
        const key = `${args.diagnosticsLevel}:${args.watcherCount}`
        const cached = harnessByKey.get(key)
        if (cached) return cached

        const instrumentation = args.diagnosticsLevel === 'full' ? 'full' : 'light'
        const debugLayer = Logix.Debug.devtoolsHubLayer(silentDebugLayer as Layer.Layer<any, never, never>, {
          diagnosticsLevel: args.diagnosticsLevel,
        }) as Layer.Layer<any, never, never>

        const State = Schema.Struct({ value: Schema.Number })
        const manualStores = Array.from({ length: moduleCount }, (_, i) => makeManualStore(i))

        const moduleDefs = Array.from({ length: moduleCount }, (_, i) =>
          Logix.Module.make(`PerfExternalStoreIngest.M${i}`, {
            state: State,
            actions: {},
            traits: Logix.StateTrait.from(State)({
              value: Logix.StateTrait.externalStore({ store: manualStores[i]!.store }),
            }),
          }),
        )
        const moduleImpls = moduleDefs.map((m, i) =>
          m.implement({
            initial: { value: i },
            imports: [],
            logics: [],
          }).impl,
        )

        const runtime = Logix.Runtime.make(
          Root.implement({
            initial: undefined,
            imports: moduleImpls,
          }),
          {
            stateTransaction: { instrumentation },
            layer: Layer.mergeAll(debugLayer, perfKernelLayer) as Layer.Layer<any, never, never>,
            label: `perf:externalStore:ingest:${args.diagnosticsLevel}:${args.watcherCount}`,
          },
        )

        const moduleRuntimes = (await runtime.runPromise(
          Effect.all(moduleDefs.map((m) => m.tag), { concurrency: 'unbounded' }) as any,
        )) as ReadonlyArray<any>

        const storeOptions = { lowPriorityDelayMs: 16, lowPriorityMaxDelayMs: 50 }
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

        for (const store of stores) {
          try {
            store.getSnapshot()
          } catch {
            // best-effort
          }
        }

        const runIngest = async (logicalTick: number): Promise<number> => {
          waitState.token += 1
          waitState.remaining = stores.length
          const promise = new Promise<void>((resolve) => {
            waitState.resolve = resolve
          })

          for (let i = 0; i < manualStores.length; i++) {
            manualStores[i]!.set(logicalTick * 1000 + i + 1)
          }

          const start = performance.now()
          await promise
          const end = performance.now()
          return end - start
        }

        const harness: IngestNotifyHarness = {
          diagnosticsLevel: args.diagnosticsLevel,
          watcherCount: args.watcherCount,
          runtime,
          moduleRuntimes,
          runSeq: 0,
          runOnce: async () => {
            const base = harness.runSeq * ticksPerRun
            const samples: number[] = []
            for (let i = 0; i < ticksPerRun; i++) {
              samples.push(await runIngest(base + i))
            }
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

            const p95IngestMs = await harness.runOnce()

            return {
              metrics: {
                timePerIngestMs: p95IngestMs,
              },
              evidence: {
                'diagnostics.level': diagnosticsLevel,
                'workload.modules': moduleCount,
                'workload.ticksPerRun': ticksPerRun,
                'workload.externalStores': moduleCount,
              },
            }
          },
        )

        const report: PerfReport = {
          schemaVersion: 1,
          meta: {
            createdAt: new Date().toISOString(),
            generator: 'packages/logix-react/test/browser/perf-boundaries/external-store-ingest.test.tsx',
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
                timePerIngestMs: 'runtimeStore',
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
  'gate: retainedHeapDeltaBytesAfterGc stays bounded after selector-topic churn',
  { timeout: 60_000 },
  async () => {
    await withNodeEnv('production', async () => {
      await forceGc()
      const baseline = readUsedHeapBytes()

      await (async () => {
        const M = Logix.Module.make('PerfExternalStoreIngest.HeapGate', {
          state: Schema.Struct({ value: Schema.Number }),
          actions: { set: Schema.Number },
          reducers: {
            set: Logix.Module.Reducer.mutate((draft, payload: number) => {
              ;(draft as any).value = payload
            }),
          },
        })

        const impl = M.implement({ initial: { value: 0 } })
        const Root = Logix.Module.make('PerfExternalStoreIngest.HeapGate.Root', { state: Schema.Void, actions: {} })
        const perfKernelLayer = makePerfKernelLayer()
        const runtime = Logix.Runtime.make(Root.implement({ initial: undefined, imports: [impl.impl] }), {
          layer: Layer.mergeAll(silentDebugLayer as Layer.Layer<any, never, never>, perfKernelLayer) as Layer.Layer<
            any,
            never,
            never
          >,
          label: 'perf:heapGate:externalStore',
        })

        try {
          const moduleRuntime = (await runtime.runPromise(M.tag as any)) as any

          const selectorCount = 200
          const readQueries = Array.from({ length: selectorCount }, (_, i) =>
            Logix.ReadQuery.make({
              selectorId: `rq_perf_retained_${i}`,
              debugKey: `PerfExternalStoreIngest.HeapGate.value#${i}`,
              reads: ['value'],
              select: (s: { readonly value: number }) => s.value,
              equalsKind: 'objectIs',
            }),
          )

          const stores = readQueries.map((rq) =>
            getRuntimeReadQueryExternalStore(runtime as any, moduleRuntime, rq as any),
          )
          const unsubs = stores.map((s) => s.subscribe(() => {}))
          for (const s of stores) s.getSnapshot()

          for (const u of unsubs) u()

          const s0 = stores[0]
          const rq0 = readQueries[0]
          expect(s0).toBeDefined()
          expect(rq0).toBeDefined()
          if (s0 && rq0) {
            const s1 = getRuntimeReadQueryExternalStore(runtime as any, moduleRuntime, rq0 as any)
            expect(s1).not.toBe(s0)
          }

          await nextFrame()
        } finally {
          await runtime.dispose()
        }
      })()

      await forceGc()
      const after = readUsedHeapBytes()
      const delta = Math.max(0, after - baseline)

      const MAX_DELTA_BYTES = 10 * 1024 * 1024
      expect(delta).toBeLessThanOrEqual(MAX_DELTA_BYTES)
    })
  },
)
