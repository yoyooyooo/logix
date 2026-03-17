import * as Logix from '@logixjs/core'
import { Effect, Exit, Layer, ManagedRuntime, Schema, Scope } from 'effect'

type CounterAction = { readonly _tag: 'inc'; readonly payload?: void }

type BenchSample = {
  readonly totalMs: number
}

type BenchSummary = {
  readonly rounds: ReadonlyArray<BenchSample>
  readonly meanMs: number
  readonly minMs: number
  readonly maxMs: number
}

const Counter = Logix.Module.make('readQueryActivationRetainScopeBenchCounter', {
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

const CYCLES = 20_000
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

  const retain = Logix.InternalContracts.retainReadQueryActivation(baseHandle, compiledSelector)
  if (!retain) {
    throw new Error('Missing retainReadQueryActivation internal contract')
  }

  const startedAt = performance.now()
  for (let i = 0; i < CYCLES; i += 1) {
    let transientScope: Scope.Closeable | undefined
    if (label === 'baseline') {
      transientScope = runtime.runSync(Scope.make()) as Scope.Closeable
    }

    const release = runtime.runSync(retain)
    release()

    if (transientScope) {
      void Effect.runPromiseExit(Scope.close(transientScope, Exit.void))
    }
  }
  const totalMs = performance.now() - startedAt

  await sleep(FINAL_RELEASE_WAIT_MS)
  await runtime.dispose()

  return { totalMs }
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
