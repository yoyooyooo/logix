import { Effect, Layer, ManagedRuntime } from "effect"
import type { AnyModuleShape, ModuleImpl } from "../api/Logix.js"
import * as AppRuntimeImpl from "./AppRuntime.js"

/**
 * LogixRuntime 配置：
 * - layer：额外的顶层 Env（如 Config / 平台服务），会与 Root ModuleImpl.layer 合并；
 * - onError：App 级错误处理入口，用于在 Runtime 级统一上报未捕获错误。
 */
export interface RuntimeOptions {
  readonly layer?: Layer.Layer<any, never, never>
  readonly onError?: (
    cause: import("effect").Cause.Cause<unknown>
  ) => Effect.Effect<void>
}

/**
 * LogixRuntime.make
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
  options?: RuntimeOptions
): ManagedRuntime.ManagedRuntime<any, never> => {
  const appConfig: AppRuntimeImpl.LogixAppConfig<any> = {
    layer: (options?.layer ?? Layer.empty) as Layer.Layer<any, never, never>,
    modules: [
      AppRuntimeImpl.provide(
        rootImpl.module,
        rootImpl.layer as Layer.Layer<any, any, any>
      )
    ],
    processes: rootImpl.processes ?? [],
    onError: options?.onError
  }

  const app = AppRuntimeImpl.makeApp(appConfig)
  return app.makeRuntime() as ManagedRuntime.ManagedRuntime<any, never>
}
