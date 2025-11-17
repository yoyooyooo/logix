import { describe, expect, it } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('StateTrait converge time-slicing default off (043)', () => {
  const State = Schema.Struct({
    a: Schema.Number,
    immediateA: Schema.Number,
    deferredA: Schema.Number,
  })

  const Actions = { noop: Schema.Void }

  const M = Logix.Module.make('StateTraitConverge_TimeSlicing_DefaultOff', {
    state: State,
    actions: Actions,
    reducers: { noop: (s: any) => s },
    traits: Logix.StateTrait.from(State)({
      immediateA: Logix.StateTrait.computed({
        deps: ['a'],
        get: (a) => a + 1,
      }),
      deferredA: Logix.StateTrait.computed({
        deps: ['a'],
        get: (a) => a + 100,
        scheduling: 'deferred',
      }),
    }),
  })

  const impl = M.implement({
    initial: { a: 0, immediateA: 1, deferredA: 100 },
    logics: [],
  })

  it.scoped('does not change behavior when time-slicing is disabled', () =>
    Effect.gen(function* () {
      const runtime = Logix.Runtime.make(impl, {
        stateTransaction: {
          traitConvergeMode: 'dirty',
          traitConvergeBudgetMs: 100_000,
          traitConvergeDecisionBudgetMs: 100_000,
          // time-slicing disabled (default): deferred scheduling should have no effect.
        },
      })

      yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const rt: any = yield* M.tag

            yield* Logix.InternalContracts.runWithStateTransaction(rt, { kind: 'test', name: 't1' }, () =>
              Effect.gen(function* () {
                const prev = yield* rt.getState
                yield* rt.setState({ ...prev, a: 1 })
                Logix.InternalContracts.recordStatePatch(rt, 'a', 'unknown')
              }),
            )

            const afterTxn = yield* rt.getState
            expect(afterTxn).toMatchObject({ a: 1, immediateA: 2, deferredA: 101 })
          }),
        ),
      )
    }),
  )
})
