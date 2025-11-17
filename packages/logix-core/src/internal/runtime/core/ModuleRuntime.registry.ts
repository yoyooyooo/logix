import { Context } from 'effect'
import type { ModuleRuntime as PublicModuleRuntime } from './module.js'

/**
 * Process-level runtime registry (debug-only / non-authoritative):
 * - key: Module Tag (the ModuleTag itself).
 * - value: the corresponding ModuleRuntime instance.
 *
 * Constraints:
 * - This is a "single-slot table": one Tag can only map to one runtime; it cannot represent correct multi-instance/multi-root semantics.
 * - Must not be used as a resolution fallback (in strict mode, missing providers must fail).
 * - Devtools/internal debugging only; migrate to explicit handles/Link when feasible.
 */
const runtimeRegistry = new WeakMap<Context.Tag<any, PublicModuleRuntime<any, any>>, PublicModuleRuntime<any, any>>()

/**
 * Runtime registry indexed by moduleId + instanceId:
 * - Primarily used by Devtools / internal debugging to locate ModuleRuntime by instance.
 * - key format: `${moduleId}::${instanceId}`.
 * - The primary anchor is instanceId (do not use dual anchors).
 */
const runtimeByInstanceKey = new Map<string, PublicModuleRuntime<any, any>>()

export const registerRuntime = <S, A>(
  tag: Context.Tag<any, PublicModuleRuntime<S, A>>,
  runtime: PublicModuleRuntime<S, A>,
): void => {
  runtimeRegistry.set(tag as Context.Tag<any, PublicModuleRuntime<any, any>>, runtime as PublicModuleRuntime<any, any>)
}

export const unregisterRuntime = (tag: Context.Tag<any, PublicModuleRuntime<any, any>>): void => {
  runtimeRegistry.delete(tag)
}

export const getRegisteredRuntime = <S, A>(
  tag: Context.Tag<any, PublicModuleRuntime<S, A>>,
): PublicModuleRuntime<S, A> | undefined =>
  runtimeRegistry.get(tag as Context.Tag<any, PublicModuleRuntime<any, any>>) as PublicModuleRuntime<S, A> | undefined

export const getRuntimeByModuleAndInstance = <S, A>(
  moduleId: string,
  instanceId: string,
): PublicModuleRuntime<S, A> | undefined =>
  runtimeByInstanceKey.get(`${moduleId}::${instanceId}`) as PublicModuleRuntime<S, A> | undefined

export const registerRuntimeByInstanceKey = (instanceKey: string, runtime: PublicModuleRuntime<any, any>): void => {
  runtimeByInstanceKey.set(instanceKey, runtime)
}

export const unregisterRuntimeByInstanceKey = (instanceKey: string): void => {
  runtimeByInstanceKey.delete(instanceKey)
}
