import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Deferred, Effect, Layer, Schema } from 'effect'
import { TestClock } from 'effect/testing'
import * as Debug from '../../../../src/Debug.js'
import * as Logix from '../../../../src/index.js'
import * as Lifecycle from '../../../../src/internal/runtime/core/Lifecycle.js'
import { makeEventCollectorSink } from '../../../fixtures/lifecycle.js'

describe('Lifecycle phase guard', () => {
  it.effect('should emit logic::invalid_phase and keep registered tasks intact', () =>
    Effect.gen(function* () {
      const { events, sink } = makeEventCollectorSink()
      const snapshotSeen = yield* Deferred.make<{
        readonly before: unknown
        readonly after: unknown
      }>()

      const TestModule = Logix.Module.make('LifecyclePhaseGuard', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: {},
      })

      const logic = TestModule.logic(($) => ({
        setup: Effect.gen(function* () {
          yield* $.lifecycle.onInitRequired(Effect.void)
          yield* $.lifecycle.onStart(Effect.void)
          yield* $.lifecycle.onDestroy(Effect.void)
        }),
        run: Effect.gen(function* () {
          const lifecycle = yield* Lifecycle.LifecycleContext as any
          const before = yield* lifecycle.getTaskSnapshot

          yield* $.lifecycle.onInitRequired(Effect.void)
          yield* $.lifecycle.onStart(Effect.void)
          yield* $.lifecycle.onDestroy(Effect.void)
          yield* $.lifecycle.onError(() => Effect.void)

          const after = yield* lifecycle.getTaskSnapshot

          yield* Deferred.succeed(snapshotSeen, { before, after })
        }) as any,
      }))

      const layer = TestModule.live({ value: 0 }, logic) as unknown as Layer.Layer<
        Logix.ModuleRuntime<any, any>,
        never,
        never
      >

      const program = Effect.provideService(Effect.gen(function* () {
        yield* Effect.service(TestModule.tag).pipe(Effect.orDie)
        const snapshot = yield* Deferred.await(snapshotSeen)
        yield* TestClock.adjust('10 millis')
        return snapshot
      }).pipe(Effect.provide(layer)), Debug.internal.currentDebugSinks, [sink])

      const { before, after } = yield* program

      expect(after).toEqual(before)

      const invalidPhaseEvents = events.filter(
        (e) => e.type === 'diagnostic' && e.code === 'logic::invalid_phase' && e.kind === 'lifecycle_in_run',
      )
      expect(invalidPhaseEvents.length).toBeGreaterThan(0)
    }),
  )
})
