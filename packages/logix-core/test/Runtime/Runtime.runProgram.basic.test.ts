import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime.runProgram (US1)', () => {
  it.scoped('boot starts logics and main can observe state changes', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('Runtime.runProgram.basic', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: { bump: Schema.Void },
        reducers: {
          bump: Logix.Module.Reducer.mutate((draft) => {
            draft.value += 1
          }),
        },
      })

      const logic = Root.logic(($) =>
        Effect.gen(function* () {
          yield* $.onAction('bump').run(() =>
            $.state.mutate((draft) => {
              draft.value += 1
            }),
          )
        }),
      )

      const impl = Root.implement({
        initial: { value: 0 },
        logics: [logic],
      })

      yield* Effect.promise(() =>
        Logix.Runtime.runProgram(
          impl,
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
