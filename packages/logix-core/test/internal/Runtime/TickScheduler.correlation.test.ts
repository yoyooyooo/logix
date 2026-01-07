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
})
