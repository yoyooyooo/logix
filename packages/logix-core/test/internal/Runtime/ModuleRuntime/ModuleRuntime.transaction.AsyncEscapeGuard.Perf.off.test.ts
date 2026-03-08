import { describe, expect, it } from '@effect/vitest'
import { Cause, Effect, Layer, Schema } from 'effect'
import * as Debug from '../../../../src/Debug.js'
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

describe('ModuleRuntime.transaction async-escape guard · perf baseline (Diagnostics=off)', () => {
  it.effect('records reproducible sync-vs-fail-fast latency evidence', () =>
    Effect.gen(function* () {
      const prevNodeEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      try {
        const iterations = Number(process.env.LOGIX_PERF_ITERS ?? 120)
        const warmup = Number(process.env.LOGIX_PERF_WARMUP ?? 20)

        const State = Schema.Struct({
          count: Schema.Number,
        })

        const Actions = {
          bump: Schema.Void,
        }

        const M = Logix.Module.make('ModuleRuntime.Transaction.AsyncEscapeGuard.Perf', {
          state: State,
          actions: Actions,
          reducers: {
            bump: Logix.Module.Reducer.mutate((draft: any) => {
              draft.count += 1
            }),
          },
        })

        const impl = M.implement({
          initial: { count: 0 },
          logics: [],
        })

        const silentSink: Debug.Sink = {
          record: () => Effect.void,
        }

        const runtime = Logix.Runtime.make(impl, {
          layer: Layer.mergeAll(
            Debug.diagnosticsLevel('off'),
            Debug.replace([silentSink]) as Layer.Layer<any, never, never>,
          ) as Layer.Layer<any, never, never>,
        })

        const result = (yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.gen(function* () {
              const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)

              const syncSamples: number[] = []
              const failFastSamples: number[] = []
              let failFastCount = 0

              const runSyncTxn = () =>
                Logix.InternalContracts.runWithStateTransaction(rt, { kind: 'perf', name: 'sync' }, () => Effect.void)

              const runAsyncEscapeTxn = () =>
                Logix.InternalContracts.runWithStateTransaction(rt, { kind: 'perf', name: 'async_escape' }, () =>
                  Effect.sleep('1 millis'),
                )

              for (let i = 0; i < warmup + iterations; i += 1) {
                const t0 = now()
                const exit = yield* Effect.exit(runSyncTxn())
                const elapsed = now() - t0
                if (i >= warmup) {
                  syncSamples.push(elapsed)
                }
                if (exit._tag !== 'Success') {
                  throw new Error('[perf] sync transaction should not fail')
                }
              }

              for (let i = 0; i < warmup + iterations; i += 1) {
                const t0 = now()
                const exit = yield* Effect.exit(runAsyncEscapeTxn())
                const elapsed = now() - t0
                if (i >= warmup) {
                  failFastSamples.push(elapsed)
                }
                if (i >= warmup && exit._tag === 'Failure') {
                  const defects = exit.cause.reasons.filter(Cause.isDieReason).map((reason) => reason.defect)
                  if (defects.some((d) => (d as any)?.code === 'state_transaction::async_escape')) {
                    failFastCount += 1
                  }
                }
              }

              return {
                syncSamples,
                failFastSamples,
                failFastCount,
              }
            }),
          ),
        )) as {
          readonly syncSamples: ReadonlyArray<number>
          readonly failFastSamples: ReadonlyArray<number>
          readonly failFastCount: number
        }

        expect(result.syncSamples).toHaveLength(iterations)
        expect(result.failFastSamples).toHaveLength(iterations)
        expect(result.failFastCount).toBe(iterations)

        const syncP50 = quantile(result.syncSamples, 0.5)
        const syncP95 = quantile(result.syncSamples, 0.95)
        const failFastP50 = quantile(result.failFastSamples, 0.5)
        const failFastP95 = quantile(result.failFastSamples, 0.95)

        console.log(
          `[perf] O-017 txn-async-guard diagnostics=off iters=${iterations} warmup=${warmup} ` +
            `sync.p50=${syncP50.toFixed(3)}ms sync.p95=${syncP95.toFixed(3)}ms ` +
            `failFast.p50=${failFastP50.toFixed(3)}ms failFast.p95=${failFastP95.toFixed(3)}ms`,
        )
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
