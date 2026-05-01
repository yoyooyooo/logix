import { Effect } from 'effect'
import { QueryClient } from '@tanstack/query-core'
import * as Query from '@logixjs/query'

export const makeQueryClientEngine = (queryClient: QueryClient) => {
  const cache = new Map<string, unknown>()

  const toCacheKey = (resourceId: string, keyHash: string): string => `${resourceId}::${keyHash}`

  return {
    fetch: <A>(args: {
      readonly resourceId: string
      readonly keyHash: string
      readonly effect: Effect.Effect<A, unknown, any>
    }) =>
      Effect.suspend(() => {
        const cacheKey = toCacheKey(args.resourceId, args.keyHash)
        if (cache.has(cacheKey)) {
          return Effect.succeed(cache.get(cacheKey) as A)
        }

        return Effect.tap(args.effect, (value) =>
          Effect.sync(() => {
            cache.set(cacheKey, value)
          }),
        )
      }),
    invalidate: (request: Query.InvalidateRequest) =>
      Effect.sync(() => {
        if (request.kind === 'byParams') {
          cache.delete(toCacheKey(request.resourceId, request.keyHash))
          void queryClient.invalidateQueries({
            queryKey: [request.resourceId, request.keyHash],
          })
          return
        }

        if (request.kind === 'byResource') {
          for (const key of cache.keys()) {
            if (key.startsWith(`${request.resourceId}::`)) {
              cache.delete(key)
            }
          }
          void queryClient.invalidateQueries({
            queryKey: [request.resourceId],
          })
          return
        }

        cache.clear()
        void queryClient.invalidateQueries()
      }),
  }
}
