import { describe, it, expect } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/internal/debug-api.js'

describe('FieldKernel converge · dirty-set from $.state.mutate', () => {
  it.effect('$.state.mutate should produce field-level dirty roots (vs plain reducer falls back to dirtyAll)', () =>
    Effect.gen(function* () {
      const State = Schema.Struct({
        a: Schema.Number,
        b: Schema.Number,
        derivedA: Schema.Number,
        derivedB: Schema.Number,
      })

      type S = Schema.Schema.Type<typeof State>

      const Actions = {
        mutateA: Schema.Void,
        incA: Schema.Void,
      }

      const M = FieldContracts.withModuleFieldDeclarations(Logix.Module.make('FieldKernelConvergeDirtySetFromMutate', {
  state: State,
  actions: Actions,
  reducers: {
          incA: (s: any) => ({ ...s, a: (s.a as number) + 1 }),
        }
}), FieldContracts.fieldFrom(State)({
          derivedA: FieldContracts.fieldComputed({
            deps: ['a'],
            get: (a) => a + 1,
          }),
          derivedB: FieldContracts.fieldComputed({
            deps: ['b'],
            get: (b) => b + 1,
          }),
        }))

      const MutateLogic = M.logic('mutate-logic', ($) =>
        Effect.gen(function* () {
          yield* $.onAction('mutateA').run(() =>
            $.state.mutate((draft) => {
              draft.a += 1
            }),
          )
        }),
      )

      const programModule = Logix.Program.make(M, {
        initial: { a: 0, b: 0, derivedA: 1, derivedB: 1 } as any,
        logics: [MutateLogic],
      })

      const ring = Debug.makeRingBufferSink(128)
      const layer = Layer.mergeAll(Debug.replace([ring.sink]), Debug.diagnosticsLevel('light')) as Layer.Layer<
        any,
        never,
        never
      >

      const runtime = Logix.Runtime.make(programModule, {
        stateTransaction: { fieldConvergeMode: 'dirty' },
        layer,
      })

      const program = Effect.gen(function* () {
        const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)

        // watcher txn: uses $.state.mutate
        yield* rt.dispatch({ _tag: 'mutateA', payload: undefined } as any)
        yield* Effect.sleep('10 millis')

        const updates1 = ring
          .getSnapshot()
          .filter((e) => e.type === 'state:update' && (e as any).txnId) as ReadonlyArray<any>
        expect(updates1.length).toBe(1)

        const afterMutate = updates1[updates1.length - 1]
        expect(afterMutate?.fieldSummary?.converge?.requestedMode).toBe('dirty')
        expect(afterMutate?.fieldSummary?.converge?.executedMode).toBe('dirty')
        expect(afterMutate?.fieldSummary?.converge?.dirty?.dirtyAll).toBe(false)
        expect(afterMutate?.fieldSummary?.converge?.dirty?.rootCount).toBe(1)
        expect(afterMutate?.fieldSummary?.converge?.stepStats?.totalSteps).toBe(2)
        expect(afterMutate?.fieldSummary?.converge?.stepStats?.executedSteps).toBe(1)
        expect(afterMutate?.fieldSummary?.converge?.stepStats?.skippedSteps).toBe(1)

        // dispatch txn: plain reducer falls back to dirtyAll
        yield* rt.dispatch({ _tag: 'incA', payload: undefined } as any)
        yield* Effect.sleep('10 millis')

        const updates2 = ring
          .getSnapshot()
          .filter((e) => e.type === 'state:update' && (e as any).txnId) as ReadonlyArray<any>
        expect(updates2.length).toBe(2)

        const afterReducer = updates2[updates2.length - 1]
        expect(afterReducer?.fieldSummary?.converge?.requestedMode).toBe('dirty')
        expect(afterReducer?.fieldSummary?.converge?.executedMode).toBe('dirty')
        expect(afterReducer?.fieldSummary?.converge?.dirty?.dirtyAll).toBe(true)
        expect(afterReducer?.fieldSummary?.converge?.dirty?.rootCount).toBe(0)
        expect(afterReducer?.fieldSummary?.converge?.stepStats?.totalSteps).toBe(2)
        expect(afterReducer?.fieldSummary?.converge?.stepStats?.executedSteps).toBe(2)
        expect(afterReducer?.fieldSummary?.converge?.stepStats?.skippedSteps).toBe(0)
      })

      yield* Effect.promise(() => runtime.runPromise(program))
    }),
  )
})
