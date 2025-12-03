import type React from "react"
import { Logix } from "@logix/core"
import { Effect, Exit, ManagedRuntime, Scope } from "effect"

type ResourceKey = string

type ModuleRuntimeAny = Logix.ModuleRuntime<any, any>

export type ModuleResourceFactory = (
  scope: Scope.Scope
) => Effect.Effect<ModuleRuntimeAny, any, any>

interface ResourceEntry {
  scope: Scope.CloseableScope
  status: "pending" | "success" | "error"
  promise: Promise<ModuleRuntimeAny>
  value?: ModuleRuntimeAny
  error?: unknown
  refCount: number
  gcTimeout?: ReturnType<typeof setTimeout>
}

const RUNTIME_CACHE = new WeakMap<
  ManagedRuntime.ManagedRuntime<any, any>,
  ModuleResourceCache
>()

const DEFAULT_GC_DELAY_MS = 500

export class ModuleResourceCache {
  private readonly entries = new Map<ResourceKey, ResourceEntry>()

  constructor(
    private readonly runtime: ManagedRuntime.ManagedRuntime<any, any>,
    private readonly gcDelayMs: number = DEFAULT_GC_DELAY_MS,
  ) {}

  /**
   * Suspense 友好的读取：在 Render 阶段启动异步构建，并通过 Promise 驱动挂起。
   */
  read(key: ResourceKey, factory: ModuleResourceFactory): ModuleRuntimeAny {
    const existing = this.entries.get(key)

    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.debug(
        "[ModuleResourceCache.read]",
        key,
        "hit=",
        Boolean(existing),
        "size=",
        this.entries.size,
      )
    }

    if (existing) {
      if (existing.status === "pending") {
        throw existing.promise
      }
      if (existing.status === "error") {
        throw existing.error
      }
      return existing.value as ModuleRuntimeAny
    }

    const scope = this.runtime.runSync(Scope.make()) as Scope.CloseableScope

    const entry: ResourceEntry = {
      scope,
      status: "pending",
      // 占位，随后立即赋值为真正的 Promise
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      promise: Promise.resolve<ModuleRuntimeAny>(null as any),
      refCount: 0,
    }

    const promise = this.runtime
      .runPromise(factory(scope) as Effect.Effect<ModuleRuntimeAny, any, any>)
      .then((value) => {
        entry.status = "success"
        entry.value = value
        return value
      })
      .catch((error) => {
        entry.status = "error"
        entry.error = error
        // 出错时尽早尝试关闭 Scope；重复关闭由 GC 阶段兜底。
        // 若 Runtime 已经被 dispose，忽略关闭失败即可。
        void this.runtime
          .runPromise(Scope.close(scope, Exit.fail(error as unknown)))
          .catch(() => {})
        throw error
      })

    this.entries.set(key, entry)

    // 对于尚未被任何组件 retain 的资源，启动延迟 GC，
    // 避免 StrictMode / 并发渲染下未 commit 分支导致的 Scope 泄漏。
    entry.gcTimeout = setTimeout(() => {
      const current = this.entries.get(key)
      if (!current || current !== entry) {
        return
      }
      if (current.refCount > 0) {
        return
      }
      // 如果此时构建尚未完成，关闭 Scope 也视为放弃该资源；后续 read 会创建新 Entry。
      void this.runtime
        .runPromise(Scope.close(current.scope, Exit.void))
        .catch(() => {})
      this.entries.delete(key)
    }, this.gcDelayMs)

    entry.promise = promise

    throw promise
  }

  /**
   * 同步读取：适用于必须在 Render 阶段立即拿到 ModuleRuntime 的场景。
   *
   * - 不会触发 Suspense（不抛出 Promise），但要求 factory 不能包含真正的异步步骤；
   * - 若 factory 执行过程中抛错，则记录为 error 状态并重新抛出；
   * - 生命周期仍由 retain/release 管理，Scope 记录在 Entry 中，后续可通过 GC 回收。
   */
  readSync(key: ResourceKey, factory: ModuleResourceFactory): ModuleRuntimeAny {
    const existing = this.entries.get(key)

    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.debug(
        "[ModuleResourceCache.readSync]",
        key,
        "hit=",
        Boolean(existing),
        "size=",
        this.entries.size,
      )
    }

    if (existing) {
      if (existing.status === "error") {
        throw existing.error
      }
      if (existing.status === "pending") {
        // 对于同步读取，不期望命中 pending 状态；直接抛出以暴露逻辑错误。
        throw new Error(
          "[ModuleResourceCache.readSync] encountered pending entry; this indicates mix of async and sync access for the same key",
        )
      }
      return existing.value as ModuleRuntimeAny
    }

    const scope = this.runtime.runSync(Scope.make()) as Scope.CloseableScope

    try {
      const value = this.runtime.runSync(
        factory(scope) as Effect.Effect<ModuleRuntimeAny, any, any>,
      )

      const entry: ResourceEntry = {
        scope,
        status: "success",
        promise: Promise.resolve(value),
        value,
        refCount: 0,
      }

      this.entries.set(key, entry)
      // 与异步路径保持一致：未被 retain 的同步资源也通过延迟 GC 回收。
      entry.gcTimeout = setTimeout(() => {
        const current = this.entries.get(key)
        if (!current || current !== entry) {
          return
        }
        if (current.refCount > 0) {
          return
        }
        void this.runtime
          .runPromise(Scope.close(current.scope, Exit.void))
          .catch(() => {})
        this.entries.delete(key)
      }, this.gcDelayMs)
      return value
    } catch (error) {
      // 若构建失败，立即尝试关闭 Scope；Runtime 已 dispose 时忽略关闭失败。
      void this.runtime
        .runPromise(Scope.close(scope, Exit.fail(error as unknown)))
        .catch(() => {})

      const entry: ResourceEntry = {
        scope,
        status: "error",
        promise: Promise.reject(error),
        error,
        refCount: 0,
      }

      this.entries.set(key, entry)
      throw error
    }
  }

  /**
   * 在组件 commit 后声明对某个资源的持有。
   * 返回的函数用于在 cleanup 时释放引用。
   */
  retain(key: ResourceKey): () => void {
    const entry = this.entries.get(key)
    if (!entry) {
      // 资源已被 GC 或尚未创建，直接返回 no-op cleanup。
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

    // 引用计数归零时，通过延迟 GC 回收资源，避免 StrictMode 下频繁 mount/unmount 带来的抖动。
    if (!entry.gcTimeout) {
      entry.gcTimeout = setTimeout(() => {
        const current = this.entries.get(key)
        if (!current || current !== entry) {
          return
        }
        if (current.refCount > 0) {
          return
        }
        void this.runtime
          .runPromise(Scope.close(current.scope, Exit.void))
          .catch(() => {})
        this.entries.delete(key)
      }, this.gcDelayMs)
    }
  }
}

export const getModuleResourceCache = (
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
): ModuleResourceCache => {
  let cache = RUNTIME_CACHE.get(runtime)
  if (!cache) {
    cache = new ModuleResourceCache(runtime)
    RUNTIME_CACHE.set(runtime, cache)
  }
  return cache
}

const hashOf = (value: unknown): string => {
  if (value === null) {
    return "null"
  }
  const type = typeof value
  if (type === "string") {
    return `s:${value as string}`
  }
  if (type === "number") {
    return `n:${value as number}`
  }
  if (type === "boolean") {
    return `b:${value as boolean}`
  }
  // 对于 object/function 等非原始类型，这里只保留类型信息；
  // 调用方应避免在 deps 中传入不稳定引用。
  return `${type}:${Object.prototype.toString.call(value)}`
}

export const stableHash = (deps: React.DependencyList): string =>
  deps.map(hashOf).join("|")
