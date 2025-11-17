import type * as EffectOp from '@logix/core/EffectOp'
import { Effect, Option } from 'effect'
import { Engine } from '../../Engine.js'
import type { Engine as EngineService } from '../../Engine.js'

export interface MiddlewareConfig {
  /**
   * Default: only applies to EffectOp that carries resourceId+keyHash (from StateTrait.source).
   * Optional: further filter by resourceId.
   */
  readonly useFor?: (resourceId: string) => boolean
}

/**
 * Query middleware (EffectOp): external engine takeover point.
 * - Delegates ResourceSpec.load execution to Engine (cache / in-flight dedupe / invalidation, etc.)
 * - Still preserves Logix Runtime's keyHash gating and ResourceSnapshot source-of-truth semantics
 */
export const middleware = (config?: MiddlewareConfig): EffectOp.Middleware =>
  (() => {
    // perf: within the same Runtime instance, Engine injection is stable.
    // Cache it in the middleware closure to avoid a Context lookup on every fetch.
    let cachedEngine: EngineService | undefined

    return (op) => {
      if ((op.kind !== 'service' && op.kind !== 'trait-source') || !op.meta?.resourceId || !op.meta.keyHash) {
        return op.effect as any
      }

      const resourceId = op.meta.resourceId
      if (config?.useFor && !config.useFor(resourceId)) {
        return op.effect as any
      }

      const keyHash = op.meta.keyHash as string

      if (cachedEngine) {
        if (cachedEngine.fetchFast) {
          return cachedEngine.fetchFast(resourceId, keyHash, op.effect as any)
        }
        return cachedEngine.fetch({ resourceId, keyHash, effect: op.effect as any })
      }

      return Effect.serviceOption(Engine).pipe(
        Effect.flatMap((engineOpt) => {
          if (Option.isNone(engineOpt)) {
            return Effect.fail(
              new Error(
                `[Query.Engine.middleware] Missing Query.Engine in the Runtime scope; please provide Query.Engine.layer(Query.TanStack.engine(new QueryClient())) (recommended) or Query.Engine.layer(customEngine).`,
              ),
            )
          }
          cachedEngine = engineOpt.value
          if (cachedEngine.fetchFast) {
            return cachedEngine.fetchFast(resourceId, keyHash, op.effect as any)
          }
          return cachedEngine.fetch({ resourceId, keyHash, effect: op.effect as any })
        }),
      ) as any
    }
  })()
