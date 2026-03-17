import { describe, it, expect } from '@effect/vitest'
import { Deferred, Effect, Exit, Layer, Scope, Schema, ServiceMap } from 'effect'
import { TestClock } from 'effect/testing'
import * as Logix from '../../src/index.js'
import * as ProcessRuntime from '../../src/internal/runtime/core/process/ProcessRuntime.js'

describe('process: moduleInstance dispose stops', () => {
  it.effect('should stop moduleInstance process when scope is disposed', () =>
    Effect.gen(function* () {
      const started = yield* Deferred.make<void>()
      const stopped = yield* Deferred.make<void>()

      const Host = Logix.Module.make('ProcessModuleInstanceDisposeHost', {
        state: Schema.Void,
        actions: {},
      })

      const Proc = Logix.Process.make(
        'ProcessModuleInstanceDisposeStops',
        Deferred.succeed(started, undefined).pipe(
          Effect.asVoid,
          Effect.flatMap(() => Effect.never),
          Effect.ensuring(Effect.uninterruptible(Deferred.succeed(stopped, undefined).pipe(Effect.asVoid))),
        ),
      )

      const HostImpl = Host.implement({
        initial: undefined,
        processes: [Proc],
      })

      const layer = Layer.provideMerge(ProcessRuntime.layer())(HostImpl.impl.layer)

      const scope = yield* Scope.make()
      try {
        const env = yield* Layer.buildWithScope(layer, scope)
        ServiceMap.get(env as ServiceMap.ServiceMap<any>, Host.tag as any)
        yield* TestClock.adjust('20 millis')

        yield* Effect.promise(() => Effect.runPromise(Deferred.await(started)))
      } finally {
        yield* Scope.close(scope, Exit.succeed(undefined))
      }

      yield* Effect.promise(
        () =>
          Promise.race([
            Effect.runPromise(Deferred.await(stopped)),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('process did not stop after scope.close')), 1000)),
          ]),
      )
    }),
  )
})
