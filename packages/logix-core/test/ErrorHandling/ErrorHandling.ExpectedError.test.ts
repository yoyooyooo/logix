import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Deferred, Effect, Layer, Schema } from 'effect'
import * as Debug from '../../src/Debug.js'
import * as Logix from '../../src/index.js'

describe('Error handling - expected error', () => {
  it.scoped('should not emit lifecycle:error or invoke onError when an error is caught locally', () =>
    Effect.gen(function* () {
      const events: Debug.Event[] = []
      const onErrorCalls: Array<unknown> = []

      const sink: Debug.Sink = {
        record: (event) =>
          Effect.sync(() => {
            events.push(event)
          }),
      }

      const runDone = yield* Deferred.make<void>()

      const TestModule = Logix.Module.make('ErrorHandling.ExpectedError', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: {},
      })

      const logic = TestModule.logic(($) => ({
        setup: Effect.sync(() => {
          $.lifecycle.onError((cause, context) =>
            Effect.sync(() => {
              onErrorCalls.push({ cause, context })
            }),
          )
        }),
        run: Effect.gen(function* () {
          yield* Effect.fail('expected').pipe(Effect.catchAll(() => Effect.void))
          yield* Deferred.succeed(runDone, undefined)
        }),
      }))

      const layer = TestModule.live({ value: 0 }, logic) as unknown as Layer.Layer<
        Logix.ModuleRuntime<any, any>,
        never,
        never
      >

      yield* Effect.locally(Debug.internal.currentDebugSinks as any, [sink])(
        Effect.scoped(
          Effect.gen(function* () {
            yield* TestModule.tag
            yield* Deferred.await(runDone)
          }).pipe(Effect.provide(layer)),
        ),
      )

      expect(onErrorCalls.length).toBe(0)
      expect(events.some((e) => e.type === 'lifecycle:error')).toBe(false)
    }),
  )
})
