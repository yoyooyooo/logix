import { describe, it, expect } from '@effect/vitest'
import { Cause, Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/Debug.js'

describe('Runtime public semantics: transaction window fail-fast (US1)', () => {
  it.scoped('production path should fail-fast on async escape and keep later txns consistent', () =>
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

        const M = Logix.Module.make('Runtime.PublicSemantics.NoDrift', {
          state: State,
          actions: Actions,
          reducers: {
            bump: Logix.Module.Reducer.mutate((draft) => {
              draft.base += 1
            }),
          },
          traits: Logix.StateTrait.from(State)({
            derived: Logix.StateTrait.computed({
              deps: ['base'],
              get: (base) => base + 1,
            }),
          }),
        })

        const impl = M.implement({
          initial: { base: 0, derived: 1 },
          logics: [],
        })

        const ring = Debug.makeRingBufferSink(256)
        const layer = Layer.mergeAll(Debug.replace([ring.sink]), Debug.diagnosticsLevel('light')) as Layer.Layer<
          any,
          never,
          never
        >

        const runtime = Logix.Runtime.make(impl, { layer })

        yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.gen(function* () {
              const rt: any = yield* M.tag

              const escapeExit = yield* Effect.exit(
                Logix.InternalContracts.runWithStateTransaction(rt, { kind: 'test', name: 'async_escape' }, () =>
                  Effect.gen(function* () {
                    const prev: any = yield* rt.getState
                    yield* Effect.sleep('10 millis')
                    yield* rt.setState({ ...prev, base: prev.base + 1 })
                  }),
                ),
              )
              expect(escapeExit._tag).toBe('Failure')
              if (escapeExit._tag === 'Failure') {
                const defects = [...Cause.defects(escapeExit.cause)]
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
