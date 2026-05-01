import { describe, it, expect } from 'vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { TestProgram } from '../../src/index.js'

const Counter = Logix.Module.make('Counter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
    decrement: Schema.Void,
  },
})

const CounterLogic = Counter.logic('counter-logic', (api) =>
  Effect.gen(function* () {
    yield* api.onAction('increment').run(() => api.state.update((s) => ({ ...s, count: s.count + 1 })))
  }),
)

describe('TestProgram (new model: program module)', () => {
  it('should run single-module program', async () => {
    const program = Logix.Program.make(Counter, {
      initial: { count: 0 },
      logics: [CounterLogic],
    })

    const result = await TestProgram.runTest(
      TestProgram.runProgram(program, (api) =>
        Effect.gen(function* () {
          yield* api.dispatch({ _tag: 'increment', payload: undefined })
          yield* api.assert.state((s) => s.count === 1, { maxAttempts: 5 })
          yield* api.assert.signal('increment')
        }),
      ),
    )

    expect(result.state).toEqual({ count: 1 })
    TestProgram.expectActionTag(result, 'increment')
    TestProgram.expectNoError(result)
  })

  it('should support forked onAction watchers inside a single Logic', async () => {
    const ForkCounterLogic = Counter.logic('fork-counter-logic', ($) =>
      Effect.gen(function* () {
        yield* Effect.forkChild($.onAction('increment').run(() => $.state.update((s) => ({ ...s, count: s.count + 1 }))))
        yield* Effect.forkChild($.onAction('decrement').run(() => $.state.update((s) => ({ ...s, count: s.count - 1 }))))
      }),
    )

    const program = Logix.Program.make(Counter, {
      initial: { count: 0 },
      logics: [ForkCounterLogic],
    })

    const result = await TestProgram.runTest(
      TestProgram.runProgram(program, (api) =>
        Effect.gen(function* () {
          yield* api.dispatch({ _tag: 'increment', payload: undefined })
          yield* api.dispatch({ _tag: 'decrement', payload: undefined })
          yield* api.assert.state((s) => s.count === 0)
        }),
      ),
    )

    expect(result.state.count).toBe(0)
  })

  it('should support runFork-style watchers on a single Logic', async () => {
    const RunForkCounterLogic = Counter.logic('run-fork-counter-logic', ($) =>
      Effect.gen(function* () {
        yield* $.onAction('increment').runParallelFork($.state.update((s) => ({ ...s, count: s.count + 1 })))
        yield* $.onAction('decrement').runParallelFork($.state.update((s) => ({ ...s, count: s.count - 1 })))
      }),
    )

    const program = Logix.Program.make(Counter, {
      initial: { count: 0 },
      logics: [RunForkCounterLogic],
    })

    const result = await TestProgram.runTest(
      TestProgram.runProgram(program, (api) =>
        Effect.gen(function* () {
          yield* api.dispatch({ _tag: 'increment', payload: undefined })
          yield* api.dispatch({ _tag: 'decrement', payload: undefined })
          yield* api.assert.state((s) => s.count === 0)
        }),
      ),
    )

    expect(result.state.count).toBe(0)
  })

  it('should run multi-module program through imported child coordination', async () => {
    const User = Logix.Module.make('User', {
      state: Schema.Struct({ name: Schema.String }),
      actions: {
        updateName: Schema.String,
      },
      reducers: {
        updateName: Logix.Module.Reducer.mutate((draft, payload: string) => {
          draft.name = payload
        }),
      },
    })

    const Auth = Logix.Module.make('Auth', {
      state: Schema.Struct({ loggedIn: Schema.Boolean }),
      actions: {
        login: Schema.Void,
        logout: Schema.Void,
      },
      reducers: {
        login: Logix.Module.Reducer.mutate((draft) => {
          draft.loggedIn = true
        }),
        logout: Logix.Module.Reducer.mutate((draft) => {
          draft.loggedIn = false
        }),
      },
    })

    const AuthProgram = Logix.Program.make(Auth, {
      initial: { loggedIn: true },
      logics: [],
    })

    const UserLogic = User.logic('user-auth-sync', ($) =>
      Effect.gen(function* () {
        const authHandle = yield* $.use(Auth)

        yield* $.onAction('updateName').run((action) =>
          Effect.gen(function* () {
            if (action.payload !== 'clear') return

            yield* authHandle.dispatch({
              _tag: 'login',
              payload: undefined,
            })
            yield* authHandle.dispatch({
              _tag: 'logout',
              payload: undefined,
            })

            const loggedIn = yield* authHandle.read((s) => s.loggedIn)
            if (loggedIn === false) {
              yield* $.state.update((state) => ({ ...state, name: '' }))
            }
          }),
        )
      }),
    )

    const program = Logix.Program.make(User, {
      initial: { name: 'Alice' },
      logics: [UserLogic],
      capabilities: {
        imports: [AuthProgram],
      },
    })

    const result = await TestProgram.runTest(
      TestProgram.runProgram(program, (api) =>
        Effect.gen(function* () {
          yield* api.advance('50 millis')
          yield* api.dispatch({ _tag: 'updateName', payload: 'clear' })
          yield* api.assert.state((s) => s.name === '')
        }),
      ),
    )

    expect(result.state).toEqual({ name: '' })
    TestProgram.expectActionTag(result, 'updateName')
    TestProgram.expectNoError(result)
  })
})
