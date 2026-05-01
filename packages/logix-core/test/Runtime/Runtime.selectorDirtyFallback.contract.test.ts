import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import * as RuntimeContracts from '../../src/internal/runtime-contracts.js'
import { makeFieldPathIdRegistry } from '../../src/internal/field-path.js'
import * as SelectorGraph from '../../src/internal/runtime/core/SelectorGraph.js'

const makeStaticQuery = () =>
  RuntimeContracts.Selector.compile(
    Object.assign((state: { readonly count: number }) => state.count, {
      fieldPaths: ['count'],
    }) as any,
  )

describe('runtime selector dirty fallback contract', () => {
  it.effect('emits strict dirty fallback diagnostics before dirtyAll evaluate-all', () =>
    Effect.scoped(
      Effect.gen(function* () {
        const ring = CoreDebug.makeRingBufferSink(16)
        const query = makeStaticQuery()
        const graph = SelectorGraph.make<{ readonly count: number }>({
          moduleId: 'DirtyFallbackModule',
          instanceId: 'dirty-i',
          getFieldPathIdRegistry: () => makeFieldPathIdRegistry([['count']]),
        })
        const entry = yield* graph.ensureEntry(query as any)
        entry.subscriberCount = 1

        const changed: Array<string> = []
        yield* Effect.provideService(
          graph.onCommit(
            { count: 1 },
            { txnSeq: 1, txnId: 'dirty-i::t1', commitMode: 'normal', priority: 'normal' },
            {
              dirtyAll: true,
              dirtyAllReason: 'unknownWrite',
              dirtyPathIds: [],
              dirtyPathsKeyHash: 0,
              dirtyPathsKeySize: 0,
            },
            'light',
            (selectorFingerprint) => changed.push(selectorFingerprint),
          ),
          CoreDebug.internal.currentDebugSinks as any,
          [ring.sink as any],
        )

        expect(changed).toHaveLength(1)
        const diagnostic = ring.getSnapshot().find((e) => (e as any).code === 'selector_route::dirty_fallback') as any
        expect(diagnostic).toMatchObject({
          type: 'diagnostic',
          moduleId: 'DirtyFallbackModule',
          instanceId: 'dirty-i',
          txnSeq: 1,
          severity: 'error',
          kind: 'selector_dirty_fallback',
        })
        expect(diagnostic.trigger.details).toMatchObject({
          dirtyQuality: 'dirty-all',
          fallbackKind: 'unknownWrite',
        })
        expect(() => JSON.stringify(diagnostic.trigger.details)).not.toThrow()
      }),
    ),
  )
})
