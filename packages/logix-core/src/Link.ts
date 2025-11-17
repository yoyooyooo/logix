import type { Effect } from 'effect'
import * as Process from './Process.js'
import type { AnyModuleShape, ModuleLike, ModuleHandle, ModuleTag } from './internal/module.js'

type LinkModuleToken<Id extends string, Sh extends AnyModuleShape> = ModuleTag<Id, Sh> | ModuleLike<Id, Sh, object>

type LinkModuleIdOf<M> = M extends { readonly id: infer Id } ? Id : never
type LinkModuleShapeOf<M> =
  M extends ModuleLike<string, infer Sh, object> ? Sh : M extends ModuleTag<string, infer Sh> ? Sh : never

/**
 * Link.make config:
 * - modules: modules participating in this Link.
 *   - Keys come from module ids (e.g. the `"User"` in `Logix.Module.make("User", ...)`).
 */
export interface LinkConfig<Ms extends readonly LinkModuleToken<string, AnyModuleShape>[]> {
  /**
   * Link identifier.
   * - Optional; defaults to a stable string derived from participating `modules.id`.
   * - Intended for Universe / DevTools display and navigation.
   */
  readonly id?: string
  readonly modules: Ms
}

/**
 * Handle view exposed to Link logic, derived from the module list:
 * - key: module id.
 * - value: read-only handle of that module.
 */
export type LinkHandles<Ms extends readonly LinkModuleToken<string, AnyModuleShape>[]> = {
  [M in Ms[number] as LinkModuleIdOf<M>]: ModuleHandle<LinkModuleShapeOf<M>>
}

/**
 * Link.make:
 * - Creates a Link (cross-module glue logic) from a module list and a logic program.
 * - Returns a "cold" Effect, typically attached via `ModuleImpl.implement({ processes/links })` and forked by the runtime.
 */
export function make<Ms extends readonly LinkModuleToken<string, AnyModuleShape>[], E = never, R = never>(
  config: LinkConfig<Ms>,
  logic: ($: LinkHandles<Ms>) => Effect.Effect<void, E, R>,
): Effect.Effect<void, E, R> {
  // Link.make is an alias; it delegates to Process.link (unifying the static surface and runtime recognition).
  return Process.link(config as any, logic as any) as Effect.Effect<void, E, R>
}
