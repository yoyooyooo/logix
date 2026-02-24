import { describe, it, expect } from 'vitest'
import {
  makeModuleInstanceKey,
  makeRuntimeStore,
  type RuntimeStore,
  type TopicKey,
  type RuntimeStoreCommitResult,
} from '../../../src/internal/runtime/core/RuntimeStore.js'

type DirtyTopicInput = ReadonlyArray<readonly [TopicKey, 'normal']>

const commitTopic = (store: RuntimeStore, topicKey: TopicKey, tickSeq: number): RuntimeStoreCommitResult =>
  commitTopics(store, [[topicKey, 'normal']], tickSeq)

const commitTopics = (store: RuntimeStore, dirtyTopics: DirtyTopicInput, tickSeq: number): RuntimeStoreCommitResult =>
  store.commitTick({
    tickSeq,
    accepted: {
      modules: new Map(),
      dirtyTopics: new Map(dirtyTopics),
    },
  })

const commitTopicWithCallback = (store: RuntimeStore, topicKey: TopicKey, tickSeq: number, onListener: (listener: () => void) => void): RuntimeStoreCommitResult =>
  commitTopicsWithCallback(store, [[topicKey, 'normal']], tickSeq, onListener)

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

const notify = (committed: RuntimeStoreCommitResult): void => {
  for (const listener of committed.changedTopicListeners) {
    listener()
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
      const first = commitTopic(store, topicKey, 1).changedTopicListeners
      const second = commitTopic(store, topicKey, 2).changedTopicListeners
      expect(first.length).toBe(1)
      expect(second.length).toBe(1)
      expect(second[0]).toBe(first[0])
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

  it('supports callback fast-path and preserves in-tick subscription mutation isolation', () => {
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
      const first = commitTopicWithCallback(store, topicKey, 1, (listener) => listener())
      expect(first.changedTopicListeners).toHaveLength(0)
      expect(calls).toEqual(['A', 'B'])
      expect(store.getTopicSubscriberCount(topicKey)).toBe(2)
      expect(store.getModuleSubscriberCount(topicKey)).toBe(2)

      calls.length = 0

      const second = commitTopicWithCallback(store, topicKey, 2, (listener) => listener())
      expect(second.changedTopicListeners).toHaveLength(0)
      expect(calls).toEqual(['A', 'C'])
      expect(store.getTopicSubscriberCount(topicKey)).toBe(2)
      expect(store.getModuleSubscriberCount(topicKey)).toBe(2)
    } finally {
      unsubscribeA()
      unsubscribeB()
      unsubscribeC()
    }
  })

  it('callback fast-path snapshots all topics before notify in same tick', () => {
    const store = makeRuntimeStore()
    const topicA = makeModuleInstanceKey('M', 'i-1')
    const topicB = makeModuleInstanceKey('M', 'i-2')

    store.registerModuleInstance({
      moduleId: 'M',
      instanceId: 'i-1',
      moduleInstanceKey: topicA,
      initialState: { v: 0 },
    })
    store.registerModuleInstance({
      moduleId: 'M',
      instanceId: 'i-2',
      moduleInstanceKey: topicB,
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
      unsubscribeC = store.subscribeTopic(topicB, listenerC)
    }

    const unsubscribeA = store.subscribeTopic(topicA, listenerA)
    unsubscribeB = store.subscribeTopic(topicB, listenerB)

    try {
      const first = commitTopicsWithCallback(
        store,
        [
          [topicA, 'normal'],
          [topicB, 'normal'],
        ],
        1,
        (listener) => listener(),
      )

      expect(first.changedTopicListeners).toHaveLength(0)
      expect(calls).toEqual(['A', 'B'])
      expect(store.getTopicSubscriberCount(topicB)).toBe(1)

      calls.length = 0

      const second = commitTopicsWithCallback(store, [[topicB, 'normal']], 2, (listener) => listener())
      expect(second.changedTopicListeners).toHaveLength(0)
      expect(calls).toEqual(['C'])
    } finally {
      unsubscribeA()
      unsubscribeB()
      unsubscribeC()
    }
  })

  it('callback fast-path is best-effort when listener throws', () => {
    const store = makeRuntimeStore()
    const topicA = makeModuleInstanceKey('M', 'i-1')
    const topicB = makeModuleInstanceKey('M', 'i-2')

    store.registerModuleInstance({
      moduleId: 'M',
      instanceId: 'i-1',
      moduleInstanceKey: topicA,
      initialState: { v: 0 },
    })
    store.registerModuleInstance({
      moduleId: 'M',
      instanceId: 'i-2',
      moduleInstanceKey: topicB,
      initialState: { v: 0 },
    })

    const calls: string[] = []
    const unsubscribeA = store.subscribeTopic(topicA, () => {
      calls.push('A')
      throw new Error('listener A failed')
    })
    const unsubscribeB = store.subscribeTopic(topicB, () => {
      calls.push('B')
    })

    try {
      expect(() =>
        commitTopicsWithCallback(
          store,
          [
            [topicA, 'normal'],
            [topicB, 'normal'],
          ],
          1,
          (listener) => listener(),
        ),
      ).not.toThrow()
      expect(calls).toEqual(['A', 'B'])
      expect(store.getTopicVersion(topicA)).toBe(1)
      expect(store.getTopicVersion(topicB)).toBe(1)
    } finally {
      unsubscribeA()
      unsubscribeB()
    }
  })
})
