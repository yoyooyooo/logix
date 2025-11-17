import { Context, Effect, Layer, Schema, Stream, SubscriptionRef } from 'effect'
import type * as Logic from './LogicMiddleware.js'
import type { StateTransactionInstrumentation, TxnLanesPatch } from './env.js'
import type { FieldPath } from '../../field-path.js'
import type * as ModuleTraits from './ModuleTraits.js'
import type { ReadQueryInput } from './ReadQuery.js'

/**
 * Convenience constraint: any Effect Schema.
 * We intentionally use `any` to bypass Schema invariance constraints, so that
 * ModuleShape<SpecificSchema> can extend AnyModuleShape.
 */
export type AnySchema = any

/**
 * The "schema shape" of a Module: only cares about stateSchema / actionSchema,
 * not runtime configuration details (initialState / services / logic, etc.).
 */
export interface ModuleShape<
  SSchema extends AnySchema,
  ASchema extends AnySchema,
  AMap extends Record<string, AnySchema> = Record<string, never>,
> {
  readonly stateSchema: SSchema
  readonly actionSchema: ASchema
  readonly actionMap: AMap
}

/**
 * Convenience constraint: any ModuleShape.
 */
export type AnyModuleShape = ModuleShape<any, any, any>

export type StateOf<Sh extends AnyModuleShape> = Schema.Schema.Type<Sh['stateSchema']>

export type ActionOf<Sh extends AnyModuleShape> = Schema.Schema.Type<Sh['actionSchema']>

type ActionArgs<P> = [P] extends [void] ? [] | [P] : [P]
type ActionFn<P, Out> = (...args: ActionArgs<P>) => Out

export interface ModuleImplementStateTransactionOptions {
  readonly instrumentation?: StateTransactionInstrumentation
  /** 060: Txn Lanes (instance-level opt-in / tuning). */
  readonly txnLanes?: TxnLanesPatch
}

export type StateCommitMode = 'normal' | 'batch' | 'lowPriority'
export type StateCommitPriority = 'normal' | 'low'

export interface StateCommitMeta {
  readonly txnSeq: number
  readonly txnId: string
  readonly commitMode: StateCommitMode
  readonly priority: StateCommitPriority
  readonly originKind?: string
  readonly originName?: string
}

export interface StateChangeWithMeta<V> {
  readonly value: V
  readonly meta: StateCommitMeta
}

/**
 * The runtime interface of a Module (similar to "Store as Context" in docs),
 * exposing read/write, subscription, and dispatch capabilities to Logic / Flow.
 */
export interface ModuleRuntime<S, A> {
  /**
   * Associated module identifier:
   * - Injected by ModuleRuntime.make from options.moduleId at construction time.
   * - Primarily used by Devtools / debugging to align runtime instances with module-level information.
   */
  readonly moduleId: string
  /**
   * Stable instance anchor (single source of truth), aligned with 009/011/016.
   *
   * - Must be injectable/derivable; never default to randomness/time.
   * - Do not expose a "second anchor" field to avoid multiple sources of truth.
   */
  readonly instanceId: string
  /**
   * Lifecycle status (serializable and consumable by Devtools/Sandbox).
   * - initProgress is updated during initRequired.
   * - initOutcome.failure is populated when initialization fails.
   */
  readonly lifecycleStatus?: Effect.Effect<import('./Lifecycle.js').LifecycleStatus>
  // ----- State -----
  readonly getState: Effect.Effect<S>
  readonly setState: (next: S) => Effect.Effect<void>

  // ----- Actions -----
  readonly dispatch: (action: A) => Effect.Effect<void>
  readonly dispatchBatch: (actions: ReadonlyArray<A>) => Effect.Effect<void>
  readonly dispatchLowPriority: (action: A) => Effect.Effect<void>
  readonly actions$: Stream.Stream<A>
  readonly actionsWithMeta$: Stream.Stream<StateChangeWithMeta<A>>

  // ----- Derived sources / utilities -----
  /**
   * Subscribe to changes of a selector.
   * Note: an implementation may be based on state$ + distinctUntilChanged.
   */
  readonly changes: <V>(selector: (s: S) => V) => Stream.Stream<V>

  /**
   * Subscribe to changes of a selector, including commit meta of the current commit (commitMode/priority, etc.).
   */
  readonly changesWithMeta: <V>(selector: (s: S) => V) => Stream.Stream<StateChangeWithMeta<V>>

  /**
   * Subscribe to ReadQuery (SelectorSpec) changes, including commit meta of the current commit.
   *
   * - static lane: driven by SelectorGraph (precise recompute + cache + precise notifications)
   * - dynamic lane: may fall back to per-commit recompute (legacy)
   */
  readonly changesReadQueryWithMeta: <V>(readQuery: ReadQueryInput<S, V>) => Stream.Stream<StateChangeWithMeta<V>>

  /**
   * Provide a SubscriptionRef for long-running / fine-grained logic to borrow state directly.
   * The current implementation only exposes a ref for the whole state; selector views are up to the caller to wrap.
   */
  readonly ref: {
    <V = S>(selector?: (s: S) => V): SubscriptionRef.SubscriptionRef<V>
  }
}

/**
 * v3: strongly-typed Module Tag for type-safe constraints in Logic.forShape / collaborative logic.
 *
 * Notes:
 * - The Id type is not important for this PoC, so we use `any`.
 * - The Service type is fixed to the Runtime for the current Shape.
 */
export type ModuleRuntimeTag<Sh extends AnyModuleShape> = Context.Tag<any, ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>>

/**
 * Module handle union:
 * - Used by the React adapter / higher-level integrations to accept either a tag or a runtime instance.
 * - As Env/DI: typically put ModuleTag<Sh> into Layer / Runtime environment.
 * - As local ownership: typically pass a runtime instance directly in a component or a logic program.
 *
 * Higher-level APIs may accept ModuleHandle<Sh> and branch internally on tag vs instance.
 */
export type ModuleHandleUnion<Sh extends AnyModuleShape> =
  | ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>
  | ModuleRuntimeTag<Sh>

/**
 * v3: a read-only handle view exposed to Logic for cross-module access.
 *
 * - read: read a snapshot value via selector.
 * - changes: subscribe to changes of the selector view.
 * - dispatch: dispatch an Action to the module.
 *
 * The runtime may wrap an implementation based on ModuleRuntime, but the type does not expose any direct State write API.
 */
export interface ModuleHandle<Sh extends AnyModuleShape> {
  readonly read: <V>(selector: (s: StateOf<Sh>) => V) => Effect.Effect<V, never, never>
  readonly changes: <V>(selector: (s: StateOf<Sh>) => V) => Stream.Stream<V, never, never>
  readonly dispatch: (action: ActionOf<Sh>) => Effect.Effect<void, never, never>
  readonly actions: {
    [K in keyof Sh['actionMap']]: ActionFn<Schema.Schema.Type<Sh['actionMap'][K]>, Effect.Effect<void, never, never>>
  }
  readonly actions$: Stream.Stream<ActionOf<Sh>, never, never>
}

/**
 * ModuleLogic: a logic program that runs on a specific class of Module.
 *
 * - Convention: Env is Logic.Env<Sh, R>.
 * - The return value is treated as void; errors and dependencies are expressed via E/R.
 */
export type ModuleLogic<Sh extends AnyModuleShape, R = unknown, E = unknown> =
  | Logic.Of<Sh, R, unknown, E>
  | LogicPlan<Sh, R, E>

export declare const MODULE_EXT: unique symbol

/**
 * ModuleLike: the minimal runtime/type contract for a Module (definition object / wrapped module),
 * used by $.use(module).
 *
 * - Must be an explicit contract; no duck-typing / magic fields.
 * - `tag` is the identity anchor (ModuleTag/Context.Tag) used for Env resolution.
 * - Other reflection fields (schemas/meta/services/dev.source) are not strictly constrained here.
 */
export interface ModuleLike<Id extends string, Sh extends AnyModuleShape, Ext extends object = {}> {
  readonly _kind: 'ModuleDef' | 'Module'
  readonly id: Id
  readonly tag: ModuleTag<Id, Sh>
  /**
   * Type-only extension carrier for `$.use(module)` return typing.
   * - Must not be required at runtime (optional + unique symbol).
   * - Enables extracting `Ext` even though ModuleLike is otherwise structural.
   */
  readonly [MODULE_EXT]?: Ext
}

type ModuleShapeOf<M> = M extends ModuleLike<any, infer Sh, any> ? Sh : never
type ModuleExtOf<M> = M extends ModuleLike<any, any, infer Ext> ? Ext : never

/**
 * LogicPlan: an internal two-phase logic abstraction (setup + run).
 *
 * - setup: runs during Module instance startup, used to register reducers / lifecycle / Debug and other structural behavior.
 * - run: the main logic program, running as a long-lived fiber after Env is fully ready.
 *
 * Notes:
 * - In the current implementation, Runtime still treats Logic as a single-phase program, equivalent to
 *   `setup = Effect.void` and `run = Logic`.
 * - After the runtime-logix L4 drafts converge, we will gradually adopt a real two-phase execution model.
 */
export interface LogicPlan<Sh extends AnyModuleShape, R = unknown, E = unknown> {
  readonly setup: Logic.Of<Sh, R, void, never>
  readonly run: Logic.Of<Sh, R, unknown, E>
}

/**
 * Bound API: creates pre-bound accessors for a given Store shape + Env.
 *
 * - The runtime implementation lives in internal/runtime/BoundApiRuntime.
 * - The public Bound.ts exports a same-named type alias to keep the public API consistent.
 */
export interface BoundApi<Sh extends AnyModuleShape, R = never> {
  readonly root: {
    readonly resolve: <Svc, Id = unknown>(tag: Context.Tag<Id, Svc>) => Logic.Of<Sh, R, Svc, never>
  }
  readonly state: {
    readonly read: Logic.Of<Sh, R, StateOf<Sh>, never>
    readonly update: (f: (prev: StateOf<Sh>) => StateOf<Sh>) => Logic.Of<Sh, R, void, never>
    readonly mutate: (f: (draft: Logic.Draft<StateOf<Sh>>) => void) => Logic.Of<Sh, R, void, never>
    readonly ref: {
      <V = StateOf<Sh>>(selector?: (s: StateOf<Sh>) => V): SubscriptionRef.SubscriptionRef<V>
    }
  }
  readonly actions: {
    readonly dispatch: (action: ActionOf<Sh>) => Logic.Of<Sh, R, void, never>
    readonly actions$: Stream.Stream<ActionOf<Sh>>
  } & {
    readonly [K in keyof Sh['actionMap']]: ActionFn<
      Schema.Schema.Type<Sh['actionMap'][K]>,
      Logic.Of<Sh, R, void, never>
    >
  }
  readonly flow: import('./FlowRuntime.js').Api<Sh, R>
  readonly match: <V>(value: V) => Logic.FluentMatch<V>
  readonly matchTag: <V extends { _tag: string }>(value: V) => Logic.FluentMatchTag<V>
  readonly lifecycle: {
    readonly onInitRequired: (eff: Logic.Of<Sh, R, void, never>) => Logic.Of<Sh, R, void, never>
    readonly onStart: (eff: Logic.Of<Sh, R, void, never>) => Logic.Of<Sh, R, void, never>
    readonly onInit: (eff: Logic.Of<Sh, R, void, never>) => Logic.Of<Sh, R, void, never>
    readonly onDestroy: (eff: Logic.Of<Sh, R, void, never>) => Logic.Of<Sh, R, void, never>
    readonly onError: (
      handler: (
        cause: import('effect').Cause.Cause<unknown>,
        context: import('./Lifecycle.js').ErrorContext,
      ) => Effect.Effect<void, never, R>,
    ) => Logic.Of<Sh, R, void, never>
    readonly onSuspend: (eff: Logic.Of<Sh, R, void, never>) => Logic.Of<Sh, R, void, never>
    readonly onResume: (eff: Logic.Of<Sh, R, void, never>) => Logic.Of<Sh, R, void, never>
    readonly onReset: (eff: Logic.Of<Sh, R, void, never>) => Logic.Of<Sh, R, void, never>
  }
  readonly use: {
    <M extends ModuleLike<string, AnyModuleShape, any>>(
      module: M,
    ): Logic.Of<Sh, R, ModuleHandle<ModuleShapeOf<M>> & ModuleExtOf<M>, never>
    <Sh2 extends AnyModuleShape>(module: ModuleTag<string, Sh2>): Logic.Of<Sh, R, ModuleHandle<Sh2>, never>
    <Svc, Id = unknown>(tag: Context.Tag<Id, Svc>): Logic.Of<Sh, R, Svc, never>
  }
  readonly onAction: {
    <T extends ActionOf<Sh>>(predicate: (a: ActionOf<Sh>) => a is T): Logic.IntentBuilder<T, Sh, R>
    <K extends keyof Sh['actionMap']>(
      tag: K,
    ): Logic.IntentBuilder<Extract<ActionOf<Sh>, { _tag: K } | { type: K }>, Sh, R>
  } & {
    [K in keyof Sh['actionMap']]: Logic.IntentBuilder<Extract<ActionOf<Sh>, { _tag: K } | { type: K }>, Sh, R>
  }
  readonly onState: <V>(selector: (s: StateOf<Sh>) => V) => Logic.IntentBuilder<V, Sh, R>
  readonly on: <V>(source: Stream.Stream<V>) => Logic.IntentBuilder<V, Sh, R>
  /**
   * traits: runtime entrypoints reserved for features like StateTrait.
   *
   * - source.refresh(fieldPath): trigger an explicit refresh of a source field.
   * - Concrete behavior is mounted at runtime by StateTrait.install.
   */
  readonly traits: {
    /**
     * declare：
     * - setup-only: contributes trait declarations during the Logic setup phase (pure data/declarative).
     * - Final merge / conflict detection / freezing is done during Runtime initialization (023).
     */
    readonly declare: (traits: ModuleTraits.TraitSpec) => void
    readonly source: {
      readonly refresh: (
        fieldPath: string,
        options?: {
          /**
           * Forced refresh: re-fetch even if keyHash is unchanged and a non-idle snapshot already exists.
           * - Used for explicit refresh / invalidate where "same key still re-fetch" is desired.
           * - Auto-trigger chains SHOULD keep the default (false/undefined) to avoid duplicate IO and meaningless writebacks.
           */
          readonly force?: boolean
        },
      ) => Logic.Of<Sh, R, void, never>
    }
  }
  /**
   * Primary reducer definition entrypoint:
   * - Semantics: register a synchronous, pure state transform reducer for an Action tag.
   * - Implementation: writes directly into the Runtime's `_tag -> (state, action) => state` map, not watcher / Flow.
   *
   * Constraints:
   * - At most one primary reducer per Action tag; duplicate registration is an error.
   * - The reducer must be pure: no Env, no Effect.
   */
  readonly reducer: <K extends keyof Sh['actionMap'], A extends Extract<ActionOf<Sh>, { _tag: K } | { type: K }>>(
    tag: K,
    reducer: (state: StateOf<Sh>, action: A) => StateOf<Sh>,
  ) => Logic.Of<Sh, R, void, never>
}

/**
 * ModuleTag: identity anchor (Context.Tag).
 *
 * - Also acts as a Context.Tag; usable as an argument to `$.use(Module)`.
 * - Exposes `logic` and `live` factories for mounting logic programs and building the live Layer.
 */
export interface ModuleTag<Id extends string, Sh extends AnyModuleShape> extends Context.Tag<
  any,
  ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>
> {
  readonly _kind: 'ModuleTag'
  readonly id: Id
  readonly shape: Sh
  readonly stateSchema: Sh['stateSchema']
  readonly actionSchema: Sh['actionSchema']
  /**
   * 原始 ActionMap（tag -> payload schema）。
   * - 主要用于 DX/反射；运行时契约仍以 shape/actionSchema 为准。
   */
  readonly actions: Sh['actionMap']
  /**
   * 原始 reducers（若定义侧提供）。
   * - 主要用于 DX/反射；运行时会在 ModuleFactory 内部归一化为 `_tag -> (state, action) => state` 映射。
   */
  readonly reducers?: ReducersFromMap<Sh['stateSchema'], Sh['actionMap']>

  readonly logic: <R = never, E = unknown>(
    build: (api: BoundApi<Sh, R>) => ModuleLogic<Sh, R, E>,
  ) => ModuleLogic<Sh, R, E>

  readonly live: <R = never, E = never>(
    initial: StateOf<Sh>,
    ...logics: Array<ModuleLogic<Sh, R, E>>
  ) => Layer.Layer<ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>, E, R>

  /**
   * implement: build a ModuleImpl blueprint from Module definition + initial state + a set of logics.
   *
   * - R represents the Env required by the logics.
   * - The returned ModuleImpl.layer carries R as its input environment.
   * - withLayer/withLayers can progressively narrow R to a more concrete Env (even `never`).
   */
  readonly implement: <R = never>(config: {
    initial: StateOf<Sh>
    logics?: Array<ModuleLogic<Sh, R, any>>
    imports?: ReadonlyArray<Layer.Layer<any, any, any> | ModuleImpl<any, AnyModuleShape, any>>
    processes?: ReadonlyArray<Effect.Effect<void, any, any>>
    stateTransaction?: ModuleImplementStateTransactionOptions
  }) => ModuleImpl<Id, Sh, R>
}

/**
 * ModuleImpl: a concrete Module implementation unit (blueprint + initial state + mounted logics).
 *
 * - It's a "configured module" that can be consumed directly by React hooks or app composition.
 * - It carries the Env dependency type R required by the implementation.
 */
export interface ModuleImpl<Id extends string, Sh extends AnyModuleShape, REnv = any> {
  readonly _tag: 'ModuleImpl'
  readonly module: ModuleTag<Id, Sh>
  readonly layer: Layer.Layer<ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>, never, REnv>
  readonly processes?: ReadonlyArray<Effect.Effect<void, any, any>>
  readonly stateTransaction?: ModuleImplementStateTransactionOptions
  readonly withLayer: (layer: Layer.Layer<any, never, any>) => ModuleImpl<Id, Sh, REnv>
  readonly withLayers: (...layers: ReadonlyArray<Layer.Layer<any, never, any>>) => ModuleImpl<Id, Sh, REnv>
}

/**
 * Helper type: convert an Action Map into a union type.
 */
export type ActionsFromMap<M extends Record<string, AnySchema>> = {
  [K in keyof M]: Schema.Schema.Type<M[K]> extends void
    ? {
        readonly _tag: K
        readonly payload?: Schema.Schema.Type<M[K]>
      }
    : {
        readonly _tag: K
        readonly payload: Schema.Schema.Type<M[K]>
      }
}[keyof M]

/**
 * Derive a tag-keyed "draft-style reducer (mutator) map" from an Action Map:
 * - Each Action tag may optionally declare a `(draftState, actionOfThisTag) => void`.
 * - Higher-level APIs wrap it into a pure reducer via `Module.Reducer.mutate` / `Module.Reducer.mutateMap`.
 */
export type MutatorsFromMap<SSchema extends AnySchema, AMap extends Record<string, AnySchema>> = {
  readonly [K in keyof AMap]?: (
    draft: Logic.Draft<Schema.Schema.Type<SSchema>>,
    action: Schema.Schema.Type<AMap[K]> extends void
      ? {
          readonly _tag: K
          readonly payload?: Schema.Schema.Type<AMap[K]>
        }
      : {
          readonly _tag: K
          readonly payload: Schema.Schema.Type<AMap[K]>
        },
  ) => void
}

/**
 * Derive a tag-keyed reducer map from an Action Map:
 * - Each Action tag may optionally declare a primary reducer `(state, actionOfThisTag) => nextState`.
 */
export type ReducersFromMap<SSchema extends AnySchema, AMap extends Record<string, AnySchema>> = {
  readonly [K in keyof AMap]?: (
    state: Schema.Schema.Type<SSchema>,
    action: Schema.Schema.Type<AMap[K]> extends void
      ? {
          readonly _tag: K
          readonly payload?: Schema.Schema.Type<AMap[K]>
        }
      : {
          readonly _tag: K
          readonly payload: Schema.Schema.Type<AMap[K]>
        },
    sink?: (path: string | FieldPath) => void,
  ) => Schema.Schema.Type<SSchema>
}

/**
 * A simplified Shape helper tailored for Action Maps.
 * @example type MyShape = Shape<typeof MyState, typeof MyActionMap>
 */
export type Shape<S extends AnySchema, M extends Record<string, AnySchema>> = ModuleShape<
  S,
  Schema.Schema<ActionsFromMap<M>>,
  M
>
