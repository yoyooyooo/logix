import * as Logix from '@logixjs/core'
import { Effect } from 'effect'
import type { ManagedRuntime } from 'effect'
import { runRuntimeSync } from '../provider/runtimeBindings.js'

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
type HookListenerId = symbol
type ComponentOwner = object

type RuntimeStore = {
  readonly getTickSeq: () => number
  readonly getModuleTopicKey: (moduleId: string, instanceId: string) => ModuleInstanceKey
  readonly getReadQueryTopicKey: (moduleInstanceKey: ModuleInstanceKey, selectorId: string) => TopicKey
  readonly retainSelectorInterest: (moduleInstanceKey: ModuleInstanceKey, selectorId: string) => () => void
  readonly getModuleState: (moduleInstanceKey: ModuleInstanceKey) => unknown
  readonly getTopicVersion: (topicKey: TopicKey) => number
  readonly getTopicPriority: (topicKey: TopicKey) => Logix.StateCommitPriority
  readonly subscribeTopic: (topicKey: TopicKey, listener: () => void) => () => void
}

type Cancel = () => void

type HostScheduler = {
  readonly nowMs?: () => number
  readonly scheduleMicrotask: (cb: () => void) => void
  readonly scheduleAnimationFrame: (cb: () => void) => Cancel
  readonly scheduleTimeout: (ms: number, cb: () => void) => Cancel
}

const READ_QUERY_ACTIVATION_GRACE_MS = 16
const SELECTOR_DELTA_TOP_K_MAX = 8
const SELECTOR_DELTA_BLOOM_WORD_COUNT = 4
const SELECTOR_DELTA_BLOOM_BIT_COUNT = SELECTOR_DELTA_BLOOM_WORD_COUNT * 32

const storesByRuntime = new WeakMap<object, Map<TopicKey, ExternalStore<any>>>()
const moduleTopicKeyByModuleRuntime = new WeakMap<object, ModuleInstanceKey>()
const readQueryTopicKeysByModuleRuntime = new WeakMap<object, Map<string, TopicKey>>()
const modulePulseHubsByRuntime = new WeakMap<object, Map<ModuleInstanceKey, ModulePulseHub>>()
const componentTopicListenerBuckets = new WeakMap<ComponentOwner, WeakMap<object, ComponentTopicListenerBucket>>()
const readQueryActivationByRuntime = new WeakMap<object, Map<ModuleInstanceKey, Map<string, ReadQueryActivationState>>>()

export type SelectorDeltaTopK = {
  readonly bloomWords: readonly [number, number, number, number]
  readonly topK: ReadonlyArray<string>
  readonly hash: string
  readonly anySelectorChanged: boolean
}

export type RuntimePulseEnvelope = {
  readonly moduleInstanceKey: ModuleInstanceKey
  readonly tickSeq: number
  readonly priorityMax: Logix.StateCommitPriority
  readonly topicDeltaCount: number
  readonly topicDeltaHash: string
  readonly selectorDelta: SelectorDeltaTopK
}

const pulseEnvelopeReaderSymbol = Symbol('logix-react:last-runtime-pulse-envelope')

type PulseAwareExternalStore = ExternalStore<any> & {
  [pulseEnvelopeReaderSymbol]?: () => RuntimePulseEnvelope | undefined
}

type TopicPulseSink = {
  readonly flush: (envelope: RuntimePulseEnvelope) => void
}

type ModulePulseHub = {
  readonly retainStore: () => void
  readonly releaseStore: () => void
  readonly detachSink: (sink: TopicPulseSink) => void
  readonly requestPulse: (args: {
    readonly sink: TopicPulseSink
    readonly topicKey: TopicKey
    readonly tickSeq: number
    readonly selectorId?: string
    readonly selectorIds?: ReadonlyArray<string>
    readonly priority: Logix.StateCommitPriority
    readonly lowPriorityDelayMs: number
    readonly lowPriorityMaxDelayMs: number
  }) => void
}

type ReadQueryActivationState = {
  refCount: number
  lastKnownTopicVersion: number
  releaseReadQueryActivation: (() => void) | undefined
  releaseSelectorInterest: (() => void) | undefined
  releaseTimerCancel: Cancel | undefined
  releaseTimerToken: number
}

type ComponentTopicListenerEntry = {
  readonly listener: () => void
  readonly shouldNotify?: () => boolean
}

type ComponentTopicListenerBucket = {
  readonly listenersByHook: Map<HookListenerId, ComponentTopicListenerEntry>
  leadHookId: HookListenerId | undefined
  unsubscribeFromStore: (() => void) | undefined
}

const hashTextFNV1a32 = (input: string): number => {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

const toHexHash = (hash: number): string => hash.toString(16).padStart(8, '0')

const hashStringList = (items: ReadonlyArray<string>): string => {
  if (items.length === 0) return '00000000'
  let hash = 0x811c9dc5
  for (const item of items) {
    hash ^= hashTextFNV1a32(item)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return toHexHash(hash >>> 0)
}

const appendHashAccumulator = (hash: number, text: string): number => {
  const next = (hash ^ hashTextFNV1a32(text)) >>> 0
  return Math.imul(next, 0x01000193) >>> 0
}

const mixHash = (input: number): number => {
  let x = input >>> 0
  x ^= x >>> 16
  x = Math.imul(x, 0x7feb352d) >>> 0
  x ^= x >>> 15
  x = Math.imul(x, 0x846ca68b) >>> 0
  x ^= x >>> 16
  return x >>> 0
}

const setBloomBit = (words: number[] | [number, number, number, number], bitIndex: number): void => {
  const wordIndex = Math.floor(bitIndex / 32)
  const bitOffset = bitIndex % 32
  words[wordIndex] = (words[wordIndex] | (1 << bitOffset)) >>> 0
}

const hasBloomBit = (words: readonly [number, number, number, number], bitIndex: number): boolean => {
  const wordIndex = Math.floor(bitIndex / 32)
  const bitOffset = bitIndex % 32
  return ((words[wordIndex] >>> bitOffset) & 1) === 1
}

const computeSelectorDeltaTopK = (selectorIds: ReadonlyArray<string>): SelectorDeltaTopK => {
  if (selectorIds.length === 0) {
    return {
      bloomWords: [0, 0, 0, 0],
      topK: [],
      hash: '00000000',
      anySelectorChanged: false,
    }
  }

  const uniqueSortedSelectorIds = Array.from(new Set(selectorIds)).sort()
  const bloomWordsMutable = [0, 0, 0, 0]

  for (const selectorId of uniqueSortedSelectorIds) {
    const h1 = mixHash(hashTextFNV1a32(selectorId))
    const h2 = mixHash(h1 ^ 0x9e3779b9)
    const bitIndex1 = h1 % SELECTOR_DELTA_BLOOM_BIT_COUNT
    const bitIndex2 = h2 % SELECTOR_DELTA_BLOOM_BIT_COUNT
    setBloomBit(bloomWordsMutable, bitIndex1)
    setBloomBit(bloomWordsMutable, bitIndex2)
  }

  return {
    bloomWords: bloomWordsMutable as [number, number, number, number],
    topK: uniqueSortedSelectorIds.slice(0, SELECTOR_DELTA_TOP_K_MAX),
    hash: hashStringList(uniqueSortedSelectorIds),
    anySelectorChanged: true,
  }
}

export const runtimeSelectorDeltaMaybeChanged = (selectorDelta: SelectorDeltaTopK, selectorId: string): boolean => {
  if (!selectorDelta.anySelectorChanged) return false
  const h1 = mixHash(hashTextFNV1a32(selectorId))
  const h2 = mixHash(h1 ^ 0x9e3779b9)
  const bitIndex1 = h1 % SELECTOR_DELTA_BLOOM_BIT_COUNT
  const bitIndex2 = h2 % SELECTOR_DELTA_BLOOM_BIT_COUNT
  return hasBloomBit(selectorDelta.bloomWords, bitIndex1) && hasBloomBit(selectorDelta.bloomWords, bitIndex2)
}

export const getRuntimeExternalStoreLastPulseEnvelope = (store: ExternalStore<any>): RuntimePulseEnvelope | undefined => {
  const reader = (store as PulseAwareExternalStore)[pulseEnvelopeReaderSymbol]
  if (typeof reader !== 'function') return undefined
  return reader()
}

const getStoreMapForRuntime = (runtime: object): Map<TopicKey, ExternalStore<any>> => {
  const cached = storesByRuntime.get(runtime)
  if (cached) return cached
  const next = new Map<TopicKey, ExternalStore<any>>()
  storesByRuntime.set(runtime, next)
  return next
}

const resolveModuleTopicKey = (
  runtimeStore: RuntimeStore,
  moduleRuntime: Logix.ModuleRuntime<any, any>,
): ModuleInstanceKey => {
  const cached = moduleTopicKeyByModuleRuntime.get(moduleRuntime as any)
  if (cached) return cached
  const resolved = runtimeStore.getModuleTopicKey(moduleRuntime.moduleId, moduleRuntime.instanceId)
  moduleTopicKeyByModuleRuntime.set(moduleRuntime as any, resolved)
  return resolved
}

const resolveReadQueryTopicKey = (
  runtimeStore: RuntimeStore,
  moduleRuntime: Logix.ModuleRuntime<any, any>,
  moduleInstanceKey: ModuleInstanceKey,
  selectorId: string,
): TopicKey => {
  const cachedBySelector = readQueryTopicKeysByModuleRuntime.get(moduleRuntime as any)
  const cached = cachedBySelector?.get(selectorId)
  if (cached) return cached

  const resolved = runtimeStore.getReadQueryTopicKey(moduleInstanceKey, selectorId)

  if (cachedBySelector) {
    cachedBySelector.set(selectorId, resolved)
  } else {
    readQueryTopicKeysByModuleRuntime.set(moduleRuntime as any, new Map([[selectorId, resolved]]))
  }

  return resolved
}

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

const getComponentTopicBuckets = (componentOwner: ComponentOwner): WeakMap<object, ComponentTopicListenerBucket> => {
  const cached = componentTopicListenerBuckets.get(componentOwner)
  if (cached) return cached
  const created = new WeakMap<object, ComponentTopicListenerBucket>()
  componentTopicListenerBuckets.set(componentOwner, created)
  return created
}

const getModulePulseHubMapForRuntime = (runtime: object): Map<ModuleInstanceKey, ModulePulseHub> => {
  const cached = modulePulseHubsByRuntime.get(runtime)
  if (cached) return cached
  const created = new Map<ModuleInstanceKey, ModulePulseHub>()
  modulePulseHubsByRuntime.set(runtime, created)
  return created
}

const getOrCreateModulePulseHub = (
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
  moduleInstanceKey: ModuleInstanceKey,
  hostScheduler: HostScheduler,
): ModulePulseHub => {
  const runtimeObject = runtime as object
  const hubs = getModulePulseHubMapForRuntime(runtimeObject)
  const cached = hubs.get(moduleInstanceKey)
  if (cached) return cached

  let retainedStoreCount = 0
  let notifyScheduled = false
  let notifyScheduledLow = false
  let lowDelayDeadlineMs: number | undefined
  let lowMaxDeadlineMs: number | undefined
  let lowCancelDelay: Cancel | undefined
  let lowCancelMaxDelay: Cancel | undefined
  let lowCancelRaf: Cancel | undefined
  const pendingSinks = new Set<TopicPulseSink>()
  const pendingTopicKeys = new Set<TopicKey>()
  const pendingSelectorIds = new Set<string>()
  const pendingSelectorTopK: string[] = []
  const pendingSelectorBloomWords: [number, number, number, number] = [0, 0, 0, 0]
  let pendingSelectorHash = 0x811c9dc5
  let pendingTopicHash = 0x811c9dc5
  let pendingPriorityMax: Logix.StateCommitPriority = 'low'
  let pendingTickSeq = 0

  const nowMs = (): number => {
    const resolved = hostScheduler.nowMs?.()
    return typeof resolved === 'number' && Number.isFinite(resolved) ? resolved : Date.now()
  }

  const clearLowScheduling = (): void => {
    notifyScheduledLow = false
    lowDelayDeadlineMs = undefined
    lowMaxDeadlineMs = undefined
    lowCancelDelay?.()
    lowCancelDelay = undefined
    lowCancelMaxDelay?.()
    lowCancelMaxDelay = undefined
    lowCancelRaf?.()
    lowCancelRaf = undefined
  }

  const maybeDisposeHub = (): void => {
    if (retainedStoreCount > 0) return
    if (pendingSinks.size > 0) return
    if (notifyScheduled || notifyScheduledLow) return
    hubs.delete(moduleInstanceKey)
  }

  const buildEnvelope = (): RuntimePulseEnvelope => {
    const hasSelectors = pendingSelectorIds.size > 0

    return {
      moduleInstanceKey,
      tickSeq: pendingTickSeq,
      priorityMax: pendingPriorityMax,
      topicDeltaCount: pendingTopicKeys.size,
      topicDeltaHash: pendingTopicKeys.size > 0 ? toHexHash(pendingTopicHash) : '00000000',
      selectorDelta: {
        bloomWords: [...pendingSelectorBloomWords] as [number, number, number, number],
        topK: pendingSelectorTopK.slice(),
        hash: hasSelectors ? toHexHash(pendingSelectorHash) : '00000000',
        anySelectorChanged: hasSelectors,
      },
    }
  }

  const clearPendingPulseMeta = (): void => {
    pendingTopicKeys.clear()
    pendingSelectorIds.clear()
    pendingSelectorTopK.length = 0
    pendingSelectorBloomWords[0] = 0
    pendingSelectorBloomWords[1] = 0
    pendingSelectorBloomWords[2] = 0
    pendingSelectorBloomWords[3] = 0
    pendingSelectorHash = 0x811c9dc5
    pendingTopicHash = 0x811c9dc5
    pendingPriorityMax = 'low'
    pendingTickSeq = 0
  }

  const flushPulse = (): void => {
    notifyScheduled = false
    clearLowScheduling()
    if (pendingSinks.size === 0) {
      clearPendingPulseMeta()
      maybeDisposeHub()
      return
    }

    const envelope = buildEnvelope()
    const sinks = Array.from(pendingSinks)
    pendingSinks.clear()
    clearPendingPulseMeta()
    for (const sink of sinks) {
      sink.flush(envelope)
    }
    maybeDisposeHub()
  }

  const scheduleLowPulse = (): void => {
    if (!notifyScheduledLow) {
      notifyScheduledLow = true
    }

    const scheduleRaf = () => {
      if (!notifyScheduledLow) return
      lowCancelRaf?.()
      lowCancelRaf = hostScheduler.scheduleAnimationFrame(() => {
        if (!notifyScheduledLow) return
        flushPulse()
      })
    }

    lowCancelDelay?.()
    lowCancelDelay = undefined
    lowCancelMaxDelay?.()
    lowCancelMaxDelay = undefined

    const now = nowMs()
    const delayDeadline = lowDelayDeadlineMs ?? now
    const maxDeadline = lowMaxDeadlineMs ?? now
    const delayMs = Math.max(0, delayDeadline - now)
    const maxDelayMs = Math.max(0, maxDeadline - now)

    if (delayMs <= 0) {
      scheduleRaf()
    } else {
      lowCancelDelay = hostScheduler.scheduleTimeout(delayMs, scheduleRaf)
    }

    lowCancelMaxDelay = hostScheduler.scheduleTimeout(maxDelayMs, () => {
      if (!notifyScheduledLow) return
      flushPulse()
    })
  }

  const schedulePulse = (args: {
    readonly priority: Logix.StateCommitPriority
    readonly lowPriorityDelayMs: number
    readonly lowPriorityMaxDelayMs: number
  }): void => {
    if (args.priority === 'low') {
      if (notifyScheduled) return
      const now = nowMs()
      const requestDelayDeadline = now + Math.max(0, args.lowPriorityDelayMs)
      const requestMaxDeadline = now + Math.max(0, args.lowPriorityMaxDelayMs)
      lowDelayDeadlineMs =
        lowDelayDeadlineMs === undefined ? requestDelayDeadline : Math.min(lowDelayDeadlineMs, requestDelayDeadline)
      lowMaxDeadlineMs = lowMaxDeadlineMs === undefined ? requestMaxDeadline : Math.min(lowMaxDeadlineMs, requestMaxDeadline)
      scheduleLowPulse()
      return
    }

    if (notifyScheduled) return
    clearLowScheduling()
    notifyScheduled = true
    hostScheduler.scheduleMicrotask(flushPulse)
  }

  const created: ModulePulseHub = {
    retainStore: () => {
      retainedStoreCount += 1
    },
    releaseStore: () => {
      if (retainedStoreCount > 0) {
        retainedStoreCount -= 1
      }
      maybeDisposeHub()
    },
    detachSink: (sink) => {
      if (!pendingSinks.delete(sink)) return
      maybeDisposeHub()
    },
    requestPulse: (args) => {
      pendingSinks.add(args.sink)
      if (!pendingTopicKeys.has(args.topicKey)) {
        pendingTopicKeys.add(args.topicKey)
        pendingTopicHash = appendHashAccumulator(pendingTopicHash, args.topicKey)
      }
      pendingTickSeq = Math.max(pendingTickSeq, args.tickSeq)
      if (args.selectorId) {
        if (!pendingSelectorIds.has(args.selectorId)) {
          pendingSelectorIds.add(args.selectorId)
          pendingSelectorHash = appendHashAccumulator(pendingSelectorHash, args.selectorId)
          const h1 = mixHash(hashTextFNV1a32(args.selectorId))
          const h2 = mixHash(h1 ^ 0x9e3779b9)
          const bitIndex1 = h1 % SELECTOR_DELTA_BLOOM_BIT_COUNT
          const bitIndex2 = h2 % SELECTOR_DELTA_BLOOM_BIT_COUNT
          setBloomBit(pendingSelectorBloomWords, bitIndex1)
          setBloomBit(pendingSelectorBloomWords, bitIndex2)
          if (pendingSelectorTopK.length < SELECTOR_DELTA_TOP_K_MAX) {
            pendingSelectorTopK.push(args.selectorId)
          }
        }
      }
      if (args.priority === 'normal') {
        pendingPriorityMax = 'normal'
      }
      schedulePulse({
        priority: args.priority,
        lowPriorityDelayMs: args.lowPriorityDelayMs,
        lowPriorityMaxDelayMs: args.lowPriorityMaxDelayMs,
      })
    },
  }

  hubs.set(moduleInstanceKey, created)
  return created
}

const pickLeadHookId = (listenersByHook: Map<HookListenerId, ComponentTopicListenerEntry>): HookListenerId | undefined => {
  const iterator = listenersByHook.keys().next()
  return iterator.done ? undefined : iterator.value
}

const canEntryNotify = (entry: ComponentTopicListenerEntry | undefined): boolean => {
  if (!entry) return false
  if (!entry.shouldNotify) return true
  try {
    return entry.shouldNotify()
  } catch {
    return true
  }
}

const notifyLeadListener = (bucket: ComponentTopicListenerBucket): void => {
  if (bucket.listenersByHook.size === 0) return
  const leadHookId = bucket.leadHookId
  if (leadHookId && canEntryNotify(bucket.listenersByHook.get(leadHookId))) {
    bucket.listenersByHook.get(leadHookId)?.listener()
    return
  }

  for (const [hookId, entry] of bucket.listenersByHook.entries()) {
    if (!canEntryNotify(entry)) continue
    bucket.leadHookId = hookId
    entry.listener()
    return
  }
}

export const subscribeRuntimeExternalStoreWithComponentMultiplex = (
  store: ExternalStore<any>,
  componentOwner: ComponentOwner,
  hookListenerId: HookListenerId,
  listener: () => void,
  options?: {
    readonly shouldNotify?: () => boolean
  },
): (() => void) => {
  const storeObject = store as object
  const buckets = getComponentTopicBuckets(componentOwner)
  const existingBucket = buckets.get(storeObject)
  const bucket: ComponentTopicListenerBucket =
    existingBucket ??
    ({
      listenersByHook: new Map<HookListenerId, ComponentTopicListenerEntry>(),
      leadHookId: undefined,
      unsubscribeFromStore: undefined,
    } satisfies ComponentTopicListenerBucket)

  if (!existingBucket) {
    buckets.set(storeObject, bucket)
  }

  bucket.listenersByHook.set(hookListenerId, { listener, shouldNotify: options?.shouldNotify })
  if (!bucket.leadHookId || !bucket.listenersByHook.has(bucket.leadHookId)) {
    bucket.leadHookId = hookListenerId
  }

  if (!bucket.unsubscribeFromStore) {
    bucket.unsubscribeFromStore = store.subscribe(() => {
      notifyLeadListener(bucket)
    })
  }

  return () => {
    const currentBucket = buckets.get(storeObject)
    if (!currentBucket) return

    currentBucket.listenersByHook.delete(hookListenerId)
    if (currentBucket.leadHookId === hookListenerId) {
      currentBucket.leadHookId = pickLeadHookId(currentBucket.listenersByHook)
    }

    if (currentBucket.listenersByHook.size > 0) return

    const unsubscribeFromStore = currentBucket.unsubscribeFromStore
    currentBucket.unsubscribeFromStore = undefined
    currentBucket.leadHookId = undefined
    buckets.delete(storeObject)

    try {
      unsubscribeFromStore?.()
    } catch {
      // ignore best-effort unsubscribe failures
    }
  }
}

const makeTopicExternalStore = <S>(args: {
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
  readonly runtimeStore: RuntimeStore
  readonly topicKey: TopicKey
  readonly moduleInstanceKey: ModuleInstanceKey
  readonly selectorId?: string
  readonly readSnapshot: () => S
  readonly readLiveSnapshot?: () => S
  readonly isSnapshotEqual?: (previous: S, next: S) => boolean
  readonly options?: ExternalStoreOptions
  readonly teardownDelayMs?: number
  readonly teardownWhenIdleOnCreate?: boolean
  readonly onFirstListener?: () => void
  readonly onLastListener?: () => void
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
  let teardownCancel: Cancel | undefined
  let lastPulseEnvelope: RuntimePulseEnvelope | undefined
  let pendingLiveResync = false

  const lowPriorityDelayMs = args.options?.lowPriorityDelayMs ?? 16
  const lowPriorityMaxDelayMs = args.options?.lowPriorityMaxDelayMs ?? 50
  const isSnapshotEqual = args.isSnapshotEqual ?? Object.is
  const modulePulseHub = getOrCreateModulePulseHub(runtime, args.moduleInstanceKey, hostScheduler)
  modulePulseHub.retainStore()

  const flushNotify = (envelope: RuntimePulseEnvelope): void => {
    lastPulseEnvelope = envelope
    for (const listener of listeners) {
      try {
        listener()
      } catch {
        // best-effort: never let a subscriber break the notifier
      }
    }
  }

  const scheduleNotify = (priority: Logix.StateCommitPriority): void => {
    modulePulseHub.requestPulse({
      sink: pulseSink,
      topicKey,
      tickSeq: runtimeStore.getTickSeq(),
      selectorId: args.selectorId,
      priority,
      lowPriorityDelayMs,
      lowPriorityMaxDelayMs,
    })
  }

  const pulseSink: TopicPulseSink = { flush: flushNotify }

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
        return
      }

      if (!args.readLiveSnapshot) {
        return
      }

      const liveSnapshot = args.readLiveSnapshot()
      if (!isSnapshotEqual(currentSnapshot as S, liveSnapshot)) {
        pendingLiveResync = true
        scheduleNotify(runtimeStore.getTopicPriority(topicKey))
      }
    } catch {
      // ignore best-effort refresh failures
    }
  }

  const getSnapshot = (): S => {
    const version = runtimeStore.getTopicVersion(topicKey)
    if (hasSnapshot && currentVersion === version && !pendingLiveResync) {
      return currentSnapshot as S
    }

    const next = pendingLiveResync && args.readLiveSnapshot ? args.readLiveSnapshot() : args.readSnapshot()
    currentVersion = version
    hasSnapshot = true
    currentSnapshot = next
    pendingLiveResync = false
    return next
  }

  const cancelScheduledTeardown = (): void => {
    if (!teardownScheduled) return
    teardownScheduled = false
    teardownToken += 1
    teardownCancel?.()
    teardownCancel = undefined
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
    teardownCancel = undefined
    modulePulseHub.detachSink(pulseSink)
    modulePulseHub.releaseStore()

    try {
      unsub?.()
    } catch {
      // ignore best-effort unsubscribe failures
    }

    removeStore(runtime, topicKey)
  }

  const scheduleTeardown = (): void => {
    if (teardownScheduled) return
    teardownScheduled = true
    const token = ++teardownToken
    const runTeardown = () => {
      if (!teardownScheduled || token !== teardownToken) return
      teardownScheduled = false
      teardownCancel = undefined
      finalizeTeardown()
    }
    const teardownDelayMs = args.teardownDelayMs ?? 0
    if (teardownDelayMs <= 0) {
      hostScheduler.scheduleMicrotask(runTeardown)
      return
    }
    teardownCancel = hostScheduler.scheduleTimeout(teardownDelayMs, runTeardown)
  }

  const subscribe = (listener: () => void): (() => void) => {
    cancelScheduledTeardown()
    const isFirst = listeners.size === 0
    listeners.add(listener)
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
      listeners.delete(listener)
      if (listeners.size > 0) return
      scheduleTeardown()
    }
  }

  if (args.teardownWhenIdleOnCreate) {
    scheduleTeardown()
  }

  const store: PulseAwareExternalStore = { getSnapshot, getServerSnapshot: getSnapshot, subscribe }
  store[pulseEnvelopeReaderSymbol] = () => lastPulseEnvelope
  return store as ExternalStore<S>
}

export const getRuntimeModuleExternalStore = <S>(
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
  moduleRuntime: Logix.ModuleRuntime<S, any>,
  options?: ExternalStoreOptions,
): ExternalStore<S> => {
  const runtimeStore = getRuntimeStore(runtime)
  const moduleInstanceKey = resolveModuleTopicKey(runtimeStore, moduleRuntime)

  return getOrCreateStore(runtime, moduleInstanceKey, () =>
    makeTopicExternalStore({
      runtime,
      runtimeStore,
      topicKey: moduleInstanceKey,
      moduleInstanceKey,
      readSnapshot: () => {
        const state = runtimeStore.getModuleState(moduleInstanceKey) as S | undefined
        if (state !== undefined) return state
        return runtime.runSync(moduleRuntime.getState as unknown as Effect.Effect<S, never, any>)
      },
      readLiveSnapshot: () => runRuntimeSync(runtime, moduleRuntime.getState as unknown as Effect.Effect<S, never, any>),
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
  const runtimeStore = getRuntimeStore(runtime)
  const moduleInstanceKey = resolveModuleTopicKey(runtimeStore, moduleRuntime)
  const topicKey = resolveReadQueryTopicKey(runtimeStore, moduleRuntime, moduleInstanceKey, selectorReadQuery.selectorId)
  let releaseReadQueryActivation: (() => void) | undefined
  let releaseSelectorInterest: (() => void) | undefined

  return getOrCreateStore(runtime, topicKey, () =>
    makeTopicExternalStore({
      runtime,
      runtimeStore,
      topicKey,
      moduleInstanceKey,
      selectorId: selectorReadQuery.selectorId,
      readSnapshot: () => {
        const state = runtimeStore.getModuleState(moduleInstanceKey) as S | undefined
        const current = state ?? runtime.runSync(moduleRuntime.getState as unknown as Effect.Effect<S, never, any>)
        return selectorReadQuery.select(current)
      },
      readLiveSnapshot: () =>
        selectorReadQuery.select(runRuntimeSync(runtime, moduleRuntime.getState as unknown as Effect.Effect<S, never, any>)),
      isSnapshotEqual: Object.is,
      options,
      teardownDelayMs: READ_QUERY_ACTIVATION_GRACE_MS,
      teardownWhenIdleOnCreate: true,
      onFirstListener: () => {
        if (releaseReadQueryActivation && releaseSelectorInterest) return
        const retain = Logix.InternalContracts.retainReadQueryActivation(moduleRuntime as any, selectorReadQuery as any)
        if (!retain) {
          throw new Error('[Logix][RuntimeExternalStore] moduleRuntime does not expose readQuery activation retention')
        }
        releaseSelectorInterest = runtimeStore.retainSelectorInterest(moduleInstanceKey, selectorReadQuery.selectorId)
        releaseReadQueryActivation = runtime.runSync(retain as any) as () => void
      },
      onLastListener: () => {
        const releaseActivation = releaseReadQueryActivation
        const releaseInterest = releaseSelectorInterest
        if (!releaseActivation && !releaseInterest) return
        releaseReadQueryActivation = undefined
        releaseSelectorInterest = undefined
        releaseInterest?.()
        releaseActivation?.()
      },
    }),
  )
}
