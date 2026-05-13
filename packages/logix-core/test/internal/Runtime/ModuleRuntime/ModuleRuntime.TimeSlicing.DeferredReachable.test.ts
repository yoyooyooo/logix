import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import * as Logix from '../../../../src/index.js'

const waitUntil = (cond: Effect.Effect<boolean>): Effect.Effect<void> =>
  Effect.gen(function* () {
    while (!(yield* cond)) {
      yield* Effect.yieldNow
    }
  })

describe('ModuleRuntime time-slicing deferred reachable', () => {
  it.effect('deferred flush eventually applies deferred reachable steps after immediate dirty commit', () =>
    Effect.gen(function* () {
      const State = Schema.Struct({
        a: Schema.Number,
        b: Schema.Number,
        i0: Schema.Number,
        d0: Schema.Number,
        d1: Schema.Number,
        d2: Schema.Number,
      })

      const Actions = { bump: Schema.Void }
      let unrelatedDeferredCalls = 0

      const M = FieldContracts.withModuleFieldDeclarations(
        Logix.Module.make('ModuleRuntime_TimeSlicing_DeferredReachable', {
          state: State,
          actions: Actions,
          reducers: {
            bump: Logix.Module.Reducer.mutate((draft) => {
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
            yield* rt.dispatch({ _tag: 'bump', payload: undefined } as any)

            yield* waitUntil(
              rt.getState.pipe(
                Effect.map((s: any) => s.i0 === 2 && s.d0 === 3 && s.d1 === 3),
              ),
            )

            const finalState = yield* rt.getState
            expect((finalState as any).i0).toBe(2)
            expect((finalState as any).d0).toBe(3)
            expect((finalState as any).d1).toBe(3)
            expect((finalState as any).d2).toBe(10)
            expect(unrelatedDeferredCalls).toBe(0)
          }),
        ),
      )
    }),
  )
})
