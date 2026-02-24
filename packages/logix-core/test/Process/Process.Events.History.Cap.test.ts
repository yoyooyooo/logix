import { describe, it, expect } from '@effect/vitest'
import { Context, Effect, Exit, Layer, Scope, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as ProcessRuntime from '../../src/internal/runtime/core/process/ProcessRuntime.js'

describe('process: event history cap', () => {
  it.scoped('keeps only the last N events in oldest->latest order', () =>
    Effect.gen(function* () {
      const maxEventHistory = 4
      const processId = 'ProcessEventHistoryCap'
      const triggerSpecs = Array.from({ length: 6 }, (_, index) => ({
        kind: 'platformEvent' as const,
        name: `evt-${index}`,
        platformEvent: `test:history:${index}`,
      }))

      const Host = Logix.Module.make('ProcessEventHistoryCapHost', {
        state: Schema.Void,
        actions: {},
      })

      const Proc = Logix.Process.make(
        {
          processId,
          triggers: triggerSpecs,
          concurrency: { mode: 'serial', maxQueue: 16 },
          errorPolicy: { mode: 'failStop' },
          diagnosticsLevel: 'light',
        },
        Effect.void,
      )

      const HostImpl = Host.implement({
        initial: undefined,
        processes: [Proc],
      })

      const layer = Layer.provideMerge(ProcessRuntime.layer({ maxEventHistory }))(HostImpl.impl.layer)

      let snapshot: ReadonlyArray<Logix.Process.ProcessEvent> = []
      const scope = yield* Scope.make()
      try {
        const env = yield* Layer.buildWithScope(layer, scope)
        const runtime = Context.get(
          env as Context.Context<any>,
          ProcessRuntime.ProcessRuntimeTag as any,
        ) as ProcessRuntime.ProcessRuntime

        for (const trigger of triggerSpecs) {
          yield* runtime.deliverPlatformEvent({ eventName: trigger.platformEvent })
        }

        const expectedLastTriggerName = triggerSpecs[triggerSpecs.length - 1]?.name
        for (let i = 0; i < 400; i += 1) {
          snapshot = yield* runtime.getEventsSnapshot()
          const hasLastTrigger = snapshot.some(
            (event) =>
              event.identity.identity.processId === processId &&
              event.type === 'process:trigger' &&
              event.trigger?.kind === 'platformEvent' &&
              event.trigger.name === expectedLastTriggerName,
          )
          if (hasLastTrigger) {
            break
          }
          yield* Effect.yieldNow()
        }

        snapshot = yield* runtime.getEventsSnapshot()
      } finally {
        yield* Scope.close(scope, Exit.succeed(undefined))
      }

      expect(snapshot).toHaveLength(maxEventHistory)

      const triggerNames = snapshot.map((event) => {
        expect(event.identity.identity.processId).toBe(processId)
        expect(event.type).toBe('process:trigger')
        expect(event.trigger?.kind).toBe('platformEvent')
        return event.trigger?.name
      })
      expect(triggerNames).toEqual(triggerSpecs.slice(-maxEventHistory).map((trigger) => trigger.name))

      const eventSeqs = snapshot.map((event) => event.eventSeq)
      expect(eventSeqs).toEqual([...eventSeqs].sort((left, right) => left - right))
    }),
  )

  it.scoped('returns an empty snapshot when maxEventHistory is 0', () =>
    Effect.gen(function* () {
      const Host = Logix.Module.make('ProcessEventHistoryCapZeroHost', {
        state: Schema.Void,
        actions: {},
      })

      const Proc = Logix.Process.make(
        {
          processId: 'ProcessEventHistoryCapZero',
          triggers: [{ kind: 'platformEvent', platformEvent: 'test:history:zero' }],
          concurrency: { mode: 'serial', maxQueue: 16 },
          errorPolicy: { mode: 'failStop' },
          diagnosticsLevel: 'light',
        },
        Effect.void,
      )

      const HostImpl = Host.implement({
        initial: undefined,
        processes: [Proc],
      })

      const layer = Layer.provideMerge(ProcessRuntime.layer({ maxEventHistory: 0 }))(HostImpl.impl.layer)

      let snapshot: ReadonlyArray<Logix.Process.ProcessEvent> = []
      const scope = yield* Scope.make()
      try {
        const env = yield* Layer.buildWithScope(layer, scope)
        const runtime = Context.get(
          env as Context.Context<any>,
          ProcessRuntime.ProcessRuntimeTag as any,
        ) as ProcessRuntime.ProcessRuntime

        yield* runtime.deliverPlatformEvent({ eventName: 'test:history:zero' })

        for (let i = 0; i < 40; i += 1) {
          yield* Effect.yieldNow()
        }

        snapshot = yield* runtime.getEventsSnapshot()
      } finally {
        yield* Scope.close(scope, Exit.succeed(undefined))
      }

      expect(snapshot).toEqual([])
    }),
  )
})
