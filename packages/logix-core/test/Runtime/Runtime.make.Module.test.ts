import { describe, it, expect } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime.make(Program)', () => {
  it('should accept Program and resolve its internal runtime blueprint', async () => {
    const Counter = Logix.Module.make('RuntimeMakeModuleCounter', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { noop: Schema.Void },
    })

    const CounterProgram = Logix.Program.make(Counter, {
      initial: { count: 1 },
      logics: [],
    })

    const runtime = Logix.Runtime.make(CounterProgram, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    const readCount = Effect.gen(function* () {
      const rt = yield* Effect.service(Counter.tag).pipe(Effect.orDie)
      return (yield* rt.getState).count
    }) as Effect.Effect<number, never, any>

    try {
      expect(await runtime.runPromise(readCount)).toBe(1)
    } finally {
      await runtime.dispose()
    }
  })
})
