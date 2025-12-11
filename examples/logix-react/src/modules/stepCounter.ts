import { Effect, Schema } from 'effect'
import * as Logix from '@logix/core'

const StepCounterState = Schema.Struct({
  value: Schema.Number,
})

const StepCounterActions = {
  inc: Schema.Void,
}

export const StepCounterModule = Logix.Module.make('StepCounterModule', {
  state: StepCounterState,
  actions: StepCounterActions,
})

export const StepCounterLogic = StepCounterModule.logic(($) => ({
  setup: Effect.void,
  run: Effect.gen(function* () {
    yield* $.onAction('inc').mutate((s) => {
      s.value += 1
    })
  }),
}))

export const StepCounterImpl = StepCounterModule.implement({
  initial: { value: 0 },
  logics: [StepCounterLogic],
})
