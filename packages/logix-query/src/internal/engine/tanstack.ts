import { Effect, Option } from 'effect'
import type { QueryClient } from '@tanstack/query-core'
import type { Engine, InvalidateRequest } from '../../Engine.js'

const makeQueryKey = (resourceId: string, keyHash: string) => [resourceId, keyHash] as const

export interface TanStackEngineConfig {
  /**
   * The max number of entries per resourceId in the local fast cache.
   * - Goal: prevent unbounded memory growth when the key space is unbounded.
   * - Semantics: evicts oldest entries in insertion order (FIFO); cache misses fall back to re-loading.
   * - Set to Infinity to disable the cap (not recommended for long-running processes).
   */
  readonly maxEntriesPerResource?: number
}

/**
 * TanStack engine：
 * - Uses QueryClient for invalidation (easy integration with TanStack ecosystem).
 * - fetch/peekFresh uses a slim in-memory cache to avoid frequently creating Query objects on the Logix runtime hot path.
 * - Still preserves Logix Runtime's keyHash gating and ResourceSnapshot source-of-truth semantics.
 */
export const engine = (queryClient: QueryClient, config?: TanStackEngineConfig): Engine => {
  const byResourceId = new Map<string, Map<string, unknown>>()
  const maxEntriesPerResource = config?.maxEntriesPerResource ?? 2000

  // Align with external QueryClient.clear(): when QueryCache is cleared, clear the local fast cache as well.
  try {
    const queryCache: any = (queryClient as any).getQueryCache?.()
    if (queryCache && typeof queryCache.clear === 'function') {
      const original = queryCache.clear.bind(queryCache)
      queryCache.clear = () => {
        byResourceId.clear()
        return original()
      }
    }
  } catch {
    // ignore
  }

  const ensureBucket = (resourceId: string): Map<string, unknown> => {
    let bucket = byResourceId.get(resourceId)
    if (!bucket) {
      bucket = new Map<string, unknown>()
      byResourceId.set(resourceId, bucket)
    }
    return bucket
  }

  const evictIfNeeded = (bucket: Map<string, unknown>): void => {
    if (maxEntriesPerResource === Infinity) return
    if (!Number.isFinite(maxEntriesPerResource) || maxEntriesPerResource <= 0) return
    while (bucket.size > maxEntriesPerResource) {
      const firstKey = bucket.keys().next().value as string | undefined
      if (firstKey === undefined) return
      bucket.delete(firstKey)
    }
  }

  const fetchFast: Engine['fetchFast'] = (resourceId, keyHash, effect) =>
    Effect.suspend(() => {
      const hit = byResourceId.get(resourceId)?.get(keyHash)
      if (hit !== undefined) {
        return Effect.succeed(hit as any)
      }

      return Effect.map(effect, (out) => {
        if (out !== undefined) {
          const bucket = ensureBucket(resourceId)
          bucket.set(keyHash, out)
          evictIfNeeded(bucket)
        }
        return out as any
      })
    })

  return {
    fetch: ({ resourceId, keyHash, effect }) => fetchFast!(resourceId, keyHash, effect),

    fetchFast,

    invalidate: (request: InvalidateRequest) =>
      Effect.gen(function* () {
        yield* Effect.sync(() => {
          if (request.kind === 'byParams') {
            const bucket = byResourceId.get(request.resourceId)
            if (!bucket) return
            bucket.delete(request.keyHash)
            if (bucket.size === 0) {
              byResourceId.delete(request.resourceId)
            }
            return
          }

          if (request.kind === 'byResource') {
            byResourceId.delete(request.resourceId)
            return
          }

          // byTag: we currently lack a serializable tags mapping; conservatively clear all (explainable but coarse).
          byResourceId.clear()
        })

        // Sync to QueryClient (if there are external observers/ecosystem consumers).
        yield* Effect.tryPromise({
          try: () => {
            if (request.kind === 'byResource') {
              return queryClient.invalidateQueries({
                queryKey: [request.resourceId],
              })
            }

            if (request.kind === 'byParams') {
              return queryClient.invalidateQueries({
                queryKey: makeQueryKey(request.resourceId, request.keyHash),
              })
            }

            return queryClient.invalidateQueries({
              predicate: (q) => {
                const tags = (q.meta as any)?.tags
                return Array.isArray(tags) && tags.includes(request.tag)
              },
            })
          },
          catch: (e) => e,
        }).pipe(Effect.asVoid)
      }),

    peekFresh: <A>({ resourceId, keyHash }: { readonly resourceId: string; readonly keyHash: string }) =>
      Effect.sync(() => {
        const hit = byResourceId.get(resourceId)?.get(keyHash) as A | undefined
        return hit === undefined ? Option.none<A>() : Option.some(hit)
      }),
  }
}
