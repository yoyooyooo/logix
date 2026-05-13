import { describe, expect, it } from 'vitest'

import {
  createLiveOperationLedgerStore,
  makeLiveTargetCoordinate,
  makeLiveTimelineInspectArtifact,
} from '../../../src/internal/live-bridge-api.js'

const target = makeLiveTargetCoordinate({
  runtimeId: 'runtime-timeline',
  moduleId: 'TimelineModule',
  instanceId: 'default',
})

describe('live timeline projection contract', () => {
  it('projects an operation window into ordered timeline items with watermarks', () => {
    const store = createLiveOperationLedgerStore({ enabled: true })

    store.recordOperationEvent({
      target,
      eventKind: 'operation.accepted',
      label: 'accepted',
      txnSeq: 1,
      opSeq: 1,
      linkId: 'link:one',
    })
    store.recordOperationEvent({
      target,
      eventKind: 'operation.completed',
      label: 'completed',
      txnSeq: 1,
      opSeq: 2,
      linkId: 'link:one',
      stateAfter: { sourceKind: 'current-head-exact', boundedSummary: { count: 1 } },
    })

    const operationWindow = store.readWindow({ target, budget: { maxEvents: 10, maxInlineBytes: 4096 } })
    const artifact = makeLiveTimelineInspectArtifact({
      target: { ...target, attachmentId: 'attachment-timeline', adapterKind: 'test' },
      producer: 'live-timeline-projection.contract',
      operationWindow,
    })
    const payload = artifact.facet.payload as any

    expect(artifact).toMatchObject({
      kind: 'live.inspect.artifact',
      section: 'timeline',
      facet: {
        sourceAuthority: 'runtime-live',
        payload: {
          schemaVersion: 'live-inspect.v1',
          generatedBy: 'live-timeline-projection.contract',
          timeline: {
            kind: 'live.timeline.projection',
            targetKey: 'runtime-timeline/TimelineModule/default',
            completeness: 'complete',
          },
        },
      },
    })
    expect(payload.timeline.items.map((item: any) => item.eventKind)).toEqual([
      'operation.accepted',
      'operation.completed',
    ])
    expect(payload.timeline.items.map((item: any) => item.order.ledgerSeq)).toEqual([1, 2])
    expect(payload.timeline.items[0].watermark.ledgerSeq).toBe(1)
    expect(payload.timeline.items[1].watermark.ledgerSeq).toBe(2)
    expect(payload.timeline.items[1].stateAfter).toMatchObject({
      kind: 'live.stateAfter.sourceRef',
      sourceKind: 'current-head-exact',
      boundedSummary: { value: { count: 1 } },
    })
    expect(JSON.stringify(artifact)).not.toMatch(/verdict|repairHints|nextRecommendedStage|passed|time-travel|replay/)
  })

  it('preserves stateAfter owner gaps instead of backfilling latest state', () => {
    const store = createLiveOperationLedgerStore({ enabled: true })

    store.recordOperationEvent({
      target,
      eventKind: 'operation.accepted',
      label: 'missing stateAfter',
      txnSeq: 1,
      opSeq: 1,
    })
    store.recordOperationEvent({
      target,
      eventKind: 'operation.completed',
      label: 'head',
      txnSeq: 1,
      opSeq: 2,
      stateAfter: { sourceKind: 'current-head-exact', boundedSummary: { count: 2 } },
    })

    const artifact = makeLiveTimelineInspectArtifact({
      target: { ...target, attachmentId: 'attachment-timeline', adapterKind: 'test' },
      producer: 'live-timeline-projection.contract',
      operationWindow: store.readWindow({ target }),
    })
    const items = ((artifact.facet.payload as any).timeline.items ?? []) as ReadonlyArray<any>

    expect(items[0].stateAfter).toBeUndefined()
    expect(items[0].gaps).toEqual([
      expect.objectContaining({ code: 'missing-state-after-source', owner: 'runtime-live' }),
    ])
    expect(JSON.stringify(items[0])).not.toContain('"count":2')
  })

  it('preserves missing and terminal operation-window gaps as runtime-live timeline gaps', () => {
    const missingStore = createLiveOperationLedgerStore({ enabled: true })
    const missingArtifact = makeLiveTimelineInspectArtifact({
      target: { ...target, attachmentId: 'attachment-timeline', adapterKind: 'test' },
      producer: 'live-timeline-projection.contract',
      operationWindow: missingStore.readWindow({ target }),
    })
    const missingTimeline = (missingArtifact.facet.payload as any).timeline

    expect(missingTimeline.items).toEqual([])
    expect(missingTimeline.completeness).toBe('degraded')
    expect(missingTimeline.gaps).toEqual([
      expect.objectContaining({ code: 'missing-operation-window', owner: 'runtime-live' }),
    ])

    const cleanedStore = createLiveOperationLedgerStore({ enabled: true })
    cleanedStore.recordOperationEvent({ target, eventKind: 'operation.accepted', label: 'before cleanup' })
    cleanedStore.cleanupTarget(target)
    const cleanedArtifact = makeLiveTimelineInspectArtifact({
      target: { ...target, attachmentId: 'attachment-timeline', adapterKind: 'test' },
      producer: 'live-timeline-projection.contract',
      operationWindow: cleanedStore.readWindow({ target }),
    })
    const cleanedTimeline = (cleanedArtifact.facet.payload as any).timeline

    expect(cleanedTimeline.items).toEqual([])
    expect(cleanedTimeline.completeness).toBe('degraded')
    expect(cleanedTimeline.gaps).toEqual([
      expect.objectContaining({ code: 'target-ledger-cleaned', owner: 'runtime-live' }),
    ])
  })

  it('preserves dropped degraded redaction and structured gap markers from ledger windows and events', () => {
    const store = createLiveOperationLedgerStore({
      enabled: true,
      retention: { maxEvents: 1, maxPayloadSummaryBytes: 24 },
    })

    store.recordOperationEvent({ target, eventKind: 'operation.accepted', label: 'evicted' })
    store.recordOperationEvent({
      target,
      eventKind: 'operation.completed',
      label: 'retained',
      payload: { owner: 'runtime-live', summary: { text: 'x'.repeat(128) } },
      redacted: [{ category: 'secret', reason: 'policy' }],
    })

    const artifact = makeLiveTimelineInspectArtifact({
      target: { ...target, attachmentId: 'attachment-timeline', adapterKind: 'test' },
      producer: 'live-timeline-projection.contract',
      operationWindow: store.readWindow({ target, budget: { maxEvents: 10, maxInlineBytes: 4096 } }),
    })
    const timeline = (artifact.facet.payload as any).timeline

    expect(timeline.dropped).toEqual([
      expect.objectContaining({
        reason: 'retention.maxEvents',
        droppedCount: 1,
        firstDroppedSeq: 1,
        lastDroppedSeq: 1,
      }),
    ])
    expect(timeline.degraded).toEqual([
      expect.objectContaining({ reason: 'payload-over-budget' }),
    ])
    expect(timeline.redacted).toEqual([{ category: 'secret', reason: 'policy' }])
    expect(timeline.items[0]).toMatchObject({
      eventKind: 'operation.completed',
      degraded: [expect.objectContaining({ reason: 'payload-over-budget' })],
      redacted: [{ category: 'secret', reason: 'policy' }],
    })
  })

  it('keeps disabled and cleaned timeline projection payload empty with owner gaps', () => {
    const disabledStore = createLiveOperationLedgerStore({ enabled: false })
    disabledStore.recordOperationEvent({ target, eventKind: 'operation.accepted', label: 'disabled' })
    const disabledArtifact = makeLiveTimelineInspectArtifact({
      target: { ...target, attachmentId: 'attachment-timeline', adapterKind: 'test' },
      producer: 'live-timeline-projection.contract',
      operationWindow: disabledStore.readWindow({ target }),
    })
    const disabledTimeline = (disabledArtifact.facet.payload as any).timeline

    expect(disabledTimeline.items).toEqual([])
    expect(disabledTimeline.cursor).toBeUndefined()
    expect(disabledTimeline.gaps).toEqual([
      expect.objectContaining({ code: 'live-ledger-disabled', owner: 'runtime-live' }),
    ])
    expect(disabledStore.getDiagnostics()).toEqual({
      ledgerStoreAllocations: 0,
      ledgerEventAllocations: 0,
      ledgerWindowProjectionAllocations: 0,
      diagnosticProjectionAllocations: 0,
      carrierQueueEntries: 0,
    })

    const cleanedStore = createLiveOperationLedgerStore({ enabled: true })
    cleanedStore.recordOperationEvent({ target, eventKind: 'operation.completed', label: 'before cleanup' })
    cleanedStore.cleanupTarget(target)
    const cleanedArtifact = makeLiveTimelineInspectArtifact({
      target: { ...target, attachmentId: 'attachment-timeline', adapterKind: 'test' },
      producer: 'live-timeline-projection.contract',
      operationWindow: cleanedStore.readWindow({ target }),
    })
    const cleanedTimeline = (cleanedArtifact.facet.payload as any).timeline

    expect(cleanedTimeline.items).toEqual([])
    expect(cleanedTimeline.gaps).toEqual([
      expect.objectContaining({ code: 'target-ledger-cleaned', owner: 'runtime-live' }),
    ])
  })

  it('bounds oversized timeline inspect payloads through degraded artifact payloads', () => {
    const store = createLiveOperationLedgerStore({ enabled: true })

    for (let i = 0; i < 3; i += 1) {
      store.recordOperationEvent({
        target,
        eventKind: 'operation.completed',
        label: `large-${i}`,
        payload: { owner: 'runtime-live', summary: { text: 'x'.repeat(256) } },
      })
    }

    const artifact = makeLiveTimelineInspectArtifact({
      target: { ...target, attachmentId: 'attachment-timeline', adapterKind: 'test' },
      producer: 'live-timeline-projection.contract',
      operationWindow: store.readWindow({ target, budget: { maxEvents: 3, maxInlineBytes: 512 } }),
    })

    expect(artifact.facet.degraded).toEqual({ reason: 'oversized' })
    expect(artifact.facet.payload).toMatchObject({
      _tag: 'oversized',
    })
    expect(JSON.stringify(artifact)).not.toMatch(/repairHints|nextRecommendedStage|passed|time-travel|replay/)
  })
})
