import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Duration, Effect, Layer, Schema } from 'effect'
import { QueryClient } from '@tanstack/query-core'
import * as Logix from '@logix/core'
import * as Query from '../../src/index.js'

describe('Query.CacheReuse', () => {
  it.scoped('should reuse same keyHash and avoid redundant loading', () =>
    Effect.gen(function* () {
      const KeySchema = Schema.Struct({ q: Schema.String })
      type Key = Schema.Schema.Type<typeof KeySchema>

      let loadCalls = 0

      const spec = Logix.Resource.make<Key, { readonly q: string }, never, never>({
        id: 'demo/query-cache-reuse',
        keySchema: KeySchema,
        load: (key) =>
          Effect.sync(() => {
            loadCalls += 1
            return { q: key.q }
          }).pipe(
            // Simulate an async boundary so `loading` is observable.
            Effect.delay(Duration.millis(10)),
          ),
      })

      const ParamsSchema = Schema.Struct({ q: Schema.String })

      const module = Query.make('QueryCacheReuseBlueprint', {
        params: ParamsSchema,
        initialParams: { q: 'same' },
        queries: {
          search: {
            resource: { id: spec.id },
            deps: ['params.q'],
            triggers: ['onMount', 'onValueChange'],
            concurrency: 'switch',
            key: ({ params }: { readonly params: { readonly q: string } }) => ({
              q: params.q,
            }),
          },
        },
      })

      const runtime = Logix.Runtime.make(module.impl, {
        layer: Layer.mergeAll(
          Logix.Resource.layer([spec]),
          Query.Engine.layer(Query.TanStack.engine(new QueryClient())),
        ),
        middleware: [Query.Engine.middleware()],
      })

      const program = Effect.gen(function* () {
        const rt = yield* module.tag
        const controller = module.controller.make(rt)

        // `onMount` triggers one load.
        yield* Effect.sleep(Duration.millis(30))

        // Repeatedly write params that are value-equal but referentially different; should not trigger refresh again.
        yield* Effect.forEach(
          Array.from({ length: 10 }, () => ({ q: 'same' })),
          (p) => controller.controller.setParams(p as any),
        )

        yield* Effect.sleep(Duration.millis(30))

        const state = yield* controller.getState
        const snapshot = state.queries.search

        expect(snapshot.status).toBe('success')
        expect(snapshot.data).toEqual({ q: 'same' })
        expect(loadCalls).toBe(1)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
