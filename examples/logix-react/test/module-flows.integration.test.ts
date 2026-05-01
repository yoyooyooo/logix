import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import { TestProgram } from '@logixjs/test'

import { CounterProgram } from '../src/modules/counter'
import { CounterMultiProgram } from '../src/modules/counterMulti'
import { StepCounterProgram } from '../src/modules/stepCounter'

describe('examples/logix-react · module flows (integration)', () => {
  it.effect('CounterProgram + CounterLogic · inc / dec sequence', () =>
    TestProgram.runProgram(CounterProgram, ($) =>
      Effect.gen(function* () {
        yield* $.dispatch({ _tag: 'inc', payload: undefined })
        yield* $.dispatch({ _tag: 'inc', payload: undefined })
        yield* $.dispatch({ _tag: 'dec', payload: undefined })

        yield* $.assert.state((s) => s.value === 1)
      }),
    ).pipe(
      Effect.tap((result) =>
        Effect.sync(() => {
          TestProgram.expectActionTag(result, 'inc')
          TestProgram.expectActionTag(result, 'dec', { times: 1 })
          TestProgram.expectNoError(result)
          expect(result.state.value).toBe(1)
        }),
      ),
    ),
  )

  it.effect('CounterMultiProgram · multiple increments', () =>
    TestProgram.runProgram(CounterMultiProgram, ($) =>
      Effect.gen(function* () {
        yield* $.dispatch({ _tag: 'increment', payload: undefined })
        yield* $.dispatch({ _tag: 'increment', payload: undefined })

        yield* $.assert.state((s) => s.count === 2)
      }),
    ).pipe(
      Effect.tap((result) =>
        Effect.sync(() => {
          TestProgram.expectActionTag(result, 'increment')
          TestProgram.expectNoError(result)
          expect(result.state.count).toBe(2)
        }),
      ),
    ),
  )

  it.effect('StepCounterProgram · inc once', () =>
    TestProgram.runProgram(StepCounterProgram, ($) =>
      Effect.gen(function* () {
        yield* $.dispatch({ _tag: 'inc', payload: undefined })
        yield* $.assert.state((s) => s.value === 1)
      }),
    ).pipe(
      Effect.tap((result) =>
        Effect.sync(() => {
          TestProgram.expectActionTag(result, 'inc', { times: 1 })
          TestProgram.expectNoError(result)
        }),
      ),
    ),
  )
})
