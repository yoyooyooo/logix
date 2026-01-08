import type * as EffectOp from '@logixjs/core/EffectOp'
import { Context, Effect, Layer, Option } from 'effect'
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
    readonly meta?: unknown
  }) => Effect.Effect<A, unknown, any>

  /**
   * perf: optional fast path to avoid allocations on the hot path.
   * Semantics must match `fetch({ ... })`.
   */
  readonly fetchFast?: <A>(
    resourceId: string,
    keyHash: string,
    effect: Effect.Effect<A, unknown, any>,
    meta?: unknown,
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

class EngineTagImpl extends Context.Tag('@logixjs/query/Engine')<EngineTagImpl, Engine>() {}

export const Engine = Object.assign(EngineTagImpl, {
  layer: (engine: Engine): Layer.Layer<EngineTagImpl, never, never> => Layer.succeed(EngineTagImpl, engine),
  middleware: (config?: MiddlewareConfig): EffectOp.Middleware => middlewareImpl(config),
})

export type { MiddlewareConfig }
