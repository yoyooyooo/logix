import { describe, it, expect } from '@effect/vitest'
import { Context, Effect, Exit, Layer, Ref, Scope, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as ProcessRuntime from '../../src/internal/runtime/core/process/ProcessRuntime.js'

describe('process: trigger platformEvent', () => {
  it.scoped('should run when platform event is delivered via InternalContracts', () =>
    Effect.gen(function* () {
      const invoked = yield* Ref.make(0)

      const Host = Logix.Module.make('ProcessTriggerPlatformEventHost', {
        state: Schema.Void,
        actions: {},
      })

      const Proc = Logix.Process.make(
        {
          processId: 'ProcessTriggerPlatformEvent',
          triggers: [{ kind: 'platformEvent', platformEvent: 'app:test' }],
          concurrency: { mode: 'serial', maxQueue: 16 },
          errorPolicy: { mode: 'failStop' },
          diagnosticsLevel: 'off',
        },
        Ref.update(invoked, (n) => n + 1).pipe(Effect.asVoid),
      )

      const HostImpl = Host.implement({
        initial: undefined,
        processes: [Proc],
      })

      const layer = Layer.provideMerge(ProcessRuntime.layer())(HostImpl.impl.layer)

      const scope = yield* Scope.make()
      try {
        const env = yield* Layer.buildWithScope(layer, scope)
        // Ensure ProcessRuntime is available for InternalContracts
        Context.get(env as Context.Context<any>, ProcessRuntime.ProcessRuntimeTag as any)

        yield* Effect.provide(
          Logix.InternalContracts.deliverProcessPlatformEvent({
            eventName: 'app:test',
            payload: { ok: true },
          } as any),
          env as Context.Context<any>,
        )

        for (let i = 0; i < 100; i++) {
          if ((yield* Ref.get(invoked)) === 1) break
          yield* Effect.yieldNow()
        }
      } finally {
        yield* Scope.close(scope, Exit.succeed(undefined))
      }

      expect(yield* Ref.get(invoked)).toBe(1)
    }),
  )
})
