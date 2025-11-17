import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Deferred, Effect, Fiber, Layer, Schema } from 'effect'
import * as Logix from '../../../src/index.js'

describe('ModuleRuntime destroy LIFO', () => {
  it.scoped('should run destroy tasks in LIFO order on normal completion', () =>
    Effect.gen(function* () {
      const calls: Array<string> = []

      const TestModule = Logix.Module.make('ModuleRuntime.DestroyLifo.Normal', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: {},
      })

      const logic = TestModule.logic(($) => ({
        setup: Effect.sync(() => {
          $.lifecycle.onDestroy(
            Effect.sync(() => {
              calls.push('destroy:1')
            }),
          )
          $.lifecycle.onDestroy(
            Effect.sync(() => {
              calls.push('destroy:2')
            }),
          )
        }),
        run: Effect.void,
      }))

      const layer = TestModule.live({ value: 0 }, logic) as unknown as Layer.Layer<
        Logix.ModuleRuntime<any, any>,
        never,
        never
      >

      yield* Effect.scoped(
        Effect.gen(function* () {
          yield* TestModule.tag
        }).pipe(Effect.provide(layer)),
      )

      expect(calls).toEqual(['destroy:2', 'destroy:1'])
    }),
  )

  it.scoped('should run destroy tasks exactly once on failure', () =>
    Effect.gen(function* () {
      const calls: Array<string> = []

      const TestModule = Logix.Module.make('ModuleRuntime.DestroyLifo.Failure', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: {},
      })

      const logic = TestModule.logic(($) => ({
        setup: Effect.sync(() => {
          $.lifecycle.onDestroy(
            Effect.sync(() => {
              calls.push('destroy:1')
            }),
          )
          $.lifecycle.onDestroy(
            Effect.sync(() => {
              calls.push('destroy:2')
            }),
          )
        }),
        run: Effect.void,
      }))

      const layer = TestModule.live({ value: 0 }, logic) as unknown as Layer.Layer<
        Logix.ModuleRuntime<any, any>,
        never,
        never
      >

      const exit = yield* Effect.exit(
        Effect.scoped(
          Effect.gen(function* () {
            yield* TestModule.tag
            return yield* Effect.fail('boom')
          }).pipe(Effect.provide(layer)),
        ),
      )

      expect(exit._tag).toBe('Failure')
      expect(calls).toEqual(['destroy:2', 'destroy:1'])
    }),
  )

  it.scoped('should run destroy tasks exactly once on interrupt', () =>
    Effect.gen(function* () {
      const calls: Array<string> = []
      const acquired = yield* Deferred.make<void>()

      const TestModule = Logix.Module.make('ModuleRuntime.DestroyLifo.Interrupt', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: {},
      })

      const logic = TestModule.logic(($) => ({
        setup: Effect.sync(() => {
          $.lifecycle.onDestroy(
            Effect.sync(() => {
              calls.push('destroy:1')
            }),
          )
          $.lifecycle.onDestroy(
            Effect.sync(() => {
              calls.push('destroy:2')
            }),
          )
        }),
        run: Effect.void,
      }))

      const layer = TestModule.live({ value: 0 }, logic) as unknown as Layer.Layer<
        Logix.ModuleRuntime<any, any>,
        never,
        never
      >

      const program = Effect.scoped(
        Effect.gen(function* () {
          yield* TestModule.tag
          yield* Deferred.succeed(acquired, undefined)
          yield* Effect.never
        }).pipe(Effect.provide(layer)),
      )

      const fiber = yield* Effect.fork(program)
      yield* Deferred.await(acquired)
      yield* Fiber.interrupt(fiber)

      expect(calls).toEqual(['destroy:2', 'destroy:1'])
    }),
  )
})
