import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'

const CounterAllStateSchema = Schema.Struct({
  value: Schema.Number,
})

const CounterAllActionMap = {
  inc: Schema.Void,
  dec: Schema.Void,
}

export const CounterAll = Logix.Module.make('CounterAllModule', {
  state: CounterAllStateSchema,
  actions: CounterAllActionMap,
})

// 使用 Effect.all + 并发选项挂两条监听，作为 run 模式的对照示例。
export const CounterAllLogic = CounterAll.logic('counter-all-logic', ($) =>
  Effect.gen(function* () {
    yield* Effect.all(
      [
        $.onAction('inc').run(
          $.state.update((prev) => ({
            ...prev,
            value: prev.value + 1,
          })),
        ),
        $.onAction('dec').run(
          $.state.update((prev) => ({
            ...prev,
            value: prev.value - 1,
          })),
        ),
      ],
      { concurrency: 'unbounded' },
    )
  }),
)

export const CounterAllProgram = Logix.Program.make(CounterAll, {
  initial: { value: 0 },
  logics: [CounterAllLogic],
})
