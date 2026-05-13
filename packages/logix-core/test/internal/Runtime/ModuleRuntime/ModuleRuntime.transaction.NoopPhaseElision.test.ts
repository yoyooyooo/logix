import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Debug from '../../../../src/internal/debug-api.js'
import * as Logix from '../../../../src/index.js'

const withIncrementingPerformanceNow = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  Effect.acquireUseRelease(
    Effect.sync(() => {
      const perf = (globalThis as any).performance as { now?: () => number } | undefined
      let tick = 1_000
      const now = () => {
        tick += 1
        return tick
      }
      const original = perf?.now
      if (perf && typeof original === 'function') {
        ;(perf as any).now = now
        return { perf, original } as const
      }
      const originalPerformance = (globalThis as any).performance
      ;(globalThis as any).performance = { now }
      return { perf: undefined, original: originalPerformance } as const
    }),
    () => effect,
    (saved) =>
      Effect.sync(() => {
        if (saved.perf) {
          ;(saved.perf as any).now = saved.original
          return
        }
        ;(globalThis as any).performance = saved.original
      }),
  )

describe('ModuleRuntime transaction no-op phase elision', () => {
  it.effect('skips field/source/validate phases for schema-only modules while preserving commit trace shape', () =>
    withIncrementingPerformanceNow(
      Effect.gen(function* () {
        const M = Logix.Module.make('ModuleRuntime.transaction.NoopPhaseElision.SchemaOnly', {
          state: Schema.Struct({
            count: Schema.Number,
          }),
          actions: {
            bump: Schema.Void,
          },
          reducers: {
            bump: Logix.Module.Reducer.mutate((draft) => {
              draft.count += 1
            }),
          },
        })

        const program = Logix.Program.make(M, {
          initial: { count: 0 },
          logics: [],
        })

        const ring = Debug.makeRingBufferSink(16)
        const runtime = Logix.Runtime.make(program, {
          layer: Layer.mergeAll(
            Debug.diagnosticsLevel('light'),
            Debug.replace([ring.sink]) as Layer.Layer<any, never, never>,
          ) as Layer.Layer<any, never, never>,
        })

        yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.gen(function* () {
              const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)
              yield* rt.dispatch({ _tag: 'bump' })
              expect((yield* rt.getState).count).toBe(1)
            }),
          ),
        )

        const trace = ring
          .getSnapshot()
          .find((event) => event.type === 'trace:txn-phase' && event.moduleId === M.id) as any

        expect(trace?.data?.fieldConvergeMs).toBe(0)
        expect(trace?.data?.scopedValidateMs).toBe(0)
        expect(trace?.data?.sourceSyncMs).toBe(0)
        expect(trace?.data?.commit?.totalMs).toBeGreaterThanOrEqual(0)

        yield* Effect.promise(() => runtime.dispose())
      }),
    ),
  )
})
