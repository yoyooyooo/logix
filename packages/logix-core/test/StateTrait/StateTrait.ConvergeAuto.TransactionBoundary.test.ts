import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/Debug.js'

describe('StateTrait converge auto transaction boundary', () => {
  const State = Schema.Struct({
    a: Schema.Number,
    derivedA: Schema.Number,
  })

  const Actions = {
    noop: Schema.Void,
  }

  const M = Logix.Module.make('StateTraitConvergeAuto_TransactionBoundary', {
    state: State,
    actions: Actions,
    reducers: { noop: (s: any) => s },
    traits: Logix.StateTrait.from(State)({
      derivedA: Logix.StateTrait.computed({
        deps: ['a'],
        get: (a) => a + 1,
      }),
    }),
  })

  const impl = M.implement({
    initial: { a: 0, derivedA: 1 },
    logics: [],
  })

  it.scoped('detects async escape in the transaction window (dev-only diagnostic)', () =>
    Effect.gen(function* () {
      const ring = Debug.makeRingBufferSink(128)
      const layer = Layer.mergeAll(
        Debug.replace([ring.sink]) as Layer.Layer<any, never, never>,
        Debug.diagnosticsLevel('light'),
      ) as Layer.Layer<any, never, never>

      const runtime = Logix.Runtime.make(impl, {
        layer,
        stateTransaction: {
          traitConvergeMode: 'auto',
        },
      })

      yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const rt: any = yield* M.tag
            yield* Logix.InternalContracts.runWithStateTransaction(rt, { kind: 'test', name: 'async-escape' }, () =>
              Effect.gen(function* () {
                yield* Effect.sleep('1 millis')
              }),
            )
          }),
        ),
      )

      const diagnostics = ring
        .getSnapshot()
        .filter((e) => e.type === 'diagnostic' && (e as any).code === 'state_transaction::async_escape')
      expect(diagnostics.length).toBeGreaterThan(0)
    }),
  )
})
