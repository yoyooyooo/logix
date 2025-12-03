import { Effect, Schema } from "effect"
import { Logix } from "@logix/core"

const CounterAllStateSchema = Schema.Struct({
  value: Schema.Number,
})

const CounterAllActionMap = {
  inc: Schema.Void,
  dec: Schema.Void,
}

export const CounterAllModule = Logix.Module("CounterAllModule", {
  state: CounterAllStateSchema,
  actions: CounterAllActionMap,
})

// 使用 Effect.all + 并发选项挂两条监听，作为 run 模式的对照示例。
export const CounterAllLogic = CounterAllModule.logic(($) =>
  Effect.all(
    [
      $.onAction("inc").run(
        $.state.update((prev) => ({
          ...prev,
          value: prev.value + 1,
        })),
      ),
      $.onAction("dec").run(
        $.state.update((prev) => ({
          ...prev,
          value: prev.value - 1,
        })),
      ),
    ],
    { concurrency: "unbounded" },
  ),
)

export const CounterAllImpl = CounterAllModule.make({
  initial: { value: 0 },
  logics: [CounterAllLogic],
})

