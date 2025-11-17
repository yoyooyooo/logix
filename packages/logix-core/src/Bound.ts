import type * as Logix from './internal/module.js'
import * as BoundApiRuntime from './internal/runtime/BoundApiRuntime.js'

// ---------------------------------------------------------------------------
// BoundApi: pre-bound accessors for a module shape + environment.
// ---------------------------------------------------------------------------

/**
 * Bound API factory: creates pre-bound accessors for a module shape + environment.
 *
 * - By default, resolves the current Logix.ModuleRuntime from `Logic.RuntimeTag`.
 * - Optionally accepts a `Logix.ModuleTag<Sh>` to explicitly choose the runtime (e.g. cross-module collaboration).
 *
 * Note: this is a type-only surface; the concrete implementation is injected by the runtime.
 * In this PoC, the runtime provides a placeholder value at compile-time boundaries.
 */
export type BoundApi<Sh extends Logix.AnyModuleShape, R = never> = Logix.BoundApi<Sh, R>
export type BoundApiPublic<Sh extends Logix.AnyModuleShape, R = never> = Logix.BoundApi<Sh, R>

export function make<Sh extends Logix.AnyModuleShape, R = never>(
  shape: Sh,
  runtime: Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>,
): BoundApiPublic<Sh, R> {
  return BoundApiRuntime.make(shape, runtime) as BoundApiPublic<Sh, R>
}
