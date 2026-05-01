import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'

const CounterStateSchema = Schema.Struct({
  value: Schema.Number,
})

const CounterActionMap = {
  inc: Schema.Void,
  dec: Schema.Void,
}

export type CounterShape = Logix.Module.Shape<typeof CounterStateSchema, typeof CounterActionMap>

export const Counter = Logix.Module.make('CounterModule', {
  state: CounterStateSchema,
  actions: CounterActionMap,
})

export const CounterLogic = Counter.logic('counter-logic', ($) =>
  Effect.gen(function* () {
    yield* $.onAction('inc').runParallelFork(
      $.state.update((prev) => ({
        ...prev,
        value: prev.value + 1,
      })),
    )

    yield* $.onAction('dec').runParallelFork(
      $.state.update((prev) => ({
        ...prev,
        value: prev.value - 1,
      })),
    )
  }),
)

export const CounterProgram = Logix.Program.make(Counter, {
  initial: { value: 0 },
  logics: [CounterLogic],
})
