import { Effect, Layer, Schema } from 'effect'
import { describe, expect, it } from 'vitest'
import * as Debug from '../../../../src/Debug.js'
import * as Logix from '../../../../src/index.js'
import { RuntimeStoreTag, TickSchedulerTag } from '../../../../src/internal/runtime/core/env.js'
import { flushAllHostScheduler, makeTestHostScheduler, testHostSchedulerLayer } from '../../testkit/hostSchedulerTestKit.js'

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

describe('ModuleRuntime post-commit slim path · perf baseline (diagnostics=off)', { timeout: 20_000 }, () => {
  it('records reproducible no-observer dispatch evidence', async () => {
    const prevNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    try {
      const iterations = Number(process.env.LOGIX_PERF_ITERS ?? 240)
      const warmup = Number(process.env.LOGIX_PERF_WARMUP ?? 40)
      const hostScheduler = makeTestHostScheduler()

      const Counter = Logix.Module.make('ModuleRuntime.PostCommitSlim.Perf', {
        state: Schema.Struct({
          count: Schema.Number,
        }),
        actions: {
          bump: Schema.Void,
        },
        reducers: {
          bump: Logix.Module.Reducer.mutate((draft: { count: number }) => {
            draft.count += 1
          }),
        },
      })

      const runtime = Logix.Runtime.make(
        Counter.implement({
          initial: { count: 0 },
          logics: [],
        }),
        {
          layer: Layer.mergeAll(
            testHostSchedulerLayer(hostScheduler),
            Debug.diagnosticsLevel('off'),
            Debug.traceMode('off'),
            Debug.replace([]),
          ) as Layer.Layer<any, never, never>,
        },
      )

      try {
        const result = await runtime.runPromise(
          Effect.gen(function* () {
              const rt: any = yield* Effect.service(Counter.tag).pipe(Effect.orDie)
              const scheduler = yield* Effect.service(TickSchedulerTag).pipe(Effect.orDie)
              const store = yield* Effect.service(RuntimeStoreTag).pipe(Effect.orDie)

              for (let i = 0; i < warmup; i += 1) {
                yield* rt.dispatch({ _tag: 'bump' })
                yield* flushAllHostScheduler(hostScheduler)
              }

              const dispatchSamples: number[] = []
              const settleSamples: number[] = []
              for (let i = 0; i < iterations; i += 1) {
                const startedAtMs = now()
                yield* rt.dispatch({ _tag: 'bump' })
                const afterDispatchMs = now()
                yield* flushAllHostScheduler(hostScheduler)
                const afterSettleMs = now()
                dispatchSamples.push(afterDispatchMs - startedAtMs)
                settleSamples.push(afterSettleMs - startedAtMs)
              }

              const finalState = yield* rt.getState

              return {
                dispatchSamples,
                settleSamples,
                tickSeq: scheduler.getTickSeq(),
                storeTickSeq: store.getTickSeq(),
                finalState,
              }
            }),
        )

        expect(result.dispatchSamples).toHaveLength(iterations)
        expect(result.settleSamples).toHaveLength(iterations)
        expect(result.finalState).toEqual({ count: warmup + iterations })

        console.log(
          `[perf] post-commit-slim diagnostics=off observers=none ` +
            `iters=${iterations} warmup=${warmup} ` +
            `dispatchOnly.avg=${average(result.dispatchSamples).toFixed(3)}ms ` +
            `dispatchOnly.p50=${quantile(result.dispatchSamples, 0.5).toFixed(3)}ms ` +
            `dispatchOnly.p95=${quantile(result.dispatchSamples, 0.95).toFixed(3)}ms ` +
            `settle.avg=${average(result.settleSamples).toFixed(3)}ms ` +
            `settle.p50=${quantile(result.settleSamples, 0.5).toFixed(3)}ms ` +
            `settle.p95=${quantile(result.settleSamples, 0.95).toFixed(3)}ms ` +
            `tickSeq=${result.tickSeq} storeTickSeq=${result.storeTickSeq}`,
        )
      } finally {
        await runtime.dispose()
      }
    } finally {
      if (prevNodeEnv == null) {
        delete process.env.NODE_ENV
      } else {
        process.env.NODE_ENV = prevNodeEnv
      }
    }
  })
})
