import React, { useContext, useEffect, useMemo, useRef, useState } from "react"
import { Layer, ManagedRuntime, Scope, Exit, Context, Effect, Runtime } from "effect"
import { RuntimeContext, ReactRuntimeContextValue } from "../internal/ReactContext.js"

export interface RuntimeProviderProps {
  // React 集成层的 layer 要求自身环境已闭合（R = never），
  // 只依赖 runtime 已经提供好的全局环境，避免在组件树内再引入未满足的依赖。
  readonly layer?: Layer.Layer<any, any, never>
  readonly runtime?: ManagedRuntime.ManagedRuntime<never, any>
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

  const contextValue = useMemo<ReactRuntimeContextValue>(
    () => ({ runtime: resolution.runtime, contexts }),
    [resolution.runtime, contexts]
  )

  const isReady = !layer || layerBinding !== null

  if (!isReady && Boolean(layer)) {
    return <>{fallback}</>
  }

  return React.createElement(RuntimeContext.Provider, { value: contextValue }, children)
}

const useRuntimeResolution = (
  runtimeProp: ManagedRuntime.ManagedRuntime<never, any> | undefined,
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
}

const useLayerBinding = (
  runtime: ManagedRuntime.ManagedRuntime<never, any>,
  layer: Layer.Layer<any, any, never> | undefined,
  enabled: boolean
): { binding: LayerBinding | null; isLoading: boolean } => {
  const activeBindingRef = useRef<LayerBinding | null>(null)
  const [state, setState] = useState<{
    binding: LayerBinding | null
    isLoading: boolean
    runtime: ManagedRuntime.ManagedRuntime<never, any> | null
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

    let cancelled = false
    // 标记为加载中并同步当前依赖快照，同时必须清除旧 binding
    // 否则 isCurrentBinding 会因为 snapshot 匹配而通过，导致暴露已关闭的旧 binding
    setState({
      binding: null,
      isLoading: true,
      runtime,
      layer,
      enabled,
    })

    const newScope = runtime.runSync(Scope.make()) as Scope.CloseableScope

    void runtime
      .runPromise(
        Layer.buildWithScope(
          layer,
          newScope,
        ) as Effect.Effect<Context.Context<any>, any, never>,
      )
      .then((context) => {
        if (cancelled) {
          // 构建完成前已取消：直接关闭新 scope，避免泄漏
          return runtime.runPromise(Scope.close(newScope, Exit.void))
        }

        const previous = activeBindingRef.current
        const newBinding: LayerBinding = { context, scope: newScope }
        activeBindingRef.current = newBinding

        setState({
          binding: newBinding,
          isLoading: false,
          runtime,
          layer,
          enabled,
        })

        if (previous) {
          void runtime.runPromise(Scope.close(previous.scope, Exit.void))
        }
      })
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

    return () => {
      cancelled = true
      const current = activeBindingRef.current
      if (current) {
        activeBindingRef.current = null
        void runtime.runPromise(Scope.close(current.scope, Exit.void))
      }
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

export const useRuntime = (): ManagedRuntime.ManagedRuntime<any, any> => {
  const context = useContext(RuntimeContext)
  if (!context) {
    throw new Error("RuntimeProvider not found")
  }
  return useMemo(
    () => createRuntimeAdapter(context.runtime as ManagedRuntime.ManagedRuntime<any, any>, context.contexts),
    [context.runtime, context.contexts]
  )
}

const createRuntimeAdapter = (
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
  contexts: ReadonlyArray<Context.Context<any>>
): ManagedRuntime.ManagedRuntime<any, any> => {
  if (contexts.length === 0) {
    return runtime
  }

  const applyContexts = <A, E, R>(
    effect: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E, R> =>
    // 使用 reduceRight 确保“内层 RuntimeProvider 的 layer”优先提供，
    // 便于在嵌套 Provider 场景下进行 Env 覆盖（内层覆盖外层）。
    contexts.reduceRight(
      (acc, ctx) => Effect.provide(acc, ctx),
      effect
    )

  const adapted: ManagedRuntime.ManagedRuntime<any, any> = {
    ...runtime,
    runFork: <A, E>(
      effect: Effect.Effect<A, E, any>,
      options?: Parameters<typeof runtime.runFork>[1]
    ) => runtime.runFork(applyContexts(effect), options),
    runPromise: <A, E>(
      effect: Effect.Effect<A, E, any>,
      options?: Parameters<typeof runtime.runPromise>[1]
    ) => runtime.runPromise(applyContexts(effect), options),
    runPromiseExit: <A, E>(
      effect: Effect.Effect<A, E, any>,
      options?: Parameters<typeof runtime.runPromiseExit>[1]
    ) => runtime.runPromiseExit(applyContexts(effect), options),
    runSync: <A, E>(effect: Effect.Effect<A, E, any>) =>
      runtime.runSync(applyContexts(effect)),
    runSyncExit: <A, E>(effect: Effect.Effect<A, E, any>) =>
      runtime.runSyncExit(applyContexts(effect)),
    runCallback: <A, E>(
      effect: Effect.Effect<A, E, any>,
      options?: Runtime.RunCallbackOptions<A, any>
    ) => runtime.runCallback(applyContexts(effect), options)
  }

  return adapted
}
