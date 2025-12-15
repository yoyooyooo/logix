import type * as Logix from "@logix/core"
import { Effect, Fiber, Stream } from "effect"
import type { ManagedRuntime } from "effect"

export interface ExternalStore<S> {
  readonly getSnapshot: () => S
  readonly subscribe: (listener: () => void) => () => void
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
): ExternalStore<S> => {
  const byModule = getStoreMapForRuntime(runtime as any)
  const cached = byModule.get(moduleRuntime as any)
  if (cached) {
    return cached as ExternalStore<S>
  }

  let currentState: S | undefined
  const listeners = new Set<() => void>()

  let notifyScheduled = false
  const scheduleNotify = () => {
    if (notifyScheduled) return
    notifyScheduled = true
    queueMicrotask(() => {
      notifyScheduled = false
      for (const listener of listeners) {
        listener()
      }
    })
  }

  let fiber: Fiber.Fiber<void, any> | undefined

  const ensureSubscription = () => {
    if (fiber) return
    fiber = runtime.runFork(
      Stream.runForEach(
        moduleRuntime.changes((state) => state),
        (state) =>
          Effect.sync(() => {
            currentState = state
            scheduleNotify()
          }),
      ),
    )
  }

  const getSnapshot = () => {
    if (currentState !== undefined) return currentState
    currentState = runtime.runSync(moduleRuntime.getState as Effect.Effect<S, never, any>)
    return currentState
  }

  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    ensureSubscription()
    return () => {
      listeners.delete(listener)
      if (listeners.size > 0) return
      const running = fiber
      if (!running) return
      fiber = undefined
      runtime.runFork(Fiber.interrupt(running))
    }
  }

  const store: ExternalStore<S> = { getSnapshot, subscribe }
  byModule.set(moduleRuntime as any, store as ExternalStore<any>)
  return store
}

