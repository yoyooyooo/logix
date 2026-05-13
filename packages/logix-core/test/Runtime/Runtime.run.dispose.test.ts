import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime.run dispose (US1)', () => {
  it.effect('success path disposes runtime resources', () =>
    Effect.gen(function* () {
      let disposed = false

      const Root = Logix.Module.make('Runtime.run.dispose.success', {
        state: Schema.Void,
        actions: {},
      })

      const program = Logix.Program.make(Root, { initial: undefined, logics: [] })

      const layer = Layer.effectDiscard(Effect.addFinalizer(() =>
        Effect.sync(() => {
          disposed = true
        }),
      )) as unknown as Layer.Layer<any, never, never>

      yield* Effect.promise(() => Logix.Runtime.run(program, () => Effect.void, { layer, handleSignals: false }))

      expect(disposed).toBe(true)
    }),
  )

  it.effect('failure path disposes runtime resources', () =>
    Effect.gen(function* () {
      let disposed = false

      const Root = Logix.Module.make('Runtime.run.dispose.failure', {
        state: Schema.Void,
        actions: {},
      })

      const program = Logix.Program.make(Root, { initial: undefined, logics: [] })

      const layer = Layer.effectDiscard(Effect.addFinalizer(() =>
        Effect.sync(() => {
          disposed = true
        }),
      )) as unknown as Layer.Layer<any, never, never>

      const outcome = yield* Effect.exit(
        Effect.tryPromise({
          try: () =>
            Logix.Runtime.run(program, () => Effect.die(new Error('main failed')), { layer, handleSignals: false }),
          catch: (e) => e,
        }),
      )

      expect(outcome._tag).toBe('Failure')

      expect(disposed).toBe(true)
    }),
  )
})
