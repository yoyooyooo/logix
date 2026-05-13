import { describe, expect, it } from '@effect/vitest'
import { Deferred, Effect, Fiber, Layer, Schema } from 'effect'
import * as Debug from '../../../../src/internal/debug-api.js'
import type { ResolvedConcurrencyPolicy } from '../../../../src/internal/runtime/core/ModuleRuntime.concurrencyPolicy.js'
import {
  currentTxnQueuePhaseTiming,
  makeEnqueueTransaction,
} from '../../../../src/internal/runtime/core/ModuleRuntime.txnQueue.js'
import * as Logix from '../../../../src/index.js'

const policy: ResolvedConcurrencyPolicy = {
  concurrencyLimit: 16,
  losslessBackpressureCapacity: 16,
  allowUnbounded: false,
  pressureWarningThreshold: {
    backlogCount: 1000,
    backlogDurationMs: 5000,
  },
  warningCooldownMs: 30_000,
  configScope: 'builtin',
  concurrencyLimitScope: 'builtin',
  requestedConcurrencyLimit: 16,
  requestedConcurrencyLimitScope: 'builtin',
  allowUnboundedScope: 'builtin',
}

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

describe('ModuleRuntime.txnQueue empty fast path', () => {
  it.effect('direct-idle urgent dispatch records zero queue wait and handoff while preserving queue trace shape', () =>
    withIncrementingPerformanceNow(
      Effect.gen(function* () {
        const M = Logix.Module.make('ModuleRuntime.txnQueue.EmptyFastPath.DirectIdle', {
          state: Schema.Struct({ count: Schema.Number }),
          actions: { bump: Schema.Void },
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

        expect(trace?.data?.queue?.startMode).toBe('direct_idle')
        expect(trace?.data?.queue?.queueWaitMs).toBe(0)
        expect(trace?.data?.queue?.startHandoffMs).toBe(0)
        expect(trace?.data?.queue?.backpressureMs).toBe(0)
        expect(trace?.data?.queue?.queueDepthAtStart).toEqual({ urgent: 0, nonUrgent: 0 })

        yield* Effect.promise(() => runtime.dispose())
      }),
    ),
  )

  it.effect('backlog still uses the full queue handoff path', () =>
    Effect.gen(function* () {
      const enqueueTransaction = yield* makeEnqueueTransaction({
        moduleId: 'M',
        instanceId: 'i-1',
        resolveConcurrencyPolicy: () => Effect.succeed(policy),
        diagnostics: {
          emitPressureIfNeeded: () => Effect.void,
          emitUnboundedPolicyIfNeeded: () => Effect.void,
        },
      })

      const runningStarted = yield* Deferred.make<void>()
      const runningGate = yield* Deferred.make<void>()
      const followerTiming = yield* Deferred.make<any>()

      const runningFiber = yield* Effect.forkChild(
        enqueueTransaction(
          'urgent',
          Effect.gen(function* () {
            yield* Deferred.succeed(runningStarted, undefined)
            yield* Deferred.await(runningGate)
          }),
        ),
      )
      yield* Deferred.await(runningStarted)

      const followerFiber = yield* Effect.forkChild(
        enqueueTransaction(
          'urgent',
          Effect.gen(function* () {
            const timing = yield* Effect.service(currentTxnQueuePhaseTiming)
            yield* Deferred.succeed(followerTiming, timing)
          }),
        ).pipe(Effect.provideService(Debug.internal.currentDiagnosticsLevel, 'light')),
      )

      yield* Effect.yieldNow
      yield* Deferred.succeed(runningGate, undefined)
      yield* Fiber.join(runningFiber)
      yield* Fiber.join(followerFiber)

      const timing = yield* Deferred.await(followerTiming)
      expect(timing?.startMode).toBe('direct_handoff')
      expect(timing?.activeLaneAtEnqueue).toBe('urgent')
    }),
  )
})
