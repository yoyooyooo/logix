import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Exit, Layer, Scope, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime.openProgram (US1)', () => {
  it.scoped('returns a booted ctx and disposes when the outer scope closes', () =>
    Effect.gen(function* () {
      let disposed = false

      const Root = Logix.Module.make('Runtime.openProgram.scoped', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: { bump: Schema.Void },
        reducers: {
          bump: Logix.Module.Reducer.mutate((draft) => {
            draft.value += 1
          }),
        },
      })

      const impl = Root.implement({
        initial: { value: 0 },
        logics: [],
      })

      const layer = Layer.scopedDiscard(
        Effect.addFinalizer(() =>
          Effect.sync(() => {
            disposed = true
          }),
        ),
      ) as unknown as Layer.Layer<any, never, never>

      const scope = yield* Scope.make()

      const ctx = yield* Logix.Runtime.openProgram(impl, {
        layer,
        handleSignals: false,
      }).pipe(Scope.extend(scope))

      yield* Effect.promise(() =>
        ctx.runtime.runPromise(
          Effect.gen(function* () {
            yield* ctx.module.dispatch({ _tag: 'bump', payload: undefined } as any)
            yield* Effect.sleep('10 millis')
            const state: any = yield* ctx.module.getState
            expect(state.value).toBe(1)
          }) as any,
        ),
      )

      yield* Scope.close(scope, Exit.void)
      expect(disposed).toBe(true)
    }),
  )
})
