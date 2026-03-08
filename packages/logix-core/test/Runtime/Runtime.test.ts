import { describe } from '@effect/vitest'
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
  it.effect('should run a simple ModuleImpl program', () =>
    Effect.gen(function* () {
      const impl = RootModule.implement({
        initial: { value: 0 },
        logics: [RootLogic],
      })

      const runtime = Logix.Runtime.make(impl, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(RootModule.tag).pipe(Effect.orDie)

        yield* rt.dispatch({ _tag: 'bump', payload: undefined })
        yield* rt.dispatch({ _tag: 'bump', payload: undefined })

        // Wait briefly to give background watchers a chance to process actions.
        yield* Effect.sleep('10 millis')

        const state = yield* rt.getState
        expect(state.value).toBeGreaterThan(0)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
