import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema, Stream } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime.runProgram exit strategy (US1)', () => {
  it.scoped('main can express exit condition via observation without modifying the module', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('Runtime.runProgram.exitCondition', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: { bump: Schema.Void },
        reducers: {
          bump: Logix.Module.Reducer.mutate((draft: any) => {
            draft.value += 1
          }),
        },
      })

      const impl = Root.implement({
        initial: { value: 0 },
        logics: [],
      })

      yield* Effect.promise(() =>
        Logix.Runtime.runProgram(
          impl,
          ({ module }) =>
            Effect.gen(function* () {
              yield* module.dispatch({ _tag: 'bump', payload: undefined } as any)

              yield* module
                .changes((s: any) => s.value)
                .pipe(
                  Stream.filter((n) => n >= 1),
                  Stream.take(1),
                  Stream.runDrain,
                )

              const state: any = yield* module.getState
              expect(state.value).toBe(1)
            }),
          { layer: Layer.empty as Layer.Layer<any, never, never>, handleSignals: false },
        ),
      )
    }),
  )
})
