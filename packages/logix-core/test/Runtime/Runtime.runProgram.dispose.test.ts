import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Either, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime.runProgram dispose (US1)', () => {
  it.scoped('success path disposes runtime resources', () =>
    Effect.gen(function* () {
      let disposed = false

      const Root = Logix.Module.make('Runtime.runProgram.dispose.success', {
        state: Schema.Void,
        actions: {},
      })

      const impl = Root.implement({ initial: undefined, logics: [] })

      const layer = Layer.scopedDiscard(
        Effect.addFinalizer(() =>
          Effect.sync(() => {
            disposed = true
          }),
        ),
      ) as unknown as Layer.Layer<any, never, never>

      yield* Effect.promise(() => Logix.Runtime.runProgram(impl, () => Effect.void, { layer, handleSignals: false }))

      expect(disposed).toBe(true)
    }),
  )

  it.scoped('failure path disposes runtime resources', () =>
    Effect.gen(function* () {
      let disposed = false

      const Root = Logix.Module.make('Runtime.runProgram.dispose.failure', {
        state: Schema.Void,
        actions: {},
      })

      const impl = Root.implement({ initial: undefined, logics: [] })

      const layer = Layer.scopedDiscard(
        Effect.addFinalizer(() =>
          Effect.sync(() => {
            disposed = true
          }),
        ),
      ) as unknown as Layer.Layer<any, never, never>

      const outcome = yield* Effect.tryPromise({
        try: () =>
          Logix.Runtime.runProgram(impl, () => Effect.dieMessage('main failed'), { layer, handleSignals: false }),
        catch: (e) => e,
      }).pipe(Effect.either)

      expect(Either.isLeft(outcome)).toBe(true)

      expect(disposed).toBe(true)
    }),
  )
})
