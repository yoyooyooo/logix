import { describe, it, expect } from '@effect/vitest'
import { Duration, Effect, Layer, Schema } from 'effect'
import { QueryClient } from '@tanstack/query-core'
import * as Logix from '@logixjs/core'
import * as Query from '../../src/index.js'
import { engine as tanstackEngine } from '../../src/internal/engine/tanstack.js'

describe('Query.Race', () => {
  it.effect('should never let stale result overwrite latest', () =>
    Effect.gen(function* () {
      const KeySchema = Schema.Struct({ q: Schema.String })
      type Key = Schema.Schema.Type<typeof KeySchema>

      const spec = Query.Engine.Resource.make<Key, { readonly q: string }, never, never>({
        id: 'demo/query-race',
        keySchema: KeySchema,
        load: (key) => {
          const index = Number(String(key.q).slice(1))
          const delay = Number.isFinite(index) ? (10 - index) * 10 : 50
          return Effect.sleep(Duration.millis(delay)).pipe(Effect.andThen(() => Effect.succeed({ q: key.q })))
        },
      })

      const ParamsSchema = Schema.Struct({ q: Schema.String })

      const module = Query.make('QueryRaceBlueprint', {
        params: ParamsSchema,
        initialParams: { q: 'q0' },
        queries: ($) => ({
          search: $.source({
            resource: { id: spec.id },
            deps: ['params.q'],
            triggers: ['onKeyChange'],
            concurrency: 'switch',
            key: (q) => ({ q }),
          }),
        }),
      })

      const runtime = Logix.Runtime.make(module, {
        layer: Layer.mergeAll(
          Query.Engine.Resource.layer([spec]),
          Query.Engine.layer(tanstackEngine(new QueryClient())),
        ),
        middleware: [Query.Engine.middleware()],
      })

      const program = Effect.gen(function* () {
          const rt = yield* Effect.service(module.tag).pipe(Effect.orDie)
        const commands = module.commands.make(rt)

        // Rapid param changes: make older requests slower and the last one faster to reproduce a typical race/overwrite risk.
        yield* Effect.forEach(
          Array.from({ length: 10 }, (_, i) => `q${i}`),
          (q) => commands.setParams({ q } as any),
        )

        yield* Effect.sleep(Duration.millis(200))

        const state = yield* commands.getState
        const snapshot = state.queries.search

        expect(snapshot.status).toBe('success')
        expect(snapshot.data).toEqual({ q: 'q9' })
        expect(snapshot.keyHash).toBe(Query.Engine.Resource.keyHash({ q: 'q9' }))
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
