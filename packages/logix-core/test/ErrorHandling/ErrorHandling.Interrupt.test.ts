import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Deferred, Effect, Fiber, Layer, Schema } from 'effect'
import * as Debug from '../../src/internal/debug-api.js'
import * as Logix from '../../src/index.js'

describe('Error handling - interrupt', () => {
  it.effect('should not emit lifecycle:error or invoke onError on interrupt', () =>
    Effect.gen(function* () {
      const events: Debug.Event[] = []

      const sink: Debug.Sink = {
        record: (event) =>
          Effect.sync(() => {
            events.push(event)
          }),
      }

      const acquired = yield* Deferred.make<void>()

      const TestModule = Logix.Module.make('ErrorHandling.Interrupt', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: {},
      })

      const logic = TestModule.logic('test-module-logic', () => Effect.never)

      const layer = TestModule.live({ value: 0 }, logic) as unknown as Layer.Layer<
        Logix.ModuleRuntime<any, any>,
        never,
        never
      >

      yield* Effect.provideService(Effect.gen(function* () {
        const program = Effect.scoped(
          Effect.gen(function* () {
            yield* Effect.service(TestModule.tag).pipe(Effect.orDie)
            yield* Deferred.succeed(acquired, undefined)
            yield* Effect.never
          }).pipe(Effect.provide(layer)),
        )
      
        const fiber = yield* Effect.forkChild(program)
        yield* Deferred.await(acquired)
      
        yield* Fiber.interrupt(fiber)
      }), Debug.internal.currentDebugSinks as any, [sink])

      expect(events.some((e) => e.type === 'lifecycle:error')).toBe(false)
      expect(events.some((e) => e.type === 'diagnostic' && e.severity === 'error')).toBe(false)
    }),
  )
})
