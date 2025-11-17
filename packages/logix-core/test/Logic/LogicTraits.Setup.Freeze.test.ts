import { describe, it, expect } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('LogicTraits (setup) - freeze / phase guard', () => {
  it('should reject $.traits.declare in run phase', async () => {
    const State = Schema.Struct({
      value: Schema.Number,
      sum: Schema.Number,
      errorCount: Schema.Number,
    })

    const Actions = {
      noop: Schema.Void,
    }

    const M = Logix.Module.make('LogicTraitsFreezeRunPhase', {
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
        setup: Effect.void,
        run: Effect.gen(function* () {
          try {
            $.traits.declare(traits)
          } catch {
            yield* $.state.mutate((draft) => {
              ;(draft as any).errorCount += 1
            })
          }
        }),
      }),
      { id: 'L#run' },
    )

    const Impl = M.implement({
      initial: { value: 1, sum: 0, errorCount: 0 },
      logics: [L],
    })

    const runtime = Logix.Runtime.make(Impl, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    const readErrorCount = Effect.gen(function* () {
      const rt = yield* M.tag
      // 给 fork 的 run fiber 一次调度机会（ModuleRuntime.make 末尾也会 yieldNow，但这里更稳一点）
      yield* Effect.yieldNow()
      const state = yield* rt.getState
      return (state as any).errorCount as number
    }) as Effect.Effect<number, never, any>

    try {
      expect(await runtime.runPromise(readErrorCount)).toBe(1)
    } finally {
      await runtime.dispose()
    }
  })
})
