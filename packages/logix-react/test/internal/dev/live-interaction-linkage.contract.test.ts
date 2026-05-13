import { describe, expect, it } from 'vitest'
import {
  createLiveOperationLedgerStore,
  makeLiveTargetCoordinate,
} from '@logixjs/core/repo-internal/live-bridge-api'

describe('live interaction linkage evidence contract', () => {
  it('preserves interaction link ids as join refs without using them for ordering', () => {
    const target = makeLiveTargetCoordinate({
      runtimeId: 'runtime-link',
      moduleId: 'InteractionFixture',
      instanceId: 'default',
    })
    const store = createLiveOperationLedgerStore({ enabled: true })

    store.recordOperationEvent({
      target,
      eventKind: 'operation.accepted',
      label: 'dispatch.declaredAction',
      txnSeq: 1,
      opSeq: 2,
      linkId: 'host-interaction:click:submit',
    })
    store.recordOperationEvent({
      target,
      eventKind: 'operation.completed',
      label: 'dispatch.declaredAction',
      txnSeq: 1,
      opSeq: 3,
      linkId: 'host-interaction:click:submit',
    })

    const window = store.readWindow({ target })
    expect(window.events.map((event) => event.linkId)).toEqual([
      'host-interaction:click:submit',
      'host-interaction:click:submit',
    ])
    expect(window.events.map((event) => event.order.coordinate)).toEqual([
      { kind: 'txn-op', txnSeq: 1, opSeq: 2 },
      { kind: 'txn-op', txnSeq: 1, opSeq: 3 },
    ])
  })
})
