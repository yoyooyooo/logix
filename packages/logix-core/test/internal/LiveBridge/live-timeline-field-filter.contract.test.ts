import { describe, expect, it } from 'vitest'

import {
  createFieldRuntimeInspectModel,
  createLiveOperationLedgerStore,
  joinFieldSemanticPayloadWithLedgerEnvelope,
  makeLiveTargetCoordinate,
  makeLiveTimelineInspectArtifact,
} from '../../../src/internal/live-bridge-api.js'
import { finalizeFieldContributions } from '../../../src/internal/runtime/core/ModuleFields.js'

const target = makeLiveTargetCoordinate({
  runtimeId: 'runtime-timeline-field',
  moduleId: 'TimelineFieldModule',
  instanceId: 'default',
})

const descriptor = {
  ...target,
  attachmentId: 'attachment-timeline-field',
  adapterKind: 'test' as const,
}

const snapshot = finalizeFieldContributions({
  moduleId: 'TimelineFieldModule',
  contributions: [
    {
      fields: {
        email: { name: 'Email' },
        count: { name: 'Count' },
      },
      provenance: {
        originType: 'module',
        originId: 'TimelineFieldModule',
        originIdKind: 'explicit',
        originLabel: 'module:TimelineFieldModule',
      },
    },
  ],
}).snapshot

describe('live timeline field filter contract', () => {
  it('filters timeline items only through 176 field semantic metadata joins', () => {
    const ledger = createLiveOperationLedgerStore({ enabled: true })
    const emailEnvelope = ledger.recordOperationEvent({
      target,
      eventKind: 'diagnostic',
      label: 'z-email-changed',
      txnSeq: 1,
      opSeq: 1,
      linkId: 'link:email',
    })!
    const countEnvelope = ledger.recordOperationEvent({
      target,
      eventKind: 'diagnostic',
      label: 'a-count-changed',
      txnSeq: 1,
      opSeq: 2,
      linkId: 'link:count',
    })!
    const model = createFieldRuntimeInspectModel({ enabled: true, producer: 'live-timeline-field-filter.contract' })
    const emailMetadata = joinFieldSemanticPayloadWithLedgerEnvelope({
      target,
      envelope: emailEnvelope,
      payload: model.makeFieldSemanticEventPayload({
        target: descriptor,
        snapshot,
        fieldPath: 'email',
        semanticEventKind: 'field.changed',
        linkId: 'link:email',
        ledgerWatermark: emailEnvelope.watermark,
        sourceRef: { owner: 'field-runtime', kind: 'field-change', digest: 'field-source:email' },
      }),
    })
    const countMetadata = joinFieldSemanticPayloadWithLedgerEnvelope({
      target,
      envelope: countEnvelope,
      payload: model.makeFieldSemanticEventPayload({
        target: descriptor,
        snapshot,
        fieldPath: 'count',
        semanticEventKind: 'field.changed',
        linkId: 'link:count',
        ledgerWatermark: countEnvelope.watermark,
        sourceRef: { owner: 'field-runtime', kind: 'field-change', digest: 'field-source:count' },
      }),
    })

    const artifact = makeLiveTimelineInspectArtifact({
      target: descriptor,
      producer: 'live-timeline-field-filter.contract',
      operationWindow: ledger.readWindow({ target }),
      fieldFilter: { fieldPath: 'email' },
      fieldEventMetadata: [emailMetadata, countMetadata],
    })
    const timeline = (artifact.facet.payload as any).timeline

    expect(timeline.completeness).toBe('complete')
    expect(timeline.items.map((item: any) => item.label)).toEqual(['z-email-changed'])
    expect(timeline.items[0].field).toMatchObject({
      owner: 'field-runtime',
      fieldPath: 'email',
      semanticEventKind: 'field.changed',
      linkId: 'link:email',
    })
    expect(timeline.items[0].order).toEqual(emailEnvelope.order)
    expect(timeline.items[0].watermark).toEqual(emailEnvelope.watermark)
    expect(JSON.stringify(timeline)).not.toMatch(/raw field|raw graph|SubscriptionRef|runtimeHandle|latestFieldSummary/)
  })

  it('returns field-runtime gaps and degraded completeness when field metadata is unavailable', () => {
    const ledger = createLiveOperationLedgerStore({ enabled: true })
    ledger.recordOperationEvent({
      target,
      eventKind: 'diagnostic',
      label: 'unjoined field event',
      txnSeq: 2,
      opSeq: 1,
      linkId: 'link:missing',
    })

    const artifact = makeLiveTimelineInspectArtifact({
      target: descriptor,
      producer: 'live-timeline-field-filter.contract',
      operationWindow: ledger.readWindow({ target }),
      fieldFilter: { fieldPath: 'email' },
    })
    const timeline = (artifact.facet.payload as any).timeline

    expect(timeline.items).toEqual([])
    expect(timeline.completeness).toBe('degraded')
    expect(timeline.gaps).toEqual([
      expect.objectContaining({ owner: 'field-runtime', code: 'missing-field-event-meta' }),
    ])
  })

  it('preserves field-runtime join mismatch gaps without leaking mismatched events', () => {
    const ledger = createLiveOperationLedgerStore({ enabled: true })
    const envelope = ledger.recordOperationEvent({
      target,
      eventKind: 'diagnostic',
      label: 'mismatched field event',
      txnSeq: 3,
      opSeq: 1,
      linkId: 'link:email',
    })!
    const model = createFieldRuntimeInspectModel({ enabled: true, producer: 'live-timeline-field-filter.contract' })
    const mismatchedMetadata = joinFieldSemanticPayloadWithLedgerEnvelope({
      target,
      envelope,
      payload: model.makeFieldSemanticEventPayload({
        target: descriptor,
        snapshot,
        fieldPath: 'email',
        semanticEventKind: 'field.changed',
        linkId: 'link:other',
      }),
    })

    const artifact = makeLiveTimelineInspectArtifact({
      target: descriptor,
      producer: 'live-timeline-field-filter.contract',
      operationWindow: ledger.readWindow({ target }),
      fieldFilter: { fieldPath: 'email' },
      fieldEventMetadata: [mismatchedMetadata],
    })
    const timeline = (artifact.facet.payload as any).timeline

    expect(timeline.items).toEqual([])
    expect(timeline.completeness).toBe('degraded')
    expect(timeline.gaps).toEqual([
      expect.objectContaining({ owner: 'field-runtime', code: 'field-event-join-mismatch' }),
    ])
    expect(JSON.stringify(timeline)).not.toContain('mismatched field event')
  })
})
