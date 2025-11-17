import { describe, it, expect } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('LogicTraits (setup) - declare', () => {
  it('should register declared traits with logicUnit provenance', async () => {
    const State = Schema.Struct({
      value: Schema.Number,
      sum: Schema.Number,
    })

    const Actions = {
      noop: Schema.Void,
    }

    const M = Logix.Module.make('LogicTraitsSetupDeclare', {
      state: State,
      actions: Actions,
    })

    const traits = Logix.StateTrait.from(State)({
      sum: Logix.StateTrait.computed({
        deps: ['value'],
        get: (value) => value,
      }),
    })

    const L = M.logic(
      ($) => ({
        setup: Effect.sync(() => {
          $.traits.declare(traits)
        }),
        run: Effect.void,
      }),
      { id: 'L#declare' },
    )

    const Impl = M.implement({
      initial: { value: 1, sum: 0 },
      logics: [L],
    })

    const runtime = Logix.Runtime.make(Impl, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    const readFinalTraits = Effect.gen(function* () {
      const rt = yield* M.tag
      return Logix.Debug.getModuleFinalTraits(rt)
    }) as Effect.Effect<ReadonlyArray<Logix.Debug.ModuleTraitsFinalItem>, never, any>

    try {
      const finalTraits = await runtime.runPromise(readFinalTraits)

      expect(finalTraits.map((t) => t.traitId)).toEqual(['sum'])
      expect(finalTraits[0]?.provenance.originType).toBe('logicUnit')
      expect(finalTraits[0]?.provenance.originId).toBe('L#declare')
      expect(finalTraits[0]?.provenance.originIdKind).toBe('explicit')
    } finally {
      await runtime.dispose()
    }
  })
})
