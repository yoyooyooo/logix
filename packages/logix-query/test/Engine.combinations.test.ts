import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import * as EffectOp from '@logix/core/EffectOp'
import type { Engine as QueryEngine } from '../src/Engine.js'
import * as Query from '../src/index.js'

describe('Query.Engine combinations (layer × middleware)', () => {
  it.effect('should follow the 2×2 semantics', () =>
    Effect.gen(function* () {
      const keyHash = 'kh:demo'
      let loadCalls = 0

      const op = EffectOp.make<string, never, never>({
        kind: 'trait-source',
        name: 'demo/op',
        effect: Effect.sync(() => {
          loadCalls += 1
          return 'load'
        }),
        meta: {
          resourceId: 'demo/resource',
          keyHash,
        },
      })

      // A) no layer, no middleware -> passthrough
      loadCalls = 0
      const a = yield* EffectOp.run(op, [])
      expect(a).toBe('load')
      expect(loadCalls).toBe(1)

      // B) no layer, middleware enabled -> explicit config error
      loadCalls = 0
      const bExit = yield* Effect.exit(EffectOp.run(op, [Query.Engine.middleware()]))
      expect(bExit._tag).toBe('Failure')
      expect(loadCalls).toBe(0)

      // C) layer provided, no middleware -> still passthrough (layer unused)
      loadCalls = 0
      const c = yield* EffectOp.run(op, []).pipe(
        Effect.provide(
          Query.Engine.layer({
            fetch: ({ effect }) => effect,
            invalidate: () => Effect.void,
          } satisfies QueryEngine),
        ),
      )
      expect(c).toBe('load')
      expect(loadCalls).toBe(1)

      // D) layer provided + middleware enabled -> engine fetch takes over
      loadCalls = 0
      let fetchCalls = 0
      const d = yield* EffectOp.run(op, [Query.Engine.middleware()]).pipe(
        Effect.provide(
          Query.Engine.layer({
            fetch: ({ effect }) =>
              Effect.sync(() => {
                fetchCalls += 1
              }).pipe(Effect.zipRight(effect)),
            invalidate: () => Effect.void,
          } satisfies QueryEngine),
        ),
      )
      expect(d).toBe('load')
      expect(fetchCalls).toBe(1)
      expect(loadCalls).toBe(1)
    }),
  )
})
