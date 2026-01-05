import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Duration, Effect, Layer, Schema } from 'effect'
import { QueryClient } from '@tanstack/query-core'
import * as Logix from '@logix/core'
import * as Query from '../src/index.js'

describe('TanStack.engine.cacheLimit', () => {
  it.scoped('maxEntriesPerResource=1 should evict and cause reload when key flips', () =>
    Effect.gen(function* () {
      const waitUntil = <A>(
        read: Effect.Effect<A, never, any>,
        predicate: (value: A) => boolean,
      ): Effect.Effect<A, Error, any> =>
        Effect.gen(function* () {
          while (true) {
            const value = yield* read
            if (predicate(value)) return value
            yield* Effect.sleep(Duration.millis(5))
          }
        }).pipe(
          Effect.timeoutFail({
            duration: Duration.seconds(2),
            onTimeout: () => new Error('timeout waiting for condition'),
          }),
        )

      const KeySchema = Schema.Struct({ q: Schema.String })

      let loadCalls = 0
      const spec = Logix.Resource.make({
        id: 'demo/tanstack-engine-cache-limit',
        keySchema: KeySchema,
        load: (key: { readonly q: string }) =>
          Effect.sync(() => {
            loadCalls += 1
            return { q: key.q }
          }).pipe(Effect.delay(Duration.millis(2))),
      })

      const ParamsSchema = Schema.Struct({ q: Schema.String })

      const module = Query.make('TanStackEngineCacheLimitBlueprint', {
        params: ParamsSchema,
        initialParams: { q: 'a' },
        queries: ($) => ({
          search: $.source({
            resource: spec,
            deps: ['params.q'],
            triggers: ['manual'],
            concurrency: 'switch',
            key: (q) => ({ q }),
          }),
        }),
      })

      const queryClient = new QueryClient()
      const runtime = Logix.Runtime.make(module.impl, {
        layer: Layer.mergeAll(
          Logix.Resource.layer([spec]),
          Query.Engine.layer(Query.TanStack.engine(queryClient, { maxEntriesPerResource: 1 })),
        ),
        middleware: [Query.Engine.middleware()],
      })

      const program = Effect.gen(function* () {
        const rt = yield* module.tag
        const controller = module.controller.make(rt)

        const keys = ['a', 'b', 'a', 'b', 'a', 'b'] as const
        for (const q of keys) {
          yield* controller.controller.setParams({ q } as any)
          yield* waitUntil(controller.getState as any, (s: any) => s.params?.q === q)

          yield* controller.controller.refresh('search' as any)

          const expectedKeyHash = Logix.Resource.keyHash({ q })
          yield* waitUntil(
            controller.getState as any,
            (s: any) => s.queries.search?.status === 'success' && s.queries.search?.keyHash === expectedKeyHash,
          )
        }

        // Since maxEntriesPerResource=1, flipping keys evicts the previous entry,
        // so every refresh should trigger a load (no cache hit).
        expect(loadCalls).toBe(keys.length)
      })

      yield* Effect.promise(() => runtime.runPromise(program as any))
    }),
  )
})
