import { describe, it, expect } from 'vitest'
import { Effect, Schema, Stream } from 'effect'
import * as Logix from '@logix/core'
import { runTest } from '../../src/TestRuntime.js'
import * as Execution from '../../src/Execution.js'
import * as TestProgram from '../../src/TestProgram.js'

const Counter = Logix.Module.make('Counter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
    decrement: Schema.Void,
  },
})

const CounterLogic = Counter.logic((api) =>
  Effect.gen(function* () {
    yield* api.onAction('increment').run(() => api.state.update((s) => ({ ...s, count: s.count + 1 })))
  }),
)

describe('TestProgram (new model: program module)', () => {
  it('should run single-module program', async () => {
    const program = Counter.implement({
      initial: { count: 0 },
      logics: [CounterLogic],
    })

    const result = await runTest(
      TestProgram.runProgram(program.impl, (api) =>
        Effect.gen(function* () {
          yield* api.dispatch({ _tag: 'increment', payload: undefined })
          yield* api.assert.state((s) => s.count === 1, { maxAttempts: 5 })
          yield* api.assert.signal('increment')
        }),
      ),
    )

    expect(result.state).toEqual({ count: 1 })
    Execution.expectActionTag(result, 'increment')
    Execution.expectNoError(result)
  })

  it('should support forked onAction watchers inside a single Logic', async () => {
    const ForkCounterLogic = Counter.logic(($) =>
      Effect.gen(function* () {
        yield* Effect.fork($.onAction('increment').run(() => $.state.update((s) => ({ ...s, count: s.count + 1 }))))
        yield* Effect.fork($.onAction('decrement').run(() => $.state.update((s) => ({ ...s, count: s.count - 1 }))))
      }),
    )

    const program = Counter.implement({
      initial: { count: 0 },
      logics: [ForkCounterLogic],
    })

    const result = await runTest(
      TestProgram.runProgram(program.impl, (api) =>
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
    const RunForkCounterLogic = Counter.logic(($) =>
      Effect.gen(function* () {
        yield* $.onAction('increment').runParallelFork($.state.update((s) => ({ ...s, count: s.count + 1 })))
        yield* $.onAction('decrement').runParallelFork($.state.update((s) => ({ ...s, count: s.count - 1 })))
      }),
    )

    const program = Counter.implement({
      initial: { count: 0 },
      logics: [RunForkCounterLogic],
    })

    const result = await runTest(
      TestProgram.runProgram(program.impl, (api) =>
        Effect.gen(function* () {
          yield* api.dispatch({ _tag: 'increment', payload: undefined })
          yield* api.dispatch({ _tag: 'decrement', payload: undefined })
          yield* api.assert.state((s) => s.count === 0)
        }),
      ),
    )

    expect(result.state.count).toBe(0)
  })

  it('should run multi-module program with Link process (no _op_layer hacks)', async () => {
    const User = Logix.Module.make('User', {
      state: Schema.Struct({ name: Schema.String }),
      actions: {
        updateName: Schema.String,
      },
    })

    const UserLogic = User.logic((api) =>
      Effect.gen(function* () {
        yield* api.onAction('updateName').update((s, a) => ({
          ...s,
          name: a.payload,
        }))
      }),
    )

    const Auth = Logix.Module.make('Auth', {
      state: Schema.Struct({ loggedIn: Schema.Boolean }),
      actions: {
        login: Schema.Void,
        logout: Schema.Void,
      },
    })

    const AuthLogic = Auth.logic((api) =>
      Effect.gen(function* () {
        yield* Effect.all(
          [
            api.onAction('login').update((s) => ({ ...s, loggedIn: true })),
            api.onAction('logout').update((s) => ({ ...s, loggedIn: false })),
          ],
          { concurrency: 'unbounded' },
        )
      }),
    )

    const AuthImpl = Auth.implement({
      initial: { loggedIn: true },
      logics: [AuthLogic],
    })

    const LinkProcess = Logix.Link.make(
      {
        modules: [User, Auth] as const,
      },
      ($) =>
        Effect.gen(function* () {
          const userHandle = $[User.id]
          const authHandle = $[Auth.id]

          yield* userHandle.actions$.pipe(
            Stream.runForEach((action) =>
              Effect.gen(function* () {
                if (action._tag === 'updateName' && action.payload === 'clear') {
                  yield* authHandle.dispatch({
                    _tag: 'login',
                    payload: undefined,
                  })
                  yield* authHandle.dispatch({
                    _tag: 'logout',
                    payload: undefined,
                  })
                }
              }),
            ),
            Effect.forkScoped,
          )

          yield* authHandle.actions$.pipe(
            Stream.runForEach((action) =>
              Effect.gen(function* () {
                if (action._tag === 'logout') {
                  yield* userHandle.dispatch({
                    _tag: 'updateName',
                    payload: '',
                  })
                }
              }),
            ),
            Effect.forkScoped,
          )
        }),
    )

    const program = User.implement({
      initial: { name: 'Alice' },
      logics: [UserLogic],
      imports: [AuthImpl.impl],
      processes: [LinkProcess],
    })

    const result = await runTest(
      TestProgram.runProgram(program.impl, (api) =>
        Effect.gen(function* () {
          yield* api.dispatch({ _tag: 'updateName', payload: 'clear' })
          yield* api.assert.state((s) => s.name === '')
        }),
      ),
    )

    expect(result.state).toEqual({ name: '' })
    Execution.expectActionTag(result, 'updateName')
    Execution.expectNoError(result)
  })
})
