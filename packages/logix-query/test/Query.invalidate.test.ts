import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Duration, Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Query from '../src/index.js'

const ReplayLog = Logix.InternalContracts.ReplayLog

describe('Query.invalidate', () => {
  it.scoped('should record invalidate event, call engine.invalidate, and refetch afterwards', () =>
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

      const program = Effect.gen(function* () {
        const rt = yield* module.tag
        const controller = module.controller.make(rt)

        // onMount: first load
        yield* Effect.sleep(Duration.millis(30))
        const s1 = yield* controller.getState
        expect(s1.queries.search.status).toBe('success')
        const v1 = s1.queries.search.data?.v as number
        expect(v1).toBe(1)

        // Invalidate: should emit an event, call engine.invalidate, and trigger a refresh to get a new version.
        yield* controller.controller.invalidate({
          kind: 'byResource',
          resourceId: spec.id,
        })

        // After invalidation it should enter loading first (data/error become undefined).
        yield* Effect.sleep(Duration.millis(2))
        const sLoading = yield* controller.getState
        expect(sLoading.queries.search.status).toBe('loading')
        expect(sLoading.queries.search.data).toBeUndefined()
        expect(sLoading.queries.search.error).toBeUndefined()

        yield* Effect.sleep(Duration.millis(60))
        const s2 = yield* controller.getState
        expect(s2.queries.search.status).toBe('success')
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

  it.scoped('byTag should refresh tagged queries only (fallback to all if no tags match)', () =>
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

      const waitFor = (predicate: () => boolean, timeoutMs: number): Effect.Effect<void, never> =>
        Effect.gen(function* () {
          const deadline = Date.now() + timeoutMs
          while (!predicate()) {
            if (Date.now() >= deadline) return
            yield* Effect.sleep(Duration.millis(20))
          }
        })

      const program = Effect.gen(function* () {
        const rt = yield* module.tag
        const controller = module.controller.make(rt)

        // onMount: both a & b load once
        yield* waitFor(() => loadCallsA >= 1 && loadCallsB >= 1, 1000)
        expect(loadCallsA).toBe(1)
        expect(loadCallsB).toBe(1)

        // Tag match: refresh `a` only
        yield* controller.controller.invalidate({ kind: 'byTag', tag: 'user' })
        yield* waitFor(() => loadCallsA >= 2, 1000)
        expect(loadCallsA).toBe(2)
        expect(loadCallsB).toBe(1)

        // No tag match: fall back to refreshing all
        yield* controller.controller.invalidate({ kind: 'byTag', tag: 'unknown' })
        yield* waitFor(() => loadCallsA >= 3 && loadCallsB >= 2, 1000)
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
