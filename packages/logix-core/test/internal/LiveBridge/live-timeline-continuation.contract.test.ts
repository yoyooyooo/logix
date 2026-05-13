import { describe, expect, it } from 'vitest'

import {
  createLiveOperationLedgerStore,
  decodeLiveTimelineCursorToken,
  makeLiveTimelineContinuationGap,
  makeLiveTargetCoordinate,
  makeLiveTimelineInspectArtifact,
} from '../../../src/internal/live-bridge-api.js'

const target = makeLiveTargetCoordinate({
  runtimeId: 'runtime-180-timeline',
  moduleId: 'TimelineContinuationModule',
  instanceId: 'default',
})

describe('live timeline continuation contract', () => {
  it('issues opaque cursor.next and continues after the Runtime watermark without duplicates', () => {
    const store = createLiveOperationLedgerStore({ enabled: true })
    store.recordOperationEvent({ target, eventKind: 'operation.accepted', label: 'accepted-1', txnSeq: 1, opSeq: 1 })
    store.recordOperationEvent({ target, eventKind: 'operation.completed', label: 'completed-1', txnSeq: 1, opSeq: 2 })

    const firstWindow = store.readWindow({ target, limit: 2, budget: { maxEvents: 2, maxInlineBytes: 4096 } })
    const firstArtifact = makeLiveTimelineInspectArtifact({
      target: { ...target, attachmentId: 'browser:180', adapterKind: 'test' },
      producer: 'live-timeline-continuation.contract',
      operationWindow: firstWindow,
    })
    const firstTimeline = (firstArtifact.facet.payload as any).timeline

    expect(firstTimeline.cursor?.next).toEqual(expect.any(String))
    expect(firstTimeline.cursor.next).not.toContain('"watermark"')
    expect(firstTimeline.sourceSegments).toEqual([
      expect.objectContaining({
        sourceKind: 'runtime-head',
        startWatermark: firstWindow.startWatermark,
        endWatermark: firstWindow.endWatermark,
        completeness: 'complete',
        gaps: [],
      }),
    ])
    expect(firstTimeline.safeResumeBoundary).toEqual(
      expect.objectContaining({
        resumeWatermark: firstWindow.endWatermark,
        reason: 'complete-window',
      }),
    )

    const certificate = decodeLiveTimelineCursorToken(firstTimeline.cursor.next)
    expect(certificate).toMatchObject({
      schemaVersion: 'live-timeline-cursor.v1',
      targetKey: firstWindow.targetKey,
      attachmentId: 'browser:180',
      runtimeResumeWatermark: firstWindow.endWatermark,
      coverageEndWatermark: firstWindow.endWatermark,
      completenessAtIssue: 'complete',
      queryFingerprint: {
        targetKey: firstWindow.targetKey,
        attachmentId: 'browser:180',
        projectionSchemaVersion: 'live-timeline.v1',
        redactionPolicyDigest: 'redaction:default',
        projectionMode: 'timeline-default',
      },
    })

    store.recordOperationEvent({ target, eventKind: 'operation.completed', label: 'completed-2', txnSeq: 2, opSeq: 1 })
    const continuedWindow = store.readWindow({
      target,
      cursor: certificate!.runtimeResumeWatermark,
      limit: 2,
      budget: { maxEvents: 2, maxInlineBytes: 4096 },
    })
    const continuedArtifact = makeLiveTimelineInspectArtifact({
      target: { ...target, attachmentId: 'browser:180', adapterKind: 'test' },
      producer: 'live-timeline-continuation.contract',
      operationWindow: continuedWindow,
    })
    const continuedTimeline = (continuedArtifact.facet.payload as any).timeline

    expect(continuedTimeline.items.map((item: any) => item.label)).toEqual(['completed-2'])
    expect(continuedTimeline.items.map((item: any) => item.watermark.ledgerSeq)).toEqual([3])
  })

  it('keeps limit outside the same-query cursor fingerprint', () => {
    const store = createLiveOperationLedgerStore({ enabled: true })
    store.recordOperationEvent({ target, eventKind: 'operation.accepted', label: 'accepted', txnSeq: 1, opSeq: 1 })
    store.recordOperationEvent({ target, eventKind: 'operation.completed', label: 'completed', txnSeq: 1, opSeq: 2 })

    const one = makeLiveTimelineInspectArtifact({
      target: { ...target, attachmentId: 'browser:180', adapterKind: 'test' },
      producer: 'live-timeline-continuation.contract',
      operationWindow: store.readWindow({ target, limit: 1, budget: { maxEvents: 1, maxInlineBytes: 4096 } }),
    })
    const two = makeLiveTimelineInspectArtifact({
      target: { ...target, attachmentId: 'browser:180', adapterKind: 'test' },
      producer: 'live-timeline-continuation.contract',
      operationWindow: store.readWindow({ target, limit: 2, budget: { maxEvents: 2, maxInlineBytes: 4096 } }),
    })

    const oneCursor = decodeLiveTimelineCursorToken(((one.facet.payload as any).timeline.cursor.next))
    const twoCursor = decodeLiveTimelineCursorToken(((two.facet.payload as any).timeline.cursor.next))

    expect(oneCursor?.queryFingerprint).toEqual(twoCursor?.queryFingerprint)
  })

  it('projects continuous runtime head and daemon retained source segment chains', () => {
    const store = createLiveOperationLedgerStore({ enabled: true })
    const retainedEvent = store.recordOperationEvent({ target, eventKind: 'operation.accepted', label: 'retained', txnSeq: 1, opSeq: 1 })
    const headEvent = store.recordOperationEvent({ target, eventKind: 'operation.completed', label: 'head', txnSeq: 1, opSeq: 2 })
    const headWindow = store.readWindow({ target, cursor: retainedEvent.watermark, limit: 1 })
    const artifact = makeLiveTimelineInspectArtifact({
      target: { ...target, attachmentId: 'browser:180', adapterKind: 'test' },
      producer: 'live-timeline-continuation.contract',
      operationWindow: headWindow,
      sourceSegments: [
        {
          sourceKind: 'daemon-retained-segment',
          target: { ...target, attachmentId: 'browser:180', adapterKind: 'test' },
          attachmentId: 'browser:180',
          startWatermark: retainedEvent.watermark,
          endWatermark: retainedEvent.watermark,
          completeness: 'complete',
          gaps: [],
          dropped: [],
          degraded: [],
          redacted: [],
          retainedSegmentRef: 'retained-segment:one',
        },
      ],
    })
    const timeline = (artifact.facet.payload as any).timeline

    expect(timeline.sourceSegments.map((segment: any) => segment.sourceKind)).toEqual([
      'daemon-retained-segment',
      'runtime-head',
    ])
    expect(timeline.sourceSegments[0]).toMatchObject({
      retainedSegmentRef: 'retained-segment:one',
      endWatermark: retainedEvent.watermark,
      completeness: 'complete',
    })
    expect(timeline.sourceSegments[1]).toMatchObject({
      startWatermark: headEvent.watermark,
      endWatermark: headEvent.watermark,
      completeness: 'complete',
    })
    expect(timeline.completeness).toBe('complete')
    expect(timeline.items.map((item: any) => item.label)).toEqual(['head'])
  })

  it('marks discontinuous source segment chains partial with safe resume boundary gaps', () => {
    const store = createLiveOperationLedgerStore({ enabled: true })
    const retainedEvent = store.recordOperationEvent({ target, eventKind: 'operation.accepted', label: 'retained', txnSeq: 1, opSeq: 1 })
    store.recordOperationEvent({ target, eventKind: 'operation.failed', label: 'gap', txnSeq: 1, opSeq: 2 })
    const headEvent = store.recordOperationEvent({ target, eventKind: 'operation.completed', label: 'head', txnSeq: 1, opSeq: 3 })
    const headWindow = store.readWindow({ target, cursor: headEvent.watermark, limit: 1 })
    const chainGap = makeLiveTimelineContinuationGap({ code: 'timeline-retention-gap', target })
    const artifact = makeLiveTimelineInspectArtifact({
      target: { ...target, attachmentId: 'browser:180', adapterKind: 'test' },
      producer: 'live-timeline-continuation.contract',
      operationWindow: headWindow,
      sourceSegments: [
        {
          sourceKind: 'daemon-retained-segment',
          target: { ...target, attachmentId: 'browser:180', adapterKind: 'test' },
          attachmentId: 'browser:180',
          startWatermark: retainedEvent.watermark,
          endWatermark: retainedEvent.watermark,
          completeness: 'complete',
          gaps: [],
          dropped: [],
          degraded: [],
          redacted: [],
          retainedSegmentRef: 'retained-segment:stale',
        },
      ],
      gaps: [chainGap],
    })
    const timeline = (artifact.facet.payload as any).timeline

    expect(timeline.completeness).toBe('partial-dropped')
    expect(timeline.gaps).toEqual([expect.objectContaining({ code: 'timeline-retention-gap', owner: 'runtime-live' })])
    expect(timeline.safeResumeBoundary).toEqual(
      expect.objectContaining({
        reason: 'partial-window',
        resumeWatermark: headWindow.endWatermark,
        gaps: [expect.objectContaining({ code: 'timeline-retention-gap' })],
      }),
    )
    expect(JSON.stringify(timeline)).not.toMatch(/daemonOrder|rowId|writeTime|completenessAuthority/)
  })
})
