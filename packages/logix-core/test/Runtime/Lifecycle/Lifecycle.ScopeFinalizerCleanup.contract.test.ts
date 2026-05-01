import { describe, expect, it } from '@effect/vitest'
import { Effect, Ref, Schema } from 'effect'
import * as Logix from '../../../src/index.js'

describe('Runtime Scope finalizer cleanup', () => {
  it.effect('releases dynamic resources through Effect.acquireRelease on runtime dispose', () =>
    Effect.gen(function* () {
      const events = yield* Ref.make<Array<string>>([])

      const Module = Logix.Module.make('Lifecycle.ScopeFinalizerCleanup', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: {},
      })

      const logic = Module.logic('scoped-resource', () =>
        Effect.acquireRelease(
          Ref.update(events, (items) => [...items, 'acquire']),
          () => Ref.update(events, (items) => [...items, 'release']),
        ).pipe(Effect.flatMap(() => Effect.never)),
      )

      const runtime = Logix.Runtime.make(
        Logix.Program.make(Module, {
          initial: { value: 0 },
          logics: [logic],
        }),
      )

      const moduleRuntime = yield* Effect.promise(() => runtime.runPromise(Effect.service(Module.tag).pipe(Effect.orDie)))
      expect((yield* moduleRuntime.lifecycleStatus!).status).toBe('ready')

      yield* Effect.yieldNow
      expect(yield* Ref.get(events)).toEqual(['acquire'])

      yield* runtime.disposeEffect
      expect(yield* Ref.get(events)).toEqual(['acquire', 'release'])
    }),
  )
})
