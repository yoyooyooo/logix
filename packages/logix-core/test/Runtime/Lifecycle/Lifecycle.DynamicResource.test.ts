import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Deferred, Effect, Layer, Schema, TestClock } from 'effect'
import * as Logix from '../../../src/index.js'

describe('Lifecycle dynamic resources', () => {
  it.scoped('should clean up via acquireRelease without late onDestroy', () =>
    Effect.gen(function* () {
      const cleaned = yield* Deferred.make<void>()
      let released = false

      const TestModule = Logix.Module.make('LifecycleDynamicResource', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: {},
      })

      const logic = TestModule.logic(() => ({
        setup: Effect.void,
        run: Effect.gen(function* () {
          yield* Effect.acquireRelease(Effect.void, () =>
            Effect.sync(() => {
              released = true
            }).pipe(Effect.zipRight(Deferred.succeed(cleaned, undefined))),
          )
          yield* Effect.never
        }),
      }))

      const layer = TestModule.live({ value: 0 }, logic) as unknown as Layer.Layer<
        Logix.ModuleRuntime<any, any>,
        never,
        never
      >

      yield* Effect.scoped(
        Effect.gen(function* () {
          yield* TestModule.tag
          yield* TestClock.adjust('10 millis')
        }).pipe(Effect.provide(layer)),
      )

      yield* Deferred.await(cleaned)
      expect(released).toBe(true)
    }),
  )
})
