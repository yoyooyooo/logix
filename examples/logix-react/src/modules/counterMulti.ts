import { Schema } from "effect"
import { Logix } from "@logix/core"

const CounterStateSchema = Schema.Struct({
  count: Schema.Number,
})

const CounterActionMap = {
  increment: Schema.Void,
}

export const CounterMultiModule = Logix.Module("CounterMultiModule", {
  state: CounterStateSchema,
  actions: CounterActionMap,
})

export const CounterMultiLogic = CounterMultiModule.logic(($) =>
  $.onAction("increment").run(
    $.state.update((prev) => ({
      ...prev,
      count: prev.count + 1,
    })),
  ),
)

export const CounterMultiImpl = CounterMultiModule.make({
  initial: { count: 0 },
  logics: [CounterMultiLogic],
})

