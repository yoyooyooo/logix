import { describe } from 'vitest'
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

describe('Logix public barrel', () => {
  it.scoped('should construct a runtime from ModuleImpl via Runtime.make', () =>
    Effect.gen(function* () {
      const impl = TestModule.implement({
        initial: { count: 0 },
      })

      const runtime = Logix.Runtime.make(impl, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const test = yield* TestModule.tag
        expect(test).toBeDefined()
        expect(yield* test.getState).toEqual({ count: 0 })
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  it('should expose Link.make as Effect factory', () => {
    const link = Logix.Link.make(
      {
        modules: [TestModule] as const,
      },
      () => Effect.void,
    )
    expect(Effect.isEffect(link)).toBe(true)
  })
})
