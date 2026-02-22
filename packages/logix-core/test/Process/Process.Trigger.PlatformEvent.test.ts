import { describe, it, expect } from '@effect/vitest'
import { Effect, Ref, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import { withProcessRuntime, withProcessRuntimeScope } from './test-helpers.js'

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

      const layer = withProcessRuntime(HostImpl.impl.layer)

      yield* withProcessRuntimeScope({
        layer,
        run: ({ env }) =>
          Effect.gen(function* () {
            yield* Effect.provide(
              Logix.InternalContracts.deliverProcessPlatformEvent({
                eventName: 'app:test',
                payload: { ok: true },
              } as any),
              env,
            )

            for (let i = 0; i < 100; i++) {
              if ((yield* Ref.get(invoked)) === 1) break
              yield* Effect.yieldNow()
            }
          }),
      })

      expect(yield* Ref.get(invoked)).toBe(1)
    }),
  )
})
