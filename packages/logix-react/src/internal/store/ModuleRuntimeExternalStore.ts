import type * as Logix from '@logix/core'
import { Effect, Fiber, Stream } from 'effect'
import type { ManagedRuntime } from 'effect'

export interface ExternalStore<S> {
  readonly getSnapshot: () => S
  readonly subscribe: (listener: () => void) => () => void
}

export interface ExternalStoreOptions {
  readonly lowPriorityDelayMs?: number
  readonly lowPriorityMaxDelayMs?: number
}

const storesByRuntime = new WeakMap<object, WeakMap<object, ExternalStore<any>>>()

const getStoreMapForRuntime = (runtime: object) => {
  const cached = storesByRuntime.get(runtime)
  if (cached) return cached
  const next = new WeakMap<object, ExternalStore<any>>()
  storesByRuntime.set(runtime, next)
  return next
}

export const getModuleRuntimeExternalStore = <S>(
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
  moduleRuntime: Logix.ModuleRuntime<S, any>,
  options?: ExternalStoreOptions,
): ExternalStore<S> => {
  const byModule = getStoreMapForRuntime(runtime as any)
  const cached = byModule.get(moduleRuntime as any)
  if (cached) {
    return cached as ExternalStore<S>
  }

  let currentState: S | undefined
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

    // normal priority: microtask flush; also cancels any pending lowPriority notify
    cancelLow()
    if (notifyScheduled) return
    notifyScheduled = true
    queueMicrotask(flushNotify)
  }

  let fiber: Fiber.Fiber<void, any> | undefined

  const ensureSubscription = () => {
    if (fiber) return
    fiber = runtime.runFork(
      Stream.runForEach(
        moduleRuntime.changesWithMeta((state) => state),
        ({ value: state, meta }) =>
          Effect.sync(() => {
            currentState = state
            scheduleNotify(meta.priority)
          }),
      ),
    )
  }

  const refreshSnapshotIfStale = () => {
    // Only needed to prevent missing an update between a previous getSnapshot() and subscribe().
    // Do not eagerly notify on first subscribe (it would create an extra render).
    if (currentState === undefined) {
      return
    }
    try {
      const latest = runtime.runSync(moduleRuntime.getState as Effect.Effect<S, never, any>)
      if (currentState === undefined || !Object.is(currentState, latest)) {
        currentState = latest
        scheduleNotify('normal')
      }
    } catch {
      // ignore best-effort refresh failures
    }
  }

  const getSnapshot = () => {
    if (currentState !== undefined) return currentState
    currentState = runtime.runSync(moduleRuntime.getState as Effect.Effect<S, never, any>)
    return currentState
  }

  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    ensureSubscription()
    // Ensure we don't miss updates that happen between first getSnapshot() and subscribe().
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

  const store: ExternalStore<S> = { getSnapshot, subscribe }
  byModule.set(moduleRuntime as any, store as ExternalStore<any>)
  return store
}
