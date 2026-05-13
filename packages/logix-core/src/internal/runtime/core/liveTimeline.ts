import type { VerificationControlPlaneArtifactRef } from '../../../ControlPlane.js'
import type {
  LiveDegradedMarker,
  LiveRedactionMarker,
  LiveTargetDescriptor,
} from './liveTypes.js'
import type {
  LiveInspectArtifact,
  LiveInspectFacetPayloadBase,
  LiveStructuredEvidenceGap,
} from './liveInspect.js'
import { makeLiveInspectArtifact, makeLiveInspectGap, makeLiveTimelineContinuationGap } from './liveInspect.js'
import type {
  FieldInspectGap,
  FieldRuntimeInspectEventMetadata,
  FieldSemanticEventPayload,
} from './liveFieldInspect.js'
import type {
  LiveLedgerDroppedMarker,
  LiveLedgerEventEnvelope,
  LiveLedgerEventKind,
  LiveLedgerOrderKey,
  LiveLedgerPayloadRef,
  LiveLedgerWatermark,
  LiveOperationWindow,
  LiveStateAfterSourceRef,
} from './liveLedger.js'
import { liveTargetCoordinateKey } from './liveTypes.js'

export type LiveTimelineSchemaVersion = 'live-timeline.v1'
export type LiveTimelineItemSchemaVersion = 'live-timeline-item.v1'
export type LiveTimelineCursorSchemaVersion = 'live-timeline-cursor.v1'
export type LiveTimelineProjectionMode = 'timeline-default' | 'timeline-field-filtered'

export type LiveTimelineCompleteness = LiveOperationWindow['completeness']

export interface LiveTimelineFieldFilter {
  readonly fieldPath: string
}

export interface LiveTimelineQuery {
  readonly target: LiveTargetDescriptor
  readonly limit?: number
  readonly eventKinds?: ReadonlyArray<LiveLedgerEventKind>
  readonly field?: LiveTimelineFieldFilter
}

export type LiveTimelineGap = LiveStructuredEvidenceGap
type LiveTimelineFieldGap = Extract<LiveTimelineGap, { readonly owner: 'field-runtime' }>

export interface LiveTimelineQueryFingerprint {
  readonly targetKey: string
  readonly attachmentId?: string
  readonly fieldFilter?: string
  readonly projectionSchemaVersion: LiveTimelineSchemaVersion
  readonly redactionPolicyDigest: string
  readonly projectionMode: LiveTimelineProjectionMode
}

export interface LiveTimelineCursorResumeCertificate {
  readonly schemaVersion: LiveTimelineCursorSchemaVersion
  readonly targetKey: string
  readonly attachmentId?: string
  readonly queryFingerprint: LiveTimelineQueryFingerprint
  readonly runtimeResumeWatermark: LiveLedgerWatermark
  readonly coverageEndWatermark: LiveLedgerWatermark
  readonly completenessAtIssue: LiveTimelineCompleteness
  readonly locatorHint?: string
}

export interface LiveTimelineCursorOutput {
  readonly next: string
}

export interface LiveTimelineSourceSegment {
  readonly sourceKind: 'runtime-head' | 'daemon-retained-segment'
  readonly target: LiveTargetDescriptor
  readonly attachmentId?: string
  readonly startWatermark: LiveLedgerWatermark
  readonly endWatermark: LiveLedgerWatermark
  readonly completeness: LiveTimelineCompleteness
  readonly gaps: ReadonlyArray<LiveTimelineGap>
  readonly dropped: ReadonlyArray<LiveLedgerDroppedMarker>
  readonly degraded: ReadonlyArray<LiveDegradedMarker>
  readonly redacted: ReadonlyArray<LiveRedactionMarker>
  readonly retainedSegmentRef?: string
}

export interface LiveTimelineSafeResumeBoundary {
  readonly target: LiveTargetDescriptor
  readonly attachmentId?: string
  readonly resumeWatermark?: LiveLedgerWatermark
  readonly reason: 'complete-window' | 'partial-window' | 'degraded-window'
  readonly gaps: ReadonlyArray<LiveTimelineGap>
}

export interface LiveTimelineItem {
  readonly kind: 'live.timeline.item'
  readonly schemaVersion: LiveTimelineItemSchemaVersion
  readonly itemId: string
  readonly eventId: string
  readonly target: LiveLedgerEventEnvelope['target']
  readonly targetKey: string
  readonly eventKind: LiveLedgerEventKind
  readonly label: string
  readonly sourceAuthority: LiveLedgerEventEnvelope['sourceAuthority']
  readonly order: LiveLedgerOrderKey
  readonly watermark: LiveLedgerWatermark
  readonly txnSeq?: number
  readonly opSeq?: number
  readonly linkId?: string
  readonly artifactRef?: VerificationControlPlaneArtifactRef
  readonly binding?: LiveLedgerEventEnvelope['binding']
  readonly payload?: LiveLedgerPayloadRef
  readonly stateAfter?: LiveStateAfterSourceRef
  readonly field?: LiveTimelineFieldEventRef
  readonly dropped: ReadonlyArray<LiveLedgerDroppedMarker>
  readonly degraded: ReadonlyArray<LiveDegradedMarker>
  readonly redacted: ReadonlyArray<LiveRedactionMarker>
  readonly gaps: ReadonlyArray<LiveTimelineGap>
}

export interface LiveTimelineFieldEventRef {
  readonly owner: 'field-runtime'
  readonly fieldPath: string
  readonly fieldIdentityDigest?: FieldSemanticEventPayload['fieldIdentityDigest']
  readonly semanticEventKind: FieldSemanticEventPayload['semanticEventKind']
  readonly relationDigest?: FieldSemanticEventPayload['relationDigest']
  readonly fieldSnapshotDigest: string
  readonly sourceRef?: FieldSemanticEventPayload['sourceRef']
  readonly linkId?: string
}

export interface LiveTimelineProjection {
  readonly kind: 'live.timeline.projection'
  readonly schemaVersion: LiveTimelineSchemaVersion
  readonly generatedBy: string
  readonly target: LiveTargetDescriptor
  readonly targetKey: string
  readonly startWatermark: LiveLedgerWatermark
  readonly endWatermark: LiveLedgerWatermark
  readonly watermarkRange: {
    readonly start: LiveLedgerWatermark
    readonly end: LiveLedgerWatermark
  }
  readonly coverageStart: LiveLedgerWatermark
  readonly coverageEnd: LiveLedgerWatermark
  readonly completeness: LiveTimelineCompleteness
  readonly cursor?: LiveTimelineCursorOutput
  readonly sourceSegments: ReadonlyArray<LiveTimelineSourceSegment>
  readonly safeResumeBoundary: LiveTimelineSafeResumeBoundary
  readonly items: ReadonlyArray<LiveTimelineItem>
  readonly dropped: ReadonlyArray<LiveLedgerDroppedMarker>
  readonly degraded: ReadonlyArray<LiveDegradedMarker>
  readonly redacted: ReadonlyArray<LiveRedactionMarker>
  readonly gaps: ReadonlyArray<LiveTimelineGap>
  readonly budget: {
    readonly maxEvents: number
    readonly maxInlineBytes: number
    readonly timeoutMs?: number
  }
}

export interface LiveTimelineInspectPayload extends LiveInspectFacetPayloadBase {
  readonly timeline: LiveTimelineProjection
}

export interface MakeLiveTimelineInspectArtifactInput {
  readonly target: LiveTargetDescriptor
  readonly producer: string
  readonly operationWindow: LiveOperationWindow
  readonly budget?: {
    readonly maxEvents: number
    readonly maxInlineBytes: number
    readonly timeoutMs?: number
  }
  readonly gaps?: ReadonlyArray<LiveTimelineGap>
  readonly fieldFilter?: LiveTimelineFieldFilter
  readonly fieldEventMetadata?: ReadonlyArray<FieldRuntimeInspectEventMetadata>
  readonly sourceSegments?: ReadonlyArray<LiveTimelineSourceSegment>
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

const liveTimelineGapKey = (gap: LiveTimelineGap): string =>
  `${gap.owner}:${gap.code}:${gap.gapId}`

const dedupeLiveTimelineGaps = (
  gaps: ReadonlyArray<LiveTimelineGap>,
): ReadonlyArray<LiveTimelineGap> => {
  const seen = new Set<string>()
  const out: LiveTimelineGap[] = []
  for (const gap of gaps) {
    const key = liveTimelineGapKey(gap)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(gap)
  }
  return out
}

const encodeUtf8Base64Url = (value: string): string => {
  const encoder = (globalThis as any).Buffer as typeof Buffer | undefined
  if (encoder) return encoder.from(value, 'utf8').toString('base64url')
  const binary = btoa(unescape(encodeURIComponent(value)))
  return binary.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

const decodeUtf8Base64Url = (value: string): string => {
  const decoder = (globalThis as any).Buffer as typeof Buffer | undefined
  if (decoder) return decoder.from(value, 'base64url').toString('utf8')
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  return decodeURIComponent(escape(atob(padded)))
}

export const encodeLiveTimelineCursorToken = (
  certificate: LiveTimelineCursorResumeCertificate,
): string => `ltc1.${encodeUtf8Base64Url(JSON.stringify(certificate))}`

export const decodeLiveTimelineCursorToken = (
  token: string,
): LiveTimelineCursorResumeCertificate | undefined => {
  if (typeof token !== 'string' || !token.startsWith('ltc1.')) return undefined
  try {
    const decoded = JSON.parse(decodeUtf8Base64Url(token.slice('ltc1.'.length))) as Partial<LiveTimelineCursorResumeCertificate>
    if (decoded.schemaVersion !== 'live-timeline-cursor.v1') return undefined
    if (typeof decoded.targetKey !== 'string' || !decoded.queryFingerprint) return undefined
    if (!decoded.runtimeResumeWatermark || !decoded.coverageEndWatermark) return undefined
    return decoded as LiveTimelineCursorResumeCertificate
  } catch {
    return undefined
  }
}

const queryFingerprintForTimeline = (input: MakeLiveTimelineInspectArtifactInput): LiveTimelineQueryFingerprint => {
  const targetKey = input.operationWindow.targetKey
  const attachmentId = input.operationWindow.attachmentId ?? input.target.attachmentId
  return {
    targetKey,
    ...(attachmentId ? { attachmentId } : null),
    ...(input.fieldFilter ? { fieldFilter: input.fieldFilter.fieldPath } : null),
    projectionSchemaVersion: 'live-timeline.v1',
    redactionPolicyDigest: 'redaction:default',
    projectionMode: input.fieldFilter ? 'timeline-field-filtered' : 'timeline-default',
  }
}

const cursorCertificateForTimeline = (
  input: MakeLiveTimelineInspectArtifactInput,
  completeness: LiveTimelineCompleteness,
): LiveTimelineCursorResumeCertificate => {
  const attachmentId = input.operationWindow.attachmentId ?? input.target.attachmentId
  return {
    schemaVersion: 'live-timeline-cursor.v1',
    targetKey: input.operationWindow.targetKey,
    ...(attachmentId ? { attachmentId } : null),
    queryFingerprint: queryFingerprintForTimeline(input),
    runtimeResumeWatermark: cloneDto(input.operationWindow.endWatermark),
    coverageEndWatermark: cloneDto(input.operationWindow.endWatermark),
    completenessAtIssue: completeness,
  }
}

const sourceSegmentsForTimeline = (
  input: MakeLiveTimelineInspectArtifactInput,
  gaps: ReadonlyArray<LiveTimelineGap>,
  completeness: LiveTimelineCompleteness,
): ReadonlyArray<LiveTimelineSourceSegment> => {
  const attachmentId = input.operationWindow.attachmentId ?? input.target.attachmentId
  const runtimeHead: LiveTimelineSourceSegment = {
    sourceKind: 'runtime-head',
    target: cloneDto(input.target),
    ...(attachmentId ? { attachmentId } : null),
    startWatermark: cloneDto(input.operationWindow.startWatermark),
    endWatermark: cloneDto(input.operationWindow.endWatermark),
    completeness,
    gaps: gaps.map((gap) => cloneDto(gap)),
    dropped: input.operationWindow.dropped.map((marker) => cloneDto(marker)),
    degraded: input.operationWindow.degraded.map((marker) => cloneDto(marker)),
    redacted: input.operationWindow.events.flatMap((event) => event.redacted.map((marker) => cloneDto(marker))),
  }
  return [...(input.sourceSegments ?? []).map((segment) => cloneDto(segment)), runtimeHead]
}

const sourceSegmentChainGaps = (
  input: MakeLiveTimelineInspectArtifactInput,
): ReadonlyArray<LiveTimelineGap> => {
  const retained = input.sourceSegments ?? []
  if (retained.length === 0) return []
  const targetKey = input.operationWindow.targetKey
  const attachmentId = input.operationWindow.attachmentId ?? input.target.attachmentId
  const gaps: LiveTimelineGap[] = []
  for (const segment of retained) {
    if (segment.startWatermark.targetKey !== targetKey || segment.endWatermark.targetKey !== targetKey) {
      gaps.push(makeLiveTimelineContinuationGap({ code: 'timeline-watermark-incomparable', target: input.target }))
      continue
    }
    if (attachmentId && segment.attachmentId && segment.attachmentId !== attachmentId) {
      gaps.push(makeLiveTimelineContinuationGap({ code: 'timeline-cursor-mismatch', target: input.target }))
      continue
    }
    if (segment.endWatermark.ledgerSeq + 1 < input.operationWindow.startWatermark.ledgerSeq) {
      gaps.push(makeLiveTimelineContinuationGap({ code: 'timeline-retention-gap', target: input.target }))
    }
  }
  return gaps
}

const safeResumeBoundaryForTimeline = (
  input: MakeLiveTimelineInspectArtifactInput,
  gaps: ReadonlyArray<LiveTimelineGap>,
  completeness: LiveTimelineCompleteness,
): LiveTimelineSafeResumeBoundary => {
  const attachmentId = input.operationWindow.attachmentId ?? input.target.attachmentId
  return {
    target: cloneDto(input.target),
    ...(attachmentId ? { attachmentId } : null),
    resumeWatermark: cloneDto(input.operationWindow.endWatermark),
    reason:
      completeness === 'complete'
        ? 'complete-window'
        : completeness === 'partial-dropped'
          ? 'partial-window'
          : 'degraded-window',
    gaps: gaps.map((gap) => cloneDto(gap)),
  }
}

const budgetForTimeline = (
  input: Pick<MakeLiveTimelineInspectArtifactInput, 'budget' | 'operationWindow'>,
): { readonly maxEvents: number; readonly maxInlineBytes: number; readonly timeoutMs?: number } => {
  if (input.budget) return input.budget
  if (input.operationWindow.budget.request) return input.operationWindow.budget.request
  return {
    maxEvents: input.operationWindow.limit,
    maxInlineBytes: input.operationWindow.budget.retention.maxInlineBytes,
  }
}

const projectionBytesForTimeline = (
  budget: { readonly maxEvents: number; readonly maxInlineBytes: number },
): number => Math.max(budget.maxInlineBytes, Math.ceil(budget.maxInlineBytes * 4))

const fieldMissingMetadataGap = (input: MakeLiveTimelineInspectArtifactInput): LiveTimelineGap =>
  makeLiveInspectGap({
    gapId: `live:timeline:field:missing-field-event-meta:${liveTargetCoordinateKey(input.target)}:${input.fieldFilter?.fieldPath ?? '$unknown'}`,
    code: 'missing-field-event-meta',
    summary: 'Field semantic event metadata is missing for this timeline field filter.',
    target: input.target,
    owner: 'field-runtime',
    reopenBar: 'reopen only if field-runtime semantic event metadata ownership changes',
  })

const cloneFieldGap = (gap: FieldInspectGap): LiveTimelineFieldGap => cloneDto(gap) as LiveTimelineFieldGap

const fieldRefFromPayload = (payload: FieldSemanticEventPayload): LiveTimelineFieldEventRef => ({
  owner: 'field-runtime',
  fieldPath: payload.fieldPath,
  ...(payload.fieldIdentityDigest ? { fieldIdentityDigest: payload.fieldIdentityDigest } : null),
  semanticEventKind: payload.semanticEventKind,
  ...(payload.relationDigest ? { relationDigest: payload.relationDigest } : null),
  fieldSnapshotDigest: payload.fieldSnapshotDigest,
  ...(payload.sourceRef ? { sourceRef: cloneDto(payload.sourceRef) } : null),
  ...(payload.linkId ? { linkId: payload.linkId } : null),
})

const metadataMatchesEvent = (
  metadata: FieldRuntimeInspectEventMetadata,
  event: LiveLedgerEventEnvelope,
): boolean => {
  if (!metadata.envelope) return false
  if (metadata.envelope.eventId === event.eventId) return true
  if (metadata.envelope.watermark.targetKey === event.targetKey && metadata.envelope.watermark.ledgerSeq === event.watermark.ledgerSeq) return true
  return Boolean(metadata.envelope.linkId && event.linkId && metadata.envelope.linkId === event.linkId)
}

const timelineItemFromLedgerEvent = (
  event: LiveLedgerEventEnvelope,
  field?: LiveTimelineFieldEventRef,
): LiveTimelineItem => ({
  kind: 'live.timeline.item',
  schemaVersion: 'live-timeline-item.v1',
  itemId: event.eventId,
  eventId: event.eventId,
  target: cloneDto(event.target),
  targetKey: event.targetKey,
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
  ...(field ? { field: cloneDto(field) } : null),
  dropped: event.dropped.map((marker) => cloneDto(marker)),
  degraded: event.degraded.map((marker) => cloneDto(marker)),
  redacted: event.redacted.map((marker) => cloneDto(marker)),
  gaps: event.gaps.map((gap) => cloneDto(gap)),
})

const fieldFilteredItemsAndGaps = (input: MakeLiveTimelineInspectArtifactInput): {
  readonly items: ReadonlyArray<LiveTimelineItem>
  readonly fieldGaps: ReadonlyArray<LiveTimelineGap>
  readonly complete: boolean
} => {
  const filter = input.fieldFilter
  if (!filter) {
    return {
      items: input.operationWindow.events.map((event) => timelineItemFromLedgerEvent(event)),
      fieldGaps: [],
      complete: true,
    }
  }

  const metadata = input.fieldEventMetadata ?? []
  const metadataGaps = metadata.flatMap((entry) => entry.gaps).map((gap) => cloneFieldGap(gap))
  if (metadata.length === 0) {
    return {
      items: [],
      fieldGaps: [fieldMissingMetadataGap(input)],
      complete: false,
    }
  }

  const items: Array<LiveTimelineItem> = []
  let coveredEvents = 0
  for (const event of input.operationWindow.events) {
    const eventMetadata = metadata.filter((entry) => metadataMatchesEvent(entry, event))
    if (eventMetadata.length > 0) coveredEvents += 1
    const matchedPayload = eventMetadata.find((entry) => entry.payload?.fieldPath === filter.fieldPath)?.payload
    if (matchedPayload) {
      items.push(timelineItemFromLedgerEvent(event, fieldRefFromPayload(matchedPayload)))
    }
  }

  const fieldGaps: Array<LiveTimelineGap> = [...metadataGaps]
  if (metadataGaps.length === 0 && coveredEvents < input.operationWindow.events.length) {
    fieldGaps.push(fieldMissingMetadataGap(input))
  }
  return {
    items,
    fieldGaps,
    complete: fieldGaps.length === 0,
  }
}

export const makeLiveTimelineProjection = (
  input: MakeLiveTimelineInspectArtifactInput,
): LiveTimelineProjection => {
  const budget = budgetForTimeline(input)
  const fieldProjection = fieldFilteredItemsAndGaps(input)
  const chainGaps = sourceSegmentChainGaps(input)
  const gaps = dedupeLiveTimelineGaps([
    ...input.operationWindow.gaps,
    ...(input.gaps ?? []),
    ...fieldProjection.fieldGaps,
    ...chainGaps,
  ])
  const completeness: LiveTimelineCompleteness = input.fieldFilter && !fieldProjection.complete
    ? 'degraded'
    : gaps.some((gap) => gap.code === 'timeline-retention-gap')
      ? 'partial-dropped'
      : gaps.some((gap) => gap.code === 'timeline-watermark-incomparable' || gap.code === 'timeline-cursor-mismatch')
        ? 'degraded'
        : input.operationWindow.completeness
  const certificate = cursorCertificateForTimeline(input, completeness)
  const disabledLiveInspect = input.operationWindow.gaps.some((gap) => gap.code === 'live-ledger-disabled')
  return {
    kind: 'live.timeline.projection',
    schemaVersion: 'live-timeline.v1',
    generatedBy: input.producer,
    target: cloneDto(input.target),
    targetKey: input.operationWindow.targetKey,
    startWatermark: cloneDto(input.operationWindow.startWatermark),
    endWatermark: cloneDto(input.operationWindow.endWatermark),
    watermarkRange: {
      start: cloneDto(input.operationWindow.startWatermark),
      end: cloneDto(input.operationWindow.endWatermark),
    },
    coverageStart: cloneDto(input.operationWindow.startWatermark),
    coverageEnd: cloneDto(input.operationWindow.endWatermark),
    completeness,
    ...(disabledLiveInspect ? null : { cursor: { next: encodeLiveTimelineCursorToken(certificate) } }),
    sourceSegments: sourceSegmentsForTimeline(input, gaps, completeness),
    safeResumeBoundary: safeResumeBoundaryForTimeline(input, gaps, completeness),
    items: fieldProjection.items,
    dropped: input.operationWindow.dropped.map((marker) => cloneDto(marker)),
    degraded: input.operationWindow.degraded.map((marker) => cloneDto(marker)),
    redacted: input.operationWindow.events.flatMap((event) => event.redacted.map((marker) => cloneDto(marker))),
    gaps: gaps.map((gap) => cloneDto(gap)),
    budget,
  }
}

export const makeLiveTimelineInspectArtifact = (
  input: MakeLiveTimelineInspectArtifactInput,
): LiveInspectArtifact<'timeline'> => {
  const budget = budgetForTimeline(input)
  return makeLiveInspectArtifact({
    section: 'timeline',
    target: input.target,
    sourceAuthority: 'runtime-live',
    producer: input.producer,
    budget,
    projectionMaxDepth: 12,
    projectionMaxJsonBytes: projectionBytesForTimeline(budget),
    projectionMaxStringLength: projectionBytesForTimeline(budget),
    gaps: [...input.operationWindow.gaps, ...(input.gaps ?? [])],
    payload: {
      schemaVersion: 'live-inspect.v1',
      generatedBy: input.producer,
      timeline: makeLiveTimelineProjection(input),
    } satisfies LiveTimelineInspectPayload,
  })
}
