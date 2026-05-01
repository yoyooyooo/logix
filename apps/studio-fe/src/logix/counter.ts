import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'

const CounterStateSchema = Schema.Struct({
  value: Schema.Number,
})

const CounterActionMap = {
  inc: Schema.Void,
  dec: Schema.Void,
  reset: Schema.Void,
}

export const CounterDef = Logix.Module.make('StudioCounter', {
  state: CounterStateSchema,
  actions: CounterActionMap,
})

export const CounterLogic = CounterDef.logic('counter', ($) => ({
  setup: Effect.void,
  run: Effect.gen(function* () {
    yield* $.onAction('inc').runParallelFork($.state.update((prev) => ({ ...prev, value: prev.value + 1 })))

    yield* $.onAction('dec').runParallelFork($.state.update((prev) => ({ ...prev, value: prev.value - 1 })))

    yield* $.onAction('reset').runParallelFork($.state.update(() => ({ value: 0 })))
  }),
}))

export const CounterProgram = Logix.Program.make(CounterDef, {
  initial: { value: 0 },
  logics: [CounterLogic],
})
