import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import * as RuntimeContracts from '../../src/internal/runtime-contracts.js'
import { makeFieldPathIdRegistry } from '../../src/internal/field-path.js'
import * as SelectorGraph from '../../src/internal/runtime/core/SelectorGraph.js'
import type { TxnDirtyPlanSnapshot } from '../../src/internal/runtime/core/StateTransaction.js'

const makeDirtyPlan = (args: {
  readonly registry: ReturnType<typeof makeFieldPathIdRegistry>
  readonly paths: ReadonlyArray<string>
}): TxnDirtyPlanSnapshot => {
  const ids = args.paths.map((path) => args.registry.pathStringToId!.get(path)!)
  return {
    dirtyAll: false,
    rawPathIds: ids,
    rawKeyHash: 1,
    rawKeySize: ids.length,
    rootIds: Int32Array.from(ids),
    rootKeyHash: 1,
    rootCount: ids.length,
    authority: 'field-path-registry',
    fieldPathCount: args.registry.fieldPaths.length,
  }
}

describe('runtime selector notify fanout contract', () => {
  it.effect('does not notify unrelated read-query topics for exact disjoint dirty roots', () =>
    Effect.scoped(
      Effect.gen(function* () {
        const countQuery = RuntimeContracts.Selector.compile(
          Object.assign((state: { readonly count: number; readonly other: number }) => state.count, {
            fieldPaths: ['count'],
          }) as any,
        )
        const otherQuery = RuntimeContracts.Selector.compile(
          Object.assign((state: { readonly count: number; readonly other: number }) => state.other, {
            fieldPaths: ['other'],
          }) as any,
        )
        const registry = makeFieldPathIdRegistry([['count'], ['other']])
        const graph = SelectorGraph.make<{ readonly count: number; readonly other: number }>({
          moduleId: 'SelectorNotifyFanoutModule',
          instanceId: 'exact-disjoint',
          getFieldPathIdRegistry: () => registry,
        })

        const countLease = yield* graph.retainEntry(countQuery as any, 'topic')
        const otherLease = yield* graph.retainEntry(otherQuery as any, 'topic')

        const changed: Array<string> = []
        yield* graph.onCommit(
          { count: 1, other: 0 },
          { txnSeq: 1, txnId: 'exact-disjoint::t1', commitMode: 'normal', priority: 'normal' },
          makeDirtyPlan({ registry, paths: ['count'] }),
          'off',
          (selectorFingerprint) => changed.push(selectorFingerprint),
        )

        expect(changed).toEqual([countLease.selectorFingerprint])
        expect(changed).not.toContain(otherLease.selectorFingerprint)
      }),
    ),
  )

  it.effect('bounds exact dirty fanout to selectors whose reads overlap dirty roots', () =>
    Effect.scoped(
      Effect.gen(function* () {
        const queryA = RuntimeContracts.Selector.compile(
          Object.assign((state: { readonly a: { readonly value: number }; readonly b: { readonly value: number }; readonly c: number }) => state.a.value, {
            fieldPaths: ['a.value'],
          }) as any,
        )
        const queryB = RuntimeContracts.Selector.compile(
          Object.assign((state: { readonly a: { readonly value: number }; readonly b: { readonly value: number }; readonly c: number }) => state.b.value, {
            fieldPaths: ['b.value'],
          }) as any,
        )
        const queryC = RuntimeContracts.Selector.compile(
          Object.assign((state: { readonly a: { readonly value: number }; readonly b: { readonly value: number }; readonly c: number }) => state.c, {
            fieldPaths: ['c'],
          }) as any,
        )
        const registry = makeFieldPathIdRegistry([['a'], ['a', 'value'], ['b'], ['b', 'value'], ['c']])
        const graph = SelectorGraph.make<{ readonly a: { readonly value: number }; readonly b: { readonly value: number }; readonly c: number }>({
          moduleId: 'SelectorNotifyFanoutModule',
          instanceId: 'bounded-overlap',
          getFieldPathIdRegistry: () => registry,
        })

        const leaseA = yield* graph.retainEntry(queryA as any, 'topic')
        const leaseB = yield* graph.retainEntry(queryB as any, 'topic')
        const leaseC = yield* graph.retainEntry(queryC as any, 'topic')

        const changed: Array<string> = []
        yield* graph.onCommit(
          { a: { value: 1 }, b: { value: 2 }, c: 3 },
          { txnSeq: 1, txnId: 'bounded-overlap::t1', commitMode: 'normal', priority: 'normal' },
          makeDirtyPlan({ registry, paths: ['a.value', 'b.value'] }),
          'off',
          (selectorFingerprint) => changed.push(selectorFingerprint),
        )

        expect(new Set(changed)).toEqual(new Set([leaseA.selectorFingerprint, leaseB.selectorFingerprint]))
        expect(changed).not.toContain(leaseC.selectorFingerprint)
      }),
    ),
  )
})
