import { describe, it, expect } from 'vitest'
import { Effect, Layer, ManagedRuntime, Schema } from 'effect'
import * as Logix from '@logix/core'
import { ReactPlatformLayer } from '../../src/Platform.js'

describe('ReactPlatformLayer lifecycle integration', () => {
  const LifecycleModule = Logix.Module.make('LifecycleModule', {
    state: Schema.Struct({
      suspendCount: Schema.Number,
      resumeCount: Schema.Number,
    }),
    actions: {},
  })

  it('should trigger $.lifecycle.onSuspend/onResume via ReactPlatformLayer emit* helpers', async () => {
    const logic = LifecycleModule.logic(($) => ({
      setup: Effect.gen(function* () {
        yield* $.lifecycle.onSuspend(
          $.state.update((s) => ({
            ...s,
            suspendCount: s.suspendCount + 1,
          })),
        )

        yield* $.lifecycle.onResume(
          $.state.update((s) => ({
            ...s,
            resumeCount: s.resumeCount + 1,
          })),
        )
      }),
      run: Effect.void,
    }))

    const moduleLayer = LifecycleModule.live({ suspendCount: 0, resumeCount: 0 }, logic)

    const layer = Layer.provideMerge(moduleLayer, ReactPlatformLayer) as Layer.Layer<any, never, never>

    const runtime = ManagedRuntime.make(layer)

    // 先确保 ModuleRuntime 与 Logic 已经启动并完成 lifecycle hook 注册，
    // 再通过 ReactPlatformLayer 的 emit* 触发平台级生命周期。
    const program = Effect.gen(function* () {
      yield* LifecycleModule.tag

      const platform = yield* Logix.Platform.tag
      yield* platform.emitSuspend()
      yield* platform.emitResume()
    })

    await runtime.runPromise(
      program as Effect.Effect<
        void,
        unknown,
        | Logix.ModuleRuntime<{ readonly suspendCount: number; readonly resumeCount: number }, never>
        | Logix.Logic.Platform
      >,
    )

    const finalState = await runtime.runPromise(
      Effect.gen(function* () {
        const module = yield* LifecycleModule.tag
        return yield* module.getState
      }),
    )

    expect(finalState.suspendCount).toBe(1)
    expect(finalState.resumeCount).toBe(1)
  })
})
