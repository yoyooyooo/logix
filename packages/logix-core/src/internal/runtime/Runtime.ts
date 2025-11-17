import { Effect, Layer, ManagedRuntime } from 'effect'
import type { AnyModuleShape, ModuleImpl } from './core/module.js'
import * as AppRuntimeImpl from './AppRuntime.js'

/**
 * Runtime options:
 * - layer: extra top-level Env (e.g. Config / platform services) merged with Root ModuleImpl.layer.
 * - onError: app-level error handler entrypoint used to report uncaught errors at the Runtime level.
 */
export interface RuntimeOptions {
  readonly layer?: Layer.Layer<any, never, never>
  readonly onError?: (cause: import('effect').Cause.Cause<unknown>) => Effect.Effect<void>
}

/**
 * Runtime.make
 *
 * Build an application-level Runtime given a root ModuleImpl:
 *
 * - Use RootImpl.module + RootImpl.layer as the single global module.
 * - Fork RootImpl.processes as long-lived processes within the Runtime scope.
 * - Reuse the existing AppRuntime implementation as the underlying container and expose only ManagedRuntime.
 *
 * Notes:
 * - Uses broad any/never at the type level to avoid complex Env inference here.
 * - Business code only needs to ensure RootImpl.layer and options.layer together can provide the full Env.
 */
export const make = (
  rootImpl: ModuleImpl<any, AnyModuleShape, any>,
  options?: RuntimeOptions,
): ManagedRuntime.ManagedRuntime<any, never> => {
  const appConfig: AppRuntimeImpl.LogixAppConfig<any> = {
    layer: (options?.layer ?? Layer.empty) as Layer.Layer<any, never, never>,
    modules: [AppRuntimeImpl.provide(rootImpl.module, rootImpl.layer as Layer.Layer<any, any, any>)],
    processes: rootImpl.processes ?? [],
    onError: options?.onError,
  }

  const app = AppRuntimeImpl.makeApp(appConfig)
  return app.makeRuntime() as ManagedRuntime.ManagedRuntime<any, never>
}
