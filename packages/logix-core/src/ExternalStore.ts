import { Effect, Fiber, Stream, SubscriptionRef } from 'effect'
import type { Context } from 'effect'
import * as ReadQuery from './ReadQuery.js'
import { fnv1a32, stableStringify } from './internal/digest.js'
import { attachExternalStoreDescriptor, type ExternalStoreDescriptor } from './internal/external-store-descriptor.js'

export type ExternalStore<T> = {
  readonly getSnapshot: () => T
  readonly getServerSnapshot?: () => T
  readonly subscribe: (listener: () => void) => () => void
}

export interface ExternalStoreRuntimeError extends Error {
  readonly _tag: 'ExternalStoreRuntimeError'
  readonly code:
    | 'external_store::unresolved'
    | 'external_store::missing_initial'
    | 'external_store::unresolvable_module_id'
    | 'external_store::unstable_selector_id'
}

const makeError = (code: ExternalStoreRuntimeError['code'], message: string): ExternalStoreRuntimeError =>
  Object.assign(new Error(message), { _tag: 'ExternalStoreRuntimeError' as const, code })

const hasOwn = (value: unknown, key: string): boolean =>
  !!value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, key)

const makeStoreId = (payload: unknown): string => `es_${fnv1a32(stableStringify(payload))}`

const defineDescriptor = <T>(store: ExternalStore<T>, descriptor: ExternalStoreDescriptor): ExternalStore<T> => {
  attachExternalStoreDescriptor(store as object, descriptor)
  return store
}

const makeNotifyScheduler = (listeners: Set<() => void>): (() => void) => {
  let scheduled = false
  return () => {
    if (scheduled) return
    scheduled = true
    queueMicrotask(() => {
      scheduled = false
      for (const listener of listeners) {
        listener()
      }
    })
  }
}

const resolveTagId = (tag: Context.Tag<any, any>): string | undefined => {
  const id = (tag as any).id
  return typeof id === 'string' && id.length > 0 ? id : undefined
}

const resolveModuleIdOrThrow = (module: unknown): string => {
  if (module && typeof module === 'object') {
    const moduleId = (module as any).moduleId
    if (typeof moduleId === 'string' && moduleId.length > 0) return moduleId

    const id = (module as any).id
    if (typeof id === 'string' && id.length > 0) return id

    const tag = (module as any).tag
    if (tag && (typeof tag === 'object' || typeof tag === 'function')) {
      const tagId = (tag as any).id
      if (typeof tagId === 'string' && tagId.length > 0) return tagId
    }

    const moduleTagId = (module as any).id
    if (typeof moduleTagId === 'string' && moduleTagId.length > 0) return moduleTagId
  }

  throw makeError(
    'external_store::unresolvable_module_id',
    '[ExternalStore.fromModule] Failed to resolve moduleId.\n' +
      'Fix: pass a ModuleTag/Module/ModuleImpl/ModuleRuntime (has .id/.tag.id/.moduleId), not a read-only ModuleHandle.',
  )
}

/**
 * Create an ExternalStore by resolving a service from the Effect Context.
 *
 * Notes:
 * - This sugar is intended to be used via `StateTrait.externalStore` (resolved during install/runtime).
 * - `map(service)` must return a sync `getSnapshot()` (no IO) and a `subscribe(listener)` that signals change.
 */
export const fromService = <Id, Svc, T>(
  tag: Context.Tag<Id, Svc>,
  map: (service: Svc) => ExternalStore<T>,
): ExternalStore<T> => {
  const tagId = resolveTagId(tag as any)
  if (!tagId) {
    throw makeError(
      'external_store::unresolved',
      '[ExternalStore.fromService] Tag.id is missing; cannot build a stable storeId.',
    )
  }

  const storeId = makeStoreId({ kind: 'service', tagId })

  const store: ExternalStore<T> = {
    getSnapshot: () => {
      throw makeError(
        'external_store::unresolved',
        `[ExternalStore.fromService] Store is unresolved (tagId=${tagId}). Use it via StateTrait.externalStore install/runtime.`,
      )
    },
    subscribe: () => {
      throw makeError(
        'external_store::unresolved',
        `[ExternalStore.fromService] Store is unresolved (tagId=${tagId}). Use it via StateTrait.externalStore install/runtime.`,
      )
    },
  }

  return defineDescriptor(store, { kind: 'service', storeId, tagId, tag: tag as any, map: map as any })
}

let nextAnonStoreSeq = 0
const storeIdByRef = new WeakMap<object, string>()

const getOrAssignAnonStoreId = (key: object, prefix: string): string => {
  const existing = storeIdByRef.get(key)
  if (existing) return existing
  nextAnonStoreSeq += 1
  const storeId = `${prefix}_u${nextAnonStoreSeq}`
  storeIdByRef.set(key, storeId)
  return storeId
}

/**
 * Create an ExternalStore from a SubscriptionRef.
 *
 * Notes:
 * - `getSnapshot()` is implemented via `SubscriptionRef.get(ref)` (must be a synchronous pure read; do not hide IO inside).
 * - change notifications are batched via microtask (multiple updates in the same microtask trigger a single notify).
 */
export const fromSubscriptionRef = <T>(ref: SubscriptionRef.SubscriptionRef<T>): ExternalStore<T> => {
  const storeId = getOrAssignAnonStoreId(ref as any, 'es_ref')

  let hasSnapshot = false
  let current: T | undefined
  const listeners = new Set<() => void>()
  const scheduleNotify = makeNotifyScheduler(listeners)

  let fiber: Fiber.Fiber<void, any> | undefined

  const ensureSubscription = () => {
    if (fiber) return
    fiber = Effect.runFork(
      Stream.runForEach(ref.changes, (value) =>
        Effect.sync(() => {
          current = value
          hasSnapshot = true
          scheduleNotify()
        }),
      ),
    )
  }

  const refreshSnapshotIfStale = () => {
    if (!hasSnapshot) return
    try {
      const latest = Effect.runSync(SubscriptionRef.get(ref)) as T
      if (!Object.is(current, latest)) {
        current = latest
        scheduleNotify()
      }
    } catch {
      // best-effort
    }
  }

  const store: ExternalStore<T> = {
    getSnapshot: () => {
      if (hasSnapshot) return current as T
      current = Effect.runSync(SubscriptionRef.get(ref)) as T
      hasSnapshot = true
      return current
    },
    subscribe: (listener) => {
      listeners.add(listener)
      ensureSubscription()
      refreshSnapshotIfStale()
      return () => {
        listeners.delete(listener)
        if (listeners.size > 0) return
        const running = fiber
        if (!running) return
        fiber = undefined
        Effect.runFork(Fiber.interrupt(running))
      }
    },
  }

  return defineDescriptor(store, { kind: 'subscriptionRef', storeId, ref: ref as any })
}

/**
 * Create an ExternalStore from a Stream.
 *
 * Notes:
 * - Stream has no synchronous "current" snapshot; you MUST provide `{ initial }` (or `{ current }`).
 * - `{ initial }` may be stale if the stream already emitted before subscription; prefer `fromService/fromSubscriptionRef` for reliable current.
 */
export const fromStream = <A, E>(
  stream: Stream.Stream<A, E, never>,
  options?: { readonly initial?: A; readonly current?: A },
): ExternalStore<A> => {
  const hasCurrent = hasOwn(options, 'current')
  const hasInitial = hasOwn(options, 'initial')

  if (!hasCurrent && !hasInitial) {
    throw makeError(
      'external_store::missing_initial',
      '[ExternalStore.fromStream] Missing { initial } or { current } (Stream has no current snapshot).',
    )
  }

  const initial = hasCurrent ? (options as any).current : (options as any).initial
  const initialHint = hasCurrent ? ('current' as const) : ('initial' as const)

  const storeId = getOrAssignAnonStoreId(stream as any, 'es_stream')

  let current = initial as A
  const listeners = new Set<() => void>()
  const scheduleNotify = makeNotifyScheduler(listeners)

  let fiber: Fiber.Fiber<void, any> | undefined

  const ensureSubscription = () => {
    if (fiber) return
    fiber = Effect.runFork(
      Stream.runForEach(stream, (value) =>
        Effect.sync(() => {
          current = value
          scheduleNotify()
        }),
      ),
    )
  }

  const store: ExternalStore<A> = {
    getSnapshot: () => current,
    subscribe: (listener) => {
      listeners.add(listener)
      ensureSubscription()
      return () => {
        listeners.delete(listener)
        if (listeners.size > 0) return
        const running = fiber
        if (!running) return
        fiber = undefined
        Effect.runFork(Fiber.interrupt(running))
      }
    },
  }

  return defineDescriptor(store, { kind: 'stream', storeId, stream: stream as any, initial, initialHint })
}

/**
 * Module-as-Source: treat a module selector as an ExternalStore source (IR-recognizable dependency).
 *
 * Notes:
 * - `moduleId` must be resolvable; passing a read-only `ModuleHandle` is forbidden (fail-fast).
 * - selectorId must be stable: `ReadQuery.compile(selector)` must NOT fall back to `fallbackReason="unstableSelectorId"` (fail-fast).
 * - Value semantics: the runtime does not clone; writeback stores the selector return value as-is (keep selectors small and stable).
 */
export const fromModule = <S, V>(module: unknown, selector: ReadQuery.ReadQueryInput<S, V>): ExternalStore<V> => {
  const moduleId = resolveModuleIdOrThrow(module)
  const instanceId =
    module && typeof module === 'object' && typeof (module as any).instanceId === 'string' && (module as any).instanceId.length > 0
      ? ((module as any).instanceId as string)
      : undefined
  const compiled = ReadQuery.compile(selector)

  if (compiled.fallbackReason === 'unstableSelectorId' || compiled.staticIr.fallbackReason === 'unstableSelectorId') {
    throw makeError(
      'external_store::unstable_selector_id',
      `[ExternalStore.fromModule] selectorId is unstable (fallbackReason=unstableSelectorId). ` +
        'Fix: add a stable debugKey, or pass an explicit ReadQuery (manual/static lane).',
    )
  }

  const storeId = makeStoreId({ kind: 'module', moduleId, selectorId: compiled.selectorId })

  const store: ExternalStore<V> = {
    getSnapshot: () => {
      throw makeError(
        'external_store::unresolved',
        `[ExternalStore.fromModule] Store is unresolved (moduleId=${moduleId}, selectorId=${compiled.selectorId}). ` +
          'Use it via StateTrait.externalStore + TickScheduler/RuntimeStore (Module-as-Source).',
      )
    },
    subscribe: () => {
      throw makeError(
        'external_store::unresolved',
        `[ExternalStore.fromModule] Store is unresolved (moduleId=${moduleId}, selectorId=${compiled.selectorId}). ` +
          'Use it via StateTrait.externalStore + TickScheduler/RuntimeStore (Module-as-Source).',
      )
    },
  }

  return defineDescriptor(store, {
    kind: 'module',
    storeId,
    module,
    moduleId,
    ...(instanceId ? { instanceId } : {}),
    readQuery: compiled,
  })
}
