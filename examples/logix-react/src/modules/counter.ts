import { Effect, Schema } from 'effect'
import * as Logix from '@logix/core'

const CounterStateSchema = Schema.Struct({
  value: Schema.Number,
})

const CounterActionMap = {
  inc: Schema.Void,
  dec: Schema.Void,
}

export type CounterShape = Logix.Shape<typeof CounterStateSchema, typeof CounterActionMap>

export const CounterModule = Logix.Module.make('CounterModule', {
  state: CounterStateSchema,
  actions: CounterActionMap,
})

export const CounterLogic = CounterModule.logic(($) => ({
  setup: Effect.void,
  run: Effect.gen(function* () {
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
}))

export const CounterImpl = CounterModule.implement({
  initial: { value: 0 },
  logics: [CounterLogic],
})
