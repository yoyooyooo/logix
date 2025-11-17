import { Effect } from 'effect'
import type { QueryClient } from '@tanstack/query-core'
import { QueryObserver } from '@tanstack/query-core'

/**
 * observe (subscribe within scope + cleanup):
 * - For scenarios where you want "TanStack-like automatic tracking" of enabled/queryKey changes.
 * - Provided as infrastructure; domain logic can choose to use it (no hard dependency).
 */
export const observe = <TData = unknown>(params: {
  readonly queryClient: QueryClient
  readonly options: ConstructorParameters<typeof QueryObserver<TData>>[1]
  readonly onResult: (result: unknown) => void
}): Effect.Effect<QueryObserver<TData>, never, any> =>
  Effect.gen(function* () {
    const observer = new QueryObserver<TData>(params.queryClient, params.options as any)
    const unsubscribe = observer.subscribe(params.onResult as any)
    yield* Effect.addFinalizer(() => Effect.sync(() => unsubscribe()))
    return observer
  })
