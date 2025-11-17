import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Deferred, Effect, Exit, Layer, Scope, Schema, TestClock } from 'effect'
import * as Logix from '../../src/index.js'
import * as ProcessRuntime from '../../src/internal/runtime/core/process/ProcessRuntime.js'

describe('process: moduleInstance dispose stops', () => {
  it.scoped('should stop moduleInstance process when scope is disposed', () =>
    Effect.gen(function* () {
      const stopped = yield* Deferred.make<void>()

      const Host = Logix.Module.make('ProcessModuleInstanceDisposeHost', {
        state: Schema.Void,
        actions: {},
      })

      const Proc = Logix.Process.make(
        'ProcessModuleInstanceDisposeStops',
        Effect.never.pipe(Effect.ensuring(Deferred.succeed(stopped, undefined).pipe(Effect.asVoid))),
      )

      const HostImpl = Host.implement({
        initial: undefined,
        processes: [Proc],
      })

      const layer = Layer.provideMerge(ProcessRuntime.layer())(HostImpl.impl.layer)

      const scope = yield* Scope.make()
      try {
        yield* Layer.buildWithScope(layer, scope)
        yield* TestClock.adjust('20 millis')
      } finally {
        yield* Scope.close(scope, Exit.succeed(undefined))
      }

      const result = yield* Deferred.await(stopped).pipe(
        Effect.timeoutFail({
          duration: '1 second',
          onTimeout: () => new Error('process did not stop after scope.close'),
        }),
        Effect.either,
      )

      expect(result._tag).toBe('Right')
    }),
  )
})
