import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Deferred, Effect, Layer, Schema } from 'effect'
import { TestClock } from 'effect/testing'
import * as Logix from '../../../src/index.js'

describe('Lifecycle dynamic resources', () => {
  it.effect('should clean up via acquireRelease without late onDestroy', () =>
    Effect.gen(function* () {
      const cleaned = yield* Deferred.make<void>()
      let released = false

      const TestModule = Logix.Module.make('LifecycleDynamicResource', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: {},
      })

      const logic = TestModule.logic('test-module-logic', () =>
        Effect.gen(function* () {
          yield* Effect.acquireRelease(Effect.void, () =>
            Effect.sync(() => {
              released = true
            }).pipe(Effect.flatMap(() => Deferred.succeed(cleaned, undefined))),
          )
          yield* Effect.never
        }),
      )

      const layer = TestModule.live({ value: 0 }, logic) as unknown as Layer.Layer<
        Logix.ModuleRuntime<any, any>,
        never,
        never
      >

      yield* Effect.scoped(
        Effect.gen(function* () {
          yield* Effect.service(TestModule.tag).pipe(Effect.orDie)
          yield* TestClock.adjust('10 millis')
        }).pipe(Effect.provide(layer)),
      )

      yield* Deferred.await(cleaned)
      expect(released).toBe(true)
    }),
  )
})
