import { describe, expect, it } from '@effect/vitest'
import { Deferred, Effect, Schema } from 'effect'
import * as Logix from '../../../src/index.js'

describe('ModuleRuntime returned run effect readiness boundary', () => {
  it.effect('does not block ready status on a long-lived returned run effect', () =>
    Effect.gen(function* () {
      const runStarted = yield* Deferred.make<void>()

      const Module = Logix.Module.make('ModuleRuntime.RunDoesNotBlockReady', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: {},
      })

      const logic = Module.logic('long-lived-run', () =>
        Deferred.succeed(runStarted, undefined).pipe(Effect.flatMap(() => Effect.never)),
      )

      const runtime = Logix.Runtime.make(
        Logix.Program.make(Module, {
          initial: { value: 0 },
          logics: [logic],
        }),
      )

      try {
        const moduleRuntime = yield* Effect.promise(() => runtime.runPromise(Effect.service(Module.tag).pipe(Effect.orDie)))
        yield* Deferred.await(runStarted)
        expect((yield* moduleRuntime.lifecycleStatus!).status).toBe('ready')
      } finally {
        yield* runtime.disposeEffect
      }
    }),
  )
})
