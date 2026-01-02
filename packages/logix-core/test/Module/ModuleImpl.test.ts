import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Context, Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

/**
 * ModuleImpl / withLayer / provide(ModuleImpl) behavior checks:
 * - `ModuleDef.implement({ initial, logics })` returns a `Module` whose `.impl` (ModuleImpl) should support `withLayer`
 *   to inject extra dependencies.
 * - `Logix.provide(ModuleImpl)` should be equivalent to explicitly providing the module + layer.
 */

const ServiceTag = Context.GenericTag<{ label: string }>('@logix/test/Service')

const Consumer = Logix.Module.make('ModuleImplConsumer', {
  state: Schema.Struct({
    seen: Schema.String,
  }),
  actions: {
    read: Schema.Void,
  },
})

const consumerLogic = Consumer.logic<{ label: string }>(($) =>
  Effect.gen(function* () {
    const svc = yield* ServiceTag

    yield* $.onAction('read').run(() =>
      $.state.update((s) => ({
        ...s,
        seen: svc.label,
      })),
    )
  }),
)

describe('ModuleImpl (public API)', () => {
  it('withLayer should inject extra dependencies into ModuleImpl.layer', async () => {
    const impl = Consumer.implement({
      initial: { seen: '' },
      logics: [consumerLogic],
    }).impl

    const implWithLayer = impl.withLayer(
      Layer.succeed(ServiceTag as unknown as Context.Tag<any, { label: string }>, {
        label: 'hello',
      }),
    )

    const events: Logix.Debug.Event[] = []
    const debugLayer = Logix.Debug.replace([
      {
        record: (event: Logix.Debug.Event) =>
          Effect.sync(() => {
            events.push(event)
            if (event.type === 'lifecycle:error') {
              // Print the error cause in test output to make debugging easier.
              // eslint-disable-next-line no-console
              console.error('[ModuleImpl lifecycle:error]', event.cause)
            }
          }),
      },
    ])

    const program = Effect.gen(function* () {
      const context = yield* implWithLayer.layer.pipe(Layer.build)
      const runtime = Context.get(context, Consumer.tag)

      // Ensure the Service is correctly injected into the Context via withLayer.
      const svc = Context.get(context, ServiceTag as unknown as Context.Tag<any, { label: string }>)
      expect(svc.label).toBe('hello')

      expect(yield* runtime.getState).toEqual({ seen: '' })

      yield* runtime.dispatch({ _tag: 'read', payload: undefined })
      // Wait for watchers to process the action.
      yield* Effect.sleep(20)

      expect(yield* runtime.getState).toEqual({ seen: 'hello' })
    })

    await Effect.runPromise(
      Effect.scoped(program).pipe(Effect.provide(debugLayer)) as Effect.Effect<void, never, never>,
    )

    // Ensure there are no lifecycle errors during logic execution.
    expect(events.find((e) => e.type === 'lifecycle:error')).toBeUndefined()
  })

  it('ModuleDef.implement(imports) should inject service layers into ModuleImpl.layer', async () => {
    const impl = Consumer.implement({
      initial: { seen: '' },
      logics: [consumerLogic],
      imports: [Layer.succeed(ServiceTag as unknown as Context.Tag<any, { label: string }>, { label: 'from-import' })],
    }).impl

    const program = Effect.gen(function* () {
      const context = yield* impl.layer.pipe(Layer.build)
      const runtime = Context.get(context, Consumer.tag)

      // The ServiceTag provided by imports should be visible in the Context.
      const svc = Context.get(context, ServiceTag as unknown as Context.Tag<any, { label: string }>)
      expect(svc.label).toBe('from-import')

      expect(yield* runtime.getState).toEqual({ seen: '' })

      yield* runtime.dispatch({ _tag: 'read', payload: undefined })
      yield* Effect.sleep(20)

      expect(yield* runtime.getState).toEqual({ seen: 'from-import' })
    })

    await Effect.runPromise(Effect.scoped(program) as Effect.Effect<void, never, never>)
  })

  it('ModuleDef.implement(imports) should allow importing other ModuleImpl layers', async () => {
    // Define a minimal dependency module to validate imports: [ModuleImpl] behavior.
    const Dep = Logix.Module.make('DepModule', {
      state: Schema.Struct({ value: Schema.String }),
      actions: {},
    })

    const depImpl = Dep.implement({
      initial: { value: 'dep-initial' },
      logics: [],
    }).impl

    const impl = Consumer.implement({
      initial: { seen: '' },
      logics: [consumerLogic],
      imports: [depImpl],
    }).impl

    const program = Effect.gen(function* () {
      const context = yield* impl.layer.pipe(Layer.build)
      const runtime = Context.get(context, Consumer.tag)

      // Dep's ModuleRuntime should already be attached to the Context.
      const depRuntime = Context.get(context, Dep.tag)
      expect(yield* depRuntime.getState).toEqual({ value: 'dep-initial' })

      // ServiceTag can still be layered via withLayer/withLayers; this only verifies imports don't break the main module.
      expect(yield* runtime.getState).toEqual({ seen: '' })
    })

    await Effect.runPromise(Effect.scoped(program) as Effect.Effect<void, never, never>)
  })
})
