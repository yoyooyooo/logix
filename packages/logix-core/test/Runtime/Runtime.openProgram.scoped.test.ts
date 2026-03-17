import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Exit, Layer, Scope, Schema, ServiceMap } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime.openProgram (US1)', () => {
  it.effect('returns a booted ctx and disposes when the outer scope closes', () =>
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

      const DummyTag = ServiceMap.Service<{}>('@test/Runtime.openProgram.scoped/Dummy')
      const layer = Layer.effect(
        DummyTag,
        Effect.acquireRelease(
          Effect.succeed({}),
          () =>
            Effect.sync(() => {
              disposed = true
            }),
        ),
      ) as unknown as Layer.Layer<any, never, never>

      const scope = yield* Scope.make()

      const ctx = yield* Scope.provide(scope)(
        Logix.Runtime.openProgram(impl, {
          layer,
          handleSignals: false,
        }),
      )

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

      yield* Effect.promise(() => ctx.runtime.dispose())
      expect(disposed).toBe(true)
    }),
  )
})
