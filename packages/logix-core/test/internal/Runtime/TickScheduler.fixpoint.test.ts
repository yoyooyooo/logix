import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import * as Logix from '../../../src/index.js'
import { makeRuntimeStore, makeModuleInstanceKey } from '../../../src/internal/runtime/core/RuntimeStore.js'
import { makeTickScheduler } from '../../../src/internal/runtime/core/TickScheduler.js'

describe('TickScheduler (fixpoint / budget / safety)', () => {
  it.effect('fixpoint: should flush to a single tick with stable=true', () =>
    Effect.gen(function* () {
      Logix.Debug.clearDevtoolsEvents()

      const store = makeRuntimeStore()
      const scheduler = makeTickScheduler({
        runtimeStore: store,
        config: { maxSteps: 64, urgentStepCap: 64, maxDrainRounds: 4 },
      })

      const aKey = makeModuleInstanceKey('A', 'i-1')
      const bKey = makeModuleInstanceKey('B', 'i-1')

      store.registerModuleInstance({ moduleId: 'A', instanceId: 'i-1', moduleInstanceKey: aKey, initialState: { v: 0 } })
      store.registerModuleInstance({ moduleId: 'B', instanceId: 'i-1', moduleInstanceKey: bKey, initialState: { v: 0 } })

      store.enqueueModuleCommit({
        moduleId: 'A',
        instanceId: 'i-1',
        moduleInstanceKey: aKey,
        state: { v: 1 },
        meta: { txnSeq: 1, txnId: 'i-1::t1', commitMode: 'normal', priority: 'normal', originKind: 'dispatch', originName: 'inc' },
        opSeq: 10,
      })
      store.markTopicDirty(aKey, 'normal')

      store.enqueueModuleCommit({
        moduleId: 'B',
        instanceId: 'i-1',
        moduleInstanceKey: bKey,
        state: { v: 1 },
        meta: { txnSeq: 1, txnId: 'i-1::t1', commitMode: 'normal', priority: 'low', originKind: 'dispatch', originName: 'incLow' },
        opSeq: 11,
      })
      store.markTopicDirty(bKey, 'low')

      yield* scheduler.flushNow.pipe(
        Effect.locally(Logix.Debug.internal.currentDiagnosticsLevel as any, 'light'),
        Effect.provide(Logix.Debug.devtoolsHubLayer({ bufferSize: 64 })),
      )

      expect(store.getTickSeq()).toBe(1)
      expect(store.getModuleState(aKey)).toEqual({ v: 1 })
      expect(store.getModuleState(bKey)).toEqual({ v: 1 })

      const ticks = Logix.Debug.getDevtoolsSnapshot().events
        .filter((e) => e.label === 'trace:tick')
        .map((e) => (e.meta ?? {}) as any)
        .filter((m) => m.phase === 'settled')

      expect(ticks.length).toBeGreaterThanOrEqual(1)
      expect(ticks[0]?.tickSeq).toBe(1)
      expect(ticks[0]?.result?.stable).toBe(true)
      expect(ticks[0]?.anchors?.txnSeq).toBe(1)
      expect(ticks[0]?.anchors?.opSeq).toBe(10)
    }),
  )

  it.effect('budget steps: should defer nonUrgent backlog and emit trace + warn evidence', () =>
    Effect.gen(function* () {
      Logix.Debug.clearDevtoolsEvents()

      const store = makeRuntimeStore()
      const scheduler = makeTickScheduler({
        runtimeStore: store,
        config: { maxSteps: 1, urgentStepCap: 64, maxDrainRounds: 4 },
      })

      const urgentKey = makeModuleInstanceKey('Urgent', 'i-1')
      const otherKey = makeModuleInstanceKey('Other', 'i-1')
      const slowKey = makeModuleInstanceKey('Slow', 'i-1')

      store.registerModuleInstance({
        moduleId: 'Urgent',
        instanceId: 'i-1',
        moduleInstanceKey: urgentKey,
        initialState: { v: 0 },
      })
      store.registerModuleInstance({ moduleId: 'Other', instanceId: 'i-1', moduleInstanceKey: otherKey, initialState: { v: 0 } })
      store.registerModuleInstance({ moduleId: 'Slow', instanceId: 'i-1', moduleInstanceKey: slowKey, initialState: { v: 0 } })

      const unsubscribe = store.subscribeTopic(slowKey, () => {})

      store.enqueueModuleCommit({
        moduleId: 'Urgent',
        instanceId: 'i-1',
        moduleInstanceKey: urgentKey,
        state: { v: 1 },
        meta: { txnSeq: 1, txnId: 'i-1::t1', commitMode: 'normal', priority: 'normal', originKind: 'dispatch', originName: 'click' },
        opSeq: 1,
      })
      store.markTopicDirty(urgentKey, 'normal')

      store.enqueueModuleCommit({
        moduleId: 'Other',
        instanceId: 'i-1',
        moduleInstanceKey: otherKey,
        state: { v: 1 },
        meta: {
          txnSeq: 1,
          txnId: 'i-1::t1',
          commitMode: 'lowPriority',
          priority: 'low',
          originKind: 'dispatch',
          originName: 'background',
        },
        opSeq: 0,
      })
      store.markTopicDirty(otherKey, 'low')

      store.enqueueModuleCommit({
        moduleId: 'Slow',
        instanceId: 'i-1',
        moduleInstanceKey: slowKey,
        state: { v: 1 },
        meta: {
          txnSeq: 1,
          txnId: 'i-1::t1',
          commitMode: 'lowPriority',
          priority: 'low',
          originKind: 'trait-external-store',
          originName: 'field:x',
        },
        opSeq: 2,
      })
      store.markTopicDirty(slowKey, 'low')

      yield* scheduler.flushNow.pipe(
        Effect.locally(Logix.Debug.internal.currentDiagnosticsLevel as any, 'light'),
        Effect.provide(Logix.Debug.devtoolsHubLayer({ bufferSize: 128 })),
      )

      expect(store.getTickSeq()).toBe(1)
      expect(store.getModuleState(urgentKey)).toEqual({ v: 1 })
      expect(store.getModuleState(slowKey)).toEqual({ v: 0 })

      const events = Logix.Debug.getDevtoolsSnapshot().events
      const budgetExceeded = events
        .filter((e) => e.label === 'trace:tick')
        .map((e) => (e.meta ?? {}) as any)
        .find((m) => m.phase === 'budgetExceeded' && m.tickSeq === 1)

      expect(budgetExceeded?.result?.stable).toBe(false)
      expect(budgetExceeded?.result?.degradeReason).toBe('budget_steps')
      expect(budgetExceeded?.backlog?.deferredPrimary?.kind).toBe('externalStore')

      const inversion = events
        .filter((e) => e.label === 'warn:priority-inversion')
        .map((e) => (e.meta ?? {}) as any)
        .find((m) => m.tickSeq === 1)

      expect(inversion?.reason).toBe('deferredBacklog')

      // Second tick should catch up the deferred backlog.
      Logix.Debug.clearDevtoolsEvents()
      yield* scheduler.flushNow.pipe(
        Effect.locally(Logix.Debug.internal.currentDiagnosticsLevel as any, 'light'),
        Effect.provide(Logix.Debug.devtoolsHubLayer({ bufferSize: 128 })),
      )

      expect(store.getTickSeq()).toBe(2)
      expect(store.getModuleState(slowKey)).toEqual({ v: 1 })

      unsubscribe()
    }),
  )

  it.effect('urgent safety: should cut urgent backlog when urgentStepCap is exceeded (cycle_detected)', () =>
    Effect.gen(function* () {
      Logix.Debug.clearDevtoolsEvents()

      const store = makeRuntimeStore()
      const scheduler = makeTickScheduler({
        runtimeStore: store,
        config: { maxSteps: 64, urgentStepCap: 1, maxDrainRounds: 4 },
      })

      const aKey = makeModuleInstanceKey('A', 'i-1')
      const bKey = makeModuleInstanceKey('B', 'i-1')
      store.registerModuleInstance({ moduleId: 'A', instanceId: 'i-1', moduleInstanceKey: aKey, initialState: { v: 0 } })
      store.registerModuleInstance({ moduleId: 'B', instanceId: 'i-1', moduleInstanceKey: bKey, initialState: { v: 0 } })

      store.enqueueModuleCommit({
        moduleId: 'A',
        instanceId: 'i-1',
        moduleInstanceKey: aKey,
        state: { v: 1 },
        meta: { txnSeq: 1, txnId: 'i-1::t1', commitMode: 'normal', priority: 'normal', originKind: 'dispatch', originName: 'a' },
        opSeq: 1,
      })
      store.markTopicDirty(aKey, 'normal')

      store.enqueueModuleCommit({
        moduleId: 'B',
        instanceId: 'i-1',
        moduleInstanceKey: bKey,
        state: { v: 1 },
        meta: { txnSeq: 1, txnId: 'i-1::t1', commitMode: 'normal', priority: 'normal', originKind: 'dispatch', originName: 'b' },
        opSeq: 2,
      })
      store.markTopicDirty(bKey, 'normal')

      yield* scheduler.flushNow.pipe(
        Effect.locally(Logix.Debug.internal.currentDiagnosticsLevel as any, 'light'),
        Effect.provide(Logix.Debug.devtoolsHubLayer({ bufferSize: 128 })),
      )

      expect(store.getTickSeq()).toBe(1)
      expect(store.getModuleState(aKey)).toEqual({ v: 1 })
      expect(store.getModuleState(bKey)).toEqual({ v: 0 })

      const events = Logix.Debug.getDevtoolsSnapshot().events
      const budgetExceeded = events
        .filter((e) => e.label === 'trace:tick')
        .map((e) => (e.meta ?? {}) as any)
        .find((m) => m.phase === 'budgetExceeded' && m.tickSeq === 1)

      expect(budgetExceeded?.result?.stable).toBe(false)
      expect(budgetExceeded?.result?.degradeReason).toBe('cycle_detected')

      // Next tick should finish the deferred urgent backlog.
      Logix.Debug.clearDevtoolsEvents()
      yield* scheduler.flushNow.pipe(
        Effect.locally(Logix.Debug.internal.currentDiagnosticsLevel as any, 'light'),
        Effect.provide(Logix.Debug.devtoolsHubLayer({ bufferSize: 128 })),
      )

      expect(store.getTickSeq()).toBe(2)
      expect(store.getModuleState(bKey)).toEqual({ v: 1 })
    }),
  )
})
