import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

const StateSchema = Schema.Struct({
  count: Schema.Number,
})

const FlowModule = Logix.Module.make('IntentBuilderRunConfigTypecheck', {
  state: StateSchema,
  actions: {
    start: Schema.Number,
  },
})

const logic = FlowModule.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('start').run({
      mode: 'latest',
      effect: (action) =>
        $.state.update((state) => ({
          ...state,
          count: state.count + action.payload,
        })),
      options: {
        tags: ['typecheck'],
      },
    })

    yield* $.onAction('start').run({
      effect: Effect.void,
    })

    // @ts-expect-error mode only accepts task | parallel | latest | exhaust
    yield* $.onAction('start').run({ mode: 'invalid', effect: Effect.void })
  }),
)

void logic
