import { describe } from 'vitest'
import { it, expect, vi } from '@effect/vitest'
import { Cause, Deferred, Effect, FiberId, Layer, ManagedRuntime, Schema, Stream } from 'effect'
import * as Debug from '../src/Debug.js'
import * as Logix from '../src/index.js'

type IsAny<T> = 0 extends 1 & T ? true : false
type Expect<T extends true> = T

const CounterState = Schema.Struct({ count: Schema.Number })
const CounterActions = { inc: Schema.Void }

const CounterModule = Logix.Module.make('CoreCounter', {
  state: CounterState,
  actions: CounterActions,
})

describe('Module.make (public API)', () => {
  it('should create a Module with state/actions shape', () => {
    // The module itself is a Tag and can be used as a Service.
    expect(CounterModule.id).toBe('CoreCounter')
    expect(typeof CounterModule.implement).toBe('function')
    expect(typeof CounterModule.logic).toBe('function')
  })

  it.scoped('should build ModuleImpl and access runtime via Tag', () =>
    Effect.gen(function* () {
      // Build initial state via ModuleImpl.
      const impl = CounterModule.implement({
        initial: { count: 1 },
      })

      // Build an app-level Runtime via Runtime.make (no extra Layer injected here).
      const runtime = Logix.Runtime.make(impl, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      // Access ModuleRuntime via Tag inside an Effect and read state.
      const program = Effect.gen(function* () {
        const moduleRuntime = yield* CounterModule.tag
        const state = yield* moduleRuntime.getState
        expect(state).toEqual({ count: 1 })
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  it('should apply primary reducers defined via Module.Reducer.mutate', async () => {
    const ReducerState = Schema.Struct({ count: Schema.Number })
    const ReducerActions = {
      inc: Schema.Void,
      add: Schema.Number,
    }

    const ReducerModule = Logix.Module.make('ReducerCounter', {
      state: ReducerState,
      actions: ReducerActions,
      reducers: {
        inc: Logix.Module.Reducer.mutate((draft) => {
          draft.count += 1
        }),
        add: Logix.Module.Reducer.mutate((draft, payload) => {
          draft.count += payload
        }),
      },
    })

    const program = Effect.gen(function* () {
      const runtime = yield* ReducerModule.tag

      expect(yield* runtime.getState).toEqual({ count: 0 })

      yield* runtime.dispatch({ _tag: 'inc', payload: undefined })
      yield* runtime.dispatch({ _tag: 'add', payload: 3 })

      const state = yield* runtime.getState
      expect(state.count).toBe(4)
    }).pipe(Effect.provide(ReducerModule.live({ count: 0 })))

    await Effect.runPromise(Effect.scoped(program) as Effect.Effect<void, never, never>)
  })

  it('should apply primary reducers defined via Module.Reducer.mutateMap', async () => {
    const ReducerState = Schema.Struct({ count: Schema.Number })
    const ReducerActions = {
      inc: Schema.Void,
      add: Schema.Number,
    }

    const ReducerModule = Logix.Module.make('ReducerCounterMutateMap', {
      state: ReducerState,
      actions: ReducerActions,
      reducers: Logix.Module.Reducer.mutateMap({
        inc: (draft) => {
          draft.count += 1
        },
        add: (draft, payload) => {
          draft.count += payload
        },
      }),
    })

    const program = Effect.gen(function* () {
      const runtime = yield* ReducerModule.tag

      expect(yield* runtime.getState).toEqual({ count: 0 })

      yield* runtime.dispatch({ _tag: 'inc', payload: undefined })
      yield* runtime.dispatch({ _tag: 'add', payload: 3 })

      const state = yield* runtime.getState
      expect(state.count).toBe(4)
    }).pipe(Effect.provide(ReducerModule.live({ count: 0 })))

    await Effect.runPromise(Effect.scoped(program) as Effect.Effect<void, never, never>)
  })

  it('should apply primary reducers defined via Module.make({ immerReducers })', async () => {
    const ReducerState = Schema.Struct({ count: Schema.Number })
    const ReducerActions = {
      inc: Schema.Void,
      add: Schema.Number,
    }

    const ReducerModule = Logix.Module.make('ReducerCounterImmerReducers', {
      state: ReducerState,
      actions: ReducerActions,
      immerReducers: {
        inc: (draft, _payload) => {
          type _DraftNotAny = Expect<IsAny<typeof draft> extends true ? false : true>
          type _PayloadNotAny = Expect<IsAny<typeof _payload> extends true ? false : true>
          draft.count += 1
        },
        add: (draft, payload) => {
          type _PayloadNotAny = Expect<IsAny<typeof payload> extends true ? false : true>
          draft.count += payload
        },
      },
    })

    const program = Effect.gen(function* () {
      const runtime = yield* ReducerModule.tag

      expect(yield* runtime.getState).toEqual({ count: 0 })

      yield* runtime.dispatch({ _tag: 'inc', payload: undefined })
      yield* runtime.dispatch({ _tag: 'add', payload: 3 })

      const state = yield* runtime.getState
      expect(state.count).toBe(4)
    }).pipe(Effect.provide(ReducerModule.live({ count: 0 })))

    await Effect.runPromise(Effect.scoped(program) as Effect.Effect<void, never, never>)
  })

  it('should merge immerReducers and reducers (reducers override same key)', async () => {
    const ReducerState = Schema.Struct({ count: Schema.Number })
    const ReducerActions = {
      reset: Schema.Void,
    }

    const ReducerModule = Logix.Module.make('ReducerCounterImmerReducersOverride', {
      state: ReducerState,
      actions: ReducerActions,
      immerReducers: {
        reset: (draft) => {
          draft.count = 1
        },
      },
      reducers: {
        reset: (state, action) => {
          type _StateNotAny = Expect<IsAny<typeof state> extends true ? false : true>
          type _ActionNotAny = Expect<IsAny<typeof action> extends true ? false : true>
          return { ...state, count: 0 }
        },
      },
    })

    const program = Effect.gen(function* () {
      const runtime = yield* ReducerModule.tag

      expect(yield* runtime.getState).toEqual({ count: 5 })

      yield* runtime.dispatch({ _tag: 'reset', payload: undefined })
      expect(yield* runtime.getState).toEqual({ count: 0 })
    }).pipe(Effect.provide(ReducerModule.live({ count: 5 })))

    await Effect.runPromise(Effect.scoped(program) as Effect.Effect<void, never, never>)
  })

  it('should register primary reducer via $.reducer before dispatch', async () => {
    const reducerApplied = Deferred.unsafeMake<void>(FiberId.none)

    const ModuleWithReducer = Logix.Module.make('RuntimeReducerModule', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { inc: Schema.Void },
    })

    const logic = ModuleWithReducer.logic(($) =>
      Effect.gen(function* () {
        yield* $.reducer(
          'inc',
          Logix.Module.Reducer.mutate((draft) => {
            draft.count += 1
          }),
        )
        // Dispatch once inside Logic to verify the reducer applies synchronously before watchers.
        yield* $.dispatchers.inc()
        yield* Deferred.succeed(reducerApplied, undefined)
      }),
    )

    const layer = ModuleWithReducer.live({ count: 0 }, logic) as Layer.Layer<
      Logix.ModuleRuntime<any, any>,
      never,
      never
    >
    const runtimeManager = ManagedRuntime.make(layer)

    const program = Effect.gen(function* () {
      const runtime = yield* ModuleWithReducer.tag
      yield* Deferred.await(reducerApplied)
      expect(yield* runtime.getState).toEqual({ count: 1 })
    })

    await runtimeManager.runPromise(program as Effect.Effect<void, never, any>)
  })

  it('should report error when registering primary reducer twice for the same tag', async () => {
    const errorSpy = vi.fn()

    const errorSeen = Deferred.unsafeMake<void>(FiberId.none)

    const ModuleWithReducer = Logix.Module.make('DuplicateReducerModule', {
      state: Schema.Struct({ value: Schema.Number }),
      actions: {
        set: Schema.Number,
      },
    })

    const logic = ModuleWithReducer.logic(($) => ({
      setup: $.lifecycle.onError((cause, context) =>
        Effect.sync(() => {
          errorSpy(Cause.pretty(cause), context)
        }).pipe(Effect.zipRight(Deferred.succeed(errorSeen, undefined))),
      ),
      run: Effect.gen(function* () {
        yield* $.reducer(
          'set',
          Logix.Module.Reducer.mutate((draft, payload: number) => {
            draft.value = payload
          }),
        )

        // Registering a primary reducer twice for the same tag should trigger a Duplicate error.
        yield* $.reducer(
          'set',
          Logix.Module.Reducer.mutate((draft, payload: number) => {
            draft.value = payload + 1
          }),
        )
      }),
    }))

    const layer = ModuleWithReducer.live({ value: 0 }, logic) as Layer.Layer<
      Logix.ModuleRuntime<any, any>,
      never,
      never
    >

    const runtimeManager = ManagedRuntime.make(layer)
    await runtimeManager.runPromise(
      Effect.gen(function* () {
        yield* ModuleWithReducer.tag
        yield* Deferred.await(errorSeen)
      }) as Effect.Effect<void, never, any>,
    )

    expect(errorSpy).toHaveBeenCalled()
    const pretty = errorSpy.mock.calls[0]?.[0] as string
    expect(pretty ?? '').toContain('Duplicate primary reducer')
    expect(pretty ?? '').toContain('set')
  })

  it('should emit diagnostic when reducer is registered after dispatch (late)', async () => {
    const errorSeen = Deferred.unsafeMake<{
      pretty: string
      context: unknown
    }>(FiberId.none)

    const ModuleLate = Logix.Module.make('LateReducerModule', {
      state: Schema.Struct({ value: Schema.Number }),
      actions: { set: Schema.Number, noop: Schema.Void },
      reducers: {
        // Placeholder reducer keeps reducerMap non-empty so the first dispatch records the tag.
        noop: (state) => state,
      },
    })

    const logic = ModuleLate.logic(($) => ({
      setup: $.lifecycle.onError((cause, context) =>
        Effect.zipRight(
          Deferred.succeed(errorSeen, {
            pretty: Cause.pretty(cause),
            context,
          }),
          Effect.void,
        ),
      ),
      run: Effect.gen(function* () {
        // Dispatch first, then try to register a primary reducer; should trigger late_registration diagnostics.
        yield* $.dispatchers.set(1)

        yield* $.reducer(
          'set',
          Logix.Module.Reducer.mutate((draft, payload: number) => {
            draft.value = payload
          }),
        )
      }),
    }))

    const layer = ModuleLate.live({ value: 0 }, logic) as Layer.Layer<Logix.ModuleRuntime<any, any>, never, never>

    const runtimeManager = ManagedRuntime.make(layer)
    await runtimeManager.runPromise(
      Effect.gen(function* () {
        yield* ModuleLate.tag
        const { pretty } = yield* Deferred.await(errorSeen)
        expect(pretty).toContain('Late primary reducer registration')
        expect(pretty).toContain('set')
      }) as Effect.Effect<void, never, any>,
    )
  })
})
