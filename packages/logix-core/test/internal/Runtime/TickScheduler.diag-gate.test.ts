import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import * as Logix from '../../../src/index.js'
import { getGlobalHostScheduler } from '../../../src/internal/runtime/core/HostScheduler.js'
import { makeJobQueue } from '../../../src/internal/runtime/core/JobQueue.js'
import { makeRuntimeStore, makeModuleInstanceKey } from '../../../src/internal/runtime/core/RuntimeStore.js'
import { makeTickScheduler } from '../../../src/internal/runtime/core/TickScheduler.js'

describe('TickScheduler (diagnostics gate)', () => {
  it.effect('diagnostics=off should not emit trace:tick', () =>
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
        meta: { txnSeq: 1, txnId: 'i-1::t1', commitMode: 'normal', priority: 'normal', originKind: 'dispatch', originName: 'inc' },
      })
      queue.markTopicDirty(key, 'normal')

      yield* scheduler.flushNow.pipe(
        Effect.locally(Logix.Debug.internal.currentDiagnosticsLevel as any, 'off'),
        Effect.provide(Logix.Debug.devtoolsHubLayer({ bufferSize: 64 })),
      )

      expect(store.getTickSeq()).toBe(1)
      expect(Logix.Debug.getDevtoolsSnapshot().events.filter((e) => e.label === 'trace:tick')).toHaveLength(0)
    }),
  )
})
