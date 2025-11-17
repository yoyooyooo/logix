import { describe, it, expect } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime.make(Module)', () => {
  it('should accept Module and unwrap to module.impl', async () => {
    const Counter = Logix.Module.make('RuntimeMakeModuleCounter', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { noop: Schema.Void },
    })

    const CounterModule = Counter.implement({
      initial: { count: 1 },
      logics: [],
    })

    const runtimeA = Logix.Runtime.make(CounterModule.impl, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })
    const runtimeB = Logix.Runtime.make(CounterModule, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    const readCount = Effect.gen(function* () {
      const rt = yield* Counter.tag
      return (yield* rt.getState).count
    }) as Effect.Effect<number, never, any>

    try {
      expect(await runtimeA.runPromise(readCount)).toBe(1)
      expect(await runtimeB.runPromise(readCount)).toBe(1)
    } finally {
      await runtimeA.dispose()
      await runtimeB.dispose()
    }
  })
})
