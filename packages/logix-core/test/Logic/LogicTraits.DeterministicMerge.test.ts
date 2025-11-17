import { describe, it, expect } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('LogicTraits - deterministic merge', () => {
  it('should produce identical final traits for different mount order', async () => {
    const State = Schema.Struct({
      a: Schema.Number,
      b: Schema.Number,
      sumA: Schema.Number,
      sumB: Schema.Number,
    })

    const Actions = {
      noop: Schema.Void,
    }

    const M = Logix.Module.make('LogicTraitsDeterministicMerge', {
      state: State,
      actions: Actions,
    })

    const traitsA = Logix.StateTrait.from(State)({
      sumA: Logix.StateTrait.computed({
        deps: ['a'],
        get: (a) => a,
      }),
    })

    const traitsB = Logix.StateTrait.from(State)({
      sumB: Logix.StateTrait.computed({
        deps: ['b'],
        get: (b) => b,
      }),
    })

    const LA = M.logic(
      ($) => ({
        setup: Effect.sync(() => {
          $.traits.declare(traitsA)
        }),
        run: Effect.void,
      }),
      { id: 'L#A' },
    )

    const LB = M.logic(
      ($) => ({
        setup: Effect.sync(() => {
          $.traits.declare(traitsB)
        }),
        run: Effect.void,
      }),
      { id: 'L#B' },
    )

    const initial = { a: 1, b: 2, sumA: 0, sumB: 0 }

    const Impl1 = M.implement({
      initial,
      logics: [LA, LB],
    })

    const Impl2 = M.implement({
      initial,
      logics: [LB, LA],
    })

    const runtime1 = Logix.Runtime.make(Impl1, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })
    const runtime2 = Logix.Runtime.make(Impl2, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    const readFinalTraits = Effect.gen(function* () {
      const rt = yield* M.tag
      return Logix.Debug.getModuleFinalTraits(rt)
    }) as Effect.Effect<ReadonlyArray<Logix.Debug.ModuleTraitsFinalItem>, never, any>

    try {
      const a = await runtime1.runPromise(readFinalTraits)
      const b = await runtime2.runPromise(readFinalTraits)
      expect(a).toEqual(b)
    } finally {
      await runtime1.dispose()
      await runtime2.dispose()
    }
  })
})
