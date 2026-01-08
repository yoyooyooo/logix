import { Context, Effect } from 'effect'
import type * as Logix from './internal/module.js'
import * as Internal from './internal/LogicMiddleware.js'
import * as PlatformInternal from './internal/platform/Platform.js'

export * from './internal/LogicMiddleware.js'

// Logic: a long-running Effect program scoped to a module shape.

/**
 * Core Tag for retrieving the current ModuleRuntime within a Logic scope.
 */
export const RuntimeTag: Context.Tag<any, Logix.ModuleRuntime<any, any>> = Context.GenericTag<
  any,
  Logix.ModuleRuntime<any, any>
>('@logixjs/Runtime')

// Public Platform alias (equivalent to internal/platform/Platform.Service).
export type Platform = PlatformInternal.Service

// Logic Env / Of aliases: point to internal versions to avoid multiple definitions.
export type Env<Sh extends Logix.AnyModuleShape, R> = Internal.Env<Sh, R>

export type Of<Sh extends Logix.AnyModuleShape, R = never, A = void, E = never> = Internal.Of<Sh, R, A, E>

export function of<Sh extends Logix.AnyModuleShape, R = never, A = void, E = never>(
  eff: Effect.Effect<A, E, Env<Sh, R>>,
): Of<Sh, R, A, E> {
  return eff as Of<Sh, R, A, E>
}

// DSL type aliases: reuse internal definitions directly.
export type Draft<T> = Internal.Draft<T>
export type IntentBuilder<Payload, Sh extends Logix.AnyModuleShape, R = never> = Internal.IntentBuilder<Payload, Sh, R>
export type FluentMatch<V> = Internal.FluentMatch<V>
export type FluentMatchTag<V extends { _tag: string }> = Internal.FluentMatchTag<V>

// Remaining implementation details (IntentBuilder factories, etc.) are composed in internal/runtime.
// Application code should use this module via Module.logic and Bound API, without depending on internal construction.
