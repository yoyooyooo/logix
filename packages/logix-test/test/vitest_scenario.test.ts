import { Effect, Schema } from 'effect'
import { describe } from 'vitest'
import * as Logix from '@logix/core'
import { itScenario } from '../src/index.js'

const Counter = Logix.Module.make('VitestScenarioCounter', {
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
  itScenario(
    'itScenario should run TestProgram scenario and assert no errors',
    {
      main: {
        module: Counter,
        initial: { count: 0 },
        logics: [CounterLogic],
      },
    },
    ($) =>
      // 这里只验证 itScenario 能正确跑通 TestProgram 管道，
      // 具体状态断言留给 ExecutionResult 或 TestApi.assert 在业务侧使用。
      $.dispatch({ _tag: 'inc', payload: undefined }),
  )
})
