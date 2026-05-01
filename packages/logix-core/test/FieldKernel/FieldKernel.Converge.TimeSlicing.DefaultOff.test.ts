import { describe, expect, it } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('FieldKernel converge time-slicing default off (043)', () => {
  const State = Schema.Struct({
    a: Schema.Number,
    immediateA: Schema.Number,
    deferredA: Schema.Number,
  })

  const Actions = { noop: Schema.Void }

  const M = FieldContracts.withModuleFieldDeclarations(Logix.Module.make('FieldKernelConverge_TimeSlicing_DefaultOff', {
  state: State,
  actions: Actions,
  reducers: { noop: (s: any) => s }
}), FieldContracts.fieldFrom(State)({
      immediateA: FieldContracts.fieldComputed({
        deps: ['a'],
        get: (a) => a + 1,
      }),
      deferredA: FieldContracts.fieldComputed({
        deps: ['a'],
        get: (a) => a + 100,
        scheduling: 'deferred',
      }),
    }))

  const programModule = Logix.Program.make(M, {
    initial: { a: 0, immediateA: 1, deferredA: 100 },
    logics: [],
  })

  it.effect('does not change behavior when time-slicing is disabled', () =>
    Effect.gen(function* () {
      const runtime = Logix.Runtime.make(programModule, {
        stateTransaction: {
          fieldConvergeMode: 'dirty',
          fieldConvergeBudgetMs: 100_000,
          fieldConvergeDecisionBudgetMs: 100_000,
          // time-slicing disabled (default): deferred scheduling should have no effect.
        },
      })

      yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)

            yield* FieldContracts.runWithStateTransaction(rt, { kind: 'test', name: 't1' }, () =>
              Effect.gen(function* () {
                const prev = yield* rt.getState
                yield* rt.setState({ ...prev, a: 1 })
                FieldContracts.recordStatePatch(rt, 'a', 'unknown')
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
