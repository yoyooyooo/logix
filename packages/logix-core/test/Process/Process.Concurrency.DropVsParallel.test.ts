import { describe, it, expect } from '@effect/vitest'
import { Context, Deferred, Effect, Exit, Layer, Ref, Scope, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as ProcessRuntime from '../../src/internal/runtime/core/process/ProcessRuntime.js'

describe('process: concurrency drop vs parallel', () => {
  it.scoped('drop should ignore re-entry while running', () =>
    Effect.gen(function* () {
      const started = yield* Ref.make(0)
      const completed = yield* Ref.make(0)
      const gatesRef = yield* Ref.make<ReadonlyArray<Deferred.Deferred<void>>>([])

      const Host = Logix.Module.make('ProcessConcurrencyDropHost', {
        state: Schema.Void,
        actions: {},
      })

      const Proc = Logix.Process.make(
        {
          processId: 'ProcessConcurrencyDrop',
          triggers: [{ kind: 'platformEvent', platformEvent: 'test:drop' }],
          concurrency: { mode: 'drop' },
          errorPolicy: { mode: 'failStop' },
          diagnosticsLevel: 'light',
        },
        Effect.gen(function* () {
          const gate = yield* Deferred.make<void>()
          yield* Ref.update(started, (n) => n + 1)
          yield* Ref.update(gatesRef, (arr) => [...arr, gate])
          yield* Deferred.await(gate)
          yield* Ref.update(completed, (n) => n + 1)
        }),
      )

      const HostImpl = Host.implement({
        initial: undefined,
        processes: [Proc],
      })

      const layer = Layer.provideMerge(ProcessRuntime.layer())(HostImpl.impl.layer)

      let events: ReadonlyArray<Logix.Process.ProcessEvent> = []
      const scope = yield* Scope.make()
      try {
        const env = yield* Layer.buildWithScope(layer, scope)
        const rt = Context.get(
          env as Context.Context<any>,
          ProcessRuntime.ProcessRuntimeTag as any,
        ) as ProcessRuntime.ProcessRuntime

        yield* rt.deliverPlatformEvent({ eventName: 'test:drop' })
        yield* rt.deliverPlatformEvent({ eventName: 'test:drop' })
        yield* rt.deliverPlatformEvent({ eventName: 'test:drop' })

        for (let i = 0; i < 50; i++) {
          const gates = yield* Ref.get(gatesRef)
          if (gates.length === 1) {
            yield* Deferred.succeed(gates[0]!, undefined)
            break
          }
          yield* Effect.yieldNow()
        }

        for (let i = 0; i < 50; i++) {
          const n = yield* Ref.get(completed)
          if (n === 1) break
          yield* Effect.yieldNow()
        }

        events = (yield* rt.getEventsSnapshot()) as any
      } finally {
        yield* Scope.close(scope, Exit.succeed(undefined))
      }

      expect(yield* Ref.get(started)).toBe(1)
      expect(yield* Ref.get(completed)).toBe(1)

      const triggers = events.filter((e) => e.type === 'process:trigger')
      const warnings = triggers.filter((e) => e.severity === 'warning')
      expect(triggers.length).toBe(3)
      expect(warnings.length).toBe(2)
    }),
  )

  it.scoped('parallel should respect maxParallel', () =>
    Effect.gen(function* () {
      const completed = yield* Ref.make(0)
      const active = yield* Ref.make(0)
      const maxActive = yield* Ref.make(0)
      const gatesRef = yield* Ref.make<ReadonlyArray<Deferred.Deferred<void>>>([])

      const Host = Logix.Module.make('ProcessConcurrencyParallelHost', {
        state: Schema.Void,
        actions: {},
      })

      const Proc = Logix.Process.make(
        {
          processId: 'ProcessConcurrencyParallel',
          triggers: [{ kind: 'platformEvent', platformEvent: 'test:parallel' }],
          concurrency: { mode: 'parallel', maxParallel: 2 },
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

        yield* rt.deliverPlatformEvent({ eventName: 'test:parallel' })
        yield* rt.deliverPlatformEvent({ eventName: 'test:parallel' })
        yield* rt.deliverPlatformEvent({ eventName: 'test:parallel' })
        yield* rt.deliverPlatformEvent({ eventName: 'test:parallel' })
        yield* rt.deliverPlatformEvent({ eventName: 'test:parallel' })

        // release in waves: maxParallel=2
        for (let i = 0; i < 50; i++) {
          const gates = yield* Ref.get(gatesRef)
          if (gates.length >= 2) break
          yield* Effect.yieldNow()
        }

        let released = 0
        while (released < 5) {
          const gates = yield* Ref.get(gatesRef)
          const available = gates.slice(released, released + 2)
          if (available.length === 0) {
            yield* Effect.yieldNow()
            continue
          }
          for (const gate of available) {
            yield* Deferred.succeed(gate, undefined)
            released += 1
          }

          for (let i = 0; i < 50; i++) {
            if ((yield* Ref.get(completed)) >= released) break
            yield* Effect.yieldNow()
          }
        }
      } finally {
        yield* Scope.close(scope, Exit.succeed(undefined))
      }

      expect(yield* Ref.get(completed)).toBe(5)
      expect(yield* Ref.get(maxActive)).toBe(2)
    }),
  )
})
