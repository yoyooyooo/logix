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
    // 模块本身是一个 Tag，可以作为 Service 使用
    expect(CounterModule.id).toBe('CoreCounter')
    expect(typeof CounterModule.implement).toBe('function')
    expect(typeof CounterModule.logic).toBe('function')
  })

  it.scoped('should build ModuleImpl and access runtime via Tag', () =>
    Effect.gen(function* () {
      // 通过 ModuleImpl 构造初始 state
      const impl = CounterModule.implement({
        initial: { count: 1 },
      })

      // 使用 Runtime.make 构造应用级 Runtime（这里不注入额外 Layer）
      const runtime = Logix.Runtime.make(impl, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      // 在 Effect 中通过 Tag 访问 ModuleRuntime，并读取 state
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
        add: Logix.Module.Reducer.mutate((draft, action) => {
          draft.count += action.payload
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
        add: (draft, action) => {
          draft.count += action.payload
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
        inc: (draft, action) => {
          type _DraftNotAny = Expect<IsAny<typeof draft> extends true ? false : true>
          type _ActionNotAny = Expect<IsAny<typeof action> extends true ? false : true>
          draft.count += 1
        },
        add: (draft, action) => {
          type _ActionNotAny = Expect<IsAny<typeof action> extends true ? false : true>
          draft.count += action.payload
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
        // 直接在 Logic 内派发一次，验证 reducer 在 watcher 前同步生效。
        yield* $.actions.inc()
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
          Logix.Module.Reducer.mutate((draft, action: { payload: number }) => {
            draft.value = action.payload
          }),
        )

        // 再次为同一 tag 注册 primary reducer，应触发 Duplicate 错误
        yield* $.reducer(
          'set',
          Logix.Module.Reducer.mutate((draft, action: { payload: number }) => {
            draft.value = action.payload + 1
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
        // 占位 reducer 使 runtime 持有 reducerMap（非空），确保首个 dispatch 记录 tag。
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
        // 先派发，再尝试注册 primary reducer，会触发 late_registration 诊断。
        yield* $.actions.set(1)

        yield* $.reducer(
          'set',
          Logix.Module.Reducer.mutate((draft, action: { payload: number }) => {
            draft.value = action.payload
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
