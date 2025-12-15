import * as Logix from "@logix/core"
import { Effect } from "effect"
import type { QueryClient } from "@tanstack/query-core"
import { QueryClientTag } from "../query-client.js"
import type { QuerySourceConfig } from "../traits.js"
import { makeQueryKey } from "../tanstack/observer.js"

export type InvalidateRequest =
  | { readonly kind: "byResource"; readonly resourceId: string }
  | { readonly kind: "byParams"; readonly resourceId: string; readonly keyHash: string }
  | { readonly kind: "byTag"; readonly tag: string }

export interface InvalidateLogicConfig<TParams, TUI> {
  readonly queries: Readonly<Record<string, QuerySourceConfig<TParams, TUI>>>
}

const toInvalidateTargets = <TParams, TUI>(
  request: InvalidateRequest,
  queries: Readonly<Record<string, QuerySourceConfig<TParams, TUI>>>,
): ReadonlyArray<{ readonly name: string; readonly resourceId: string }> => {
  if (request.kind === "byResource") {
    return Object.entries(queries)
      .filter(([, q]) => q.resource.id === request.resourceId)
      .map(([name, q]) => ({ name, resourceId: q.resource.id }))
  }

  if (request.kind === "byParams") {
    return Object.entries(queries)
      .filter(([, q]) => q.resource.id === request.resourceId)
      .map(([name, q]) => ({ name, resourceId: q.resource.id }))
  }

  // byTag：无法从 QuerySourceConfig 静态推导，先退化为全量刷新（后续可接入 meta/tags）。
  return Object.entries(queries).map(([name, q]) => ({
    name,
    resourceId: q.resource.id,
  }))
}

export const invalidate = <Sh extends Logix.AnyModuleShape, TParams, TUI>(
  module: Logix.ModuleInstance<any, Sh>,
  config: InvalidateLogicConfig<TParams, TUI>,
): Logix.ModuleLogic<Sh, any, never> =>
  module.logic(($) =>
    Effect.gen(function* () {
      const invalidateWithClient = (
        queryClient: QueryClient,
        request: InvalidateRequest,
      ): Effect.Effect<void, unknown, never> => {
        if (request.kind === "byResource") {
          return Effect.tryPromise({
            try: () =>
              queryClient.invalidateQueries({
                queryKey: [request.resourceId],
              }),
            catch: (e) => e,
          })
        }

        if (request.kind === "byParams") {
          return Effect.tryPromise({
            try: () =>
              queryClient.invalidateQueries({
                queryKey: makeQueryKey(request.resourceId, request.keyHash),
              }),
            catch: (e) => e,
          })
        }

        return Effect.tryPromise({
          try: () =>
            queryClient.invalidateQueries({
              predicate: (q) => {
                const tags = (q.meta as any)?.tags
                return Array.isArray(tags) && tags.includes(request.tag)
              },
            }),
          catch: (e) => e,
        })
      }

      yield* $.onAction("invalidate").runFork((action: any) =>
        Effect.gen(function* () {
          const request = action.payload as InvalidateRequest

          // 1) 事件化：进入 ReplayLog（kernel 归属）。
          yield* Logix.TraitLifecycle.scopedExecute($ as any, {
            kind: "query:invalidate",
            request,
          })

          // 2) 调用外部引擎：QueryClient.invalidateQueries（可替换实现）。
          const queryClientOpt = yield* Effect.serviceOption(QueryClientTag)
          if (queryClientOpt._tag === "None") {
            yield* Effect.fail(
              new Error(
                `[Query.invalidate] Missing QueryClientTag; please provide Query.layer(new QueryClient()) in the Runtime scope.`,
              ),
            )
            return
          }

          const queryClient = queryClientOpt.value as QueryClient
          yield* invalidateWithClient(queryClient, request)

          // 3) 立即触发相关 source 刷新（写回门控仍由 kernel keyHash 保障）。
          const targets = toInvalidateTargets(request, config.queries)
          yield* Effect.forEach(targets, (t) =>
            $.traits.source.refresh(t.name) as Effect.Effect<void, never, any>,
          ).pipe(Effect.asVoid)
        }),
      )
    }),
  ) as Logix.ModuleLogic<Sh, any, never>

