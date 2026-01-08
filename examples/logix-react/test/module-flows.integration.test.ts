import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import { TestProgram, Execution } from '@logixjs/test'

import { CounterImpl } from '../src/modules/counter'
import { CounterMultiImpl } from '../src/modules/counterMulti'
import { StepCounterImpl } from '../src/modules/stepCounter'

describe('examples/logix-react · module flows (integration)', () => {
  it.scoped('CounterModule + CounterLogic · inc / dec sequence', () =>
    TestProgram.runProgram(CounterImpl, ($) =>
      Effect.gen(function* () {
        yield* $.dispatch({ _tag: 'inc', payload: undefined })
        yield* $.dispatch({ _tag: 'inc', payload: undefined })
        yield* $.dispatch({ _tag: 'dec', payload: undefined })

        yield* $.assert.state((s) => s.value === 1)
      }),
    ).pipe(
      Effect.tap((result) =>
        Effect.sync(() => {
          Execution.expectActionTag(result, 'inc')
          Execution.expectActionTag(result, 'dec', { times: 1 })
          Execution.expectNoError(result)
          expect(result.state.value).toBe(1)
        }),
      ),
    ),
  )

  it.scoped('CounterMultiModule · multiple increments', () =>
    TestProgram.runProgram(CounterMultiImpl, ($) =>
      Effect.gen(function* () {
        yield* $.dispatch({ _tag: 'increment', payload: undefined })
        yield* $.dispatch({ _tag: 'increment', payload: undefined })

        yield* $.assert.state((s) => s.count === 2)
      }),
    ).pipe(
      Effect.tap((result) =>
        Effect.sync(() => {
          Execution.expectActionTag(result, 'increment')
          Execution.expectNoError(result)
          expect(result.state.count).toBe(2)
        }),
      ),
    ),
  )

  it.scoped('StepCounterModule · inc once', () =>
    TestProgram.runProgram(StepCounterImpl, ($) =>
      Effect.gen(function* () {
        yield* $.dispatch({ _tag: 'inc', payload: undefined })
        yield* $.assert.state((s) => s.value === 1)
      }),
    ).pipe(
      Effect.tap((result) =>
        Effect.sync(() => {
          Execution.expectActionTag(result, 'inc', { times: 1 })
          Execution.expectNoError(result)
        }),
      ),
    ),
  )
})
