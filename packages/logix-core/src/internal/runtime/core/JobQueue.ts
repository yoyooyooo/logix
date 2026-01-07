import type { StateCommitPriority } from './module.js'
import type { ModuleInstanceKey, RuntimeStoreModuleCommit, RuntimeStorePendingDrain, TopicKey } from './RuntimeStore.js'

export interface JobQueue {
  readonly hasPending: () => boolean
  /** Returns true when the operation coalesced with an existing pending entry. */
  readonly enqueueModuleCommit: (commit: RuntimeStoreModuleCommit) => boolean
  /** Returns true when the operation coalesced with an existing pending entry. */
  readonly markTopicDirty: (topicKey: TopicKey, priority: StateCommitPriority) => boolean
  readonly drain: () => RuntimeStorePendingDrain | undefined
  readonly requeue: (drain: RuntimeStorePendingDrain) => void
}

const maxPriority = (a: StateCommitPriority, b: StateCommitPriority): StateCommitPriority =>
  a === 'normal' || b === 'normal' ? 'normal' : 'low'

export const makeJobQueue = (): JobQueue => {
  let pendingModules = new Map<ModuleInstanceKey, RuntimeStoreModuleCommit>()
  let pendingDirtyTopics = new Map<TopicKey, StateCommitPriority>()

  const hasPending = (): boolean => pendingModules.size > 0 || pendingDirtyTopics.size > 0

  const enqueueModuleCommit = (commit: RuntimeStoreModuleCommit): boolean => {
    const prev = pendingModules.get(commit.moduleInstanceKey)
    if (!prev) {
      pendingModules.set(commit.moduleInstanceKey, commit)
      return false
    }

    pendingModules.set(commit.moduleInstanceKey, {
      ...commit,
      meta: {
        ...commit.meta,
        priority: maxPriority(prev.meta.priority, commit.meta.priority),
      },
    })
    return true
  }

  const markTopicDirty = (topicKey: TopicKey, priority: StateCommitPriority): boolean => {
    const prev = pendingDirtyTopics.get(topicKey)
    pendingDirtyTopics.set(topicKey, prev ? maxPriority(prev, priority) : priority)
    return prev != null
  }

  const drain = (): RuntimeStorePendingDrain | undefined => {
    if (!hasPending()) return undefined
    const drained: RuntimeStorePendingDrain = {
      modules: pendingModules,
      dirtyTopics: pendingDirtyTopics,
    }
    pendingModules = new Map()
    pendingDirtyTopics = new Map()
    return drained
  }

  const requeue = (drain: RuntimeStorePendingDrain): void => {
    for (const [, commit] of drain.modules) {
      enqueueModuleCommit(commit)
    }
    for (const [k, p] of drain.dirtyTopics) {
      markTopicDirty(k, p)
    }
  }

  return {
    hasPending,
    enqueueModuleCommit,
    markTopicDirty,
    drain,
    requeue,
  }
}

