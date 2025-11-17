import { Context, Effect, Schema, Stream, SubscriptionRef } from 'effect'
import type * as Logix from './internal/module.js'
import type * as Flow from './Flow.js'
import * as Logic from './Logic.js'
import * as BoundApiRuntime from './internal/runtime/BoundApiRuntime.js'

// ---------------------------------------------------------------------------
// BoundApi: pre-bound accessors for a module shape + environment.
// ---------------------------------------------------------------------------

/**
 * Action API: fixed methods + a dynamic action dispatcher.
 */
type ActionArgs<P> = [P] extends [void] ? [] | [P] : [P]
type ActionFn<P, Out> = (...args: ActionArgs<P>) => Out

export type ActionsApi<Sh extends Logix.AnyModuleShape, R> = {
  readonly dispatch: (action: Logix.ActionOf<Sh>) => Logic.Of<Sh, R, void, never>
  readonly actions$: Stream.Stream<Logix.ActionOf<Sh>>
} & {
  readonly [K in keyof Sh['actionMap']]: ActionFn<Schema.Schema.Type<Sh['actionMap'][K]>, Logic.Of<Sh, R, void, never>>
}

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

export interface BoundApiPublic<Sh extends Logix.AnyModuleShape, R = never> {
  readonly root: {
    readonly resolve: <Svc, Id = unknown>(tag: Context.Tag<Id, Svc>) => Logic.Of<Sh, R, Svc, never>
  }
  readonly state: {
    readonly read: Logic.Of<Sh, R, Logix.StateOf<Sh>, never>
    readonly update: (f: (prev: Logix.StateOf<Sh>) => Logix.StateOf<Sh>) => Logic.Of<Sh, R, void, never>
    readonly mutate: (f: (draft: Logic.Draft<Logix.StateOf<Sh>>) => void) => Logic.Of<Sh, R, void, never>
    readonly ref: {
      <V = Logix.StateOf<Sh>>(selector?: (s: Logix.StateOf<Sh>) => V): SubscriptionRef.SubscriptionRef<V>
    }
  }
  readonly actions: ActionsApi<Sh, R>
  readonly flow: Flow.Api<Sh, R>
  readonly match: <V>(value: V) => Logic.FluentMatch<V>
  readonly matchTag: <V extends { _tag: string }>(value: V) => Logic.FluentMatchTag<V>
  /**
   * Lifecycle hooks: a replacement for `StoreConfig.lifecycle`, defining init/destroy logic in Logic.
   *
   * Constraint: must handle all errors (`E = never`).
   */
  readonly lifecycle: {
    readonly onInit: (eff: Logic.Of<Sh, R, void, never>) => Logic.Of<Sh, R, void, never>
    readonly onDestroy: (eff: Logic.Of<Sh, R, void, never>) => Logic.Of<Sh, R, void, never>
    /**
     * Error reporting hook: fires when a Logic fiber dies with an uncaught defect.
     *
     * Reporting only; it cannot prevent Scope shutdown.
     */
    readonly onError: (
      handler: (
        cause: import('effect').Cause.Cause<unknown>,
        context: import('./internal/runtime/Lifecycle.js').ErrorContext,
      ) => Effect.Effect<void, never, R>,
    ) => Logic.Of<Sh, R, void, never>

    // --- Platform Hooks (Proxied to Platform Service) ---

    /**
     * Suspend: fires when the app/component goes to background or becomes non-visible.
     * (Requires Platform Layer)
     */
    readonly onSuspend: (eff: Logic.Of<Sh, R, void, never>) => Logic.Of<Sh, R, void, never>

    /**
     * Resume: fires when the app/component returns to foreground or becomes visible.
     * (Requires Platform Layer)
     */
    readonly onResume: (eff: Logic.Of<Sh, R, void, never>) => Logic.Of<Sh, R, void, never>

    /**
     * Business reset: a standardized "soft reset" signal (e.g. logout / clear form).
     * (Requires Platform Layer or Runtime Support)
     */
    readonly onReset: (eff: Logic.Of<Sh, R, void, never>) => Logic.Of<Sh, R, void, never>
  }
  /**
   * Unified dependency injection entry:
   * - Pass a module definition: returns a `Logix.ModuleHandle` for cross-module access.
   * - Pass a service Tag: returns the service instance.
   *
   * Note: in production we recommend treating module definitions as the primary input, and other Tags as services.
   * This PoC still models both via Tag/Module placeholders; callers should prefer passing a module.
   */
  readonly use: {
    <M extends Logix.ModuleLike<string, Logix.AnyModuleShape, any>>(
      module: M,
    ): Logic.Of<
      Sh,
      R,
      Logix.ModuleHandle<M extends Logix.ModuleLike<any, infer Sh2, any> ? Sh2 : never> &
        (M extends Logix.ModuleLike<any, any, infer Ext> ? Ext : never),
      never
    >
    <Sh2 extends Logix.AnyModuleShape>(
      module: Logix.ModuleTag<string, Sh2>,
    ): Logic.Of<Sh, R, Logix.ModuleHandle<Sh2>, never>
    <Svc, Id = unknown>(tag: Context.Tag<Id, Svc>): Logic.Of<Sh, R, Svc, never>
  }

  /**
   * Action subscription entry: supports predicates, `_tag` / `type` literals, concrete values, or a Schema as a
   * value selector to narrow variants.
   *
   * @example
   *   $.onAction('inc')
   *   $.onAction(Actions.inc)
   *   $.onAction(CounterAction.IncSchema)
   */
  readonly onAction: {
    // 1) Backward-compatible: type-guard predicate
    <T extends Logix.ActionOf<Sh>>(predicate: (a: Logix.ActionOf<Sh>) => a is T): Logic.IntentBuilder<T, Sh, R>

    // 2) Match a variant by `_tag` / `type` literal
    <K extends Logix.ActionOf<Sh> extends { _tag: string } ? Logix.ActionOf<Sh>['_tag'] : never>(
      tag: K,
    ): Logic.IntentBuilder<Extract<Logix.ActionOf<Sh>, { _tag: K } | { type: K }>, Sh, R>

    // 3) Narrow by a concrete action value (e.g. Actions.inc)
    <A extends Logix.ActionOf<Sh> & ({ _tag: string } | { type: string })>(value: A): Logic.IntentBuilder<A, Sh, R>

    // 4) Narrow by a Schema (single-variant schema)
    <Sc extends Logix.AnySchema>(
      schema: Sc,
    ): Logic.IntentBuilder<Extract<Logix.ActionOf<Sh>, Schema.Schema.Type<Sc>>, Sh, R>
  } & {
    [K in keyof Sh['actionMap']]: Logic.IntentBuilder<Extract<Logix.ActionOf<Sh>, { _tag: K } | { type: K }>, Sh, R>
  }

  readonly onState: <V>(selector: (s: Logix.StateOf<Sh>) => V) => Logic.IntentBuilder<V, Sh, R>

  /**
   * Primary reducer registration entry.
   *
   * - Semantics: registers a synchronous, pure state transition reducer for an action tag.
   * - Implementation: writes into the runtime `_tag -> (state, action) => state` map, not watchers / Flow.
   *
   * Constraints:
   * - At most one primary reducer per action tag; duplicate registration is an error.
   * - Reducers must be pure: no Env access, no Effects.
   */
  readonly reducer: <K extends keyof Sh['actionMap'], A extends Extract<Logix.ActionOf<Sh>, { _tag: K } | { type: K }>>(
    tag: K,
    reducer: (state: Logix.StateOf<Sh>, action: A) => Logix.StateOf<Sh>,
  ) => Logic.Of<Sh, R, void, never>

  readonly on: <V>(source: Stream.Stream<V>) => Logic.IntentBuilder<V, Sh, R>
  /**
   * traits: runtime hooks reserved for StateTrait and similar features.
   *
   * - `declare(traits)`: declare and contribute traits during setup (023, setup-only).
   * - `source.refresh(fieldPath)`: trigger an explicit refresh for a source field.
   * - Concrete behavior is mounted by StateTrait.install at runtime.
   */
  readonly traits: {
    /**
     * declare (023):
     * - setup-only: may only be called during Logic setup.
     * - synchronous: registers trait contributions and does not return an Effect.
     */
    readonly declare: (traits: object) => void
    readonly source: {
      readonly refresh: (
        fieldPath: string,
        options?: {
          /**
           * Force refresh: re-fetch even if keyHash is unchanged and a non-idle snapshot already exists.
           *
           * - Useful for explicit refresh / invalidate ("same key, but refresh anyway").
           * - Auto-trigger chains should keep the default (false/undefined) to avoid redundant IO and no-op writebacks.
           */
          readonly force?: boolean
        },
      ) => Logic.Of<Sh, R, void, never>
    }
  }
}

export function make<Sh extends Logix.AnyModuleShape, R = never>(
  shape: Sh,
  runtime: Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>,
): BoundApiPublic<Sh, R> {
  return BoundApiRuntime.make(shape, runtime) as BoundApiPublic<Sh, R>
}
