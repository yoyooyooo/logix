import { describe, it, expect } from 'vitest'
import { it as itFx } from '@effect/vitest'
import { Duration, Effect, Layer, Schema } from 'effect'
import { QueryClient } from '@tanstack/query-core'
import * as Logix from '@logixjs/core'
import * as Query from '../src/index.js'

describe('Query edge cases', () => {
  it('should reject triggers=["manual", ...] (manual must be exclusive)', () => {
    const ParamsSchema = Schema.Struct({ q: Schema.String })

    expect(() =>
      Query.make('QueryEdgeCases.ManualExclusive', {
        params: ParamsSchema,
        initialParams: { q: 'x' },
        queries: ($) => ({
          search: $.source({
            resource: { id: 'demo/edge-cases' },
            deps: ['params.q'],
            triggers: ['manual', 'onMount'],
            concurrency: 'switch',
            key: (q) => ({ q }),
          }),
        }),
      }),
    ).toThrow(/manual/i)
  })

  itFx.scoped('should skip refresh when key(deps) is undefined', () =>
    Effect.gen(function* () {
      let calls = 0
      const Spec = Logix.Resource.make({
        id: 'demo/edge-cases/key-undefined',
        keySchema: Schema.Struct({ q: Schema.String }),
        load: (key: { readonly q: string }) =>
          Effect.sync(() => {
            calls += 1
            return { q: key.q }
          }),
      })

      const ParamsSchema = Schema.Struct({ q: Schema.String })

      const module = Query.make('QueryEdgeCases.KeyUndefined', {
        params: ParamsSchema,
        initialParams: { q: '' },
        queries: ($) => ({
          search: $.source({
            resource: Spec,
            deps: ['params.q'],
            triggers: ['onMount', 'onKeyChange'],
            concurrency: 'switch',
            key: (q) => (q ? { q } : undefined),
          }),
        }),
      })

      const runtime = Logix.Runtime.make(module.impl, {
        layer: Layer.mergeAll(
          Logix.Resource.layer([Spec]),
          Query.Engine.layer(Query.TanStack.engine(new QueryClient())),
        ),
        middleware: [Query.Engine.middleware()],
      })

      const program = Effect.gen(function* () {
        const rt = yield* module.tag
        const controller = module.controller.make(rt)

        // onMount: key undefined -> should not fetch
        yield* Effect.sleep(Duration.millis(30))
        const s0 = yield* controller.getState
        expect(s0.queries.search.status).toBe('idle')
        expect(calls).toBe(0)

        // change to a valid key -> should fetch once
        yield* controller.controller.setParams({ q: 'a' })
        yield* Effect.sleep(Duration.millis(30))
        const s1 = yield* controller.getState
        expect(s1.queries.search.status).toBe('success')
        expect(s1.queries.search.data).toEqual({ q: 'a' })
        expect(calls).toBe(1)
      })

      yield* Effect.promise(() => runtime.runPromise(program as any))
    }),
  )

  itFx.scoped('should behave as "exhaust-trailing" when concurrency="exhaust"', () =>
    Effect.gen(function* () {
      const KeySchema = Schema.Struct({ q: Schema.String })
      type Key = Schema.Schema.Type<typeof KeySchema>

      let calls = 0
      const Spec = Logix.Resource.make<Key, { readonly q: string }, never, never>({
        id: 'demo/edge-cases/exhaust-trailing',
        keySchema: KeySchema,
        load: (key) =>
          Effect.sync(() => {
            calls += 1
            return { q: key.q }
          }).pipe(Effect.delay(Duration.millis(20))),
      })

      const ParamsSchema = Schema.Struct({ q: Schema.String })

      const module = Query.make('QueryEdgeCases.ExhaustTrailing', {
        params: ParamsSchema,
        initialParams: { q: 'q0' },
        queries: ($) => ({
          search: $.source({
            resource: Spec,
            deps: ['params.q'],
            triggers: ['onKeyChange'],
            concurrency: 'exhaust',
            key: (q) => ({ q }),
          }),
        }),
      })

      const runtime = Logix.Runtime.make(module.impl, {
        layer: Layer.mergeAll(
          Logix.Resource.layer([Spec]),
          Query.Engine.layer(Query.TanStack.engine(new QueryClient())),
        ),
        middleware: [Query.Engine.middleware()],
      })

      const program = Effect.gen(function* () {
        const rt = yield* module.tag
        const controller = module.controller.make(rt)

        yield* Effect.forEach(
          Array.from({ length: 10 }, (_, i) => `q${i}`),
          (q) => controller.controller.setParams({ q }),
        )

        // Avoid timer jitter flakiness in parallel test runs: wait until the trailing fetch completes.
        let state = yield* controller.getState
        for (let i = 0; i < 60; i++) {
          const snap: any = (state as any).queries?.search
          if (snap?.status === 'success' && snap?.data?.q === 'q9') break
          yield* Effect.sleep(Duration.millis(10))
          state = yield* controller.getState
        }
        expect(state.queries.search.status).toBe('success')
        expect(state.queries.search.data).toEqual({ q: 'q9' })
        // exhaust-trailing: first + trailing last
        expect(calls).toBe(2)
      })

      yield* Effect.promise(() => runtime.runPromise(program as any))
    }),
  )
})
