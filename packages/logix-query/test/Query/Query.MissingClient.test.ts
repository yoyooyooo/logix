import { describe, it, expect } from '@effect/vitest'
import { Duration, Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Query from '../../src/index.js'

describe('Query.MissingClient', () => {
  it.effect('should treat missing Query.Engine as a configuration error', () =>
    Effect.gen(function* () {
      const KeySchema = Schema.Struct({ q: Schema.String })
      type Key = Schema.Schema.Type<typeof KeySchema>

      const spec = Logix.Resource.make<Key, { readonly q: string }, never, never>({
        id: 'demo/query-missing-client',
        keySchema: KeySchema,
        load: (key) => Effect.succeed({ q: key.q }),
      })

      const ParamsSchema = Schema.Struct({ q: Schema.String })

      const module = Query.make('QueryMissingClientBlueprint', {
        params: ParamsSchema,
        initialParams: { q: 'x' },
        queries: ($) => ({
          search: $.source({
            resource: { id: spec.id },
            deps: ['params.q'],
            triggers: ['onMount'],
            concurrency: 'switch',
            key: (q) => ({ q }),
          }),
        }),
      })

      const runtime = Logix.Runtime.make(module.impl, {
        layer: Logix.Resource.layer([spec]) as Layer.Layer<any, never, never>,
        middleware: [Query.Engine.middleware()],
      })

      const waitUntil = <A>(
        read: Effect.Effect<A, never, any>,
        predicate: (value: A) => boolean,
      ): Effect.Effect<A, Error, any> =>
        Effect.gen(function* () {
          for (let i = 0; i < 400; i += 1) {
            const value = yield* read
            if (predicate(value)) return value
            yield* Effect.sleep(Duration.millis(5))
          }
          return yield* Effect.fail(new Error('timeout waiting for query error state'))
        })

      const program = Effect.gen(function* () {
          const rt = yield* Effect.service(module.tag).pipe(Effect.orDie)
        const controller = module.controller.make(rt)

        const state = yield* waitUntil(controller.getState as any, (s: any) => s.queries.search.status === 'error')
        const snapshot = state.queries.search

        expect(snapshot.status).toBe('error')
        expect(snapshot.error).toBeDefined()
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
