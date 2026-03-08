import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import { getGlobalHostScheduler } from '../../../src/internal/runtime/core/HostScheduler.js'
import { makeJobQueue } from '../../../src/internal/runtime/core/JobQueue.js'
import { makeModuleInstanceKey, makeReadQueryTopicKey, makeRuntimeStore } from '../../../src/internal/runtime/core/RuntimeStore.js'
import { makeTickScheduler } from '../../../src/internal/runtime/core/TickScheduler.js'

describe('TickScheduler topic classification', () => {
  it.effect('should keep module and selector topics aligned with accepted/deferred modules', () =>
    Effect.gen(function* () {
      const store = makeRuntimeStore()
      const queue = makeJobQueue()
      const scheduler = makeTickScheduler({
        runtimeStore: store,
        queue,
        hostScheduler: getGlobalHostScheduler(),
        config: { maxSteps: 1, urgentStepCap: 64, maxDrainRounds: 4 },
      })

      const acceptedKey = makeModuleInstanceKey('Accepted', 'i-1')
      const deferredKey = makeModuleInstanceKey('Deferred', 'i-1')
      const acceptedSelectorTopic = makeReadQueryTopicKey(acceptedKey, 'view')
      const deferredSelectorTopic = makeReadQueryTopicKey(deferredKey, 'view')

      store.registerModuleInstance({ moduleId: 'Accepted', instanceId: 'i-1', moduleInstanceKey: acceptedKey, initialState: { v: 0 } })
      store.registerModuleInstance({ moduleId: 'Deferred', instanceId: 'i-1', moduleInstanceKey: deferredKey, initialState: { v: 0 } })

      const topicNotifications = {
        acceptedModule: 0,
        acceptedSelector: 0,
        deferredModule: 0,
        deferredSelector: 0,
      }

      const unsubscribes = [
        store.subscribeTopic(acceptedKey, () => {
          topicNotifications.acceptedModule += 1
        }),
        store.subscribeTopic(acceptedSelectorTopic, () => {
          topicNotifications.acceptedSelector += 1
        }),
        store.subscribeTopic(deferredKey, () => {
          topicNotifications.deferredModule += 1
        }),
        store.subscribeTopic(deferredSelectorTopic, () => {
          topicNotifications.deferredSelector += 1
        }),
      ]

      queue.enqueueModuleCommit({
        moduleId: 'Accepted',
        instanceId: 'i-1',
        moduleInstanceKey: acceptedKey,
        state: { v: 1 },
        meta: { txnSeq: 1, txnId: 'i-1::t1', commitMode: 'lowPriority', priority: 'low', originKind: 'dispatch', originName: 'accepted' },
        opSeq: 1,
      })
      queue.markTopicDirty(acceptedKey, 'low')
      queue.markTopicDirty(acceptedSelectorTopic, 'low')

      queue.enqueueModuleCommit({
        moduleId: 'Deferred',
        instanceId: 'i-1',
        moduleInstanceKey: deferredKey,
        state: { v: 1 },
        meta: { txnSeq: 1, txnId: 'i-1::t1', commitMode: 'lowPriority', priority: 'low', originKind: 'dispatch', originName: 'deferred' },
        opSeq: 2,
      })
      queue.markTopicDirty(deferredKey, 'low')
      queue.markTopicDirty(deferredSelectorTopic, 'low')

      yield* scheduler.flushNow

      expect(store.getTickSeq()).toBe(1)
      expect(store.getModuleState(acceptedKey)).toEqual({ v: 1 })
      expect(store.getModuleState(deferredKey)).toEqual({ v: 0 })

      expect(store.getTopicVersion(acceptedKey)).toBe(1)
      expect(store.getTopicVersion(acceptedSelectorTopic)).toBe(1)
      expect(store.getTopicVersion(deferredKey)).toBe(0)
      expect(store.getTopicVersion(deferredSelectorTopic)).toBe(0)

      expect(topicNotifications.acceptedModule).toBe(1)
      expect(topicNotifications.acceptedSelector).toBe(1)
      expect(topicNotifications.deferredModule).toBe(0)
      expect(topicNotifications.deferredSelector).toBe(0)

      yield* scheduler.flushNow

      expect(store.getTickSeq()).toBe(2)
      expect(store.getModuleState(deferredKey)).toEqual({ v: 1 })
      expect(store.getTopicVersion(deferredKey)).toBe(1)
      expect(store.getTopicVersion(deferredSelectorTopic)).toBe(1)
      expect(topicNotifications.deferredModule).toBe(1)
      expect(topicNotifications.deferredSelector).toBe(1)

      for (const unsubscribe of unsubscribes) {
        unsubscribe()
      }
    }),
  )

  it.effect('should keep conservative unknown-topic fallback and ignore non-parsable topic keys', () =>
    Effect.gen(function* () {
      const store = makeRuntimeStore()
      const queue = makeJobQueue()
      const scheduler = makeTickScheduler({
        runtimeStore: store,
        queue,
        hostScheduler: getGlobalHostScheduler(),
        config: { maxSteps: 64, urgentStepCap: 64, maxDrainRounds: 4 },
      })

      const unknownModuleTopic = makeModuleInstanceKey('UnknownModule', 'i-1')
      const nonParsableTopic = 'not-a-module-topic'
      let unknownModuleTopicNotified = 0
      let nonParsableTopicNotified = 0

      const unsubscribes = [
        store.subscribeTopic(unknownModuleTopic, () => {
          unknownModuleTopicNotified += 1
        }),
        store.subscribeTopic(nonParsableTopic, () => {
          nonParsableTopicNotified += 1
        }),
      ]

      queue.markTopicDirty(unknownModuleTopic, 'normal')
      queue.markTopicDirty(nonParsableTopic, 'normal')

      yield* scheduler.flushNow

      expect(store.getTickSeq()).toBe(1)
      expect(store.getTopicVersion(unknownModuleTopic)).toBe(1)
      expect(unknownModuleTopicNotified).toBe(1)

      expect(store.getTopicVersion(nonParsableTopic)).toBe(0)
      expect(nonParsableTopicNotified).toBe(0)

      queue.markTopicDirty(unknownModuleTopic, 'normal')
      queue.markTopicDirty(nonParsableTopic, 'normal')

      yield* scheduler.flushNow

      expect(store.getTickSeq()).toBe(2)
      expect(store.getTopicVersion(unknownModuleTopic)).toBe(2)
      expect(unknownModuleTopicNotified).toBe(2)
      expect(store.getTopicVersion(nonParsableTopic)).toBe(0)
      expect(nonParsableTopicNotified).toBe(0)

      for (const unsubscribe of unsubscribes) {
        unsubscribe()
      }
    }),
  )
})
