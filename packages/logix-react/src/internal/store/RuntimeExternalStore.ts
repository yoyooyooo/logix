import * as Logix from '@logixjs/core'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
import { Effect } from 'effect'
import type { ManagedRuntime } from 'effect'
import {
  registerRuntimeExternalStoreDisposer,
  unregisterRuntimeExternalStoreDisposer,
} from './RuntimeExternalStore.hotLifecycle.js'

export interface ExternalStore<S> {
  readonly getSnapshot: () => S
  readonly getServerSnapshot?: () => S
  readonly subscribe: (listener: () => void) => () => void
}

export interface ExternalStoreOptions {
  readonly lowPriorityDelayMs?: number
  readonly lowPriorityMaxDelayMs?: number
}

type TopicKey = string
type ModuleInstanceKey = string

type RuntimeStore = {
  readonly hasModuleState: (moduleInstanceKey: ModuleInstanceKey) => boolean
  readonly getModuleState: (moduleInstanceKey: ModuleInstanceKey) => unknown
  readonly getTopicVersion: (topicKey: TopicKey) => number
  readonly getTopicPriority: (topicKey: TopicKey) => Logix.StateCommitPriority
  readonly subscribeTopic: (topicKey: TopicKey, listener: () => void) => () => void
}

type ReadQueryTopicRetainer<S> = {
  readonly retainReadQueryTopic: <V>(
    selectorReadQuery: RuntimeContracts.Selector.ReadQueryCompiled<S, V>,
  ) => Effect.Effect<unknown, never, any>
}

type Cancel = () => void

type HostScheduler = {
  readonly scheduleMicrotask: (cb: () => void) => void
  readonly scheduleAnimationFrame: (cb: () => void) => Cancel
  readonly scheduleTimeout: (ms: number, cb: () => void) => Cancel
}

export type RuntimeExternalStoreConvergenceSentinelSnapshot = {
  readonly runSyncFallbackColdCount: number
  readonly runSyncFallbackAfterBootCount: number
  readonly moduleRunSyncFallbackAfterBootCount: number
  readonly readQueryRunSyncFallbackAfterBootCount: number
  readonly readQueryRetainCount: number
  readonly readQueryReleaseCount: number
  readonly activeReadQueryRetainCount: number
}

const runtimeExternalStoreConvergenceCounters = {
  runSyncFallbackColdCount: 0,
  runSyncFallbackAfterBootCount: 0,
  moduleRunSyncFallbackAfterBootCount: 0,
  readQueryRunSyncFallbackAfterBootCount: 0,
  readQueryRetainCount: 0,
  readQueryReleaseCount: 0,
  activeReadQueryRetainCount: 0,
}

let runtimeExternalStoreConvergenceSentinelsEnabled = false
let runtimeExternalStoreConvergenceBootComplete = false

export const enableRuntimeExternalStoreConvergenceSentinels = (): void => {
  runtimeExternalStoreConvergenceSentinelsEnabled = true
}

export const disableRuntimeExternalStoreConvergenceSentinels = (): void => {
  runtimeExternalStoreConvergenceSentinelsEnabled = false
}

export const markRuntimeExternalStoreConvergenceBootComplete = (): void => {
  runtimeExternalStoreConvergenceBootComplete = true
}

export const resetRuntimeExternalStoreConvergenceSentinels = (): void => {
  runtimeExternalStoreConvergenceCounters.runSyncFallbackColdCount = 0
  runtimeExternalStoreConvergenceCounters.runSyncFallbackAfterBootCount = 0
  runtimeExternalStoreConvergenceCounters.moduleRunSyncFallbackAfterBootCount = 0
  runtimeExternalStoreConvergenceCounters.readQueryRunSyncFallbackAfterBootCount = 0
  runtimeExternalStoreConvergenceCounters.readQueryRetainCount = 0
  runtimeExternalStoreConvergenceCounters.readQueryReleaseCount = 0
  runtimeExternalStoreConvergenceCounters.activeReadQueryRetainCount = 0
  runtimeExternalStoreConvergenceBootComplete = false
}

export const readRuntimeExternalStoreConvergenceSentinels = (): RuntimeExternalStoreConvergenceSentinelSnapshot => ({
  runSyncFallbackColdCount: runtimeExternalStoreConvergenceCounters.runSyncFallbackColdCount,
  runSyncFallbackAfterBootCount: runtimeExternalStoreConvergenceCounters.runSyncFallbackAfterBootCount,
  moduleRunSyncFallbackAfterBootCount: runtimeExternalStoreConvergenceCounters.moduleRunSyncFallbackAfterBootCount,
  readQueryRunSyncFallbackAfterBootCount:
    runtimeExternalStoreConvergenceCounters.readQueryRunSyncFallbackAfterBootCount,
  readQueryRetainCount: runtimeExternalStoreConvergenceCounters.readQueryRetainCount,
  readQueryReleaseCount: runtimeExternalStoreConvergenceCounters.readQueryReleaseCount,
  activeReadQueryRetainCount: runtimeExternalStoreConvergenceCounters.activeReadQueryRetainCount,
})

const recordReadQueryRetain = (): void => {
  if (!runtimeExternalStoreConvergenceSentinelsEnabled) return
  runtimeExternalStoreConvergenceCounters.readQueryRetainCount += 1
  runtimeExternalStoreConvergenceCounters.activeReadQueryRetainCount += 1
}

const recordReadQueryRelease = (): void => {
  if (!runtimeExternalStoreConvergenceSentinelsEnabled) return
  runtimeExternalStoreConvergenceCounters.readQueryReleaseCount += 1
  if (runtimeExternalStoreConvergenceCounters.activeReadQueryRetainCount > 0) {
    runtimeExternalStoreConvergenceCounters.activeReadQueryRetainCount -= 1
  }
}

const readCommittedModuleState = <S>(runtimeStore: RuntimeStore, moduleInstanceKey: ModuleInstanceKey): S => {
  if (runtimeStore.hasModuleState(moduleInstanceKey)) {
    return runtimeStore.getModuleState(moduleInstanceKey) as S
  }
  throw new Error(`[Logix][RuntimeExternalStore] Missing committed module state for ${moduleInstanceKey}`)
}

const storesByRuntime = new WeakMap<object, Map<TopicKey, ExternalStore<any>>>()

const getStoreMapForRuntime = (runtime: object): Map<TopicKey, ExternalStore<any>> => {
  const cached = storesByRuntime.get(runtime)
  if (cached) return cached
  const next = new Map<TopicKey, ExternalStore<any>>()
  storesByRuntime.set(runtime, next)
  return next
}

const makeModuleInstanceKey = (moduleId: string, instanceId: string): ModuleInstanceKey => `${moduleId}::${instanceId}`

const makeReadQueryTopicKey = (moduleInstanceKey: ModuleInstanceKey, selectorFingerprint: string): TopicKey =>
  `${moduleInstanceKey}::rq:${selectorFingerprint}`

const getRuntimeStore = (runtime: ManagedRuntime.ManagedRuntime<any, any>): RuntimeStore =>
  RuntimeContracts.getRuntimeStore(runtime as any) as RuntimeStore

const getHostScheduler = (runtime: ManagedRuntime.ManagedRuntime<any, any>): HostScheduler =>
  RuntimeContracts.getHostScheduler(runtime as any) as HostScheduler

const ensureCommittedModuleSnapshot = <S>(
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
  runtimeStore: RuntimeStore,
  moduleRuntime: Logix.ModuleRuntime<S, any>,
  moduleInstanceKey: ModuleInstanceKey,
): void => {
  if (runtimeStore.hasModuleState(moduleInstanceKey)) {
    return
  }
  RuntimeContracts.ensureRuntimeStoreModuleSnapshot(runtime as any, moduleRuntime)
}

const getOrCreateStore = <S>(
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
  topicKey: TopicKey,
  make: () => ExternalStore<S>,
): ExternalStore<S> => {
  const map = getStoreMapForRuntime(runtime as any)
  const cached = map.get(topicKey)
  if (cached) {
    return cached as ExternalStore<S>
  }
  const created = make()
  map.set(topicKey, created as ExternalStore<any>)
  return created
}

const removeStore = (runtime: ManagedRuntime.ManagedRuntime<any, any>, topicKey: TopicKey): void => {
  const map = storesByRuntime.get(runtime as any)
  if (!map) return
  map.delete(topicKey)
}

const makeTopicExternalStore = <S>(args: {
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
  readonly runtimeStore: RuntimeStore
  readonly topicKey: TopicKey
  readonly readSnapshot: () => S
  readonly options?: ExternalStoreOptions
  readonly onFirstListener?: () => void
  readonly onLastListener?: () => void
  readonly invalidateSnapshotOnFirstListener?: boolean
  readonly notifyAfterFirstListenerInvalidation?: boolean
}): ExternalStore<S> => {
  const { runtime, runtimeStore, topicKey } = args
  const hostScheduler = getHostScheduler(runtime)

  let currentVersion: number | undefined
  let hasSnapshot = false
  let currentSnapshot: S | undefined

  const listeners = new Set<() => void>()
  let unsubscribeFromRuntimeStore: (() => void) | undefined
  let teardownScheduled = false
  let teardownToken = 0

  const lowPriorityDelayMs = args.options?.lowPriorityDelayMs ?? 16
  const lowPriorityMaxDelayMs = args.options?.lowPriorityMaxDelayMs ?? 50

  let notifyScheduled = false
  let notifyScheduledLow = false
  let lowCancelDelay: Cancel | undefined
  let lowCancelMaxDelay: Cancel | undefined
  let lowCancelRaf: Cancel | undefined

  const cancelLow = (): void => {
    if (!notifyScheduledLow) return
    notifyScheduledLow = false
    lowCancelDelay?.()
    lowCancelDelay = undefined
    lowCancelMaxDelay?.()
    lowCancelMaxDelay = undefined
    lowCancelRaf?.()
    lowCancelRaf = undefined
  }

  const flushNotify = (): void => {
    notifyScheduled = false
    cancelLow()
    for (const listener of listeners) {
      try {
        listener()
      } catch {
        // best-effort: never let a subscriber break the notifier
      }
    }
  }

  const scheduleNotify = (priority: Logix.StateCommitPriority): void => {
    if (priority === 'low') {
      if (notifyScheduled) return
      if (notifyScheduledLow) return
      notifyScheduledLow = true

      const flush = () => {
        if (!notifyScheduledLow) return
        flushNotify()
      }

      const scheduleRaf = () => {
        if (!notifyScheduledLow) return
        lowCancelRaf = hostScheduler.scheduleAnimationFrame(flush)
      }

      // Delay window semantics:
      // - Do not flush before lowPriorityDelayMs (coalesce more changes).
      // - Prefer aligning the flush to animation frame after the delay.
      // - Always cap by lowPriorityMaxDelayMs (avoid starvation if raf never fires).
      if (lowPriorityDelayMs <= 0) {
        scheduleRaf()
      } else {
        lowCancelDelay = hostScheduler.scheduleTimeout(lowPriorityDelayMs, scheduleRaf)
      }
      lowCancelMaxDelay = hostScheduler.scheduleTimeout(lowPriorityMaxDelayMs, flush)
      return
    }

    cancelLow()
    if (notifyScheduled) return
    notifyScheduled = true
    hostScheduler.scheduleMicrotask(flushNotify)
  }

  const onRuntimeStoreChange = (): void => {
    try {
      scheduleNotify(runtimeStore.getTopicPriority(topicKey))
    } catch {
      // ignore best-effort failures (e.g. runtime disposed)
    }
  }

  const ensureSubscription = (): void => {
    if (unsubscribeFromRuntimeStore) return
    unsubscribeFromRuntimeStore = runtimeStore.subscribeTopic(topicKey, onRuntimeStoreChange)
  }

  const refreshSnapshotIfStale = (): void => {
    if (!hasSnapshot) return
    try {
      const version = runtimeStore.getTopicVersion(topicKey)
      if (currentVersion !== version) {
        scheduleNotify(runtimeStore.getTopicPriority(topicKey))
      }
    } catch {
      // ignore best-effort refresh failures
    }
  }

  const getSnapshot = (): S => {
    const version = runtimeStore.getTopicVersion(topicKey)
    if (hasSnapshot && currentVersion === version) {
      return currentSnapshot as S
    }

    const next = args.readSnapshot()
    currentVersion = version
    hasSnapshot = true
    currentSnapshot = next
    return next
  }

  const cancelScheduledTeardown = (): void => {
    if (!teardownScheduled) return
    teardownScheduled = false
    teardownToken += 1
  }

  const finalizeTeardown = (): void => {
    if (listeners.size > 0) return

    try {
      args.onLastListener?.()
    } catch {
      // ignore best-effort failures
    }

    const unsub = unsubscribeFromRuntimeStore
    unsubscribeFromRuntimeStore = undefined
    cancelLow()

    try {
      unsub?.()
    } catch {
      // ignore best-effort unsubscribe failures
    }

    removeStore(runtime, topicKey)
    unregisterRuntimeExternalStoreDisposer(runtime as unknown as object, topicKey)
  }

  const disposeForHotLifecycle = (): void => {
    listeners.clear()
    teardownScheduled = false
    teardownToken += 1

    try {
      args.onLastListener?.()
    } catch {
      // ignore best-effort failures
    }

    const unsub = unsubscribeFromRuntimeStore
    unsubscribeFromRuntimeStore = undefined
    cancelLow()

    try {
      unsub?.()
    } finally {
      removeStore(runtime, topicKey)
      unregisterRuntimeExternalStoreDisposer(runtime as unknown as object, topicKey)
    }
  }

  const scheduleTeardown = (): void => {
    if (teardownScheduled) return
    teardownScheduled = true
    const token = ++teardownToken
    hostScheduler.scheduleMicrotask(() => {
      if (!teardownScheduled || token !== teardownToken) return
      teardownScheduled = false
      finalizeTeardown()
    })
  }

  const subscribe = (listener: () => void): (() => void) => {
    cancelScheduledTeardown()
    const isFirst = listeners.size === 0
    listeners.add(listener)
    if (isFirst) {
      try {
        args.onFirstListener?.()
      } catch {
        // ignore best-effort failures
      }
      if (args.invalidateSnapshotOnFirstListener) {
        const hadSnapshot = hasSnapshot
        const previousSnapshot = currentSnapshot
        hasSnapshot = false
        currentVersion = undefined
        currentSnapshot = undefined
        if (args.notifyAfterFirstListenerInvalidation) {
          try {
            const nextVersion = runtimeStore.getTopicVersion(topicKey)
            const nextSnapshot = args.readSnapshot()
            currentVersion = nextVersion
            hasSnapshot = true
            currentSnapshot = nextSnapshot
            if (!hadSnapshot || !Object.is(previousSnapshot, nextSnapshot)) {
              scheduleNotify('normal')
            }
          } catch {
            scheduleNotify('normal')
          }
        }
      }
    }
    ensureSubscription()
    refreshSnapshotIfStale()
    return () => {
      listeners.delete(listener)
      if (listeners.size > 0) return
      scheduleTeardown()
    }
  }

  registerRuntimeExternalStoreDisposer(runtime as unknown as object, topicKey, disposeForHotLifecycle)

  return { getSnapshot, getServerSnapshot: getSnapshot, subscribe }
}

export const getRuntimeModuleExternalStore = <S>(
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
  moduleRuntime: Logix.ModuleRuntime<S, any>,
  options?: ExternalStoreOptions,
): ExternalStore<S> => {
  const moduleInstanceKey = makeModuleInstanceKey(moduleRuntime.moduleId, moduleRuntime.instanceId)
  const runtimeStore = getRuntimeStore(runtime)
  ensureCommittedModuleSnapshot(runtime, runtimeStore, moduleRuntime, moduleInstanceKey)

  return getOrCreateStore(runtime, moduleInstanceKey, () =>
    makeTopicExternalStore({
      runtime,
      runtimeStore,
      topicKey: moduleInstanceKey,
      readSnapshot: () => {
        return readCommittedModuleState<S>(runtimeStore, moduleInstanceKey)
      },
      options,
    }),
  )
}

export const getRuntimeReadQueryExternalStore = <S, V>(
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
  moduleRuntime: Logix.ModuleRuntime<S, any>,
  selectorReadQuery: RuntimeContracts.Selector.ReadQueryCompiled<S, V>,
  route: RuntimeContracts.Selector.SelectorRouteDecision,
  options?: ExternalStoreOptions,
): ExternalStore<V> => {
  const moduleInstanceKey = makeModuleInstanceKey(moduleRuntime.moduleId, moduleRuntime.instanceId)
  const topicKey = makeReadQueryTopicKey(moduleInstanceKey, route.selectorFingerprint.value)
  const runtimeStore = getRuntimeStore(runtime)
  ensureCommittedModuleSnapshot(runtime, runtimeStore, moduleRuntime, moduleInstanceKey)
  let readQueryRetainCancel: Cancel | undefined

  return getOrCreateStore(runtime, topicKey, () =>
    makeTopicExternalStore({
      runtime,
      runtimeStore,
      topicKey,
      readSnapshot: () => {
        const current = readCommittedModuleState<S>(runtimeStore, moduleInstanceKey)
        return selectorReadQuery.select(current)
      },
      options,
      onFirstListener: () => {
        if (readQueryRetainCancel) return
        recordReadQueryRetain()
        const retainer = moduleRuntime as unknown as ReadQueryTopicRetainer<S>
        const effect = Effect.scoped(
          Effect.flatMap(retainer.retainReadQueryTopic(selectorReadQuery), () => Effect.never),
        ) as Effect.Effect<void, never, any>
        readQueryRetainCancel = runtime.runCallback(effect, {
          onExit: () => undefined,
        })
      },
      invalidateSnapshotOnFirstListener: true,
      notifyAfterFirstListenerInvalidation: true,
      onLastListener: () => {
        const cancel = readQueryRetainCancel
        if (!cancel) return
        readQueryRetainCancel = undefined
        recordReadQueryRelease()
        cancel()
      },
    }),
  )
}
