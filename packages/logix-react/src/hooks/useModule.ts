import React from "react"
import * as Logix from "@logix/core"
import { Context, Effect, Layer, Scope } from "effect"
import { ReactModuleHandle, useModuleRuntime } from "../internal/useModuleRuntime.js"
import { useSelector } from "./useSelector.js"
import { useRuntime } from "../components/RuntimeProvider.js"
import { isDevEnv } from "../internal/env.js"
import {
  getModuleCache,
  type ModuleCacheFactory,
  stableHash,
} from "../internal/ModuleCache.js"
import { RuntimeContext } from "../internal/ReactContext.js"
import { makeModuleActions, type ModuleRef } from "../internal/ModuleRef.js"
import { resolveImportedModuleRef } from "../internal/resolveImportedModuleRef.js"

export type { ModuleActions, ModuleRef } from "../internal/ModuleRef.js"

// 同步模式选项：默认行为，不触发 React Suspense。
interface ModuleImplSyncOptions {
  readonly deps?: React.DependencyList
  readonly key?: string
  readonly suspend?: false | undefined
  readonly initTimeoutMs?: number
  /**
   * 当该 ModuleRuntime 在无人持有（refCount=0）后的保活时间（毫秒）。
   * - 默认为 ModuleCache 的默认值（约 500ms），用于防止 StrictMode 抖动；
   * - 会话级场景可显式设置为更长时间，例如 5 分钟。
   */
  readonly gcTime?: number
  /**
   * （可选）实例标签：用于 DevTools / 调试视图的友好名称。
   * - 若未提供，则在启用 DevTools 时默认回退为 key 或自动编号（Instance #1/#2）。
   * - 建议用于 Session / 分片等多实例场景，例如 "Session A" / "Session B"。
   */
  readonly label?: string
}

// Suspense 模式选项：当 suspend: true 时，必须显式提供稳定的 key。
interface ModuleImplSuspendOptions {
  readonly deps?: React.DependencyList
  readonly key: string
  readonly suspend: true
  readonly gcTime?: number
  /**
   * 模块初始化（含异步 Layer 构建）允许的最长 Pending 时间（毫秒）。
   * - 仅在 suspend:true 场景下生效；
   * - 超过该时间仍未完成时，会通过 Effect.timeoutFail 触发错误，
   *   由调用方的 ErrorBoundary 或上层逻辑决定重试 / 降级策略。
   * - 不影响 gcTime 语义：gcTime 仍然只描述「无人持有后的保活时间」。
   */
  readonly initTimeoutMs?: number
  /**
   * （可选）实例标签：用于 DevTools / 调试视图的友好名称。
   * - 若未提供，则在启用 DevTools 时默认回退为 key 或自动编号。
   */
  readonly label?: string
}

type ModuleImplOptions = ModuleImplSyncOptions | ModuleImplSuspendOptions

const isModuleImpl = (
  handle: unknown
): handle is Logix.ModuleImpl<any, any, any> =>
  typeof handle === "object" && handle !== null && (handle as any)._tag === "ModuleImpl"

type StateOfHandle<H> = H extends ModuleRef<infer S, any>
  ? S
  : H extends Logix.ModuleRuntime<infer S, any>
    ? S
    : H extends Logix.ModuleInstance<any, infer Sh>
      ? Logix.StateOf<Sh>
      : never

type ActionOfHandle<H> = H extends ModuleRef<any, infer A>
  ? A
  : H extends Logix.ModuleRuntime<any, infer A>
    ? A
    : H extends Logix.ModuleInstance<any, infer Sh>
      ? Logix.ActionOf<Sh>
      : never

export function useModule<Id extends string, Sh extends Logix.AnyModuleShape, R = never>(
  handle: Logix.ModuleImpl<Id, Sh, R>
): ModuleRef<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>

export function useModule<Id extends string, Sh extends Logix.AnyModuleShape, R = never>(
  handle: Logix.ModuleImpl<Id, Sh, R>,
  options: ModuleImplOptions
): ModuleRef<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>

export function useModule<H extends ReactModuleHandle>(
  handle: H
): ModuleRef<StateOfHandle<H>, ActionOfHandle<H>>

export function useModule<Id extends string, Sh extends Logix.AnyModuleShape, R, V>(
  handle: Logix.ModuleImpl<Id, Sh, R>,
  selector: (state: Logix.StateOf<Sh>) => V,
  equalityFn?: (previous: V, next: V) => boolean
): V

export function useModule<H extends ReactModuleHandle, V>(
  handle: H,
  selector: (state: StateOfHandle<H>) => V,
  equalityFn?: (previous: V, next: V) => boolean
): V

export function useModule(
  handle: ReactModuleHandle | Logix.ModuleImpl<any, any, any>,
  selectorOrOptions?: ((state: any) => any) | ModuleImplOptions,
  equalityFn?: (previous: any, next: any) => boolean,
): any {
  const runtimeBase = useRuntime()
  const runtimeContext = React.useContext(RuntimeContext)

  if (!runtimeContext) {
    throw new Error("RuntimeProvider not found")
  }

  let selector: ((state: any) => any) | undefined
  let options: ModuleImplOptions | undefined

  if (isModuleImpl(handle)) {
    if (typeof selectorOrOptions === "function") {
      selector = selectorOrOptions
    } else if (selectorOrOptions && typeof selectorOrOptions === "object") {
      options = selectorOrOptions as ModuleImplOptions
    }
  } else {
    if (typeof selectorOrOptions === "function" || selectorOrOptions === undefined) {
      selector = selectorOrOptions as ((state: any) => any) | undefined
    } else if (selectorOrOptions && typeof selectorOrOptions === "object") {
      throw new Error("useModule(handle, options) 仅支持 ModuleImpl 句柄")
    }
  }

  let runtime: Logix.ModuleRuntime<any, any>

  if (isModuleImpl(handle)) {
    // ModuleImpl：基于当前 Runtime 的 Resource Cache 构造局部 ModuleRuntime，
    // 并将其生命周期绑定到组件。
    //
    // - 默认：使用 readSync（同步构建），保持与现有行为兼容；
    // - 当 options.suspend === true 时：使用 read（Suspense 路径），允许异步 Layer。
    const cache = React.useMemo(
      () =>
        getModuleCache(
          runtimeBase,
          runtimeContext.reactConfigSnapshot,
          runtimeContext.configVersion,
        ),
      [
        runtimeBase,
        runtimeContext.reactConfigSnapshot,
        runtimeContext.configVersion,
      ],
    )

    const deps = (options?.deps ?? []) as React.DependencyList
    const depsHash = stableHash(deps)
    const suspend = options?.suspend === true

    // 1) 解析 gcTime：调用点 > Config(logix.react.gc_time) > 默认 500ms。
    const gcTime = options?.gcTime ?? runtimeContext.reactConfigSnapshot.gcTime

    // 2) 解析 initTimeoutMs（仅在 suspend 模式下生效）：
    //    调用点 > Config(logix.react.init_timeout_ms) > 默认 undefined（不启用超时）。
    let initTimeoutMs: number | undefined = suspend ? options?.initTimeoutMs : undefined
    if (suspend && initTimeoutMs === undefined) {
      initTimeoutMs = runtimeContext.reactConfigSnapshot.initTimeoutMs
    }

    if (suspend && (!options || !options.key)) {
      // 为了防止 Suspense 模式下的资源 key 抖动，suspend:true 必须显式提供 key。
      // 这里在开发/测试环境中直接抛出可读错误，帮助调用方尽早修正用法。
      if (isDevEnv()) {
        throw new Error(
          "[useModule] suspend:true 模式必须显式提供 options.key；" +
            "请在 Suspense 边界外生成稳定 ID（例如 useId() 或业务 id），" +
            "并在 useModule(Impl, { suspend: true, key }) 中传入该值。",
        )
      }
    }

    // 统一的 key 策略：
    // - 默认使用 React.useId 生成组件级 ID，保证在生产环境 / SSR 下 Suspense 安全；
    // - 若调用方提供 options.key，则用作显式覆盖（例如跨组件共享或手工分区）。
    const componentId = React.useId()
    const baseKey =
      options?.key ??
      `impl:${handle.module.id ?? "ModuleImpl"}:${componentId}`
    const key = `${baseKey}:${depsHash}`
    const ownerId = handle.module.id ?? "ModuleImpl"

    const baseFactory = React.useMemo<ModuleCacheFactory>(
      () =>
        (scope: Scope.Scope) =>
          Layer.buildWithScope(
            handle.layer as Layer.Layer<any, any, any>,
            scope,
          ).pipe(
            Effect.map((context) => {
              const runtime = Context.get(
                context as Context.Context<any>,
                handle.module as Logix.ModuleInstance<any, Logix.AnyModuleShape>,
              ) as Logix.ModuleRuntime<any, any>
              return runtime
            }),
          ),
      [handle],
    )

    const factory = React.useMemo<ModuleCacheFactory>(
      () => {
        if (!suspend || initTimeoutMs === undefined) {
          return baseFactory
        }

        // 在 Suspense 模式下，对整体初始化过程增加上界：
        // - 包括 Layer.buildWithScope 以及 ModuleRuntime 构建；
        // - 超时将以错误形式抛出，由调用方 ErrorBoundary 处理。
        return (scope: Scope.Scope) =>
          baseFactory(scope).pipe(
            Effect.timeoutFail({
              duration: initTimeoutMs,
              onTimeout: () =>
                new Error(
                  `[useModule] Module "${ownerId}" initialization timed out after ${initTimeoutMs}ms`,
                ),
            }),
          )
      },
      [baseFactory, suspend, initTimeoutMs, ownerId],
    )

    const moduleRuntime = (suspend
      ? cache.read(key, factory, gcTime, ownerId)
      : cache.readSync(key, factory, gcTime, ownerId)) as Logix.ModuleRuntime<any, any>

    React.useEffect(() => cache.retain(key), [cache, key])

    runtime = moduleRuntime
  } else {
    // ModuleInstance | ModuleRuntime: 使用 useModuleRuntime 获取/复用运行时
    runtime = useModuleRuntime(handle)
  }

  // 为 DevTools 提供实例标签：通过 Debug trace 事件将 key/label 与 runtime.id 绑定，
  // 由下游 DevTools Sink 解析并用于展示。
  React.useEffect(() => {
    if (!isModuleImpl(handle)) {
      return
    }
    // 仅在 ModuleImpl 路径下尝试推导实例标签。
    const opt = options as ModuleImplOptions | undefined
    const label = (opt && "label" in opt && opt.label) || (opt && opt.key)
    if (!label) {
      return
    }

    const effect = Logix.Debug.record({
      type: "trace:instanceLabel",
      moduleId: handle.module.id,
      runtimeId: runtime.id,
      data: { label },
    }) as Effect.Effect<void, never, any>

    runtimeBase.runFork(effect)
  }, [runtimeBase, runtime, handle, options])

  // 组件级渲染 trace：每个组件（每次调用 useModule）每次 commit 只记录一次，
  // 避免 renderCount 被 useSelector 数量放大。
  React.useEffect(() => {
    if (!isDevEnv() && !Logix.Debug.isDevtoolsEnabled()) {
      return
    }
    if (!runtime.id) {
      return
    }

    const effect = Logix.Debug.record({
      type: "trace:react-render",
      moduleId: (runtime as any).moduleId,
      runtimeId: runtime.id,
      data: {
        componentLabel: "useModule",
        strictModePhase: "commit",
      },
    }) as Effect.Effect<void, never, any>

    runtimeBase.runFork(effect)
  }, [runtimeBase, runtime])

  if (selector) {
    // ModuleImpl 路径：selector 明确基于 StateOf<Sh>，直接用 runtime 做订阅。
    if (isModuleImpl(handle)) {
      return useSelector(runtime, selector, equalityFn)
    }

    // 非 ModuleImpl：让 useSelector 基于原始 handle 推导 state 类型（也支持 ModuleRef 句柄）。
    return useSelector(handle, selector as never, equalityFn)
  }

  const dispatch = React.useMemo(
    () => (action: any) => {
      runtimeBase.runFork(
        (runtime.dispatch as (a: any) => Effect.Effect<void, any, any>)(action),
      )
    },
    [runtimeBase, runtime],
  )

  const actions = React.useMemo(() => makeModuleActions(dispatch), [dispatch])

  return React.useMemo(
    () =>
      ({
        runtime,
        dispatch,
        actions,
        imports: {
          get: (module: any) =>
            resolveImportedModuleRef(runtimeBase, runtime, module),
        },
        getState: runtime.getState,
        setState: runtime.setState,
        actions$: runtime.actions$,
        changes: runtime.changes,
        ref: runtime.ref,
      }) satisfies ModuleRef<any, any>,
    [runtimeBase, runtime, dispatch, actions],
  )
}
