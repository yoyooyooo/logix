import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'

const CounterStateSchema = Schema.Struct({
  value: Schema.Number,
})

const CounterActionMap = {
  inc: Schema.Void,
  dec: Schema.Void,
}

export type CounterShape = Logix.Shape<typeof CounterStateSchema, typeof CounterActionMap>

export const CounterDef = Logix.Module.make('CounterModule', {
  state: CounterStateSchema,
  actions: CounterActionMap,
})

export const CounterLogic = CounterDef.logic(($) => ({
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

export const CounterModule = CounterDef.implement({
  initial: { value: 0 },
  logics: [CounterLogic],
})

export const CounterImpl = CounterModule.impl
