import type { VerificationControlPlaneArtifactRef } from '../../../ControlPlane.js'
import { fnv1a32, stableStringify } from '../../digest.js'
import type { JsonValue } from '../../protocol/jsonValue.js'
import type { FieldGraph, FieldGraphEdge } from '../../field-kernel/model.js'
import type { FieldProvenance, ModuleFieldsSnapshot } from './ModuleFields.js'
import { makeFieldProvenanceDigest } from './ModuleFields.js'
import type {
  LiveBudgetProfile,
  LiveDegradedMarker,
  LiveRedactionMarker,
  LiveTargetCoordinate,
  LiveTargetDescriptor,
} from './liveTypes.js'
import { liveTargetCoordinateKey, makeLiveTargetCoordinate } from './liveTypes.js'
import type {
  LiveInspectArtifact,
  LiveStructuredEvidenceGap,
} from './liveInspect.js'
import { makeLiveInspectArtifact, makeLiveInspectGap, makeLiveInspectGapArtifact } from './liveInspect.js'
import type { LiveLedgerEventEnvelope, LiveLedgerWatermark } from './liveLedger.js'
import { makeLiveLedgerEnvelopeJoinRef } from './liveLedger.js'

export type FieldRuntimeInspectSchemaVersion = 'live-field-inspect.v1'
export type FieldRuntimeEventMetadataSchemaVersion = 'live-field-event-metadata.v1'

export type FieldIdentityDigest = `field-id:${string}`
export type FieldRelationDigest = `field-rel:${string}`
export type FieldProvenanceDigest = `field-prov:${string}`

export type FieldInspectGapCode =
  | 'field-inspect-disabled'
  | 'missing-field-owner-projection'
  | 'missing-field-identity'
  | 'field-identity-unstable'
  | 'field-identity-over-budget'
  | 'field-projection-over-budget'
  | 'field-adjacency-over-budget'
  | 'missing-latest-field-summary'
  | 'field-summary-over-budget'
  | 'missing-field-event-meta'
  | 'missing-ledger-envelope'
  | 'field-event-join-mismatch'

export interface FieldInspectGap extends LiveStructuredEvidenceGap {
  readonly owner: 'field-runtime'
  readonly code: FieldInspectGapCode
}

export interface FieldProvenanceSummary {
  readonly originType: FieldProvenance['originType']
  readonly originId: string
  readonly originIdKind: FieldProvenance['originIdKind']
  readonly originLabel: string
  readonly path?: string
}

export interface FinalFieldRowProjection {
  readonly path: string
  readonly fieldIdentityDigest?: FieldIdentityDigest
  readonly displayName?: string
  readonly description?: string
  readonly provenanceDigest?: FieldProvenanceDigest
  readonly provenanceSummary?: FieldProvenanceSummary
  readonly behaviorSummary?: {
    readonly hasDeclaration: true
  }
  readonly degraded?: LiveDegradedMarker
  readonly gaps?: ReadonlyArray<FieldInspectGap>
}

interface FieldRuntimeInspectPayloadBase {
  readonly schemaVersion: FieldRuntimeInspectSchemaVersion
  readonly generatedBy: string
}

export interface FinalFieldProjection extends FieldRuntimeInspectPayloadBase {
  readonly kind: 'live.field.finalFields'
  readonly schemaVersion: FieldRuntimeInspectSchemaVersion
  readonly targetKey: string
  readonly moduleId: string
  readonly fieldSnapshotDigest: string
  readonly fieldCount: number
  readonly projectedFieldCount: number
  readonly truncated: boolean
  readonly fields: ReadonlyArray<FinalFieldRowProjection>
  readonly artifactRef?: VerificationControlPlaneArtifactRef
}

export type FieldSemanticRelationKind =
  | 'derives-from'
  | 'refresh-depends-on'
  | 'validates-with'
  | 'mirrors'
  | 'external-sync'
  | 'writes-error'

export interface FieldSemanticRelationSourceRef {
  readonly owner: 'field-runtime'
  readonly kind: 'field-graph-semantic-edge' | 'field-graph-resource' | 'field-plan-semantic-step'
  readonly digest: string
}

export interface FieldSemanticRelationProjection {
  readonly sourceFieldPath: string
  readonly targetFieldPath: string
  readonly relationKind: FieldSemanticRelationKind
  readonly relationDigest: FieldRelationDigest
  readonly sourceRef: FieldSemanticRelationSourceRef
  readonly sourceFieldIdentityDigest?: FieldIdentityDigest
  readonly targetFieldIdentityDigest?: FieldIdentityDigest
  readonly schedulingSummary?: string
  readonly degraded?: LiveDegradedMarker
  readonly gaps?: ReadonlyArray<FieldInspectGap>
}

export interface FieldSemanticAdjacency extends FieldRuntimeInspectPayloadBase {
  readonly kind: 'live.field.semanticAdjacency'
  readonly schemaVersion: FieldRuntimeInspectSchemaVersion
  readonly targetKey: string
  readonly moduleId: string
  readonly fieldSnapshotDigest: string
  readonly relationCount: number
  readonly projectedRelationCount: number
  readonly truncated: boolean
  readonly relations: ReadonlyArray<FieldSemanticRelationProjection>
  readonly artifactRef?: VerificationControlPlaneArtifactRef
}

export interface FieldConvergenceCauseSummary {
  readonly cause: string
  readonly fieldPath?: string
  readonly count: number
}

export interface FieldLedgerWatermarkRef {
  readonly targetKey: string
  readonly ledgerSeq: number
  readonly eventId?: string
}

export interface FieldSummaryProjection extends FieldRuntimeInspectPayloadBase {
  readonly kind: 'live.field.summary'
  readonly schemaVersion: FieldRuntimeInspectSchemaVersion
  readonly targetKey: string
  readonly moduleId: string
  readonly fieldCount: number
  readonly changedFieldCount?: number
  readonly degradedReasonCounts: Readonly<Record<string, number>>
  readonly convergenceCauses: ReadonlyArray<FieldConvergenceCauseSummary>
  readonly latestFieldSnapshotDigest: string
  readonly latestLedgerWatermarkRef?: FieldLedgerWatermarkRef
  readonly truncated: boolean
  readonly artifactRef?: VerificationControlPlaneArtifactRef
}

export type FieldSemanticEventKind =
  | 'field.changed'
  | 'field.converged'
  | 'field.validation'
  | 'field.source-refresh'
  | 'field.relation'

export interface FieldSemanticEventPayload {
  readonly kind: 'live.field.semanticEventPayload'
  readonly schemaVersion: FieldRuntimeInspectSchemaVersion
  readonly sourceAuthority: 'field-runtime'
  readonly target: LiveTargetCoordinate
  readonly targetKey: string
  readonly fieldPath: string
  readonly fieldIdentityDigest?: FieldIdentityDigest
  readonly semanticEventKind: FieldSemanticEventKind
  readonly relationDigest?: FieldRelationDigest
  readonly convergenceCauseSummary?: string
  readonly fieldSnapshotDigest: string
  readonly sourceRef?: {
    readonly owner: 'field-runtime'
    readonly kind: string
    readonly digest?: string
  }
  readonly linkId?: string
  readonly ledgerWatermark?: LiveLedgerWatermark
  readonly degraded?: ReadonlyArray<LiveDegradedMarker>
  readonly redacted?: ReadonlyArray<LiveRedactionMarker>
  readonly gaps: ReadonlyArray<FieldInspectGap>
}

export interface FieldRuntimeInspectEventMetadata {
  readonly kind: 'live.field.eventMetadata'
  readonly schemaVersion: FieldRuntimeEventMetadataSchemaVersion
  readonly sourceAuthority: 'field-runtime'
  readonly envelopeOwner: 'runtime-live'
  readonly fieldPayloadOwner: 'field-runtime'
  readonly target: LiveTargetCoordinate
  readonly targetKey: string
  readonly envelope?: {
    readonly eventId: string
    readonly target: LiveTargetCoordinate
    readonly watermark: LiveLedgerWatermark
    readonly txnSeq?: number
    readonly opSeq?: number
    readonly linkId?: string
  }
  readonly payload?: FieldSemanticEventPayload
  readonly gaps: ReadonlyArray<FieldInspectGap>
}

export interface FieldRuntimeInspectDiagnostics {
  readonly finalFieldProjectionAllocations: number
  readonly adjacencyProjectionAllocations: number
  readonly summaryProjectionAllocations: number
  readonly summaryCacheAllocations: number
  readonly summaryCacheEntries: number
  readonly fieldEventPayloadAllocations: number
  readonly fieldEventJoinAllocations: number
}

export interface FieldRuntimeInspectModel {
  readonly readFinalFields: (input: ReadFinalFieldsInput) => LiveInspectArtifact<'fields'>
  readonly readSemanticAdjacency: (input: ReadSemanticAdjacencyInput) => LiveInspectArtifact<'field-graph'>
  readonly readFieldSummary: (input: ReadFieldSummaryInput) => LiveInspectArtifact<'field-summary'>
  readonly readCachedFieldSummary: (input: ReadCachedFieldSummaryInput) => LiveInspectArtifact<'field-summary'>
  readonly makeFieldSemanticEventPayload: (input: MakeFieldSemanticEventPayloadInput) => FieldSemanticEventPayload
  readonly cleanupTarget: (target: LiveTargetCoordinate) => void
  readonly getDiagnostics: () => FieldRuntimeInspectDiagnostics
}

export interface ReadFinalFieldsInput {
  readonly target: LiveTargetDescriptor
  readonly snapshot?: ModuleFieldsSnapshot
  readonly budget?: LiveBudgetProfile
  readonly artifactRef?: VerificationControlPlaneArtifactRef
}

export interface ReadSemanticAdjacencyInput {
  readonly target: LiveTargetDescriptor
  readonly snapshot?: ModuleFieldsSnapshot
  readonly graph?: FieldGraph
  readonly budget?: LiveBudgetProfile
  readonly artifactRef?: VerificationControlPlaneArtifactRef
}

export interface ReadFieldSummaryInput {
  readonly target: LiveTargetDescriptor
  readonly snapshot?: ModuleFieldsSnapshot
  readonly changedFieldCount?: number
  readonly degradedReasonCounts?: Readonly<Record<string, number>>
  readonly convergenceCauses?: ReadonlyArray<FieldConvergenceCauseSummary>
  readonly latestLedgerWatermarkRef?: FieldLedgerWatermarkRef
  readonly budget?: LiveBudgetProfile
  readonly artifactRef?: VerificationControlPlaneArtifactRef
}

export interface ReadCachedFieldSummaryInput {
  readonly target: LiveTargetDescriptor
  readonly budget?: LiveBudgetProfile
}

export interface MakeFieldSemanticEventPayloadInput {
  readonly target: LiveTargetDescriptor
  readonly snapshot: ModuleFieldsSnapshot
  readonly fieldPath: string
  readonly semanticEventKind: FieldSemanticEventKind
  readonly relationDigest?: FieldRelationDigest
  readonly convergenceCauseSummary?: string
  readonly sourceRef?: {
    readonly kind: string
    readonly owner: 'field-runtime'
    readonly digest?: string
  }
  readonly linkId?: string
  readonly ledgerWatermark?: LiveLedgerWatermark
  readonly degraded?: ReadonlyArray<LiveDegradedMarker>
  readonly redacted?: ReadonlyArray<LiveRedactionMarker>
}

export interface CreateFieldRuntimeInspectModelOptions {
  readonly enabled: boolean
  readonly producer: string
}

const defaultBudget: LiveBudgetProfile = { maxEvents: 16, maxInlineBytes: 4096 }

const digestJson = (prefix: string, value: unknown): string => `${prefix}:${fnv1a32(stableStringify(value))}`

const makeFieldGap = (input: {
  readonly code: FieldInspectGapCode
  readonly summary: string
  readonly target: LiveTargetCoordinate
  readonly severity?: 'info' | 'warning' | 'error'
  readonly gapKey?: string
}): FieldInspectGap =>
  makeLiveInspectGap({
    gapId: `live:field:${input.code}:${input.gapKey ?? liveTargetCoordinateKey(input.target)}`,
    code: input.code,
    summary: input.summary,
    severity: input.severity ?? 'warning',
    target: normalizeTarget(input.target),
    owner: 'field-runtime',
    reopenBar: 'reopen only if field-runtime inspect owner law changes',
  }) as FieldInspectGap

const disabledArtifact = <Section extends 'fields' | 'field-graph' | 'field-summary'>(input: {
  readonly section: Section
  readonly target: LiveTargetDescriptor
  readonly producer: string
  readonly budget?: LiveBudgetProfile
}): LiveInspectArtifact<Section> =>
  makeLiveInspectGapArtifact({
    section: input.section,
    target: input.target,
    sourceAuthority: 'field-runtime',
    producer: input.producer,
    gapCode: 'field-inspect-disabled',
    summary: 'Field-runtime inspect projection is disabled for this live target.',
    owner: 'field-runtime',
    reopenBar: 'reopen only if disabled-allocation law changes',
    budget: input.budget,
  }) as LiveInspectArtifact<Section>

const missingOwnerArtifact = <Section extends 'fields' | 'field-graph' | 'field-summary'>(input: {
  readonly section: Section
  readonly target: LiveTargetDescriptor
  readonly producer: string
  readonly code: FieldInspectGapCode
  readonly summary: string
  readonly budget?: LiveBudgetProfile
}): LiveInspectArtifact<Section> =>
  makeLiveInspectGapArtifact({
    section: input.section,
    target: input.target,
    sourceAuthority: 'field-runtime',
    producer: input.producer,
    gapCode: input.code,
    summary: input.summary,
    owner: 'field-runtime',
    reopenBar: 'reopen when field-runtime owner projection source is available',
    budget: input.budget,
  }) as LiveInspectArtifact<Section>

const normalizeTarget = (target: LiveTargetCoordinate): LiveTargetCoordinate => makeLiveTargetCoordinate(target)

const fieldLimit = (budget?: LiveBudgetProfile): number =>
  Math.max(1, Math.floor(budget?.maxEvents ?? defaultBudget.maxEvents))

const provenanceSummary = (provenance: FieldProvenance): FieldProvenanceSummary => ({
  originType: provenance.originType,
  originId: provenance.originId,
  originIdKind: provenance.originIdKind,
  originLabel: provenance.originLabel,
  ...(provenance.path ? { path: provenance.path } : null),
})

export const deriveFieldIdentityDigest = (input: {
  readonly target: LiveTargetCoordinate
  readonly moduleId: string
  readonly fieldPath: string
  readonly fieldSnapshotDigest: string
  readonly provenanceDigest?: string
}): FieldIdentityDigest | undefined => {
  if (!input.fieldPath || !input.fieldSnapshotDigest || !input.provenanceDigest) return undefined
  const target = normalizeTarget(input.target)
  return digestJson('field-id', {
    target,
    moduleId: input.moduleId,
    fieldPath: input.fieldPath,
    fieldSnapshotDigest: input.fieldSnapshotDigest,
    provenanceDigest: input.provenanceDigest,
  }) as FieldIdentityDigest
}

const identityForField = (input: {
  readonly target: LiveTargetCoordinate
  readonly snapshot: ModuleFieldsSnapshot
  readonly fieldPath: string
}): {
  readonly fieldIdentityDigest?: FieldIdentityDigest
  readonly provenanceDigest?: FieldProvenanceDigest
  readonly provenanceSummary?: FieldProvenanceSummary
  readonly gaps: ReadonlyArray<FieldInspectGap>
} => {
  const target = normalizeTarget(input.target)
  const provenance = input.snapshot.provenanceIndex[input.fieldPath]
  if (!provenance) {
    return {
      gaps: [
        makeFieldGap({
          code: 'missing-field-identity',
          summary: `No owner-approved provenance is available for field "${input.fieldPath}".`,
          target,
          gapKey: `${liveTargetCoordinateKey(target)}:${input.fieldPath}`,
        }),
      ],
    }
  }
  const provenanceDigest = makeFieldProvenanceDigest(provenance) as FieldProvenanceDigest
  const fieldIdentityDigest = deriveFieldIdentityDigest({
    target,
    moduleId: input.snapshot.moduleId,
    fieldPath: input.fieldPath,
    fieldSnapshotDigest: input.snapshot.digest,
    provenanceDigest,
  })
  if (!fieldIdentityDigest) {
    return {
      provenanceDigest,
      provenanceSummary: provenanceSummary(provenance),
      gaps: [
        makeFieldGap({
          code: 'field-identity-unstable',
          summary: `Field identity cannot be proven for "${input.fieldPath}".`,
          target,
          gapKey: `${liveTargetCoordinateKey(target)}:${input.fieldPath}`,
        }),
      ],
    }
  }
  return {
    fieldIdentityDigest,
    provenanceDigest,
    provenanceSummary: provenanceSummary(provenance),
    gaps: [],
  }
}

const artifactRefForOverBudget = (input: {
  readonly kind: string
  readonly target: LiveTargetCoordinate
  readonly digest: string
  readonly reasonCode: string
}): VerificationControlPlaneArtifactRef => ({
  outputKey: `${input.kind}:${liveTargetCoordinateKey(input.target)}`,
  kind: input.kind,
  digest: input.digest,
  reasonCodes: [input.reasonCode],
})

const makeFinalFieldRow = (input: {
  readonly target: LiveTargetCoordinate
  readonly snapshot: ModuleFieldsSnapshot
  readonly path: string
  readonly name?: string
  readonly description?: string
}): FinalFieldRowProjection => {
  const identity = identityForField({ target: input.target, snapshot: input.snapshot, fieldPath: input.path })
  return {
    path: input.path,
    ...(identity.fieldIdentityDigest ? { fieldIdentityDigest: identity.fieldIdentityDigest } : null),
    ...(input.name ? { displayName: input.name } : null),
    ...(input.description ? { description: input.description } : null),
    ...(identity.provenanceDigest ? { provenanceDigest: identity.provenanceDigest } : null),
    ...(identity.provenanceSummary ? { provenanceSummary: identity.provenanceSummary } : null),
    behaviorSummary: { hasDeclaration: true },
    ...(identity.gaps.length > 0 ? { degraded: { reason: 'missing-field-identity' }, gaps: identity.gaps } : null),
  }
}

const relationKindForEdge = (edge: FieldGraphEdge): FieldSemanticRelationKind => {
  switch (edge.kind) {
    case 'computed':
      return 'derives-from'
    case 'link':
      return 'mirrors'
    case 'source-dep':
      return 'refresh-depends-on'
    case 'check-dep':
      return edge.to.toLowerCase().includes('error') ? 'writes-error' : 'validates-with'
  }
}

const relationKindOrder: Record<FieldSemanticRelationKind, number> = {
  'derives-from': 0,
  mirrors: 1,
  'refresh-depends-on': 2,
  'validates-with': 3,
  'writes-error': 4,
  'external-sync': 5,
}

const makeRelationDigest = (input: {
  readonly target: LiveTargetCoordinate
  readonly snapshot: ModuleFieldsSnapshot
  readonly edge: Pick<FieldGraphEdge, 'kind' | 'from' | 'to'>
  readonly relationKind: FieldSemanticRelationKind
  readonly sourceIdentityDigest?: FieldIdentityDigest
  readonly targetIdentityDigest?: FieldIdentityDigest
}): FieldRelationDigest =>
  digestJson('field-rel', {
    target: normalizeTarget(input.target),
    moduleId: input.snapshot.moduleId,
    fieldSnapshotDigest: input.snapshot.digest,
    sourceFieldPath: input.edge.from,
    targetFieldPath: input.edge.to,
    edgeKind: input.edge.kind,
    relationKind: input.relationKind,
    sourceIdentityDigest: input.sourceIdentityDigest ?? null,
    targetIdentityDigest: input.targetIdentityDigest ?? null,
  }) as FieldRelationDigest

const toSummaryCause = (cause: FieldConvergenceCauseSummary): FieldConvergenceCauseSummary => ({
  cause: cause.cause,
  ...(cause.fieldPath ? { fieldPath: cause.fieldPath } : null),
  count: Math.max(0, Math.floor(cause.count)),
})

const gapArray = (...groups: ReadonlyArray<ReadonlyArray<FieldInspectGap>>): ReadonlyArray<FieldInspectGap> => {
  const byKey = new Map<string, FieldInspectGap>()
  for (const group of groups) {
    for (const gap of group) {
      byKey.set(`${gap.code}:${gap.gapId}`, gap)
    }
  }
  return Array.from(byKey.values())
}

export const joinFieldSemanticPayloadWithLedgerEnvelope = (input: {
  readonly target: LiveTargetCoordinate
  readonly payload?: FieldSemanticEventPayload
  readonly envelope?: LiveLedgerEventEnvelope
}): FieldRuntimeInspectEventMetadata => {
  const target = normalizeTarget(input.target)
  const targetKey = liveTargetCoordinateKey(target)
  const gaps: Array<FieldInspectGap> = []

  if (!input.payload) {
    gaps.push(
      makeFieldGap({
        code: 'missing-field-event-meta',
        summary: 'Field semantic event metadata is missing.',
        target,
      }),
    )
  }
  if (!input.envelope) {
    gaps.push(
      makeFieldGap({
        code: 'missing-ledger-envelope',
        summary: 'Runtime-live ledger envelope is missing for field semantic event metadata.',
        target,
      }),
    )
  }
  if (!input.payload || !input.envelope) {
    return {
      kind: 'live.field.eventMetadata',
      schemaVersion: 'live-field-event-metadata.v1',
      sourceAuthority: 'field-runtime',
      envelopeOwner: 'runtime-live',
      fieldPayloadOwner: 'field-runtime',
      target,
      targetKey,
      gaps,
    }
  }

  const envelope = input.envelope
  const payload = input.payload
  const envelopeRef = makeLiveLedgerEnvelopeJoinRef(envelope)
  const watermarkMatches =
    payload.ledgerWatermark === undefined ||
    (payload.ledgerWatermark.targetKey === envelopeRef.watermark.targetKey &&
      payload.ledgerWatermark.ledgerSeq === envelopeRef.watermark.ledgerSeq)
  const linkMatches = payload.linkId === undefined || envelopeRef.linkId === undefined || payload.linkId === envelopeRef.linkId
  const targetMatches = payload.targetKey === targetKey && envelopeRef.targetKey === targetKey
  if (!targetMatches || !watermarkMatches || !linkMatches) {
    return {
      kind: 'live.field.eventMetadata',
      schemaVersion: 'live-field-event-metadata.v1',
      sourceAuthority: 'field-runtime',
      envelopeOwner: 'runtime-live',
      fieldPayloadOwner: 'field-runtime',
      target,
      targetKey,
      gaps: [
        makeFieldGap({
          code: 'field-event-join-mismatch',
          summary: 'Field semantic event metadata does not match the runtime-live ledger envelope target, watermark or link id.',
          target,
        }),
      ],
    }
  }

  return {
    kind: 'live.field.eventMetadata',
    schemaVersion: 'live-field-event-metadata.v1',
    sourceAuthority: 'field-runtime',
    envelopeOwner: 'runtime-live',
    fieldPayloadOwner: 'field-runtime',
    target,
    targetKey,
    envelope: {
      eventId: envelopeRef.eventId,
      target: envelopeRef.target,
      watermark: envelopeRef.watermark,
      ...(envelopeRef.txnSeq !== undefined ? { txnSeq: envelopeRef.txnSeq } : null),
      ...(envelopeRef.opSeq !== undefined ? { opSeq: envelopeRef.opSeq } : null),
      ...(envelopeRef.linkId ? { linkId: envelopeRef.linkId } : null),
    },
    payload,
    gaps: [],
  }
}

export const createFieldRuntimeInspectModel = (
  options: CreateFieldRuntimeInspectModelOptions,
): FieldRuntimeInspectModel => {
  const summaryCache = new Map<string, FieldSummaryProjection>()
  const diagnostics = {
    finalFieldProjectionAllocations: 0,
    adjacencyProjectionAllocations: 0,
    summaryProjectionAllocations: 0,
    summaryCacheAllocations: 0,
    fieldEventPayloadAllocations: 0,
    fieldEventJoinAllocations: 0,
  }

  const getDiagnostics = (): FieldRuntimeInspectDiagnostics => ({
    ...diagnostics,
    summaryCacheEntries: summaryCache.size,
  })

  const readFinalFields = (input: ReadFinalFieldsInput): LiveInspectArtifact<'fields'> => {
    const budget = input.budget ?? defaultBudget
    const target = normalizeTarget(input.target)
    if (!options.enabled) {
      return disabledArtifact({ section: 'fields', target: input.target, producer: options.producer, budget })
    }
    if (!input.snapshot) {
      return missingOwnerArtifact({
        section: 'fields',
        target: input.target,
        producer: options.producer,
        code: 'missing-field-owner-projection',
        summary: 'No finalized field snapshot is available for this live target.',
        budget,
      })
    }

    const limit = fieldLimit(budget)
    const sorted = [...input.snapshot.fields].sort((a, b) => (a.fieldId < b.fieldId ? -1 : a.fieldId > b.fieldId ? 1 : 0))
    const projectedRows = sorted.slice(0, limit).map((field) =>
      makeFinalFieldRow({
        target,
        snapshot: input.snapshot!,
        path: field.fieldId,
        name: field.name,
        description: field.description,
      }),
    )
    diagnostics.finalFieldProjectionAllocations += projectedRows.length

    const rowGaps = gapArray(...projectedRows.map((row) => row.gaps ?? []))
    const truncated = sorted.length > projectedRows.length
    const truncationGap = truncated
      ? [
          makeFieldGap({
            code: 'field-projection-over-budget',
            summary: 'Final field projection exceeded the requested field row budget.',
            target,
          }),
        ]
      : []
    const payloadDigest = digestJson('field-list', {
      target,
      moduleId: input.snapshot.moduleId,
      fieldSnapshotDigest: input.snapshot.digest,
      fieldCount: sorted.length,
      paths: sorted.map((field) => field.fieldId),
    })
    const artifactRef = input.artifactRef ?? (truncated
      ? artifactRefForOverBudget({
          kind: 'FinalFieldProjection',
          target,
          digest: payloadDigest,
          reasonCode: 'field-projection-over-budget',
        })
      : undefined)
    const payload: FinalFieldProjection = {
      kind: 'live.field.finalFields',
      schemaVersion: 'live-field-inspect.v1',
      generatedBy: options.producer,
      targetKey: liveTargetCoordinateKey(target),
      moduleId: input.snapshot.moduleId,
      fieldSnapshotDigest: input.snapshot.digest,
      fieldCount: sorted.length,
      projectedFieldCount: projectedRows.length,
      truncated,
      fields: projectedRows,
      ...(artifactRef ? { artifactRef } : null),
    }

    return makeLiveInspectArtifact({
      section: 'fields',
      target: input.target,
      sourceAuthority: 'field-runtime',
      producer: options.producer,
      budget,
      payload,
      artifactRef,
      degraded: truncated ? { reason: 'field-list-truncated' } : rowGaps.length > 0 ? { reason: 'missing-field-identity' } : undefined,
      gaps: [...rowGaps, ...truncationGap],
    })
  }

  const readSemanticAdjacency = (input: ReadSemanticAdjacencyInput): LiveInspectArtifact<'field-graph'> => {
    const budget = input.budget ?? defaultBudget
    const target = normalizeTarget(input.target)
    if (!options.enabled) {
      return disabledArtifact({ section: 'field-graph', target: input.target, producer: options.producer, budget })
    }
    if (!input.snapshot || !input.graph) {
      return missingOwnerArtifact({
        section: 'field-graph',
        target: input.target,
        producer: options.producer,
        code: 'missing-field-owner-projection',
        summary: 'No owner-approved field graph projection source is available for this live target.',
        budget,
      })
    }

    const edges = [...input.graph.edges].sort((a, b) => {
      const ak = `${relationKindOrder[relationKindForEdge(a)]}:${a.from}:${a.to}`
      const bk = `${relationKindOrder[relationKindForEdge(b)]}:${b.from}:${b.to}`
      return ak < bk ? -1 : ak > bk ? 1 : 0
    })
    const limit = fieldLimit(budget)
    const relations = edges.slice(0, limit).map((edge) => {
      const relationKind = relationKindForEdge(edge)
      const sourceIdentity = identityForField({ target, snapshot: input.snapshot!, fieldPath: edge.from })
      const targetIdentity = identityForField({ target, snapshot: input.snapshot!, fieldPath: edge.to })
      const gaps = gapArray(sourceIdentity.gaps, targetIdentity.gaps)
      const relationDigest = makeRelationDigest({
        target,
        snapshot: input.snapshot!,
        edge,
        relationKind,
        sourceIdentityDigest: sourceIdentity.fieldIdentityDigest,
        targetIdentityDigest: targetIdentity.fieldIdentityDigest,
      })
      return {
        sourceFieldPath: edge.from,
        targetFieldPath: edge.to,
        relationKind,
        relationDigest,
        sourceRef: {
          owner: 'field-runtime',
          kind: 'field-graph-semantic-edge',
          digest: digestJson('field-graph-source', {
            target,
            moduleId: input.snapshot!.moduleId,
            fieldSnapshotDigest: input.snapshot!.digest,
            edgeKind: edge.kind,
            sourceFieldPath: edge.from,
            targetFieldPath: edge.to,
          }),
        },
        ...(sourceIdentity.fieldIdentityDigest ? { sourceFieldIdentityDigest: sourceIdentity.fieldIdentityDigest } : null),
        ...(targetIdentity.fieldIdentityDigest ? { targetFieldIdentityDigest: targetIdentity.fieldIdentityDigest } : null),
        ...(gaps.length > 0 ? { degraded: { reason: 'missing-field-identity' }, gaps } : null),
      } satisfies FieldSemanticRelationProjection
    })
    diagnostics.adjacencyProjectionAllocations += relations.length

    const relationGaps = gapArray(...relations.map((relation) => relation.gaps ?? []))
    const truncated = edges.length > relations.length
    const truncationGap = truncated
      ? [
          makeFieldGap({
            code: 'field-adjacency-over-budget',
            summary: 'Semantic adjacency projection exceeded the requested relation budget.',
            target,
          }),
        ]
      : []
    const payloadDigest = digestJson('field-adjacency', {
      target,
      moduleId: input.snapshot.moduleId,
      fieldSnapshotDigest: input.snapshot.digest,
      relationCount: edges.length,
      relations: edges.map((edge) => ({ kind: edge.kind, sourceFieldPath: edge.from, targetFieldPath: edge.to })),
    })
    const artifactRef = input.artifactRef ?? (truncated
      ? artifactRefForOverBudget({
          kind: 'FieldSemanticAdjacency',
          target,
          digest: payloadDigest,
          reasonCode: 'field-adjacency-over-budget',
        })
      : undefined)
    const payload: FieldSemanticAdjacency = {
      kind: 'live.field.semanticAdjacency',
      schemaVersion: 'live-field-inspect.v1',
      generatedBy: options.producer,
      targetKey: liveTargetCoordinateKey(target),
      moduleId: input.snapshot.moduleId,
      fieldSnapshotDigest: input.snapshot.digest,
      relationCount: edges.length,
      projectedRelationCount: relations.length,
      truncated,
      relations,
      ...(artifactRef ? { artifactRef } : null),
    }

    return makeLiveInspectArtifact({
      section: 'field-graph',
      target: input.target,
      sourceAuthority: 'field-runtime',
      producer: options.producer,
      budget,
      payload,
      artifactRef,
      degraded: truncated ? { reason: 'field-adjacency-truncated' } : relationGaps.length > 0 ? { reason: 'missing-field-identity' } : undefined,
      gaps: [...relationGaps, ...truncationGap],
    })
  }

  const readFieldSummary = (input: ReadFieldSummaryInput): LiveInspectArtifact<'field-summary'> => {
    const budget = input.budget ?? defaultBudget
    const target = normalizeTarget(input.target)
    if (!options.enabled) {
      return disabledArtifact({ section: 'field-summary', target: input.target, producer: options.producer, budget })
    }
    if (!input.snapshot) {
      return missingOwnerArtifact({
        section: 'field-summary',
        target: input.target,
        producer: options.producer,
        code: 'missing-latest-field-summary',
        summary: 'No latest field summary is available for this live target.',
        budget,
      })
    }

    const limit = fieldLimit(budget)
    const causes = (input.convergenceCauses ?? []).map(toSummaryCause)
    const projectedCauses = causes.slice(0, limit)
    const truncated = causes.length > projectedCauses.length
    const truncationGap = truncated
      ? [
          makeFieldGap({
            code: 'field-summary-over-budget',
            summary: 'Field convergence summary exceeded the requested cause budget.',
            target,
          }),
        ]
      : []
    const payloadDigest = digestJson('field-summary', {
      target,
      moduleId: input.snapshot.moduleId,
      fieldSnapshotDigest: input.snapshot.digest,
      fieldCount: input.snapshot.fields.length,
      changedFieldCount: input.changedFieldCount ?? null,
      convergenceCauses: causes,
      latestLedgerWatermarkRef: input.latestLedgerWatermarkRef ?? null,
    })
    const artifactRef = input.artifactRef ?? (truncated
      ? artifactRefForOverBudget({
          kind: 'FieldSummaryProjection',
          target,
          digest: payloadDigest,
          reasonCode: 'field-summary-over-budget',
        })
      : undefined)
    const payload: FieldSummaryProjection = {
      kind: 'live.field.summary',
      schemaVersion: 'live-field-inspect.v1',
      generatedBy: options.producer,
      targetKey: liveTargetCoordinateKey(target),
      moduleId: input.snapshot.moduleId,
      fieldCount: input.snapshot.fields.length,
      ...(input.changedFieldCount !== undefined ? { changedFieldCount: input.changedFieldCount } : null),
      degradedReasonCounts: input.degradedReasonCounts ?? {},
      convergenceCauses: projectedCauses,
      latestFieldSnapshotDigest: input.snapshot.digest,
      ...(input.latestLedgerWatermarkRef ? { latestLedgerWatermarkRef: input.latestLedgerWatermarkRef } : null),
      truncated,
      ...(artifactRef ? { artifactRef } : null),
    }
    diagnostics.summaryProjectionAllocations += 1
    const cacheKey = liveTargetCoordinateKey(target)
    if (!summaryCache.has(cacheKey)) diagnostics.summaryCacheAllocations += 1
    summaryCache.set(cacheKey, payload)

    return makeLiveInspectArtifact({
      section: 'field-summary',
      target: input.target,
      sourceAuthority: 'field-runtime',
      producer: options.producer,
      budget,
      payload,
      artifactRef,
      degraded: truncated ? { reason: 'field-summary-truncated' } : undefined,
      gaps: truncationGap,
    })
  }

  const readCachedFieldSummary = (input: ReadCachedFieldSummaryInput): LiveInspectArtifact<'field-summary'> => {
    const budget = input.budget ?? defaultBudget
    const target = normalizeTarget(input.target)
    if (!options.enabled) {
      return disabledArtifact({ section: 'field-summary', target: input.target, producer: options.producer, budget })
    }
    const cached = summaryCache.get(liveTargetCoordinateKey(target))
    if (!cached) {
      return missingOwnerArtifact({
        section: 'field-summary',
        target: input.target,
        producer: options.producer,
        code: 'missing-latest-field-summary',
        summary: 'No cached latest field summary is available for this live target.',
        budget,
      })
    }
    return makeLiveInspectArtifact({
      section: 'field-summary',
      target: input.target,
      sourceAuthority: 'field-runtime',
      producer: options.producer,
      budget,
      payload: cached,
      degraded: cached.truncated ? { reason: 'field-summary-truncated' } : undefined,
    })
  }

  const makeFieldSemanticEventPayload = (input: MakeFieldSemanticEventPayloadInput): FieldSemanticEventPayload => {
    const target = normalizeTarget(input.target)
    const identity = identityForField({ target, snapshot: input.snapshot, fieldPath: input.fieldPath })
    diagnostics.fieldEventPayloadAllocations += 1
    return {
      kind: 'live.field.semanticEventPayload',
      schemaVersion: 'live-field-inspect.v1',
      sourceAuthority: 'field-runtime',
      target,
      targetKey: liveTargetCoordinateKey(target),
      fieldPath: input.fieldPath,
      ...(identity.fieldIdentityDigest ? { fieldIdentityDigest: identity.fieldIdentityDigest } : null),
      semanticEventKind: input.semanticEventKind,
      ...(input.relationDigest ? { relationDigest: input.relationDigest } : null),
      ...(input.convergenceCauseSummary ? { convergenceCauseSummary: input.convergenceCauseSummary } : null),
      fieldSnapshotDigest: input.snapshot.digest,
      ...(input.sourceRef ? { sourceRef: input.sourceRef } : null),
      ...(input.linkId ? { linkId: input.linkId } : null),
      ...(input.ledgerWatermark ? { ledgerWatermark: input.ledgerWatermark } : null),
      degraded: [...(input.degraded ?? []), ...(identity.gaps.length > 0 ? [{ reason: 'missing-field-identity' }] : [])],
      ...(input.redacted ? { redacted: input.redacted } : null),
      gaps: identity.gaps,
    }
  }

  const cleanupTarget = (targetInput: LiveTargetCoordinate): void => {
    const target = normalizeTarget(targetInput)
    summaryCache.delete(liveTargetCoordinateKey(target))
  }

  return {
    readFinalFields,
    readSemanticAdjacency,
    readFieldSummary,
    readCachedFieldSummary,
    makeFieldSemanticEventPayload,
    cleanupTarget,
    getDiagnostics,
  }
}

export const makeFieldLedgerWatermarkRef = (watermark: LiveLedgerWatermark): FieldLedgerWatermarkRef => ({
  targetKey: watermark.targetKey,
  ledgerSeq: watermark.ledgerSeq,
  ...(watermark.eventId ? { eventId: watermark.eventId } : null),
})
