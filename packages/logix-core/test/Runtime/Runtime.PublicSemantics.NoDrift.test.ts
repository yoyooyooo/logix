import { describe, it, expect } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Cause, Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/internal/debug-api.js'

describe('Runtime public semantics: transaction window fail-fast (US1)', () => {
  it.effect('production path should fail-fast on async escape and keep later txns consistent', () =>
    Effect.gen(function* () {
      const previousEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      try {
        const State = Schema.Struct({
          base: Schema.Number,
          derived: Schema.Number,
        })

        const Actions = {
          bump: Schema.Void,
        }

        const M = FieldContracts.withModuleFieldDeclarations(Logix.Module.make('Runtime.PublicSemantics.NoDrift', {
  state: State,
  actions: Actions,
  reducers: {
            bump: Logix.Module.Reducer.mutate((draft) => {
              draft.base += 1
            }),
          }
}), FieldContracts.fieldFrom(State)({
            derived: FieldContracts.fieldComputed({
              deps: ['base'],
              get: (base) => base + 1,
            }),
          }))

        const program = Logix.Program.make(M, {
          initial: { base: 0, derived: 1 },
          logics: [],
        })

        const ring = Debug.makeRingBufferSink(256)
        const layer = Layer.mergeAll(Debug.replace([ring.sink]), Debug.diagnosticsLevel('light')) as Layer.Layer<
          any,
          never,
          never
        >

        const runtime = Logix.Runtime.make(program, { layer })

        yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.gen(function* () {
              const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)

              const escapeExit = yield* Effect.exit(
                FieldContracts.runWithStateTransaction(rt, { kind: 'test', name: 'async_escape' }, () =>
                  Effect.gen(function* () {
                    const prev: any = yield* rt.getState
                    yield* Effect.sleep('10 millis')
                    yield* rt.setState({ ...prev, base: prev.base + 1 })
                  }),
                ),
              )
              expect(escapeExit._tag).toBe('Failure')
              if (escapeExit._tag === 'Failure') {
                const defects = escapeExit.cause.reasons.filter(Cause.isDieReason).map((reason) => reason.defect)
                expect(defects.some((d) => (d as any)?.code === 'state_transaction::async_escape')).toBe(true)
              }

              yield* rt.dispatch({ _tag: 'bump', payload: undefined } as any)
              yield* rt.dispatchLowPriority({ _tag: 'bump', payload: undefined } as any)
              yield* rt.dispatchBatch([{ _tag: 'bump', payload: undefined }] as any)

              const state: any = yield* rt.getState
              expect(state).toEqual({ base: 3, derived: 4 })
            }),
          ),
        )

        const diags = ring
          .getSnapshot()
          .filter((e) => e.type === 'diagnostic' && (e as any).code === 'state_transaction::async_escape')

        expect(diags.length).toBeGreaterThan(0)
      } finally {
        process.env.NODE_ENV = previousEnv
      }
    }),
  )
})
