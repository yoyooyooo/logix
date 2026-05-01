import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import * as Lifecycle from '../src/internal/runtime/core/Lifecycle.js'
import * as Platform from '../src/internal/runtime/core/Platform.js'

class TestPlatform implements Platform.Service {
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

describe('Platform signals', () => {
  it.effect(
    'should trigger internal runtime-owned handlers via emit*',
    () =>
      Effect.gen(function* () {
        const calls: Array<string> = []
        const lifecycle = yield* Lifecycle.makeLifecycleManager({
          moduleId: 'PlatformSignals',
          instanceId: 'platform-signals',
        })

        const platform = new TestPlatform()
        const platformLayer = Layer.succeed(Platform.Tag, platform)

        yield* Effect.gen(function* () {
          yield* platform.lifecycle.onSuspend(Effect.sync(() => calls.push('suspend')))
          yield* platform.lifecycle.onResume(Effect.sync(() => calls.push('resume')))
          yield* platform.lifecycle.onReset(Effect.sync(() => calls.push('reset')))
          yield* platform.emitSuspend()
          yield* platform.emitResume()
          yield* platform.emitReset()
          yield* lifecycle.setStatus('ready')
        }).pipe(Effect.provide(platformLayer))

        expect(calls).toEqual(['suspend', 'resume', 'reset'])
        expect((yield* lifecycle.getStatus).status).toBe('ready')
      }) as any,
  )
})
