import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import { describe } from '@effect/vitest'
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
      CoreDebug.clearDevtoolsEvents()

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

      yield* Effect.provideService(scheduler.flushNow, CoreDebug.internal.currentDiagnosticsLevel as any, 'light').pipe(
        Effect.provide(CoreDebug.devtoolsHubLayer({ bufferSize: 64 })),
      )

      expect(store.getTickSeq()).toBe(1)

      const settled = CoreDebug.getDevtoolsSnapshot().events
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
      const ring = CoreDebug.makeRingBufferSink(128)
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
        allowUnbounded: false,
        losslessBackpressureCapacity: 32,
        pressureWarningThreshold: { backlogCount: 2, backlogDurationMs: 5 },
        warningCooldownMs: 100,
        resolvedAtTxnSeq: 1,
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
        Effect.provideService(
          Effect.provideService(eff, CoreDebug.internal.currentDebugSinks as any, [ring.sink as any]),
          CoreDebug.internal.currentDiagnosticsLevel as any,
          'light',
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

  it.effect('scheduling diagnostics should clear degrade state on stable tick even when diagnostics are disabled', () =>
    Effect.gen(function* () {
      const ring = CoreDebug.makeRingBufferSink(128)
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
        allowUnbounded: false,
        losslessBackpressureCapacity: 32,
        pressureWarningThreshold: { backlogCount: 2, backlogDurationMs: 5 },
        warningCooldownMs: 100,
        resolvedAtTxnSeq: 1,
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
        schedulingPolicy: { ...schedulingPolicy, resolvedAtTxnSeq: 2 },
      })
      queue.markTopicDirty(key1, 'low')
      queue.markTopicDirty(key2, 'low')

      const withDiagnostics = <A, E>(eff: Effect.Effect<A, E, never>) =>
        Effect.provideService(
          Effect.provideService(eff, CoreDebug.internal.currentDebugSinks as any, [ring.sink as any]),
          CoreDebug.internal.currentDiagnosticsLevel as any,
          'light',
        )

      const withoutDiagnostics = <A, E>(eff: Effect.Effect<A, E, never>) =>
        Effect.provideService(
          Effect.provideService(eff, CoreDebug.internal.currentDebugSinks as any, [ring.sink as any]),
          CoreDebug.internal.currentDiagnosticsLevel as any,
          'off',
        )

      // Tick1: enter degrade and emit scheduling::degrade.
      yield* withDiagnostics(scheduler.flushNow)
      // Tick2: stable while diagnostics=off; should still clear internal degrade state.
      yield* withoutDiagnostics(scheduler.flushNow)

      queue.enqueueModuleCommit({
        moduleId: 'M',
        instanceId: 'i-1',
        moduleInstanceKey: key1,
        state: { v: 2 },
        meta: { txnSeq: 3, txnId: 'i-1::t3', commitMode: 'normal', priority: 'normal', originKind: 'dispatch', originName: 'normal' },
        opSeq: 3,
        schedulingPolicy: { ...schedulingPolicy, resolvedAtTxnSeq: 3 },
      })
      queue.markTopicDirty(key1, 'normal')
      // Tick3: stable with diagnostics re-enabled; should not emit stale scheduling::recover.
      yield* withDiagnostics(scheduler.flushNow)

      const diagnostics = ring.getSnapshot().filter((e) => e.type === 'diagnostic') as ReadonlyArray<any>
      const degradeCount = diagnostics.filter((e) => e.code === 'scheduling::degrade').length
      const recoverCount = diagnostics.filter((e) => e.code === 'scheduling::recover').length

      expect(degradeCount).toBe(1)
      expect(recoverCount).toBe(0)
    }),
  )

  it.effect('scheduling diagnostics should emit degrade once for a continuous unstable window', () =>
    Effect.gen(function* () {
      const ring = CoreDebug.makeRingBufferSink(128)
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
      const key3 = makeModuleInstanceKey('M', 'i-3')
      store.registerModuleInstance({ moduleId: 'M', instanceId: 'i-1', moduleInstanceKey: key1, initialState: { v: 0 } })
      store.registerModuleInstance({ moduleId: 'M', instanceId: 'i-2', moduleInstanceKey: key2, initialState: { v: 0 } })
      store.registerModuleInstance({ moduleId: 'M', instanceId: 'i-3', moduleInstanceKey: key3, initialState: { v: 0 } })

      const schedulingPolicy = {
        configScope: 'runtime_module' as const,
        concurrencyLimit: 8 as const,
        allowUnbounded: false,
        losslessBackpressureCapacity: 32,
        pressureWarningThreshold: { backlogCount: 2, backlogDurationMs: 5 },
        warningCooldownMs: 100,
        resolvedAtTxnSeq: 1,
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
        schedulingPolicy: { ...schedulingPolicy, resolvedAtTxnSeq: 2 },
      })
      queue.enqueueModuleCommit({
        moduleId: 'M',
        instanceId: 'i-3',
        moduleInstanceKey: key3,
        state: { v: 1 },
        meta: { txnSeq: 3, txnId: 'i-3::t3', commitMode: 'lowPriority', priority: 'low', originKind: 'dispatch', originName: 'low' },
        opSeq: 3,
        schedulingPolicy: { ...schedulingPolicy, resolvedAtTxnSeq: 3 },
      })
      queue.markTopicDirty(key1, 'low')
      queue.markTopicDirty(key2, 'low')
      queue.markTopicDirty(key3, 'low')

      const withDiagnostics = <A, E>(eff: Effect.Effect<A, E, never>) =>
        Effect.provideService(
          Effect.provideService(eff, CoreDebug.internal.currentDebugSinks as any, [ring.sink as any]),
          CoreDebug.internal.currentDiagnosticsLevel as any,
          'light',
        )

      // Tick1: unstable (degrade emitted).
      yield* withDiagnostics(scheduler.flushNow)
      // Tick2: still unstable in the same degrade window (should not re-emit degrade).
      yield* withDiagnostics(scheduler.flushNow)

      const diagnostics = ring.getSnapshot().filter((e) => e.type === 'diagnostic') as ReadonlyArray<any>
      const degradeCount = diagnostics.filter((e) => e.code === 'scheduling::degrade').length

      expect(degradeCount).toBe(1)
    }),
  )
})
