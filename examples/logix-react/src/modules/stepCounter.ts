import { Effect, Schema } from "effect"
import { Logix } from "@logix/core"

const StepCounterState = Schema.Struct({
  value: Schema.Number,
})

const StepCounterActions = {
  inc: Schema.Void,
}

export const StepCounterModule = Logix.Module("StepCounterModule", {
  state: StepCounterState,
  actions: StepCounterActions,
})

const StepCounterLogic = StepCounterModule.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction("inc").mutate((s) => {
      s.value += 1
    })
  }),
)

export const StepCounterImpl = StepCounterModule.make({
  initial: { value: 0 },
  logics: [StepCounterLogic],
})

