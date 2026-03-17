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
  readonly schedulingPolicy?: {
    readonly configScope: 'builtin' | 'runtime_default' | 'runtime_module' | 'provider'
    readonly concurrencyLimit: number | 'unbounded'
    readonly allowUnbounded: boolean
    readonly losslessBackpressureCapacity: number
    readonly pressureWarningThreshold: {
      readonly backlogCount: number
      readonly backlogDurationMs: number
    }
    readonly warningCooldownMs: number
    readonly resolvedAtTxnSeq: number
  }
}

export interface RuntimeStorePendingDrain {
  readonly modules: ReadonlyMap<ModuleInstanceKey, RuntimeStoreModuleCommit>
  readonly dirtyTopics: ReadonlyMap<TopicKey, StateCommitPriority>
}

export interface RuntimeStoreCommitResult {
  readonly changedTopicListeners: ReadonlyArray<() => void>
}

export type RuntimeStoreListenerCallback = (listener: () => void) => void

interface TopicListenersState {
  readonly listeners: Set<() => void>
  snapshot: ReadonlyArray<() => void>
}

const EMPTY_LISTENER_SNAPSHOT: ReadonlyArray<() => void> = []

export interface RuntimeStore {
  // ---- React-facing sync snapshot APIs ----
  readonly getTickSeq: () => number
  readonly getModuleTopicKey: (moduleId: string, instanceId: string) => ModuleInstanceKey
  readonly getReadQueryTopicKey: (moduleInstanceKey: ModuleInstanceKey, selectorId: string) => TopicKey
  readonly resolveTopicModuleInstanceKey: (topicKey: TopicKey) => ModuleInstanceKey | undefined
  readonly getModuleState: (moduleInstanceKey: ModuleInstanceKey) => unknown
  readonly getTopicVersion: (topicKey: TopicKey) => number
  readonly getTopicPriority: (topicKey: TopicKey) => StateCommitPriority
  readonly subscribeTopic: (topicKey: TopicKey, listener: () => void) => () => void
  readonly getTopicSubscriberCount: (topicKey: TopicKey) => number
  readonly getModuleSubscriberCount: (moduleInstanceKey: ModuleInstanceKey) => number
  readonly getReadQuerySubscriberCount: (moduleInstanceKey: ModuleInstanceKey, selectorId: string) => number
  readonly retainSelectorInterest: (moduleInstanceKey: ModuleInstanceKey, selectorId: string) => () => void
  readonly hasSelectorInterest: (moduleInstanceKey: ModuleInstanceKey, selectorId: string) => boolean

  // ---- Runtime integration ----
  readonly registerModuleInstance: (args: {
    readonly moduleId: string
    readonly instanceId: string
    readonly moduleInstanceKey: ModuleInstanceKey
    readonly initialState: unknown
  }) => void
  readonly unregisterModuleInstance: (moduleInstanceKey: ModuleInstanceKey) => void

  // ---- TickScheduler integration (internal) ----
  readonly commitTick: (args: {
    readonly tickSeq: number
    readonly accepted: RuntimeStorePendingDrain
    readonly onListener?: RuntimeStoreListenerCallback
  }) => RuntimeStoreCommitResult

  readonly dispose: () => void
}

const NO_CHANGED_TOPIC_LISTENERS: ReadonlyArray<() => void> = []
const topicResolutionCacheLimit = 2048
const readQueryTopicKeyCachePerModuleLimit = 256

export const makeRuntimeStore = (): RuntimeStore => {
  let tickSeq = 0

  // ---- Committed snapshot (read by React) ----
  const moduleStates = new Map<ModuleInstanceKey, unknown>()
  const topicVersions = new Map<TopicKey, number>()
  const topicPriorities = new Map<TopicKey, StateCommitPriority>()
  const topicInfoByTopic = new Map<TopicKey, TopicInfo | null>()
  const readQueryTopicKeysByModule = new Map<ModuleInstanceKey, Map<string, TopicKey>>()

  // ---- Subscriptions ----
  const listenersByTopic = new Map<TopicKey, TopicListenersState>()
  const subscriberCountByModule = new Map<ModuleInstanceKey, number>()
  const subscriberCountByReadQuery = new Map<ModuleInstanceKey, Map<string, number>>()
  const selectorInterestRefCountByReadQuery = new Map<ModuleInstanceKey, Map<string, number>>()

  const getTopicVersion = (topicKey: TopicKey): number => topicVersions.get(topicKey) ?? 0
  const getTopicPriority = (topicKey: TopicKey): StateCommitPriority => topicPriorities.get(topicKey) ?? 'normal'

  const rememberTopicInfo = (topicKey: TopicKey, info: TopicInfo | undefined): TopicInfo | undefined => {
    const cachedValue = info ?? null
    if (topicInfoByTopic.has(topicKey)) {
      topicInfoByTopic.delete(topicKey)
    } else if (topicInfoByTopic.size >= topicResolutionCacheLimit) {
      const oldestKey = topicInfoByTopic.keys().next().value
      if (oldestKey !== undefined) {
        topicInfoByTopic.delete(oldestKey)
      }
    }
    topicInfoByTopic.set(topicKey, cachedValue)
    return info
  }

  const resolveTopicInfo = (topicKey: TopicKey): TopicInfo | undefined => {
    const cached = topicInfoByTopic.get(topicKey)
    if (cached !== undefined) {
      return cached === null ? undefined : cached
    }
    return rememberTopicInfo(topicKey, parseTopicKey(topicKey))
  }

  const getModuleTopicKey: RuntimeStore['getModuleTopicKey'] = (moduleId, instanceId) => {
    const moduleInstanceKey = makeModuleInstanceKey(moduleId, instanceId)
    rememberTopicInfo(moduleInstanceKey, { kind: 'module', moduleInstanceKey })
    return moduleInstanceKey
  }

  const ensureReadQueryTopicBucket = (moduleInstanceKey: ModuleInstanceKey): Map<string, TopicKey> => {
    const existing = readQueryTopicKeysByModule.get(moduleInstanceKey)
    if (existing) return existing
    const created = new Map<string, TopicKey>()
    readQueryTopicKeysByModule.set(moduleInstanceKey, created)
    return created
  }

  const rememberReadQueryTopicKey = (moduleInstanceKey: ModuleInstanceKey, selectorId: string, topicKey: TopicKey): TopicKey => {
    const bucket = ensureReadQueryTopicBucket(moduleInstanceKey)
    if (bucket.has(selectorId)) {
      bucket.delete(selectorId)
    } else if (bucket.size >= readQueryTopicKeyCachePerModuleLimit) {
      const oldestSelectorId = bucket.keys().next().value
      if (oldestSelectorId !== undefined) {
        bucket.delete(oldestSelectorId)
      }
    }
    bucket.set(selectorId, topicKey)
    rememberTopicInfo(topicKey, { kind: 'readQuery', moduleInstanceKey, selectorId })
    return topicKey
  }

  const getReadQueryTopicKey: RuntimeStore['getReadQueryTopicKey'] = (moduleInstanceKey, selectorId) => {
    const cached = readQueryTopicKeysByModule.get(moduleInstanceKey)?.get(selectorId)
    if (cached) return cached
    return rememberReadQueryTopicKey(moduleInstanceKey, selectorId, makeReadQueryTopicKey(moduleInstanceKey, selectorId))
  }

  const resolveTopicModuleInstanceKey: RuntimeStore['resolveTopicModuleInstanceKey'] = (topicKey) =>
    resolveTopicInfo(topicKey)?.moduleInstanceKey

  const commitTopicBump = (topicKey: TopicKey, priority: StateCommitPriority): void => {
    const prev = topicVersions.get(topicKey) ?? 0
    topicVersions.set(topicKey, prev + 1)
    topicPriorities.set(topicKey, priority)
  }

  const refreshTopicSnapshot = (state: TopicListenersState): void => {
    state.snapshot = Array.from(state.listeners)
  }

  const bumpReadQuerySubscriberCount = (moduleInstanceKey: ModuleInstanceKey, selectorId: string): void => {
    const bySelector = subscriberCountByReadQuery.get(moduleInstanceKey) ?? new Map<string, number>()
    const prev = bySelector.get(selectorId) ?? 0
    bySelector.set(selectorId, prev + 1)
    if (!subscriberCountByReadQuery.has(moduleInstanceKey)) {
      subscriberCountByReadQuery.set(moduleInstanceKey, bySelector)
    }
  }

  const decReadQuerySubscriberCount = (moduleInstanceKey: ModuleInstanceKey, selectorId: string): void => {
    const bySelector = subscriberCountByReadQuery.get(moduleInstanceKey)
    if (!bySelector) return
    const prev = bySelector.get(selectorId) ?? 0
    const next = prev - 1
    if (next <= 0) {
      bySelector.delete(selectorId)
      if (bySelector.size === 0) {
        subscriberCountByReadQuery.delete(moduleInstanceKey)
      }
      return
    }
    bySelector.set(selectorId, next)
  }

  const getReadQuerySubscriberCount: RuntimeStore['getReadQuerySubscriberCount'] = (moduleInstanceKey, selectorId) =>
    subscriberCountByReadQuery.get(moduleInstanceKey)?.get(selectorId) ?? 0

  const retainSelectorInterest: RuntimeStore['retainSelectorInterest'] = (moduleInstanceKey, selectorId) => {
    const bySelector = selectorInterestRefCountByReadQuery.get(moduleInstanceKey) ?? new Map<string, number>()
    const prev = bySelector.get(selectorId) ?? 0
    bySelector.set(selectorId, prev + 1)
    if (!selectorInterestRefCountByReadQuery.has(moduleInstanceKey)) {
      selectorInterestRefCountByReadQuery.set(moduleInstanceKey, bySelector)
    }

    let released = false
    return () => {
      if (released) return
      released = true

      const bucket = selectorInterestRefCountByReadQuery.get(moduleInstanceKey)
      if (!bucket) return

      const current = bucket.get(selectorId) ?? 0
      const next = current - 1
      if (next <= 0) {
        bucket.delete(selectorId)
        if (bucket.size === 0) {
          selectorInterestRefCountByReadQuery.delete(moduleInstanceKey)
        }
        return
      }

      bucket.set(selectorId, next)
    }
  }

  const hasSelectorInterest: RuntimeStore['hasSelectorInterest'] = (moduleInstanceKey, selectorId) =>
    (selectorInterestRefCountByReadQuery.get(moduleInstanceKey)?.get(selectorId) ?? 0) > 0

  const subscribeTopic = (topicKey: TopicKey, listener: () => void): (() => void) => {
    const info = resolveTopicInfo(topicKey)
    const existing = listenersByTopic.get(topicKey)
    const state = existing ?? { listeners: new Set<() => void>(), snapshot: EMPTY_LISTENER_SNAPSHOT }
    const alreadyHas = state.listeners.has(listener)
    if (!alreadyHas) {
      state.listeners.add(listener)
      refreshTopicSnapshot(state)
    }
    if (!existing) {
      listenersByTopic.set(topicKey, state)
    }

    if (!alreadyHas && info) {
      const prev = subscriberCountByModule.get(info.moduleInstanceKey) ?? 0
      subscriberCountByModule.set(info.moduleInstanceKey, prev + 1)
      if (info.kind === 'readQuery') {
        bumpReadQuerySubscriberCount(info.moduleInstanceKey, info.selectorId)
      }
    }

    return () => {
      const currentState = listenersByTopic.get(topicKey)
      if (!currentState) return
      const deleted = currentState.listeners.delete(listener)
      if (deleted && info) {
        const prev = subscriberCountByModule.get(info.moduleInstanceKey) ?? 0
        const next = prev - 1
        if (next <= 0) {
          subscriberCountByModule.delete(info.moduleInstanceKey)
        } else {
          subscriberCountByModule.set(info.moduleInstanceKey, next)
        }
        if (info.kind === 'readQuery') {
          decReadQuerySubscriberCount(info.moduleInstanceKey, info.selectorId)
        }
      }
      if (currentState.listeners.size === 0) {
        listenersByTopic.delete(topicKey)
      } else if (deleted) {
        refreshTopicSnapshot(currentState)
      }
    }
  }

  const getTopicSubscriberCount = (topicKey: TopicKey): number => listenersByTopic.get(topicKey)?.listeners.size ?? 0
  const getModuleSubscriberCount = (moduleInstanceKey: ModuleInstanceKey): number => subscriberCountByModule.get(moduleInstanceKey) ?? 0

  const registerModuleInstance = (args: {
    readonly moduleId: string
    readonly instanceId: string
    readonly moduleInstanceKey: ModuleInstanceKey
    readonly initialState: unknown
  }): void => {
    moduleStates.set(args.moduleInstanceKey, args.initialState)
    rememberTopicInfo(args.moduleInstanceKey, { kind: 'module', moduleInstanceKey: args.moduleInstanceKey })
    // Ensure the module topic exists with a stable baseline version/priority.
    if (!topicVersions.has(args.moduleInstanceKey)) {
      topicVersions.set(args.moduleInstanceKey, 0)
      topicPriorities.set(args.moduleInstanceKey, 'normal')
    }
  }

  const unregisterModuleInstance = (moduleInstanceKey: ModuleInstanceKey): void => {
    moduleStates.delete(moduleInstanceKey)
    readQueryTopicKeysByModule.delete(moduleInstanceKey)
    subscriberCountByReadQuery.delete(moduleInstanceKey)
    selectorInterestRefCountByReadQuery.delete(moduleInstanceKey)
    // Keep topic versions by default (helps debugging). Subscribers are expected to detach on module destroy.
  }

  const commitTick = (args: {
    readonly tickSeq: number
    readonly accepted: RuntimeStorePendingDrain
    readonly onListener?: RuntimeStoreListenerCallback
  }): RuntimeStoreCommitResult => {
    tickSeq = args.tickSeq

    for (const [key, commit] of args.accepted.modules) {
      moduleStates.set(key, commit.state)
    }

    if (args.accepted.dirtyTopics.size === 0) {
      return {
        changedTopicListeners: NO_CHANGED_TOPIC_LISTENERS,
      }
    }

    if (args.onListener) {
      let firstTopicListeners: ReadonlyArray<() => void> | undefined
      let secondTopicListeners: ReadonlyArray<() => void> | undefined
      let restTopicListeners: Array<ReadonlyArray<() => void>> | undefined

      for (const [topicKey, priority] of args.accepted.dirtyTopics) {
        commitTopicBump(topicKey, priority)
        const listeners = listenersByTopic.get(topicKey)?.snapshot ?? EMPTY_LISTENER_SNAPSHOT
        if (listeners.length === 0) {
          continue
        }
        if (!firstTopicListeners) {
          firstTopicListeners = listeners
          continue
        }
        if (!secondTopicListeners) {
          secondTopicListeners = listeners
          continue
        }
        if (!restTopicListeners) {
          restTopicListeners = []
        }
        restTopicListeners.push(listeners)
      }

      if (firstTopicListeners) {
        for (const listener of firstTopicListeners) {
          try {
            args.onListener(listener)
          } catch {
            // best-effort: never let listener callback break commit tick
          }
        }
      }

      if (secondTopicListeners) {
        for (const listener of secondTopicListeners) {
          try {
            args.onListener(listener)
          } catch {
            // best-effort: never let listener callback break commit tick
          }
        }
      }

      if (restTopicListeners) {
        for (const listeners of restTopicListeners) {
          for (const listener of listeners) {
            try {
              args.onListener(listener)
            } catch {
              // best-effort: never let listener callback break commit tick
            }
          }
        }
      }

      return {
        changedTopicListeners: NO_CHANGED_TOPIC_LISTENERS,
      }
    }

    let singleTopicListeners: ReadonlyArray<() => void> | undefined
    let flattenedTopicListeners: Array<() => void> | undefined

    for (const [topicKey, priority] of args.accepted.dirtyTopics) {
      commitTopicBump(topicKey, priority)
      const listeners = listenersByTopic.get(topicKey)?.snapshot ?? EMPTY_LISTENER_SNAPSHOT
      if (listeners.length === 0) {
        continue
      }
      if (flattenedTopicListeners) {
        for (const listener of listeners) {
          flattenedTopicListeners.push(listener)
        }
        continue
      }
      if (!singleTopicListeners) {
        singleTopicListeners = listeners
        continue
      }
      flattenedTopicListeners = Array.from(singleTopicListeners)
      for (const listener of listeners) {
        flattenedTopicListeners.push(listener)
      }
    }

    return {
      changedTopicListeners: flattenedTopicListeners ?? singleTopicListeners ?? NO_CHANGED_TOPIC_LISTENERS,
    }
  }

  const getModuleState = (moduleInstanceKey: ModuleInstanceKey): unknown => moduleStates.get(moduleInstanceKey)

  const dispose = (): void => {
    moduleStates.clear()
    topicVersions.clear()
    topicPriorities.clear()
    topicInfoByTopic.clear()
    readQueryTopicKeysByModule.clear()
    listenersByTopic.clear()
    subscriberCountByModule.clear()
    subscriberCountByReadQuery.clear()
    selectorInterestRefCountByReadQuery.clear()
  }

  return {
    getTickSeq: () => tickSeq,
    getModuleTopicKey,
    getReadQueryTopicKey,
    resolveTopicModuleInstanceKey,
    getModuleState,
    getTopicVersion,
    getTopicPriority,
    subscribeTopic,
    getTopicSubscriberCount,
    getModuleSubscriberCount,
    getReadQuerySubscriberCount,
    retainSelectorInterest,
    hasSelectorInterest,
    registerModuleInstance,
    unregisterModuleInstance,
    commitTick,
    dispose,
  }
}
