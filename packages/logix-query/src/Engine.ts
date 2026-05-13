import type * as EffectOp from '@logixjs/core/repo-internal/effect-op'
import type { JsonValue } from '@logixjs/core/repo-internal/evidence-api'
import { Effect, Layer, Option, ServiceMap } from 'effect'
import * as ResourceOwner from './internal/resource.js'
import { middleware as middlewareImpl, type MiddlewareConfig } from './internal/middleware/middleware.js'

export type InvalidateRequest =
  | { readonly kind: 'byResource'; readonly resourceId: string }
  | { readonly kind: 'byParams'; readonly resourceId: string; readonly keyHash: string }
  | { readonly kind: 'byTag'; readonly tag: string }

export interface Engine {
  readonly fetch: <A>(args: {
    readonly resourceId: string
    readonly keyHash: string
    readonly effect: Effect.Effect<A, unknown, any>
    /**
     * MUST be serializable and slim; recommended default is undefined (lazy),
     * and only populate it when diagnostics/devtools require it.
     */
    readonly meta?: JsonValue
  }) => Effect.Effect<A, unknown, any>

  /**
   * perf: optional fast path to avoid allocations on the hot path.
   * Semantics must match `fetch({ ... })`.
   */
  readonly fetchFast?: <A>(
    resourceId: string,
    keyHash: string,
    effect: Effect.Effect<A, unknown, any>,
    meta?: JsonValue,
  ) => Effect.Effect<A, unknown, any>

  readonly invalidate: (request: InvalidateRequest) => Effect.Effect<void, unknown, any>

  /**
   * Read-only fast path: must not trigger IO; used to short-circuit to success before refresh,
   * avoiding loading jitter.
   */
  readonly peekFresh?: <A>(args: {
    readonly resourceId: string
    readonly keyHash: string
  }) => Effect.Effect<Option.Option<A>, never, any>
}

export type ResourceSpec<Key, Out, Err, Env> = ResourceOwner.ResourceSpec<Key, Out, Err, Env>
export type AnyResourceSpec = ResourceOwner.AnyResourceSpec
export type ResourceStatus = ResourceOwner.ResourceStatus
export type ResourceSnapshot<Data = unknown, Err = unknown> = ResourceOwner.ResourceSnapshot<Data, Err>
export type ResourceRegistry = ResourceOwner.ResourceRegistry

class EngineTagImpl extends ServiceMap.Service<EngineTagImpl, Engine>()('@logixjs/query/Engine') {}

export const Engine = Object.assign(EngineTagImpl, {
  layer: (engine: Engine): Layer.Layer<EngineTagImpl, never, never> => Layer.succeed(EngineTagImpl, engine),
  middleware: (config?: MiddlewareConfig): EffectOp.Middleware => middlewareImpl(config),
  Resource: {
    make: ResourceOwner.make,
    layer: ResourceOwner.layer,
    keyHash: ResourceOwner.keyHash,
    Snapshot: ResourceOwner.Snapshot,
    ResourceRegistryTag: ResourceOwner.ResourceRegistryTag,
  },
})

export type { MiddlewareConfig }
