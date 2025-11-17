import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('StateTrait degrade', () => {
  it.scoped('runtime error should degrade (commit base, freeze derived)', () =>
    Effect.gen(function* () {
      const events: Array<Logix.Debug.Event> = []
      const sink: Logix.Debug.Sink = {
        record: (event) =>
          Effect.sync(() => {
            events.push(event)
          }),
      }

      const State = Schema.Struct({
        base: Schema.Number,
        derived: Schema.Number,
      })

      type S = Schema.Schema.Type<typeof State>

      const Actions = { bump: Schema.Void }

      const M = Logix.Module.make('StateTraitDegradeRuntimeError', {
        state: State,
        actions: Actions,
        reducers: {
          bump: Logix.Module.Reducer.mutate((draft: Logix.Logic.Draft<S>) => {
            draft.base += 1
          }),
        },
        traits: Logix.StateTrait.from(State)({
          derived: Logix.StateTrait.computed({
            deps: ['base'],
            get: () => {
              throw new Error('boom')
            },
          }),
        }),
      })

      const impl = M.implement({
        initial: { base: 0, derived: 123 },
        logics: [],
      })

      const runtime = Logix.Runtime.make(impl, {
        layer: Logix.Debug.replace([sink]) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* M.tag

        yield* rt.dispatch({ _tag: 'bump', payload: undefined } as any)

        const state = (yield* rt.getState) as S
        expect(state.base).toBe(1)
        // derived 冻结为旧值（不写入半成品）
        expect(state.derived).toBe(123)

        const degraded = events.find(
          (e) => e.type === 'diagnostic' && e.code === 'trait::runtime_error' && e.severity === 'warning',
        )
        expect(degraded).toBeDefined()
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
