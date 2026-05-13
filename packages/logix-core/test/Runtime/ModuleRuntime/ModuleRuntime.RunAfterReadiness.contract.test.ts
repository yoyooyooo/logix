import { describe, expect, it } from '@effect/vitest'
import { Deferred, Effect, Fiber, Ref, Schema } from 'effect'
import * as Logix from '../../../src/index.js'

describe('ModuleRuntime returned run effect after readiness', () => {
  it.effect('starts the returned run effect only after $.readyAfter requirements succeed', () =>
    Effect.gen(function* () {
      const events = yield* Ref.make<Array<string>>([])
      const releaseReady = yield* Deferred.make<void>()
      const runStarted = yield* Deferred.make<void>()

      const Module = Logix.Module.make('ModuleRuntime.RunAfterReadiness', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: {},
      })

      const logic = Module.logic('run-after-readiness', ($) => {
        $.readyAfter(
          Effect.gen(function* () {
            yield* Ref.update(events, (items) => [...items, 'ready:start'])
            yield* Deferred.await(releaseReady)
            yield* Ref.update(events, (items) => [...items, 'ready:end'])
          }),
          { id: 'gate' },
        )

        return Effect.gen(function* () {
          yield* Ref.update(events, (items) => [...items, 'run'])
          yield* Deferred.succeed(runStarted, undefined)
        })
      })

      const runtime = Logix.Runtime.make(
        Logix.Program.make(Module, {
          initial: { value: 0 },
          logics: [logic],
        }),
      )

      try {
        const fiber = yield* Effect.forkScoped(
          Effect.promise(() => runtime.runPromise(Effect.service(Module.tag).pipe(Effect.orDie))),
        )
        yield* Effect.yieldNow

        expect(yield* Ref.get(events)).toEqual(['ready:start'])
        expect(yield* Deferred.poll(runStarted)).toBeUndefined()

        yield* Deferred.succeed(releaseReady, undefined)
        yield* Fiber.await(fiber)
        yield* Deferred.await(runStarted)

        expect(yield* Ref.get(events)).toEqual(['ready:start', 'ready:end', 'run'])
      } finally {
        yield* runtime.disposeEffect
      }
    }),
  )
})
