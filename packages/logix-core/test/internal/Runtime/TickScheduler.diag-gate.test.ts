import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import { describe } from '@effect/vitest'
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
        meta: { txnSeq: 1, txnId: 'i-1::t1', commitMode: 'normal', priority: 'normal', originKind: 'dispatch', originName: 'inc' },
      })
      queue.markTopicDirty(key, 'normal')

      yield* Effect.provideService(scheduler.flushNow, CoreDebug.internal.currentDiagnosticsLevel as any, 'off').pipe(
        Effect.provide(CoreDebug.devtoolsHubLayer({ bufferSize: 64 })),
      )

      expect(store.getTickSeq()).toBe(1)
      expect(CoreDebug.getDevtoolsSnapshot().events.filter((e) => e.label === 'trace:tick')).toHaveLength(0)
    }),
  )
})
