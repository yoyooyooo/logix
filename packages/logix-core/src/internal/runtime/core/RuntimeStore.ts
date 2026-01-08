import type { StateCommitMeta, StateCommitPriority } from './module.js'

export type ModuleInstanceKey = `${string}::${string}`
export type TopicKey = string

export type TopicKind = 'module' | 'readQuery'

export type TopicInfo =
  | { readonly kind: 'module'; readonly moduleInstanceKey: ModuleInstanceKey }
  | { readonly kind: 'readQuery'; readonly moduleInstanceKey: ModuleInstanceKey; readonly selectorId: string }

export const makeModuleInstanceKey = (moduleId: string, instanceId: string): ModuleInstanceKey =>
  `${moduleId}::${instanceId}`

export const makeReadQueryTopicKey = (moduleInstanceKey: ModuleInstanceKey, selectorId: string): TopicKey =>
  `${moduleInstanceKey}::rq:${selectorId}`

export const parseTopicKey = (topicKey: string): TopicInfo | undefined => {
  const idx = topicKey.indexOf('::')
  if (idx <= 0) return undefined

  const moduleId = topicKey.slice(0, idx)
  const rest = topicKey.slice(idx + 2)
  if (rest.length === 0) return undefined

  const idx2 = rest.indexOf('::')
  if (idx2 < 0) {
    return { kind: 'module', moduleInstanceKey: `${moduleId}::${rest}` }
  }

  const instanceId = rest.slice(0, idx2)
  const suffix = rest.slice(idx2 + 2)
  if (suffix.startsWith('rq:')) {
    const selectorId = suffix.slice('rq:'.length)
    if (selectorId.length === 0) return undefined
    return {
      kind: 'readQuery',
      moduleInstanceKey: `${moduleId}::${instanceId}`,
      selectorId,
    }
  }

  return { kind: 'module', moduleInstanceKey: `${moduleId}::${instanceId}` }
}

export interface RuntimeStoreModuleCommit {
  readonly moduleId: string
  readonly instanceId: string
  readonly moduleInstanceKey: ModuleInstanceKey
  readonly state: unknown
  readonly meta: StateCommitMeta
  readonly opSeq?: number
}

export interface RuntimeStorePendingDrain {
  readonly modules: ReadonlyMap<ModuleInstanceKey, RuntimeStoreModuleCommit>
  readonly dirtyTopics: ReadonlyMap<TopicKey, StateCommitPriority>
}

export interface RuntimeStoreCommitResult {
  readonly changedTopics: ReadonlyMap<TopicKey, { readonly priority: StateCommitPriority; readonly listeners: ReadonlyArray<() => void> }>
}

export interface RuntimeStore {
  // ---- React-facing sync snapshot APIs ----
  readonly getTickSeq: () => number
  readonly getModuleState: (moduleInstanceKey: ModuleInstanceKey) => unknown
  readonly getTopicVersion: (topicKey: TopicKey) => number
  readonly getTopicPriority: (topicKey: TopicKey) => StateCommitPriority
  readonly subscribeTopic: (topicKey: TopicKey, listener: () => void) => () => void
  readonly getTopicSubscriberCount: (topicKey: TopicKey) => number
  readonly getModuleSubscriberCount: (moduleInstanceKey: ModuleInstanceKey) => number

  // ---- Runtime integration ----
  readonly registerModuleInstance: (args: {
    readonly moduleId: string
    readonly instanceId: string
    readonly moduleInstanceKey: ModuleInstanceKey
    readonly initialState: unknown
  }) => void
  readonly unregisterModuleInstance: (moduleInstanceKey: ModuleInstanceKey) => void

  // ---- TickScheduler integration (internal) ----
  readonly hasPending: () => boolean
  readonly enqueueModuleCommit: (commit: RuntimeStoreModuleCommit) => void
  readonly markTopicDirty: (topicKey: TopicKey, priority: StateCommitPriority) => void
  readonly drainPending: () => RuntimeStorePendingDrain | undefined
  readonly requeuePending: (drain: RuntimeStorePendingDrain) => void
  readonly commitTick: (args: {
    readonly tickSeq: number
    readonly accepted: RuntimeStorePendingDrain
  }) => RuntimeStoreCommitResult

  readonly dispose: () => void
}

const maxPriority = (a: StateCommitPriority, b: StateCommitPriority): StateCommitPriority =>
  a === 'normal' || b === 'normal' ? 'normal' : 'low'

export const makeRuntimeStore = (): RuntimeStore => {
  let tickSeq = 0

  // ---- Committed snapshot (read by React) ----
  const moduleStates = new Map<ModuleInstanceKey, unknown>()
  const topicVersions = new Map<TopicKey, number>()
  const topicPriorities = new Map<TopicKey, StateCommitPriority>()

  // ---- Subscriptions ----
  const listenersByTopic = new Map<TopicKey, Set<() => void>>()
  const subscriberCountByModule = new Map<ModuleInstanceKey, number>()

  // ---- Pending (drained by TickScheduler) ----
  let pendingModules = new Map<ModuleInstanceKey, RuntimeStoreModuleCommit>()
  let pendingDirtyTopics = new Map<TopicKey, StateCommitPriority>()

  const getTopicVersion = (topicKey: TopicKey): number => topicVersions.get(topicKey) ?? 0
  const getTopicPriority = (topicKey: TopicKey): StateCommitPriority => topicPriorities.get(topicKey) ?? 'normal'

  const commitTopicBump = (topicKey: TopicKey, priority: StateCommitPriority): void => {
    const prev = topicVersions.get(topicKey) ?? 0
    topicVersions.set(topicKey, prev + 1)
    topicPriorities.set(topicKey, priority)
  }

  const subscribeTopic = (topicKey: TopicKey, listener: () => void): (() => void) => {
    const info = parseTopicKey(topicKey)
    const existing = listenersByTopic.get(topicKey)
    const set = existing ?? new Set<() => void>()
    const alreadyHas = set.has(listener)
    if (!alreadyHas) {
      set.add(listener)
    }
    if (!existing) {
      listenersByTopic.set(topicKey, set)
    }

    if (!alreadyHas && info) {
      const prev = subscriberCountByModule.get(info.moduleInstanceKey) ?? 0
      subscriberCountByModule.set(info.moduleInstanceKey, prev + 1)
    }

    return () => {
      const current = listenersByTopic.get(topicKey)
      if (!current) return
      const deleted = current.delete(listener)
      if (deleted && info) {
        const prev = subscriberCountByModule.get(info.moduleInstanceKey) ?? 0
        const next = prev - 1
        if (next <= 0) {
          subscriberCountByModule.delete(info.moduleInstanceKey)
        } else {
          subscriberCountByModule.set(info.moduleInstanceKey, next)
        }
      }
      if (current.size === 0) {
        listenersByTopic.delete(topicKey)
      }
    }
  }

  const getTopicSubscriberCount = (topicKey: TopicKey): number => listenersByTopic.get(topicKey)?.size ?? 0
  const getModuleSubscriberCount = (moduleInstanceKey: ModuleInstanceKey): number => subscriberCountByModule.get(moduleInstanceKey) ?? 0

  const registerModuleInstance = (args: {
    readonly moduleId: string
    readonly instanceId: string
    readonly moduleInstanceKey: ModuleInstanceKey
    readonly initialState: unknown
  }): void => {
    moduleStates.set(args.moduleInstanceKey, args.initialState)
    // Ensure the module topic exists with a stable baseline version/priority.
    if (!topicVersions.has(args.moduleInstanceKey)) {
      topicVersions.set(args.moduleInstanceKey, 0)
      topicPriorities.set(args.moduleInstanceKey, 'normal')
    }
  }

  const unregisterModuleInstance = (moduleInstanceKey: ModuleInstanceKey): void => {
    moduleStates.delete(moduleInstanceKey)
    // Keep topic versions by default (helps debugging). Subscribers are expected to detach on module destroy.
  }

  const hasPending = (): boolean => pendingModules.size > 0 || pendingDirtyTopics.size > 0

  const enqueueModuleCommit = (commit: RuntimeStoreModuleCommit): void => {
    const prev = pendingModules.get(commit.moduleInstanceKey)
    if (!prev) {
      pendingModules.set(commit.moduleInstanceKey, commit)
    } else {
      pendingModules.set(commit.moduleInstanceKey, {
        ...commit,
        meta: {
          ...commit.meta,
          priority: maxPriority(prev.meta.priority, commit.meta.priority),
        },
      })
    }
  }

  const markTopicDirty = (topicKey: TopicKey, priority: StateCommitPriority): void => {
    const prev = pendingDirtyTopics.get(topicKey)
    pendingDirtyTopics.set(topicKey, prev ? maxPriority(prev, priority) : priority)
  }

  const drainPending = (): RuntimeStorePendingDrain | undefined => {
    if (!hasPending()) return undefined
    const drained: RuntimeStorePendingDrain = {
      modules: pendingModules,
      dirtyTopics: pendingDirtyTopics,
    }
    pendingModules = new Map()
    pendingDirtyTopics = new Map()
    return drained
  }

  const requeuePending = (drain: RuntimeStorePendingDrain): void => {
    for (const [k, commit] of drain.modules) {
      enqueueModuleCommit(commit)
    }
    for (const [k, p] of drain.dirtyTopics) {
      markTopicDirty(k, p)
    }
  }

  const commitTick = (args: { readonly tickSeq: number; readonly accepted: RuntimeStorePendingDrain }): RuntimeStoreCommitResult => {
    tickSeq = args.tickSeq

    for (const [key, commit] of args.accepted.modules) {
      moduleStates.set(key, commit.state)
    }

    const changedTopics = new Map<TopicKey, { readonly priority: StateCommitPriority; readonly listeners: ReadonlyArray<() => void> }>()

    for (const [topicKey, priority] of args.accepted.dirtyTopics) {
      commitTopicBump(topicKey, priority)
      const listeners = Array.from(listenersByTopic.get(topicKey) ?? [])
      if (listeners.length > 0) {
        changedTopics.set(topicKey, { priority, listeners })
      }
    }

    return { changedTopics }
  }

  const getModuleState = (moduleInstanceKey: ModuleInstanceKey): unknown => moduleStates.get(moduleInstanceKey)

  const dispose = (): void => {
    moduleStates.clear()
    topicVersions.clear()
    topicPriorities.clear()
    listenersByTopic.clear()
    subscriberCountByModule.clear()
    pendingModules.clear()
    pendingDirtyTopics.clear()
  }

  return {
    getTickSeq: () => tickSeq,
    getModuleState,
    getTopicVersion,
    getTopicPriority,
    subscribeTopic,
    getTopicSubscriberCount,
    getModuleSubscriberCount,
    registerModuleInstance,
    unregisterModuleInstance,
    hasPending,
    enqueueModuleCommit,
    markTopicDirty,
    drainPending,
    requeuePending,
    commitTick,
    dispose,
  }
}
