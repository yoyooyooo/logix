import { describe, it, expect } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('LogicTraits (setup) - remove logic', () => {
  it('should not retain traits after removing the contributing logic', async () => {
    const State = Schema.Struct({
      value: Schema.Number,
      sum: Schema.Number,
    })

    const Actions = {
      noop: Schema.Void,
    }

    const M = Logix.Module.make('LogicTraitsRemoveLogic', {
      state: State,
      actions: Actions,
    })

    const traits = Logix.StateTrait.from(State)({
      sum: Logix.StateTrait.computed({
        deps: ['value'],
        get: (value) => value,
      }),
    })

    const WithTrait = M.logic(
      ($) => ({
        setup: Effect.sync(() => {
          $.traits.declare(traits)
        }),
        run: Effect.void,
      }),
      { id: 'L#traits' },
    )

    const ImplA = M.implement({
      initial: { value: 1, sum: 0 },
      logics: [WithTrait],
    })

    const ImplB = M.implement({
      initial: { value: 1, sum: 0 },
      logics: [],
    })

    const readFinalTraits = Effect.gen(function* () {
      const rt = yield* M.tag
      return Logix.Debug.getModuleFinalTraits(rt).map((t) => t.traitId)
    }) as Effect.Effect<ReadonlyArray<string>, never, any>

    const runtimeA = Logix.Runtime.make(ImplA, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })
    const runtimeB = Logix.Runtime.make(ImplB, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    try {
      expect(await runtimeA.runPromise(readFinalTraits)).toEqual(['sum'])
      expect(await runtimeB.runPromise(readFinalTraits)).toEqual([])
    } finally {
      await runtimeA.dispose()
      await runtimeB.dispose()
    }
  })
})
