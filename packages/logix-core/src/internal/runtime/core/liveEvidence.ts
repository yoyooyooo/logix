import type { VerificationControlPlaneArtifactRef } from '../../../ControlPlane.js'
import type { RuntimeWorkbenchLiveEvidenceInput, RuntimeWorkbenchTruthInput } from '../../workbench/authority.js'
import type { LiveLedgerEventEnvelope, LiveLedgerWatermark, LiveOperationWindow } from './liveLedger.js'
import type {
  LiveAdmissionDenialReason,
  LiveBindingHeader,
  LiveBudgetProfile,
  LiveCaptureFacet,
  LiveDegradedMarker,
  LiveDroppedMarker,
  LiveEvidenceFacet,
  LiveEvidenceGap,
  LiveOperationAcceptedFacet,
  LiveOperationCompletedFacet,
  LiveOperationDeniedFacet,
  LiveOperationFailedFacet,
  LiveOperationKind,
  LiveRedactionMarker,
  LiveStageClass,
  LiveTargetCoordinate,
} from './liveTypes.js'
import { makeLiveTargetCoordinate } from './liveTypes.js'

const defaultStageClass: LiveStageClass = 'drilldown-only'
const allowedLeasePurposes = new Set<LiveEvidenceLeasePurpose>([
  'export-evidence',
  'workbench-session',
  'qa-recording',
  'maintenance-debug',
])

export type LiveEvidenceLeasePurpose =
  | 'export-evidence'
  | 'workbench-session'
  | 'qa-recording'
  | 'maintenance-debug'

export interface LiveEvidenceLeaseConsumerIdentity {
  readonly actorId: string
  readonly kind: string
}

export interface LiveEvidenceLeaseRedactionPolicy {
  readonly policyRef: string
}

export interface LiveEvidenceLeaseRetentionPolicy {
  readonly ttlMs: number
  readonly maxBytes: number
  readonly maxEvents: number
  readonly workspacePartition: string
}

export interface LiveEvidenceLease {
  readonly kind: 'live.evidence.lease'
  readonly schemaVersion: 'live-evidence-lease.v1'
  readonly leaseId: string
  readonly workspace: string
  readonly attachmentId: string
  readonly target: LiveTargetCoordinate
  readonly purpose: LiveEvidenceLeasePurpose
  readonly budget: LiveBudgetProfile
  readonly redactionPolicy: LiveEvidenceLeaseRedactionPolicy
  readonly retentionPolicy: LiveEvidenceLeaseRetentionPolicy
  readonly consumerIdentity: LiveEvidenceLeaseConsumerIdentity
  readonly createdAt?: number
}

export interface LiveDaemonRetainedOwnerSegmentRetention {
  readonly ttlMs: number
  readonly maxBytes: number
  readonly maxEvents: number
  readonly workspacePartition: string
}

export interface LiveDaemonRetainedOwnerSegment {
  readonly kind: 'daemon.retained.owner.segment'
  readonly schemaVersion: 'daemon-retained-owner-segment.v1'
  readonly segmentId: string
  readonly target: LiveTargetCoordinate
  readonly attachmentId: string
  readonly startWatermark: LiveLedgerWatermark
  readonly endWatermark: LiveLedgerWatermark
  readonly ownerEventIds: ReadonlyArray<string>
  readonly boundedEventProjections: ReadonlyArray<Record<string, unknown>>
  readonly artifactRefs: ReadonlyArray<VerificationControlPlaneArtifactRef>
  readonly digests: ReadonlyArray<string>
  readonly gaps: ReadonlyArray<LiveEvidenceGap>
  readonly redacted: ReadonlyArray<LiveRedactionMarker>
  readonly degraded: ReadonlyArray<LiveDegradedMarker>
  readonly retention: LiveDaemonRetainedOwnerSegmentRetention
  readonly leaseProvenance: LiveEvidenceLease
}

const cloneDto = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((item) => cloneDto(item)) as T
  const out: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (child !== undefined) out[key] = cloneDto(child)
  }
  return out as T
}

const uniqueMarkers = <T>(values: ReadonlyArray<T>): ReadonlyArray<T> => {
  const seen = new Set<string>()
  const out: T[] = []
  for (const value of values) {
    const key = JSON.stringify(value)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(value)
  }
  return out
}

const artifactRefsFromEvent = (event: LiveLedgerEventEnvelope): ReadonlyArray<VerificationControlPlaneArtifactRef> =>
  [
    ...(event.artifactRef ? [event.artifactRef] : []),
    ...(event.payload?.artifactRef ? [event.payload.artifactRef] : []),
    ...(event.stateAfter?.artifactRef ? [event.stateAfter.artifactRef] : []),
  ].map((artifactRef) => cloneDto(artifactRef))

const digestsFromEvent = (event: LiveLedgerEventEnvelope): ReadonlyArray<string> =>
  [
    event.payload?.digest,
    event.stateAfter?.digest,
  ].filter((digest): digest is string => typeof digest === 'string' && digest.length > 0)

const boundedEventProjection = (event: LiveLedgerEventEnvelope): Record<string, unknown> => ({
  eventId: event.eventId,
  target: cloneDto(event.target),
  targetKey: event.targetKey,
  ...(event.attachmentId ? { attachmentId: event.attachmentId } : null),
  eventKind: event.eventKind,
  label: event.label,
  sourceAuthority: event.sourceAuthority,
  order: cloneDto(event.order),
  watermark: cloneDto(event.watermark),
  ...(event.txnSeq !== undefined ? { txnSeq: event.txnSeq } : null),
  ...(event.opSeq !== undefined ? { opSeq: event.opSeq } : null),
  ...(event.linkId ? { linkId: event.linkId } : null),
  ...(event.artifactRef ? { artifactRef: cloneDto(event.artifactRef) } : null),
  ...(event.binding ? { binding: cloneDto(event.binding) } : null),
  ...(event.payload ? { payload: cloneDto(event.payload) } : null),
  ...(event.stateAfter ? { stateAfter: cloneDto(event.stateAfter) } : null),
  dropped: event.dropped.map((marker) => cloneDto(marker)),
  degraded: event.degraded.map((marker) => cloneDto(marker)),
  redacted: event.redacted.map((marker) => cloneDto(marker)),
  gaps: event.gaps.map((gap) => cloneDto(gap)),
})

export const makeLiveOperationDeniedFacet = (input: {
  readonly operationId: string
  readonly actorId: string
  readonly operationKind: LiveOperationKind
  readonly target: LiveTargetCoordinate
  readonly reason: LiveAdmissionDenialReason
  readonly binding?: LiveBindingHeader
  readonly budget?: LiveBudgetProfile
  readonly redactionPolicyRef?: string
  readonly stageClass?: LiveStageClass
}): LiveOperationDeniedFacet => ({
  kind: 'operation.denied',
  operationId: input.operationId,
  actorId: input.actorId,
  operationKind: input.operationKind,
  target: makeLiveTargetCoordinate(input.target),
  reason: input.reason,
  noMutation: true,
  stageClass: input.stageClass ?? defaultStageClass,
  ...(input.binding ? { binding: input.binding } : null),
  ...(input.budget ? { budget: input.budget } : null),
  ...(input.redactionPolicyRef ? { redactionPolicyRef: input.redactionPolicyRef } : null),
})

export const makeLiveOperationAcceptedFacet = (input: {
  readonly operationId: string
  readonly actorId: string
  readonly operationKind: LiveOperationKind
  readonly target: LiveTargetCoordinate
  readonly binding?: LiveBindingHeader
  readonly stageClass?: LiveStageClass
}): LiveOperationAcceptedFacet => ({
  kind: 'operation.accepted',
  operationId: input.operationId,
  actorId: input.actorId,
  operationKind: input.operationKind,
  target: makeLiveTargetCoordinate(input.target),
  stageClass: input.stageClass ?? defaultStageClass,
  ...(input.binding ? { binding: input.binding } : null),
})

export const makeLiveOperationCompletedFacet = (input: {
  readonly operationId: string
  readonly target: LiveTargetCoordinate
  readonly stageClass?: LiveStageClass
  readonly binding?: LiveBindingHeader
  readonly resultSummaryDigest?: string
  readonly artifactRef?: VerificationControlPlaneArtifactRef
}): LiveOperationCompletedFacet => ({
  kind: 'operation.completed',
  operationId: input.operationId,
  target: makeLiveTargetCoordinate(input.target),
  stageClass: input.stageClass ?? defaultStageClass,
  ...(input.binding ? { binding: input.binding } : null),
  ...(input.resultSummaryDigest ? { resultSummaryDigest: input.resultSummaryDigest } : null),
  ...(input.artifactRef ? { artifactRef: input.artifactRef } : null),
})

export const makeLiveOperationFailedFacet = (input: {
  readonly operationId: string
  readonly target: LiveTargetCoordinate
  readonly stageClass?: LiveStageClass
  readonly binding?: LiveBindingHeader
  readonly resultSummaryDigest?: string
  readonly boundedCause?: string
}): LiveOperationFailedFacet => ({
  kind: 'operation.failed',
  operationId: input.operationId,
  target: makeLiveTargetCoordinate(input.target),
  stageClass: input.stageClass ?? defaultStageClass,
  ...(input.binding ? { binding: input.binding } : null),
  ...(input.resultSummaryDigest ? { resultSummaryDigest: input.resultSummaryDigest } : null),
  ...(input.boundedCause ? { boundedCause: input.boundedCause } : null),
})

export const makeLiveCaptureFacet = (input: {
  readonly captureId: string
  readonly captureKind: LiveCaptureFacet['captureKind']
  readonly target: LiveTargetCoordinate
  readonly stageClass?: LiveStageClass
  readonly budget: LiveBudgetProfile
  readonly localOnly?: boolean
  readonly profileSummary?: LiveCaptureFacet['profileSummary']
  readonly samplingProfileRef?: string
  readonly dropped?: LiveDroppedMarker
  readonly degraded?: LiveDegradedMarker
  readonly redacted?: ReadonlyArray<LiveRedactionMarker>
  readonly artifactRef?: VerificationControlPlaneArtifactRef
}): LiveCaptureFacet => ({
  kind: 'live.capture',
  captureId: input.captureId,
  captureKind: input.captureKind,
  target: makeLiveTargetCoordinate(input.target),
  stageClass: input.stageClass ?? defaultStageClass,
  budget: input.budget,
  ...(input.localOnly !== undefined ? { localOnly: input.localOnly } : null),
  ...(input.profileSummary ? { profileSummary: cloneDto(input.profileSummary) } : null),
  ...(input.samplingProfileRef ? { samplingProfileRef: input.samplingProfileRef } : null),
  ...(input.dropped ? { dropped: input.dropped } : null),
  ...(input.degraded ? { degraded: input.degraded } : null),
  ...(input.redacted ? { redacted: input.redacted } : null),
  ...(input.artifactRef ? { artifactRef: input.artifactRef } : null),
})

export const makeLiveEvidenceGap = (input: {
  readonly gapId: string
  readonly code: string
  readonly summary: string
  readonly severity: 'info' | 'warning' | 'error'
  readonly stageClass?: LiveStageClass
  readonly target?: LiveTargetCoordinate
}): LiveEvidenceGap => ({
  kind: 'evidence.gap',
  gapId: input.gapId,
  code: input.code,
  summary: input.summary,
  severity: input.severity,
  stageClass: input.stageClass ?? defaultStageClass,
  ...(input.target ? { target: makeLiveTargetCoordinate(input.target) } : null),
})

export const makeLiveEvidenceLease = (input: {
  readonly leaseId: string
  readonly workspace: string
  readonly attachmentId: string
  readonly target: LiveTargetCoordinate
  readonly purpose: LiveEvidenceLeasePurpose
  readonly budget: LiveBudgetProfile
  readonly redactionPolicy: LiveEvidenceLeaseRedactionPolicy
  readonly retentionPolicy: LiveEvidenceLeaseRetentionPolicy
  readonly consumerIdentity: LiveEvidenceLeaseConsumerIdentity
  readonly createdAt?: number
}): LiveEvidenceLease => {
  if (!allowedLeasePurposes.has(input.purpose)) {
    throw new Error(`[Logix][LiveEvidence] unsupported evidence lease purpose: ${String(input.purpose)}`)
  }
  return {
    kind: 'live.evidence.lease',
    schemaVersion: 'live-evidence-lease.v1',
    leaseId: input.leaseId,
    workspace: input.workspace.trim() || 'unknown-workspace',
    attachmentId: input.attachmentId.trim() || 'unknown-attachment',
    target: makeLiveTargetCoordinate(input.target),
    purpose: input.purpose,
    budget: cloneDto(input.budget),
    redactionPolicy: cloneDto(input.redactionPolicy),
    retentionPolicy: cloneDto(input.retentionPolicy),
    consumerIdentity: cloneDto(input.consumerIdentity),
    ...(input.createdAt !== undefined ? { createdAt: input.createdAt } : null),
  }
}

export const makeLiveDaemonRetainedOwnerSegment = (input: {
  readonly segmentId: string
  readonly target: LiveTargetCoordinate
  readonly attachmentId: string
  readonly startWatermark: LiveLedgerWatermark
  readonly endWatermark: LiveLedgerWatermark
  readonly ownerEventIds: ReadonlyArray<string>
  readonly boundedEventProjections: ReadonlyArray<Record<string, unknown>>
  readonly artifactRefs: ReadonlyArray<VerificationControlPlaneArtifactRef>
  readonly digests: ReadonlyArray<string>
  readonly gaps: ReadonlyArray<LiveEvidenceGap>
  readonly redacted: ReadonlyArray<LiveRedactionMarker>
  readonly degraded: ReadonlyArray<LiveDegradedMarker>
  readonly retention: LiveDaemonRetainedOwnerSegmentRetention
  readonly leaseProvenance: LiveEvidenceLease
}): LiveDaemonRetainedOwnerSegment => ({
  kind: 'daemon.retained.owner.segment',
  schemaVersion: 'daemon-retained-owner-segment.v1',
  segmentId: input.segmentId,
  target: makeLiveTargetCoordinate(input.target),
  attachmentId: input.attachmentId.trim() || 'unknown-attachment',
  startWatermark: cloneDto(input.startWatermark),
  endWatermark: cloneDto(input.endWatermark),
  ownerEventIds: Array.from(input.ownerEventIds),
  boundedEventProjections: input.boundedEventProjections.map((projection) => cloneDto(projection)),
  artifactRefs: input.artifactRefs.map((artifactRef) => cloneDto(artifactRef)),
  digests: Array.from(input.digests),
  gaps: input.gaps.map((gap) => cloneDto(gap)),
  redacted: input.redacted.map((marker) => cloneDto(marker)),
  degraded: input.degraded.map((marker) => cloneDto(marker)),
  retention: cloneDto(input.retention),
  leaseProvenance: cloneDto(input.leaseProvenance),
})

export const makeLiveRetainedOwnerSegmentFromWindow = (input: {
  readonly segmentId: string
  readonly operationWindow: LiveOperationWindow
  readonly lease: LiveEvidenceLease
}): LiveDaemonRetainedOwnerSegment => {
  const events = input.operationWindow.events.slice(0, Math.max(0, input.lease.retentionPolicy.maxEvents))
  return makeLiveDaemonRetainedOwnerSegment({
    segmentId: input.segmentId,
    target: input.operationWindow.target,
    attachmentId: input.operationWindow.attachmentId ?? input.lease.attachmentId,
    startWatermark: input.operationWindow.startWatermark,
    endWatermark: input.operationWindow.endWatermark,
    ownerEventIds: events.map((event) => event.eventId),
    boundedEventProjections: events.map((event) => boundedEventProjection(event)),
    artifactRefs: uniqueMarkers(events.flatMap((event) => artifactRefsFromEvent(event))),
    digests: Array.from(new Set(events.flatMap((event) => digestsFromEvent(event)))),
    gaps: uniqueMarkers([
      ...input.operationWindow.gaps,
      ...events.flatMap((event) => event.gaps),
    ]).map((gap) => cloneDto(gap)),
    redacted: uniqueMarkers(events.flatMap((event) => event.redacted)).map((marker) => cloneDto(marker)),
    degraded: uniqueMarkers([
      ...input.operationWindow.degraded,
      ...events.flatMap((event) => event.degraded),
    ]).map((marker) => cloneDto(marker)),
    retention: input.lease.retentionPolicy,
    leaseProvenance: input.lease,
  })
}

export const toWorkbenchTruthInput = (facet: LiveEvidenceFacet): RuntimeWorkbenchTruthInput => {
  if (facet.kind === 'evidence.gap') {
    return {
      kind: 'evidence-gap',
      gapId: facet.gapId,
      code: facet.code,
      owner: 'bundle',
      summary: facet.summary,
      severity: facet.severity,
    }
  }

  return {
    kind: 'live-evidence',
    facet: facet as RuntimeWorkbenchLiveEvidenceInput['facet'],
  }
}
