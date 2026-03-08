import { describe, it, expect } from '@effect/vitest'
import { Deferred, Effect, Exit, Layer, Schema, ServiceMap } from 'effect'
import * as Logix from '../../src/index.js'
import * as ProcessRuntime from '../../src/internal/runtime/core/process/ProcessRuntime.js'

describe('process: app-scope dispose stops', () => {
  it.effect('should stop app-scope process when runtime is disposed', () =>
    Effect.gen(function* () {
      const started = yield* Deferred.make<void>()
      const stopped = yield* Deferred.make<void>()

      const RootModule = Logix.Module.make('ProcessAppScopeDisposeRoot', {
        state: Schema.Void,
        actions: {},
      })

      const Process = Logix.Process.make(
        'ProcessAppScopeDisposeStops',
        Deferred.succeed(started, undefined).pipe(
          Effect.asVoid,
          Effect.flatMap(() => Effect.never),
          Effect.ensuring(Effect.uninterruptible(Deferred.succeed(stopped, undefined).pipe(Effect.asVoid))),
        ),
      )

      const RootImpl = RootModule.implement({
        initial: undefined,
        processes: [Process],
      })

      const runtime = Logix.Runtime.make(RootImpl, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      yield* Effect.promise(() => runtime.runPromise(Effect.service(RootModule.tag).pipe(Effect.orDie) as any))
      yield* Effect.promise(() => Effect.runPromise(Deferred.await(started)))
      yield* Effect.promise(() => runtime.dispose())

      yield* Effect.promise(
        () =>
          Promise.race([
            Effect.runPromise(Deferred.await(stopped)),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('process did not stop after runtime.dispose')), 5000)),
          ]),
      )
    }),
  )
})
