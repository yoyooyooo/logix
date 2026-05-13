import { describe, expect, it } from '@effect/vitest'
import { Effect, SubscriptionRef } from 'effect'
import { makeFieldPathIdRegistry } from '../../../../src/internal/field-path.js'
import * as StateTransaction from '../../../../src/internal/runtime/core/StateTransaction.js'
import {
  disableTxnHotPathSentinels,
  enableTxnHotPathSentinels,
  readTxnHotPathSentinels,
  resetTxnHotPathSentinels,
} from '../../../../src/internal/runtime/core/txnHotPathSentinels.js'

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

const makePaths = (count: number): ReadonlyArray<ReadonlyArray<string>> => {
  const paths: Array<ReadonlyArray<string>> = []
  for (let i = 0; i < count; i++) {
    paths.push([`f${i}`])
  }
  return paths
}

describe('ModuleRuntime transaction second-order cost sentinels', () => {
  it.effect('does not charge a small transaction for stale dirty buffers left by a previous large transaction', () =>
    withTxnHotPathSentinels(
      Effect.gen(function* () {
        type State = { value: number }
        const largePathCount = 96
        const registry = makeFieldPathIdRegistry(makePaths(largePathCount))
        const stateRef = yield* SubscriptionRef.make<State>({ value: 0 })
        const ctx = StateTransaction.makeContext<State>({
          moduleId: 'ModuleRuntime.txnSecondOrderCosts.LargeThenSmall',
          instanceId: 'large-then-small',
          instrumentation: 'light',
          captureSnapshots: false,
          getFieldPathIdRegistry: () => registry,
          now: () => 1,
        })

        StateTransaction.beginTransaction(ctx, { kind: 'unit-test', name: 'large' }, { value: 0 })
        StateTransaction.updateDraft(ctx, { value: 1 })
        for (let i = 0; i < largePathCount; i++) {
          StateTransaction.recordPatch(ctx, i, 'reducer')
        }
        yield* StateTransaction.commit(ctx, stateRef)

        resetTxnHotPathSentinels()

        StateTransaction.beginTransaction(ctx, { kind: 'unit-test', name: 'small' }, { value: 1 })
        StateTransaction.updateDraft(ctx, { value: 2 })
        StateTransaction.recordPatch(ctx, 0, 'reducer')
        yield* StateTransaction.commit(ctx, stateRef)

        const counters = readTxnHotPathSentinels()
        expect(counters.dirtyBufferClearEntryCount).toBeLessThanOrEqual(1)
        expect(counters.dirtyPlanRawPathArrayMaterializeCount).toBe(1)
        expect(counters.dirtyPlanRawPathArrayMaterializeEntryCount).toBe(1)
        expect(counters.joinSplitInTxnWindowCount).toBe(0)
        expect(counters.dirtyAllFallbackCountP1Gate).toBe(0)
      }),
    ),
  )

  it.effect('reuses the dirtyPlan snapshot within one phase without rematerializing key arrays', () =>
    withTxnHotPathSentinels(
      Effect.gen(function* () {
        type State = { value: number }
        const registry = makeFieldPathIdRegistry(makePaths(8))
        const ctx = StateTransaction.makeContext<State>({
          moduleId: 'ModuleRuntime.txnSecondOrderCosts.DirtyPlanCache',
          instanceId: 'dirty-plan-cache',
          instrumentation: 'light',
          captureSnapshots: false,
          getFieldPathIdRegistry: () => registry,
          now: () => 1,
        })

        StateTransaction.beginTransaction(ctx, { kind: 'unit-test', name: 'dirty-plan-cache' }, { value: 0 })
        StateTransaction.updateDraft(ctx, { value: 1 })
        StateTransaction.recordPatch(ctx, 0, 'reducer')
        StateTransaction.recordPatch(ctx, 1, 'reducer')
        StateTransaction.recordPatch(ctx, 2, 'reducer')

        resetTxnHotPathSentinels()

        const first = StateTransaction.readDirtyPlanSnapshot(ctx)
        const afterFirst = readTxnHotPathSentinels()
        const second = StateTransaction.readDirtyPlanSnapshot(ctx)
        const afterSecond = readTxnHotPathSentinels()

        expect(first).toBeDefined()
        expect(second).toBe(first)
        expect(afterFirst.dirtyPlanRawPathArrayMaterializeCount).toBe(1)
        expect(afterFirst.dirtyPlanRawPathArrayMaterializeEntryCount).toBe(3)
        expect(afterFirst.dirtyPlanRootInt32MaterializeCount).toBe(1)
        expect(afterFirst.dirtyPlanRootInt32MaterializeEntryCount).toBe(3)
        expect(afterSecond.dirtyPlanRawPathArrayMaterializeCount).toBe(
          afterFirst.dirtyPlanRawPathArrayMaterializeCount,
        )
        expect(afterSecond.dirtyPlanRootInt32MaterializeCount).toBe(afterFirst.dirtyPlanRootInt32MaterializeCount)
      }),
    ),
  )
})
