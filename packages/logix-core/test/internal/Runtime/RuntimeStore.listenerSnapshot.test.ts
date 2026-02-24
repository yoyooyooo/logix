import { describe, it, expect } from 'vitest'
import {
  makeModuleInstanceKey,
  makeRuntimeStore,
  type RuntimeStore,
  type TopicKey,
  type RuntimeStoreCommitResult,
} from '../../../src/internal/runtime/core/RuntimeStore.js'

const commitTopic = (store: RuntimeStore, topicKey: TopicKey, tickSeq: number): RuntimeStoreCommitResult =>
  store.commitTick({
    tickSeq,
    accepted: {
      modules: new Map(),
      dirtyTopics: new Map([[topicKey, 'normal']]),
    },
  })

const notify = (committed: RuntimeStoreCommitResult): void => {
  for (const { listeners } of committed.changedTopics.values()) {
    for (const listener of listeners) {
      listener()
    }
  }
}

describe('RuntimeStore listener snapshots', () => {
  it('reuses listener snapshot reference across ticks when subscriptions are unchanged', () => {
    const store = makeRuntimeStore()
    const topicKey = makeModuleInstanceKey('M', 'i-1')
    store.registerModuleInstance({
      moduleId: 'M',
      instanceId: 'i-1',
      moduleInstanceKey: topicKey,
      initialState: { v: 0 },
    })

    const unsubscribe = store.subscribeTopic(topicKey, () => {})

    try {
      const first = commitTopic(store, topicKey, 1).changedTopics.get(topicKey)?.listeners
      const second = commitTopic(store, topicKey, 2).changedTopics.get(topicKey)?.listeners
      expect(first).toBeDefined()
      expect(second).toBeDefined()
      expect(second).toBe(first)
    } finally {
      unsubscribe()
    }
  })

  it('keeps notify order stable and isolates in-tick subscribe/unsubscribe mutations', () => {
    const store = makeRuntimeStore()
    const topicKey = makeModuleInstanceKey('M', 'i-1')
    store.registerModuleInstance({
      moduleId: 'M',
      instanceId: 'i-1',
      moduleInstanceKey: topicKey,
      initialState: { v: 0 },
    })

    const calls: string[] = []

    const listenerB = () => {
      calls.push('B')
    }
    const listenerC = () => {
      calls.push('C')
    }

    let unsubscribeB = () => {}
    let unsubscribeC = () => {}

    const listenerA = () => {
      calls.push('A')
      unsubscribeB()
      unsubscribeC = store.subscribeTopic(topicKey, listenerC)
    }

    const unsubscribeA = store.subscribeTopic(topicKey, listenerA)
    unsubscribeB = store.subscribeTopic(topicKey, listenerB)

    try {
      notify(commitTopic(store, topicKey, 1))
      expect(calls).toEqual(['A', 'B'])
      expect(store.getTopicSubscriberCount(topicKey)).toBe(2)
      expect(store.getModuleSubscriberCount(topicKey)).toBe(2)

      calls.length = 0
      notify(commitTopic(store, topicKey, 2))
      expect(calls).toEqual(['A', 'C'])
      expect(store.getTopicSubscriberCount(topicKey)).toBe(2)
      expect(store.getModuleSubscriberCount(topicKey)).toBe(2)
    } finally {
      unsubscribeA()
      unsubscribeB()
      unsubscribeC()
    }
  })
})
