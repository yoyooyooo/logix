import { expect, test } from 'vitest'
import React from 'react'
import { render } from 'vitest-browser-react'
import { Effect, Fiber, Layer, Schema, Stream } from 'effect'
import * as Logix from '@logixjs/core'
import matrix from '@logix/perf-evidence/assets/matrix.json'
import { RuntimeProvider } from '../../../src/RuntimeProvider.js'
import { useModule } from '../../../src/Hooks.js'
import { getRuntimeModuleExternalStore } from '../../../src/internal/store/RuntimeExternalStore.js'
import { emitPerfReport, type PerfReport } from './protocol.js'
import { getProfileConfig, makePerfKernelLayer, runMatrixSuite, silentDebugLayer, summarizeMs, withNodeEnv } from './harness.js'

const hasRuntimeStore = (): boolean => typeof (Logix as any).InternalContracts?.getRuntimeStore === 'function'
const semanticTest = hasRuntimeStore() ? test : test.skip

const nextFrame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()))

const waitForBodyText = async (text: string, timeoutMs: number): Promise<void> => {
  const deadline = performance.now() + timeoutMs
  while (performance.now() < deadline) {
    if (document.body.textContent?.includes(text)) return
    await nextFrame()
  }
  throw new Error(`waitForBodyText timeout: ${text}`)
}

const waitForTickAdvance = async (
  runtimeStore: { readonly getTickSeq: () => number },
  prevTickSeq: number,
  timeoutMs: number,
): Promise<number> => {
  const deadline = performance.now() + timeoutMs
  while (performance.now() < deadline) {
    const next = runtimeStore.getTickSeq()
    if (next > prevTickSeq) return next
    await nextFrame()
  }
  throw new Error(`waitForTickAdvance timeout: prev=${prevTickSeq}`)
}

semanticTest('runtime store: no tearing across modules + sharded selector notify', async () => {
  const A = Logix.Module.make('T033.RuntimeStoreNoTearing.A', {
    state: Schema.Struct({ a: Schema.Number, b: Schema.Number }),
    actions: { setA: Schema.Number, setB: Schema.Number },
    reducers: {
      setA: Logix.Module.Reducer.mutate((draft, payload: number) => {
        ;(draft as any).a = payload
      }),
      setB: Logix.Module.Reducer.mutate((draft, payload: number) => {
        ;(draft as any).b = payload
      }),
    },
  })

  const B = Logix.Module.make('T033.RuntimeStoreNoTearing.B', {
    state: Schema.Struct({ x: Schema.Number }),
    actions: { setX: Schema.Number },
    reducers: {
      setX: Logix.Module.Reducer.mutate((draft, payload: number) => {
        ;(draft as any).x = payload
      }),
    },
  })

  const AImpl = A.implement({ initial: { a: 0, b: 0 } })
  const BImpl = B.implement({ initial: { x: 0 } })

  const Root = Logix.Module.make('T033.RuntimeStoreNoTearing.Root', {
    state: Schema.Void,
    actions: {},
  })

  const runtime = Logix.Runtime.make(
    Root.implement({
      initial: undefined,
      imports: [AImpl.impl, BImpl.impl],
    }),
    { layer: Layer.empty as Layer.Layer<any, never, never> },
  )

  const runtimeStore = Logix.InternalContracts.getRuntimeStore(runtime) as unknown as {
    readonly getTickSeq: () => number
    readonly getModuleState: (moduleInstanceKey: string) => unknown
  }

  const metrics = {
    aSelectorRuns: 0,
    history: [] as Array<{ readonly a: number; readonly b: number; readonly tickSeq: number }>,
    aRuntime: undefined as Logix.ModuleRuntime<any, any> | undefined,
    bRuntime: undefined as Logix.ModuleRuntime<any, any> | undefined,
  }

  const selectA = (state: unknown): number => {
    metrics.aSelectorRuns += 1
    return (state as any).a as number
  }
  ;(selectA as any).fieldPaths = ['a']

  const App: React.FC = () => {
    const a = useModule(A.tag) as any
    const b = useModule(B.tag) as any

    React.useEffect(() => {
      metrics.aRuntime = a.runtime
      metrics.bRuntime = b.runtime
    }, [a, b])

    const aValue = useModule(a, selectA)
    const bValue = useModule(b, (s) => (s as any).x as number)

    React.useEffect(() => {
      metrics.history.push({ a: aValue, b: bValue, tickSeq: runtimeStore.getTickSeq() })
    }, [aValue, bValue])

    return (
      <div>
        <p>A: {aValue}</p>
        <p>B: {bValue}</p>
        <button
          type="button"
          onClick={() => {
            Logix.Runtime.batch(() => {
              a.actions.setA(1)
              b.actions.setX(1)
            })
          }}
        >
          BatchBothTo1
        </button>
        <button
          type="button"
          onClick={() => {
            b.actions.setX(2)
          }}
        >
          UpdateBTo2
        </button>
        <button
          type="button"
          onClick={() => {
            a.actions.setB(1)
          }}
        >
          UpdateAFieldBTo1
        </button>
      </div>
    )
  }

  document.body.innerHTML = ''
  const screen = await render(
    <RuntimeProvider runtime={runtime}>
      <App />
    </RuntimeProvider>,
  )

  try {
    const timeoutMs = 5_000
    await waitForBodyText('A: 0', timeoutMs)
    await waitForBodyText('B: 0', timeoutMs)

    const batch = screen.getByRole('button', { name: 'BatchBothTo1' })
    const updateB = screen.getByRole('button', { name: 'UpdateBTo2' })
    const updateAFieldB = screen.getByRole('button', { name: 'UpdateAFieldBTo1' })

    const beforeBatchHistoryLen = metrics.history.length
    const beforeBatchTick = runtimeStore.getTickSeq()

    await batch.click()

    const tickAfterBatch = await waitForTickAdvance(runtimeStore, beforeBatchTick, timeoutMs)
    await waitForBodyText('A: 1', timeoutMs)
    await waitForBodyText('B: 1', timeoutMs)

    const batchEntries = metrics.history.slice(beforeBatchHistoryLen)
    expect(batchEntries.length).toBeGreaterThanOrEqual(1)
    expect(batchEntries.some((e) => e.a === 1 && e.b === 0)).toBe(false)
    expect(batchEntries.some((e) => e.a === 0 && e.b === 1)).toBe(false)
    expect(batchEntries[batchEntries.length - 1]?.tickSeq).toBe(tickAfterBatch)

    const selectorRunsAfterBatch = metrics.aSelectorRuns

    // Cross-module sharding: updating B should not re-evaluate A's selector.
    const beforeBUpdateTick = runtimeStore.getTickSeq()
    await updateB.click()
    await waitForTickAdvance(runtimeStore, beforeBUpdateTick, timeoutMs)
    await waitForBodyText('B: 2', timeoutMs)
    expect(metrics.aSelectorRuns).toBe(selectorRunsAfterBatch)

    // Intra-module sharding: updating unrelated field B should not re-evaluate selector (selects A only).
    const beforeAFieldUpdateTick = runtimeStore.getTickSeq()
    await updateAFieldB.click()
    await waitForTickAdvance(runtimeStore, beforeAFieldUpdateTick, timeoutMs)
    expect(metrics.aSelectorRuns).toBe(selectorRunsAfterBatch)

    // Sanity: ensure the state did change in RuntimeStore (even though selector does not observe it).
    const aRuntime = metrics.aRuntime
    expect(aRuntime).toBeDefined()
    if (aRuntime) {
      const moduleInstanceKey = `${aRuntime.moduleId}::${aRuntime.instanceId}`
      expect(runtimeStore.getModuleState(moduleInstanceKey)).toEqual({ a: 1, b: 1 })
    }
  } finally {
    screen.unmount()
    document.body.innerHTML = ''
    await runtime.dispose()
  }
})

test('runtime store: multi-instance isolation (same moduleId, different instanceId)', async () => {
  const M = Logix.Module.make('T036.RuntimeStoreNoTearing.Multi', {
    state: Schema.Struct({ a: Schema.Number, b: Schema.Number }),
    actions: { setA: Schema.Number },
    reducers: {
      setA: Logix.Module.Reducer.mutate((draft, payload: number) => {
        ;(draft as any).a = payload
      }),
    },
  })

  const MImpl = M.implement({ initial: { a: 0, b: 0 } }).impl

  const Root = Logix.Module.make('T036.RuntimeStoreNoTearing.Root', {
    state: Schema.Void,
    actions: {},
  })

  const runtime = Logix.Runtime.make(Root.implement({ initial: undefined }), { layer: Layer.empty as Layer.Layer<any, never, never> })

  const metrics = {
    s1Runs: 0,
    s2Runs: 0,
  }

  const selectA1 = (state: unknown): number => {
    metrics.s1Runs += 1
    return (state as any).a as number
  }
  ;(selectA1 as any).fieldPaths = ['a']

  const selectA2 = (state: unknown): number => {
    metrics.s2Runs += 1
    return (state as any).a as number
  }
  ;(selectA2 as any).fieldPaths = ['a']

  const App: React.FC = () => {
    const m1 = useModule(MImpl, { key: 'i-1' }) as any
    const m2 = useModule(MImpl, { key: 'i-2' }) as any

    const a1 = useModule(m1, selectA1)
    const a2 = useModule(m2, selectA2)

    return (
      <div>
        <p>A1: {a1}</p>
        <p>A2: {a2}</p>
        <button
          type="button"
          onClick={() => {
            m1.actions.setA(1)
          }}
        >
          SetA1
        </button>
      </div>
    )
  }

  document.body.innerHTML = ''
  const screen = await render(
    <RuntimeProvider runtime={runtime}>
      <App />
    </RuntimeProvider>,
  )

  try {
    const timeoutMs = 5_000
    await waitForBodyText('A1: 0', timeoutMs)
    await waitForBodyText('A2: 0', timeoutMs)

    const selectorRuns2Before = metrics.s2Runs
    await screen.getByRole('button', { name: 'SetA1' }).click()

    await waitForBodyText('A1: 1', timeoutMs)
    await waitForBodyText('A2: 0', timeoutMs)

    expect(metrics.s2Runs).toBe(selectorRuns2Before)
  } finally {
    screen.unmount()
    document.body.innerHTML = ''
    await runtime.dispose()
  }
})

const perfSuite = (matrix.suites as any[]).find((s) => s.id === 'runtimeStore.noTearing.tickNotify') as any
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

type ModuleStoreFactory = {
  readonly kind: 'runtimeStore' | 'perModule'
  readonly make: (
    runtime: any,
    moduleRuntime: any,
    options: { readonly lowPriorityDelayMs: number; readonly lowPriorityMaxDelayMs: number },
  ) => { readonly getSnapshot: () => unknown; readonly subscribe: (listener: () => void) => () => void }
}

const resolvePerfAdapter = (): ModuleStoreFactory['kind'] => {
  const raw = import.meta.env.VITE_LOGIX_PERF_RUNTIME_STORE_ADAPTER
  return raw === 'perModule' ? 'perModule' : 'runtimeStore'
}

const cancelRaf = (id: number | undefined): void => {
  const cancel = (globalThis as any).cancelAnimationFrame as ((rafId: number) => void) | undefined
  if (!cancel || typeof id !== 'number') return
  try {
    cancel(id)
  } catch {
    // ignore best-effort cancellation failures
  }
}

const scheduleRaf = (cb: () => void): number | undefined => {
  const raf = (globalThis as any).requestAnimationFrame as ((run: () => void) => number) | undefined
  if (!raf) return undefined
  try {
    return raf(cb)
  } catch {
    return undefined
  }
}

const makePerModuleExternalStore = <S,>(args: {
  readonly runtime: any
  readonly moduleRuntime: any
  readonly lowPriorityDelayMs: number
  readonly lowPriorityMaxDelayMs: number
}): { readonly getSnapshot: () => S; readonly subscribe: (listener: () => void) => () => void } => {
  let hasSnapshot = false
  let currentSnapshot: S | undefined

  const listeners = new Set<() => void>()
  let changesFiber: Fiber.Fiber<void, any> | undefined

  let notifyScheduled = false
  let notifyScheduledLow = false
  let lowTimeoutId: ReturnType<typeof setTimeout> | undefined
  let lowMaxTimeoutId: ReturnType<typeof setTimeout> | undefined
  let lowRafId: number | undefined

  const cancelLow = (): void => {
    if (!notifyScheduledLow) return
    notifyScheduledLow = false
    if (lowTimeoutId != null) {
      clearTimeout(lowTimeoutId)
      lowTimeoutId = undefined
    }
    if (lowMaxTimeoutId != null) {
      clearTimeout(lowMaxTimeoutId)
      lowMaxTimeoutId = undefined
    }
    cancelRaf(lowRafId)
    lowRafId = undefined
  }

  const flushNotify = (): void => {
    notifyScheduled = false
    cancelLow()
    for (const listener of listeners) {
      try {
        listener()
      } catch {
        // best-effort
      }
    }
  }

  const scheduleNotify = (priority: Logix.StateCommitPriority): void => {
    if (priority === 'low') {
      if (notifyScheduled) return
      if (notifyScheduledLow) return
      notifyScheduledLow = true

      const flush = () => {
        if (!notifyScheduledLow) return
        flushNotify()
      }

      const rafId = scheduleRaf(flush)
      if (rafId !== undefined) {
        lowRafId = rafId
      } else {
        lowTimeoutId = setTimeout(flush, args.lowPriorityDelayMs)
      }
      lowMaxTimeoutId = setTimeout(flush, args.lowPriorityMaxDelayMs)
      return
    }

    cancelLow()
    if (notifyScheduled) return
    notifyScheduled = true
    queueMicrotask(flushNotify)
  }

  const ensureFiber = (): void => {
    if (changesFiber) return
    const eff = Stream.runForEach((args.moduleRuntime as any).changesWithMeta((s: S) => s) as any, ({ value, meta }: any) =>
      Effect.sync(() => {
        hasSnapshot = true
        currentSnapshot = value as S
        scheduleNotify((meta?.priority as Logix.StateCommitPriority | undefined) ?? 'normal')
      }),
    )
    changesFiber = args.runtime.runFork(eff)
  }

  const getSnapshot = (): S => {
    if (hasSnapshot) return currentSnapshot as S
    const current = args.runtime.runSync(args.moduleRuntime.getState as unknown as Effect.Effect<S, never, any>)
    hasSnapshot = true
    currentSnapshot = current
    return current
  }

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener)
    ensureFiber()
    return () => {
      listeners.delete(listener)
      if (listeners.size > 0) return

      const fiber = changesFiber
      if (fiber) {
        changesFiber = undefined
        args.runtime.runFork(Fiber.interrupt(fiber))
      }
      cancelLow()
    }
  }

  return { getSnapshot, subscribe }
}

test(
  'perf: runtimeStore tick→notify baseline (runtimeStore.noTearing.tickNotify)',
  { timeout: TEST_TIMEOUT_MS },
  async () => {
    await withNodeEnv('production', async () => {
      const perfKernelLayer = makePerfKernelLayer()
      const adapter = resolvePerfAdapter()
      const factory: ModuleStoreFactory =
        adapter === 'perModule'
          ? {
              kind: 'perModule',
              make: (runtime, moduleRuntime, options) =>
                makePerModuleExternalStore({
                  runtime,
                  moduleRuntime,
                  lowPriorityDelayMs: options.lowPriorityDelayMs,
                  lowPriorityMaxDelayMs: options.lowPriorityMaxDelayMs,
                }),
            }
          : {
              kind: 'runtimeStore',
              make: (runtime, moduleRuntime, options) =>
                getRuntimeModuleExternalStore(runtime, moduleRuntime, {
                  lowPriorityDelayMs: options.lowPriorityDelayMs,
                  lowPriorityMaxDelayMs: options.lowPriorityMaxDelayMs,
                }),
            }

      const moduleCount = 10
      const ticksPerRun = 1

      const moduleDefs = Array.from({ length: moduleCount }, (_, i) =>
        Logix.Module.make(`PerfRuntimeStoreNoTearing.M${i}`, {
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

      const Root = Logix.Module.make('PerfRuntimeStoreNoTearing.Root', {
        state: Schema.Void,
        actions: {},
      })

      type TickNotifyHarness = {
        readonly diagnosticsLevel: 'off' | 'full'
        readonly watcherCount: number
        readonly runtime: any
        readonly moduleRuntimes: ReadonlyArray<any>
        readonly dispose: () => Promise<void>
        runSeq: number
        readonly runOnce: () => Promise<number>
      }

      const harnessByKey = new Map<string, TickNotifyHarness>()

      const getHarness = async (args: {
        readonly diagnosticsLevel: 'off' | 'full'
        readonly watcherCount: number
      }): Promise<TickNotifyHarness> => {
        const key = `${args.diagnosticsLevel}:${args.watcherCount}`
        const cached = harnessByKey.get(key)
        if (cached) return cached

        const instrumentation = args.diagnosticsLevel === 'full' ? 'full' : 'light'
        const debugLayer = Logix.Debug.devtoolsHubLayer(silentDebugLayer as Layer.Layer<any, never, never>, {
          diagnosticsLevel: args.diagnosticsLevel,
        }) as Layer.Layer<any, never, never>

        const runtime = Logix.Runtime.make(
          Root.implement({
            initial: undefined,
            imports: moduleImpls,
          }),
          {
            stateTransaction: { instrumentation },
            layer: Layer.mergeAll(debugLayer, perfKernelLayer) as Layer.Layer<any, never, never>,
            label: `perf:runtimeStore:noTearing:${args.diagnosticsLevel}:${args.watcherCount}:${factory.kind}`,
          },
        )

        const moduleRuntimes = (await runtime.runPromise(
          Effect.all(moduleDefs.map((m) => m.tag), { concurrency: 'unbounded' }) as any,
        )) as ReadonlyArray<any>

        const storeOptions = { lowPriorityDelayMs: 16, lowPriorityMaxDelayMs: 50 }
        const stores = moduleRuntimes.map((mr) => factory.make(runtime as any, mr, storeOptions))

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
            // best-effort: perf harness should still run even if a snapshot throws
          }
        }

        const runTick = async (logicalTick: number): Promise<number> => {
          waitState.token += 1
          waitState.remaining = stores.length
          const promise = new Promise<void>((resolve) => {
            waitState.resolve = resolve
          })

          // Dispatch updates synchronously (best-effort) and time only the async flush→notify window.
          Logix.Runtime.batch(() => {
            for (let i = 0; i < moduleRuntimes.length; i++) {
              const mr = moduleRuntimes[i] as any
              const payload = logicalTick * 1000 + i + 1
              if (mr?.actions?.set) {
                mr.actions.set(payload)
              } else {
                const action = { _tag: 'set', payload }
                runtime.runFork(mr.dispatch(action) as any)
              }
            }
          })

          const start = performance.now()
          await promise
          const end = performance.now()
          return end - start
        }

        const harness: TickNotifyHarness = {
          diagnosticsLevel: args.diagnosticsLevel,
          watcherCount: args.watcherCount,
          runtime,
          moduleRuntimes,
          runSeq: 0,
          runOnce: async () => {
            const base = harness.runSeq * ticksPerRun
            const samples: number[] = []
            for (let i = 0; i < ticksPerRun; i++) {
              samples.push(await runTick(base + i))
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

          const p95TickMs = await harness.runOnce()

          return {
            metrics: {
              timePerTickMs: p95TickMs,
            },
            evidence: {
              'diagnostics.level': diagnosticsLevel,
              'runtimeStore.adapter': factory.kind,
              'workload.modules': moduleCount,
              'workload.ticksPerRun': ticksPerRun,
            },
          }
          },
        )

        const report: PerfReport = {
          schemaVersion: 1,
          meta: {
            createdAt: new Date().toISOString(),
            generator: 'packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx',
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
                timePerTickMs: 'runtimeStore',
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
