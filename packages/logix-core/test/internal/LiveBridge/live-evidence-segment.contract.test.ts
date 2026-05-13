import { describe, expect, it } from 'vitest'

import {
  createLiveOperationLedgerStore,
  makeLiveEvidenceLease,
  makeLiveRetainedOwnerSegmentFromWindow,
  makeLiveTargetCoordinate,
} from '../../../src/internal/live-bridge-api.js'

const target = makeLiveTargetCoordinate({
  runtimeId: 'runtime-evidence-segment',
  moduleId: 'EvidenceSegmentModule',
  instanceId: 'default',
})

describe('live evidence retained segment contract', () => {
  it('creates bounded retained owner segments only from explicit allowed evidence leases', () => {
    const store = createLiveOperationLedgerStore({ enabled: true })
    store.recordOperationEvent({ target, eventKind: 'operation.accepted', label: 'accepted', txnSeq: 1, opSeq: 1 })
    store.recordOperationEvent({
      target,
      eventKind: 'operation.completed',
      label: 'completed',
      txnSeq: 1,
      opSeq: 2,
      payload: { owner: 'runtime-live', summary: { result: 'ok' } },
      redacted: [{ category: 'secret', reason: 'policy' }],
    })
    const window = store.readWindow({ target, attachmentId: 'browser:segment', limit: 2 })
    const lease = makeLiveEvidenceLease({
      leaseId: 'lease-segment-1',
      workspace: 'workspace-a',
      attachmentId: 'browser:segment',
      target,
      purpose: 'export-evidence',
      budget: { maxEvents: 2, maxInlineBytes: 4096 },
      redactionPolicy: { policyRef: 'redaction:default' },
      retentionPolicy: { ttlMs: 30_000, maxBytes: 8192, maxEvents: 2, workspacePartition: 'workspace-a' },
      consumerIdentity: { actorId: 'agent', kind: 'cli' },
    })

    const segment = makeLiveRetainedOwnerSegmentFromWindow({
      segmentId: 'segment:lease-segment-1',
      operationWindow: window,
      lease,
    })

    expect(segment).toMatchObject({
      kind: 'daemon.retained.owner.segment',
      schemaVersion: 'daemon-retained-owner-segment.v1',
      segmentId: 'segment:lease-segment-1',
      target,
      attachmentId: 'browser:segment',
      ownerEventIds: [
        'live-ledger:runtime-evidence-segment/EvidenceSegmentModule/default:1',
        'live-ledger:runtime-evidence-segment/EvidenceSegmentModule/default:2',
      ],
      startWatermark: window.startWatermark,
      endWatermark: window.endWatermark,
      retention: { ttlMs: 30_000, maxBytes: 8192, maxEvents: 2, workspacePartition: 'workspace-a' },
      leaseProvenance: expect.objectContaining({
        leaseId: 'lease-segment-1',
        purpose: 'export-evidence',
      }),
    })
    expect(segment.boundedEventProjections).toHaveLength(2)
    expect(segment.boundedEventProjections[1]).toMatchObject({
      eventId: 'live-ledger:runtime-evidence-segment/EvidenceSegmentModule/default:2',
      label: 'completed',
      payload: expect.objectContaining({ owner: 'runtime-live' }),
    })
    expect(segment.redacted).toEqual([{ category: 'secret', reason: 'policy' }])
    expect(JSON.stringify(segment)).not.toMatch(/verdict|repairHints|rawState|runtimeHandle|SubscriptionRef/)
  })

  it('rejects unsupported lease purpose before creating retained owner segments', () => {
    expect(() =>
      makeLiveEvidenceLease({
        leaseId: 'lease-bad',
        workspace: 'workspace-a',
        attachmentId: 'browser:segment',
        target,
        purpose: 'adhoc-debug' as never,
        budget: { maxEvents: 2, maxInlineBytes: 4096 },
        redactionPolicy: { policyRef: 'redaction:default' },
        retentionPolicy: { ttlMs: 30_000, maxBytes: 8192, maxEvents: 2, workspacePartition: 'workspace-a' },
        consumerIdentity: { actorId: 'agent', kind: 'cli' },
      }),
    ).toThrow(/unsupported evidence lease purpose/)
  })
})
