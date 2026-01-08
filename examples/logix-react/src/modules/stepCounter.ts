import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'

const StepCounterState = Schema.Struct({
  value: Schema.Number,
})

const StepCounterActions = {
  inc: Schema.Void,
}

export const StepCounterDef = Logix.Module.make('StepCounterModule', {
  state: StepCounterState,
  actions: StepCounterActions,
})

export const StepCounterLogic = StepCounterDef.logic(($) => ({
  setup: Effect.void,
  run: Effect.gen(function* () {
    yield* $.onAction('inc').mutate((s) => {
      s.value += 1
    })
  }),
}))

export const StepCounterModule = StepCounterDef.implement({
  initial: { value: 0 },
  logics: [StepCounterLogic],
})

export const StepCounterImpl = StepCounterModule.impl
