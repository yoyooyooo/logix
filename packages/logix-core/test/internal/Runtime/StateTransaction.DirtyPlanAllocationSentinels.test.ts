import { describe, expect, it } from '@effect/vitest'
import { Effect, SubscriptionRef } from 'effect'
import { makeFieldPathIdRegistry } from '../../../src/internal/field-path.js'
import * as StateTransaction from '../../../src/internal/runtime/core/StateTransaction.js'
import {
  disableTxnHotPathSentinels,
  enableTxnHotPathSentinels,
  readTxnHotPathSentinels,
  resetTxnHotPathSentinels,
} from '../../../src/internal/runtime/core/txnHotPathSentinels.js'

const withTxnHotPathSentinels = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  Effect.acquireUseRelease(
    Effect.sync(() => {
      enableTxnHotPathSentinels()
      resetTxnHotPathSentinels()
    }),
    () => effect,
    () =>
      Effect.sync(() => {
        disableTxnHotPathSentinels()
      }),
  )

const makeContext = () =>
  StateTransaction.makeContext<{
    readonly items: ReadonlyArray<{ readonly name: string }>
  }>({
    moduleId: 'StateTransaction.DirtyPlanAllocationSentinels',
    instanceId: 'dirty-plan-allocation-sentinels',
    instrumentation: 'light',
    captureSnapshots: false,
    now: () => 1,
    getFieldPathIdRegistry: () => makeFieldPathIdRegistry([['items'], ['items', 'name']]),
    getListPathSet: () => new Set(['items']),
  })

const makeState = () => ({
  items: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
})

describe('StateTransaction dirtyPlan allocation sentinels', () => {
  it.effect('memoizes dirtyPlan and listEvidence materialization within one phase', () =>
    withTxnHotPathSentinels(
      Effect.gen(function* () {
        const ctx = makeContext()
        StateTransaction.beginTransaction(ctx, { kind: 'unit-test', name: 'list-evidence-cache' }, makeState())
        StateTransaction.recordPatch(ctx, 'items.1.name', 'reducer')

        resetTxnHotPathSentinels()

        const first = StateTransaction.readDirtyPlanSnapshot(ctx)
        const afterFirst = readTxnHotPathSentinels()
        const second = StateTransaction.readDirtyPlanSnapshot(ctx)
        const afterSecond = readTxnHotPathSentinels()

        expect(first).toBeDefined()
        expect(second).toBe(first)
        expect(first?.list?.indexBindingsSorted.get('items@@')).toEqual(Int32Array.from([1]))
        expect(afterFirst.dirtyPlanRawPathArrayMaterializeCount).toBe(1)
        expect(afterFirst.dirtyPlanRootInt32MaterializeCount).toBe(1)
        expect(afterFirst.dirtyPlanListIndexInt32MaterializeCount).toBe(1)
        expect(afterFirst.dirtyPlanListIndexInt32MaterializeEntryCount).toBe(1)
        expect(afterSecond.dirtyPlanRawPathArrayMaterializeCount).toBe(afterFirst.dirtyPlanRawPathArrayMaterializeCount)
        expect(afterSecond.dirtyPlanRootInt32MaterializeCount).toBe(afterFirst.dirtyPlanRootInt32MaterializeCount)
        expect(afterSecond.dirtyPlanListIndexInt32MaterializeCount).toBe(afterFirst.dirtyPlanListIndexInt32MaterializeCount)
        expect(afterSecond.dirtyPlanListIndexInt32MaterializeEntryCount).toBe(
          afterFirst.dirtyPlanListIndexInt32MaterializeEntryCount,
        )
      }),
    ),
  )

  it.effect('uses shared empty evidence constants without materializing arrays for no-dirty exact plan', () =>
    withTxnHotPathSentinels(
      Effect.gen(function* () {
        const ctx = makeContext()
        StateTransaction.beginTransaction(ctx, { kind: 'unit-test', name: 'empty-exact-plan' }, makeState())

        resetTxnHotPathSentinels()

        const first = StateTransaction.readDirtyPlanSnapshot(ctx)
        const second = StateTransaction.readDirtyPlanSnapshot(ctx)
        const counters = readTxnHotPathSentinels()

        expect(first).toBeDefined()
        expect(second).toBe(first)
        expect(first?.dirtyAll).toBe(false)
        expect(first?.rawKeySize).toBe(0)
        expect(first?.rootCount).toBe(0)
        expect(counters.dirtyPlanRawPathArrayMaterializeCount).toBe(0)
        expect(counters.dirtyPlanRootInt32MaterializeCount).toBe(0)
        expect(counters.dirtyPlanListIndexInt32MaterializeCount).toBe(0)
      }),
    ),
  )

  it.effect('does not charge a small transaction for large previous dirty/list buffers', () =>
    withTxnHotPathSentinels(
      Effect.gen(function* () {
        const registry = makeFieldPathIdRegistry([
          ['items'],
          ...Array.from({ length: 96 }, (_, i) => ['items', `f${i}`]),
        ])
        const ctx = StateTransaction.makeContext<Record<string, unknown>>({
          moduleId: 'StateTransaction.DirtyPlanAllocationSentinels',
          instanceId: 'large-then-small-list',
          instrumentation: 'light',
          captureSnapshots: false,
          now: () => 1,
          getFieldPathIdRegistry: () => registry,
          getListPathSet: () => new Set(['items']),
        })
        const stateRef = yield* SubscriptionRef.make<Record<string, unknown>>({})

        StateTransaction.beginTransaction(ctx, { kind: 'unit-test', name: 'large' }, {})
        StateTransaction.updateDraft(ctx, { large: true })
        for (let i = 0; i < 96; i++) {
          StateTransaction.recordPatch(ctx, `items.${i}.f${i}`, 'reducer')
        }
        yield* StateTransaction.commit(ctx, stateRef)

        resetTxnHotPathSentinels()

        StateTransaction.beginTransaction(ctx, { kind: 'unit-test', name: 'small' }, { large: true })
        StateTransaction.updateDraft(ctx, { large: true, small: true })
        StateTransaction.recordPatch(ctx, 'items.0.f0', 'reducer')
        yield* StateTransaction.commit(ctx, stateRef)

        const counters = readTxnHotPathSentinels()
        expect(counters.dirtyBufferClearEntryCount).toBeLessThanOrEqual(2)
        expect(counters.dirtyPlanRawPathArrayMaterializeEntryCount).toBe(1)
        expect(counters.dirtyPlanRootInt32MaterializeEntryCount).toBe(1)
      }),
    ),
  )
})
