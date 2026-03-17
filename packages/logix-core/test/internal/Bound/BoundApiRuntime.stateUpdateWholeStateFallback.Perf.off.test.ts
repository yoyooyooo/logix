import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Debug from '../../../src/Debug.js'
import * as Logix from '../../../src/index.js'

type BenchCase = 'single' | 'eight' | 'many'
type BenchState = Record<string, number>

type BenchSummary = {
  readonly p50: number
  readonly p95: number
  readonly avg: number
}

const now = (): number => {
  const perf = (globalThis as any).performance as { now?: () => number } | undefined
  if (perf && typeof perf.now === 'function') {
    return perf.now()
  }
  return Date.now()
}

const quantile = (samples: ReadonlyArray<number>, q: number): number => {
  if (samples.length === 0) return 0
  const sorted = Array.from(samples).sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))
  return sorted[idx]!
}

const average = (samples: ReadonlyArray<number>): number =>
  samples.length === 0 ? 0 : samples.reduce((sum, value) => sum + value, 0) / samples.length

const makeStateSchema = () => {
  const fields: Record<string, Schema.Schema<number>> = {}
  for (let index = 0; index < 96; index += 1) {
    fields[`k${index}`] = Schema.Number
  }
  return Schema.Struct(fields)
}

const makeInitial = (): BenchState => {
  const next: Record<string, number> = {}
  for (let index = 0; index < 96; index += 1) {
    next[`k${index}`] = index
  }
  return next
}

const changedKeysFor = (benchCase: BenchCase): ReadonlyArray<string> => {
  switch (benchCase) {
    case 'single':
      return ['k0']
    case 'eight':
      return Array.from({ length: 8 }, (_, index) => `k${index}`)
    case 'many':
      return Array.from({ length: 64 }, (_, index) => `k${index}`)
  }
}

const makeUpdate =
  (benchCase: BenchCase) =>
  (state: BenchState): BenchState => {
    const next = { ...state }
    const keys = changedKeysFor(benchCase)
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index]!
      next[key] = (next[key] ?? 0) + 1
    }
    return next
  }

const runBench = (args: {
  readonly mode: 'legacy' | 'current'
  readonly benchCase: BenchCase
  readonly iterations: number
  readonly warmup: number
}): Effect.Effect<BenchSummary> =>
  Effect.gen(function* () {
    const State = makeStateSchema()

    let currentUpdate:
      | ((f: (state: BenchState) => BenchState) => Effect.Effect<void, never, any>)
      | undefined = undefined

    const M = Logix.Module.make(`BoundApiUpdateWholeStatePerf.${args.mode}.${args.benchCase}`, {
      state: State,
      actions: {},
    })

    const exposeLogic = M.logic(($) =>
      Effect.sync(() => {
        currentUpdate = $.state.update as any
      }),
    )

    const impl = M.implement({
      initial: makeInitial() as any,
      logics: [exposeLogic],
    })

    const runtime = Logix.Runtime.make(impl, {
      layer: Layer.mergeAll(Debug.replace([]), Debug.diagnosticsLevel('off')) as Layer.Layer<any, never, never>,
    })

    const update = makeUpdate(args.benchCase)

    const samples = (yield* Effect.promise(() =>
      runtime.runPromise(
        Effect.gen(function* () {
          const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)
          yield* Effect.sleep('10 millis')
          expect(currentUpdate).toBeDefined()

          const runOnce =
            args.mode === 'current'
              ? () => currentUpdate!(update)
              : () =>
                  Logix.InternalContracts.runWithStateTransaction(
                    rt as any,
                    { kind: 'state', name: 'update' },
                    () =>
                      Effect.flatMap(rt.getState, (prev: BenchState) => rt.setState(update(prev))),
                  )

          for (let index = 0; index < args.warmup; index += 1) {
            yield* runOnce()
          }

          const durations: number[] = []
          for (let index = 0; index < args.iterations; index += 1) {
            const startedAtMs = now()
            yield* runOnce()
            durations.push(Math.max(0, now() - startedAtMs))
          }

          return durations
        }),
      ),
    )) as ReadonlyArray<number>

    yield* Effect.promise(() => runtime.dispose())

    return {
      p50: quantile(samples, 0.5),
      p95: quantile(samples, 0.95),
      avg: average(samples),
    }
  })

describe('BoundApiRuntime.state.update whole-state fallback · perf baseline (Diagnostics=off)', () => {
  it.effect('records reproducible evidence for top-level dirty evidence vs inferReplaceEvidence', () =>
    Effect.gen(function* () {
      const iterations = Number(process.env.LOGIX_PERF_ITERS ?? 120)
      const warmup = Number(process.env.LOGIX_PERF_WARMUP ?? 20)
      const cases: ReadonlyArray<BenchCase> = ['single', 'eight', 'many']

      for (let index = 0; index < cases.length; index += 1) {
        const benchCase = cases[index]!
        const legacy = yield* runBench({ mode: 'legacy', benchCase, iterations, warmup })
        const current = yield* runBench({ mode: 'current', benchCase, iterations, warmup })

        console.log(
          `[perf] boundapi-update-whole-state case=${benchCase} ` +
            `legacy.p50=${legacy.p50.toFixed(3)}ms legacy.p95=${legacy.p95.toFixed(3)}ms legacy.avg=${legacy.avg.toFixed(3)}ms ` +
            `current.p50=${current.p50.toFixed(3)}ms current.p95=${current.p95.toFixed(3)}ms current.avg=${current.avg.toFixed(3)}ms`,
        )
      }
    }),
  )

  it.effect('patch-first contract: unknown-only top-level write should degrade to customMutation', () =>
    Effect.gen(function* () {
      const ring = Logix.Debug.makeRingBufferSink(64)
      const M = Logix.Module.make('BoundApiUpdatePatchFirstContract', {
        state: Schema.Struct({ k0: Schema.Number }),
        actions: {},
      })

      let updateFn: ((f: (state: Readonly<Record<string, unknown>>) => Readonly<Record<string, unknown>>) => Effect.Effect<void, never, any>) | undefined

      const impl = M.implement({
        initial: { k0: 0 } as any,
        logics: [
          M.logic(($) =>
            Effect.sync(() => {
              updateFn = $.state.update as any
            }),
          ),
        ],
      })

      const runtime = Logix.Runtime.make(impl, {
        layer: Layer.mergeAll(Debug.replace([ring.sink]), Debug.diagnosticsLevel('light')) as Layer.Layer<any, never, never>,
      })

      yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            expect(updateFn).toBeDefined()
            yield* updateFn!((prev) => ({ ...(prev as any), __tmp: ((prev as any).__tmp ?? 0) + 1 }) as any)
          }),
        ),
      )

      const events = ring
        .getSnapshot()
        .filter((event) => event.type === 'state:update' && event.moduleId === 'BoundApiUpdatePatchFirstContract') as any[]
      const last = events[events.length - 1]
      expect(last?.dirtySet?.dirtyAll).toBe(true)
      expect(last?.dirtySet?.reason).toBe('customMutation')

      yield* Effect.promise(() => runtime.dispose())
    }),
  )
})
