import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

const RootState = Schema.Struct({ value: Schema.Number })
const RootActions = { bump: Schema.Void }

const RootModule = Logix.Module.make('RuntimeRoot', {
  state: RootState,
  actions: RootActions,
})

const RootLogic = RootModule.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('bump').run(() =>
      $.state.update((s) => ({
        ...s,
        value: s.value + 1,
      })),
    )
  }),
)

describe('Runtime.make (public API)', () => {
  it.scoped('should run a simple ModuleImpl program', () =>
    Effect.gen(function* () {
      const impl = RootModule.implement({
        initial: { value: 0 },
        logics: [RootLogic],
      })

      const runtime = Logix.Runtime.make(impl, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* RootModule.tag

        yield* rt.dispatch({ _tag: 'bump', payload: undefined })
        yield* rt.dispatch({ _tag: 'bump', payload: undefined })

        // 稍作等待，让后台 watcher 有机会处理 Action
        yield* Effect.sleep('10 millis')

        const state = yield* rt.getState
        expect(state.value).toBeGreaterThan(0)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
