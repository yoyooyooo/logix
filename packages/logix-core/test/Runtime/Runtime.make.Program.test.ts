import { describe, it, expect } from 'vitest'
import { Effect, Layer, Schema, ServiceMap } from 'effect'
import * as Logix from '../../src/index.js'

describe('Program.make(Module)', () => {
  it('should construct a program from Module and feed Runtime.make', async () => {
    const Counter = Logix.Module.make('RuntimeMakeProgramCounter', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { noop: Schema.Void },
    })

    const CounterProgram = Logix.Program.make(Counter, {
      initial: { count: 1 },
      logics: [],
    })

    const runtime = Logix.Runtime.make(CounterProgram, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    const readCount = Effect.gen(function* () {
      const rt = yield* Effect.service(Counter.tag).pipe(Effect.orDie)
      return (yield* rt.getState).count
    }) as Effect.Effect<number, never, any>

    try {
      expect(await runtime.runPromise(readCount)).toBe(1)
    } finally {
      await runtime.dispose()
    }
  })

  it('should canonicalize capabilities.services and capabilities.imports through Program.make', async () => {
    class GreetingService extends ServiceMap.Service<GreetingService, { readonly greet: Effect.Effect<string> }>()(
      'RuntimeMakeProgramGreetingService',
    ) {}

    const Child = Logix.Module.make('RuntimeMakeProgramCapabilitiesChild', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { noop: Schema.Void },
    })

    const Root = Logix.Module.make('RuntimeMakeProgramCapabilitiesRoot', {
      state: Schema.Void,
      actions: {},
    })

    const ChildProgram = Logix.Program.make(Child, {
      initial: { count: 2 },
    })

    const RootProgram = Logix.Program.make(Root, {
      initial: undefined,
      capabilities: {
        services: Layer.succeed(GreetingService, {
          greet: Effect.succeed('hi'),
        }),
        imports: [ChildProgram],
      },
    })

    const runtime = Logix.Runtime.make(RootProgram)

    try {
      const result = await runtime.runPromise(
        Effect.gen(function* () {
          const service = yield* Effect.service(GreetingService)
          const childRuntime = yield* Effect.service(Child.tag).pipe(Effect.orDie)
          return {
            greeting: yield* service.greet,
            count: (yield* childRuntime.getState).count,
          }
        }),
      )

      expect(result).toEqual({ greeting: 'hi', count: 2 })
    } finally {
      await runtime.dispose()
    }
  })

  it('should compose service arrays and imported child programs through capabilities', async () => {
    class GreetingService extends ServiceMap.Service<GreetingService, { readonly greet: Effect.Effect<string> }>()(
      'RuntimeMakeProgramGreetingServiceArray',
    ) {}

    class NumberService extends ServiceMap.Service<NumberService, { readonly value: number }>()('RuntimeMakeProgramNumberServiceArray') {}

    const ChildA = Logix.Module.make('RuntimeMakeProgramCapabilitiesChildA', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { noop: Schema.Void },
    })

    const ChildB = Logix.Module.make('RuntimeMakeProgramCapabilitiesChildB', {
      state: Schema.Struct({ total: Schema.Number }),
      actions: { noop: Schema.Void },
    })

    const Root = Logix.Module.make('RuntimeMakeProgramCapabilitiesMergeRoot', {
      state: Schema.Void,
      actions: {},
    })

    const childAProgram = Logix.Program.make(ChildA, {
      initial: { count: 2 },
    })

    const childBProgram = Logix.Program.make(ChildB, {
      initial: { total: 7 },
    })

    const rootProgram = Logix.Program.make(Root, {
      initial: undefined,
      capabilities: {
        services: [
          Layer.succeed(GreetingService, {
            greet: Effect.succeed('hi'),
          }),
          Layer.succeed(NumberService, {
            value: 42,
          }),
        ],
        imports: [childAProgram, childBProgram],
      },
    })

    const runtime = Logix.Runtime.make(rootProgram)

    try {
      const result = await runtime.runPromise(
        Effect.gen(function* () {
          const greeting = yield* Effect.service(GreetingService)
          const number = yield* Effect.service(NumberService)
          const childA = yield* Effect.service(ChildA.tag).pipe(Effect.orDie)
          const childB = yield* Effect.service(ChildB.tag).pipe(Effect.orDie)

          return {
            greeting: yield* greeting.greet,
            value: number.value,
            count: (yield* childA.getState).count,
            total: (yield* childB.getState).total,
          }
        }),
      )

      expect(result).toEqual({ greeting: 'hi', value: 42, count: 2, total: 7 })
    } finally {
      await runtime.dispose()
    }
  })

  it('should ignore removed capabilities.roots and continue using canonical capabilities only', async () => {
    const Root = Logix.Module.make('RuntimeMakeProgramCapabilitiesRoots', {
      state: Schema.Void,
      actions: {},
    })

    const program = Logix.Program.make(Root, {
      initial: undefined,
      capabilities: {
        roots: [] as never,
      } as any,
      logics: [],
    })

    const runtime = Logix.Runtime.make(program)
    try {
      const state = await runtime.runPromise(Effect.gen(function* () {
        const root = yield* Effect.service(Root.tag).pipe(Effect.orDie)
        return yield* root.getState
      }) as any)
      expect(state).toBeUndefined()
    } finally {
      await runtime.dispose()
    }
  })
})
