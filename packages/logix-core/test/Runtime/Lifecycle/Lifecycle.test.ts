import { describe } from '@effect/vitest'
import { it, expect, vi } from '@effect/vitest'
import { Cause, Effect, Layer, Schema } from 'effect'
import * as Debug from '../../../src/internal/debug-api.js'
import * as Logix from '../../../src/index.js'
import type { ActionOf } from '../../../src/Module.js'
import * as LifecycleCore from '../../../src/internal/runtime/core/Lifecycle.js'

const TestModule = Logix.Module.make('LifecycleTest', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    triggerError: Schema.Void,
    triggerFlowError: Schema.Void,
  },
})

describe('Lifecycle runtime substrate', () => {
  it('should capture onInit error with context', async () => {
    const errorSpy = vi.fn()

    const manager = await Effect.runPromise(
      LifecycleCore.makeLifecycleManager({
        moduleId: 'LifecycleTest',
        instanceId: 'lifecycle-test-init',
      }),
    )

    manager.registerOnError((cause, context) =>
      Effect.sync(() => {
        errorSpy(Cause.pretty(cause), context)
      }),
    )
    manager.registerInitRequired(Effect.die(new Error('Init Failed')), { name: 'init-failed' })
    await Effect.runPromise(Effect.exit(manager.runInitRequired) as Effect.Effect<unknown, never, never>)

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
    const events: Debug.Event[] = []
    const sink: Debug.Sink = {
      record: (event) =>
        Effect.sync(() => {
          events.push(event)
        }),
    }

    const logic = TestModule.logic('test-module-logic-2', ($) =>
      Effect.gen(function* () {
        yield* $.onAction((a): a is ActionOf<typeof TestModule.shape> => a._tag === 'triggerFlowError').run(() =>
          Effect.die(new Error('Flow Failed')),
        )
      }),
    )

    const program = Logix.Program.make(TestModule, {
      initial: { count: 0 },
      logics: [logic],
    })

    const runtime = Logix.Runtime.make(program, {
      layer: Debug.replace([sink]) as Layer.Layer<any, never, never>,
    })

    await runtime.runPromise(
      Effect.gen(function* () {
        const moduleRuntime = yield* Effect.service(TestModule.tag).pipe(Effect.orDie)
        yield* Effect.sleep('10 millis')
        yield* moduleRuntime.dispatch({
          _tag: 'triggerFlowError',
          payload: undefined,
        })
        yield* Effect.sleep('50 millis')
      }),
    )
    await runtime.dispose()

    const lifecycleError = events.find((event) => event.type === 'lifecycle:error') as
      | Extract<Debug.Event, { type: 'lifecycle:error' }>
      | undefined
    expect(lifecycleError).toBeDefined()
    expect(Cause.pretty(lifecycleError?.cause as Cause.Cause<unknown>)).toContain('Flow Failed')
    expect(lifecycleError).toMatchObject({
      phase: 'run',
      hook: 'unknown',
      moduleId: 'LifecycleTest',
      origin: 'logic.fork',
    })
  })
})
