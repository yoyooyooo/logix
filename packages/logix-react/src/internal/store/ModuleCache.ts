import type React from 'react'
import * as Logix from '@logixjs/core'
import { Cause, Effect, Exit, Fiber, ManagedRuntime, Option, Scope } from 'effect'
import type { ReactConfigSnapshot } from '../provider/config.js'
import { isDevEnv } from '../provider/env.js'
import type { YieldPolicy, YieldStrategy } from '../provider/policy.js'
import { YieldBudgetMemory } from './perfWorkloads.js'

type ResourceKey = string

type ModuleRuntimeLike = { readonly instanceId?: string }

export type ModuleCacheFactory<A extends ModuleRuntimeLike = ModuleRuntimeLike> = (
  scope: Scope.Scope,
) => Effect.Effect<A, unknown, unknown>

export type ModuleCachePolicyMode = 'sync' | 'suspend' | 'defer'

export interface ModuleCacheLoadOptions {
  readonly entrypoint?: string
  readonly policyMode?: ModuleCachePolicyMode
  readonly yield?: YieldPolicy
  readonly warnSyncBlockingThresholdMs?: number
}

export interface ModuleCachePreloadOptions extends ModuleCacheLoadOptions {
  readonly gcTime?: number
  readonly ownerId?: string
}

interface ResourceEntry {
  scope: Scope.CloseableScope
  status: 'pending' | 'success' | 'error'
  promise: Promise<ModuleRuntimeLike>
  fiber?: Fiber.RuntimeFiber<ModuleRuntimeLike, unknown>
  value?: ModuleRuntimeLike
  error?: unknown
  refCount: number
  preloadRefCount: number
  gcTimeout?: ReturnType<typeof setTimeout>
  /**
   * Declarative "owner" identifier for key ownership checks in dev/test:
   * - Typically the ModuleImpl's module.id.
   * - Only warns/errors when ownerId exists and changes.
   */
  ownerId?: string
  /**
   * The GC policy (ms) used by the current Entry.
   *
   * - For successfully built resources: uses caller-provided gcTime or defaults.
   * - For error state: uses short-cycle GC (ERROR_GC_DELAY_MS), unaffected by business gcTime.
   */
  gcTime: number
  createdBy: 'read' | 'preload'
  workloadKey: string
  yieldStrategy: YieldStrategy
}

const RUNTIME_CACHE = new WeakMap<ManagedRuntime.ManagedRuntime<any, any>, { version: number; cache: ModuleCache }>()

const DEFAULT_GC_DELAY_MS = 500
const ERROR_GC_DELAY_MS = 500
const DEFAULT_RENDER_SYNC_BLOCKING_WARN_THRESHOLD_MS = 5

const toErrorString = (error: unknown): string => {
  if (error instanceof Error) {
    return error.stack ?? error.message
  }
  return String(error)
}

const seenBestEffortFailures = new Set<string>()

const debugBestEffortFailure = (label: string, error: unknown): void => {
  if (!isDevEnv()) return

  const message = toErrorString(error)

  if (message.includes('ManagedRuntime disposed')) {
    return
  }

  const key = `${label}\n${message}`
  if (seenBestEffortFailures.has(key)) return
  seenBestEffortFailures.add(key)
  // eslint-disable-next-line no-console
  console.debug(label, message)
}

const causeToUnknown = (cause: Cause.Cause<unknown>): unknown => {
  const failure = Option.getOrUndefined(Cause.failureOption(cause))
  if (failure !== undefined) return failure
  const defect = Option.getOrUndefined(Cause.dieOption(cause))
  if (defect !== undefined) return defect
  return cause
}

const yieldEffect = (strategy: YieldStrategy): Effect.Effect<void> => {
  switch (strategy) {
    case 'none':
      return Effect.void
    case 'microtask':
      return Effect.yieldNow()
    case 'macrotask':
      return Effect.promise(
        () =>
          new Promise<void>((resolve) => {
            setTimeout(resolve, 0)
          }),
      )
  }
}

type YieldDecision = {
  readonly strategy: YieldStrategy
  readonly reason?: string
  readonly p95Ms?: number
}

const decideYieldStrategy = (runtime: object, workloadKey: string, policy: YieldPolicy | undefined): YieldDecision => {
  const baseStrategy = policy?.strategy ?? 'microtask'
  if (baseStrategy === 'none') {
    return { strategy: 'none', reason: 'disabled' }
  }

  const budgetMs = policy?.onlyWhenOverBudgetMs
  if (budgetMs === undefined) {
    return { strategy: baseStrategy }
  }

  const decision = YieldBudgetMemory.shouldYield({ runtime, workloadKey, policy })
  return decision.shouldYield
    ? { strategy: baseStrategy, reason: decision.reason, p95Ms: decision.p95Ms }
    : { strategy: 'none', reason: decision.reason, p95Ms: decision.p95Ms }
}

const warnedSyncBlockingKeys = new Set<string>()

export class ModuleCache {
  private readonly entries = new Map<ResourceKey, ResourceEntry>()

  constructor(
    private readonly runtime: ManagedRuntime.ManagedRuntime<any, any>,
    private readonly gcDelayMs: number = DEFAULT_GC_DELAY_MS,
  ) {}

  private scheduleGC(key: ResourceKey, entry: ResourceEntry): void {
    if (entry.gcTimeout) {
      // A GC timer is already queued; avoid creating duplicates.
      return
    }

    const delay = entry.gcTime

    // Infinity / NaN: treated as "never auto GC"; <= 0: GC immediately (scheduled in current tick).
    if (!Number.isFinite(delay)) {
      return
    }

    const timeoutMs = delay <= 0 ? 0 : delay

    entry.gcTimeout = setTimeout(() => {
      const current = this.entries.get(key)
      // It has been overwritten or deleted by another write in the meantime.
      if (!current || current !== entry) {
        return
      }

      // Timer fired: clear the handle so we can reschedule later when refCount/preloadRefCount reaches zero.
      current.gcTimeout = undefined

      // A new holder appeared in the meantime; retain/release will handle it.
      if (current.refCount > 0 || current.preloadRefCount > 0) {
        return
      }

      // If still pending, the build task hasn't completed (e.g. async Layer still initializing).
      // Even without an explicit refCount, we must not GC now, otherwise Suspense may hang forever.
      // We delay GC by rescheduling with the same gcTime until it becomes success/error,
      // then we decide whether to collect under normal rules.
      if (current.status === 'pending') {
        this.scheduleGC(key, current)
        return
      }

      void this.runtime.runPromise(Scope.close(current.scope, Exit.void)).catch((error) => {
        debugBestEffortFailure('[ModuleCache] Scope.close failed', error)
      })

      // DevTools trace: record the GC event for a React Module instance.
      void this.runtime
        .runPromise(
          Logix.Debug.record({
            type: 'trace:react.module-instance',
            moduleId: current.ownerId,
            instanceId: current.value?.instanceId,
            data: {
              event: 'gc',
              key,
            },
          }) as unknown as Effect.Effect<void, never, never>,
        )
        .catch((error) => {
          debugBestEffortFailure('[ModuleCache] Debug.record failed', error)
        })
      this.entries.delete(key)
    }, timeoutMs)
  }

  /**
   * Suspense-friendly read: starts async construction during render and suspends via Promise.
   */
  read(
    key: ResourceKey,
    factory: ModuleCacheFactory,
    gcTime?: number,
    ownerId?: string,
    options?: ModuleCacheLoadOptions,
  ): ModuleRuntimeLike
  read<A extends ModuleRuntimeLike>(
    key: ResourceKey,
    factory: ModuleCacheFactory<A>,
    gcTime?: number,
    ownerId?: string,
    options?: ModuleCacheLoadOptions,
  ): A
  read<A extends ModuleRuntimeLike>(
    key: ResourceKey,
    factory: ModuleCacheFactory<A>,
    gcTime?: number,
    ownerId?: string,
    options?: ModuleCacheLoadOptions,
  ): A {
    const existing = this.entries.get(key)

    if (existing) {
      if (isDevEnv() && existing.ownerId !== undefined && ownerId !== undefined && existing.ownerId !== ownerId) {
        // eslint-disable-next-line no-console
        console.error(
          '[ModuleCache.read] resource key ownership mismatch:',
          `key="${key}" previously owned by "${existing.ownerId}",`,
          `but now requested by "${ownerId}".`,
        )
        throw new Error(
          `[ModuleCache.read] resource key "${key}" has already been claimed by module "${existing.ownerId}", ` +
            `but is now requested by module "${ownerId}". ` +
            'Within the same ManagedRuntime, a given key must not be shared across different ModuleImpl definitions. ' +
            'Please ensure each ModuleImpl uses a distinct key when sharing ModuleRuntime instances.',
        )
      }

      if (existing.status === 'pending') {
        throw existing.promise
      }
      if (existing.status === 'error') {
        throw existing.error
      }
      return existing.value as A
    }

    // Build an independent Scope for this ModuleRuntime:
    // - Does not depend on React Runtime Env.
    // - Uses the global default Runtime, avoiding early ManagedRuntime.runSync in suspend:true scenarios
    //   (may encounter async Layer building).
    const scope = Effect.runSync(Scope.make()) as Scope.CloseableScope

    const workloadKey = `${options?.entrypoint ?? 'unknown'}::${ownerId ?? 'unknown'}`
    const yieldDecision = decideYieldStrategy(this.runtime as unknown as object, workloadKey, options?.yield)

    const entry: ResourceEntry = {
      scope,
      status: 'pending',
      // Placeholder; will be replaced immediately with the real Promise.
      promise: Promise.resolve<ModuleRuntimeLike>(null as unknown as ModuleRuntimeLike),
      refCount: 0,
      preloadRefCount: 0,
      gcTime: gcTime ?? this.gcDelayMs,
      ownerId,
      createdBy: 'read',
      workloadKey,
      yieldStrategy: yieldDecision.strategy,
    }

    // Suspense scenario: if a render is abandoned after suspension (component never commits),
    // retain will never happen. To avoid long-lived "zombie Entry + Scope", schedule a delayed GC for the initial refCount=0 state.
    this.scheduleGC(key, entry)

    const startedAt = performance.now()

    const buildEffect = yieldEffect(yieldDecision.strategy).pipe(Effect.zipRight(factory(scope)))

    const fiber = this.runtime.runFork(buildEffect) as Fiber.RuntimeFiber<ModuleRuntimeLike, unknown>
    entry.fiber = fiber

    const promise: Promise<A> = this.runtime.runPromise(Fiber.await(fiber)).then((exit) => {
      if (Exit.isSuccess(exit)) return exit.value as A
      throw causeToUnknown(exit.cause as Cause.Cause<unknown>)
    })

    promise
      .then((value) => {
        entry.status = 'success'
        entry.value = value

        const durationMs = performance.now() - startedAt
        YieldBudgetMemory.record({ runtime: this.runtime as unknown as object, workloadKey, durationMs })

        // DevTools trace: record ModuleRuntime <-> React key binding under Suspense mode.
        if (isDevEnv() || Logix.Debug.isDevtoolsEnabled()) {
          void this.runtime
            .runPromise(
              Logix.Debug.record({
                type: 'trace:react.module.init',
                moduleId: ownerId,
                instanceId: value.instanceId,
                data: {
                  mode: 'suspend',
                  key,
                  durationMs: Math.round(durationMs * 100) / 100,
                  yieldStrategy: yieldDecision.strategy,
                  yieldReason: yieldDecision.reason,
                  yieldP95Ms: yieldDecision.p95Ms,
                },
              }) as unknown as Effect.Effect<void, never, never>,
            )
            .catch((error) => {
              debugBestEffortFailure('[ModuleCache] Debug.record failed', error)
            })

          void this.runtime
            .runPromise(
              Logix.Debug.record({
                type: 'trace:react.module-instance',
                moduleId: ownerId,
                instanceId: value.instanceId,
                data: {
                  event: 'attach',
                  key,
                  mode: 'suspend',
                  gcTime: entry.gcTime,
                },
              }) as unknown as Effect.Effect<void, never, never>,
            )
            .catch((error) => {
              debugBestEffortFailure('[ModuleCache] Debug.record failed', error)
            })
        }

        return value
      })
      .catch((error) => {
        entry.status = 'error'
        entry.error = error
        // Always use short-cycle GC for error states to avoid being stuck in long-lived error caches.
        entry.gcTime = ERROR_GC_DELAY_MS
        if (entry.gcTimeout) {
          clearTimeout(entry.gcTimeout)
          entry.gcTimeout = undefined
        }
        this.scheduleGC(key, entry)
        YieldBudgetMemory.record({
          runtime: this.runtime as unknown as object,
          workloadKey,
          durationMs: performance.now() - startedAt,
        })
        // Try to close Scope early on error; GC phase will handle repeated closes.
        // If Runtime has been disposed, ignore close failures.
        void this.runtime.runPromise(Scope.close(scope, Exit.fail(error as unknown))).catch((closeError) => {
          debugBestEffortFailure('[ModuleCache] Scope.close failed', closeError)
        })
        throw error
      })

    this.entries.set(key, entry)
    entry.promise = promise

    throw promise
  }

  /**
   * Synchronous read: for cases where you must obtain ModuleRuntime immediately during render.
   *
   * - Does not trigger Suspense (does not throw Promise), but factory must not contain real async steps.
   * - If factory throws, record error state and rethrow.
   * - Lifecycle is still managed by retain/release; Scope is stored in Entry and can be GC-collected later.
   */
  readSync(
    key: ResourceKey,
    factory: ModuleCacheFactory,
    gcTime?: number,
    ownerId?: string,
    options?: ModuleCacheLoadOptions,
  ): ModuleRuntimeLike
  readSync<A extends ModuleRuntimeLike>(
    key: ResourceKey,
    factory: ModuleCacheFactory<A>,
    gcTime?: number,
    ownerId?: string,
    options?: ModuleCacheLoadOptions,
  ): A
  readSync<A extends ModuleRuntimeLike>(
    key: ResourceKey,
    factory: ModuleCacheFactory<A>,
    gcTime?: number,
    ownerId?: string,
    options?: ModuleCacheLoadOptions,
  ): A {
    const existing = this.entries.get(key)

    if (existing) {
      if (isDevEnv() && existing.ownerId !== undefined && ownerId !== undefined && existing.ownerId !== ownerId) {
        // eslint-disable-next-line no-console
        console.error(
          '[ModuleCache.readSync] resource key ownership mismatch:',
          `key="${key}" previously owned by "${existing.ownerId}",`,
          `but now requested by "${ownerId}".`,
        )
        throw new Error(
          `[ModuleCache.readSync] resource key "${key}" has already been claimed by module "${existing.ownerId}", ` +
            `but is now requested by module "${ownerId}". ` +
            'Within the same ManagedRuntime, a given key must not be shared across different ModuleImpl definitions. ' +
            'Please ensure each ModuleImpl uses a distinct key when sharing ModuleRuntime instances.',
        )
      }

      if (existing.status === 'error') {
        throw existing.error
      }
      if (existing.status === 'pending') {
        // For sync reads, we do not expect to hit a pending entry; throw to surface a logic error.
        // Typical cause: the same key is accessed by both suspend:true (async) and sync consumers.
        throw new Error(
          `[ModuleCache.readSync] encountered pending entry for key="${key}". ` +
            'This usually indicates that the same resource key is being used by both ' +
            'suspend:true (async) and sync consumers. Please either give different keys ' +
            'to async/sync callers, or stick to a single access mode for this resource.',
        )
      }
      return existing.value as A
    }

    const scope = this.runtime.runSync(Scope.make()) as Scope.CloseableScope

    const startedAt = performance.now()

    try {
      const value = this.runtime.runSync(factory(scope))
      const durationMs = performance.now() - startedAt

      const entry: ResourceEntry = {
        scope,
        status: 'success',
        promise: Promise.resolve(value),
        value,
        refCount: 0,
        preloadRefCount: 0,
        gcTime: gcTime ?? this.gcDelayMs,
        ownerId,
        createdBy: 'read',
        workloadKey: `${options?.entrypoint ?? 'unknown'}::${ownerId ?? 'unknown'}`,
        yieldStrategy: 'none',
      }

      // Schedule a GC in case of render abort (retain never executes).
      this.scheduleGC(key, entry)

      this.entries.set(key, entry)

      // DevTools trace: record ModuleRuntime <-> React key binding under sync mode.
      if (isDevEnv()) {
        const threshold = options?.warnSyncBlockingThresholdMs ?? DEFAULT_RENDER_SYNC_BLOCKING_WARN_THRESHOLD_MS
        if (threshold > 0 && durationMs > threshold) {
          const dedupeKey = `${options?.entrypoint ?? 'unknown'}::${ownerId ?? 'unknown'}::${key}`
          if (!warnedSyncBlockingKeys.has(dedupeKey)) {
            warnedSyncBlockingKeys.add(dedupeKey)
            const hint =
              options?.policyMode === 'defer'
                ? 'Fix: 当前 policy.mode="defer"：请检查该模块是否在 policy.preload 列表中；未预加载的模块仍可能触发二次 fallback 或同步重活。'
                : 'Fix: 建议切换到 policy.mode="suspend"（默认），并提供 RuntimeProvider.fallback；必要时启用 yield 策略。'
            const example =
              options?.policyMode === 'defer'
                ? 'Example: <RuntimeProvider policy={{ mode: "defer", preload: [MyImpl] }} fallback={<Loading />}>…</RuntimeProvider>'
                : 'Example: <RuntimeProvider policy={{ mode: "suspend" }} fallback={<Loading />}>…</RuntimeProvider>'
            const docs = 'Docs: apps/docs/content/docs/guide/essentials/react-integration.md'
            // eslint-disable-next-line no-console
            console.warn(
              '[Logix][React] Render-phase sync blocking detected',
              `(${Math.round(durationMs * 100) / 100}ms > ${threshold}ms)`,
              '\n',
              `entrypoint=${options?.entrypoint ?? 'unknown'}`,
              '\n',
              `ownerId=${ownerId ?? 'unknown'}`,
              '\n',
              `key=${key}`,
              '\n',
              hint,
              '\n',
              example,
              '\n',
              docs,
            )
          }
        }
      }

      if (isDevEnv() || Logix.Debug.isDevtoolsEnabled()) {
        void this.runtime
          .runPromise(
            Logix.Debug.record({
              type: 'trace:react.module.init',
              moduleId: ownerId,
              instanceId: value.instanceId,
              data: {
                mode: 'sync',
                key,
                durationMs: Math.round(durationMs * 100) / 100,
                yieldStrategy: 'none',
              },
            }) as unknown as Effect.Effect<void, never, never>,
          )
          .catch((error) => {
            debugBestEffortFailure('[ModuleCache] Debug.record failed', error)
          })

        void this.runtime
          .runPromise(
            Logix.Debug.record({
              type: 'trace:react.module-instance',
              moduleId: ownerId,
              instanceId: value.instanceId,
              data: {
                event: 'attach',
                key,
                mode: 'sync',
                gcTime: entry.gcTime,
              },
            }) as unknown as Effect.Effect<void, never, never>,
          )
          .catch((error) => {
            debugBestEffortFailure('[ModuleCache] Debug.record failed', error)
          })
      }

      return value
    } catch (error) {
      // If building fails, try to close Scope immediately; ignore close failures when Runtime is disposed.
      void this.runtime.runPromise(Scope.close(scope, Exit.fail(error as unknown))).catch((closeError) => {
        debugBestEffortFailure('[ModuleCache] Scope.close failed', closeError)
      })

      const entry: ResourceEntry = {
        scope,
        status: 'error',
        promise: Promise.reject(error),
        error,
        refCount: 0,
        preloadRefCount: 0,
        gcTime: ERROR_GC_DELAY_MS,
        ownerId,
        createdBy: 'read',
        workloadKey: `${options?.entrypoint ?? 'unknown'}::${ownerId ?? 'unknown'}`,
        yieldStrategy: 'none',
      }

      // Error state also needs GC, otherwise the key stays in error forever and cannot retry.
      this.scheduleGC(key, entry)

      this.entries.set(key, entry)
      throw error
    }
  }

  preload<A extends ModuleRuntimeLike>(
    key: ResourceKey,
    factory: ModuleCacheFactory<A>,
    options?: ModuleCachePreloadOptions,
  ): { readonly promise: Promise<A>; readonly cancel: () => void } {
    const existing = this.entries.get(key)
    if (existing) {
      if (existing.status === 'success') {
        existing.preloadRefCount += 1
        return {
          promise: Promise.resolve(existing.value as A),
          cancel: () => {
            this.cancelPreload(key, existing)
          },
        }
      }
      if (existing.status === 'error') {
        return { promise: Promise.reject(existing.error), cancel: () => {} }
      }
      existing.preloadRefCount += 1
      return {
        promise: existing.promise as Promise<A>,
        cancel: () => {
          this.cancelPreload(key, existing)
        },
      }
    }

    const scope = Effect.runSync(Scope.make()) as Scope.CloseableScope

    const ownerId = options?.ownerId
    const gcTime = options?.gcTime ?? this.gcDelayMs
    const workloadKey = `${options?.entrypoint ?? 'unknown'}::${ownerId ?? 'unknown'}`
    const yieldDecision = decideYieldStrategy(this.runtime as unknown as object, workloadKey, options?.yield)

    const entry: ResourceEntry = {
      scope,
      status: 'pending',
      promise: Promise.resolve(null as unknown as ModuleRuntimeLike),
      refCount: 0,
      preloadRefCount: 1,
      gcTime,
      ownerId,
      createdBy: 'preload',
      workloadKey,
      yieldStrategy: yieldDecision.strategy,
    }

    this.scheduleGC(key, entry)
    this.entries.set(key, entry)

    const startedAt = performance.now()
    const buildEffect = yieldEffect(yieldDecision.strategy).pipe(Effect.zipRight(factory(scope)))

    const fiber = this.runtime.runFork(buildEffect) as Fiber.RuntimeFiber<ModuleRuntimeLike, unknown>
    entry.fiber = fiber

    const promise: Promise<A> = this.runtime.runPromise(Fiber.await(fiber)).then((exit) => {
      if (Exit.isSuccess(exit)) return exit.value as A
      throw causeToUnknown(exit.cause as Cause.Cause<unknown>)
    })

    entry.promise = promise as Promise<ModuleRuntimeLike>

    void promise
      .then((value) => {
        entry.status = 'success'
        entry.value = value
        YieldBudgetMemory.record({
          runtime: this.runtime as unknown as object,
          workloadKey,
          durationMs: performance.now() - startedAt,
        })
      })
      .catch((error) => {
        entry.status = 'error'
        entry.error = error
        entry.gcTime = ERROR_GC_DELAY_MS
        if (entry.gcTimeout) {
          clearTimeout(entry.gcTimeout)
          entry.gcTimeout = undefined
        }
        this.scheduleGC(key, entry)
        YieldBudgetMemory.record({
          runtime: this.runtime as unknown as object,
          workloadKey,
          durationMs: performance.now() - startedAt,
        })
        void this.runtime.runPromise(Scope.close(scope, Exit.fail(error as unknown))).catch((closeError) => {
          debugBestEffortFailure('[ModuleCache] Scope.close failed', closeError)
        })
      })

    return {
      promise,
      cancel: () => {
        this.cancelPreload(key, entry)
      },
    }
  }

  private cancelPreload(key: ResourceKey, entry: ResourceEntry): void {
    const current = this.entries.get(key)
    if (!current || current !== entry) {
      return
    }

    entry.preloadRefCount = Math.max(0, entry.preloadRefCount - 1)

    // Other preload holders still exist: keep it.
    if (entry.preloadRefCount > 0) {
      return
    }

    // If a component is already holding it (retained after commit), retain/release lifecycle manages it.
    if (entry.refCount > 0) {
      return
    }

    // Pending can only be canceled when created by preload; otherwise it may break Suspense/read semantics.
    if (entry.status === 'pending') {
      if (entry.createdBy !== 'preload') {
        // This entry was created by read(Suspense): after releasing the preload holder, restore original GC semantics.
        this.scheduleGC(key, entry)
        return
      }

      const running = entry.fiber
      entry.fiber = undefined
      this.entries.delete(key)

      if (running) {
        this.runtime.runFork(Fiber.interrupt(running))
      }
      void this.runtime.runPromise(Scope.close(entry.scope, Exit.void)).catch((closeError) => {
        debugBestEffortFailure('[ModuleCache] Scope.close failed', closeError)
      })
      return
    }

    // success/error: when unheld, GC by gcTime (error uses short cycle).
    if (entry.gcTimeout) {
      clearTimeout(entry.gcTimeout)
      entry.gcTimeout = undefined
    }
    this.scheduleGC(key, entry)
  }

  /**
   * Declares ownership of a resource after component commit.
   * The returned function releases the reference during cleanup.
   */
  retain(key: ResourceKey): () => void {
    const entry = this.entries.get(key)
    if (!entry) {
      // Resource is GC-collected or not created; return a no-op cleanup.
      return () => {}
    }

    entry.refCount += 1

    if (entry.gcTimeout) {
      clearTimeout(entry.gcTimeout)
      entry.gcTimeout = undefined
    }

    return () => {
      this.release(key)
    }
  }

  release(key: ResourceKey): void {
    const entry = this.entries.get(key)
    if (!entry) {
      return
    }

    entry.refCount -= 1
    if (entry.refCount > 0) {
      return
    }

    // When refCount reaches zero, GC via delayed scheduling to absorb StrictMode mount/unmount jitter.
    this.scheduleGC(key, entry)
  }

  dispose(): void {
    for (const [key, entry] of this.entries) {
      if (entry.gcTimeout) {
        clearTimeout(entry.gcTimeout)
      }
      void this.runtime.runPromise(Scope.close(entry.scope, Exit.void)).catch((error) => {
        debugBestEffortFailure('[ModuleCache] Scope.close failed', error)
      })
      this.entries.delete(key)
    }
  }
}

export const getModuleCache = (
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
  config: ReactConfigSnapshot,
  version: number,
): ModuleCache => {
  const cached = RUNTIME_CACHE.get(runtime)
  if (cached && cached.version === version) {
    return cached.cache
  }

  if (cached) {
    cached.cache.dispose()
  }

  const cache = new ModuleCache(runtime, config.gcTime)
  RUNTIME_CACHE.set(runtime, { version, cache })
  return cache
}

const hashOf = (value: unknown): string => {
  if (value === null) {
    return 'null'
  }
  const type = typeof value
  if (type === 'string') {
    return `s:${value as string}`
  }
  if (type === 'number') {
    return `n:${value as number}`
  }
  if (type === 'boolean') {
    return `b:${value as boolean}`
  }
  // For non-primitives like object/function, only keep type information here.
  // Callers should avoid passing unstable references in deps.
  return `${type}:${Object.prototype.toString.call(value)}`
}

export const stableHash = (deps: React.DependencyList): string => {
  if (isDevEnv()) {
    // In dev, if deps contains object/function, emit a one-time warning suggesting primitive deps.
    const hasNonPrimitive = deps.some((value) => {
      if (value === null) return false
      const type = typeof value
      return type === 'object' || type === 'function'
    })
    if (hasNonPrimitive) {
      // eslint-disable-next-line no-console
      console.warn(
        '[ModuleCache] deps contains non-primitive values. ' +
          'stableHash() only distinguishes primitives (string/number/boolean/null/undefined); ' +
          'object/function entries may not trigger expected cache updates. ' +
          'Consider passing explicit primitive deps or controlling invalidation via `key`.',
      )
    }
  }

  return deps.map(hashOf).join('|')
}
