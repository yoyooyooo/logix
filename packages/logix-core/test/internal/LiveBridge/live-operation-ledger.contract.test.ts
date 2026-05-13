import { describe, expect, it } from 'vitest'

import {
  compareLiveLedgerWatermarks,
  createLiveOperationLedgerStore,
  defaultLiveLedgerRetentionPolicy,
  makeLiveTargetCoordinate,
  type LiveLedgerEventEnvelope,
} from '../../../src/internal/live-bridge-api.js'

const target = makeLiveTargetCoordinate({
  runtimeId: ' runtime-ledger ',
  moduleId: 'LedgerModule',
  instanceId: 'default',
})
const otherTarget = makeLiveTargetCoordinate({
  runtimeId: 'runtime-ledger',
  moduleId: 'LedgerModule',
  instanceId: 'other',
})

const stringify = (value: unknown): string => JSON.stringify(value)

const must = <T>(value: T | undefined): T => {
  expect(value).toBeDefined()
  return value!
}

describe('live operation ledger contract', () => {
  it('creates a runtime-live envelope with target-local order and watermark', () => {
    const store = createLiveOperationLedgerStore({ enabled: true })

    const event = must(store.recordOperationEvent({
      target,
      eventKind: 'operation.accepted',
      label: 'dispatch accepted',
      attachmentId: 'attachment-a',
      budget: { maxEvents: 8, maxInlineBytes: 4096 },
      txnSeq: 12,
      opSeq: 3,
      linkId: 'link-a',
      binding: { manifestDigest: 'manifest:1', actionTag: 'submit', bindingStatus: 'matched' },
    }))

    expect(event).toMatchObject({
      kind: 'live.ledger.event',
      schemaVersion: 'live-ledger-event.v1',
      eventId: 'live-ledger:runtime-ledger/LedgerModule/default:1',
      target,
      targetKey: 'runtime-ledger/LedgerModule/default',
      attachmentId: 'attachment-a',
      eventKind: 'operation.accepted',
      label: 'dispatch accepted',
      sourceAuthority: 'runtime-live',
      txnSeq: 12,
      opSeq: 3,
      linkId: 'link-a',
      order: {
        kind: 'live.ledger.order',
        schemaVersion: 'live-ledger-order.v1',
        targetKey: 'runtime-ledger/LedgerModule/default',
        ledgerSeq: 1,
        coordinate: { kind: 'txn-op', txnSeq: 12, opSeq: 3 },
      },
      watermark: {
        kind: 'live.ledger.watermark',
        schemaVersion: 'live-ledger-watermark.v1',
        target,
        targetKey: 'runtime-ledger/LedgerModule/default',
        ledgerSeq: 1,
        eventId: 'live-ledger:runtime-ledger/LedgerModule/default:1',
        inlineBytes: event.watermark.inlineBytes,
      },
      budget: {
        retention: defaultLiveLedgerRetentionPolicy,
        request: { maxEvents: 8, maxInlineBytes: 4096 },
        inlineBytes: event.budget.inlineBytes,
      },
      dropped: [],
      degraded: [],
      redacted: [],
      gaps: [],
    } satisfies Partial<LiveLedgerEventEnvelope>)
  })

  it('compares same-target watermarks and marks cross-target comparison incomparable', () => {
    const store = createLiveOperationLedgerStore({ enabled: true })
    const first = must(store.recordOperationEvent({ target, eventKind: 'operation.accepted', label: 'one' }))
    const second = must(store.recordOperationEvent({ target, eventKind: 'operation.completed', label: 'two' }))
    const other = must(store.recordOperationEvent({ target: otherTarget, eventKind: 'operation.accepted', label: 'other' }))

    expect(compareLiveLedgerWatermarks(first.watermark, first.watermark)).toBe('same')
    expect(compareLiveLedgerWatermarks(first.watermark, second.watermark)).toBe('before')
    expect(compareLiveLedgerWatermarks(second.watermark, first.watermark)).toBe('after')
    expect(compareLiveLedgerWatermarks(first.watermark, other.watermark)).toBe('incomparable')
  })

  it('keeps linkId as a join key and not an ordering input', () => {
    const store = createLiveOperationLedgerStore({ enabled: true })
    const laterLink = must(store.recordOperationEvent({
      target,
      eventKind: 'diagnostic',
      label: 'later link',
      txnSeq: 2,
      opSeq: 10,
      linkId: 'z-link',
    }))
    const earlierLink = must(store.recordOperationEvent({
      target,
      eventKind: 'diagnostic',
      label: 'earlier link',
      txnSeq: 2,
      opSeq: 11,
      linkId: 'a-link',
    }))

    expect(laterLink.order.ledgerSeq).toBe(1)
    expect(earlierLink.order.ledgerSeq).toBe(2)
    expect(store.readWindow({ target }).events.map((event) => event.linkId)).toEqual(['z-link', 'a-link'])
  })

  it('normalizes diagnostics and process source records only through capture-time pull', () => {
    const store = createLiveOperationLedgerStore({ enabled: true, diagnosticsEnabled: true })
    store.addDebugSourceRecord({
      type: 'diagnostic',
      target,
      code: 'field.invalid',
      severity: 'warning',
      message: 'Field is invalid.',
      txnSeq: 7,
      opSeq: 2,
      linkId: 'diag-link',
      meta: { path: 'email' },
    })
    store.addDebugSourceRecord({
      type: 'process',
      target,
      label: 'process started',
      severity: 'info',
      txnSeq: 8,
      eventSeq: 4,
      linkId: 'process-link',
      meta: { processId: 'sync-user' },
    })

    expect(store.getDiagnostics().ledgerEventAllocations).toBe(0)
    const window = store.readWindow({ target, eventKinds: ['diagnostic', 'process'] })

    expect(window.events.map((event) => event.eventKind)).toEqual(['diagnostic', 'process'])
    expect(window.events[0]).toMatchObject({
      label: 'field.invalid',
      txnSeq: 7,
      opSeq: 2,
      linkId: 'diag-link',
      payload: {
        kind: 'bounded-summary',
        owner: 'runtime-live',
        summary: expect.objectContaining({
          code: 'field.invalid',
          severity: 'warning',
          message: 'Field is invalid.',
        }),
      },
    })
    expect(window.events[1]?.order.coordinate).toEqual({ kind: 'txn-event', txnSeq: 8, eventSeq: 4 })
    expect(store.getDiagnostics().diagnosticProjectionAllocations).toBe(2)
  })

  it('normalizes owner-approved RuntimeDebugEventRef records without making DebugSink the ledger owner', () => {
    const store = createLiveOperationLedgerStore({ enabled: true, diagnosticsEnabled: true })
    store.addRuntimeDebugEventRef(
      {
        eventId: 'debug:1',
        eventSeq: 1,
        moduleId: 'LedgerModule',
        instanceId: 'default',
        runtimeLabel: 'runtime-ledger',
        txnSeq: 9,
        linkId: 'debug-link',
        timestamp: 100,
        kind: 'diagnostic',
        label: 'debug.diagnostic',
        meta: {
          code: 'debug.diagnostic',
          severity: 'warning',
          message: 'Debug ref diagnostic.',
          opSeq: 4,
        },
      },
      target,
    )

    expect(store.getDiagnostics().ledgerEventAllocations).toBe(0)
    const window = store.readWindow({ target, eventKinds: ['diagnostic'] })

    expect(window.events).toHaveLength(1)
    expect(window.events[0]).toMatchObject({
      eventKind: 'diagnostic',
      label: 'debug.diagnostic',
      sourceAuthority: 'runtime-live',
      txnSeq: 9,
      opSeq: 4,
      linkId: 'debug-link',
      payload: {
        kind: 'bounded-summary',
        owner: 'runtime-live',
        summary: expect.objectContaining({
          code: 'debug.diagnostic',
          severity: 'warning',
          message: 'Debug ref diagnostic.',
        }),
      },
    })
  })

  it('preserves degraded and redaction markers during diagnostic normalization', () => {
    const store = createLiveOperationLedgerStore({ enabled: true, diagnosticsEnabled: true })
    const markerSource = must(store.recordOperationEvent({ target, eventKind: 'operation.accepted', label: 'marker-source' }))
    store.addDebugSourceRecord({
      type: 'diagnostic',
      target,
      code: 'diagnostic.redacted',
      severity: 'warning',
      message: 'Diagnostic had redacted metadata.',
      txnSeq: 10,
      opSeq: 1,
      degraded: [
        {
          kind: 'live.ledger.degraded',
          schemaVersion: 'live-ledger-marker.v1',
          target,
          targetKey: 'runtime-ledger/LedgerModule/default',
          reason: 'payload-over-budget',
          summary: 'source marker',
          observedAt: markerSource.watermark,
        },
      ],
      redacted: [{ category: 'pii', reason: 'policy' }],
    })

    const window = store.readWindow({ target, eventKinds: ['diagnostic'] })

    expect(window.events[0]?.degraded).toEqual([
      expect.objectContaining({
        reason: 'payload-over-budget',
        summary: 'source marker',
      }),
    ])
    expect(window.events[0]?.redacted).toEqual([{ category: 'pii', reason: 'policy' }])
  })

  it('returns runtime-live gaps for unsupported debug records and keeps DTOs verdict-free', () => {
    const store = createLiveOperationLedgerStore({ enabled: true, diagnosticsEnabled: true })
    store.addDebugSourceRecord({
      type: 'unsupported',
      target,
      label: 'unsupported source',
      meta: { verdict: 'PASS', repairHints: ['bad'], nextRecommendedStage: 'trial', passed: true },
    })

    const window = store.readWindow({ target, eventKinds: ['diagnostic', 'process'] })

    expect(window.events).toEqual([])
    expect(window.gaps).toEqual([
      expect.objectContaining({
        code: 'unsupported-event-kind',
        owner: 'runtime-live',
      }),
    ])
    expect(stringify(window)).not.toMatch(/verdict|repairHints|nextRecommendedStage|passed/)
  })
})
