import type React from "react"
import * as Logix from "@logix/core"
import { Effect, Exit, ManagedRuntime, Scope } from "effect"
import type { ReactConfigSnapshot } from "./config.js"
import { isDevEnv } from "./env.js"

type ResourceKey = string

type ModuleRuntimeAny = Logix.ModuleRuntime<any, any>

export type ModuleCacheFactory = (
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
  /**
   * 声明性“所有者”标识，用于在开发/测试环境下做 Key Ownership 校验：
   * - 典型为 ModuleImpl 的 module.id；
   * - 仅在 ownerId 存在且发生变化时触发告警/报错。
   */
  ownerId?: string
  /**
   * 当前 Entry 使用的 GC 策略（毫秒）。
   *
   * - 对于正常构建成功的资源：由调用方传入的 gcTime 或默认值；
   * - 对于错误状态：使用短周期 GC（ERROR_GC_DELAY_MS），不受业务 gcTime 影响。
   */
  gcTime: number
}

const RUNTIME_CACHE = new WeakMap<
  ManagedRuntime.ManagedRuntime<any, any>,
  { version: number; cache: ModuleCache }
>()

const DEFAULT_GC_DELAY_MS = 500
const ERROR_GC_DELAY_MS = 500
const IS_DEV = isDevEnv()

export class ModuleCache {
  private readonly entries = new Map<ResourceKey, ResourceEntry>()

  constructor(
    private readonly runtime: ManagedRuntime.ManagedRuntime<any, any>,
    private readonly gcDelayMs: number = DEFAULT_GC_DELAY_MS,
  ) { }

  private scheduleGC(key: ResourceKey, entry: ResourceEntry): void {
    if (entry.gcTimeout) {
      // 已经有 GC 计时器在排队，避免重复创建。
      return
    }

    const delay = entry.gcTime

    // Infinity / NaN：视为“永不自动 GC”；<= 0：立即 GC（在当前 tick 调度）。
    if (!Number.isFinite(delay)) {
      return
    }

    const timeoutMs = delay <= 0 ? 0 : delay

    entry.gcTimeout = setTimeout(() => {
      const current = this.entries.get(key)
      // 期间已被其他写入覆盖或删除
      if (!current || current !== entry) {
        return
      }
      // 期间有新的持有方出现，交给 retain/release 管理
      if (current.refCount > 0) {
        return
      }

      // 若仍处于 pending 状态，说明构建任务尚未完成（例如异步 Layer 仍在初始化），
      // 此时即便没有显式 refCount 也不能直接 GC，否则会导致 Suspense 永远挂起。
      // 这里选择延后 GC：清除当前定时器并按相同 gcTime 重新调度一次，
      // 直到初始化完成并进入 success/error 状态后，再按正常逻辑判断是否回收。
      if (current.status === "pending") {
        current.gcTimeout = undefined
        this.scheduleGC(key, current)
        return
      }

      void this.runtime
        .runPromise(Scope.close(current.scope, Exit.void))
        .catch(() => { })

      // DevTools trace：记录 GC 回收某个 React Module 实例的事件
      void this.runtime
        .runPromise(
          Logix.Debug.record({
            type: "trace:react.module-instance",
            moduleId: current.ownerId,
            runtimeId: (current.value as any)?.id,
            data: {
              event: "gc",
              key,
            },
          }) as unknown as Effect.Effect<void, never, never>,
        )
        .catch(() => { })
      this.entries.delete(key)
    }, timeoutMs)
  }

  /**
   * Suspense 友好的读取：在 Render 阶段启动异步构建，并通过 Promise 驱动挂起。
   */
  read(
    key: ResourceKey,
    factory: ModuleCacheFactory,
    gcTime?: number,
    ownerId?: string,
  ): ModuleRuntimeAny {
    const existing = this.entries.get(key)

    if (existing) {
      if (
        IS_DEV &&
        existing.ownerId !== undefined &&
        ownerId !== undefined &&
        existing.ownerId !== ownerId
      ) {
        // eslint-disable-next-line no-console
        console.error(
          "[ModuleCache.read] resource key ownership mismatch:",
          `key="${key}" previously owned by "${existing.ownerId}",`,
          `but now requested by "${ownerId}".`,
        )
        throw new Error(
          `[ModuleCache.read] resource key "${key}" has already been claimed by module "${existing.ownerId}", ` +
          `but is now requested by module "${ownerId}". ` +
          "Within the same ManagedRuntime, a given key must not be shared across different ModuleImpl definitions. " +
          "Please ensure each ModuleImpl uses a distinct key when sharing ModuleRuntime instances.",
        )
      }

      if (existing.status === "pending") {
        throw existing.promise
      }
      if (existing.status === "error") {
        throw existing.error
      }
      return existing.value as ModuleRuntimeAny
    }

    // 构建用于该 ModuleRuntime 的独立 Scope：这里不依赖 React Runtime Env，
    // 直接使用全局默认 Runtime 即可，避免在 suspend:true 场景下过早触发
    // ManagedRuntime.runSync（可能遇到异步 Layer 构建）。
    const scope = Effect.runSync(Scope.make()) as Scope.CloseableScope

    const entry: ResourceEntry = {
      scope,
      status: "pending",
      // 占位，随后立即赋值为真正的 Promise
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      promise: Promise.resolve<ModuleRuntimeAny>(null as any),
      refCount: 0,
      gcTime: gcTime ?? this.gcDelayMs,
      ownerId,
    }

    // 对于 Suspense 场景：如果渲染在挂起后被放弃（组件从未 commit），
    // 对应的 retain 永远不会发生，为避免“僵尸 Entry + Scope”长期驻留，
    // 这里为 refCount=0 的初始状态预置一次延迟 GC。
    this.scheduleGC(key, entry)

    const promise = this.runtime
      .runPromise(factory(scope) as Effect.Effect<ModuleRuntimeAny, any, any>)
      .then((value) => {
        entry.status = "success"
        entry.value = value

        // DevTools trace：记录 Suspense 模式下 ModuleRuntime 与 React key 的绑定关系
        void this.runtime
          .runPromise(
            Logix.Debug.record({
              type: "trace:react.module-instance",
              moduleId: ownerId,
              runtimeId: (value as any)?.id,
              data: {
                event: "attach",
                key,
                mode: "suspend",
                gcTime: entry.gcTime,
              },
            }) as unknown as Effect.Effect<void, never, never>,
          )
          .catch(() => { })

        return value
      })
      .catch((error) => {
        entry.status = "error"
        entry.error = error
        // 错误状态一律使用短周期 GC，避免卡在长期错误缓存。
        entry.gcTime = ERROR_GC_DELAY_MS
        // 出错时尽早尝试关闭 Scope；重复关闭由 GC 阶段兜底。
        // 若 Runtime 已经被 dispose，忽略关闭失败即可。
        void this.runtime
          .runPromise(Scope.close(scope, Exit.fail(error as unknown)))
          .catch(() => { })
        throw error
      })

    this.entries.set(key, entry)
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
  readSync(
    key: ResourceKey,
    factory: ModuleCacheFactory,
    gcTime?: number,
    ownerId?: string,
  ): ModuleRuntimeAny {
    const existing = this.entries.get(key)

    if (existing) {
      if (
        IS_DEV &&
        existing.ownerId !== undefined &&
        ownerId !== undefined &&
        existing.ownerId !== ownerId
      ) {
        // eslint-disable-next-line no-console
        console.error(
          "[ModuleCache.readSync] resource key ownership mismatch:",
          `key="${key}" previously owned by "${existing.ownerId}",`,
          `but now requested by "${ownerId}".`,
        )
        throw new Error(
          `[ModuleCache.readSync] resource key "${key}" has already been claimed by module "${existing.ownerId}", ` +
          `but is now requested by module "${ownerId}". ` +
          "Within the same ManagedRuntime, a given key must not be shared across different ModuleImpl definitions. " +
          "Please ensure each ModuleImpl uses a distinct key when sharing ModuleRuntime instances.",
        )
      }

      if (existing.status === "error") {
        throw existing.error
      }
      if (existing.status === "pending") {
        // 对于同步读取，不期望命中 pending 状态；直接抛出以暴露逻辑错误。
        // 典型原因是：同一个 key 同时被 suspend:true（异步）和同步模式访问。
        throw new Error(
        `[ModuleCache.readSync] encountered pending entry for key="${key}". ` +
          "This usually indicates that the same resource key is being used by both " +
          "suspend:true (async) and sync consumers. Please either give different keys " +
          "to async/sync callers, or stick to a single access mode for this resource.",
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
        gcTime: gcTime ?? this.gcDelayMs,
        ownerId,
      }

      // 为防止 Render Abort 导致 retain 从未执行，必须调度一次 GC
      this.scheduleGC(key, entry)

      this.entries.set(key, entry)

      // DevTools trace：记录同步模式下 ModuleRuntime 与 React key 的绑定关系
      void this.runtime
        .runPromise(
          Logix.Debug.record({
            type: "trace:react.module-instance",
            moduleId: ownerId,
            runtimeId: (value as any)?.id,
            data: {
              event: "attach",
              key,
              mode: "sync",
              gcTime: entry.gcTime,
            },
          }) as unknown as Effect.Effect<void, never, never>,
        )
        .catch(() => { })

      return value
    } catch (error) {
      // 若构建失败，立即尝试关闭 Scope；Runtime 已 dispose 时忽略关闭失败。
      void this.runtime
        .runPromise(Scope.close(scope, Exit.fail(error as unknown)))
        .catch(() => { })

      const entry: ResourceEntry = {
        scope,
        status: "error",
        promise: Promise.reject(error),
        error,
        refCount: 0,
        gcTime: ERROR_GC_DELAY_MS,
        ownerId,
      }

      // 错误状态也需要 GC，否则该 key 会永久处于 error 状态无法重试
      this.scheduleGC(key, entry)

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
      return () => { }
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
    this.scheduleGC(key, entry)
  }

  dispose(): void {
    for (const [key, entry] of this.entries) {
      if (entry.gcTimeout) {
        clearTimeout(entry.gcTimeout)
      }
      void this.runtime
        .runPromise(Scope.close(entry.scope, Exit.void))
        .catch(() => { })
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

export const stableHash = (deps: React.DependencyList): string => {
  if (IS_DEV) {
    // 在开发环境下，如果 deps 中包含 object/function，给出一次性告警，提示调用方优先使用原始值。
    const hasNonPrimitive = deps.some((value) => {
      if (value === null) return false
      const type = typeof value
      return type === "object" || type === "function"
    })
    if (hasNonPrimitive) {
      // eslint-disable-next-line no-console
      console.warn(
        "[ModuleCache] deps contains non-primitive values. " +
        "stableHash() only distinguishes primitives (string/number/boolean/null/undefined); " +
        "object/function entries may not trigger expected cache updates. " +
        "Consider passing explicit primitive deps or controlling invalidation via `key`.",
      )
    }
  }

  return deps.map(hashOf).join("|")
}
