import { describe, it, expect } from '@effect/vitest'
import { Context, Deferred, Effect, Exit, Layer, Ref, Scope, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as ProcessRuntime from '../../src/internal/runtime/core/process/ProcessRuntime.js'

describe('process: concurrency latest vs serial', () => {
  it.scoped('latest should cancel previous runs (no leak)', () =>
    Effect.gen(function* () {
      const started = yield* Ref.make(0)
      const completed = yield* Ref.make(0)
      const interrupted = yield* Ref.make(0)
      const gatesRef = yield* Ref.make<ReadonlyArray<Deferred.Deferred<void>>>([])

      const Host = Logix.Module.make('ProcessConcurrencyLatestHost', {
        state: Schema.Void,
        actions: {},
      })

      const Proc = Logix.Process.make(
        {
          processId: 'ProcessConcurrencyLatest',
          triggers: [{ kind: 'platformEvent', platformEvent: 'test:latest' }],
          concurrency: { mode: 'latest' },
          errorPolicy: { mode: 'failStop' },
          diagnosticsLevel: 'off',
        },
        Effect.gen(function* () {
          const gate = yield* Deferred.make<void>()
          yield* Effect.uninterruptible(
            Ref.update(started, (n) => n + 1).pipe(
              Effect.zipRight(Ref.update(gatesRef, (arr) => [...arr, gate])),
              Effect.asVoid,
            ),
          )
          yield* Deferred.await(gate)
          yield* Ref.update(completed, (n) => n + 1)
        }).pipe(Effect.onInterrupt(() => Ref.update(interrupted, (n) => n + 1).pipe(Effect.asVoid))),
      )

      const HostImpl = Host.implement({
        initial: undefined,
        processes: [Proc],
      })

      const layer = Layer.provideMerge(ProcessRuntime.layer())(HostImpl.impl.layer)

      const scope = yield* Scope.make()
      try {
        const env = yield* Layer.buildWithScope(layer, scope)
        const rt = Context.get(
          env as Context.Context<any>,
          ProcessRuntime.ProcessRuntimeTag as any,
        ) as ProcessRuntime.ProcessRuntime

        // wait Process instance started & subscribed
        for (let i = 0; i < 50; i++) {
          const events = yield* rt.getEventsSnapshot()
          const startedEvt = events.find(
            (e) => e.type === 'process:start' && e.identity.identity.processId === 'ProcessConcurrencyLatest',
          )
          if (startedEvt) break
          yield* Effect.yieldNow()
        }

        yield* rt.deliverPlatformEvent({ eventName: 'test:latest' })
        yield* Effect.yieldNow()
        yield* rt.deliverPlatformEvent({ eventName: 'test:latest' })
        yield* Effect.yieldNow()
        yield* rt.deliverPlatformEvent({ eventName: 'test:latest' })
        yield* Effect.yieldNow()

        // wait all 3 runs started (gate created)
        for (let i = 0; i < 50; i++) {
          const n = yield* Ref.get(started)
          if (n === 3) break
          yield* Effect.yieldNow()
        }

        const gates = yield* Ref.get(gatesRef)
        const last = gates[gates.length - 1]
        if (last) {
          yield* Deferred.succeed(last, undefined)
        }

        for (let i = 0; i < 50; i++) {
          const n = yield* Ref.get(completed)
          if (n === 1) break
          yield* Effect.yieldNow()
        }
      } finally {
        yield* Scope.close(scope, Exit.succeed(undefined))
      }

      expect(yield* Ref.get(started)).toBe(3)
      expect(yield* Ref.get(completed)).toBe(1)
      expect(yield* Ref.get(interrupted)).toBe(2)
    }),
  )

  it.scoped('serial should run without overlap', () =>
    Effect.gen(function* () {
      const completed = yield* Ref.make(0)
      const active = yield* Ref.make(0)
      const maxActive = yield* Ref.make(0)
      const gatesRef = yield* Ref.make<ReadonlyArray<Deferred.Deferred<void>>>([])

      const Host = Logix.Module.make('ProcessConcurrencySerialHost', {
        state: Schema.Void,
        actions: {},
      })

      const Proc = Logix.Process.make(
        {
          processId: 'ProcessConcurrencySerial',
          triggers: [{ kind: 'platformEvent', platformEvent: 'test:serial' }],
          concurrency: { mode: 'serial', maxQueue: 128 },
          errorPolicy: { mode: 'failStop' },
          diagnosticsLevel: 'off',
        },
        Effect.gen(function* () {
          const now = yield* Ref.updateAndGet(active, (n) => n + 1)
          yield* Ref.update(maxActive, (m) => Math.max(m, now))
          const gate = yield* Deferred.make<void>()
          yield* Ref.update(gatesRef, (arr) => [...arr, gate])
          yield* Deferred.await(gate)
          yield* Ref.update(completed, (n) => n + 1)
        }).pipe(Effect.ensuring(Ref.update(active, (n) => Math.max(0, n - 1)).pipe(Effect.asVoid))),
      )

      const HostImpl = Host.implement({
        initial: undefined,
        processes: [Proc],
      })

      const layer = Layer.provideMerge(ProcessRuntime.layer())(HostImpl.impl.layer)

      const scope = yield* Scope.make()
      try {
        const env = yield* Layer.buildWithScope(layer, scope)
        const rt = Context.get(
          env as Context.Context<any>,
          ProcessRuntime.ProcessRuntimeTag as any,
        ) as ProcessRuntime.ProcessRuntime

        for (let i = 0; i < 50; i++) {
          const events = yield* rt.getEventsSnapshot()
          const startedEvt = events.find(
            (e) => e.type === 'process:start' && e.identity.identity.processId === 'ProcessConcurrencySerial',
          )
          if (startedEvt) break
          yield* Effect.yieldNow()
        }

        yield* rt.deliverPlatformEvent({ eventName: 'test:serial' })
        yield* Effect.yieldNow()
        yield* rt.deliverPlatformEvent({ eventName: 'test:serial' })
        yield* Effect.yieldNow()
        yield* rt.deliverPlatformEvent({ eventName: 'test:serial' })
        yield* Effect.yieldNow()

        // release one-by-one; serial mode must not overlap
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 50; j++) {
            const gates = yield* Ref.get(gatesRef)
            if (gates.length >= i + 1) {
              yield* Deferred.succeed(gates[i]!, undefined)
              break
            }
            yield* Effect.yieldNow()
          }
          yield* Effect.yieldNow()
        }

        for (let i = 0; i < 50; i++) {
          const n = yield* Ref.get(completed)
          if (n === 3) break
          yield* Effect.yieldNow()
        }
      } finally {
        yield* Scope.close(scope, Exit.succeed(undefined))
      }

      expect(yield* Ref.get(completed)).toBe(3)
      expect(yield* Ref.get(maxActive)).toBe(1)
    }),
  )
})
