import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import * as Logix from '../../../src/index.js'
import { makeJobQueue } from '../../../src/internal/runtime/core/JobQueue.js'
import { makeRuntimeStore, makeModuleInstanceKey } from '../../../src/internal/runtime/core/RuntimeStore.js'
import { makeTickScheduler } from '../../../src/internal/runtime/core/TickScheduler.js'
import { flushAllHostScheduler, makeTestHostScheduler } from '../testkit/hostSchedulerTestKit.js'

describe('TickScheduler (anti-starvation)', () => {
  it.effect('microtaskChainDepth: should yield-to-host and start the next tick on a macrotask boundary', () =>
    Effect.gen(function* () {
      Logix.Debug.clearDevtoolsEvents()

      const store = makeRuntimeStore()
      const queue = makeJobQueue()
      const hostScheduler = makeTestHostScheduler()

      const scheduler = makeTickScheduler({
        runtimeStore: store,
        queue,
        hostScheduler,
        config: { maxSteps: 64, urgentStepCap: 64, maxDrainRounds: 4, microtaskChainDepthLimit: 2 },
      })

      const key = makeModuleInstanceKey('M', 'i-1')
      store.registerModuleInstance({ moduleId: 'M', instanceId: 'i-1', moduleInstanceKey: key, initialState: { v: 0 } })

      let injected = 0
      const unsubscribe = store.subscribeTopic(key, () => {
        // Enqueue another stable tick immediately after commit (keeps the scheduler non-idle).
        injected += 1
        if (injected >= 4) return
        queue.enqueueModuleCommit({
          moduleId: 'M',
          instanceId: 'i-1',
          moduleInstanceKey: key,
          state: { v: injected + 1 },
          meta: { txnSeq: injected + 1, txnId: `i-1::t${injected + 1}`, commitMode: 'normal', priority: 'normal', originKind: 'dispatch', originName: 'loop' },
          opSeq: injected + 1,
        })
        queue.markTopicDirty(key, 'normal')
      })

      try {
        // Prime the chain with a single commit; the rest is injected by the topic listener above.
        yield* scheduler.onModuleCommit({
          moduleId: 'M',
          instanceId: 'i-1',
          moduleInstanceKey: key,
          state: { v: 1 },
          meta: { txnSeq: 1, txnId: 'i-1::t1', commitMode: 'normal', priority: 'normal', originKind: 'dispatch', originName: 'start' },
          opSeq: 1,
        })

        yield* flushAllHostScheduler(hostScheduler)

        const events = Logix.Debug.getDevtoolsSnapshot().events
        const starts = events
          .filter((e) => e.label === 'trace:tick')
          .map((e) => (e.meta ?? {}) as any)
          .filter((m) => m.phase === 'start')

        const yielded = starts.find((m) => m.schedule?.forcedMacrotask && m.schedule?.reason === 'microtask_starvation')
        expect(yielded).toBeTruthy()
        expect(typeof yielded?.schedule?.microtaskChainDepth).toBe('number')
        expect(yielded?.schedule?.microtaskChainDepth).toBeGreaterThanOrEqual(2)

        const warn = events
          .filter((e) => e.label === 'warn:microtask-starvation')
          .map((e) => (e.meta ?? {}) as any)
          .find((m) => m.tickSeq === yielded?.tickSeq)

        expect(warn?.tickSeq).toBe(yielded?.tickSeq)
      } finally {
        unsubscribe()
      }
    }).pipe(
      Effect.locally(Logix.Debug.internal.currentDiagnosticsLevel as any, 'light'),
      Effect.provide(Logix.Debug.devtoolsHubLayer({ bufferSize: 512 })),
    ),
  )
})

