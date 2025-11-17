import { describe } from 'vitest'
import { it, expect, vi } from '@effect/vitest'
import { Cause, Effect, Layer, ManagedRuntime, Schema } from 'effect'
import * as Logix from '../../../src/index.js'

const TestModule = Logix.Module.make('LifecycleTest', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    triggerError: Schema.Void,
    triggerFlowError: Schema.Void,
  },
})

describe('Lifecycle hooks (Bound.lifecycle)', () => {
  it('should capture onInit error with context', async () => {
    const errorSpy = vi.fn()

    const logic = TestModule.logic(($) => ({
      setup: Effect.gen(function* () {
        yield* $.lifecycle.onError((cause, context) =>
          Effect.sync(() => {
            errorSpy(Cause.pretty(cause), context)
          }),
        )

        yield* $.lifecycle.onInitRequired(Effect.die(new Error('Init Failed')))
      }),
      run: Effect.void,
    }))

    const layer = TestModule.live({ count: 0 }, logic) as Layer.Layer<Logix.ModuleRuntime<any, any>, never, never>

    const runtime = ManagedRuntime.make(layer)
    await runtime.runPromise(Effect.void).catch(() => undefined)

    expect(errorSpy).toHaveBeenCalled()
    const [causeStr, context] = errorSpy.mock.calls[0]
    expect(String(causeStr)).toContain('Init Failed')
    expect(context).toMatchObject({
      phase: 'init',
      hook: 'initRequired',
      moduleId: 'LifecycleTest',
      origin: 'initRequired',
    })
    expect(typeof (context as any).instanceId).toBe('string')
  })

  it('should capture Flow error with context', async () => {
    const errorSpy = vi.fn()

    const logic = TestModule.logic(($) => ({
      setup: $.lifecycle.onError((cause, context) =>
        Effect.sync(() => {
          errorSpy(Cause.pretty(cause), context)
        }),
      ),
      run: Effect.gen(function* () {
        yield* $.onAction((a): a is Logix.ActionOf<typeof TestModule.shape> => a._tag === 'triggerFlowError').run(() =>
          Effect.die(new Error('Flow Failed')),
        )
      }),
    }))

    const layer = TestModule.live({ count: 0 }, logic) as Layer.Layer<Logix.ModuleRuntime<any, any>, never, never>

    const runtime = ManagedRuntime.make(layer)

    await runtime.runPromise(
      Effect.gen(function* () {
        const moduleRuntime = yield* TestModule.tag
        yield* Effect.sleep('10 millis')
        yield* moduleRuntime.dispatch({
          _tag: 'triggerFlowError',
          payload: undefined,
        })
        yield* Effect.sleep('50 millis')
      }),
    )

    expect(errorSpy).toHaveBeenCalled()
    const [causeStr, context] = errorSpy.mock.calls[0]
    expect(String(causeStr)).toContain('Flow Failed')
    expect(context).toMatchObject({
      phase: 'run',
      hook: 'unknown',
      moduleId: 'LifecycleTest',
      origin: 'logic.fork',
    })
  })
})
