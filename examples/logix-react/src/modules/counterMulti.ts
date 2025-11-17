import { Effect, Schema } from 'effect'
import * as Logix from '@logix/core'

const CounterStateSchema = Schema.Struct({
  count: Schema.Number,
})

const CounterActionMap = {
  increment: Schema.Void,
}

export const CounterMultiDef = Logix.Module.make('CounterMultiModule', {
  state: CounterStateSchema,
  actions: CounterActionMap,
})

export const CounterMultiLogic = CounterMultiDef.logic(($) => ({
  setup: Effect.void,
  run: Effect.gen(function* () {
    // 在 run 段挂载 watcher，避免触发 Phase Guard
    yield* $.onAction('increment').run(
      $.state.update((prev) => ({
        ...prev,
        count: prev.count + 1,
      })),
    )
  }),
}))

export const CounterMultiModule = CounterMultiDef.implement({
  initial: { count: 0 },
  logics: [CounterMultiLogic],
})

export const CounterMultiImpl = CounterMultiModule.impl
