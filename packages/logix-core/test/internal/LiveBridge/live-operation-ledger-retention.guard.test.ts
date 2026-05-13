import { describe, expect, it } from 'vitest'

import {
  createLiveOperationLedgerStore,
  makeLiveTargetCoordinate,
} from '../../../src/internal/live-bridge-api.js'

const target = makeLiveTargetCoordinate({
  runtimeId: 'runtime-retention',
  moduleId: 'RetentionModule',
  instanceId: 'default',
})

const must = <T>(value: T | undefined): T => {
  expect(value).toBeDefined()
  return value!
}

describe('live operation ledger retention guard', () => {
  it('keeps the latest retained events and emits dropped markers for evicted sequences', () => {
    const store = createLiveOperationLedgerStore({ enabled: true, retention: { maxEvents: 3 } })

    for (let i = 1; i <= 5; i += 1) {
      store.recordOperationEvent({ target, eventKind: 'operation.completed', label: `event-${i}` })
    }

    const window = store.readWindow({ target, budget: { maxEvents: 10, maxInlineBytes: 4096 } })

    expect(window.events.map((event) => event.order.ledgerSeq)).toEqual([3, 4, 5])
    expect(window.endWatermark.droppedBeforeSeq).toBe(2)
    expect(window.dropped).toEqual([
      expect.objectContaining({
        reason: 'retention.maxEvents',
        droppedCount: 2,
        firstDroppedSeq: 1,
        lastDroppedSeq: 2,
      }),
    ])
  })

  it('moves oversized payloads out of inline summaries and marks degradation', () => {
    const store = createLiveOperationLedgerStore({
      enabled: true,
      retention: { maxPayloadSummaryBytes: 24 },
    })

    const event = must(store.recordOperationEvent({
      target,
      eventKind: 'operation.completed',
      label: 'oversized payload',
      payload: { owner: 'runtime-live', summary: { text: 'x'.repeat(128) } },
    }))

    expect(event.payload).toEqual({
      kind: 'owner-ref',
      owner: 'runtime-live',
      ownerRef: event.eventId,
    })
    expect(event.degraded).toEqual([
      expect.objectContaining({
        reason: 'payload-over-budget',
      }),
    ])
  })

  it('bounds dropped marker retention and coalesces old markers', () => {
    const store = createLiveOperationLedgerStore({
      enabled: true,
      retention: { maxEvents: 1, maxDroppedMarkers: 2 },
    })

    for (let i = 1; i <= 5; i += 1) {
      store.recordOperationEvent({ target, eventKind: 'operation.completed', label: `event-${i}` })
    }

    const ledger = store.getLedger(target)

    expect(ledger?.dropped).toHaveLength(2)
    expect(ledger?.dropped[0]).toMatchObject({
      reason: 'retention.maxEvents',
      droppedCount: 3,
      firstDroppedSeq: 1,
      lastDroppedSeq: 3,
    })
  })
})
