import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Duration, Effect, Layer, Schema } from 'effect'
import { QueryClient } from '@tanstack/query-core'
import * as Logix from '@logix/core'
import * as Query from '../src/index.js'

describe('Query.controller.refreshAll', () => {
  it.scoped('should refresh all queries and skip key-unavailable ones', () =>
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
            duration: Duration.seconds(1),
            onTimeout: () => new Error('timeout waiting for condition'),
          }),
        )

      let searchCalls = 0
      const SearchSpec = Logix.Resource.make({
        id: 'demo/query-refresh-all/search',
        keySchema: Schema.Struct({ q: Schema.String }),
        load: (key: { readonly q: string }) =>
          Effect.sync(() => {
            searchCalls += 1
            return { q: key.q }
          }).pipe(Effect.delay(Duration.millis(10))),
      })

      let detailCalls = 0
      const DetailSpec = Logix.Resource.make({
        id: 'demo/query-refresh-all/detail',
        keySchema: Schema.Struct({ id: Schema.String }),
        load: (key: { readonly id: string }) =>
          Effect.sync(() => {
            detailCalls += 1
            return { id: key.id }
          }).pipe(Effect.delay(Duration.millis(10))),
      })

      const ParamsSchema = Schema.Struct({
        q: Schema.String,
        selectedId: Schema.NullOr(Schema.String),
      })

      const module = Query.make('QueryRefreshAllBlueprint', {
        params: ParamsSchema,
        initialParams: { q: 'a', selectedId: null },
        queries: {
          search: {
            resource: SearchSpec,
            deps: ['params.q'],
            triggers: ['manual'],
            concurrency: 'switch',
            key: ({ params }: { readonly params: { readonly q: string } }) => (params.q ? { q: params.q } : undefined),
          },
          detail: {
            resource: DetailSpec,
            deps: ['params.selectedId'],
            triggers: ['manual'],
            concurrency: 'switch',
            key: ({ params }: { readonly params: { readonly selectedId: string | null } }) =>
              params.selectedId ? { id: params.selectedId } : undefined,
          },
        },
      })

      const runtime = Logix.Runtime.make(module.impl, {
        layer: Layer.mergeAll(
          Logix.Resource.layer([SearchSpec, DetailSpec]),
          Query.Engine.layer(Query.TanStack.engine(new QueryClient())),
        ),
        middleware: [Query.Engine.middleware()],
      })

      const program = Effect.gen(function* () {
        const rt = yield* module.tag
        const controller = module.controller.make(rt)

        // refreshAll: search key is available; detail key is not.
        yield* controller.controller.refresh()

        const state = yield* waitUntil(controller.getState as any, (s: any) => s.queries.search.status === 'success')

        expect(state.queries.search.data).toEqual({ q: 'a' })
        expect(state.queries.detail.status).toBe('idle')
        expect(searchCalls).toBe(1)
        expect(detailCalls).toBe(0)
      })

      yield* Effect.promise(() => runtime.runPromise(program as any))
    }),
  )
})
