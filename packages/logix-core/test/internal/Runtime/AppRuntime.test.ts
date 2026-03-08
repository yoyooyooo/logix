import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Deferred, Effect, Layer, Schema, Logger, ServiceMap } from 'effect'
import * as Logix from '../../../src/index.js'
import * as AppRuntimeImpl from '../../../src/internal/runtime/AppRuntime.js'

describe('AppRuntime.makeApp (via internal runtime config)', () => {
  class ServiceTag extends ServiceMap.Service<ServiceTag, { readonly id: string }>()('Service') {}

  const makeTestModule = (id: string) =>
    Logix.Module.make(id, {
      state: Schema.Struct({ value: Schema.Number }),
      actions: {
        inc: Schema.Void,
      },
    })

  it('fails when two AppModuleEntry share the same Module id', () => {
    const Mod = makeTestModule('Dup')
    const live = Mod.live({ value: 0 })

    const config: AppRuntimeImpl.LogixAppConfig<never> = {
      layer: Layer.empty as Layer.Layer<never, never, never>,
      modules: [AppRuntimeImpl.provide(Mod.tag, live), AppRuntimeImpl.provide(Mod.tag, live)],
      processes: [],
    }

    expect(() => AppRuntimeImpl.makeApp(config)).toThrowError(/\[Logix\] Duplicate Module ID\/Tag detected: "Dup"/)
  })

  it('fails fast on Tag collision when the same ServiceTag is owned by multiple modules', () => {
    const ModA = makeTestModule('A')
    const ModB = makeTestModule('B')

    const liveA = ModA.live({ value: 1 })
    const liveB = ModB.live({ value: 2 })

    const config: AppRuntimeImpl.LogixAppConfig<never> = {
      layer: Layer.empty as Layer.Layer<never, never, never>,
      modules: [
        AppRuntimeImpl.provideWithTags(ModA.tag, liveA, [ServiceTag]),
        AppRuntimeImpl.provideWithTags(ModB.tag, liveB, [ServiceTag]),
      ],
      processes: [],
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      AppRuntimeImpl.makeApp(config)
      throw new Error('expected TagCollisionError, but makeApp succeeded')
    } catch (error: any) {
      expect(error).toBeInstanceOf(Error)
      expect(String(error.message)).toMatch(/Tag collision detected/)
      expect(error._tag).toBe('TagCollisionError')
      expect(Array.isArray(error.collisions)).toBe(true)
      const owners = new Set(error.collisions.flatMap((c: any) => c.conflicts.map((i: any) => i.ownerModuleId)))
      expect(owners.has('A')).toBe(true)
      expect(owners.has('B')).toBe(true)
    }
  })

  it('builds runtime from Root ModuleImpl and runs processes via Runtime.make', async () => {
    const CounterState = Schema.Struct({ count: Schema.Number })
    const CounterActions = {
      inc: Schema.Void,
    }

    const CounterModule = Logix.Module.make('AppCounter', {
      state: CounterState,
      actions: CounterActions,
    })

    const CounterImpl = CounterModule.implement({
      initial: { count: 0 },
    })

    const RootModule = Logix.Module.make('AppRoot', {
      state: Schema.Void,
      actions: {},
    })

    let processRan = false
    const processStarted = await Effect.runPromise(Deferred.make<void>())

    const RootImpl = RootModule.implement({
      initial: undefined,
      imports: [CounterImpl.impl],
      processes: [
        Effect.sync(() => {
          processRan = true
        }).pipe(Effect.andThen(Deferred.succeed(processStarted, undefined))),
      ],
    })

    const runtime = Logix.Runtime.make(RootImpl, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    const program: Effect.Effect<void, never, any> = Effect.gen(function* () {
      const counterRuntime = yield* Effect.service(CounterModule.tag).pipe(Effect.orDie)
      const state = yield* counterRuntime.getState
      expect(state).toEqual({ count: 0 })
      yield* Deferred.await(processStarted)
    })

    await runtime.runPromise(program)
    expect(processRan).toBe(true)
  })

  it('regression: should preserve FiberRefs (e.g. Logger) when constructing Runtime', async () => {
    // 1) Define a test Logger that collects all log messages.
    const logs: Array<string> = []
    const testLogger = Logger.make(({ message }) => {
      logs.push(String(message))
    })

    const loggerLayer = Layer.mergeAll(
      Logger.layer([testLogger]),
      Logix.Debug.noopLayer,
    ) as Layer.Layer<any, never, never>

    // 3) Build a minimal Root module.
    const RootModule = Logix.Module.make('Root', {
      state: Schema.Void,
      actions: {},
    })
    const RootImpl = RootModule.implement({ initial: undefined })

    // 4) Construct the runtime via Logix.Runtime.make.
    //    Runtime.make also merges Debug.defaultLayer internally.
    const runtime = Logix.Runtime.make(RootImpl, {
      layer: loggerLayer,
    })

    // 5) Run an Effect that logs.
    await runtime.runPromise(Effect.log('hello world'))

    // 6) Verify the custom Logger received the log message.
    expect(logs).toEqual(['hello world'])
  })
})
