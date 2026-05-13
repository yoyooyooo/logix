import { describe, expect, it } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('FieldKernel converge planner deferred reachable', () => {
  it.effect('immediate dirty converge exposes deferred reachable step ids for later slicing', () =>
    Effect.gen(function* () {
      const State = Schema.Struct({
        a: Schema.Number,
        i0: Schema.Number,
        d0: Schema.Number,
        d1: Schema.Number,
      })

      const Actions = { bump: Schema.Void }

      const M = FieldContracts.withModuleFieldDeclarations(
        Logix.Module.make('FieldKernelConvergePlannerDeferredReachable', {
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
        }),
      )

      const programModule = Logix.Program.make(M, {
        initial: { a: 0, i0: 1, d0: 2, d1: 2 } as any,
        logics: [],
      })

      const runtime = Logix.Runtime.make(programModule, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
        stateTransaction: {
          fieldConvergeMode: 'dirty',
          fieldConvergeBudgetMs: 100_000,
          fieldConvergeDecisionBudgetMs: 100_000,
          fieldConvergeTimeSlicing: { enabled: true, debounceMs: 1, maxLagMs: 50 },
        },
      })

      const program = Effect.gen(function* () {
        const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)
        yield* rt.dispatch({ _tag: 'bump', payload: undefined } as any)
        yield* Effect.sleep('20 millis')
        const state = yield* rt.getState
        expect((state as any).i0).toBe(2)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
