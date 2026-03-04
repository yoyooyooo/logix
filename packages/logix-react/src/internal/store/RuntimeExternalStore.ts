import * as Logix from '@logixjs/core'
import { Effect, Fiber, Stream } from 'effect'
import type { ManagedRuntime } from 'effect'

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
  readonly getModuleState: (moduleInstanceKey: ModuleInstanceKey) => unknown
  readonly getTopicVersion: (topicKey: TopicKey) => number
  readonly getTopicPriority: (topicKey: TopicKey) => Logix.StateCommitPriority
  readonly subscribeTopic: (topicKey: TopicKey, listener: () => void) => () => void
}

type Cancel = () => void

type HostScheduler = {
  readonly scheduleMicrotask: (cb: () => void) => void
  readonly scheduleAnimationFrame: (cb: () => void) => Cancel
  readonly scheduleTimeout: (ms: number, cb: () => void) => Cancel
}

const storesByRuntime = new WeakMap<object, Map<TopicKey, ExternalStore<any>>>()
const microtaskNotifyQueueByRuntime = new WeakMap<
  object,
  {
    scheduled: boolean
    readonly pending: Set<() => void>
    readonly scheduler: HostScheduler
  }
>()

const EMPTY_LISTENER_SNAPSHOT: ReadonlyArray<() => void> = []

const getStoreMapForRuntime = (runtime: object): Map<TopicKey, ExternalStore<any>> => {
  const cached = storesByRuntime.get(runtime)
  if (cached) return cached
  const next = new Map<TopicKey, ExternalStore<any>>()
  storesByRuntime.set(runtime, next)
  return next
}

const getOrCreateMicrotaskNotifyQueue = (runtime: ManagedRuntime.ManagedRuntime<any, any>): {
  scheduled: boolean
  readonly pending: Set<() => void>
  readonly scheduler: HostScheduler
} => {
  const cached = microtaskNotifyQueueByRuntime.get(runtime as any)
  if (cached) return cached
  const created = {
    scheduled: false,
    pending: new Set<() => void>(),
    scheduler: getHostScheduler(runtime),
  }
  microtaskNotifyQueueByRuntime.set(runtime as any, created)
  return created
}

const enqueueMicrotaskNotify = (runtime: ManagedRuntime.ManagedRuntime<any, any>, flush: () => void): void => {
  const queue = getOrCreateMicrotaskNotifyQueue(runtime)
  queue.pending.add(flush)
  if (queue.scheduled) return
  queue.scheduled = true
  queue.scheduler.scheduleMicrotask(() => {
    queue.scheduled = false
    for (const fn of queue.pending) {
      try {
        fn()
      } catch {
        // best-effort
      }
    }
    queue.pending.clear()
  })
}

const makeModuleInstanceKey = (moduleId: string, instanceId: string): ModuleInstanceKey => `${moduleId}::${instanceId}`

const makeReadQueryTopicKey = (moduleInstanceKey: ModuleInstanceKey, selectorId: string): TopicKey =>
  `${moduleInstanceKey}::rq:${selectorId}`

const getRuntimeStore = (runtime: ManagedRuntime.ManagedRuntime<any, any>): RuntimeStore =>
  Logix.InternalContracts.getRuntimeStore(runtime as any) as RuntimeStore

const getHostScheduler = (runtime: ManagedRuntime.ManagedRuntime<any, any>): HostScheduler =>
  Logix.InternalContracts.getHostScheduler(runtime as any) as HostScheduler

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
}): ExternalStore<S> => {
  const { runtime, runtimeStore, topicKey } = args
  const hostScheduler = getHostScheduler(runtime)

  let currentVersion: number | undefined
  let hasSnapshot = false
  let currentSnapshot: S | undefined

  const listeners = new Set<() => void>()
  let listenersSnapshot: ReadonlyArray<() => void> = EMPTY_LISTENER_SNAPSHOT
  let unsubscribeFromRuntimeStore: (() => void) | undefined

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
    const snapshot = listenersSnapshot
    // Perf: avoid per-listener try/catch overhead in hot paths (runtimeStore.noTearing.tickNotify).
    // Listener throws are still isolated at the batch level to avoid crashing the tick flush.
    try {
      for (let i = 0; i < snapshot.length; i++) {
        snapshot[i]!()
      }
    } catch {
      // best-effort: never let a subscriber break the notifier
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
    // Centralize normal-priority microtasks per runtime to reduce overhead under many module topics.
    enqueueMicrotaskNotify(runtime, flushNotify)
  }

  const onRuntimeStoreChange = (): void => {
    if (notifyScheduled) {
      return
    }
    try {
      const priority = runtimeStore.getTopicPriority(topicKey)
      scheduleNotify(priority)
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

  const subscribe = (listener: () => void): (() => void) => {
    const isFirst = listeners.size === 0
    const alreadyHas = listeners.has(listener)
    if (!alreadyHas) {
      listeners.add(listener)
      listenersSnapshot = Array.from(listeners)
    }
    ensureSubscription()
    refreshSnapshotIfStale()
    if (isFirst) {
      try {
        args.onFirstListener?.()
      } catch {
        // ignore best-effort failures
      }
    }
    return () => {
      const deleted = listeners.delete(listener)
      if (deleted) {
        listenersSnapshot = listeners.size > 0 ? Array.from(listeners) : EMPTY_LISTENER_SNAPSHOT
      }
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
    }
  }

  return { getSnapshot, getServerSnapshot: getSnapshot, subscribe }
}

export const getRuntimeModuleExternalStore = <S>(
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
  moduleRuntime: Logix.ModuleRuntime<S, any>,
  options?: ExternalStoreOptions,
): ExternalStore<S> => {
  const moduleInstanceKey = makeModuleInstanceKey(moduleRuntime.moduleId, moduleRuntime.instanceId)
  const runtimeStore = getRuntimeStore(runtime)

  return getOrCreateStore(runtime, moduleInstanceKey, () =>
    makeTopicExternalStore({
      runtime,
      runtimeStore,
      topicKey: moduleInstanceKey,
      readSnapshot: () => {
        const state = runtimeStore.getModuleState(moduleInstanceKey) as S | undefined
        if (state !== undefined) return state
        return runtime.runSync(moduleRuntime.getState as unknown as Effect.Effect<S, never, any>)
      },
      options,
    }),
  )
}

export const getRuntimeReadQueryExternalStore = <S, V>(
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
  moduleRuntime: Logix.ModuleRuntime<S, any>,
  selectorReadQuery: Logix.ReadQuery.ReadQueryCompiled<S, V>,
  options?: ExternalStoreOptions,
): ExternalStore<V> => {
  const moduleInstanceKey = makeModuleInstanceKey(moduleRuntime.moduleId, moduleRuntime.instanceId)
  const topicKey = makeReadQueryTopicKey(moduleInstanceKey, selectorReadQuery.selectorId)
  const runtimeStore = getRuntimeStore(runtime)
  let readQueryDrainFiber: Fiber.Fiber<void, any> | undefined

  return getOrCreateStore(runtime, topicKey, () =>
    makeTopicExternalStore({
      runtime,
      runtimeStore,
      topicKey,
      readSnapshot: () => {
        const state = runtimeStore.getModuleState(moduleInstanceKey) as S | undefined
        const current = state ?? runtime.runSync(moduleRuntime.getState as unknown as Effect.Effect<S, never, any>)
        return selectorReadQuery.select(current)
      },
      options,
      onFirstListener: () => {
        if (readQueryDrainFiber) return
        const effect = Stream.runDrain((moduleRuntime as any).changesReadQueryWithMeta(selectorReadQuery) as any)
        readQueryDrainFiber = runtime.runFork(effect)
      },
      onLastListener: () => {
        const fiber = readQueryDrainFiber
        if (!fiber) return
        readQueryDrainFiber = undefined
        runtime.runFork(Fiber.interrupt(fiber))
      },
    }),
  )
}
