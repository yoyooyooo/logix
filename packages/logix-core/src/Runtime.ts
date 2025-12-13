import { Effect, Layer, ManagedRuntime } from "effect"
import type { AnyModuleShape, ModuleImpl } from "./internal/module.js"
import * as AppRuntimeImpl from "./internal/runtime/AppRuntime.js"
import * as ModuleRuntime from "./internal/runtime/ModuleRuntime.js"
import * as Debug from "./Debug.js"
import type * as EffectOp from "./effectop.js"
import * as EffectOpCore from "./internal/runtime/EffectOpCore.js"
import type { StateTransactionInstrumentation } from "./internal/runtime/core/env.js"
import * as Middleware from "./middleware/index.js"

/**
 * Runtime 配置：
 * - layer：额外的顶层 Env（如 Config / 平台服务），会与 Root ModuleImpl.layer 合并；
 * - onError：App 级错误处理入口，用于在 Runtime 级统一上报未捕获错误。
 */
export interface RuntimeStateTransactionOptions {
  readonly instrumentation?: StateTransactionInstrumentation
}

export interface RuntimeOptions {
  readonly layer?: Layer.Layer<any, never, never>
  readonly onError?: (cause: import('effect').Cause.Cause<unknown>) => Effect.Effect<void>
  /**
   * 可选：为当前 ManagedRuntime 指定一个逻辑标识（例如 "AppDemoRuntime"），
   * 用于 Debug / DevTools 分组展示。
   */
  readonly label?: string
  readonly middleware?: EffectOp.MiddlewareStack
  /**
   * 一键启用 Devtools（显式 override）：
   * - true：使用默认 DevtoolsRuntimeOptions；
   * - DevtoolsRuntimeOptions：可定制 Hub bufferSize / DebugObserver filter 等。
   */
  readonly devtools?: true | DevtoolsRuntimeOptions
  /**
   * Runtime 级 StateTransaction 默认配置：
   * - instrumentation 未提供时，各 ModuleRuntime 退回到基于 NODE_ENV 的默认值；
   * - instrumentation 提供时，作为整颗 Runtime 下模块的默认观测级别，
   *   具体模块仍可通过 Module.implement(stateTransaction) 覆写。
   */
  readonly stateTransaction?: RuntimeStateTransactionOptions
}

export interface DevtoolsRuntimeOptions {
  /** Hub ring buffer 容量（条数），默认 500。 */
  readonly bufferSize?: number
  /** DebugObserver 配置（用于 trace:effectop）；undefined 表示默认全量观测。 */
  readonly observer?: Middleware.DebugObserverConfig | false
  /** 预留：React 渲染采样/限频配置，后续由 @logix/react 读取。 */
  readonly sampling?: {
    readonly reactRenderSampleRate?: number
  }
}

/**
 * Runtime.make
 *
 * 在给定 Root ModuleImpl 的前提下，构造一颗应用级 Runtime：
 *
 * - 使用 RootImpl.module + RootImpl.layer 作为唯一的全局模块；
 * - 将 RootImpl.processes 作为长期进程在 Runtime Scope 内统一 fork；
 * - 复用现有 AppRuntime 实现作为底层容器，对外仅暴露 ManagedRuntime。
 *
 * 说明：
 * - 类型层面使用宽泛的 any/never，以避免在此处引入复杂的 Env 推导；
 * - 业务代码只需要保证 RootImpl.layer 与 options.layer 一起能构造完整 Env。
 */
export const make = (
  rootImpl: ModuleImpl<any, AnyModuleShape, any>,
  options?: RuntimeOptions,
): ManagedRuntime.ManagedRuntime<any, never> => {
  // 基础 Env：完全由调用方提供的 Layer 决定（如 Config / 平台服务 / DebugLayer 等），
  // 若需要启用默认 Debug 能力，推荐显式使用 Logix.Debug.withDefaultLayer(...) 进行组合。
  const userLayer = (options?.layer ?? Layer.empty) as Layer.Layer<
    any,
    never,
    never
  >

  let middlewareStack: EffectOp.MiddlewareStack = options?.middleware ?? []

  // 若显式启用 devtools，则自动：
  // 1) 追加 DebugObserver（trace:effectop）；
  // 2) 在 appLayer 中挂入 DevtoolsHub Sink（进程级事件聚合）。
  const devtoolsOptions: DevtoolsRuntimeOptions | undefined =
    options?.devtools === true
      ? {}
      : options?.devtools

  if (options?.devtools) {
    const observerConfig =
      devtoolsOptions?.observer === false ? false : devtoolsOptions?.observer
    middlewareStack = Middleware.withDebug(middlewareStack, {
      logger: false,
      observer: observerConfig,
    })
  }

  // 可选：为当前 Runtime 注入 EffectOp MiddlewareStack Service，
  // 供 StateTrait.install 等运行时代码从 Env 中解析统一的 EffectOp 总线配置。
  const effectOpLayer: Layer.Layer<any, never, never> =
    middlewareStack.length > 0
      ? (Layer.succeed(EffectOpCore.EffectOpMiddlewareTag, {
          stack: middlewareStack,
        }) as Layer.Layer<any, never, never>)
      : (Layer.empty as Layer.Layer<any, never, never>)

  const baseLayer =
    options?.label != null
      ? (Layer.mergeAll(
          Debug.runtimeLabel(options.label),
          userLayer,
        ) as Layer.Layer<any, never, never>)
      : userLayer

  const baseWithDevtools =
    options?.devtools
      ? (Debug.devtoolsHubLayer(baseLayer, {
          bufferSize: devtoolsOptions?.bufferSize,
        }) as Layer.Layer<any, never, never>)
      : baseLayer

  const appLayer = Layer.mergeAll(
    baseWithDevtools,
    effectOpLayer,
  ) as Layer.Layer<any, never, never>

  const appConfig: AppRuntimeImpl.LogixAppConfig<any> = {
    layer: appLayer,
    modules: [AppRuntimeImpl.provide(rootImpl.module, rootImpl.layer as Layer.Layer<any, any, any>)],
    processes: rootImpl.processes ?? [],
    onError: options?.onError,
    stateTransaction: options?.stateTransaction,
  }

  const app = AppRuntimeImpl.makeApp(appConfig)
  return app.makeRuntime() as ManagedRuntime.ManagedRuntime<any, never>
}

/**
 * applyTransactionSnapshot：
 * - Devtools ↔ Runtime 契约的一部分，用于在 dev/test 环境下按事务回放某个模块实例的状态；
 * - moduleId / instanceId 对应 Debug 事件中的 moduleId / runtimeId；
 * - mode = "before" 回放到事务开始前的状态，"after" 回放到事务提交后的状态。
 *
 * 说明：
 * - 实际回放逻辑由 ModuleRuntime 内部的 dev-only API 承担；
 * - 若找不到对应 Runtime 或当前实例未启用时间旅行能力，则为 no-op。
 */
export const applyTransactionSnapshot = (
  moduleId: string,
  instanceId: string,
  txnId: string,
  mode: "before" | "after",
): Effect.Effect<void, never, any> =>
  Effect.gen(function* () {
    const runtime =
      ModuleRuntime.getRuntimeByModuleAndInstance<any, any>(
        moduleId,
        instanceId,
      )

    if (!runtime) {
      return
    }

    const applySnapshot =
      (runtime as any).__applyTransactionSnapshot as
        | ((
          id: string,
          mode: "before" | "after",
        ) => Effect.Effect<void, never, any>)
        | undefined

    if (!applySnapshot) {
      return
    }

    yield* applySnapshot(txnId, mode)
  })
