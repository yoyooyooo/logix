import { describe, expect, it } from 'vitest'

import {
  createFieldRuntimeInspectModel,
  createLiveOperationLedgerStore,
  joinFieldSemanticPayloadWithLedgerEnvelope,
  makeLiveTargetCoordinate,
} from '../../../src/internal/live-bridge-api.js'
import { finalizeFieldContributions } from '../../../src/internal/runtime/core/ModuleFields.js'

const target = makeLiveTargetCoordinate({
  runtimeId: 'field-runtime',
  moduleId: 'JoinModule',
  instanceId: 'default',
})

const otherTarget = makeLiveTargetCoordinate({
  runtimeId: 'field-runtime',
  moduleId: 'JoinModule',
  instanceId: 'other',
})

const descriptor = {
  ...target,
  attachmentId: 'field-attachment',
  adapterKind: 'test' as const,
}

const snapshot = finalizeFieldContributions({
  moduleId: 'JoinModule',
  contributions: [
    {
      fields: {
        email: { name: 'Email' },
        emailError: { name: 'Email error' },
      },
      provenance: {
        originType: 'module',
        originId: 'JoinModule',
        originIdKind: 'explicit',
        originLabel: 'module:JoinModule',
      },
    },
  ],
}).snapshot

const must = <T>(value: T | undefined): T => {
  expect(value).toBeDefined()
  return value!
}

describe('live field ledger join contract', () => {
  it('joins field semantic payload with 175 ledger envelope without taking ordering ownership', () => {
    const ledger = createLiveOperationLedgerStore({ enabled: true })
    const envelope = must(ledger.recordOperationEvent({
      target,
      eventKind: 'diagnostic',
      label: 'field convergence',
      txnSeq: 5,
      opSeq: 2,
      linkId: 'field-link',
      payload: { owner: 'runtime-live', ownerRef: 'diagnostic:field-link' },
    }))
    const model = createFieldRuntimeInspectModel({ enabled: true, producer: 'live-field-ledger-join.contract' })
    const payload = model.makeFieldSemanticEventPayload({
      target: descriptor,
      snapshot,
      fieldPath: 'email',
      semanticEventKind: 'field.converged',
      linkId: 'field-link',
      ledgerWatermark: envelope.watermark,
      convergenceCauseSummary: 'validation converged email',
      sourceRef: { kind: 'field-converge', owner: 'field-runtime', digest: 'field-source:email' },
    })

    const joined = joinFieldSemanticPayloadWithLedgerEnvelope({
      target,
      payload,
      envelope,
    })

    expect(joined).toMatchObject({
      kind: 'live.field.eventMetadata',
      schemaVersion: 'live-field-event-metadata.v1',
      sourceAuthority: 'field-runtime',
      envelopeOwner: 'runtime-live',
      fieldPayloadOwner: 'field-runtime',
      envelope: {
        eventId: envelope.eventId,
        target,
        watermark: envelope.watermark,
        txnSeq: 5,
        opSeq: 2,
        linkId: 'field-link',
      },
      payload: {
        fieldPath: 'email',
        semanticEventKind: 'field.converged',
        fieldSnapshotDigest: snapshot.digest,
        linkId: 'field-link',
      },
      gaps: [],
    })
    expect(JSON.stringify(joined)).not.toMatch(/stateAfter|stateAfterSource|orderingOwner|fieldRuntimeOrder/)
  })

  it('returns a missing ledger envelope gap when field event metadata cannot join', () => {
    const model = createFieldRuntimeInspectModel({ enabled: true, producer: 'live-field-ledger-join.contract' })
    const payload = model.makeFieldSemanticEventPayload({
      target: descriptor,
      snapshot,
      fieldPath: 'email',
      semanticEventKind: 'field.changed',
      linkId: 'field-link',
    })

    const joined = joinFieldSemanticPayloadWithLedgerEnvelope({
      target,
      payload,
    })

    expect(joined.payload).toBeUndefined()
    expect(joined.envelope).toBeUndefined()
    expect(joined.gaps).toEqual([
      expect.objectContaining({
        owner: 'field-runtime',
        code: 'missing-ledger-envelope',
      }),
    ])
  })

  it('returns join mismatch gaps for target link or watermark mismatches', () => {
    const ledger = createLiveOperationLedgerStore({ enabled: true })
    const envelope = must(ledger.recordOperationEvent({
      target: otherTarget,
      eventKind: 'diagnostic',
      label: 'other field convergence',
      txnSeq: 6,
      opSeq: 1,
      linkId: 'other-link',
    }))
    const model = createFieldRuntimeInspectModel({ enabled: true, producer: 'live-field-ledger-join.contract' })
    const payload = model.makeFieldSemanticEventPayload({
      target: descriptor,
      snapshot,
      fieldPath: 'email',
      semanticEventKind: 'field.changed',
      linkId: 'field-link',
    })

    const joined = joinFieldSemanticPayloadWithLedgerEnvelope({
      target,
      payload,
      envelope,
    })

    expect(joined.payload).toBeUndefined()
    expect(joined.envelope).toBeUndefined()
    expect(joined.gaps).toEqual([
      expect.objectContaining({
        owner: 'field-runtime',
        code: 'field-event-join-mismatch',
      }),
    ])
  })

  it('returns missing field event metadata gaps before touching ledger ownership', () => {
    const ledger = createLiveOperationLedgerStore({ enabled: true })
    const envelope = must(ledger.recordOperationEvent({
      target,
      eventKind: 'diagnostic',
      label: 'field convergence',
      linkId: 'field-link',
    }))

    const joined = joinFieldSemanticPayloadWithLedgerEnvelope({
      target,
      envelope,
    })

    expect(joined.payload).toBeUndefined()
    expect(joined.envelope).toBeUndefined()
    expect(joined.gaps).toEqual([
      expect.objectContaining({
        owner: 'field-runtime',
        code: 'missing-field-event-meta',
      }),
    ])
  })
})
