import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logix/core'
import * as CoreNg from '../src/index.js'

describe('core-ng: Exec VM (converge smoke)', () => {
  it.effect(
    'should converge computed traits correctly with ExecVmMode enabled',
    () =>
      Effect.gen(function* () {
        const State = Schema.Struct({
          a: Schema.Number,
          b: Schema.Number,
          derivedA: Schema.Number,
          derivedB: Schema.Number,
        })

        const Actions = {
          mutateA: Schema.Void,
        }

        const M = Logix.Module.make('CoreNg.ExecVm.converge.smoke', {
          state: State,
          actions: Actions,
          traits: Logix.StateTrait.from(State)({
            derivedA: Logix.StateTrait.computed({
              deps: ['a'],
              get: (a) => a + 1,
            }),
            derivedB: Logix.StateTrait.computed({
              deps: ['b'],
              get: (b) => b + 1,
            }),
          }),
        })

        const MutateLogic = M.logic(($) =>
          Effect.gen(function* () {
            yield* $.onAction('mutateA').run(() =>
              $.state.mutate((draft) => {
                draft.a += 1
              }),
            )
          }),
        )

        const impl = M.implement({
          initial: { a: 0, b: 0, derivedA: 1, derivedB: 1 } as Schema.Schema.Type<typeof State>,
          logics: [MutateLogic],
        })

        const ring = Logix.Debug.makeRingBufferSink(256)
        const layer = Layer.mergeAll(
          CoreNg.coreNgFullCutoverLayer({ capabilities: ['test:fullCutover'] }),
          Logix.Debug.replace([ring.sink]),
          Logix.Debug.diagnosticsLevel('light'),
        ) as Layer.Layer<any, never, never>

        const runtime = Logix.Runtime.make(impl, {
          stateTransaction: { traitConvergeMode: 'dirty' },
          layer,
        })

        const program = Effect.gen(function* () {
          const rt = yield* M.tag
          yield* rt.dispatch({ _tag: 'mutateA', payload: undefined })
          yield* Effect.sleep('10 millis')

          const next = yield* rt.getState
          expect(next.derivedA).toBe(next.a + 1)
          expect(next.derivedB).toBe(next.b + 1)

          const execVmEvents = ring.getSnapshot().filter((e) => e.type === 'trace:exec-vm') as ReadonlyArray<any>
          expect(execVmEvents.length).toBeGreaterThan(0)
          expect(execVmEvents[0]?.data?.hit).toBe(true)
        })

        yield* Effect.promise(() => runtime.runPromise(program))
      }),
    20_000,
  )
})
