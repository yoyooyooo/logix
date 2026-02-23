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

  it.scoped('should only fan out to matching platformEvent triggers and preserve duplicate specs', () =>
    Effect.gen(function* () {
      const invokedA = yield* Ref.make(0)
      const invokedB = yield* Ref.make(0)
      const invokedC = yield* Ref.make(0)

      const Host = Logix.Module.make('ProcessTriggerPlatformEventFanoutHost', {
        state: Schema.Void,
        actions: {},
      })

      const ProcA = Logix.Process.make(
        {
          processId: 'ProcessTriggerPlatformEventFanoutA',
          triggers: [{ kind: 'platformEvent', platformEvent: 'app:fanout:hit' }],
          concurrency: { mode: 'serial', maxQueue: 16 },
          errorPolicy: { mode: 'failStop' },
          diagnosticsLevel: 'off',
        },
        Ref.update(invokedA, (n) => n + 1).pipe(Effect.asVoid),
      )

      const ProcB = Logix.Process.make(
        {
          processId: 'ProcessTriggerPlatformEventFanoutB',
          triggers: [{ kind: 'platformEvent', platformEvent: 'app:fanout:miss' }],
          concurrency: { mode: 'serial', maxQueue: 16 },
          errorPolicy: { mode: 'failStop' },
          diagnosticsLevel: 'off',
        },
        Ref.update(invokedB, (n) => n + 1).pipe(Effect.asVoid),
      )

      const ProcC = Logix.Process.make(
        {
          processId: 'ProcessTriggerPlatformEventFanoutC',
          triggers: [
            { kind: 'platformEvent', name: 'hit-1', platformEvent: 'app:fanout:hit' },
            { kind: 'platformEvent', name: 'hit-2', platformEvent: 'app:fanout:hit' },
          ],
          concurrency: { mode: 'serial', maxQueue: 16 },
          errorPolicy: { mode: 'failStop' },
          diagnosticsLevel: 'off',
        },
        Ref.update(invokedC, (n) => n + 1).pipe(Effect.asVoid),
      )

      const HostImpl = Host.implement({
        initial: undefined,
        processes: [ProcA, ProcB, ProcC],
      })

      const layer = withProcessRuntime(HostImpl.impl.layer)

      yield* withProcessRuntimeScope({
        layer,
        run: ({ env }) =>
          Effect.gen(function* () {
            yield* Effect.provide(
              Logix.InternalContracts.deliverProcessPlatformEvent({
                eventName: 'app:fanout:hit',
              } as any),
              env,
            )

            for (let i = 0; i < 200; i++) {
              const a = yield* Ref.get(invokedA)
              const b = yield* Ref.get(invokedB)
              const c = yield* Ref.get(invokedC)
              if (a === 1 && b === 0 && c === 2) break
              yield* Effect.yieldNow()
            }
          }),
      })

      expect(yield* Ref.get(invokedA)).toBe(1)
      expect(yield* Ref.get(invokedB)).toBe(0)
      expect(yield* Ref.get(invokedC)).toBe(2)
    }),
  )
})
