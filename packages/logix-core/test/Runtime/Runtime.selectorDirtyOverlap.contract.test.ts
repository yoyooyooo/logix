import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import * as RuntimeContracts from '../../src/internal/runtime-contracts.js'
import { makeFieldPathIdRegistry } from '../../src/internal/field-path.js'
import * as SelectorGraph from '../../src/internal/runtime/core/SelectorGraph.js'

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

        const changed: Array<string> = []
        yield* graph.onCommit(
          { count: 1, other: 0 },
          { txnSeq: 1, txnId: 'overlap-i::t1', commitMode: 'normal', priority: 'normal' },
          {
            dirtyAll: false,
            dirtyPathIds: [registry.pathStringToId!.get('count')!],
            dirtyPathsKeyHash: 1,
            dirtyPathsKeySize: 1,
          },
          'off',
          (selectorFingerprint) => changed.push(selectorFingerprint),
        )

        expect(changed).toEqual([RuntimeContracts.Selector.route(countQuery).selectorFingerprint.value])
      }),
    ),
  )
})
