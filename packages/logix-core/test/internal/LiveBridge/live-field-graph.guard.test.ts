import { describe, expect, it } from 'vitest'

import {
  createFieldRuntimeInspectModel,
  makeLiveTargetCoordinate,
} from '../../../src/internal/live-bridge-api.js'
import { finalizeFieldContributions } from '../../../src/internal/runtime/core/ModuleFields.js'
import type { FieldGraph } from '../../../src/internal/field-kernel/model.js'

const target = {
  ...makeLiveTargetCoordinate({
    runtimeId: 'field-runtime',
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
}

const snapshot = finalizeFieldContributions({
  moduleId: 'ProfileModule',
  contributions: [
    {
      fields: {
        'profile.firstName': { name: 'First name' },
        'profile.lastName': { name: 'Last name' },
        'profile.fullName': { name: 'Full name' },
        'profile.email': { name: 'Email' },
        'profile.emailError': { name: 'Email error' },
        'profile.remoteStatus': { name: 'Remote status' },
      },
      provenance,
    },
  ],
}).snapshot

const graph: FieldGraph = {
  _tag: 'FieldGraph',
  nodes: [],
  edges: [
    { id: 'computed:profile.firstName->profile.fullName', from: 'profile.firstName', to: 'profile.fullName', kind: 'computed' },
    { id: 'link:profile.email->profile.remoteStatus', from: 'profile.email', to: 'profile.remoteStatus', kind: 'link' },
    { id: 'source-dep:profile.email->profile.remoteStatus', from: 'profile.email', to: 'profile.remoteStatus', kind: 'source-dep' },
    { id: 'check-dep:profile.email->profile.emailError', from: 'profile.email', to: 'profile.emailError', kind: 'check-dep' },
  ],
  resources: [{ resourceId: 'profileResource', keySelector: 'FieldKernel.source@profile.remoteStatus', ownerFields: ['profile.remoteStatus'] }],
}

describe('live field graph guard', () => {
  it('projects semantic adjacency without raw node edge or plan identifiers', () => {
    const model = createFieldRuntimeInspectModel({ enabled: true, producer: 'live-field-graph.guard' })

    const artifact = model.readSemanticAdjacency({
      target,
      snapshot,
      graph,
      budget: { maxEvents: 8, maxInlineBytes: 4096 },
    })

    const payload = artifact.facet.payload as any
    expect(artifact.section).toBe('field-graph')
    expect(payload).toMatchObject({
      kind: 'live.field.semanticAdjacency',
      schemaVersion: 'live-field-inspect.v1',
      fieldSnapshotDigest: snapshot.digest,
      relationCount: 4,
      projectedRelationCount: 4,
      truncated: false,
    })
    expect(payload.relations.map((relation: any) => relation.relationKind)).toEqual([
      'derives-from',
      'mirrors',
      'refresh-depends-on',
      'writes-error',
    ])
    expect(payload.relations[0]).toMatchObject({
      sourceFieldPath: 'profile.firstName',
      targetFieldPath: 'profile.fullName',
      relationDigest: expect.stringMatching(/^field-rel:/),
      sourceRef: expect.objectContaining({
        owner: 'field-runtime',
        kind: 'field-graph-semantic-edge',
      }),
    })
    const serialized = JSON.stringify(artifact)
    expect(serialized).not.toMatch(/"nodes"|"edges"|"from"|"to"|"graphEdgeId"|"planStepId"|computed:profile/)
  })

  it('degrades adjacency when a relation endpoint lacks stable field identity', () => {
    const model = createFieldRuntimeInspectModel({ enabled: true, producer: 'live-field-graph.guard' })

    const artifact = model.readSemanticAdjacency({
      target,
      snapshot,
      graph: {
        _tag: 'FieldGraph',
        nodes: [],
        edges: [{ id: 'computed:missing->profile.fullName', from: 'missing.path', to: 'profile.fullName', kind: 'computed' }],
        resources: [],
      },
    })

    const payload = artifact.facet.payload as any
    expect(payload.relations[0]).toMatchObject({
      sourceFieldPath: 'missing.path',
      targetFieldPath: 'profile.fullName',
      relationKind: 'derives-from',
      degraded: { reason: 'missing-field-identity' },
    })
    expect(payload.relations[0].sourceFieldIdentityDigest).toBeUndefined()
    expect(artifact.facet.gaps).toContainEqual(
      expect.objectContaining({
        owner: 'field-runtime',
        code: 'missing-field-identity',
      }),
    )
  })

  it('bounds large semantic adjacency payloads by relation budget', () => {
    const model = createFieldRuntimeInspectModel({ enabled: true, producer: 'live-field-graph.guard' })

    const artifact = model.readSemanticAdjacency({
      target,
      snapshot,
      graph,
      budget: { maxEvents: 2, maxInlineBytes: 4096 },
    })

    const payload = artifact.facet.payload as any
    expect(payload.relationCount).toBe(4)
    expect(payload.projectedRelationCount).toBe(2)
    expect(payload.truncated).toBe(true)
    expect(artifact.facet.degraded).toEqual({ reason: 'field-adjacency-truncated' })
    expect(artifact.facet.gaps).toContainEqual(
      expect.objectContaining({
        owner: 'field-runtime',
        code: 'field-adjacency-over-budget',
      }),
    )
  })
})
