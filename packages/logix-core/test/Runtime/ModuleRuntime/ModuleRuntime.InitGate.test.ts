import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Deferred, Effect, Fiber, Layer, Option, Schema } from 'effect'
import * as Debug from '../../../src/Debug.js'
import * as Logix from '../../../src/index.js'

describe('ModuleRuntime init gate', () => {
  it.scoped(
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

        const logic = TestModule.logic(($) => ({
          setup: Effect.sync(() => {
            $.lifecycle.onInitRequired(
              Effect.gen(function* () {
                steps.push('init0:start')
                yield* Deferred.succeed(firstStarted, undefined)
                yield* Deferred.await(gate)
                steps.push('init0:end')
              }),
            )

            $.lifecycle.onInitRequired(
              Effect.gen(function* () {
                steps.push('init1:start')
                yield* Deferred.succeed(secondStarted, undefined)
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

        const runtimeReady = yield* Deferred.make<Logix.ModuleRuntime<any, any>>()
        const keepAlive = yield* Deferred.make<void>()

        // 注意：不能用 `Effect.provide(layer)` 包住“释放 gate 的逻辑”，
        // 否则会先 build layer（其中 initRequired await gate）导致死锁。
        const acquireFiber = yield* Effect.forkScoped(
          Effect.gen(function* () {
            const runtime = yield* TestModule.tag
            yield* Deferred.succeed(runtimeReady, runtime as unknown as Logix.ModuleRuntime<any, any>)
            yield* Deferred.await(keepAlive)
          }).pipe(Effect.provide(layer)),
        )

        yield* Deferred.await(firstStarted)

        expect(yield* Deferred.poll(secondStarted)).toEqual(Option.none())
        expect(yield* Fiber.poll(acquireFiber)).toEqual(Option.none())

        yield* Deferred.succeed(gate, undefined)

        const runtime = yield* Deferred.await(runtimeReady)
        expect((yield* runtime.lifecycleStatus!).status).toBe('ready')
        expect(steps).toEqual(['init0:start', 'init0:end', 'init1:start'])

        yield* Deferred.succeed(keepAlive, undefined)
        yield* Fiber.join(acquireFiber)
      }) as any,
  )

  it.scoped(
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

        const logic = TestModule.logic(($) => ({
          setup: Effect.sync(() => {
            $.lifecycle.onInitRequired(Effect.die(new Error('Init Failed')))
          }),
          run: Effect.void,
        }))

        const layer = TestModule.live({ value: 0 }, logic) as unknown as Layer.Layer<
          Logix.ModuleRuntime<any, any>,
          never,
          never
        >

        const exit = yield* Effect.exit(
          Effect.locally(Debug.internal.currentDebugSinks as any, [sink])(
            Effect.gen(function* () {
              yield* TestModule.tag
            }).pipe(Effect.provide(layer)),
          ),
        )

        expect(exit._tag).toBe('Failure')
        expect(events.some((e) => e.type === 'lifecycle:error')).toBe(true)
      }) as any,
  )
})
