import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'
import { makeJobQueue } from '../../../src/internal/runtime/core/JobQueue.js'
import { getGlobalHostScheduler } from '../../../src/internal/runtime/core/HostScheduler.js'
import {
  makeModuleInstanceKey,
  makeReadQueryTopicKey,
  makeRuntimeStore,
} from '../../../src/internal/runtime/core/RuntimeStore.js'
import { makeTickScheduler } from '../../../src/internal/runtime/core/TickScheduler.js'

describe('TickScheduler post-commit fanout', () => {
  it('notifies module and readQuery listeners after tick commit', async () => {
    const store = makeRuntimeStore()
    const queue = makeJobQueue()
    const scheduler = makeTickScheduler({
      runtimeStore: store,
      queue,
      hostScheduler: getGlobalHostScheduler(),
      config: { maxSteps: 64, urgentStepCap: 64, maxDrainRounds: 4 },
    })

    const moduleKey = makeModuleInstanceKey('TopicFanout', 'i-1')
    const selectorKey = makeReadQueryTopicKey(moduleKey, 'view')

    store.registerModuleInstance({
      moduleId: 'TopicFanout',
      instanceId: 'i-1',
      moduleInstanceKey: moduleKey,
      initialState: { value: 0 },
    })

    let moduleNotifyCount = 0
    let selectorNotifyCount = 0
    const unsubscribeModule = store.subscribeTopic(moduleKey, () => {
      moduleNotifyCount += 1
    })
    const unsubscribeSelector = store.subscribeTopic(selectorKey, () => {
      selectorNotifyCount += 1
    })
    const releaseSelectorInterest = store.retainSelectorInterest(moduleKey, 'view')

    try {
      await Effect.runPromise(
        Effect.gen(function* () {
          yield* scheduler.onModuleCommit({
            moduleId: 'TopicFanout',
            instanceId: 'i-1',
            moduleInstanceKey: moduleKey,
            state: { value: 1 },
            meta: {
              txnSeq: 1,
              txnId: 'i-1::t1',
              commitMode: 'normal',
              priority: 'normal',
              originKind: 'dispatch',
              originName: 'update',
            },
            opSeq: 1,
          })

          scheduler.onSelectorChanged({
            moduleInstanceKey: moduleKey,
            selectorId: 'view',
            priority: 'normal',
          })

          yield* scheduler.flushNow
        }),
      )

      expect(store.getTickSeq()).toBe(1)
      expect(store.getTopicVersion(moduleKey)).toBe(1)
      expect(store.getTopicVersion(selectorKey)).toBe(1)
      expect(moduleNotifyCount).toBe(1)
      expect(selectorNotifyCount).toBe(1)
    } finally {
      releaseSelectorInterest()
      unsubscribeModule()
      unsubscribeSelector()
    }
  })
})
