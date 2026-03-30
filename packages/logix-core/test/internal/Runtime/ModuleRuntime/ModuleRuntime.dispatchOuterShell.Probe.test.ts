import { describe, expect, it } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../../../src/index.js'

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

describe('ModuleRuntime dispatch outer shell probe', () => {
  it.effect('compares public dispatch vs public setState vs direct txn setState', () =>
    Effect.gen(function* () {
      const prevNodeEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      try {
        const iterations = Number(process.env.LOGIX_PERF_ITERS ?? 400)
        const warmup = Number(process.env.LOGIX_PERF_WARMUP ?? 80)

        const M = Logix.Module.make('ModuleRuntime.DispatchOuterShell.Probe', {
          state: Schema.Struct({
            count: Schema.Number,
          }),
          actions: {
            set: Schema.Number,
          },
          reducers: {
            set: Logix.Module.Reducer.mutate<{ count: number }, { payload: number }>((draft, payload) => {
              draft.count = payload
            }),
          },
        })

        const runtime = Logix.Runtime.make(
          M.implement({
            initial: { count: 0 },
          }),
        )

        const samples = (yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.gen(function* () {
              const rt = yield* Effect.service(M.tag).pipe(Effect.orDie)

              const measure = (runOne: (value: number) => Effect.Effect<void>) =>
                Effect.gen(function* () {
                  for (let i = 0; i < warmup; i += 1) {
                    yield* runOne(i + 1)
                  }

                  const measured: number[] = []
                  for (let i = 0; i < iterations; i += 1) {
                    const value = warmup + i + 1
                    const startedAtMs = now()
                    yield* runOne(value)
                    measured.push(now() - startedAtMs)
                  }

                  return measured
                })

              const dispatchSamples = yield* measure((value) => rt.dispatch({ _tag: 'set', payload: value }))
              const queuedSetStateSamples = yield* measure((value) => rt.setState({ count: value }))
              const directTxnSetStateSamples = yield* measure((value) =>
                Logix.InternalContracts.runWithStateTransaction(
                  rt as any,
                  { kind: 'perf', name: 'directTxnSetState', details: { value } },
                  () => rt.setState({ count: value }),
                ),
              )

              const state = yield* rt.getState
              expect(state.count).toBe(warmup + iterations)

              return {
                dispatchSamples,
                queuedSetStateSamples,
                directTxnSetStateSamples,
              }
            }),
          ),
        )) as {
          readonly dispatchSamples: ReadonlyArray<number>
          readonly queuedSetStateSamples: ReadonlyArray<number>
          readonly directTxnSetStateSamples: ReadonlyArray<number>
        }

        console.log(
          `[perf] dispatch-outer-shell-probe iters=${iterations} warmup=${warmup} ` +
            `dispatch.p50=${quantile(samples.dispatchSamples, 0.5).toFixed(3)}ms dispatch.p95=${quantile(samples.dispatchSamples, 0.95).toFixed(3)}ms ` +
            `queuedSetState.p50=${quantile(samples.queuedSetStateSamples, 0.5).toFixed(3)}ms queuedSetState.p95=${quantile(samples.queuedSetStateSamples, 0.95).toFixed(3)}ms ` +
            `directTxnSetState.p50=${quantile(samples.directTxnSetStateSamples, 0.5).toFixed(3)}ms directTxnSetState.p95=${quantile(samples.directTxnSetStateSamples, 0.95).toFixed(3)}ms ` +
            `dispatchMinusQueued.avg=${(average(samples.dispatchSamples) - average(samples.queuedSetStateSamples)).toFixed(3)}ms ` +
            `queuedMinusDirect.avg=${(average(samples.queuedSetStateSamples) - average(samples.directTxnSetStateSamples)).toFixed(3)}ms`,
        )

        yield* Effect.promise(() => runtime.dispose())
      } finally {
        if (prevNodeEnv == null) {
          delete process.env.NODE_ENV
        } else {
          process.env.NODE_ENV = prevNodeEnv
        }
      }
    }),
  )
})
