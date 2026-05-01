import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'

const CounterStateSchema = Schema.Struct({
  count: Schema.Number,
})

const CounterActionMap = {
  increment: Schema.Void,
}

export const CounterMulti = Logix.Module.make('CounterMultiModule', {
  state: CounterStateSchema,
  actions: CounterActionMap,
})

export const CounterMultiLogic = CounterMulti.logic('counter-multi-logic', ($) =>
  Effect.gen(function* () {
    yield* $.onAction('increment').run(
      $.state.update((prev) => ({
        ...prev,
        count: prev.count + 1,
      })),
    )
  }),
)

export const CounterMultiProgram = Logix.Program.make(CounterMulti, {
  initial: { count: 0 },
  logics: [CounterMultiLogic],
})
