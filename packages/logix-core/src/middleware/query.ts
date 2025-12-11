// Query 命名空间（middleware/query）：
// - 承载基于 EffectOp 的查询中间件与 QueryClient Layer；
// - 设计为 Effect-Native，后续可以通过适配层对接具体查询引擎（如 TanStack Query）。
//
// 当前实现聚焦于基础设施搭建：
// - Query.layer(client)：在 Env 中注册 QueryClient 实例；
// - Query.middleware(config)：基于 `EffectOp(kind="service") + resourceId + key`
//   在 ResourceSpec.load 与 QueryClient 之间选择调用路径。

import { Context, Effect, Layer, Option } from "effect"
import type * as EffectOp from "../effectop.js"
import { internal as ResourceInternal } from "../Resource.js"

/**
 * QueryClientEnv：
 * - 对 QueryClient 的最小包装，保持 Effect-Native；
 * - 具体 client 形态由调用方决定（可以是自定义实现或第三方库的适配层）。
 */
export interface QueryClientEnv<Client = unknown> {
  readonly client: Client
}

class QueryClientTagImpl extends Context.Tag(
  "@logix/core/QueryClient",
)<QueryClientTagImpl, QueryClientEnv>() {}

const QueryClientTag = QueryClientTagImpl

export interface QueryMiddlewareConfig {
  /**
   * 预留：根据 resourceId 决定哪些资源走 QueryClient。
   * - 返回 true 表示优先走 QueryClient；
   * - 返回 false 表示保留原始 EffectOp 行为；
   * - 当前占位实现尚未使用该配置。
   */
  readonly useQueryClientFor?: (resourceId: string) => boolean
}

export const Query = {
  /**
   * layer：
   * - 在当前 Runtime 作用域内注册 QueryClient 实例；
   * - 具体 Client 类型由调用方决定，后续 Middleware 可从 Env 中取出并使用。
   */
  layer<Client>(client: Client): Layer.Layer<never, never, QueryClientEnv<Client>> {
    return Layer.succeed(QueryClientTag as any, { client }) as Layer.Layer<
      never,
      never,
      QueryClientEnv<Client>
    >
  },

  /**
   * internalTag：
   * - 仅供未来中间件实现或内部测试使用；
   * - 不在上层 barrel (`@logix/core/middleware`) 再次 re-export。
   */
  internalTag(): typeof QueryClientTag {
    return QueryClientTag
  },

  /**
   * middleware：
   * - 占位型 EffectOp 中间件，目前直接透传 op.effect；
   * - 后续会在此处基于 `kind = "service" + resourceId + key` 接入 Resource/Query 统一模型。
   */
  middleware(_config?: QueryMiddlewareConfig): EffectOp.Middleware {
    return (op) =>
      Effect.gen(function* () {
        if (op.kind !== "service" || !op.meta?.resourceId) {
          return yield* op.effect
        }

        const resourceId = op.meta.resourceId
        const key = op.meta.key

        // 若未提供 key 或 ResourceRegistry，则保留原始行为。
        const registryOpt = yield* Effect.serviceOption(
          ResourceInternal.ResourceRegistryTag,
        )
        const registry = Option.isSome(registryOpt)
          ? registryOpt.value
          : undefined
        const spec = registry?.specs.get(resourceId)

        if (!spec) {
          return yield* op.effect
        }

        // 可选：尝试从 Env 中读取 QueryClient。
        const clientOpt = yield* Effect.serviceOption(QueryClientTag)
        const clientEnv = Option.isSome(clientOpt) ? clientOpt.value : undefined

        const shouldUseQueryClient =
          clientEnv && _config?.useQueryClientFor?.(resourceId)

        if (shouldUseQueryClient) {
          const client = clientEnv!.client as any
          if (typeof client === "function") {
            // 约定：client(resourceId, key, load) 返回 Effect.Effect<Out, Err, Env>。
            // 具体行为由调用方决定，本中间件只负责转发。
            return yield* client(resourceId, key, spec.load)
          }
        }

        // 默认：直接调用 ResourceSpec.load。
        // - key 形状由调用方保证与 keySchema 一致；
        // - 错误与 Env 泛型保持为 any。
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return yield* (spec.load as any)(key)
      }) as Effect.Effect<any, any, any>
  },
} as const
