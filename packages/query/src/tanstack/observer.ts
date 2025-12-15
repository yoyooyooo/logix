import type * as EffectOp from "@logix/core/effectop"
import { Effect } from "effect"
import type { QueryClient } from "@tanstack/query-core"
import { QueryObserver } from "@tanstack/query-core"
import { QueryClientTag } from "../query-client.js"

export type QueryKey = readonly [resourceId: string, keyHash: string]

export const makeQueryKey = (resourceId: string, keyHash: string): QueryKey => [
  resourceId,
  keyHash,
]

export interface TanStackMiddlewareConfig {
  /**
   * 默认：仅对带 resourceId+keyHash 的 service op 生效（来自 StateTrait.source）。
   * 可选：进一步筛选 resourceId。
   */
  readonly useFor?: (resourceId: string) => boolean
}

/**
 * TanStack middleware（EffectOp）：
 * - 将 ResourceSpec.load 的执行委托给 QueryClient（缓存 / in-flight 去重）；
 * - 仍保持 Logix Runtime 的 keyHash 门控与 ResourceSnapshot 事实源语义。
 */
export const middleware =
  (config?: TanStackMiddlewareConfig): EffectOp.Middleware =>
  (op) =>
    Effect.gen(function* () {
      if (op.kind !== "service" || !op.meta?.resourceId || !op.meta.keyHash) {
        return yield* op.effect
      }

      const resourceId = op.meta.resourceId
      if (config?.useFor && !config.useFor(resourceId)) {
        return yield* op.effect
      }

      // QueryClient 由宿主通过 Query.layer 注入；缺失时视为配置错误（避免静默退化）。
      const queryClientOpt = yield* Effect.serviceOption(QueryClientTag)
      if (queryClientOpt._tag === "None") {
        return yield* Effect.fail(
          new Error(
            `[Query.TanStack.middleware] Missing QueryClientTag; please provide Query.layer(new QueryClient()) in the Runtime scope.`,
          ),
        )
      }

      const queryClient = queryClientOpt.value as QueryClient
      const keyHash = String(op.meta.keyHash)
      const queryKey = makeQueryKey(resourceId, keyHash)

      // 将当前 Effect Env 捕获进 Context，供 queryFn 在 Promise 世界执行时仍能访问到依赖服务。
      const ctx = yield* Effect.context<any>()

      return yield* Effect.tryPromise({
        try: () =>
          queryClient.fetchQuery({
            queryKey,
            queryFn: () =>
              Effect.runPromise(op.effect.pipe(Effect.provide(ctx))),
            meta: {
              logix: {
                moduleId: op.meta?.moduleId,
                runtimeId: op.meta?.runtimeId,
                fieldPath: op.meta?.fieldPath,
                resourceId,
                keyHash,
              },
            },
          }),
        catch: (e) => e,
      })
    }) as Effect.Effect<any, any, any>

/**
 * observe（scope 内订阅 + cleanup）：
 * - 用于需要“像 TanStack 一样自动追踪 enabled/queryKey 变化”的场景；
 * - 当前作为基础设施提供，领域逻辑可选择性使用（不强依赖）。
 */
export const observe = <TData = unknown>(params: {
  readonly queryClient: QueryClient
  readonly options: ConstructorParameters<typeof QueryObserver<TData>>[1]
  readonly onResult: (result: unknown) => void
}): Effect.Effect<QueryObserver<TData>, never, any> =>
  Effect.gen(function* () {
    const observer = new QueryObserver<TData>(
      params.queryClient,
      params.options as any,
    )
    const unsubscribe = observer.subscribe(params.onResult as any)
    yield* Effect.addFinalizer(() => Effect.sync(() => unsubscribe()))
    return observer
  })

