import { describe, expect, it } from 'vitest'

import {
  createLiveOperationLedgerStore,
  makeLiveTimelineInspectArtifact,
  makeLiveTargetCoordinate,
} from '../../../src/internal/live-bridge-api.js'

const target = makeLiveTargetCoordinate({
  runtimeId: 'runtime-disabled',
  moduleId: 'DisabledModule',
  instanceId: 'default',
})

describe('live operation ledger disabled allocation guard', () => {
  it('does not allocate ledger stores, events or windows when live inspect is disabled', () => {
    const store = createLiveOperationLedgerStore({ enabled: false })

    store.recordOperationEvent({ target, eventKind: 'operation.accepted', label: 'disabled' })
    const window = store.readWindow({ target })

    expect(window.gaps).toEqual([expect.objectContaining({ code: 'live-ledger-disabled' })])
    expect(store.getDiagnostics()).toEqual({
      ledgerStoreAllocations: 0,
      ledgerEventAllocations: 0,
      ledgerWindowProjectionAllocations: 0,
      diagnosticProjectionAllocations: 0,
      carrierQueueEntries: 0,
    })
  })

  it('does not allocate cursor or retained segment payloads for disabled cursor timeline reads', () => {
    const store = createLiveOperationLedgerStore({ enabled: false })
    const cursor = {
      kind: 'live.ledger.watermark' as const,
      schemaVersion: 'live-ledger-watermark.v1' as const,
      target,
      targetKey: 'runtime-disabled/DisabledModule/default',
      ledgerSeq: 10,
      inlineBytes: 0,
    }

    const window = store.readWindow({ target, cursor, limit: 5 })
    const artifact = makeLiveTimelineInspectArtifact({
      target: { ...target, attachmentId: 'attachment-disabled', adapterKind: 'test' },
      producer: 'live-operation-ledger-disabled.guard',
      operationWindow: window,
    })
    const timeline = (artifact.facet.payload as any).timeline

    expect(timeline.items).toEqual([])
    expect(timeline.cursor).toBeUndefined()
    expect(timeline.sourceSegments).toEqual([
      expect.objectContaining({
        sourceKind: 'runtime-head',
        gaps: [expect.objectContaining({ code: 'live-ledger-disabled' })],
      }),
    ])
    expect(JSON.stringify(timeline)).not.toMatch(/daemon-retained-segment|leaseProvenance|retainedSegmentRef/)
    expect(store.getDiagnostics()).toEqual({
      ledgerStoreAllocations: 0,
      ledgerEventAllocations: 0,
      ledgerWindowProjectionAllocations: 0,
      diagnosticProjectionAllocations: 0,
      carrierQueueEntries: 0,
    })
  })

  it('does not allocate diagnostics projections when diagnostics are disabled', () => {
    const store = createLiveOperationLedgerStore({ enabled: true, diagnosticsEnabled: false })
    store.addDebugSourceRecord({
      type: 'diagnostic',
      target,
      code: 'disabled',
      severity: 'warning',
      message: 'disabled',
      txnSeq: 1,
      opSeq: 1,
    })

    const window = store.readWindow({ target, eventKinds: ['diagnostic', 'process'] })

    expect(window.events).toEqual([])
    expect(window.gaps).toEqual([expect.objectContaining({ code: 'diagnostics-disabled' })])
    expect(store.getDiagnostics().diagnosticProjectionAllocations).toBe(0)
  })
})
