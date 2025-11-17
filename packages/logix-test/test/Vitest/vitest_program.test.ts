import { Effect, Schema } from 'effect'
import { describe } from 'vitest'
import * as Logix from '@logix/core'
import { itProgram } from '../../src/vitest.js'

const Counter = Logix.Module.make('VitestProgramCounter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    inc: Schema.Void,
  },
})

const CounterLogic = Counter.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('inc').run(() => $.state.update((s) => ({ ...s, count: s.count + 1 })))
  }),
)

describe('@logix/test · vitest helpers', () => {
  itProgram(
    'itProgram should run program module and assert no errors',
    Counter.implement({
      initial: { count: 0 },
      logics: [CounterLogic],
    }),
    ($) => $.dispatch({ _tag: 'inc', payload: undefined }),
  )
})
