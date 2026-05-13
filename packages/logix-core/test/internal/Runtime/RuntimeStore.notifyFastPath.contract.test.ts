import { describe, expect, it } from 'vitest'
import {
  makeModuleInstanceKey,
  makeRuntimeStore,
  type RuntimeStore,
  type RuntimeStoreCommitResult,
  type TopicKey,
} from '../../../src/internal/runtime/core/RuntimeStore.js'
import {
  disableTxnHotPathSentinels,
  enableTxnHotPathSentinels,
  readTxnHotPathSentinels,
  resetTxnHotPathSentinels,
} from '../../../src/internal/runtime/core/txnHotPathSentinels.js'

type DirtyTopicInput = ReadonlyArray<readonly [TopicKey, 'normal']>

const commitTopicsWithCallback = (
  store: RuntimeStore,
  dirtyTopics: DirtyTopicInput,
  tickSeq: number,
  onListener: (listener: () => void) => void,
): RuntimeStoreCommitResult =>
  store.commitTick({
    tickSeq,
    accepted: {
      modules: new Map(),
      dirtyTopics: new Map(dirtyTopics),
    },
    onListener,
  })

describe('RuntimeStore notify fast path contract', () => {
  it('does not snapshot or invoke callbacks when dirtyTopics is empty', () => {
    const store = makeRuntimeStore()
    const topicKey = makeModuleInstanceKey('NotifyFastPath', 'i-1')
    store.registerModuleInstance({
      moduleId: 'NotifyFastPath',
      instanceId: 'i-1',
      moduleInstanceKey: topicKey,
      initialState: { v: 0 },
    })

    const unsubscribe = store.subscribeTopic(topicKey, () => {
      throw new Error('empty dirtyTopics must not notify listeners')
    })
    let callbackCalls = 0

    try {
      const committed = commitTopicsWithCallback(store, [], 1, () => {
        callbackCalls += 1
      })

      expect(committed.changedTopicListeners).toHaveLength(0)
      expect(callbackCalls).toBe(0)
      expect(store.getTopicVersion(topicKey)).toBe(0)
    } finally {
      unsubscribe()
    }
  })

  it('does not invoke callbacks for dirty topics without subscribers', () => {
    const store = makeRuntimeStore()
    const topicKey = makeModuleInstanceKey('NotifyFastPath', 'i-1')
    store.registerModuleInstance({
      moduleId: 'NotifyFastPath',
      instanceId: 'i-1',
      moduleInstanceKey: topicKey,
      initialState: { v: 0 },
    })

    let callbackCalls = 0
    const committed = commitTopicsWithCallback(store, [[topicKey, 'normal']], 1, () => {
      callbackCalls += 1
    })

    expect(committed.changedTopicListeners).toHaveLength(0)
    expect(callbackCalls).toBe(0)
    expect(store.getTopicVersion(topicKey)).toBe(1)
  })

  it('uses the direct callback path without materializing changed listener arrays', () => {
    const store = makeRuntimeStore()
    const topicA = makeModuleInstanceKey('NotifyFastPath', 'a')
    const topicB = makeModuleInstanceKey('NotifyFastPath', 'b')
    const calls: string[] = []

    store.registerModuleInstance({
      moduleId: 'NotifyFastPath',
      instanceId: 'a',
      moduleInstanceKey: topicA,
      initialState: {},
    })
    store.registerModuleInstance({
      moduleId: 'NotifyFastPath',
      instanceId: 'b',
      moduleInstanceKey: topicB,
      initialState: {},
    })

    const unsubscribeA = store.subscribeTopic(topicA, () => calls.push('a'))
    const unsubscribeB = store.subscribeTopic(topicB, () => calls.push('b'))

    enableTxnHotPathSentinels()
    resetTxnHotPathSentinels()

    try {
      const committed = commitTopicsWithCallback(
        store,
        [
          [topicA, 'normal'],
          [topicB, 'normal'],
        ],
        1,
        (listener) => listener(),
      )

      const sentinels = readTxnHotPathSentinels()
      expect(committed.changedTopicListeners).toHaveLength(0)
      expect(calls).toEqual(['a', 'b'])
      expect(sentinels.runtimeStoreDirectListenerCallbackCount).toBe(2)
      expect(sentinels.runtimeStoreChangedListenerFlattenCount).toBe(0)
    } finally {
      disableTxnHotPathSentinels()
      unsubscribeA()
      unsubscribeB()
    }
  })

  it('keeps the array-return path explicit and counted when no direct callback is supplied', () => {
    const store = makeRuntimeStore()
    const topicA = makeModuleInstanceKey('NotifyFastPath', 'array-a')
    const topicB = makeModuleInstanceKey('NotifyFastPath', 'array-b')
    const listenerA = () => undefined
    const listenerB = () => undefined

    store.registerModuleInstance({
      moduleId: 'NotifyFastPath',
      instanceId: 'array-a',
      moduleInstanceKey: topicA,
      initialState: {},
    })
    store.registerModuleInstance({
      moduleId: 'NotifyFastPath',
      instanceId: 'array-b',
      moduleInstanceKey: topicB,
      initialState: {},
    })

    const unsubscribeA = store.subscribeTopic(topicA, listenerA)
    const unsubscribeB = store.subscribeTopic(topicB, listenerB)

    enableTxnHotPathSentinels()
    resetTxnHotPathSentinels()

    try {
      const committed = store.commitTick({
        tickSeq: 1,
        accepted: {
          modules: new Map(),
          dirtyTopics: new Map([
            [topicA, 'normal'],
            [topicB, 'normal'],
          ]),
        },
      })

      const sentinels = readTxnHotPathSentinels()
      expect(committed.changedTopicListeners).toEqual([listenerA, listenerB])
      expect(sentinels.runtimeStoreChangedListenerFlattenCount).toBe(2)
      expect(sentinels.runtimeStoreChangedListenerFlattenEntryCount).toBe(2)
    } finally {
      disableTxnHotPathSentinels()
      unsubscribeA()
      unsubscribeB()
    }
  })
})
