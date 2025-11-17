import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/Debug.js'

describe('Runtime public semantics: no drift (US1)', () => {
  it.scoped('transaction window async escape emits diagnostic but state semantics remain correct', () =>
    Effect.gen(function* () {
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
          bump: Logix.Module.Reducer.mutate((draft: any) => {
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

            yield* Logix.InternalContracts.runWithStateTransaction(rt, { kind: 'test', name: 'async_escape' }, () =>
              Effect.gen(function* () {
                const prev: any = yield* rt.getState
                yield* Effect.sleep('10 millis')
                yield* rt.setState({ ...prev, base: prev.base + 1 })
              }),
            )

            const state: any = yield* rt.getState
            expect(state).toEqual({ base: 1, derived: 2 })
          }),
        ),
      )

      const diags = ring
        .getSnapshot()
        .filter((e) => e.type === 'diagnostic' && (e as any).code === 'state_transaction::async_escape')

      expect(diags.length).toBeGreaterThan(0)
    }),
  )
})
