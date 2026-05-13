import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import * as RuntimeContracts from '../../src/internal/runtime-contracts.js'
import { makeFieldPathIdRegistry } from '../../src/internal/field-path.js'
import * as SelectorGraph from '../../src/internal/runtime/core/SelectorGraph.js'
import type { TxnDirtyPlanSnapshot } from '../../src/internal/runtime/core/StateTransaction.js'

const makeMissingRegistryPlan = (): TxnDirtyPlanSnapshot => ({
  dirtyAll: false,
  rawPathIds: [0],
  rawKeyHash: 1,
  rawKeySize: 1,
  rootIds: Int32Array.from([0]),
  rootKeyHash: 1,
  rootCount: 1,
  authority: 'missing-registry',
  fieldPathCount: 0,
})

describe('runtime selector broadcast fallback reason contract', () => {
  it.effect('records a reason-coded diagnostic when selector routing must broadcast without path authority', () =>
    Effect.scoped(
      Effect.gen(function* () {
        const ring = CoreDebug.makeRingBufferSink(16)
        const query = RuntimeContracts.Selector.compile(
          Object.assign((state: { readonly count: number }) => state.count, {
            fieldPaths: ['count'],
          }) as any,
        )
        const graph = SelectorGraph.make<{ readonly count: number }>({
          moduleId: 'SelectorBroadcastFallbackModule',
          instanceId: 'missing-registry',
          getFieldPathIdRegistry: () => makeFieldPathIdRegistry([['count']]),
        })
        const lease = yield* graph.retainEntry(query as any, 'topic')

        const changed: Array<string> = []
        yield* Effect.provideService(
          graph.onCommit(
            { count: 1 },
            { txnSeq: 1, txnId: 'missing-registry::t1', commitMode: 'normal', priority: 'normal' },
            makeMissingRegistryPlan(),
            'light',
            (selectorFingerprint) => changed.push(selectorFingerprint),
          ),
          CoreDebug.internal.currentDebugSinks as any,
          [ring.sink as any],
        )

        expect(changed).toEqual([lease.selectorFingerprint])
        const diagnostic = ring.getSnapshot().find((e) => (e as any).code === 'selector_route::dirty_fallback') as any
        expect(diagnostic.trigger.details).toMatchObject({
          dirtyQuality: 'missing-path-authority',
          fallbackKind: 'missing-registry',
          kernelFallbackReason: 'missing_registry',
          dirtyPlanAuthority: 'missing-registry',
        })
      }),
    ),
  )
})
