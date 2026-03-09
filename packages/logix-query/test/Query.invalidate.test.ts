import { describe, it, expect } from '@effect/vitest'
import { Duration, Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Query from '../src/index.js'

const ReplayLog = Logix.InternalContracts.ReplayLog

describe('Query.invalidate', () => {
  it.effect('should record invalidate event, call engine.invalidate, and refetch afterwards', () =>
    Effect.gen(function* () {
      const KeySchema = Schema.Struct({ q: Schema.String })
      type Key = Schema.Schema.Type<typeof KeySchema>

      let version = 0
      const spec = Logix.Resource.make<Key, { readonly q: string; readonly v: number }, never, never>({
        id: 'demo/query-invalidate',
        keySchema: KeySchema,
        load: (key) =>
          Effect.sync(() => {
            version += 1
            return { q: key.q, v: version }
          }).pipe(Effect.delay(Duration.millis(10))),
      })

      const ParamsSchema = Schema.Struct({ q: Schema.String })

      const module = Query.make('QueryInvalidateBlueprint', {
        params: ParamsSchema,
        initialParams: { q: 'x' },
        queries: ($) => ({
          search: $.source({
            resource: spec,
            deps: ['params.q'],
            triggers: ['onMount'],
            concurrency: 'switch',
            key: (q) => ({ q }),
          }),
        }),
      })

      const invalidateCalls: Array<Query.InvalidateRequest> = []
      const engine: Query.Engine = {
        fetch: ({ effect }) => effect,
        invalidate: (request) => Effect.sync(() => invalidateCalls.push(request)),
      }

      const runtime = Logix.Runtime.make(module.impl, {
        layer: Layer.mergeAll(Logix.Resource.layer([spec]), Query.Engine.layer(engine), ReplayLog.layer()),
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
          return yield* Effect.fail(new Error('timeout waiting for query state'))
        })

      const program = Effect.gen(function* () {
          const rt = yield* Effect.service(module.tag).pipe(Effect.orDie)
        const controller = module.controller.make(rt)

        // onMount: first load
        const s1 = yield* waitUntil(controller.getState as any, (s: any) => s.queries.search.status === 'success')
        const v1 = s1.queries.search.data?.v as number
        expect(v1).toBe(1)

        // Invalidate: should emit an event, call engine.invalidate, and trigger a refresh to get a new version.
        yield* controller.controller.invalidate({
          kind: 'byResource',
          resourceId: spec.id,
        })

        // After invalidation it should enter loading first (data/error become undefined).
        const sLoading = yield* waitUntil(controller.getState as any, (s: any) => s.queries.search.status === 'loading')
        expect(sLoading.queries.search.data).toBeUndefined()
        expect(sLoading.queries.search.error).toBeUndefined()

        const s2 = yield* waitUntil(controller.getState as any, (s: any) => s.queries.search.status === 'success' && s.queries.search.data?.v === 2)
        const v2 = s2.queries.search.data?.v as number
        expect(v2).toBe(2)

        expect(invalidateCalls).toHaveLength(1)
        expect(invalidateCalls[0]).toEqual({ kind: 'byResource', resourceId: spec.id })

        const events = yield* ReplayLog.snapshot
        const invalidateEvents = events.filter((e) => e._tag === 'InvalidateRequest')
        expect(invalidateEvents.length).toBeGreaterThan(0)
        expect((invalidateEvents[0] as any).meta).toEqual({
          kind: 'byResource',
          resourceId: spec.id,
        })
      })

      yield* Effect.promise(() => runtime.runPromise(program as any))
    }),
  )

  it.effect('byTag should refresh tagged queries only (fallback to all if no tags match)', () =>
    Effect.gen(function* () {
      const KeySchema = Schema.Struct({ q: Schema.String })
      type Key = Schema.Schema.Type<typeof KeySchema>

      let loadCallsA = 0
      const specA = Logix.Resource.make<Key, { readonly q: string; readonly v: number }, never, never>({
        id: 'demo/query-invalidate-byTag/A',
        keySchema: KeySchema,
        load: (key) =>
          Effect.sync(() => {
            loadCallsA += 1
            return { q: key.q, v: loadCallsA }
          }).pipe(Effect.delay(Duration.millis(10))),
      })

      let loadCallsB = 0
      const specB = Logix.Resource.make<Key, { readonly q: string; readonly v: number }, never, never>({
        id: 'demo/query-invalidate-byTag/B',
        keySchema: KeySchema,
        load: (key) =>
          Effect.sync(() => {
            loadCallsB += 1
            return { q: key.q, v: loadCallsB }
          }).pipe(Effect.delay(Duration.millis(10))),
      })

      const ParamsSchema = Schema.Struct({ q: Schema.String })

      const module = Query.make('QueryInvalidateByTagBlueprint', {
        params: ParamsSchema,
        initialParams: { q: 'x' },
        queries: ($) => ({
          a: $.source({
            resource: specA,
            deps: ['params.q'],
            triggers: ['onMount'],
            tags: ['user'],
            concurrency: 'switch',
            key: (q) => ({ q }),
          }),
          b: $.source({
            resource: specB,
            deps: ['params.q'],
            triggers: ['onMount'],
            tags: ['order'],
            concurrency: 'switch',
            key: (q) => ({ q }),
          }),
        }),
      })

      const invalidateCalls: Array<Query.InvalidateRequest> = []
      const engine: Query.Engine = {
        fetch: ({ effect }) => effect,
        invalidate: (request) => Effect.sync(() => invalidateCalls.push(request)),
      }

      const runtime = Logix.Runtime.make(module.impl, {
        layer: Layer.mergeAll(Logix.Resource.layer([specA, specB]), Query.Engine.layer(engine), ReplayLog.layer()),
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
          return yield* Effect.fail(new Error('timeout waiting for invalidate-byTag state'))
        })

      const program = Effect.gen(function* () {
          const rt = yield* Effect.service(module.tag).pipe(Effect.orDie)
        const controller = module.controller.make(rt)

        // onMount: both a & b load once
        yield* waitUntil(
          Effect.sync(() => ({ a: loadCallsA, b: loadCallsB })),
          ({ a, b }) => a === 1 && b === 1,
        )

        // Tag match: refresh `a` only
        yield* controller.controller.invalidate({ kind: 'byTag', tag: 'user' })
        yield* waitUntil(
          Effect.sync(() => ({ a: loadCallsA, b: loadCallsB })),
          ({ a, b }) => a === 2 && b === 1,
        )
        expect(loadCallsA).toBe(2)
        expect(loadCallsB).toBe(1)

        // No tag match: fall back to refreshing all
        yield* controller.controller.invalidate({ kind: 'byTag', tag: 'unknown' })
        yield* waitUntil(
          Effect.sync(() => ({ a: loadCallsA, b: loadCallsB })),
          ({ a, b }) => a === 3 && b === 2,
        )
        expect(loadCallsA).toBe(3)
        expect(loadCallsB).toBe(2)

        expect(invalidateCalls).toEqual([
          { kind: 'byTag', tag: 'user' },
          { kind: 'byTag', tag: 'unknown' },
        ])
      })

      yield* Effect.promise(() => runtime.runPromise(program as any))
    }),
  )
})
