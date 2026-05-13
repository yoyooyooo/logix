import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../src/index.js'
import * as Platform from '../src/internal/runtime/core/Platform.js'

const TestModule = Logix.Module.make('PlatformTest', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {},
})

class NoopPlatform implements Platform.Service {
  readonly lifecycle = {
    onSuspend: (_eff: Effect.Effect<void, never, any>) => Effect.void,
    onResume: (_eff: Effect.Effect<void, never, any>) => Effect.void,
    onReset: (_eff: Effect.Effect<void, never, any>) => Effect.void,
  }

  readonly emitSuspend = (): Effect.Effect<void, never, any> => Effect.void
  readonly emitResume = (): Effect.Effect<void, never, any> => Effect.void
  readonly emitReset = (): Effect.Effect<void, never, any> => Effect.void
}

describe('Platform integration (internal owner)', () => {
  it('should keep ordinary Logic surface free of platform signal hooks when Platform service is missing', async () => {
    let apiSnapshot: unknown
    const logic = TestModule.logic('test-module-logic', ($) => {
      apiSnapshot = $
      return Effect.void
    })

    const layer = TestModule.live({ count: 0 }, logic) as unknown as Layer.Layer<Logix.ModuleRuntime<any, any>, never, never>
    const program = Effect.gen(function* () {
      yield* Effect.service(TestModule.tag).pipe(Effect.orDie)
      yield* Effect.sleep('10 millis')
    }).pipe(Effect.provide(layer))

    await Effect.runPromise(Effect.scoped(program) as Effect.Effect<void, never, never>)

    expect((apiSnapshot as any).lifecycle).toBeUndefined()
    expect((apiSnapshot as any).signals).toBeUndefined()
  })

  it('should allow injecting a no-op Platform service without ordinary Logic hooks', async () => {
    const logic = TestModule.logic('test-module-logic-2', () => Effect.void)
    const baseLayer = TestModule.live({ count: 0 }, logic) as unknown as Layer.Layer<
      Logix.ModuleRuntime<any, any>,
      never,
      never
    >

    const layer = Layer.provideMerge(baseLayer, Layer.succeed(Platform.Tag, new NoopPlatform())) as Layer.Layer<
      Logix.ModuleRuntime<any, any>,
      never,
      never
    >

    const program = Effect.gen(function* () {
      yield* Effect.service(TestModule.tag).pipe(Effect.orDie)
      yield* Effect.sleep('10 millis')
    }).pipe(Effect.provide(layer))

    await Effect.runPromise(Effect.scoped(program) as Effect.Effect<void, never, never>)

    expect(true).toBe(true)
  })

  it('should allow injecting custom Platform implementation via Platform.Tag', async () => {
    const calls: Array<string> = []

    class TestPlatform implements Platform.Service {
      readonly lifecycle = {
        onSuspend: (eff: Effect.Effect<void, never, any>) =>
          eff.pipe(
            Effect.flatMap(() => Effect.sync(() => {
              calls.push('suspend')
            })),
          ),
        onResume: (eff: Effect.Effect<void, never, any>) =>
          eff.pipe(
            Effect.flatMap(() => Effect.sync(() => {
              calls.push('resume')
            })),
          ),
        onReset: (eff: Effect.Effect<void, never, any>) =>
          eff.pipe(
            Effect.flatMap(() => Effect.sync(() => {
              calls.push('reset')
            })),
          ),
      }

      readonly emitSuspend = (): Effect.Effect<void, never, any> => Effect.void
      readonly emitResume = (): Effect.Effect<void, never, any> => Effect.void
      readonly emitReset = (): Effect.Effect<void, never, any> => Effect.void
    }

    const logic = TestModule.logic('test-module-logic-3', () => Effect.void)

    const baseLayer = TestModule.live({ count: 0 }, logic) as unknown as Layer.Layer<
      Logix.ModuleRuntime<any, any>,
      never,
      never
    >

    const platformLayer = Layer.succeed(Platform.Tag, new TestPlatform())

    const layer = baseLayer.pipe(Layer.provide(platformLayer)) as Layer.Layer<
      Logix.ModuleRuntime<any, any>,
      never,
      never
    >

    const program = Effect.gen(function* () {
      yield* Effect.service(TestModule.tag).pipe(Effect.orDie)
      yield* Effect.sleep('10 millis')
    }).pipe(Effect.provide(layer))

    await Effect.runPromise(Effect.scoped(program) as Effect.Effect<void, never, never>)

    expect(calls).toEqual([])
  })
})
