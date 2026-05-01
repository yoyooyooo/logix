import { Effect, Schema } from "effect"
import * as Logix from "@logixjs/core"

const Project = Logix.Module.make("PlaygroundNewProject", {
  state: Schema.Struct({ ready: Schema.Boolean }),
  actions: {
    start: Schema.Void,
  },
  reducers: {
    start: Logix.Module.Reducer.mutate((draft) => {
      draft.ready = true
    }),
  },
})

export const Program = Logix.Program.make(Project, {
  initial: { ready: false },
  logics: [],
})

export const main = (ctx: Logix.Runtime.ProgramRunContext<typeof Project.shape>) =>
  Effect.gen(function* () {
    yield* ctx.module.dispatch({ _tag: "start", payload: undefined })
    const state = yield* ctx.module.getState
    return { ready: state.ready }
  })
