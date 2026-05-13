import { describe, expect, it } from 'vitest'

import {
  createLiveOperationLedgerStore,
  makeLiveOperationWindowInspectArtifact,
  makeLiveTargetCoordinate,
} from '../../../src/internal/live-bridge-api.js'

const target = makeLiveTargetCoordinate({
  runtimeId: 'runtime-window',
  moduleId: 'WindowModule',
  instanceId: 'default',
})

describe('live operation window contract', () => {
  it('returns a target-scoped ordered operation window with start and end watermarks', () => {
    const store = createLiveOperationLedgerStore({ enabled: true })

    store.recordOperationEvent({ target, eventKind: 'operation.accepted', label: 'accepted' })
    store.recordOperationEvent({ target, eventKind: 'operation.completed', label: 'completed' })
    store.recordOperationEvent({ target, eventKind: 'operation.failed', label: 'failed' })

    const window = store.readWindow({ target, budget: { maxEvents: 10, maxInlineBytes: 4096 } })

    expect(window).toMatchObject({
      kind: 'live.operation.window',
      schemaVersion: 'live-operation-window.v1',
      target,
      targetKey: 'runtime-window/WindowModule/default',
      limit: 10,
      completeness: 'complete',
    })
    expect(window.events.map((event) => event.eventKind)).toEqual([
      'operation.accepted',
      'operation.completed',
      'operation.failed',
    ])
    expect(window.startWatermark.ledgerSeq).toBe(1)
    expect(window.endWatermark.ledgerSeq).toBe(3)
  })

  it('uses cursor reads and reports partial-dropped history when cursor predates retention', () => {
    const store = createLiveOperationLedgerStore({
      enabled: true,
      retention: { maxEvents: 3, maxWindowEvents: 3 },
    })
    const first = store.recordOperationEvent({ target, eventKind: 'operation.accepted', label: 'one' })
    store.recordOperationEvent({ target, eventKind: 'operation.completed', label: 'two' })
    store.recordOperationEvent({ target, eventKind: 'operation.failed', label: 'three' })
    store.recordOperationEvent({ target, eventKind: 'operation.completed', label: 'four' })
    store.recordOperationEvent({ target, eventKind: 'operation.failed', label: 'five' })

    const window = store.readWindow({ target, cursor: first.watermark, budget: { maxEvents: 3, maxInlineBytes: 4096 } })

    expect(window.events.map((event) => event.order.ledgerSeq)).toEqual([3, 4, 5])
    expect(window.completeness).toBe('partial-dropped')
    expect(window.dropped).toEqual([
      expect.objectContaining({
        reason: 'retention.maxEvents',
        droppedCount: 2,
        firstDroppedSeq: 1,
        lastDroppedSeq: 2,
      }),
    ])
  })

  it('keeps cursor window reads synchronous to runtime-owned state without carrier queue effects', () => {
    const store = createLiveOperationLedgerStore({ enabled: true })
    const first = store.recordOperationEvent({ target, eventKind: 'operation.accepted', label: 'one' })
    store.recordOperationEvent({ target, eventKind: 'operation.completed', label: 'two' })
    expect(store.getDiagnostics()).toMatchObject({
      ledgerEventAllocations: 2,
      ledgerWindowProjectionAllocations: 0,
      diagnosticProjectionAllocations: 0,
      carrierQueueEntries: 0,
    })

    const window = store.readWindow({ target, cursor: first.watermark, limit: 10 })

    expect(window.events.map((event) => event.label)).toEqual(['two'])
    expect(window.cursor).toEqual(first.watermark)
    expect(store.getDiagnostics()).toMatchObject({
      ledgerEventAllocations: 2,
      ledgerWindowProjectionAllocations: 1,
      diagnosticProjectionAllocations: 0,
      carrierQueueEntries: 0,
    })
    expect(JSON.stringify(window)).not.toMatch(/daemon|websocket|ipc|retainedOwnerSegment/)
  })

  it('does not backfill latest current state into older events', () => {
    const store = createLiveOperationLedgerStore({ enabled: true })
    const first = store.recordOperationEvent({ target, eventKind: 'operation.accepted', label: 'first' })
    const second = store.recordOperationEvent({
      target,
      eventKind: 'operation.completed',
      label: 'second',
      stateAfter: { sourceKind: 'current-head-exact', boundedSummary: { count: 2 } },
    })

    const window = store.readWindow({ target })
    const firstEvent = window.events.find((event) => event.eventId === first.eventId)
    const secondEvent = window.events.find((event) => event.eventId === second.eventId)

    expect(firstEvent?.stateAfter).toBeUndefined()
    expect(firstEvent?.gaps).toEqual([
      expect.objectContaining({ code: 'missing-state-after-source', owner: 'runtime-live' }),
    ])
    expect(secondEvent?.stateAfter).toMatchObject({
      kind: 'live.stateAfter.sourceRef',
      schemaVersion: 'live-state-after-source-ref.v1',
      eventId: second.eventId,
      sourceKind: 'current-head-exact',
      boundedSummary: { value: { count: 2 }, truncated: false },
    })
  })

  it('drops current-head-exact stateAfter once a later event becomes the head', () => {
    const store = createLiveOperationLedgerStore({ enabled: true })
    const first = store.recordOperationEvent({
      target,
      eventKind: 'operation.completed',
      label: 'head at ingest',
      stateAfter: { sourceKind: 'current-head-exact', boundedSummary: { count: 1 } },
    })
    store.recordOperationEvent({ target, eventKind: 'operation.completed', label: 'new head' })

    const window = store.readWindow({ target })
    const firstEvent = window.events.find((event) => event.eventId === first.eventId)

    expect(firstEvent?.stateAfter).toBeUndefined()
    expect(firstEvent?.gaps).toEqual([
      expect.objectContaining({ code: 'state-after-watermark-mismatch', owner: 'runtime-live' }),
    ])
  })

  it('emits stateAfter gap codes for oversized, redacted and watermark-mismatched sources', () => {
    const store = createLiveOperationLedgerStore({
      enabled: true,
      retention: { maxStateAfterSummaryBytes: 12 },
    })
    const oversized = store.recordOperationEvent({
      target,
      eventKind: 'operation.completed',
      label: 'oversized',
      stateAfter: { sourceKind: 'recorded-post-event-artifact', boundedSummary: { text: 'x'.repeat(64) } },
    })
    const redacted = store.recordOperationEvent({
      target,
      eventKind: 'operation.completed',
      label: 'redacted',
      stateAfter: { sourceKind: 'recorded-post-event-artifact', redacted: true },
    })
    const mismatched = store.recordOperationEvent({
      target,
      eventKind: 'operation.completed',
      label: 'mismatch',
      stateAfter: {
        sourceKind: 'recorded-post-event-artifact',
        sourceWatermark: oversized.watermark,
        boundedSummary: { count: 3 },
      },
    })

    expect(oversized.gaps.map((gap) => gap.code)).toContain('state-after-over-budget')
    expect(redacted.gaps.map((gap) => gap.code)).toContain('state-after-redacted')
    expect(mismatched.gaps.map((gap) => gap.code)).toContain('state-after-watermark-mismatch')
  })

  it('packages operation windows as LiveInspectArtifact section events', () => {
    const store = createLiveOperationLedgerStore({ enabled: true })
    store.recordOperationEvent({ target, eventKind: 'operation.accepted', label: 'accepted' })

    const window = store.readWindow({ target })
    const artifact = makeLiveOperationWindowInspectArtifact({
      target: { ...target, attachmentId: 'attachment-window', adapterKind: 'test' },
      producer: 'live-operation-window.contract',
      operationWindow: window,
    })

    expect(artifact).toMatchObject({
      kind: 'live.inspect.artifact',
      section: 'events',
      facet: {
        sourceAuthority: 'runtime-live',
        payload: {
          schemaVersion: 'live-inspect.v1',
          generatedBy: 'live-operation-window.contract',
          operationWindow: expect.objectContaining({
            kind: 'live.operation.window',
            targetKey: 'runtime-window/WindowModule/default',
          }),
        },
      },
    })
    expect(JSON.stringify(artifact)).not.toMatch(/verdict|repairHints|nextRecommendedStage|passed/)
  })
})
