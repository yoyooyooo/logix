import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema, ServiceMap } from 'effect'
import * as Logix from '../../src/index.js'
import * as RuntimeContracts from '../../src/internal/runtime-contracts.js'

/**
 * Repo-internal ProgramRuntimeBlueprint behavior checks:
 * - `Program.make(Module, { initial, logics })` stores an internal runtime blueprint that supports `withLayer`.
 * - `Program.make(Module, { capabilities })` layers services and other Program runtimes into the internal runtime blueprint layer.
 */

const ServiceTag = ServiceMap.Service<{ label: string }>('@logixjs/test/Service')

const Consumer = Logix.Module.make('ProgramRuntimeBlueprintConsumer', {
  state: Schema.Struct({
    seen: Schema.String,
  }),
  actions: {
    read: Schema.Void,
  },
})

const consumerLogic = Consumer.logic<{ label: string }>('consumer-logic', ($) =>
  Effect.gen(function* () {
    const svc = yield* Effect.service(ServiceTag).pipe(Effect.orDie)

    yield* $.onAction('read').run(() =>
      $.state.update((s) => ({
        ...s,
        seen: svc.label,
      })),
    )
  }),
)

describe('Program runtime blueprint', () => {
  it('withLayer should inject extra dependencies into ProgramRuntimeBlueprint.layer', async () => {
    const consumerProgram = Logix.Program.make(Consumer, {
      initial: { seen: '' },
      logics: [consumerLogic],
    })
    const blueprint = RuntimeContracts.getProgramRuntimeBlueprint(consumerProgram)

    const blueprintWithLayer = blueprint.withLayer(
      Layer.succeed(ServiceTag, {
        label: 'hello',
      }),
    )

    const events: CoreDebug.Event[] = []
    const debugLayer = CoreDebug.replace([
      {
        record: (event: CoreDebug.Event) =>
          Effect.sync(() => {
            events.push(event)
            if (event.type === 'lifecycle:error') {
              // Print the error cause in test output to make debugging easier.
              // eslint-disable-next-line no-console
              console.error('[ProgramRuntimeBlueprint lifecycle:error]', event.cause)
            }
          }),
      },
    ])

    const program = Effect.gen(function* () {
      const context = yield* blueprintWithLayer.layer.pipe(Layer.build)
      const runtime = ServiceMap.get(context, Consumer.tag)

      // Ensure the Service is correctly injected into the Context via withLayer.
      const svc = ServiceMap.get(context as ServiceMap.ServiceMap<any>, ServiceTag as any) as { label: string }
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

  it('Program.make(capabilities.services) should inject service layers into ProgramRuntimeBlueprint.layer', async () => {
    const consumerProgram = Logix.Program.make(Consumer, {
      initial: { seen: '' },
      logics: [consumerLogic],
      capabilities: {
        services: [Layer.succeed(ServiceTag, { label: 'from-service' })],
      },
    })
    const blueprint = RuntimeContracts.getProgramRuntimeBlueprint(consumerProgram)

    const program = Effect.gen(function* () {
      const context = yield* blueprint.layer.pipe(Layer.build)
      const runtime = ServiceMap.get(context, Consumer.tag)

      // The ServiceTag provided by capabilities.services should be visible in the Context.
      const svc = ServiceMap.get(context as ServiceMap.ServiceMap<any>, ServiceTag as any) as { label: string }
      expect(svc.label).toBe('from-service')

      expect(yield* runtime.getState).toEqual({ seen: '' })

      yield* runtime.dispatch({ _tag: 'read', payload: undefined })
      yield* Effect.sleep(20)

      expect(yield* runtime.getState).toEqual({ seen: 'from-service' })
    })

    await Effect.runPromise(Effect.scoped(program) as Effect.Effect<void, never, never>)
  })

  it('Program.make(imports) should allow importing other Program layers into the runtime blueprint', async () => {
    // Define a minimal dependency module to validate imports: [Program] behavior.
    const Dep = Logix.Module.make('DepModule', {
      state: Schema.Struct({ value: Schema.String }),
      actions: {},
    })

    const depProgram = Logix.Program.make(Dep, {
      initial: { value: 'dep-initial' },
      logics: [],
    })

    const consumerProgram = Logix.Program.make(Consumer, {
      initial: { seen: '' },
      logics: [consumerLogic],
      capabilities: {
        imports: [depProgram],
      },
    })
    const blueprint = RuntimeContracts.getProgramRuntimeBlueprint(consumerProgram)

    const program = Effect.gen(function* () {
      const context = yield* blueprint.layer.pipe(Layer.build)
      const runtime = ServiceMap.get(context, Consumer.tag)

      // Dep's ModuleRuntime should already be attached to the Context.
      const depRuntime = ServiceMap.get(context, Dep.tag)
      expect(yield* depRuntime.getState).toEqual({ value: 'dep-initial' })

      // ServiceTag can still be layered via withLayer/withLayers; this only verifies imports don't break the main module.
      expect(yield* runtime.getState).toEqual({ seen: '' })
    })

    await Effect.runPromise(Effect.scoped(program) as Effect.Effect<void, never, never>)
  })
})
