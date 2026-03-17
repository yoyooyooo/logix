import { describe, it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import { getGlobalHostScheduler } from '../../../src/internal/runtime/core/HostScheduler.js'
import { makeJobQueue } from '../../../src/internal/runtime/core/JobQueue.js'
import { makeModuleInstanceKey, makeReadQueryTopicKey, makeRuntimeStore } from '../../../src/internal/runtime/core/RuntimeStore.js'
import { makeTickScheduler } from '../../../src/internal/runtime/core/TickScheduler.js'

describe('TickScheduler selector interest contract', () => {
  it.effect('ignores selector topic subscribers when selector interest is not retained', () =>
    Effect.gen(function* () {
      const store = makeRuntimeStore()
      const queue = makeJobQueue()
      const scheduler = makeTickScheduler({
        runtimeStore: store,
        queue,
        hostScheduler: getGlobalHostScheduler(),
        config: { maxSteps: 64, urgentStepCap: 64, maxDrainRounds: 4 },
      })

      const moduleKey = makeModuleInstanceKey('SelectorInterestContract', 'i-1')
      const selectorId = 'view'
      const selectorTopic = makeReadQueryTopicKey(moduleKey, selectorId)
      store.registerModuleInstance({
        moduleId: 'SelectorInterestContract',
        instanceId: 'i-1',
        moduleInstanceKey: moduleKey,
        initialState: { v: 0 },
      })

      let notifyCount = 0
      const unsubscribe = store.subscribeTopic(selectorTopic, () => {
        notifyCount += 1
      })

      try {
        scheduler.onSelectorChanged({
          moduleInstanceKey: moduleKey,
          selectorId,
          priority: 'normal',
        })
        yield* scheduler.flushNow

        expect(store.getTickSeq()).toBe(0)
        expect(store.getTopicVersion(selectorTopic)).toBe(0)
        expect(notifyCount).toBe(0)

        const releaseSelectorInterest = store.retainSelectorInterest(moduleKey, selectorId)
        scheduler.onSelectorChanged({
          moduleInstanceKey: moduleKey,
          selectorId,
          priority: 'normal',
        })
        yield* scheduler.flushNow

        expect(store.getTickSeq()).toBe(1)
        expect(store.getTopicVersion(selectorTopic)).toBe(1)
        expect(notifyCount).toBe(1)

        releaseSelectorInterest()
        scheduler.onSelectorChanged({
          moduleInstanceKey: moduleKey,
          selectorId,
          priority: 'normal',
        })
        yield* scheduler.flushNow

        expect(store.getTickSeq()).toBe(1)
        expect(store.getTopicVersion(selectorTopic)).toBe(1)
        expect(notifyCount).toBe(1)
      } finally {
        unsubscribe()
      }
    }),
  )

  it.effect('keeps selector topic dirty while selector interest refCount is positive', () =>
    Effect.gen(function* () {
      const store = makeRuntimeStore()
      const queue = makeJobQueue()
      const scheduler = makeTickScheduler({
        runtimeStore: store,
        queue,
        hostScheduler: getGlobalHostScheduler(),
        config: { maxSteps: 64, urgentStepCap: 64, maxDrainRounds: 4 },
      })

      const moduleKey = makeModuleInstanceKey('SelectorInterestContractRefCount', 'i-1')
      const selectorId = 'view'
      const selectorTopic = makeReadQueryTopicKey(moduleKey, selectorId)
      store.registerModuleInstance({
        moduleId: 'SelectorInterestContractRefCount',
        instanceId: 'i-1',
        moduleInstanceKey: moduleKey,
        initialState: { v: 0 },
      })

      const releaseA = store.retainSelectorInterest(moduleKey, selectorId)
      const releaseB = store.retainSelectorInterest(moduleKey, selectorId)

      scheduler.onSelectorChanged({
        moduleInstanceKey: moduleKey,
        selectorId,
        priority: 'normal',
      })
      yield* scheduler.flushNow
      expect(store.getTopicVersion(selectorTopic)).toBe(1)

      releaseA()
      scheduler.onSelectorChanged({
        moduleInstanceKey: moduleKey,
        selectorId,
        priority: 'normal',
      })
      yield* scheduler.flushNow
      expect(store.getTopicVersion(selectorTopic)).toBe(2)

      releaseB()
      scheduler.onSelectorChanged({
        moduleInstanceKey: moduleKey,
        selectorId,
        priority: 'normal',
      })
      yield* scheduler.flushNow
      expect(store.getTopicVersion(selectorTopic)).toBe(2)
    }),
  )
})
