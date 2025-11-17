import { describe, expect, it } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('StateTrait converge time-slicing (043)', () => {
  const State = Schema.Struct({
    a: Schema.Number,
    immediateA: Schema.Number,
    deferredA: Schema.Number,
    deferredFromImmediateA: Schema.Number,
  })

  const Actions = { noop: Schema.Void }

  const M = Logix.Module.make('StateTraitConverge_TimeSlicing', {
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
      deferredFromImmediateA: Logix.StateTrait.computed({
        deps: ['immediateA'],
        get: (immediateA) => immediateA + 1000,
        scheduling: 'deferred',
      }),
    }),
  })

  const impl = M.implement({
    initial: { a: 0, immediateA: 1, deferredA: 100, deferredFromImmediateA: 1001 },
    logics: [],
  })

  it.scoped('skips deferred converge in the current txn, then flushes later', () =>
    Effect.gen(function* () {
      const runtime = Logix.Runtime.make(impl, {
        stateTransaction: {
          traitConvergeMode: 'dirty',
          traitConvergeBudgetMs: 100_000,
          traitConvergeDecisionBudgetMs: 100_000,
          traitConvergeTimeSlicing: { enabled: true, debounceMs: 1, maxLagMs: 50 },
          txnLanes: { enabled: false },
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
            expect(afterTxn).toMatchObject({ a: 1, immediateA: 2, deferredA: 100, deferredFromImmediateA: 1001 })

            yield* Effect.sleep('80 millis')

            const afterFlush = yield* rt.getState
            expect(afterFlush).toMatchObject({ a: 1, immediateA: 2, deferredA: 101, deferredFromImmediateA: 1002 })
          }),
        ),
      )
    }),
  )

  it.scoped('maxLagMs forces a flush even if debounceMs is large', () =>
    Effect.gen(function* () {
      const runtime = Logix.Runtime.make(impl, {
        stateTransaction: {
          traitConvergeMode: 'dirty',
          traitConvergeBudgetMs: 100_000,
          traitConvergeDecisionBudgetMs: 100_000,
          traitConvergeTimeSlicing: { enabled: true, debounceMs: 200, maxLagMs: 10 },
          txnLanes: { enabled: false },
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

            yield* Effect.sleep('40 millis')

            const afterFlush = yield* rt.getState
            expect(afterFlush).toMatchObject({ a: 1, immediateA: 2, deferredA: 101 })
          }),
        ),
      )
    }),
  )
})
