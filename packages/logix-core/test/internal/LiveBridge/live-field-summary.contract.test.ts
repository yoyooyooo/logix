import { describe, expect, it } from 'vitest'

import {
  createFieldRuntimeInspectModel,
  makeLiveTargetCoordinate,
} from '../../../src/internal/live-bridge-api.js'
import { finalizeFieldContributions } from '../../../src/internal/runtime/core/ModuleFields.js'

const target = {
  ...makeLiveTargetCoordinate({
    runtimeId: 'field-runtime',
    moduleId: 'SummaryModule',
    instanceId: 'default',
  }),
  attachmentId: 'field-attachment',
  adapterKind: 'test' as const,
}

const otherTarget = {
  ...makeLiveTargetCoordinate({
    runtimeId: 'field-runtime',
    moduleId: 'SummaryModule',
    instanceId: 'other',
  }),
  attachmentId: 'field-attachment',
  adapterKind: 'test' as const,
}

const snapshot = finalizeFieldContributions({
  moduleId: 'SummaryModule',
  contributions: [
    {
      fields: {
        email: { name: 'Email' },
        emailError: { name: 'Email error' },
        status: { name: 'Status' },
      },
      provenance: {
        originType: 'module',
        originId: 'SummaryModule',
        originIdKind: 'explicit',
        originLabel: 'module:SummaryModule',
      },
    },
  ],
}).snapshot

describe('live field summary contract', () => {
  it('projects bounded latest field summary with convergence causes and ledger watermark ref', () => {
    const model = createFieldRuntimeInspectModel({ enabled: true, producer: 'live-field-summary.contract' })

    const artifact = model.readFieldSummary({
      target,
      snapshot,
      changedFieldCount: 2,
      convergenceCauses: [
        { cause: 'source-refresh', fieldPath: 'status', count: 3 },
        { cause: 'validation', fieldPath: 'emailError', count: 2 },
        { cause: 'computed', fieldPath: 'email', count: 1 },
      ],
      latestLedgerWatermarkRef: {
        targetKey: 'field-runtime/SummaryModule/default',
        ledgerSeq: 9,
        eventId: 'live-ledger:field-runtime/SummaryModule/default:9',
      },
      budget: { maxEvents: 2, maxInlineBytes: 4096 },
    })

    const payload = artifact.facet.payload as any
    expect(artifact.section).toBe('field-summary')
    expect(payload).toMatchObject({
      kind: 'live.field.summary',
      schemaVersion: 'live-field-inspect.v1',
      targetKey: 'field-runtime/SummaryModule/default',
      moduleId: 'SummaryModule',
      fieldCount: 3,
      changedFieldCount: 2,
      latestFieldSnapshotDigest: snapshot.digest,
      latestLedgerWatermarkRef: {
        targetKey: 'field-runtime/SummaryModule/default',
        ledgerSeq: 9,
        eventId: 'live-ledger:field-runtime/SummaryModule/default:9',
      },
      truncated: true,
    })
    expect(payload.convergenceCauses).toEqual([
      { cause: 'source-refresh', fieldPath: 'status', count: 3 },
      { cause: 'validation', fieldPath: 'emailError', count: 2 },
    ])
    expect(artifact.facet.degraded).toEqual({ reason: 'field-summary-truncated' })
    expect(JSON.stringify(artifact)).not.toMatch(/stateAfter|timeline|ordering|verdict|repairHints/)
  })

  it('returns a target-scoped missing summary gap without allocating a summary projection', () => {
    const model = createFieldRuntimeInspectModel({ enabled: true, producer: 'live-field-summary.contract' })

    const artifact = model.readFieldSummary({ target })

    expect(artifact.facet.payload).toBeUndefined()
    expect(artifact.facet.gaps).toEqual([
      expect.objectContaining({
        owner: 'field-runtime',
        code: 'missing-latest-field-summary',
        target: expect.objectContaining({
          runtimeId: 'field-runtime',
          moduleId: 'SummaryModule',
          instanceId: 'default',
        }),
      }),
    ])
    expect(model.getDiagnostics().summaryProjectionAllocations).toBe(0)
  })

  it('cleans target-scoped summary cache with target lifecycle', () => {
    const model = createFieldRuntimeInspectModel({ enabled: true, producer: 'live-field-summary.contract' })

    model.readFieldSummary({ target, snapshot })
    model.readFieldSummary({ target: otherTarget, snapshot })

    expect(model.getDiagnostics()).toMatchObject({
      summaryCacheAllocations: 2,
      summaryCacheEntries: 2,
    })

    model.cleanupTarget(target)

    expect(model.getDiagnostics()).toMatchObject({
      summaryCacheAllocations: 2,
      summaryCacheEntries: 1,
    })
    expect(model.readCachedFieldSummary({ target }).facet.gaps).toEqual([
      expect.objectContaining({
        owner: 'field-runtime',
        code: 'missing-latest-field-summary',
      }),
    ])
    expect((model.readCachedFieldSummary({ target: otherTarget }).facet.payload as any).targetKey).toBe(
      'field-runtime/SummaryModule/other',
    )
  })
})
