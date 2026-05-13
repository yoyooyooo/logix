import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

export const makeCounterProgram = (moduleId = 'RuntimeRun.Fixture.Counter') => {
  const Root = Logix.Module.make(moduleId, {
    state: Schema.Struct({ count: Schema.Number }),
    actions: { inc: Schema.Void },
    reducers: {
      inc: Logix.Module.Reducer.mutate((draft) => {
        draft.count += 1
      }),
    },
  })

  return Logix.Program.make(Root, {
    initial: { count: 0 },
    logics: [],
  })
}

export const runCounterOnce = (program = makeCounterProgram()) =>
  Logix.Runtime.run(
    program,
    ({ module }) =>
      Effect.gen(function* () {
        yield* module.dispatch({ _tag: 'inc', payload: undefined } as any)
        const state = yield* module.getState
        return { count: state.count }
      }),
    {
      layer: Layer.empty as Layer.Layer<any, never, never>,
      handleSignals: false,
    },
  )
