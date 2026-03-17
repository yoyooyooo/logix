import * as Logix from '@logixjs/core'
import { Effect, Fiber, Layer, ManagedRuntime, Schema, Stream } from 'effect'
import { getRuntimeReadQueryExternalStore, type ExternalStore } from '../../src/internal/store/RuntimeExternalStore.js'

type CounterAction = { readonly _tag: 'inc'; readonly payload?: void }

type RuntimeStore = {
  readonly subscribeTopic: (topicKey: string, listener: () => void) => () => void
}

type HostScheduler = {
  readonly scheduleMicrotask: (cb: () => void) => void
}

type BenchSample = {
  readonly totalMs: number
  readonly warmupActivationStarts: number
  readonly measuredActivationStarts: number
}

type BenchSummary = {
  readonly rounds: ReadonlyArray<BenchSample>
  readonly meanMs: number
  readonly minMs: number
  readonly maxMs: number
  readonly warmupActivationStarts: ReadonlyArray<number>
  readonly measuredActivationStarts: ReadonlyArray<number>
}

const Counter = Logix.Module.make('useSelectorSharedActivationBenchCounter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { inc: Schema.Void },
  reducers: {
    inc: Logix.Module.Reducer.mutate((draft) => {
      draft.count += 1
    }),
  },
})

const selector = Object.assign((s: { readonly count: number }) => s.count, {
  fieldPaths: ['count'],
})

const compiledSelector = Logix.ReadQuery.compile(selector)

const WARMUP_CYCLES = 200
const CYCLES = 2_000
const ROUNDS = 5
const FINAL_RELEASE_WAIT_MS = 20

const makeRuntime = () => {
  const tickServicesLayer = Logix.InternalContracts.tickServicesLayer as Layer.Layer<any, never, any>
  const counterLayer = Counter.live({ count: 0 }) as Layer.Layer<any, never, any>

  return ManagedRuntime.make(
    Layer.mergeAll(
      tickServicesLayer,
      Layer.provide(counterLayer, tickServicesLayer),
    ) as Layer.Layer<any, never, never>,
  )
}

const flushMicrotask = async () => {
  await Promise.resolve()
}

const sleep = async (ms: number) => {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

const summarize = (rounds: ReadonlyArray<BenchSample>): BenchSummary => {
  let totalMs = 0
  let minMs = Number.POSITIVE_INFINITY
  let maxMs = 0

  for (const round of rounds) {
    totalMs += round.totalMs
    if (round.totalMs < minMs) minMs = round.totalMs
    if (round.totalMs > maxMs) maxMs = round.totalMs
  }

  return {
    rounds,
    meanMs: totalMs / rounds.length,
    minMs,
    maxMs,
    warmupActivationStarts: rounds.map((round) => round.warmupActivationStarts),
    measuredActivationStarts: rounds.map((round) => round.measuredActivationStarts),
  }
}

const runCycles = async (
  store: ExternalStore<number>,
  cycles: number,
): Promise<void> => {
  const listener = () => {}
  for (let i = 0; i < cycles; i += 1) {
    const unsubscribe = store.subscribe(listener)
    await flushMicrotask()
    unsubscribe()
    await flushMicrotask()
  }
}

const makeBaselineReadQueryExternalStore = (
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
  moduleRuntime: Logix.ModuleRuntime<{ count: number }, CounterAction>,
  selectorReadQuery: Logix.ReadQuery.ReadQueryCompiled<{ count: number }, number>,
): ExternalStore<number> => {
  const runtimeStore = Logix.InternalContracts.getRuntimeStore(runtime as any) as RuntimeStore
  const hostScheduler = Logix.InternalContracts.getHostScheduler(runtime as any) as HostScheduler
  const moduleInstanceKey = `${moduleRuntime.moduleId}::${moduleRuntime.instanceId}`
  const topicKey = `${moduleInstanceKey}::rq:${selectorReadQuery.selectorId}`

  const listeners = new Set<() => void>()
  let unsubscribeFromRuntimeStore: (() => void) | undefined
  let readQueryDrainFiber: Fiber.Fiber<void, any> | undefined
  let teardownScheduled = false
  let teardownToken = 0

  const getSnapshot = () => {
    const state = runtime.runSync(moduleRuntime.getState as Effect.Effect<{ count: number }, never, any>)
    return selectorReadQuery.select(state)
  }

  const cancelScheduledTeardown = (): void => {
    if (!teardownScheduled) return
    teardownScheduled = false
    teardownToken += 1
  }

  const finalizeTeardown = (): void => {
    if (listeners.size > 0) return
    const runtimeUnsubscribe = unsubscribeFromRuntimeStore
    unsubscribeFromRuntimeStore = undefined
    runtimeUnsubscribe?.()
    const fiber = readQueryDrainFiber
    readQueryDrainFiber = undefined
    if (fiber) {
      runtime.runFork(Fiber.interrupt(fiber))
    }
  }

  const scheduleTeardown = (): void => {
    if (teardownScheduled) return
    teardownScheduled = true
    const token = ++teardownToken
    hostScheduler.scheduleMicrotask(() => {
      if (!teardownScheduled || token !== teardownToken) return
      teardownScheduled = false
      finalizeTeardown()
    })
  }

  const ensureRuntimeStoreSubscription = (): void => {
    if (unsubscribeFromRuntimeStore) return
    unsubscribeFromRuntimeStore = runtimeStore.subscribeTopic(topicKey, () => {})
  }

  return {
    getSnapshot,
    subscribe: (listener) => {
      cancelScheduledTeardown()
      listeners.add(listener)
      ensureRuntimeStoreSubscription()
      if (!readQueryDrainFiber) {
        const effect = Stream.runDrain((moduleRuntime as any).changesReadQueryWithMeta(selectorReadQuery) as any)
        readQueryDrainFiber = runtime.runFork(effect)
      }
      return () => {
        listeners.delete(listener)
        if (listeners.size > 0) return
        scheduleTeardown()
      }
    },
  }
}

const runScenario = async (
  label: 'current' | 'baseline',
): Promise<BenchSample> => {
  const runtime = makeRuntime()
  const baseHandle = runtime.runSync(Effect.service(Counter.tag).pipe(Effect.orDie)) as Logix.ModuleRuntime<
    { count: number },
    CounterAction
  >

  let activationStarts = 0
  const original = baseHandle.changesReadQueryWithMeta.bind(baseHandle)
  ;(baseHandle as any).changesReadQueryWithMeta = (readQuery: any) => {
    activationStarts += 1
    return original(readQuery) as any
  }

  const store =
    label === 'current'
      ? getRuntimeReadQueryExternalStore(runtime, baseHandle, compiledSelector)
      : makeBaselineReadQueryExternalStore(runtime, baseHandle, compiledSelector)

  store.getSnapshot()
  await runCycles(store, WARMUP_CYCLES)
  const warmupActivationStarts = activationStarts

  activationStarts = 0
  const startedAt = performance.now()
  await runCycles(store, CYCLES)
  const totalMs = performance.now() - startedAt
  const measuredActivationStarts = activationStarts

  await sleep(FINAL_RELEASE_WAIT_MS)
  await runtime.dispose()

  return { totalMs, warmupActivationStarts, measuredActivationStarts }
}

const main = async () => {
  const currentRounds: BenchSample[] = []
  const baselineRounds: BenchSample[] = []

  for (let round = 0; round < ROUNDS; round += 1) {
    currentRounds.push(await runScenario('current'))
    baselineRounds.push(await runScenario('baseline'))
  }

  const result = {
    config: {
      warmupCycles: WARMUP_CYCLES,
      cycles: CYCLES,
      rounds: ROUNDS,
      finalReleaseWaitMs: FINAL_RELEASE_WAIT_MS,
    },
    current: summarize(currentRounds),
    baseline: summarize(baselineRounds),
  }

  console.log(JSON.stringify(result, null, 2))
}

await main()
