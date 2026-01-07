import { describe, it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import { makeJobQueue } from '../../../src/internal/runtime/core/JobQueue.js'
import { makeRuntimeStore, makeModuleInstanceKey } from '../../../src/internal/runtime/core/RuntimeStore.js'
import { makeTickScheduler, type TickSchedulerTelemetryEvent } from '../../../src/internal/runtime/core/TickScheduler.js'
import { flushAllHostScheduler, makeTestHostScheduler } from '../testkit/hostSchedulerTestKit.js'

describe('TickScheduler telemetry (diagnostics=off)', () => {
  it.effect('should invoke onTickDegraded for stable=false and forced macrotask ticks (sampled)', () =>
    Effect.gen(function* () {
      const store = makeRuntimeStore()
      const queue = makeJobQueue()
      const hostScheduler = makeTestHostScheduler()

      const reported: Array<TickSchedulerTelemetryEvent> = []

      const scheduler = makeTickScheduler({
        runtimeStore: store,
        queue,
        hostScheduler,
        config: {
          maxSteps: 1,
          urgentStepCap: 64,
          maxDrainRounds: 4,
          telemetry: {
            sampleRate: 1,
            onTickDegraded: (e) => {
              reported.push(e)
            },
          },
        },
      })

      const k1 = makeModuleInstanceKey('N1', 'i-1')
      const k2 = makeModuleInstanceKey('N2', 'i-1')
      store.registerModuleInstance({ moduleId: 'N1', instanceId: 'i-1', moduleInstanceKey: k1, initialState: { v: 0 } })
      store.registerModuleInstance({ moduleId: 'N2', instanceId: 'i-1', moduleInstanceKey: k2, initialState: { v: 0 } })

      // Two non-urgent commits + maxSteps=1 => tick1 stable=false (budget), tick2 starts on a forced macrotask boundary.
      yield* scheduler.onModuleCommit({
        moduleId: 'N1',
        instanceId: 'i-1',
        moduleInstanceKey: k1,
        state: { v: 1 },
        meta: { txnSeq: 1, txnId: 'i-1::t1', commitMode: 'lowPriority', priority: 'low', originKind: 'dispatch', originName: 'low' },
        opSeq: 1,
      })
      yield* scheduler.onModuleCommit({
        moduleId: 'N2',
        instanceId: 'i-1',
        moduleInstanceKey: k2,
        state: { v: 1 },
        meta: { txnSeq: 1, txnId: 'i-1::t1', commitMode: 'lowPriority', priority: 'low', originKind: 'dispatch', originName: 'low' },
        opSeq: 2,
      })

      yield* flushAllHostScheduler(hostScheduler)

      expect(reported.length).toBeGreaterThanOrEqual(1)
      expect(reported.some((e) => e.stable === false && e.degradeReason === 'budget_steps')).toBe(true)
      expect(reported.some((e) => e.forcedMacrotask && e.scheduleReason === 'budget')).toBe(true)
    }),
  )
})
