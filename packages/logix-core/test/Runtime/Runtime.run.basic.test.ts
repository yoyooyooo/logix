import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime.run (US1)', () => {
  it.effect('boot starts logics and main can observe state changes', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('Runtime.run.basic', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: { bump: Schema.Void },
        reducers: {
          bump: Logix.Module.Reducer.mutate((draft) => {
            draft.value += 1
          }),
        },
      })

      const logic = Root.logic('root-logic', ($) =>
        Effect.gen(function* () {
          yield* $.onAction('bump').run(() =>
            $.state.mutate((draft) => {
              draft.value += 1
            }),
          )
        }),
      )

      const program = Logix.Program.make(Root, {
        initial: { value: 0 },
        logics: [logic],
      })

      yield* Effect.promise(() =>
        Logix.Runtime.run(
          program,
          ({ module }) =>
            Effect.gen(function* () {
              yield* module.dispatch({ _tag: 'bump', payload: undefined } as any)
              yield* Effect.sleep('10 millis')
              const state: any = yield* module.getState
              expect(state.value).toBeGreaterThan(0)
            }),
          { layer: Layer.empty as Layer.Layer<any, never, never>, handleSignals: false },
        ),
      )
    }),
  )
})
