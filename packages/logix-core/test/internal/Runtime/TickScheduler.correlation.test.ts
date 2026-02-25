import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import * as Logix from '../../../src/index.js'
import { getGlobalHostScheduler } from '../../../src/internal/runtime/core/HostScheduler.js'
import { makeJobQueue } from '../../../src/internal/runtime/core/JobQueue.js'
import { makeRuntimeStore, makeModuleInstanceKey } from '../../../src/internal/runtime/core/RuntimeStore.js'
import { makeTickScheduler } from '../../../src/internal/runtime/core/TickScheduler.js'

describe('TickScheduler (tickSeq correlation)', () => {
  it.effect('trace:tick anchors should correlate tickSeq with txnSeq/opSeq', () =>
    Effect.gen(function* () {
      Logix.Debug.clearDevtoolsEvents()

      const store = makeRuntimeStore()
      const queue = makeJobQueue()
      const scheduler = makeTickScheduler({
        runtimeStore: store,
        queue,
        hostScheduler: getGlobalHostScheduler(),
        config: { maxSteps: 64, urgentStepCap: 64, maxDrainRounds: 4 },
      })

      const key = makeModuleInstanceKey('M', 'i-1')
      store.registerModuleInstance({ moduleId: 'M', instanceId: 'i-1', moduleInstanceKey: key, initialState: { v: 0 } })

      queue.enqueueModuleCommit({
        moduleId: 'M',
        instanceId: 'i-1',
        moduleInstanceKey: key,
        state: { v: 1 },
        meta: { txnSeq: 123, txnId: 'i-1::t123', commitMode: 'normal', priority: 'normal', originKind: 'dispatch', originName: 'inc' },
        opSeq: 7,
      })
      queue.markTopicDirty(key, 'normal')

      yield* scheduler.flushNow.pipe(
        Effect.locally(Logix.Debug.internal.currentDiagnosticsLevel as any, 'light'),
        Effect.provide(Logix.Debug.devtoolsHubLayer({ bufferSize: 64 })),
      )

      expect(store.getTickSeq()).toBe(1)

      const settled = Logix.Debug.getDevtoolsSnapshot().events
        .filter((e) => e.label === 'trace:tick')
        .map((e) => (e.meta ?? {}) as any)
        .find((m) => m.phase === 'settled' && m.tickSeq === 1)

      expect(settled?.anchors?.moduleId).toBe('M')
      expect(settled?.anchors?.instanceId).toBe('i-1')
      expect(settled?.anchors?.txnSeq).toBe(123)
      expect(settled?.anchors?.txnId).toBe('i-1::t123')
      expect(settled?.anchors?.opSeq).toBe(7)
    }),
  )

  it.effect('scheduling diagnostics should emit degrade/recover with policy scope aligned to tick backlog', () =>
    Effect.gen(function* () {
      const ring = Logix.Debug.makeRingBufferSink(128)
      const store = makeRuntimeStore()
      const queue = makeJobQueue()
      const scheduler = makeTickScheduler({
        runtimeStore: store,
        queue,
        hostScheduler: getGlobalHostScheduler(),
        config: { maxSteps: 1, urgentStepCap: 64, maxDrainRounds: 4 },
      })

      const key1 = makeModuleInstanceKey('M', 'i-1')
      const key2 = makeModuleInstanceKey('M', 'i-2')
      store.registerModuleInstance({ moduleId: 'M', instanceId: 'i-1', moduleInstanceKey: key1, initialState: { v: 0 } })
      store.registerModuleInstance({ moduleId: 'M', instanceId: 'i-2', moduleInstanceKey: key2, initialState: { v: 0 } })

      const schedulingPolicy = {
        configScope: 'runtime_module' as const,
        concurrencyLimit: 8 as const,
        losslessBackpressureCapacity: 32,
        pressureWarningThreshold: { backlogCount: 2, backlogDurationMs: 5 },
        warningCooldownMs: 100,
      }

      queue.enqueueModuleCommit({
        moduleId: 'M',
        instanceId: 'i-1',
        moduleInstanceKey: key1,
        state: { v: 1 },
        meta: { txnSeq: 1, txnId: 'i-1::t1', commitMode: 'lowPriority', priority: 'low', originKind: 'dispatch', originName: 'low' },
        opSeq: 1,
        schedulingPolicy,
      })
      queue.enqueueModuleCommit({
        moduleId: 'M',
        instanceId: 'i-2',
        moduleInstanceKey: key2,
        state: { v: 1 },
        meta: { txnSeq: 2, txnId: 'i-2::t2', commitMode: 'lowPriority', priority: 'low', originKind: 'dispatch', originName: 'low' },
        opSeq: 2,
        schedulingPolicy,
      })
      queue.markTopicDirty(key1, 'low')
      queue.markTopicDirty(key2, 'low')

      const withDiagnostics = <A, E>(eff: Effect.Effect<A, E, never>) =>
        eff.pipe(
          Effect.locally(Logix.Debug.internal.currentDebugSinks as any, [ring.sink as any]),
          Effect.locally(Logix.Debug.internal.currentDiagnosticsLevel as any, 'light'),
        )

      // Tick1: degraded (budget_steps) with deferred backlog.
      yield* withDiagnostics(scheduler.flushNow)
      // Tick2: consumes deferred backlog and should recover.
      yield* withDiagnostics(scheduler.flushNow)

      const diagnostics = ring.getSnapshot().filter((e) => e.type === 'diagnostic') as ReadonlyArray<any>
      const degrade = diagnostics.find((e) => e.code === 'scheduling::degrade')
      const recover = diagnostics.find((e) => e.code === 'scheduling::recover')

      expect(degrade).toBeTruthy()
      expect(recover).toBeTruthy()

      expect(degrade?.trigger?.details?.reason).toBe('budget_steps')
      expect(degrade?.trigger?.details?.configScope).toBe('runtime_module')
      expect((degrade?.trigger?.details?.backlogCount as number) > 0).toBe(true)

      expect(recover?.trigger?.details?.fromReason).toBe('budget_steps')
      expect(recover?.trigger?.details?.configScope).toBe('runtime_module')
      expect(recover?.trigger?.details?.fromTickSeq).toBe(degrade?.trigger?.details?.tickSeq)
    }),
  )
})
