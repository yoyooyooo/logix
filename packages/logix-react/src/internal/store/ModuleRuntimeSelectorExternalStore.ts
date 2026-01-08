import type * as Logix from '@logixjs/core'
import { Effect, Fiber, Stream } from 'effect'
import type { ManagedRuntime } from 'effect'
import { shallow } from '../hooks/shallow.js'
import type { ExternalStore, ExternalStoreOptions } from './ModuleRuntimeExternalStore.js'

type SelectorId = string

type StoreMap = Map<SelectorId, ExternalStore<any>>

const storesByRuntime = new WeakMap<object, WeakMap<object, StoreMap>>()

const getStoreMapForRuntime = (runtime: object) => {
  const cached = storesByRuntime.get(runtime)
  if (cached) return cached
  const next = new WeakMap<object, StoreMap>()
  storesByRuntime.set(runtime, next)
  return next
}

const getOrCreateSelectorMapForModule = (byModule: WeakMap<object, StoreMap>, moduleRuntime: object): StoreMap => {
  const cached = byModule.get(moduleRuntime)
  if (cached) return cached
  const next = new Map<SelectorId, ExternalStore<any>>()
  byModule.set(moduleRuntime, next)
  return next
}

const equalsValue = <V>(readQuery: Logix.ReadQuery.ReadQueryCompiled<any, V>, a: V, b: V): boolean => {
  if (readQuery.equalsKind === 'custom' && typeof readQuery.equals === 'function') {
    return readQuery.equals(a, b)
  }
  if (readQuery.equalsKind === 'shallowStruct') {
    return shallow(a as any, b as any)
  }
  return Object.is(a, b)
}

export const getModuleRuntimeSelectorExternalStore = <S, V>(
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
  moduleRuntime: Logix.ModuleRuntime<S, any>,
  selectorReadQuery: Logix.ReadQuery.ReadQueryCompiled<S, V>,
  options?: ExternalStoreOptions,
): ExternalStore<V> => {
  const byModule = getStoreMapForRuntime(runtime as any)
  const bySelector = getOrCreateSelectorMapForModule(byModule, moduleRuntime as any)
  const cached = bySelector.get(selectorReadQuery.selectorId)
  if (cached) {
    return cached as ExternalStore<V>
  }

  let currentValue: V | undefined
  const listeners = new Set<() => void>()

  const lowPriorityDelayMs = options?.lowPriorityDelayMs ?? 16
  const lowPriorityMaxDelayMs = options?.lowPriorityMaxDelayMs ?? 50

  let notifyScheduled = false
  let notifyScheduledLow = false
  let lowTimeoutId: ReturnType<typeof setTimeout> | undefined
  let lowMaxTimeoutId: ReturnType<typeof setTimeout> | undefined
  let lowRafId: number | undefined

  const cancelLow = () => {
    if (!notifyScheduledLow) return
    notifyScheduledLow = false
    if (lowTimeoutId != null) {
      clearTimeout(lowTimeoutId)
      lowTimeoutId = undefined
    }
    if (lowMaxTimeoutId != null) {
      clearTimeout(lowMaxTimeoutId)
      lowMaxTimeoutId = undefined
    }
    const cancel = (globalThis as any).cancelAnimationFrame as ((id: number) => void) | undefined
    if (cancel && typeof lowRafId === 'number') {
      cancel(lowRafId)
      lowRafId = undefined
    }
  }

  const flushNotify = () => {
    notifyScheduled = false
    cancelLow()
    for (const listener of listeners) {
      listener()
    }
  }

  const scheduleNotify = (priority: Logix.StateCommitPriority) => {
    if (priority === 'low') {
      if (notifyScheduled) return
      if (notifyScheduledLow) return
      notifyScheduledLow = true

      const flush = () => {
        if (!notifyScheduledLow) return
        flushNotify()
      }

      const raf = (globalThis as any).requestAnimationFrame as ((cb: () => void) => number) | undefined
      if (raf) {
        lowRafId = raf(flush)
      } else {
        lowTimeoutId = setTimeout(flush, lowPriorityDelayMs)
      }
      lowMaxTimeoutId = setTimeout(flush, lowPriorityMaxDelayMs)
      return
    }

    cancelLow()
    if (notifyScheduled) return
    notifyScheduled = true
    queueMicrotask(flushNotify)
  }

  let fiber: Fiber.Fiber<void, any> | undefined

  const ensureSubscription = () => {
    if (fiber) return
    fiber = runtime.runFork(
      Stream.runForEach(moduleRuntime.changesReadQueryWithMeta(selectorReadQuery), ({ value, meta }) =>
        Effect.sync(() => {
          currentValue = value
          scheduleNotify(meta.priority)
        }),
      ),
    )
  }

  const refreshSnapshotIfStale = () => {
    if (currentValue === undefined) {
      return
    }
    try {
      const state = runtime.runSync(moduleRuntime.getState as Effect.Effect<S, never, any>)
      const next = selectorReadQuery.select(state)
      if (currentValue === undefined || !equalsValue(selectorReadQuery, currentValue, next)) {
        currentValue = next
        scheduleNotify('normal')
      }
    } catch {
      // ignore best-effort refresh failures
    }
  }

  const getSnapshot = () => {
    if (currentValue !== undefined) return currentValue
    const state = runtime.runSync(moduleRuntime.getState as Effect.Effect<S, never, any>)
    currentValue = selectorReadQuery.select(state)
    return currentValue
  }

  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    ensureSubscription()
    refreshSnapshotIfStale()
    return () => {
      listeners.delete(listener)
      if (listeners.size > 0) return
      const running = fiber
      if (!running) return
      fiber = undefined
      cancelLow()
      runtime.runFork(Fiber.interrupt(running))
    }
  }

  const store: ExternalStore<V> = { getSnapshot, subscribe }
  bySelector.set(selectorReadQuery.selectorId, store as ExternalStore<any>)
  return store
}
