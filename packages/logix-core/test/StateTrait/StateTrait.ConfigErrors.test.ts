import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/Debug.js'

describe('StateTrait config errors', () => {
  it.scoped('computed cycle should hard fail and block commit', () =>
    Effect.gen(function* () {
      const State = Schema.Struct({
        base: Schema.Number,
        a: Schema.Number,
        b: Schema.Number,
      })

      const Actions = { bump: Schema.Void }

      type S = Schema.Schema.Type<typeof State>

      const M = Logix.Module.make('StateTraitConfigErrorCycle', {
        state: State,
        actions: Actions,
        reducers: {
          bump: Logix.Module.Reducer.mutate((draft: Logix.Logic.Draft<S>) => {
            draft.base += 1
          }),
        },
        traits: Logix.StateTrait.from(State)({
          a: Logix.StateTrait.computed({
            deps: ['b'],
            get: (b) => b + 1,
          }),
          b: Logix.StateTrait.computed({
            deps: ['a'],
            get: (a) => a + 1,
          }),
        }),
      })

      const impl = M.implement({
        initial: { base: 0, a: 0, b: 0 },
        logics: [],
      })

      const ring = Debug.makeRingBufferSink(32)

      const runtime = Logix.Runtime.make(impl, {
        layer: Debug.replace([ring.sink]) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* M.tag

        const exit = yield* Effect.exit(rt.dispatch({ _tag: 'bump', payload: undefined } as any))

        expect(exit._tag).toBe('Failure')

        const state = (yield* rt.getState) as S
        expect(state).toEqual({ base: 0, a: 0, b: 0 })
        const diagnostics = ring
          .getSnapshot()
          .filter((e) => e.type === 'diagnostic' && e.code === 'state_trait::config_error') as ReadonlyArray<
          Extract<Debug.Event, { readonly type: 'diagnostic' }>
        >

        expect(diagnostics.length).toBeGreaterThan(0)
        expect(diagnostics[0]?.severity).toBe('error')
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
