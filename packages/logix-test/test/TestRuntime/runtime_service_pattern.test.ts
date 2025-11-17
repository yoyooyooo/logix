import { describe, it, expect } from 'vitest'
import { Effect, Schema, TestClock } from 'effect'
import * as Logix from '@logix/core'
import { runTest } from '../../src/TestRuntime.js'
import * as TestProgram from '../../src/TestProgram.js'

const Counter = Logix.Module.make('RuntimeAsService.Counter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { inc: Schema.Void },
})

const CounterLogic = Counter.logic(($) =>
  Effect.gen(function* () {
    const t1 = yield* TestClock.currentTimeMillis
    yield* Effect.log(`LOGIC TIME 1: ${t1}`)

    yield* $.onAction('inc').runParallel(
      Effect.gen(function* () {
        const t2 = yield* TestClock.currentTimeMillis
        yield* Effect.log(`LOGIC TIME 2: ${t2}`)
        yield* $.state.update((s) => ({ ...s, count: s.count + 1 }))
      }),
    )
  }),
)

describe('Runtime as Service Prototype', () => {
  it('should share TestClock and handle concurrency', async () => {
    const program = Counter.implement({
      initial: { count: 0 },
      logics: [CounterLogic],
    })

    const result = await runTest(
      TestProgram.runProgram(program.impl, (api) =>
        Effect.gen(function* () {
          // Give the logic-side watcher a startup window.
          yield* api.advance('10 millis')

          yield* api.dispatch({ _tag: 'inc', payload: undefined })
          yield* api.advance('10 millis')
        }),
      ),
    )

    expect(result.state.count).toBe(1)
    expect(result.actions).toEqual([{ _tag: 'inc', payload: undefined }])
  })
})
