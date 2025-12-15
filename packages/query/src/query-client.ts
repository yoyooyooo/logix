import { Context, Layer } from "effect"
import type { QueryClient } from "@tanstack/query-core"

/**
 * QueryClientTag：
 * - 由宿主在 Runtime 作用域内注入 QueryClient 实例；
 * - @logix/query 的 TanStack 集成层通过该 Tag 获取缓存/去重能力。
 */
export class QueryClientTag extends Context.Tag(
  "@logix/query/QueryClient",
)<QueryClientTag, QueryClient>() {}

/**
 * Query.layer：
 * - 便捷注入：语义等价于 Layer.succeed(QueryClientTag, client)；
 * - 推荐在应用 Runtime 的 root layer 中统一提供。
 */
export const layer = (
  client: QueryClient,
): Layer.Layer<QueryClientTag, never, never> =>
  Layer.succeed(QueryClientTag, client)
