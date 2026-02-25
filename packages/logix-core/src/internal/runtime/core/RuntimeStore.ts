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
  readonly commitTick: (args: {
    readonly tickSeq: number
    readonly accepted: RuntimeStorePendingDrain
    readonly onListener?: RuntimeStoreListenerCallback
  }) => RuntimeStoreCommitResult

  readonly dispose: () => void
}

const NO_CHANGED_TOPIC_LISTENERS: ReadonlyArray<() => void> = []

export const makeRuntimeStore = (): RuntimeStore => {
  let tickSeq = 0

  // ---- Committed snapshot (read by React) ----
  const moduleStates = new Map<ModuleInstanceKey, unknown>()
  const topicVersions = new Map<TopicKey, number>()
  const topicPriorities = new Map<TopicKey, StateCommitPriority>()

  // ---- Subscriptions ----
  const listenersByTopic = new Map<TopicKey, TopicListenersState>()
  const subscriberCountByModule = new Map<ModuleInstanceKey, number>()

  const getTopicVersion = (topicKey: TopicKey): number => topicVersions.get(topicKey) ?? 0
  const getTopicPriority = (topicKey: TopicKey): StateCommitPriority => topicPriorities.get(topicKey) ?? 'normal'

  const commitTopicBump = (topicKey: TopicKey, priority: StateCommitPriority): void => {
    const prev = topicVersions.get(topicKey) ?? 0
    topicVersions.set(topicKey, prev + 1)
    topicPriorities.set(topicKey, priority)
  }

  const refreshTopicSnapshot = (state: TopicListenersState): void => {
    state.snapshot = Array.from(state.listeners)
  }

  const subscribeTopic = (topicKey: TopicKey, listener: () => void): (() => void) => {
    const info = parseTopicKey(topicKey)
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
    listenersByTopic.clear()
    subscriberCountByModule.clear()
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
    commitTick,
    dispose,
  }
}
