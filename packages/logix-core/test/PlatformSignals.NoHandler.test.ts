import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Debug from '../src/Debug.js'
import * as Logix from '../src/index.js'
import { makeEventCollectorSink } from './fixtures/lifecycle.js'

class TestPlatform implements Logix.Platform.Service {
  private readonly suspendHandlers: Array<Effect.Effect<void, never, any>> = []
  private readonly resumeHandlers: Array<Effect.Effect<void, never, any>> = []
  private readonly resetHandlers: Array<Effect.Effect<void, never, any>> = []

  readonly lifecycle = {
    onSuspend: (eff: Effect.Effect<void, never, any>) =>
      Effect.sync(() => {
        this.suspendHandlers.push(eff)
      }),
    onResume: (eff: Effect.Effect<void, never, any>) =>
      Effect.sync(() => {
        this.resumeHandlers.push(eff)
      }),
    onReset: (eff: Effect.Effect<void, never, any>) =>
      Effect.sync(() => {
        this.resetHandlers.push(eff)
      }),
  }

  readonly emitSuspend = (): Effect.Effect<void, never, any> =>
    Effect.forEach(this.suspendHandlers, (eff) => eff, { discard: true })

  readonly emitResume = (): Effect.Effect<void, never, any> =>
    Effect.forEach(this.resumeHandlers, (eff) => eff, { discard: true })

  readonly emitReset = (): Effect.Effect<void, never, any> =>
    Effect.forEach(this.resetHandlers, (eff) => eff, { discard: true })
}

describe('Platform signals (no handlers)', () => {
  it.scoped(
    'should be safe no-op and not emit error noise',
    () =>
      Effect.gen(function* () {
        const { events, sink } = makeEventCollectorSink()

        const TestModule = Logix.Module.make('PlatformSignals.NoHandler', {
          state: Schema.Struct({ count: Schema.Number }),
          actions: {},
        })

        const logic = TestModule.logic(() => ({
          setup: Effect.void,
          run: Effect.void,
        }))

        const baseLayer = TestModule.live({ count: 0 }, logic) as unknown as Layer.Layer<
          Logix.ModuleRuntime<any, any>,
          never,
          never
        >

        const platform = new TestPlatform()
        const platformLayer = Layer.succeed(Logix.Platform.tag, platform)
        const layer = Layer.provideMerge(baseLayer, platformLayer) as unknown as Layer.Layer<
          Logix.ModuleRuntime<any, any>,
          never,
          never
        >

        yield* Effect.locally(Debug.internal.currentDebugSinks, [sink])(
          Effect.gen(function* () {
            const runtime = yield* TestModule.tag
            expect((yield* runtime.lifecycleStatus!).status).toBe('ready')

            yield* platform.emitSuspend()
            yield* platform.emitResume()
            yield* platform.emitReset()

            expect((yield* runtime.lifecycleStatus!).status).toBe('ready')
          }).pipe(Effect.provide(layer)),
        )

        const errorLike = events.filter(
          (e) => e.type === 'lifecycle:error' || (e.type === 'diagnostic' && e.severity === 'error'),
        )
        expect(errorLike).toEqual([])
      }) as any,
  )
})
