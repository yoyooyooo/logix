import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Duration, Effect, Layer, Schema } from 'effect'
import { QueryClient } from '@tanstack/query-core'
import * as Logix from '@logix/core'
import * as Query from '../../src/index.js'

describe('Query.CachePeekSkipLoading', () => {
  it.scoped('should hydrate from fresh cache and skip loading on key change', () =>
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

      const KeySchema = Schema.Struct({ q: Schema.String })

      let loadCalls = 0
      const spec = Logix.Resource.make({
        id: 'demo/query-cache-peek-skip-loading',
        keySchema: KeySchema,
        load: (key: { readonly q: string }) =>
          Effect.sync(() => {
            loadCalls += 1
            return { q: key.q }
          }).pipe(Effect.delay(Duration.millis(10))),
      })

      const ParamsSchema = Schema.Struct({ q: Schema.String })

      const module = Query.make('QueryCachePeekSkipLoadingBlueprint', {
        params: ParamsSchema,
        initialParams: { q: 'a' },
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

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 3600_000,
          },
        },
      })

      const debugEvents: Logix.Debug.Event[] = []
      const debugLayer = Logix.Debug.replace([
        {
          record: (event: Logix.Debug.Event) =>
            Effect.sync(() => {
              debugEvents.push(event)
            }),
        },
      ]) as Layer.Layer<any, never, never>

      const runtime = Logix.Runtime.make(module.impl, {
        layer: Layer.mergeAll(
          Logix.Resource.layer([spec]),
          Query.Engine.layer(Query.TanStack.engine(queryClient)),
          debugLayer,
        ),
        middleware: [Query.Engine.middleware()],
      })

      const program = Effect.gen(function* () {
        const rt = yield* module.tag
        const controller = module.controller.make(rt)

        // onMount: q=a
        yield* waitUntil(controller.getState as any, (s: any) => s.queries.search.status === 'success')

        // change to q=b (will load once)
        yield* controller.controller.setParams({ q: 'b' } as any)
        const stateB = yield* waitUntil(controller.getState as any, (s: any) => s.queries.search?.data?.q === 'b')
        expect(stateB.queries.search.data).toEqual({ q: 'b' })

        // clear event window, then go back to q=a (should hydrate from cache without loading)
        const eventStartIndex = debugEvents.length
        yield* controller.controller.setParams({ q: 'a' } as any)
        const stateA = yield* waitUntil(
          controller.getState as any,
          (s: any) => s.queries.search?.status === 'success' && s.queries.search?.data?.q === 'a',
        )

        expect(stateA.queries.search.status).toBe('success')
        expect(stateA.queries.search.data).toEqual({ q: 'a' })

        // no loading snapshot commit in this window
        const refs = debugEvents
          .slice(eventStartIndex)
          .map((event) => Logix.Debug.internal.toRuntimeDebugEventRef(event))
          .filter((ref): ref is Logix.Debug.RuntimeDebugEventRef => ref != null && ref.kind === 'state')

        expect(
          refs.some((ref) => {
            const meta: any = ref.meta
            const search = meta?.state?.queries?.search
            return search?.status === 'loading'
          }),
        ).toBe(false)

        // only a & b were loaded once each
        expect(loadCalls).toBe(2)
      })

      yield* Effect.promise(() => runtime.runPromise(program as any))
    }),
  )
})
