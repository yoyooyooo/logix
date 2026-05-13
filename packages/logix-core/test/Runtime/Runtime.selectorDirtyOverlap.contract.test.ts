import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import * as RuntimeContracts from '../../src/internal/runtime-contracts.js'
import { makeFieldPathIdRegistry } from '../../src/internal/field-path.js'
import * as SelectorGraph from '../../src/internal/runtime/core/SelectorGraph.js'
import type { TxnDirtyPlanSnapshot } from '../../src/internal/runtime/core/StateTransaction.js'
import {
  disableTxnHotPathSentinels,
  enableTxnHotPathSentinels,
  readTxnHotPathSentinels,
  resetTxnHotPathSentinels,
} from '../../src/internal/runtime/core/txnHotPathSentinels.js'

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

describe('runtime selector dirty overlap contract', () => {
  it.effect('notifies only overlapping exact selectors by fingerprint', () =>
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
          moduleId: 'DirtyOverlapModule',
          instanceId: 'overlap-i',
          getFieldPathIdRegistry: () => registry,
        })

        const countEntry = yield* graph.ensureEntry(countQuery as any)
        countEntry.subscriberCount = 1
        const otherEntry = yield* graph.ensureEntry(otherQuery as any)
        otherEntry.subscriberCount = 1

        enableTxnHotPathSentinels()
        resetTxnHotPathSentinels()

        const changed: Array<string> = []
        yield* graph.onCommit(
          { count: 1, other: 0 },
          { txnSeq: 1, txnId: 'overlap-i::t1', commitMode: 'normal', priority: 'normal' },
          makeDirtyPlan({ registry, paths: ['count'] }),
          'off',
          (selectorFingerprint) => changed.push(selectorFingerprint),
        )

        const sentinels = readTxnHotPathSentinels()
        disableTxnHotPathSentinels()

        expect(changed).toEqual([RuntimeContracts.Selector.route(countQuery).selectorFingerprint.value])
        expect(sentinels.selectorDirtySingleRootFastPathCount).toBe(1)
      }),
    ),
  )

  it.effect('notifies child read when parent dirty root changes', () =>
    Effect.scoped(
      Effect.gen(function* () {
        const query = RuntimeContracts.Selector.compile(
          Object.assign((state: { readonly user: { readonly name: string } }) => state.user.name, {
            fieldPaths: ['user.name'],
          }) as any,
        )
        const registry = makeFieldPathIdRegistry([['user'], ['user', 'name']])
        const graph = SelectorGraph.make<{ readonly user: { readonly name: string } }>({
          moduleId: 'DirtyOverlapModule',
          instanceId: 'overlap-parent',
          getFieldPathIdRegistry: () => registry,
        })

        const entry = yield* graph.ensureEntry(query as any)
        entry.subscriberCount = 1

        const changed: Array<string> = []
        yield* graph.onCommit(
          { user: { name: 'Ada' } },
          { txnSeq: 1, txnId: 'overlap-parent::t1', commitMode: 'normal', priority: 'normal' },
          makeDirtyPlan({ registry, paths: ['user'] }),
          'off',
          (selectorFingerprint) => changed.push(selectorFingerprint),
        )

        expect(changed).toEqual([RuntimeContracts.Selector.route(query).selectorFingerprint.value])
      }),
    ),
  )

  it.effect('notifies parent read when child dirty root changes', () =>
    Effect.scoped(
      Effect.gen(function* () {
        const query = RuntimeContracts.Selector.compile(
          Object.assign((state: { readonly user: { readonly name: string } }) => state.user, {
            fieldPaths: ['user'],
          }) as any,
        )
        const registry = makeFieldPathIdRegistry([['user'], ['user', 'name']])
        const graph = SelectorGraph.make<{ readonly user: { readonly name: string } }>({
          moduleId: 'DirtyOverlapModule',
          instanceId: 'overlap-child',
          getFieldPathIdRegistry: () => registry,
        })

        const entry = yield* graph.ensureEntry(query as any)
        entry.subscriberCount = 1

        const changed: Array<string> = []
        yield* graph.onCommit(
          { user: { name: 'Ada' } },
          { txnSeq: 1, txnId: 'overlap-child::t1', commitMode: 'normal', priority: 'normal' },
          makeDirtyPlan({ registry, paths: ['user.name'] }),
          'off',
          (selectorFingerprint) => changed.push(selectorFingerprint),
        )

        expect(changed).toEqual([RuntimeContracts.Selector.route(query).selectorFingerprint.value])
      }),
    ),
  )

  it.effect('does not broadcast selectors with declared reads for an exact empty dirty plan', () =>
    Effect.scoped(
      Effect.gen(function* () {
        const query = RuntimeContracts.Selector.compile(
          Object.assign((state: { readonly count: number }) => state.count, {
            fieldPaths: ['count'],
          }) as any,
        )
        const registry = makeFieldPathIdRegistry([['count']])
        const graph = SelectorGraph.make<{ readonly count: number }>({
          moduleId: 'DirtyOverlapModule',
          instanceId: 'overlap-empty',
          getFieldPathIdRegistry: () => registry,
        })

        const entry = yield* graph.ensureEntry(query as any)
        entry.subscriberCount = 1

        const changed: Array<string> = []
        yield* graph.onCommit(
          { count: 1 },
          { txnSeq: 1, txnId: 'overlap-empty::t1', commitMode: 'normal', priority: 'normal' },
          makeDirtyPlan({ registry, paths: [] }),
          'off',
          (selectorFingerprint) => changed.push(selectorFingerprint),
        )

        expect(changed).toEqual([])
      }),
    ),
  )
})
