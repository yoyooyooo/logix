import { describe, expect, it } from 'vitest'
import {
  makeModuleInstanceKey,
  makeRuntimeStore,
  type RuntimeStore,
  type RuntimeStoreCommitResult,
  type TopicKey,
} from '../../../src/internal/runtime/core/RuntimeStore.js'

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
})
