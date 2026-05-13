import { describe, expect, it } from 'vitest'

import {
  makeLiveCaptureFacet,
  makeLiveDaemonRetainedOwnerSegment,
  makeLiveEvidenceGap,
  makeLiveEvidenceLease,
  makeLiveOperationDeniedFacet,
  makeLiveTargetCoordinate,
  toWorkbenchTruthInput,
} from '../../../src/internal/live-bridge-api.js'

const target = makeLiveTargetCoordinate({ runtimeId: 'runtime-1', moduleId: 'module-1', instanceId: 'instance-1' })

describe('live evidence facets', () => {
  it('maps denied operation to canonical live evidence facet with no-mutation guarantee', () => {
    const facet = makeLiveOperationDeniedFacet({
      operationId: 'op-1',
      actorId: 'agent',
      operationKind: 'dispatch.declaredAction',
      target,
      reason: 'unauthorized-target',
      binding: { manifestDigest: 'manifest:current', actionTag: 'submit', bindingStatus: 'matched' },
    })

    expect(facet).toMatchObject({
      kind: 'operation.denied',
      noMutation: true,
      stageClass: 'drilldown-only',
      target,
      reason: 'unauthorized-target',
    })
    expect(JSON.stringify(facet)).not.toMatch(/repairHints|nextRecommendedStage|verdict/)
  })

  it('includes budget, dropped, degraded and redaction markers in capture facets', () => {
    const facet = makeLiveCaptureFacet({
      captureId: 'capture-1',
      captureKind: 'event-window',
      target,
      stageClass: 'host-harness',
      budget: { maxEvents: 256, maxInlineBytes: 4096 },
      dropped: { count: 2, reason: 'over-budget' },
      degraded: { reason: 'partial-window' },
      redacted: [{ category: 'token', reason: 'secret' }],
      artifactRef: { outputKey: 'live-capture-1', kind: 'LiveCapture' },
    })

    expect(facet.budget).toEqual({ maxEvents: 256, maxInlineBytes: 4096 })
    expect(facet.dropped).toEqual({ count: 2, reason: 'over-budget' })
    expect(facet.degraded).toEqual({ reason: 'partial-window' })
    expect(facet.redacted).toEqual([{ category: 'token', reason: 'secret' }])
    expect(facet.artifactRef?.outputKey).toBe('live-capture-1')
  })

  it('models local profile summary as adjunct evidence without Runtime or verification authority', () => {
    const facet = makeLiveCaptureFacet({
      captureId: 'profile-1',
      captureKind: 'profile',
      target,
      stageClass: 'host-harness',
      budget: { maxEvents: 4, maxInlineBytes: 512 },
      localOnly: true,
      profileSummary: {
        authority: 'react-host-adjunct',
        source: 'local-browser',
        sampleCount: 0,
        targetRef: target,
        attachmentId: 'browser:profile',
        linkRefs: ['link:profile-summary'],
      },
      redacted: [{ category: 'profile', reason: 'local-summary-only' }],
      artifactRef: { outputKey: 'live-profile-summary', kind: 'LiveCapture' },
    })

    expect(facet).toMatchObject({
      kind: 'live.capture',
      captureKind: 'profile',
      stageClass: 'host-harness',
      localOnly: true,
      profileSummary: {
        authority: 'react-host-adjunct',
        source: 'local-browser',
        sampleCount: 0,
        targetRef: target,
        attachmentId: 'browser:profile',
        linkRefs: ['link:profile-summary'],
      },
      redacted: [{ category: 'profile', reason: 'local-summary-only' }],
    })
    expect(JSON.stringify(facet)).not.toMatch(/verdict|repairHints|nextRecommendedStage|stateAfter|timeline ordering|Runtime truth/)
  })

  it('converts observation-only missing data to evidence gap', () => {
    const gap = makeLiveEvidenceGap({
      gapId: 'gap-1',
      code: 'no-runtime-attached',
      summary: 'No runtime attached.',
      severity: 'warning',
    })

    expect(gap.kind).toBe('evidence.gap')
    expect(toWorkbenchTruthInput(gap)).toMatchObject({
      kind: 'evidence-gap',
      gapId: 'gap-1',
      code: 'no-runtime-attached',
    })
  })

  it('models explicit evidence leases and daemon retained owner segments as retention-only DTOs', () => {
    const lease = makeLiveEvidenceLease({
      leaseId: 'lease-1',
      workspace: 'workspace-a',
      attachmentId: 'browser:tab-a',
      target,
      purpose: 'export-evidence',
      budget: { maxEvents: 16, maxInlineBytes: 4096 },
      redactionPolicy: { policyRef: 'redaction:default' },
      retentionPolicy: { ttlMs: 30_000, maxBytes: 8192, maxEvents: 16 },
      consumerIdentity: { actorId: 'agent', kind: 'cli' },
    })

    const segment = makeLiveDaemonRetainedOwnerSegment({
      segmentId: 'segment-1',
      target,
      attachmentId: 'browser:tab-a',
      startWatermark: {
        kind: 'live.ledger.watermark',
        schemaVersion: 'live-ledger-watermark.v1',
        target,
        targetKey: 'runtime-1/module-1/instance-1',
        ledgerSeq: 1,
        inlineBytes: 128,
      },
      endWatermark: {
        kind: 'live.ledger.watermark',
        schemaVersion: 'live-ledger-watermark.v1',
        target,
        targetKey: 'runtime-1/module-1/instance-1',
        ledgerSeq: 2,
        inlineBytes: 256,
      },
      ownerEventIds: ['event-1', 'event-2'],
      boundedEventProjections: [{ eventId: 'event-1', label: 'accepted' }],
      artifactRefs: [{ outputKey: 'live-inspect:timeline', kind: 'LiveInspectArtifact' }],
      digests: ['digest:event-1'],
      gaps: [makeLiveEvidenceGap({ gapId: 'gap-2', code: 'redacted-owner-fact', summary: 'Redacted.', severity: 'info', target })],
      redacted: [{ category: 'secret', reason: 'policy' }],
      degraded: [{ reason: 'bounded-retention' }],
      retention: { ttlMs: 30_000, maxBytes: 8192, maxEvents: 16, workspacePartition: 'workspace-a' },
      leaseProvenance: lease,
    })

    expect(lease).toMatchObject({
      schemaVersion: 'live-evidence-lease.v1',
      purpose: 'export-evidence',
      target,
      consumerIdentity: { actorId: 'agent', kind: 'cli' },
    })
    expect(segment).toMatchObject({
      schemaVersion: 'daemon-retained-owner-segment.v1',
      segmentId: 'segment-1',
      target,
      attachmentId: 'browser:tab-a',
      ownerEventIds: ['event-1', 'event-2'],
      retention: { ttlMs: 30_000, maxBytes: 8192, maxEvents: 16, workspacePartition: 'workspace-a' },
      leaseProvenance: expect.objectContaining({ leaseId: 'lease-1' }),
    })
    expect(JSON.stringify(segment)).not.toMatch(/daemonOrder|completenessAuthority|verdict|repairHints|sourceMap|AST|qaReplay/)
  })
})
