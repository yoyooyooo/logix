import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Deferred, Effect, Exit, PubSub, Queue, Scope } from 'effect'
import * as ModuleRuntime from '../../../../src/internal/runtime/ModuleRuntime.js'

describe('ConcurrencyPolicy (US1): ModuleRuntime.destroy should cancel in-flight fibers', () => {
  it('closing the runtime scope should interrupt in-flight action handlers', async () => {
    const program = Effect.gen(function* () {
      const scope = yield* Scope.make()

      const started = yield* Deferred.make<void>()
      const interrupted = yield* Deferred.make<void>()

      const actionHub = yield* PubSub.unbounded<any>()
      const runtime = yield* Scope.extend(
        ModuleRuntime.make(
          { count: 0 } as any,
          {
            moduleId: 'DestroyCancelsInFlight',
            createActionHub: Effect.succeed(actionHub),
          } as any,
        ),
        scope,
      )

      // Start a "long-running" handler inside the scope so destroy will interrupt it.
      yield* Scope.extend(
        Effect.forkScoped(
          Effect.gen(function* () {
            const subscription = yield* PubSub.subscribe(actionHub)
            const action = yield* Queue.take(subscription)
            expect((action as any)?._tag).toBe('inc')

            yield* Deferred.succeed(started, undefined)

            // Long duration: rely on interruption to terminate.
            yield* Effect.sleep('30 seconds')
          }).pipe(Effect.onInterrupt(() => Deferred.succeed(interrupted, undefined).pipe(Effect.asVoid))),
        ),
        scope,
      )

      // Trigger once to start the handler.
      yield* runtime.dispatch({ _tag: 'inc', payload: undefined } as any)
      yield* Deferred.await(started)

      // Destroy: close the scope and wait for the handler to be interrupted.
      yield* Scope.close(scope, Exit.succeed(undefined))
      yield* Deferred.await(interrupted)
    })

    await Effect.runPromise(program as any)
  })
})
