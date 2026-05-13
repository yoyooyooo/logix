import { Effect, Schema } from "effect"
import * as Logix from "@logixjs/core"
import { counterStep } from "./logic/localCounter.logic"

const Counter = Logix.Module.make("PlaygroundLocalCounter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
    decrement: Schema.Void,
  },
  reducers: {
    increment: Logix.Module.Reducer.mutate((draft) => {
      draft.count += counterStep
    }),
    decrement: Logix.Module.Reducer.mutate((draft) => {
      draft.count -= counterStep
    }),
  },
})

export const Program = Logix.Program.make(Counter, {
  initial: { count: 0 },
  logics: [],
})

export const main = (ctx: Logix.Runtime.ProgramRunContext<typeof Counter.shape>) =>
  Effect.gen(function* () {
    yield* ctx.module.dispatch({ _tag: "increment", payload: undefined })
    const state = yield* ctx.module.getState
    return { count: state.count }
  })
