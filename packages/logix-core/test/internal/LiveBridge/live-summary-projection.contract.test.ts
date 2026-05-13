import { describe, expect, it } from 'vitest'

import {
  createFieldRuntimeInspectModel,
  createLiveOperationLedgerStore,
  makeLiveInspectGap,
  makeLiveSummaryInspectArtifact,
  makeLiveTargetCoordinate,
} from '../../../src/internal/live-bridge-api.js'
import { finalizeFieldContributions } from '../../../src/internal/runtime/core/ModuleFields.js'

const target = makeLiveTargetCoordinate({
  runtimeId: 'runtime-summary',
  moduleId: 'SummaryProjectionModule',
  instanceId: 'default',
})

const descriptor = {
  ...target,
  attachmentId: 'attachment-summary',
  adapterKind: 'test' as const,
}

const snapshot = finalizeFieldContributions({
  moduleId: 'SummaryProjectionModule',
  contributions: [
    {
      fields: {
        email: { name: 'Email' },
        emailError: { name: 'Email error' },
        status: { name: 'Status' },
      },
      provenance: {
        originType: 'module',
        originId: 'SummaryProjectionModule',
        originIdKind: 'explicit',
        originLabel: 'module:SummaryProjectionModule',
      },
    },
  ],
}).snapshot

describe('live summary projection contract', () => {
  it('composes operation counts latest marker and field convergence summary from owner projections', () => {
    const ledger = createLiveOperationLedgerStore({ enabled: true })
    ledger.recordOperationEvent({
      target,
      eventKind: 'operation.accepted',
      label: 'accepted',
      txnSeq: 1,
      opSeq: 1,
      linkId: 'link:summary',
    })
    ledger.recordOperationEvent({
      target,
      eventKind: 'capture.eventWindow',
      label: 'captured',
      txnSeq: 1,
      opSeq: 2,
      linkId: 'link:summary',
    })
    const latest = ledger.recordOperationEvent({
      target,
      eventKind: 'operation.completed',
      label: 'completed',
      txnSeq: 1,
      opSeq: 3,
      linkId: 'link:summary',
      redacted: [{ category: 'secret', reason: 'policy' }],
      stateAfter: { sourceKind: 'current-head-exact', boundedSummary: { count: 1 } },
    })
    const operationWindow = ledger.readWindow({ target, budget: { maxEvents: 10, maxInlineBytes: 4096 } })

    const fieldModel = createFieldRuntimeInspectModel({ enabled: true, producer: 'live-summary-projection.contract' })
    const fieldSummaryArtifact = fieldModel.readFieldSummary({
      target: descriptor,
      snapshot,
      changedFieldCount: 2,
      convergenceCauses: [
        { cause: 'validation', fieldPath: 'emailError', count: 2 },
        { cause: 'source-refresh', fieldPath: 'status', count: 1 },
      ],
      latestLedgerWatermarkRef: latest ? { targetKey: latest.targetKey, ledgerSeq: latest.watermark.ledgerSeq, eventId: latest.eventId } : undefined,
      budget: { maxEvents: 4, maxInlineBytes: 4096 },
    })

    const artifact = makeLiveSummaryInspectArtifact({
      target: descriptor,
      producer: 'live-summary-projection.contract',
      operationWindow,
      fieldSummaryArtifact,
    })
    const summary = (artifact.facet.payload as any).summary

    expect(artifact).toMatchObject({
      kind: 'live.inspect.artifact',
      section: 'summary',
      facet: {
        sourceAuthority: 'runtime-live',
        payload: {
          schemaVersion: 'live-inspect.v1',
          generatedBy: 'live-summary-projection.contract',
          summary: {
            kind: 'live.summary.projection',
            targetKey: 'runtime-summary/SummaryProjectionModule/default',
          },
        },
      },
    })
    expect(summary.operation).toMatchObject({
      sourceAuthority: 'runtime-live',
      operationCount: 2,
      eventCount: 3,
      eventKindCounts: {
        'operation.accepted': 1,
        'capture.eventWindow': 1,
        'operation.completed': 1,
      },
      latestEvent: {
        eventId: latest?.eventId,
        eventKind: 'operation.completed',
        label: 'completed',
        order: { ledgerSeq: 3 },
        watermark: { ledgerSeq: 3 },
        txnSeq: 1,
        opSeq: 3,
        linkId: 'link:summary',
      },
    })
    expect(summary.fieldConvergence).toMatchObject({
      sourceAuthority: 'field-runtime',
      fieldSummary: {
        kind: 'live.field.summary',
        fieldCount: 3,
        changedFieldCount: 2,
        convergenceCauses: [
          { cause: 'validation', fieldPath: 'emailError', count: 2 },
          { cause: 'source-refresh', fieldPath: 'status', count: 1 },
        ],
        latestLedgerWatermarkRef: { ledgerSeq: 3, eventId: latest?.eventId },
      },
    })
    expect(summary.redacted).toEqual([{ category: 'secret', reason: 'policy' }])
    expect(JSON.stringify(artifact)).not.toMatch(/operationWindow|boundedSummary|SubscriptionRef|verdict|repairHints|profile sample|render count/)
  })

  it('keeps operation and field summary gaps independent when either owner input is missing', () => {
    const ledger = createLiveOperationLedgerStore({ enabled: true })
    ledger.recordOperationEvent({ target, eventKind: 'operation.accepted', label: 'accepted' })
    const operationWindow = ledger.readWindow({ target })
    const fieldModel = createFieldRuntimeInspectModel({ enabled: true, producer: 'live-summary-projection.contract' })
    const missingFieldSummary = fieldModel.readFieldSummary({ target: descriptor })

    const fieldMissingArtifact = makeLiveSummaryInspectArtifact({
      target: descriptor,
      producer: 'live-summary-projection.contract',
      operationWindow,
      fieldSummaryArtifact: missingFieldSummary,
    })
    const fieldMissingSummary = (fieldMissingArtifact.facet.payload as any).summary

    expect(fieldMissingSummary.operation.eventCount).toBe(1)
    expect(fieldMissingSummary.fieldConvergence).toBeUndefined()
    expect(fieldMissingSummary.gaps).toEqual([
      expect.objectContaining({ owner: 'field-runtime', code: 'missing-latest-field-summary' }),
    ])

    const operationMissingArtifact = makeLiveSummaryInspectArtifact({
      target: descriptor,
      producer: 'live-summary-projection.contract',
      fieldSummaryArtifact: fieldModel.readFieldSummary({ target: descriptor, snapshot }),
    })
    const operationMissingSummary = (operationMissingArtifact.facet.payload as any).summary

    expect(operationMissingSummary.operation).toBeUndefined()
    expect(operationMissingSummary.fieldConvergence.fieldSummary.fieldCount).toBe(3)
    expect(operationMissingSummary.gaps).toEqual([
      expect.objectContaining({ owner: 'runtime-live', code: 'missing-operation-window' }),
    ])
  })

  it('preserves dropped degraded redaction and structured gaps without leaking raw owner internals', () => {
    const ledger = createLiveOperationLedgerStore({
      enabled: true,
      retention: { maxEvents: 1, maxPayloadSummaryBytes: 16 },
    })
    ledger.recordOperationEvent({ target, eventKind: 'operation.accepted', label: 'evicted' })
    ledger.recordOperationEvent({
      target,
      eventKind: 'operation.failed',
      label: 'failed',
      payload: { owner: 'runtime-live', summary: { text: 'x'.repeat(128) } },
      redacted: [{ category: 'payload', reason: 'test-redaction' }],
    })

    const artifact = makeLiveSummaryInspectArtifact({
      target: descriptor,
      producer: 'live-summary-projection.contract',
      operationWindow: ledger.readWindow({ target, budget: { maxEvents: 10, maxInlineBytes: 4096 } }),
      gaps: [
        makeLiveInspectGap({
          gapId: 'live:summary:test-gap',
          code: 'summary-proof-gap',
          summary: 'Structured summary proof gap.',
          severity: 'info',
          target,
          owner: 'runtime-live',
          reopenBar: 'reopen only if summary projection owner law changes',
        }),
      ],
    })
    const summary = (artifact.facet.payload as any).summary

    expect(summary.operation).toMatchObject({
      eventKindCounts: { 'operation.failed': 1 },
      completeness: 'partial-dropped',
      dropped: [
        expect.objectContaining({
          reason: 'retention.maxEvents',
          droppedCount: 1,
          firstDroppedSeq: 1,
          lastDroppedSeq: 1,
        }),
      ],
      degraded: [expect.objectContaining({ reason: 'payload-over-budget' })],
      redacted: [{ category: 'payload', reason: 'test-redaction' }],
    })
    expect(summary.gaps).toEqual([
      expect.objectContaining({ owner: 'runtime-live', code: 'summary-proof-gap' }),
      expect.objectContaining({ owner: 'field-runtime', code: 'missing-field-summary' }),
    ])
    expect(JSON.stringify(summary)).not.toMatch(/operationWindow|boundedSummary|stateAfter|SubscriptionRef|repairHints|nextRecommendedStage|passed/)
  })
})
