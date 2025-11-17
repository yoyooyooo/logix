import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('StateTrait converge degrade (runtime error rollback)', () => {
  it.scoped('runtime error should rollback all derived writes (no partial commit)', () =>
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
        derivedOk: Schema.Number,
        derivedBoom: Schema.Number,
      })

      type S = Schema.Schema.Type<typeof State>

      const Actions = { bump: Schema.Void }

      const M = Logix.Module.make('StateTraitConverge_DegradeRuntimeErrorRollback', {
        state: State,
        actions: Actions,
        reducers: {
          bump: Logix.Module.Reducer.mutate((draft: Logix.Logic.Draft<S>) => {
            draft.base += 1
          }),
        },
        traits: Logix.StateTrait.from(State)({
          derivedOk: Logix.StateTrait.computed({
            deps: ['base'],
            get: (base) => base + 1,
          }),
          derivedBoom: Logix.StateTrait.computed({
            deps: ['derivedOk'],
            get: () => {
              throw new Error('boom')
            },
          }),
        }),
      })

      const impl = M.implement({
        initial: { base: 0, derivedOk: 123, derivedBoom: 456 },
        logics: [],
      })

      const runtime = Logix.Runtime.make(impl, {
        layer: Logix.Debug.replace([sink]) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt: any = yield* M.tag
        yield* rt.dispatch({ _tag: 'bump', payload: undefined } as any)

        const state = (yield* rt.getState) as any as S
        expect(state.base).toBe(1)
        // runtime error：必须回滚所有派生写回（不允许 partial commit）
        expect(state.derivedOk).toBe(123)
        expect(state.derivedBoom).toBe(456)

        const degraded = events.find(
          (e) => e.type === 'diagnostic' && e.code === 'trait::runtime_error' && e.severity === 'warning',
        )
        expect(degraded).toBeDefined()
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
