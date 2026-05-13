import { describe, expect, it } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

const waitForState = (
  read: Effect.Effect<any, never, never>,
  predicate: (state: any) => boolean,
): Effect.Effect<any, never, never> =>
  Effect.gen(function* () {
    for (let i = 0; i < 100; i++) {
      const state = yield* read
      if (predicate(state)) return state
      yield* Effect.sleep('5 millis')
    }
    return yield* read
  })

describe('FieldKernel converge dirty-reachable execution', () => {
  it.effect('deferred flush executes only dirty-reachable deferred steps under exact dirty evidence', () =>
    Effect.gen(function* () {
      const State = Schema.Struct({
        a: Schema.Number,
        b: Schema.Number,
        i0: Schema.Number,
        d0: Schema.Number,
        d1: Schema.Number,
        d2: Schema.Number,
      })

      const Actions = { bumpA: Schema.Void }
      let unrelatedDeferredCalls = 0

      const M = FieldContracts.withModuleFieldDeclarations(
        Logix.Module.make('FieldKernelConvergeDirtyReachableExecution', {
          state: State,
          actions: Actions,
          reducers: {
            bumpA: Logix.Module.Reducer.mutate((draft) => {
              draft.a += 1
            }),
          },
        }),
        FieldContracts.fieldFrom(State)({
          i0: FieldContracts.fieldComputed({
            deps: ['a'],
            get: (a) => a + 1,
            scheduling: 'immediate',
          }),
          d0: FieldContracts.fieldComputed({
            deps: ['i0'],
            get: (i0) => i0 + 1,
            scheduling: 'deferred',
          }),
          d1: FieldContracts.fieldComputed({
            deps: ['a'],
            get: (a) => a + 2,
            scheduling: 'deferred',
          }),
          d2: FieldContracts.fieldComputed({
            deps: ['b'],
            get: (b) => {
              unrelatedDeferredCalls += 1
              return b + 10
            },
            scheduling: 'deferred',
          }),
        }),
      )

      const programModule = Logix.Program.make(M, {
        initial: { a: 0, b: 0, i0: 1, d0: 2, d1: 2, d2: 10 } as any,
        logics: [],
      })

      const runtime = Logix.Runtime.make(programModule, {
        stateTransaction: {
          fieldConvergeMode: 'dirty',
          fieldConvergeBudgetMs: 100_000,
          fieldConvergeDecisionBudgetMs: 100_000,
          fieldConvergeTimeSlicing: { enabled: true, debounceMs: 1, maxLagMs: 50 },
        },
      })

      yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)

            yield* Effect.sleep('20 millis')
            unrelatedDeferredCalls = 0

            yield* rt.dispatch({ _tag: 'bumpA', payload: undefined } as any)

            const finalState = yield* waitForState(
              rt.getState,
              (state) => state.i0 === 2 && state.d0 === 3 && state.d1 === 3,
            )

            expect(finalState).toMatchObject({
              a: 1,
              b: 0,
              i0: 2,
              d0: 3,
              d1: 3,
              d2: 10,
            })
            expect(unrelatedDeferredCalls).toBe(0)
          }),
        ),
      )
    }),
  )
})
