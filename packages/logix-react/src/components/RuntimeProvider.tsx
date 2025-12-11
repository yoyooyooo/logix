import React, { useContext, useEffect, useMemo, useRef, useState } from "react"
import {
  Layer,
  ManagedRuntime,
  Scope,
  Exit,
  Context,
  Effect,
  Runtime,
  FiberRef,
  LogLevel,
} from "effect"
import * as Logix from "@logix/core"
import type * as HashSet from "effect/HashSet"
import type * as Logger from "effect/Logger"
import { RuntimeContext, ReactRuntimeContextValue } from "../internal/ReactContext.js"
import { isDevEnv } from "../internal/env.js"
import {
  DEFAULT_CONFIG_SNAPSHOT,
  ReactRuntimeConfigSnapshot,
  type ReactConfigSnapshot,
} from "../internal/config.js"

// Logger set type aligned with FiberRef.currentLoggers
type LoggerSet = HashSet.HashSet<Logger.Logger<unknown, any>>

export interface UseRuntimeOptions {
  // 在当前 Runtime 基础上追加一层或多层局部 Env；
  // 语义等价于在当前 Provider 链的 contexts 之后追加一个新的 Context，
  // 不会重新启动 Root processes，仅做 Env 覆盖。
  readonly layer?: Layer.Layer<any, any, never>
  readonly layers?: ReadonlyArray<Layer.Layer<any, any, never>>
}

export interface RuntimeProviderProps {
  // React 集成层的 layer 要求自身环境已闭合（R = never），
  // 只依赖 runtime 已经提供好的全局环境，避免在组件树内再引入未满足的依赖。
  readonly layer?: Layer.Layer<any, any, never>
  readonly runtime?: ManagedRuntime.ManagedRuntime<any, any>
  readonly children: React.ReactNode
  readonly fallback?: React.ReactNode
}

export const RuntimeProvider: React.FC<RuntimeProviderProps> = ({
  layer,
  runtime,
  children,
  fallback = null,
}) => {
  const parent = useContext(RuntimeContext)
  const resolution = useRuntimeResolution(runtime, parent)

  const platformBinding: LayerBinding | null = null

  const { binding: layerBinding, isLoading } = useLayerBinding(
    resolution.runtime,
    layer,
    Boolean(layer),
  )

  const contexts = useMemo<Context.Context<any>[]>(() => {
    const base: Array<Context.Context<any>> =
      resolution.mode === "inherit" && parent ? [...parent.contexts] : []
    // platformBinding 当前恒为 null，占位保留以便未来接入 React 平台层。
    if (layerBinding) {
      base.push(layerBinding.context)
    }
    return base
  }, [resolution.mode, parent, platformBinding, layerBinding])

  const scopes = useMemo<Scope.Scope[]>(() => {
    const base: Array<Scope.Scope> =
      resolution.mode === "inherit" && parent ? [...parent.scopes] : []
    if (layerBinding) {
      base.push(layerBinding.scope)
    }
    return base
  }, [resolution.mode, parent, layerBinding])

  const loggerSets = useMemo<ReadonlyArray<LoggerSet>>(() => {
    const base: Array<LoggerSet> =
      resolution.mode === "inherit" && parent ? [...parent.loggers] : []
    if (layerBinding) {
      base.push(layerBinding.loggers)
    }
    return base
  }, [resolution.mode, parent, layerBinding])

  const logLevels = useMemo<ReadonlyArray<LogLevel.LogLevel>>(() => {
    const base: Array<LogLevel.LogLevel> =
      resolution.mode === "inherit" && parent ? [...parent.logLevels] : []
    if (layerBinding) {
      base.push(layerBinding.logLevel)
    }
    return base
  }, [resolution.mode, parent, layerBinding])

  const debugSinks = useMemo<ReadonlyArray<ReadonlyArray<Logix.Debug.Sink>>>(() => {
    const base: Array<ReadonlyArray<Logix.Debug.Sink>> =
      resolution.mode === "inherit" && parent ? [...parent.debugSinks] : []
    if (layerBinding) {
      base.push(layerBinding.debugSinks)
    }
    return base
  }, [resolution.mode, parent, layerBinding])

  const runtimeWithBindings = useMemo(
    () =>
      createRuntimeAdapter(
        resolution.runtime,
        contexts,
        scopes,
        loggerSets,
        logLevels,
        debugSinks,
      ),
    [resolution.runtime, contexts, scopes, loggerSets, logLevels, debugSinks],
  )

  const [configState, setConfigState] = useState<{
    snapshot: ReactConfigSnapshot
    version: number
  }>(() => ({ snapshot: DEFAULT_CONFIG_SNAPSHOT, version: 0 }))

  useEffect(() => {
    let cancelled = false

    runtimeWithBindings
      .runPromise(
        ReactRuntimeConfigSnapshot.load as Effect.Effect<
          ReactConfigSnapshot,
          any,
          any
        >,
      )
      .then((snapshot: ReactConfigSnapshot) => {
        if (cancelled) return
        setConfigState((prev) => {
          const sameSnapshot =
            prev.snapshot.gcTime === snapshot.gcTime &&
            prev.snapshot.initTimeoutMs === snapshot.initTimeoutMs &&
            prev.snapshot.source === snapshot.source

          if (sameSnapshot) {
            if (prev.version === 0) {
              return { snapshot, version: 1 }
            }
            return prev
          }

          return { snapshot, version: prev.version + 1 }
        })

        // 尽量通过 Effect logger 记录一次配置来源，便于排查覆盖路径。
        void runtimeWithBindings
          .runPromise(
            Effect.logDebug({
              type: "react.runtime.config.snapshot",
              source: snapshot.source,
              gcTime: snapshot.gcTime,
              initTimeoutMs: snapshot.initTimeoutMs,
            }),
          )
          .catch(() => { })
      })
      .catch((error) => {
        if (cancelled) return
        // eslint-disable-next-line no-console
        console.debug(
          "[RuntimeProvider] Failed to load React runtime config snapshot, fallback to default.",
          error,
        )
        setConfigState((prev) => ({
          snapshot: DEFAULT_CONFIG_SNAPSHOT,
          version: prev.version + 1,
        }))
      })

    return () => {
      cancelled = true
    }
  }, [runtimeWithBindings])

  const contextValue = useMemo<ReactRuntimeContextValue>(
    () => ({
      runtime: resolution.runtime,
      contexts,
      scopes,
      loggers: loggerSets,
      logLevels,
      debugSinks,
      reactConfigSnapshot: configState.snapshot,
      configVersion: configState.version,
    }),
    [resolution.runtime, contexts, scopes, loggerSets, logLevels, debugSinks, configState],
  )

  const isReady = !layer || layerBinding !== null

  if (!isReady && Boolean(layer)) {
    return <>{fallback}</>
  }

  return React.createElement(RuntimeContext.Provider, { value: contextValue }, children)
}

const useRuntimeResolution = (
  runtimeProp: ManagedRuntime.ManagedRuntime<any, any> | undefined,
  parent: ReactRuntimeContextValue | null
) => {
  const runtime = runtimeProp ?? parent?.runtime
  if (!runtime) {
    throw new Error(
      "RuntimeProvider requires a runtime prop, or must be nested inside another RuntimeProvider."
    )
  }

  const mode: "prop" | "inherit" = runtimeProp ? "prop" : "inherit"

  return { runtime, mode } as const
}

interface LayerBinding {
  readonly context: Context.Context<any>
  readonly scope: Scope.CloseableScope
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
  readonly layer: Layer.Layer<any, any, never>
  readonly enabled: boolean
  readonly loggers: LoggerSet
  readonly logLevel: LogLevel.LogLevel
  readonly debugSinks: ReadonlyArray<Logix.Debug.Sink>
}

const useLayerBinding = (
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
  layer: Layer.Layer<any, any, never> | undefined,
  enabled: boolean
): { binding: LayerBinding | null; isLoading: boolean } => {
  const activeBindingRef = useRef<LayerBinding | null>(null)
  const [state, setState] = useState<{
    binding: LayerBinding | null
    isLoading: boolean
    runtime: ManagedRuntime.ManagedRuntime<any, any> | null
    layer: Layer.Layer<any, any, never> | undefined
    enabled: boolean
  }>(() => ({
    binding: null,
    isLoading: enabled && !!layer,
    runtime,
    layer,
    enabled,
  }))

  useEffect(() => {
    // 禁用或未提供 layer：清理现有绑定并重置状态
    if (!enabled || !layer) {
      const current = activeBindingRef.current
      if (current) {
        activeBindingRef.current = null
        void runtime.runPromise(Scope.close(current.scope, Exit.void))
      }
      setState({
        binding: null,
        isLoading: false,
        runtime: null,
        layer: undefined,
        enabled,
      })
      return
    }

    const current = activeBindingRef.current

    // 若已存在绑定且依赖未变，直接复用，避免重复构建。
    if (
      current &&
      current.runtime === runtime &&
      current.layer === layer &&
      current.enabled === enabled
    ) {
      setState({
        binding: current,
        isLoading: false,
        runtime,
        layer,
        enabled,
      })
      return
    }

    const previousBinding = current ?? state.binding

    if (
      isDevEnv() &&
      previousBinding &&
      previousBinding.layer !== layer &&
      enabled &&
      layer
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        "[RuntimeProvider] Rebuilding layer due to new layer reference. 请在调用方对 Layer 进行 memo，避免重复构建与资源抖动。"
      )
    }

    // 依赖发生变化时，关闭旧 scope 并重建。
    if (current) {
      activeBindingRef.current = null
      void runtime.runPromise(Scope.close(current.scope, Exit.void))
    }

    let cancelled = false
    // 标记为加载中并同步当前依赖快照，同时必须清除旧 binding
    setState({
      binding: null,
      isLoading: true,
      runtime,
      layer,
      enabled,
    })

    // 为当前 RuntimeProvider 的 Layer 构造独立 Scope：这里不依赖 Runtime Env，
    // 直接使用全局默认 Runtime 创建 Scope，避免在 Runtime.layer 包含异步 Layer
    //（例如 Debug.layer/traceLayer）时，通过 ManagedRuntime.runSync 触发
    // AsyncFiberException。
    const newScope = Effect.runSync(Scope.make()) as Scope.CloseableScope
    const buildEffect = Effect.gen(function* () {
      const context = (yield* Layer.buildWithScope(
        layer,
        newScope,
      )) as Context.Context<any>
      const applyEnv = <A, E>(effect: Effect.Effect<A, E, any>) =>
        Effect.mapInputContext(
          Scope.extend(effect, newScope) as Effect.Effect<A, E, any>,
          (parent: Context.Context<any>) => Context.merge(parent, context),
        )

      const loggers: LoggerSet = yield* applyEnv(FiberRef.get(FiberRef.currentLoggers))
      const logLevel: LogLevel.LogLevel = yield* applyEnv(
        FiberRef.get(FiberRef.currentLogLevel),
      )
      const debugSinks: ReadonlyArray<Logix.Debug.Sink> = yield* applyEnv(
        FiberRef.get(
          Logix.Debug.internal.currentDebugSinks as FiberRef.FiberRef<ReadonlyArray<Logix.Debug.Sink>>,
        ),
      )
      return { context, loggers, logLevel, debugSinks }
    })

    const assignBinding = (result: {
      context: Context.Context<any>
      loggers: LoggerSet
      logLevel: LogLevel.LogLevel
      debugSinks: ReadonlyArray<Logix.Debug.Sink>
    }) => {
      if (cancelled) {
        return runtime.runPromise(Scope.close(newScope, Exit.void))
      }

      const previous = activeBindingRef.current
      const newBinding: LayerBinding = {
        context: result.context,
        loggers: result.loggers,
        logLevel: result.logLevel,
        debugSinks: result.debugSinks,
        scope: newScope,
        runtime,
        layer,
        enabled,
      }
      activeBindingRef.current = newBinding

      setState({
        binding: newBinding,
        isLoading: false,
        runtime,
        layer,
        enabled,
      })

      if (previous) {
        return runtime.runPromise(Scope.close(previous.scope, Exit.void))
      }
      return Promise.resolve()
    }

    let builtSync = false
    try {
      const result = runtime.runSync(buildEffect)
      builtSync = true
      void assignBinding(result)
    } catch {
      // 同步构建失败时回落到异步，避免直接阻塞。
    }

    if (!builtSync) {
      void runtime
        .runPromise(buildEffect)
        .then(assignBinding)
        .catch((error) => {
          // 构建失败时关闭新 scope，并清空绑定
          void runtime.runPromise(Scope.close(newScope, Exit.void))
          if (!cancelled) {
            // eslint-disable-next-line no-console
            console.error("[RuntimeProvider] Failed to build layer", error)
            setState({
              binding: null,
              isLoading: false,
              runtime,
              layer,
              enabled,
            })
          }
        })
    }

    return () => {
      cancelled = true
      const current = activeBindingRef.current
      if (current) {
        activeBindingRef.current = null
        void runtime.runPromise(Scope.close(current.scope, Exit.void))
        return
      }
      // 清理未成功绑定时提前创建的 scope
      void runtime.runPromise(Scope.close(newScope, Exit.void))
    }
  }, [runtime, layer, enabled])

  // 只在绑定仍然匹配当前 props 时对外暴露，否则视为未就绪，避免暴露已关闭 Scope 的句柄。
  const isCurrentBinding =
    state.binding !== null &&
    state.runtime === runtime &&
    state.layer === layer &&
    state.enabled === enabled &&
    enabled &&
    !!layer

  return {
    binding: isCurrentBinding ? state.binding : null,
    isLoading: isCurrentBinding ? state.isLoading : enabled && !!layer,
  }
}

export function useRuntime(): ManagedRuntime.ManagedRuntime<any, any>
export function useRuntime(options: UseRuntimeOptions): ManagedRuntime.ManagedRuntime<any, any>
export function useRuntime(options?: UseRuntimeOptions): ManagedRuntime.ManagedRuntime<any, any> {
  const context = useContext(RuntimeContext)
  if (!context) {
    throw new Error("RuntimeProvider not found")
  }

  const mergedLayerCacheRef = useRef<{
    layers: ReadonlyArray<Layer.Layer<any, any, never>>
    merged: Layer.Layer<any, any, never>
  } | null>(null)

  const mergedLayer = useMemo<Layer.Layer<any, any, never> | undefined>(() => {
    if (!options) {
      return undefined
    }

    const { layer, layers } = options
    const hasLayersArray = Array.isArray(layers) && layers.length > 0

    if (!layer && !hasLayersArray) {
      return undefined
    }

    if (hasLayersArray) {
      const all = (layer ? [layer, ...layers!] : layers!) as ReadonlyArray<
        Layer.Layer<any, any, never>
      >

      // 相同元素但新数组引用时复用上次合并结果，避免无意义的 Layer 重建。
      const cached = mergedLayerCacheRef.current
      const shallowEqual =
        cached &&
        cached.layers.length === all.length &&
        cached.layers.every((item, idx) => item === all[idx])

      if (shallowEqual) {
        return cached!.merged
      }

      const merged = Layer.mergeAll(
        ...(all as [Layer.Layer<any, any, never>, ...Layer.Layer<any, any, never>[]])
      )
      mergedLayerCacheRef.current = { layers: all, merged }
      return merged
    }

    return layer
  }, [options?.layer, options?.layers])

  const lastLayersRef = useRef<ReadonlyArray<Layer.Layer<any, any, never>> | null>(null)
  const shallowEqualLayers = (
    a: ReadonlyArray<Layer.Layer<any, any, never>> | null,
    b: ReadonlyArray<Layer.Layer<any, any, never>> | null
  ) =>
    !!a &&
    !!b &&
    a.length === b.length &&
    a.every((item, idx) => item === b[idx])

  useEffect(() => {
    if (!isDevEnv()) {
      return
    }
    if (
      options?.layers &&
      lastLayersRef.current &&
      lastLayersRef.current !== options.layers &&
      !shallowEqualLayers(lastLayersRef.current, options.layers)
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        "[RuntimeProvider] useRuntime 收到新的 layers 引用。请使用 useMemo 固定 layers 数组，避免每次渲染触发 Layer 重建与性能抖动。"
      )
    }
    lastLayersRef.current = options?.layers ?? null
  }, [options?.layers])

  const { binding } = useLayerBinding(context.runtime, mergedLayer, !!mergedLayer)

  const contexts = useMemo<ReadonlyArray<Context.Context<any>>>(() => {
    if (binding) {
      return [...context.contexts, binding.context]
    }
    return context.contexts
  }, [context.contexts, binding])

  const scopes = useMemo<ReadonlyArray<Scope.Scope>>(() => {
    if (binding) {
      return [...context.scopes, binding.scope]
    }
    return context.scopes
  }, [context.scopes, binding])

  const loggers = useMemo<ReadonlyArray<LoggerSet>>(() => {
    if (binding) {
      return [...context.loggers, binding.loggers]
    }
    return context.loggers
  }, [context.loggers, binding])

  const logLevels = useMemo<ReadonlyArray<LogLevel.LogLevel>>(() => {
    if (binding) {
      return [...context.logLevels, binding.logLevel]
    }
    return context.logLevels
  }, [context.logLevels, binding])

  const debugSinks = useMemo<ReadonlyArray<ReadonlyArray<Logix.Debug.Sink>>>(() => {
    if (binding) {
      return [...context.debugSinks, binding.debugSinks]
    }
    return context.debugSinks
  }, [context.debugSinks, binding])

  return useMemo(
    () =>
      createRuntimeAdapter(
        context.runtime as ManagedRuntime.ManagedRuntime<any, any>,
        contexts,
        scopes,
        loggers,
        logLevels,
        debugSinks,
      ),
    [context.runtime, contexts, scopes, loggers, logLevels, debugSinks],
  )
}

const createRuntimeAdapter = (
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
  contexts: ReadonlyArray<Context.Context<any>>,
  scopes: ReadonlyArray<Scope.Scope>,
  loggerSets: ReadonlyArray<LoggerSet>,
  logLevels: ReadonlyArray<LogLevel.LogLevel>,
  debugSinks: ReadonlyArray<ReadonlyArray<Logix.Debug.Sink>>,
): ManagedRuntime.ManagedRuntime<any, any> => {
  if (
    contexts.length === 0 &&
    scopes.length === 0 &&
    loggerSets.length === 0 &&
    logLevels.length === 0 &&
    debugSinks.length === 0
  ) {
    return runtime
  }

  const applyContexts = <A, E, R>(
    effect: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E, R> =>
    // 先通过 scope.extend 继承各层 Provider 的 scope（保持 fiberRef/Logger 等修改），
    // 再通过 mapInputContext 合并 Context（内层覆盖外层）。
    contexts.reduceRight(
      (acc, ctx) =>
        Effect.mapInputContext(
          acc as Effect.Effect<A, E, any>,
          (parent: Context.Context<any>) =>
            Context.merge(parent, ctx) as Context.Context<any>
        ),
      scopes.reduceRight(
        (acc, scope) => Scope.extend(acc as Effect.Effect<A, E, any>, scope),
        effect as Effect.Effect<A, E, any>
      ) as Effect.Effect<A, E, any>
    ) as Effect.Effect<A, E, R>

  const applyLoggers = <A, E, R>(effect: Effect.Effect<A, E, R>) => {
    const last = loggerSets.length > 0 ? loggerSets[loggerSets.length - 1] : null
    const logLevel = logLevels.length > 0 ? logLevels[logLevels.length - 1] : null
    const sinks = debugSinks.length > 0 ? debugSinks[debugSinks.length - 1] : null

    let result: Effect.Effect<A, E, any> = effect as Effect.Effect<A, E, any>
    if (last) {
      result = Effect.locally(FiberRef.currentLoggers, last)(result)
    }
    if (logLevel) {
      result = Effect.locally(FiberRef.currentLogLevel, logLevel)(result)
    }
    // 仅当 sinks 非空时才覆盖当前 DebugSink 集合；
    // 对于只注入 Env/Theme 而不关心 Debug 的 Provider（sinks.length === 0），
    // 保持外层 Runtime / Provider 已设置好的 DebugSink 不变，避免误清空 Devtools 等观测能力。
    if (sinks && sinks.length > 0) {
      result = Effect.locally(
        Logix.Debug.internal.currentDebugSinks as FiberRef.FiberRef<ReadonlyArray<Logix.Debug.Sink>>,
        sinks,
      )(result)
    }
    return result as Effect.Effect<A, E, R>
  }

  const adapted: ManagedRuntime.ManagedRuntime<any, any> = {
    ...runtime,
    runFork: <A, E>(
      effect: Effect.Effect<A, E, any>,
      options?: Parameters<typeof runtime.runFork>[1]
    ) => runtime.runFork(applyLoggers(applyContexts(effect)), options),
    runPromise: <A, E>(
      effect: Effect.Effect<A, E, any>,
      options?: Parameters<typeof runtime.runPromise>[1]
    ) => runtime.runPromise(applyLoggers(applyContexts(effect)), options),
    runPromiseExit: <A, E>(
      effect: Effect.Effect<A, E, any>,
      options?: Parameters<typeof runtime.runPromiseExit>[1]
    ) => runtime.runPromiseExit(applyLoggers(applyContexts(effect)), options),
    runSync: <A, E>(effect: Effect.Effect<A, E, any>) =>
      runtime.runSync(applyLoggers(applyContexts(effect))),
    runSyncExit: <A, E>(effect: Effect.Effect<A, E, any>) =>
      runtime.runSyncExit(applyLoggers(applyContexts(effect))),
    runCallback: <A, E>(
      effect: Effect.Effect<A, E, any>,
      options?: Runtime.RunCallbackOptions<A, any>
    ) => runtime.runCallback(applyLoggers(applyContexts(effect)), options)
  }

  return adapted
}
