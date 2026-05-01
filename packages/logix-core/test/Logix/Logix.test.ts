import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

const State = Schema.Struct({
  count: Schema.Number,
})

const Actions = {
  inc: Schema.Void,
}

const TestModule = Logix.Module.make('LogixTestModule', {
  state: State,
  actions: Actions,
})

const TestLogic = TestModule.logic('inc', ($) =>
  Effect.gen(function* () {
    yield* $.onAction('inc').run(() => $.state.update((s) => ({ ...s, count: s.count + 1 })))
  }),
)

describe('Logix public barrel', () => {
  it.effect('should run the MPR-3 mainline formula via Module.logic -> Program.make -> Runtime.make', () =>
    Effect.gen(function* () {
      const programModule = Logix.Program.make(TestModule, {
        initial: { count: 0 },
        logics: [TestLogic],
      })

      const runtime = Logix.Runtime.make(programModule, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const test = yield* Effect.service(TestModule.tag).pipe(Effect.orDie)
        expect(test).toBeDefined()
        expect(yield* test.getState).toEqual({ count: 0 })
        yield* test.dispatch({ _tag: 'inc', payload: undefined })
        expect(yield* test.getState).toEqual({ count: 1 })
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

})
