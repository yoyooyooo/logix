import { describe, expect, it } from 'vitest'

import {
  createFieldRuntimeInspectModel,
  makeLiveTargetCoordinate,
} from '../../../src/internal/live-bridge-api.js'
import { finalizeFieldContributions } from '../../../src/internal/runtime/core/ModuleFields.js'

const target = {
  ...makeLiveTargetCoordinate({
    runtimeId: ' field-runtime ',
    moduleId: 'ProfileModule',
    instanceId: 'default',
  }),
  attachmentId: 'field-attachment',
  adapterKind: 'test' as const,
}

const provenance = {
  originType: 'module' as const,
  originId: 'ProfileModule',
  originIdKind: 'explicit' as const,
  originLabel: 'module:ProfileModule',
  path: 'src/profile.logic.ts',
}

const makeSnapshot = () =>
  finalizeFieldContributions({
    moduleId: 'ProfileModule',
    contributions: [
      {
        fields: {
          'profile.email': {
            name: 'Email',
            description: 'Primary contact email',
            subscribe: () => undefined,
          },
          'profile.name': {
            name: 'Name',
            description: 'Public display name',
            derive: () => undefined,
          },
        },
        provenance,
      },
    ],
  }).snapshot

describe('live field inspect contract', () => {
  it('projects final fields with deterministic owner identity and no raw runtime internals', () => {
    const snapshot = makeSnapshot()
    const model = createFieldRuntimeInspectModel({ enabled: true, producer: 'live-field-inspect.contract' })

    const first = model.readFinalFields({
      target,
      snapshot,
      budget: { maxEvents: 8, maxInlineBytes: 4096 },
    })
    const second = model.readFinalFields({
      target,
      snapshot,
      budget: { maxEvents: 8, maxInlineBytes: 4096 },
    })

    const payload = first.facet.payload as any
    expect(first.section).toBe('fields')
    expect(first.facet.sourceAuthority).toBe('field-runtime')
    expect(payload).toMatchObject({
      kind: 'live.field.finalFields',
      schemaVersion: 'live-field-inspect.v1',
      moduleId: 'ProfileModule',
      fieldSnapshotDigest: snapshot.digest,
      fieldCount: 2,
      projectedFieldCount: 2,
      truncated: false,
    })
    expect(payload.fields.map((field: any) => field.path)).toEqual(['profile.email', 'profile.name'])
    expect(payload.fields[0].fieldIdentityDigest).toMatch(/^field-id:/)
    expect(payload.fields[0].provenanceDigest).toMatch(/^field-prov:/)
    expect(payload.fields[0].provenanceSummary).toEqual({
      originType: 'module',
      originId: 'ProfileModule',
      originIdKind: 'explicit',
      originLabel: 'module:ProfileModule',
      path: 'src/profile.logic.ts',
    })
    expect((second.facet.payload as any).fields.map((field: any) => field.fieldIdentityDigest)).toEqual(
      payload.fields.map((field: any) => field.fieldIdentityDigest),
    )
    expect(JSON.stringify(first)).not.toMatch(/derive|subscribe|SubscriptionRef|provenanceIndex|runtimeHandle/)
    expect(model.getDiagnostics()).toMatchObject({
      finalFieldProjectionAllocations: 4,
      adjacencyProjectionAllocations: 0,
      summaryProjectionAllocations: 0,
      summaryCacheEntries: 0,
    })
  })

  it('degrades over-budget final field lists while preserving counts and snapshot digest', () => {
    const snapshot = makeSnapshot()
    const model = createFieldRuntimeInspectModel({ enabled: true, producer: 'live-field-inspect.contract' })

    const artifact = model.readFinalFields({
      target,
      snapshot,
      budget: { maxEvents: 1, maxInlineBytes: 4096 },
    })

    const payload = artifact.facet.payload as any
    expect(payload.fieldCount).toBe(2)
    expect(payload.projectedFieldCount).toBe(1)
    expect(payload.fieldSnapshotDigest).toBe(snapshot.digest)
    expect(payload.truncated).toBe(true)
    expect(artifact.facet.degraded).toEqual({ reason: 'field-list-truncated' })
    expect(artifact.facet.gaps).toEqual([
      expect.objectContaining({
        owner: 'field-runtime',
        code: 'field-projection-over-budget',
      }),
    ])
  })

  it('returns identity gaps instead of synthesizing field ids when provenance is missing', () => {
    const snapshot = makeSnapshot()
    const unstableSnapshot = {
      ...snapshot,
      provenanceIndex: {},
    }
    const model = createFieldRuntimeInspectModel({ enabled: true, producer: 'live-field-inspect.contract' })

    const artifact = model.readFinalFields({
      target,
      snapshot: unstableSnapshot,
      budget: { maxEvents: 8, maxInlineBytes: 4096 },
    })

    const payload = artifact.facet.payload as any
    expect(payload.fields[0].fieldIdentityDigest).toBeUndefined()
    expect(payload.fields[0].gaps).toEqual([
      expect.objectContaining({
        owner: 'field-runtime',
        code: 'missing-field-identity',
      }),
    ])
    expect(artifact.facet.gaps).toContainEqual(
      expect.objectContaining({
        owner: 'field-runtime',
        code: 'missing-field-identity',
      }),
    )
  })

  it('does not allocate field projections or caches when field inspect is disabled', () => {
    const snapshot = makeSnapshot()
    const model = createFieldRuntimeInspectModel({ enabled: false, producer: 'live-field-inspect.contract' })

    const fields = model.readFinalFields({ target, snapshot })
    const graph = model.readSemanticAdjacency({ target, snapshot, graph: { _tag: 'FieldGraph', nodes: [], edges: [], resources: [] } })
    const summary = model.readFieldSummary({ target, snapshot })

    expect(fields.facet.payload).toBeUndefined()
    expect(graph.facet.payload).toBeUndefined()
    expect(summary.facet.payload).toBeUndefined()
    expect(fields.facet.gaps[0]).toMatchObject({ owner: 'field-runtime', code: 'field-inspect-disabled' })
    expect(graph.facet.gaps[0]).toMatchObject({ owner: 'field-runtime', code: 'field-inspect-disabled' })
    expect(summary.facet.gaps[0]).toMatchObject({ owner: 'field-runtime', code: 'field-inspect-disabled' })
    expect(model.getDiagnostics()).toEqual({
      finalFieldProjectionAllocations: 0,
      adjacencyProjectionAllocations: 0,
      summaryProjectionAllocations: 0,
      summaryCacheAllocations: 0,
      summaryCacheEntries: 0,
      fieldEventPayloadAllocations: 0,
      fieldEventJoinAllocations: 0,
    })
  })
})
