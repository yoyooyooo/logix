import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import * as StateTransaction from '../../../src/internal/runtime/core/StateTransaction.js'
import { makeFieldPathIdRegistry } from '../../../src/internal/field-path.js'

const hashSinglePathId = (id: number): number => {
  let hash = 2166136261 >>> 0
  hash ^= id >>> 0
  hash = Math.imul(hash, 16777619)
  return hash >>> 0
}

describe('StateTransaction single dirty path key seeding', () => {
  it.effect('seeds key eagerly for the first unique path and invalidates on multi-path writes', () =>
    Effect.gen(function* () {
      type S = { a: number; b: number }

      const registry = makeFieldPathIdRegistry([['a'], ['b']])
      const ctx = StateTransaction.makeContext<S>({
        moduleId: 'SingleDirtyPathKeyModule',
        instanceId: 'single-dirty-path-key',
        instrumentation: 'light',
        captureSnapshots: false,
        getFieldPathIdRegistry: () => registry,
        now: () => 1,
      })

      StateTransaction.beginTransaction(ctx, { kind: 'unit-test', name: 'txn-single-key' }, { a: 0, b: 0 })
      StateTransaction.recordPatch(ctx, 'a', 'reducer')

      const state = ctx.current as any
      const expectedHashA = hashSinglePathId(0)
      expect(state.dirtyPathIdsKeySize).toBe(1)
      expect(state.dirtyPathIdSnapshot).toEqual([0])
      expect(state.dirtyPathIdsKeyHash).toBe(expectedHashA)

      StateTransaction.recordPatch(ctx, 'a', 'reducer')
      expect(state.dirtyPathIdsKeySize).toBe(1)
      expect(state.dirtyPathIdSnapshot).toEqual([0])
      expect(state.dirtyPathIdsKeyHash).toBe(expectedHashA)

      StateTransaction.recordPatch(ctx, 'b', 'reducer')
      expect(state.dirtyPathIdsKeySize).toBe(2)
      expect(state.dirtyPathIdSnapshot).toEqual([])
      expect(state.dirtyPathIdsKeyHash).toBeUndefined()
    }),
  )
})
