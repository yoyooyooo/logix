import { Effect, Layer, ManagedRuntime } from "effect"
import type { AnyModuleShape, ModuleImpl } from "./internal/module.js"
import * as AppRuntimeImpl from "./internal/runtime/AppRuntime.js"
import * as Debug from "./Debug.js"
import type * as EffectOp from "./effectop.js"
import * as EffectOpCore from "./internal/runtime/EffectOpCore.js"

/**
 * Runtime 配置：
 * - layer：额外的顶层 Env（如 Config / 平台服务），会与 Root ModuleImpl.layer 合并；
 * - onError：App 级错误处理入口，用于在 Runtime 级统一上报未捕获错误。
 */
export interface RuntimeOptions {
  readonly layer?: Layer.Layer<any, never, never>
  readonly onError?: (cause: import('effect').Cause.Cause<unknown>) => Effect.Effect<void>
  /**
   * 可选：为当前 ManagedRuntime 指定一个逻辑标识（例如 "AppDemoRuntime"），
   * 用于 Debug / DevTools 分组展示。
   */
  readonly label?: string
  readonly middleware?: EffectOp.MiddlewareStack
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

  const middlewareStack: EffectOp.MiddlewareStack = options?.middleware ?? []

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

  const appLayer = Layer.mergeAll(
    baseLayer,
    effectOpLayer,
  ) as Layer.Layer<any, never, never>

  const appConfig: AppRuntimeImpl.LogixAppConfig<any> = {
    layer: appLayer,
    modules: [AppRuntimeImpl.provide(rootImpl.module, rootImpl.layer as Layer.Layer<any, any, any>)],
    processes: rootImpl.processes ?? [],
    onError: options?.onError,
  }

  const app = AppRuntimeImpl.makeApp(appConfig)
  return app.makeRuntime() as ManagedRuntime.ManagedRuntime<any, never>
}
