import { describe, it, expect } from '@effect/vitest'
import { Deferred, Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('process: app-scope dispose stops', () => {
  it.scoped('should stop app-scope process when runtime is disposed', () =>
    Effect.gen(function* () {
      const stopped = yield* Deferred.make<void>()

      const RootModule = Logix.Module.make('ProcessAppScopeDisposeRoot', {
        state: Schema.Void,
        actions: {},
      })

      const Process = Logix.Process.make(
        'ProcessAppScopeDisposeStops',
        Effect.never.pipe(Effect.ensuring(Deferred.succeed(stopped, undefined).pipe(Effect.asVoid))),
      )

      const RootImpl = RootModule.implement({
        initial: undefined,
        processes: [Process],
      })

      const runtime = Logix.Runtime.make(RootImpl, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      yield* Effect.promise(() => runtime.runPromise(Effect.void as any))
      yield* Effect.promise(() => runtime.dispose())

      const result = yield* Deferred.await(stopped).pipe(
        Effect.timeoutFail({
          duration: '1 second',
          onTimeout: () => new Error('process did not stop after runtime.dispose'),
        }),
        Effect.either,
      )

      expect(result._tag).toBe('Right')
    }),
  )
})
