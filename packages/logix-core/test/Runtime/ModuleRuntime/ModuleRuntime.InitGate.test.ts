import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Deferred, Effect, Fiber, Layer, Option, Schema } from 'effect'
import * as Debug from '../../../src/internal/debug-api.js'
import * as Logix from '../../../src/index.js'

describe('ModuleRuntime init gate', () => {
  it.effect(
    'should block acquisition until initRequired completes (serial)',
    () =>
      Effect.gen(function* () {
        const steps: Array<string> = []
        const firstStarted = yield* Deferred.make<void>()
        const gate = yield* Deferred.make<void>()
        const secondStarted = yield* Deferred.make<void>()

        const TestModule = Logix.Module.make('ModuleRuntime.InitGate', {
          state: Schema.Struct({ value: Schema.Number }),
          actions: {},
        })

        const logic = TestModule.logic('test-module-logic', ($) => {
          $.readyAfter(
            Effect.gen(function* () {
              steps.push('init0:start')
              yield* Deferred.succeed(firstStarted, undefined)
              yield* Deferred.await(gate)
              steps.push('init0:end')
            }),
            { id: 'init0' },
          )

          $.readyAfter(
            Effect.gen(function* () {
              steps.push('init1:start')
              yield* Deferred.succeed(secondStarted, undefined)
            }),
            { id: 'init1' },
          )

          return Effect.void
        })

        const layer = TestModule.live({ value: 0 }, logic) as unknown as Layer.Layer<
          Logix.ModuleRuntime<any, any>,
          never,
          never
        >

        const runtimeReady = yield* Deferred.make<Logix.ModuleRuntime<any, any>>()
        const keepAlive = yield* Deferred.make<void>()

        // Note: do not wrap the "gate release logic" with `Effect.provide(layer)`,
        // otherwise the layer will be built first (initRequired awaits the gate) and deadlock.
        const acquireFiber = yield* Effect.forkScoped(
          Effect.gen(function* () {
            const runtime = yield* Effect.service(TestModule.tag).pipe(Effect.orDie)
            yield* Deferred.succeed(runtimeReady, runtime as unknown as Logix.ModuleRuntime<any, any>)
            yield* Deferred.await(keepAlive)
          }).pipe(Effect.provide(layer)),
        )

        yield* Deferred.await(firstStarted)

        expect(yield* Deferred.poll(secondStarted)).toBeUndefined()
        expect(yield* Fiber.await(acquireFiber).pipe(Effect.timeoutOption(0))).toEqual(Option.none())

        yield* Deferred.succeed(gate, undefined)

        const runtime = yield* Deferred.await(runtimeReady)
        expect((yield* runtime.lifecycleStatus!).status).toBe('ready')
        expect(steps).toEqual(['init0:start', 'init0:end', 'init1:start'])

        yield* Deferred.succeed(keepAlive, undefined)
        yield* Fiber.join(acquireFiber)
      }) as any,
  )

  it.effect(
    'should fail acquisition when initRequired fails and emit lifecycle:error',
    () =>
      Effect.gen(function* () {
        const events: Debug.Event[] = []
        const sink: Debug.Sink = {
          record: (event) =>
            Effect.sync(() => {
              events.push(event)
            }),
        }

        const TestModule = Logix.Module.make('ModuleRuntime.InitGate.Failure', {
          state: Schema.Struct({ value: Schema.Number }),
          actions: {},
        })

        const logic = TestModule.logic('test-module-logic-2', ($) => {
          $.readyAfter(Effect.die(new Error('Init Failed')), { id: 'init-failure' })
          return Effect.void
        })

        const layer = TestModule.live({ value: 0 }, logic) as unknown as Layer.Layer<
          Logix.ModuleRuntime<any, any>,
          never,
          never
        >

        const exit = yield* Effect.exit(
          Effect.provideService(Effect.gen(function* () {
            yield* Effect.service(TestModule.tag).pipe(Effect.orDie)
          }).pipe(Effect.provide(layer)), Debug.internal.currentDebugSinks as any, [sink]),
        )

        expect(exit._tag).toBe('Failure')
        expect(events.some((e) => e.type === 'lifecycle:error')).toBe(true)
      }) as any,
  )
})
