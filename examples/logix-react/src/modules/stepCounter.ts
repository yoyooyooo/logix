import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'

const StepCounterState = Schema.Struct({
  value: Schema.Number,
})

const StepCounterActions = {
  inc: Schema.Void,
}

export const StepCounter = Logix.Module.make('StepCounterModule', {
  state: StepCounterState,
  actions: StepCounterActions,
})

export const StepCounterLogic = StepCounter.logic('step-counter-logic', ($) =>
  Effect.gen(function* () {
    yield* $.onAction('inc').mutate((s) => {
      s.value += 1
    })
  }),
)

export const StepCounterProgram = Logix.Program.make(StepCounter, {
  initial: { value: 0 },
  logics: [StepCounterLogic],
})
