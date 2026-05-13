import { describe, expect, it } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/internal/debug-api.js'

describe('FieldKernel converge execution semantics', () => {
  it.effect('computed chain reads prior writeback within the same txn window', () =>
    Effect.gen(function* () {
      const State = Schema.Struct({
        a: Schema.Number,
        derivedA: Schema.Number,
        derivedB: Schema.Number,
      })

      const Actions = { noop: Schema.Void }

      const M = FieldContracts.withModuleFieldDeclarations(Logix.Module.make('FieldKernelConverge_ExecutionSemantics', {
  state: State,
  actions: Actions,
  reducers: { noop: (s: any) => s }
}), FieldContracts.fieldFrom(State)({
          derivedA: FieldContracts.fieldComputed({
            deps: ['a'],
            get: (a) => a + 1,
          }),
          derivedB: FieldContracts.fieldComputed({
            deps: ['derivedA'],
            get: (derivedA) => derivedA + 1,
          }),
        }))

      const programModule = Logix.Program.make(M, {
        initial: { a: 0, derivedA: 1, derivedB: 2 },
        logics: [],
      })

      const ring = Debug.makeRingBufferSink(256)
      const layer = Layer.mergeAll(
        Debug.replace([ring.sink]) as Layer.Layer<any, never, never>,
        Debug.diagnosticsLevel('light'),
      ) as Layer.Layer<any, never, never>

      const runtime = Logix.Runtime.make(programModule, {
        layer,
        stateTransaction: {
          fieldConvergeMode: 'auto',
          fieldConvergeBudgetMs: 100_000,
          fieldConvergeDecisionBudgetMs: 100_000,
        },
      })

      const program = Effect.gen(function* () {
        const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)

        yield* FieldContracts.runWithStateTransaction(rt, { kind: 'test', name: 't1' }, () =>
          Effect.gen(function* () {
            const prev = yield* rt.getState
            yield* rt.setState({ ...(prev as any), a: (prev as any).a + 1 })
            FieldContracts.recordStatePatch(rt, 'a', 'unknown')
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
