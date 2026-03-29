import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import { performance } from 'node:perf_hooks'
import * as Logix from '../../../src/index.js'
import { TickSchedulerTag } from '../../../src/internal/runtime/core/env.js'
import { flushAllHostScheduler, makeTestHostScheduler, testHostSchedulerLayer } from '../testkit/hostSchedulerTestKit.js'

type PerfSummary = {
  readonly n: number
  readonly p50Ms: number
  readonly p95Ms: number
  readonly meanMs: number
}

const quantile = (samples: ReadonlyArray<number>, q: number): number => {
  if (samples.length === 0) return 0
  const sorted = Array.from(samples).sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))
  return sorted[idx]!
}

const summarize = (samples: ReadonlyArray<number>): PerfSummary => {
  const n = samples.length
  const meanMs = n > 0 ? samples.reduce((acc, cur) => acc + cur, 0) / n : 0
  return {
    n,
    p50Ms: quantile(samples, 0.5),
    p95Ms: quantile(samples, 0.95),
    meanMs,
  }
}

const makeFields = (fanout: number, prefix: string) =>
  Array.from({ length: fanout }, (_, index) => `${prefix}${index}` as const)

const makeNumberStruct = (fields: ReadonlyArray<string>) =>
  Schema.Struct(
    Object.fromEntries(fields.map((field) => [field, Schema.Number])) as Record<string, typeof Schema.Number>,
  )

const makeInitialNumbers = (fields: ReadonlyArray<string>, value: number) =>
  Object.fromEntries(fields.map((field) => [field, value])) as Record<string, number>

const parseCount = (raw: string | undefined, fallback: number, min: number): number => {
  const parsed = Number(raw ?? fallback)
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.max(min, Math.trunc(parsed))
}

const benchmarkSameTargetModuleAsSource = (args: {
  readonly fanout: 1 | 8 | 32
  readonly iterations: number
  readonly warmup: number
}): Effect.Effect<PerfSummary> =>
  Effect.gen(function* () {
    type SourceAction = { readonly _tag: 'set'; readonly payload: number }
    const fanout = args.fanout
    const targetFields = makeFields(fanout, 'fromSource')

    const Source = Logix.Module.make(`PerfSameTargetModuleSource${fanout}`, {
      state: Schema.Struct({ value: Schema.Number }),
      actions: { set: Schema.Number },
      reducers: {
        set: Logix.Module.Reducer.mutate<{ value: number }, { payload: number }>((draft, payload) => {
          draft.value = payload
        }),
      },
    })

    const TargetState = makeNumberStruct(targetFields)
    const SourceValueRead = Logix.ReadQuery.make({
      selectorId: `rq_perf_same_target_module_${fanout}`,
      debugKey: `PerfSameTargetModuleSource${fanout}.value`,
      reads: ['value'],
      select: (s: { readonly value: number }) => s.value,
      equalsKind: 'objectIs',
    })

    const Target = Logix.Module.make(`PerfSameTargetModuleTarget${fanout}`, {
      state: TargetState,
      actions: {},
      traits: Logix.StateTrait.from(TargetState)(
        Object.fromEntries(
          targetFields.map((field) => [
            field,
            Logix.StateTrait.externalStore({
              store: Logix.ExternalStore.fromModule(Source, SourceValueRead),
            }),
          ]),
        ) as any,
      ),
    })

    const SourceImpl = Source.implement({ initial: { value: 0 } })
    const Root = Logix.Module.make(`PerfSameTargetModuleRoot${fanout}`, { state: Schema.Void, actions: {} })
    const RootImpl = Root.implement({
      initial: undefined,
      imports: [
        Target.implement({
          initial: makeInitialNumbers(targetFields, 0),
          imports: [SourceImpl.impl],
        }).impl,
      ],
    })

    const hostScheduler = makeTestHostScheduler()
    const runtime = Logix.Runtime.make(RootImpl, {
      layer: Layer.mergeAll(testHostSchedulerLayer(hostScheduler), Layer.empty) as Layer.Layer<any, never, never>,
    })

    try {
      const sourceRt = runtime.runSync(Effect.service(Source.tag).pipe(Effect.orDie)) as Logix.ModuleRuntime<
        { value: number },
        SourceAction
      >
      const targetRt = runtime.runSync(Effect.service(Target.tag).pipe(Effect.orDie)) as Logix.ModuleRuntime<
        Record<string, number>,
        never
      >

      const runOne = async (nextValue: number) => {
        const t0 = performance.now()
        await runtime.runPromise(sourceRt.dispatch({ _tag: 'set', payload: nextValue }))
        await runtime.runPromise(
          Effect.gen(function* () {
            const scheduler = yield* Effect.service(TickSchedulerTag).pipe(Effect.orDie)
            yield* scheduler.flushNow
          }),
        )
        await runtime.runPromise(flushAllHostScheduler(hostScheduler))
        const elapsedMs = performance.now() - t0
        const state = await runtime.runPromise(targetRt.getState)
        expect(state).toEqual(makeInitialNumbers(targetFields, nextValue))
        return elapsedMs
      }

      const warmup = Math.max(0, args.warmup)
      const iterations = Math.max(1, args.iterations)
      for (let i = 0; i < warmup; i++) {
        yield* Effect.promise(() => runOne(i + 1))
      }

      const samples: number[] = []
      for (let i = 0; i < iterations; i++) {
        samples.push(yield* Effect.promise(() => runOne(warmup + i + 1)))
      }

      return summarize(samples)
    } finally {
      yield* Effect.promise(() => runtime.dispose())
    }
  })

describe('runtime: same-target module-side fanout fusion perf evidence (node focused local)', () => {
  it.effect('should print same-target module fanout metrics', () =>
    Effect.gen(function* () {
      const iterations = parseCount(process.env.LOGIX_PERF_ITERS, 30, 1)
      const warmup = parseCount(process.env.LOGIX_PERF_WARMUP, 8, 0)

      const evidence = {
        scenario: 'runtime.sameTarget.moduleWritebackFusion.node.focused',
        run: {
          iterations,
          warmup,
        },
        sameTargetModuleAsSource: {
          fanout1: yield* benchmarkSameTargetModuleAsSource({ fanout: 1, iterations, warmup }),
          fanout8: yield* benchmarkSameTargetModuleAsSource({ fanout: 8, iterations, warmup }),
          fanout32: yield* benchmarkSameTargetModuleAsSource({ fanout: 32, iterations, warmup }),
        },
      } as const

      console.log(
        `[perf] sameTarget.moduleWritebackFusion p95 fanout1=${evidence.sameTargetModuleAsSource.fanout1.p95Ms.toFixed(3)}ms fanout8=${evidence.sameTargetModuleAsSource.fanout8.p95Ms.toFixed(3)}ms fanout32=${evidence.sameTargetModuleAsSource.fanout32.p95Ms.toFixed(3)}ms`,
      )
      console.log(`[perf:evidence] ${JSON.stringify(evidence)}`)

      expect(evidence.sameTargetModuleAsSource.fanout1.n).toBe(iterations)
    }),
  )
})
