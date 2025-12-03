import { Effect, Schema } from "effect"
import { Logix } from "@logix/core"

const CounterStateSchema = Schema.Struct({
  value: Schema.Number,
})

const CounterActionMap = {
  inc: Schema.Void,
  dec: Schema.Void,
}

export type CounterShape = Logix.Shape<
  typeof CounterStateSchema,
  typeof CounterActionMap
>

export const CounterModule = Logix.Module("CounterModule", {
  state: CounterStateSchema,
  actions: CounterActionMap,

})

export const CounterLogic = CounterModule.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction("inc").runFork(
      $.state.update((prev) => ({
        ...prev,
        value: prev.value + 1,
      })),
    )

    yield* $.onAction("dec").runFork(
      $.state.update((prev) => ({
        ...prev,
        value: prev.value - 1,
      })),
    )
  }),
)

export const CounterImpl = CounterModule.make({
  initial: { value: 0 },
  logics: [CounterLogic],
})
