import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/Debug.js'

describe('StateTrait converge execution semantics', () => {
  it.scoped('computed chain reads prior writeback within the same txn window', () =>
    Effect.gen(function* () {
      const State = Schema.Struct({
        a: Schema.Number,
        derivedA: Schema.Number,
        derivedB: Schema.Number,
      })

      const Actions = { noop: Schema.Void }

      const M = Logix.Module.make('StateTraitConverge_ExecutionSemantics', {
        state: State,
        actions: Actions,
        reducers: { noop: (s: any) => s },
        traits: Logix.StateTrait.from(State)({
          derivedA: Logix.StateTrait.computed({
            deps: ['a'],
            get: (a) => a + 1,
          }),
          derivedB: Logix.StateTrait.computed({
            deps: ['derivedA'],
            get: (derivedA) => derivedA + 1,
          }),
        }),
      })

      const impl = M.implement({
        initial: { a: 0, derivedA: 1, derivedB: 2 },
        logics: [],
      })

      const ring = Debug.makeRingBufferSink(256)
      const layer = Layer.mergeAll(
        Debug.replace([ring.sink]) as Layer.Layer<any, never, never>,
        Debug.diagnosticsLevel('light'),
      ) as Layer.Layer<any, never, never>

      const runtime = Logix.Runtime.make(impl, {
        layer,
        stateTransaction: {
          traitConvergeMode: 'auto',
          traitConvergeBudgetMs: 100_000,
          traitConvergeDecisionBudgetMs: 100_000,
        },
      })

      const program = Effect.gen(function* () {
        const rt: any = yield* M.tag

        yield* Logix.InternalContracts.runWithStateTransaction(rt, { kind: 'test', name: 't1' }, () =>
          Effect.gen(function* () {
            const prev = yield* rt.getState
            yield* rt.setState({ ...(prev as any), a: (prev as any).a + 1 })
            Logix.InternalContracts.recordStatePatch(rt, 'a', 'unknown')
          }),
        )

        return yield* rt.getState
      })

      const finalState = yield* Effect.promise(() => runtime.runPromise(program))

      expect(finalState).toEqual({
        a: 1,
        derivedA: 2,
        derivedB: 3,
      })
    }),
  )
})
