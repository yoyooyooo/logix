import type { VerificationControlPlaneArtifactRef } from '../../../ControlPlane.js'
import type { JsonValue } from '../../protocol/jsonValue.js'
import { projectJsonValue } from '../../protocol/jsonValue.js'
import type { RuntimeDebugEventRef } from './DebugSink.record.js'
import type { LiveStructuredEvidenceGap } from './liveInspect.js'
import type {
  LiveBindingHeader,
  LiveBudgetProfile,
  LiveRedactionMarker,
  LiveTargetCoordinate,
} from './liveTypes.js'
import {
  liveTargetCoordinateKey,
  makeLiveTargetCoordinate,
} from './liveTypes.js'

export type LiveLedgerSchemaVersion = 'live-ledger.v1'
export type LiveLedgerEventSchemaVersion = 'live-ledger-event.v1'
export type LiveLedgerMarkerSchemaVersion = 'live-ledger-marker.v1'
export type LiveLedgerSourceAuthority = 'runtime-live'

export type LiveLedgerEventKind =
  | 'operation.accepted'
  | 'operation.denied'
  | 'operation.completed'
  | 'operation.failed'
  | 'capture.eventWindow'
  | 'diagnostic'
  | 'process'

export interface LiveLedgerRetentionPolicy {
  readonly schemaVersion: 'live-ledger-retention.v1'
  readonly maxEvents: number
  readonly maxInlineBytes: number
  readonly maxPayloadSummaryBytes: number
  readonly maxStateAfterSummaryBytes: number
  readonly maxWindowEvents: number
  readonly maxDroppedMarkers: number
  readonly maxCarrierQueueEntries: number
}

export const defaultLiveLedgerRetentionPolicy = {
  schemaVersion: 'live-ledger-retention.v1',
  maxEvents: 128,
  maxInlineBytes: 64 * 1024,
  maxPayloadSummaryBytes: 2 * 1024,
  maxStateAfterSummaryBytes: 1024,
  maxWindowEvents: 64,
  maxDroppedMarkers: 16,
  maxCarrierQueueEntries: 16,
} as const satisfies LiveLedgerRetentionPolicy

export interface LiveOperationLedger {
  readonly kind: 'live.operation.ledger'
  readonly schemaVersion: LiveLedgerSchemaVersion
  readonly target: LiveTargetCoordinate
  readonly targetKey: string
  readonly retention: LiveLedgerRetentionPolicy
  readonly currentWatermark: LiveLedgerWatermark
  readonly eventCount: number
  readonly inlineBytes: number
  readonly dropped: ReadonlyArray<LiveLedgerDroppedMarker>
  readonly degraded: ReadonlyArray<LiveLedgerDegradedMarker>
}

export interface LiveLedgerEventEnvelope {
  readonly kind: 'live.ledger.event'
  readonly schemaVersion: LiveLedgerEventSchemaVersion
  readonly eventId: string
  readonly target: LiveTargetCoordinate
  readonly targetKey: string
  readonly attachmentId?: string
  readonly eventKind: LiveLedgerEventKind
  readonly label: string
  readonly sourceAuthority: LiveLedgerSourceAuthority
  readonly order: LiveLedgerOrderKey
  readonly watermark: LiveLedgerWatermark
  readonly txnSeq?: number
  readonly opSeq?: number
  readonly linkId?: string
  readonly artifactRef?: VerificationControlPlaneArtifactRef
  readonly binding?: LiveBindingHeader
  readonly payload?: LiveLedgerPayloadRef
  readonly stateAfter?: LiveStateAfterSourceRef
  readonly budget: LiveLedgerBudgetSnapshot
  readonly dropped: ReadonlyArray<LiveLedgerDroppedMarker>
  readonly degraded: ReadonlyArray<LiveLedgerDegradedMarker>
  readonly redacted: ReadonlyArray<LiveRedactionMarker>
  readonly gaps: ReadonlyArray<LiveStructuredEvidenceGap>
}

export interface LiveLedgerOrderKey {
  readonly kind: 'live.ledger.order'
  readonly schemaVersion: 'live-ledger-order.v1'
  readonly targetKey: string
  readonly ledgerSeq: number
  readonly coordinate:
    | { readonly kind: 'ledger-seq'; readonly ledgerSeq: number }
    | { readonly kind: 'txn-op'; readonly txnSeq: number; readonly opSeq: number }
    | { readonly kind: 'txn-event'; readonly txnSeq: number; readonly eventSeq: number }
    | { readonly kind: 'ingest'; readonly ingestSeq: number; readonly degraded: LiveLedgerDegradedMarker }
}

export interface LiveLedgerWatermark {
  readonly kind: 'live.ledger.watermark'
  readonly schemaVersion: 'live-ledger-watermark.v1'
  readonly target: LiveTargetCoordinate
  readonly targetKey: string
  readonly ledgerSeq: number
  readonly eventId?: string
  readonly droppedBeforeSeq?: number
  readonly inlineBytes: number
}

export interface LiveLedgerBudgetSnapshot {
  readonly retention: LiveLedgerRetentionPolicy
  readonly request?: LiveBudgetProfile
  readonly inlineBytes: number
  readonly payloadBytes?: number
  readonly stateAfterBytes?: number
}

export interface LiveLedgerPayloadRef {
  readonly kind: 'bounded-summary' | 'artifact-ref' | 'owner-ref'
  readonly owner: 'runtime-live' | 'reflection' | 'field-runtime' | 'react-host' | 'profile'
  readonly digest?: string
  readonly summary?: JsonValue
  readonly summaryBytes?: number
  readonly artifactRef?: VerificationControlPlaneArtifactRef
  readonly ownerRef?: string
}

export interface LiveStateAfterSourceRef {
  readonly kind: 'live.stateAfter.sourceRef'
  readonly schemaVersion: 'live-state-after-source-ref.v1'
  readonly eventId: string
  readonly sourceKind: 'recorded-post-event-artifact' | 'event-carried-state-artifact' | 'current-head-exact'
  readonly sourceWatermark: LiveLedgerWatermark
  readonly artifactRef?: VerificationControlPlaneArtifactRef
  readonly digest?: string
  readonly boundedSummary?: {
    readonly value: JsonValue
    readonly bytes: number
    readonly truncated: boolean
  }
}

export interface LiveOperationWindowRequest {
  readonly target: LiveTargetCoordinate
  readonly attachmentId?: string
  readonly cursor?: LiveLedgerWatermark
  readonly limit?: number
  readonly eventKinds?: ReadonlyArray<LiveLedgerEventKind>
  readonly budget?: LiveBudgetProfile
}

export interface LiveOperationWindow {
  readonly kind: 'live.operation.window'
  readonly schemaVersion: 'live-operation-window.v1'
  readonly target: LiveTargetCoordinate
  readonly targetKey: string
  readonly attachmentId?: string
  readonly startWatermark: LiveLedgerWatermark
  readonly endWatermark: LiveLedgerWatermark
  readonly cursor?: LiveLedgerWatermark
  readonly limit: number
  readonly events: ReadonlyArray<LiveLedgerEventEnvelope>
  readonly completeness: 'complete' | 'partial-dropped' | 'degraded'
  readonly dropped: ReadonlyArray<LiveLedgerDroppedMarker>
  readonly degraded: ReadonlyArray<LiveLedgerDegradedMarker>
  readonly gaps: ReadonlyArray<LiveStructuredEvidenceGap>
  readonly budget: LiveLedgerBudgetSnapshot
}

export interface LiveLedgerEnvelopeJoinRef {
  readonly kind: 'live.ledger.envelopeJoinRef'
  readonly schemaVersion: 'live-ledger-envelope-join-ref.v1'
  readonly sourceAuthority: LiveLedgerSourceAuthority
  readonly eventId: string
  readonly target: LiveTargetCoordinate
  readonly targetKey: string
  readonly watermark: LiveLedgerWatermark
  readonly txnSeq?: number
  readonly opSeq?: number
  readonly linkId?: string
}

export interface LiveLedgerDroppedMarker {
  readonly kind: 'live.ledger.dropped'
  readonly schemaVersion: LiveLedgerMarkerSchemaVersion
  readonly target: LiveTargetCoordinate
  readonly targetKey: string
  readonly reason:
    | 'retention.maxEvents'
    | 'retention.maxInlineBytes'
    | 'projection.maxInlineBytes'
    | 'cleanup.target-terminal'
    | 'carrier.target-closed'
  readonly droppedCount: number
  readonly firstDroppedSeq?: number
  readonly lastDroppedSeq?: number
  readonly observedAt: LiveLedgerWatermark
}

export interface LiveLedgerDegradedMarker {
  readonly kind: 'live.ledger.degraded'
  readonly schemaVersion: LiveLedgerMarkerSchemaVersion
  readonly target: LiveTargetCoordinate
  readonly targetKey: string
  readonly reason:
    | 'missing-runtime-coordinate'
    | 'payload-over-budget'
    | 'state-after-over-budget'
    | 'state-after-redacted'
    | 'state-after-watermark-mismatch'
    | 'unsupported-debug-event'
    | 'diagnostics-disabled'
    | 'window-partial'
  readonly summary: string
  readonly observedAt: LiveLedgerWatermark
}

export interface LiveLedgerDiagnostics {
  readonly ledgerStoreAllocations: number
  readonly ledgerEventAllocations: number
  readonly ledgerWindowProjectionAllocations: number
  readonly diagnosticProjectionAllocations: number
  readonly carrierQueueEntries: number
}

export type LiveLedgerWatermarkComparison = 'before' | 'same' | 'after' | 'incomparable'

export interface LiveLedgerPayloadInput {
  readonly owner?: LiveLedgerPayloadRef['owner']
  readonly digest?: string
  readonly summary?: unknown
  readonly artifactRef?: VerificationControlPlaneArtifactRef
  readonly ownerRef?: string
}

export interface LiveLedgerStateAfterInput {
  readonly sourceKind: LiveStateAfterSourceRef['sourceKind']
  readonly sourceWatermark?: LiveLedgerWatermark
  readonly artifactRef?: VerificationControlPlaneArtifactRef
  readonly digest?: string
  readonly boundedSummary?: unknown
  readonly redacted?: boolean
}

export interface LiveLedgerRecordOperationInput {
  readonly target: LiveTargetCoordinate
  readonly attachmentId?: string
  readonly eventKind: LiveLedgerEventKind
  readonly label: string
  readonly txnSeq?: number
  readonly opSeq?: number
  readonly eventSeq?: number
  readonly linkId?: string
  readonly artifactRef?: VerificationControlPlaneArtifactRef
  readonly binding?: LiveBindingHeader
  readonly payload?: LiveLedgerPayloadInput
  readonly stateAfter?: LiveLedgerStateAfterInput
  readonly budget?: LiveBudgetProfile
  readonly dropped?: ReadonlyArray<LiveLedgerDroppedMarker>
  readonly degraded?: ReadonlyArray<LiveLedgerDegradedMarker>
  readonly redacted?: ReadonlyArray<LiveRedactionMarker>
  readonly gaps?: ReadonlyArray<LiveStructuredEvidenceGap>
}

export interface LiveDebugSourceRecordMarkers {
  readonly degraded?: ReadonlyArray<LiveLedgerDegradedMarker>
  readonly redacted?: ReadonlyArray<LiveRedactionMarker>
  readonly gaps?: ReadonlyArray<LiveStructuredEvidenceGap>
}

export type LiveDebugSourceRecord =
  | ({
      readonly type: 'diagnostic'
      readonly target?: LiveTargetCoordinate
      readonly code: string
      readonly severity: 'error' | 'warning' | 'info'
      readonly message: string
      readonly hint?: string
      readonly actionTag?: string
      readonly txnSeq?: number
      readonly opSeq?: number
      readonly eventSeq?: number
      readonly linkId?: string
      readonly meta?: unknown
    } & LiveDebugSourceRecordMarkers)
  | ({
      readonly type: 'process' | `process:${string}`
      readonly target?: LiveTargetCoordinate
      readonly label?: string
      readonly severity?: 'error' | 'warning' | 'info'
      readonly txnSeq?: number
      readonly opSeq?: number
      readonly eventSeq?: number
      readonly linkId?: string
      readonly meta?: unknown
    } & LiveDebugSourceRecordMarkers)
  | ({
      readonly type: string
      readonly target?: LiveTargetCoordinate
      readonly label?: string
      readonly txnSeq?: number
      readonly opSeq?: number
      readonly eventSeq?: number
      readonly linkId?: string
      readonly meta?: unknown
    } & LiveDebugSourceRecordMarkers)

const isDiagnosticDebugSourceRecord = (
  record: LiveDebugSourceRecord,
): record is Extract<LiveDebugSourceRecord, { readonly type: 'diagnostic' }> =>
  record.type === 'diagnostic'

const isProcessDebugSourceRecord = (
  record: LiveDebugSourceRecord,
): record is Extract<LiveDebugSourceRecord, { readonly type: 'process' | `process:${string}` }> =>
  record.type === 'process' || record.type.startsWith('process:')

export interface LiveOperationLedgerStore {
  readonly recordOperationEvent: (input: LiveLedgerRecordOperationInput) => LiveLedgerEventEnvelope | undefined
  readonly readWindow: (request: LiveOperationWindowRequest) => LiveOperationWindow
  readonly addDebugSourceRecord: (record: LiveDebugSourceRecord) => void
  readonly addRuntimeDebugEventRef: (ref: RuntimeDebugEventRef, target?: LiveTargetCoordinate) => void
  readonly cleanupTarget: (target: LiveTargetCoordinate, reason?: LiveLedgerDroppedMarker['reason']) => void
  readonly cleanupAttachment: (
    attachmentId: string,
    targets: ReadonlyArray<LiveTargetCoordinate>,
    reason?: LiveLedgerDroppedMarker['reason'],
  ) => void
  readonly getLedger: (target: LiveTargetCoordinate) => LiveOperationLedger | undefined
  readonly getDiagnostics: () => LiveLedgerDiagnostics
  readonly hasTargetStore: (target: LiveTargetCoordinate) => boolean
  readonly isTargetCleaned: (target: LiveTargetCoordinate) => boolean
}

interface TargetLedgerStore {
  readonly target: LiveTargetCoordinate
  readonly targetKey: string
  readonly retention: LiveLedgerRetentionPolicy
  events: Array<LiveLedgerEventEnvelope>
  dropped: Array<LiveLedgerDroppedMarker>
  degraded: Array<LiveLedgerDegradedMarker>
  inlineBytes: number
  nextSeq: number
  droppedBeforeSeq?: number
  currentWatermark: LiveLedgerWatermark
}

type MutableDiagnostics = {
  ledgerStoreAllocations: number
  ledgerEventAllocations: number
  ledgerWindowProjectionAllocations: number
  diagnosticProjectionAllocations: number
  carrierQueueEntries: number
}

const forbiddenDtoFields = new Set(['verdict', 'repairHints', 'nextRecommendedStage', 'passed'])

const sanitizeForLedger = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sanitizeForLedger)
  if (!value || typeof value !== 'object') return value
  const out: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (forbiddenDtoFields.has(key)) continue
    out[key] = sanitizeForLedger(child)
  }
  return out
}

const jsonBytes = (value: unknown): number => {
  try {
    return JSON.stringify(value).length
  } catch {
    return 0
  }
}

const positiveInt = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  const normalized = Math.floor(value)
  return normalized > 0 ? normalized : fallback
}

const resolveRetentionPolicy = (
  input?: Partial<LiveLedgerRetentionPolicy>,
): LiveLedgerRetentionPolicy => ({
  ...defaultLiveLedgerRetentionPolicy,
  ...(input ?? null),
  schemaVersion: 'live-ledger-retention.v1',
  maxEvents: positiveInt(input?.maxEvents, defaultLiveLedgerRetentionPolicy.maxEvents),
  maxInlineBytes: positiveInt(input?.maxInlineBytes, defaultLiveLedgerRetentionPolicy.maxInlineBytes),
  maxPayloadSummaryBytes: positiveInt(
    input?.maxPayloadSummaryBytes,
    defaultLiveLedgerRetentionPolicy.maxPayloadSummaryBytes,
  ),
  maxStateAfterSummaryBytes: positiveInt(
    input?.maxStateAfterSummaryBytes,
    defaultLiveLedgerRetentionPolicy.maxStateAfterSummaryBytes,
  ),
  maxWindowEvents: positiveInt(input?.maxWindowEvents, defaultLiveLedgerRetentionPolicy.maxWindowEvents),
  maxDroppedMarkers: positiveInt(input?.maxDroppedMarkers, defaultLiveLedgerRetentionPolicy.maxDroppedMarkers),
  maxCarrierQueueEntries: positiveInt(
    input?.maxCarrierQueueEntries,
    defaultLiveLedgerRetentionPolicy.maxCarrierQueueEntries,
  ),
})

const makeWatermark = (input: {
  readonly target: LiveTargetCoordinate
  readonly targetKey: string
  readonly ledgerSeq: number
  readonly eventId?: string
  readonly droppedBeforeSeq?: number
  readonly inlineBytes: number
}): LiveLedgerWatermark => ({
  kind: 'live.ledger.watermark',
  schemaVersion: 'live-ledger-watermark.v1',
  target: input.target,
  targetKey: input.targetKey,
  ledgerSeq: input.ledgerSeq,
  ...(input.eventId ? { eventId: input.eventId } : null),
  ...(input.droppedBeforeSeq !== undefined ? { droppedBeforeSeq: input.droppedBeforeSeq } : null),
  inlineBytes: input.inlineBytes,
})

const makeZeroWatermark = (target: LiveTargetCoordinate): LiveLedgerWatermark => {
  const normalized = makeLiveTargetCoordinate(target)
  const targetKey = liveTargetCoordinateKey(normalized)
  return makeWatermark({ target: normalized, targetKey, ledgerSeq: 0, inlineBytes: 0 })
}

export const compareLiveLedgerWatermarks = (
  a: LiveLedgerWatermark,
  b: LiveLedgerWatermark,
): LiveLedgerWatermarkComparison => {
  if (a.targetKey !== b.targetKey) return 'incomparable'
  if (a.ledgerSeq === b.ledgerSeq) return 'same'
  return a.ledgerSeq < b.ledgerSeq ? 'before' : 'after'
}

export const makeLiveLedgerEnvelopeJoinRef = (
  envelope: LiveLedgerEventEnvelope,
): LiveLedgerEnvelopeJoinRef => ({
  kind: 'live.ledger.envelopeJoinRef',
  schemaVersion: 'live-ledger-envelope-join-ref.v1',
  sourceAuthority: envelope.sourceAuthority,
  eventId: envelope.eventId,
  target: envelope.target,
  targetKey: envelope.targetKey,
  watermark: envelope.watermark,
  ...(envelope.txnSeq !== undefined ? { txnSeq: envelope.txnSeq } : null),
  ...(envelope.opSeq !== undefined ? { opSeq: envelope.opSeq } : null),
  ...(envelope.linkId ? { linkId: envelope.linkId } : null),
})

const makeDegradedMarker = (input: {
  readonly target: LiveTargetCoordinate
  readonly targetKey: string
  readonly reason: LiveLedgerDegradedMarker['reason']
  readonly summary: string
  readonly observedAt: LiveLedgerWatermark
}): LiveLedgerDegradedMarker => ({
  kind: 'live.ledger.degraded',
  schemaVersion: 'live-ledger-marker.v1',
  target: input.target,
  targetKey: input.targetKey,
  reason: input.reason,
  summary: input.summary,
  observedAt: input.observedAt,
})

const makeDroppedMarker = (input: {
  readonly target: LiveTargetCoordinate
  readonly targetKey: string
  readonly reason: LiveLedgerDroppedMarker['reason']
  readonly droppedCount: number
  readonly firstDroppedSeq?: number
  readonly lastDroppedSeq?: number
  readonly observedAt: LiveLedgerWatermark
}): LiveLedgerDroppedMarker => ({
  kind: 'live.ledger.dropped',
  schemaVersion: 'live-ledger-marker.v1',
  target: input.target,
  targetKey: input.targetKey,
  reason: input.reason,
  droppedCount: input.droppedCount,
  ...(input.firstDroppedSeq !== undefined ? { firstDroppedSeq: input.firstDroppedSeq } : null),
  ...(input.lastDroppedSeq !== undefined ? { lastDroppedSeq: input.lastDroppedSeq } : null),
  observedAt: input.observedAt,
})

const makeGap = (input: {
  readonly code: string
  readonly summary: string
  readonly target: LiveTargetCoordinate
  readonly severity?: 'info' | 'warning' | 'error'
}): LiveStructuredEvidenceGap => ({
  kind: 'evidence.gap',
  gapId: `live:ledger:${input.code}:${liveTargetCoordinateKey(input.target)}`,
  code: input.code,
  summary: input.summary,
  severity: input.severity ?? 'warning',
  stageClass: 'drilldown-only',
  target: input.target,
  owner: 'runtime-live',
  reopenBar: 'reopen only if runtime-live ledger owner law changes',
})

const coalesceDroppedMarkers = (
  target: LiveTargetCoordinate,
  targetKey: string,
  markers: ReadonlyArray<LiveLedgerDroppedMarker>,
): ReadonlyArray<LiveLedgerDroppedMarker> => {
  if (markers.length <= 1) return markers
  const first = markers[0]
  if (!first) return []
  let droppedCount = 0
  let firstDroppedSeq: number | undefined
  let lastDroppedSeq: number | undefined
  let observedAt = first.observedAt
  const reason = first.reason

  for (const marker of markers) {
    droppedCount += marker.droppedCount
    observedAt = marker.observedAt
    if (marker.firstDroppedSeq !== undefined) {
      firstDroppedSeq =
        firstDroppedSeq === undefined ? marker.firstDroppedSeq : Math.min(firstDroppedSeq, marker.firstDroppedSeq)
    }
    if (marker.lastDroppedSeq !== undefined) {
      lastDroppedSeq =
        lastDroppedSeq === undefined ? marker.lastDroppedSeq : Math.max(lastDroppedSeq, marker.lastDroppedSeq)
    }
  }

  return [
    makeDroppedMarker({
      target,
      targetKey,
      reason,
      droppedCount,
      ...(firstDroppedSeq !== undefined ? { firstDroppedSeq } : null),
      ...(lastDroppedSeq !== undefined ? { lastDroppedSeq } : null),
      observedAt,
    }),
  ]
}

const mergeOldestDroppedMarkers = (store: TargetLedgerStore): void => {
  while (store.dropped.length > store.retention.maxDroppedMarkers) {
    const first = store.dropped.shift()
    const second = store.dropped.shift()
    if (!first || !second) return
    store.dropped.unshift(
      makeDroppedMarker({
        target: store.target,
        targetKey: store.targetKey,
        reason: first.reason,
        droppedCount: first.droppedCount + second.droppedCount,
        firstDroppedSeq:
          first.firstDroppedSeq === undefined
            ? second.firstDroppedSeq
            : second.firstDroppedSeq === undefined
              ? first.firstDroppedSeq
              : Math.min(first.firstDroppedSeq, second.firstDroppedSeq),
        lastDroppedSeq:
          first.lastDroppedSeq === undefined
            ? second.lastDroppedSeq
            : second.lastDroppedSeq === undefined
              ? first.lastDroppedSeq
              : Math.max(first.lastDroppedSeq, second.lastDroppedSeq),
        observedAt: second.observedAt,
      }),
    )
  }
}

const projectPayload = (
  input: LiveLedgerPayloadInput | undefined,
  eventId: string,
  retention: LiveLedgerRetentionPolicy,
  target: LiveTargetCoordinate,
  targetKey: string,
  observedAt: LiveLedgerWatermark,
): {
  readonly payload?: LiveLedgerPayloadRef
  readonly payloadBytes?: number
  readonly degraded: ReadonlyArray<LiveLedgerDegradedMarker>
} => {
  if (!input) return { degraded: [] }
  const owner = input.owner ?? 'runtime-live'
  if (input.artifactRef) {
    return {
      payload: {
        kind: 'artifact-ref',
        owner,
        ...(input.digest ? { digest: input.digest } : null),
        artifactRef: input.artifactRef,
      },
      degraded: [],
    }
  }
  if (input.ownerRef && input.summary === undefined) {
    return {
      payload: {
        kind: 'owner-ref',
        owner,
        ...(input.digest ? { digest: input.digest } : null),
        ownerRef: input.ownerRef,
      },
      degraded: [],
    }
  }
  const sanitized = sanitizeForLedger(input.summary)
  const rawBytes = jsonBytes(sanitized)
  if (rawBytes > retention.maxPayloadSummaryBytes) {
    return {
      payload: {
        kind: 'owner-ref',
        owner,
        ...(input.digest ? { digest: input.digest } : null),
        ownerRef: input.ownerRef ?? eventId,
      },
      payloadBytes: rawBytes,
      degraded: [
        makeDegradedMarker({
          target,
          targetKey,
          reason: 'payload-over-budget',
          summary: 'Ledger payload summary exceeded maxPayloadSummaryBytes.',
          observedAt,
        }),
      ],
    }
  }
  const projected = projectJsonValue(sanitized, { maxJsonBytes: retention.maxPayloadSummaryBytes })
  const summaryBytes = jsonBytes(projected.value)
  return {
    payload: {
      kind: 'bounded-summary',
      owner,
      ...(input.digest ? { digest: input.digest } : null),
      summary: projected.value,
      summaryBytes,
    },
    payloadBytes: summaryBytes,
    degraded: projected.downgrade
      ? [
          makeDegradedMarker({
            target,
            targetKey,
            reason: 'payload-over-budget',
            summary: 'Ledger payload summary was degraded by JSON projection.',
            observedAt,
          }),
        ]
      : [],
  }
}

const projectStateAfter = (input: {
  readonly stateAfter?: LiveLedgerStateAfterInput
  readonly eventId: string
  readonly eventWatermark: LiveLedgerWatermark
  readonly retention: LiveLedgerRetentionPolicy
  readonly target: LiveTargetCoordinate
  readonly targetKey: string
}): {
  readonly stateAfter?: LiveStateAfterSourceRef
  readonly stateAfterBytes?: number
  readonly degraded: ReadonlyArray<LiveLedgerDegradedMarker>
  readonly gaps: ReadonlyArray<LiveStructuredEvidenceGap>
} => {
  if (!input.stateAfter) return { degraded: [], gaps: [] }
  const stateAfter = input.stateAfter
  if (stateAfter.redacted) {
    return {
      degraded: [
        makeDegradedMarker({
          target: input.target,
          targetKey: input.targetKey,
          reason: 'state-after-redacted',
          summary: 'StateAfter source was redacted.',
          observedAt: input.eventWatermark,
        }),
      ],
      gaps: [
        makeGap({
          code: 'state-after-redacted',
          summary: 'StateAfter source was redacted by policy.',
          target: input.target,
        }),
      ],
    }
  }

  const sourceWatermark = stateAfter.sourceWatermark ?? input.eventWatermark
  if (compareLiveLedgerWatermarks(sourceWatermark, input.eventWatermark) !== 'same') {
    return {
      degraded: [
        makeDegradedMarker({
          target: input.target,
          targetKey: input.targetKey,
          reason: 'state-after-watermark-mismatch',
          summary: 'StateAfter source watermark does not match the ledger event watermark.',
          observedAt: input.eventWatermark,
        }),
      ],
      gaps: [
        makeGap({
          code: 'state-after-watermark-mismatch',
          summary: 'StateAfter source watermark does not match the ledger event watermark.',
          target: input.target,
        }),
      ],
    }
  }

  if (!stateAfter.artifactRef && !stateAfter.digest && stateAfter.boundedSummary === undefined) {
    return {
      degraded: [],
      gaps: [
        makeGap({
          code: 'missing-state-after-source',
          summary: 'No owner-approved stateAfter source is available for this event.',
          target: input.target,
        }),
      ],
    }
  }

  const boundedSummary = stateAfter.boundedSummary === undefined
    ? undefined
    : sanitizeForLedger(stateAfter.boundedSummary)
  const boundedSummaryBytes = boundedSummary === undefined ? undefined : jsonBytes(boundedSummary)
  if (boundedSummaryBytes !== undefined && boundedSummaryBytes > input.retention.maxStateAfterSummaryBytes) {
    return {
      stateAfterBytes: boundedSummaryBytes,
      degraded: [
        makeDegradedMarker({
          target: input.target,
          targetKey: input.targetKey,
          reason: 'state-after-over-budget',
          summary: 'StateAfter summary exceeded maxStateAfterSummaryBytes.',
          observedAt: input.eventWatermark,
        }),
      ],
      gaps: [
        makeGap({
          code: 'state-after-over-budget',
          summary: 'StateAfter summary exceeded the live ledger retention budget.',
          target: input.target,
        }),
      ],
    }
  }

  const projected = boundedSummary === undefined
    ? undefined
    : projectJsonValue(boundedSummary, { maxJsonBytes: input.retention.maxStateAfterSummaryBytes })
  const projectedBytes = projected ? jsonBytes(projected.value) : undefined
  const ref: LiveStateAfterSourceRef = {
    kind: 'live.stateAfter.sourceRef',
    schemaVersion: 'live-state-after-source-ref.v1',
    eventId: input.eventId,
    sourceKind: stateAfter.sourceKind,
    sourceWatermark,
    ...(stateAfter.artifactRef ? { artifactRef: stateAfter.artifactRef } : null),
    ...(stateAfter.digest ? { digest: stateAfter.digest } : null),
    ...(projected
      ? {
          boundedSummary: {
            value: projected.value,
            bytes: projectedBytes ?? 0,
            truncated: projected.downgrade === 'oversized',
          },
        }
      : null),
  }
  return {
    stateAfter: ref,
    ...(projectedBytes !== undefined ? { stateAfterBytes: projectedBytes } : null),
    degraded: projected?.downgrade
      ? [
          makeDegradedMarker({
            target: input.target,
            targetKey: input.targetKey,
            reason: 'state-after-over-budget',
            summary: 'StateAfter summary was degraded by JSON projection.',
            observedAt: input.eventWatermark,
          }),
        ]
      : [],
    gaps: [],
  }
}

const deriveOrderKey = (input: {
  readonly target: LiveTargetCoordinate
  readonly targetKey: string
  readonly ledgerSeq: number
  readonly txnSeq?: number
  readonly opSeq?: number
  readonly eventSeq?: number
  readonly eventKind: LiveLedgerEventKind
  readonly observedAt: LiveLedgerWatermark
}): { readonly order: LiveLedgerOrderKey; readonly degraded: ReadonlyArray<LiveLedgerDegradedMarker> } => {
  if (input.txnSeq !== undefined && input.opSeq !== undefined) {
    return {
      order: {
        kind: 'live.ledger.order',
        schemaVersion: 'live-ledger-order.v1',
        targetKey: input.targetKey,
        ledgerSeq: input.ledgerSeq,
        coordinate: { kind: 'txn-op', txnSeq: input.txnSeq, opSeq: input.opSeq },
      },
      degraded: [],
    }
  }
  if (input.txnSeq !== undefined && input.eventSeq !== undefined) {
    return {
      order: {
        kind: 'live.ledger.order',
        schemaVersion: 'live-ledger-order.v1',
        targetKey: input.targetKey,
        ledgerSeq: input.ledgerSeq,
        coordinate: { kind: 'txn-event', txnSeq: input.txnSeq, eventSeq: input.eventSeq },
      },
      degraded: [],
    }
  }
  if (input.eventKind === 'diagnostic' || input.eventKind === 'process') {
    const degraded = makeDegradedMarker({
      target: input.target,
      targetKey: input.targetKey,
      reason: 'missing-runtime-coordinate',
      summary: 'Debug source record did not provide txn/op or txn/event coordinates.',
      observedAt: input.observedAt,
    })
    return {
      order: {
        kind: 'live.ledger.order',
        schemaVersion: 'live-ledger-order.v1',
        targetKey: input.targetKey,
        ledgerSeq: input.ledgerSeq,
        coordinate: { kind: 'ingest', ingestSeq: input.ledgerSeq, degraded },
      },
      degraded: [degraded],
    }
  }
  return {
    order: {
      kind: 'live.ledger.order',
      schemaVersion: 'live-ledger-order.v1',
      targetKey: input.targetKey,
      ledgerSeq: input.ledgerSeq,
      coordinate: { kind: 'ledger-seq', ledgerSeq: input.ledgerSeq },
    },
    degraded: [],
  }
}

const ledgerDto = (store: TargetLedgerStore): LiveOperationLedger => ({
  kind: 'live.operation.ledger',
  schemaVersion: 'live-ledger.v1',
  target: store.target,
  targetKey: store.targetKey,
  retention: store.retention,
  currentWatermark: store.currentWatermark,
  eventCount: store.events.length,
  inlineBytes: store.inlineBytes,
  dropped: [...store.dropped],
  degraded: [...store.degraded],
})

const summarizeRequestBudget = (
  retention: LiveLedgerRetentionPolicy,
  request?: LiveBudgetProfile,
  inlineBytes = 0,
  payloadBytes?: number,
  stateAfterBytes?: number,
): LiveLedgerBudgetSnapshot => ({
  retention,
  ...(request ? { request } : null),
  inlineBytes,
  ...(payloadBytes !== undefined ? { payloadBytes } : null),
  ...(stateAfterBytes !== undefined ? { stateAfterBytes } : null),
})

const effectiveLimit = (
  retention: LiveLedgerRetentionPolicy,
  request: LiveOperationWindowRequest,
): number => {
  const candidates = [retention.maxWindowEvents]
  if (request.limit !== undefined) candidates.push(positiveInt(request.limit, retention.maxWindowEvents))
  if (request.budget?.maxEvents !== undefined) candidates.push(positiveInt(request.budget.maxEvents, retention.maxWindowEvents))
  return Math.max(1, Math.min(...candidates))
}

const normalizeDebugTargetKey = (record: LiveDebugSourceRecord): string | undefined =>
  record.target ? liveTargetCoordinateKey(record.target) : undefined

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const optionalNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : undefined

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined

const optionalSeverity = (value: unknown): 'error' | 'warning' | 'info' | undefined =>
  value === 'error' || value === 'warning' || value === 'info' ? value : undefined

const targetFromRuntimeDebugRef = (
  ref: RuntimeDebugEventRef,
  target?: LiveTargetCoordinate,
): LiveTargetCoordinate | undefined => {
  if (target) return makeLiveTargetCoordinate(target)
  if (ref.moduleId === 'unknown' || ref.instanceId === 'unknown') return undefined
  return makeLiveTargetCoordinate({
    runtimeId: ref.runtimeLabel ?? ref.moduleId,
    moduleId: ref.moduleId,
    instanceId: ref.instanceId,
  })
}

export const liveDebugSourceRecordFromRuntimeDebugEventRef = (
  ref: RuntimeDebugEventRef,
  target?: LiveTargetCoordinate,
): LiveDebugSourceRecord => {
  const meta = isRecord(ref.meta) ? ref.meta : {}
  const resolvedTarget = targetFromRuntimeDebugRef(ref, target)
  if (ref.kind === 'diagnostic') {
    return {
      type: 'diagnostic',
      ...(resolvedTarget ? { target: resolvedTarget } : null),
      code: optionalString(meta.code) ?? ref.label,
      severity: optionalSeverity(meta.severity) ?? 'info',
      message: optionalString(meta.message) ?? ref.label,
      ...(optionalString(meta.hint) ? { hint: optionalString(meta.hint) } : null),
      ...(optionalString(meta.actionTag) ? { actionTag: optionalString(meta.actionTag) } : null),
      txnSeq: ref.txnSeq,
      ...(optionalNumber(meta.opSeq) !== undefined ? { opSeq: optionalNumber(meta.opSeq) } : null),
      ...(ref.linkId ? { linkId: ref.linkId } : null),
      meta: ref.meta,
    }
  }
  if (ref.kind === 'process') {
    const type = ref.label.startsWith('process:') ? (ref.label as `process:${string}`) : 'process'
    return {
      type,
      ...(resolvedTarget ? { target: resolvedTarget } : null),
      label: ref.label,
      ...(optionalSeverity(meta.severity) ? { severity: optionalSeverity(meta.severity) } : null),
      txnSeq: ref.txnSeq,
      ...(optionalNumber(meta.eventSeq) !== undefined ? { eventSeq: optionalNumber(meta.eventSeq) } : null),
      ...(ref.linkId ? { linkId: ref.linkId } : null),
      meta: ref.meta,
    }
  }
  return {
    type: ref.kind,
    ...(resolvedTarget ? { target: resolvedTarget } : null),
    label: ref.label,
    txnSeq: ref.txnSeq,
    ...(ref.linkId ? { linkId: ref.linkId } : null),
    meta: ref.meta,
  }
}

const debugRecordKey = (record: LiveDebugSourceRecord, index: number): string => {
  const targetKey = normalizeDebugTargetKey(record) ?? 'missing-target'
  return `${targetKey}:${index}:${record.type}:${record.txnSeq ?? 'no-txn'}:${record.opSeq ?? record.eventSeq ?? 'no-op'}:${record.linkId ?? 'no-link'}`
}

export const createLiveOperationLedgerStore = (options: {
  readonly enabled: boolean
  readonly diagnosticsEnabled?: boolean
  readonly retention?: Partial<LiveLedgerRetentionPolicy>
}): LiveOperationLedgerStore => {
  const enabled = options.enabled
  const diagnosticsEnabled = options.diagnosticsEnabled ?? true
  const retention = resolveRetentionPolicy(options.retention)
  const stores = new Map<string, TargetLedgerStore>()
  const cleanedTargets = new Map<string, LiveLedgerWatermark>()
  const debugSourceRecords: Array<LiveDebugSourceRecord> = []
  const normalizedDebugRecords = new Set<string>()
  const diagnostics: MutableDiagnostics = {
    ledgerStoreAllocations: 0,
    ledgerEventAllocations: 0,
    ledgerWindowProjectionAllocations: 0,
    diagnosticProjectionAllocations: 0,
    carrierQueueEntries: 0,
  }

  const ensureStore = (targetInput: LiveTargetCoordinate): TargetLedgerStore | undefined => {
    if (!enabled) return undefined
    const target = makeLiveTargetCoordinate(targetInput)
    const targetKey = liveTargetCoordinateKey(target)
    const existing = stores.get(targetKey)
    if (existing) return existing
    const currentWatermark = makeZeroWatermark(target)
    const store: TargetLedgerStore = {
      target,
      targetKey,
      retention,
      events: [],
      dropped: [],
      degraded: [],
      inlineBytes: 0,
      nextSeq: 1,
      currentWatermark,
    }
    stores.set(targetKey, store)
    cleanedTargets.delete(targetKey)
    diagnostics.ledgerStoreAllocations += 1
    return store
  }

  const addDroppedMarker = (store: TargetLedgerStore, marker: LiveLedgerDroppedMarker): void => {
    store.dropped.push(marker)
    if (marker.lastDroppedSeq !== undefined) {
      store.droppedBeforeSeq = Math.max(store.droppedBeforeSeq ?? 0, marker.lastDroppedSeq)
    }
    mergeOldestDroppedMarkers(store)
  }

  const enforceRetention = (store: TargetLedgerStore): void => {
    while (store.events.length > 0 && (store.events.length > store.retention.maxEvents || store.inlineBytes > store.retention.maxInlineBytes)) {
      const evicted = store.events.shift()
      if (!evicted) break
      const reason = store.events.length + 1 > store.retention.maxEvents
        ? 'retention.maxEvents'
        : 'retention.maxInlineBytes'
      store.inlineBytes = Math.max(0, store.inlineBytes - jsonBytes(evicted))
      addDroppedMarker(
        store,
        makeDroppedMarker({
          target: store.target,
          targetKey: store.targetKey,
          reason,
          droppedCount: 1,
          firstDroppedSeq: evicted.order.ledgerSeq,
          lastDroppedSeq: evicted.order.ledgerSeq,
          observedAt: store.currentWatermark,
        }),
      )
      store.currentWatermark = makeWatermark({
        target: store.target,
        targetKey: store.targetKey,
        ledgerSeq: store.currentWatermark.ledgerSeq,
        eventId: store.currentWatermark.eventId,
        ...(store.droppedBeforeSeq !== undefined ? { droppedBeforeSeq: store.droppedBeforeSeq } : null),
        inlineBytes: store.inlineBytes,
      })
    }
  }

  const recordOperationEvent = (input: LiveLedgerRecordOperationInput): LiveLedgerEventEnvelope | undefined => {
    const store = ensureStore(input.target)
    if (!store) return undefined
    const ledgerSeq = store.nextSeq
    store.nextSeq += 1
    const eventId = `live-ledger:${store.targetKey}:${ledgerSeq}`
    const eventWatermark = makeWatermark({
      target: store.target,
      targetKey: store.targetKey,
      ledgerSeq,
      eventId,
      ...(store.droppedBeforeSeq !== undefined ? { droppedBeforeSeq: store.droppedBeforeSeq } : null),
      inlineBytes: store.inlineBytes,
    })
    const order = deriveOrderKey({
      target: store.target,
      targetKey: store.targetKey,
      ledgerSeq,
      eventKind: input.eventKind,
      observedAt: eventWatermark,
      ...(input.txnSeq !== undefined ? { txnSeq: input.txnSeq } : null),
      ...(input.opSeq !== undefined ? { opSeq: input.opSeq } : null),
      ...(input.eventSeq !== undefined ? { eventSeq: input.eventSeq } : null),
    })
    const projectedPayload = projectPayload(input.payload, eventId, store.retention, store.target, store.targetKey, eventWatermark)
    const projectedStateAfter = projectStateAfter({
      stateAfter: input.stateAfter,
      eventId,
      eventWatermark,
      retention: store.retention,
      target: store.target,
      targetKey: store.targetKey,
    })
    const degraded = [
      ...order.degraded,
      ...projectedPayload.degraded,
      ...projectedStateAfter.degraded,
      ...(input.degraded ?? []),
    ]
    const gaps = [...projectedStateAfter.gaps, ...(input.gaps ?? [])]
    const event: LiveLedgerEventEnvelope = {
      kind: 'live.ledger.event',
      schemaVersion: 'live-ledger-event.v1',
      eventId,
      target: store.target,
      targetKey: store.targetKey,
      ...(input.attachmentId ? { attachmentId: input.attachmentId } : null),
      eventKind: input.eventKind,
      label: input.label,
      sourceAuthority: 'runtime-live',
      order: order.order,
      watermark: eventWatermark,
      ...(input.txnSeq !== undefined ? { txnSeq: input.txnSeq } : null),
      ...(input.opSeq !== undefined ? { opSeq: input.opSeq } : null),
      ...(input.linkId ? { linkId: input.linkId } : null),
      ...(input.artifactRef ? { artifactRef: input.artifactRef } : null),
      ...(input.binding ? { binding: input.binding } : null),
      ...(projectedPayload.payload ? { payload: projectedPayload.payload } : null),
      ...(projectedStateAfter.stateAfter ? { stateAfter: projectedStateAfter.stateAfter } : null),
      budget: summarizeRequestBudget(
        store.retention,
        input.budget,
        0,
        projectedPayload.payloadBytes,
        projectedStateAfter.stateAfterBytes,
      ),
      dropped: input.dropped ?? [],
      degraded,
      redacted: input.redacted ?? [],
      gaps,
    }
    const eventBytes = jsonBytes(event)
    const eventWithBudget: LiveLedgerEventEnvelope = {
      ...event,
      budget: {
        ...event.budget,
        inlineBytes: eventBytes,
      },
      watermark: {
        ...event.watermark,
        inlineBytes: store.inlineBytes + eventBytes,
      },
    }
    store.events.push(eventWithBudget)
    store.inlineBytes += eventBytes
    store.currentWatermark = makeWatermark({
      target: store.target,
      targetKey: store.targetKey,
      ledgerSeq,
      eventId,
      ...(store.droppedBeforeSeq !== undefined ? { droppedBeforeSeq: store.droppedBeforeSeq } : null),
      inlineBytes: store.inlineBytes,
    })
    store.degraded.push(...degraded)
    diagnostics.ledgerEventAllocations += 1
    enforceRetention(store)
    return eventWithBudget
  }

  const normalizeDebugSourcesForRead = (
    request: LiveOperationWindowRequest,
  ): ReadonlyArray<LiveStructuredEvidenceGap> => {
    const wantsDiagnostics =
      request.eventKinds === undefined ||
      request.eventKinds.includes('diagnostic') ||
      request.eventKinds.includes('process')
    if (!wantsDiagnostics) return []
    const target = makeLiveTargetCoordinate(request.target)
    const targetKey = liveTargetCoordinateKey(target)
    const relevant = debugSourceRecords
      .map((record, index) => ({ record, index, key: debugRecordKey(record, index) }))
      .filter(({ record }) => normalizeDebugTargetKey(record) === targetKey)
    if (relevant.length === 0) return []
    if (!diagnosticsEnabled) {
      return [
        makeGap({
          code: 'diagnostics-disabled',
          summary: 'Diagnostics and process normalization is disabled for this live ledger read.',
          target,
          severity: 'info',
        }),
      ]
    }

    const gaps: Array<LiveStructuredEvidenceGap> = []
    for (const { record, key } of relevant) {
      if (normalizedDebugRecords.has(key)) continue
      normalizedDebugRecords.add(key)
      const sourceTarget = record.target ? makeLiveTargetCoordinate(record.target) : undefined
      if (!sourceTarget) {
        gaps.push(
          makeGap({
            code: 'missing-runtime-coordinate',
            summary: 'Debug source record cannot be normalized without a target coordinate.',
            target,
          }),
        )
        continue
      }
      if (isDiagnosticDebugSourceRecord(record)) {
        diagnostics.diagnosticProjectionAllocations += 1
        recordOperationEvent({
          target: sourceTarget,
          eventKind: 'diagnostic',
          label: record.code,
          txnSeq: record.txnSeq,
          opSeq: record.opSeq,
          eventSeq: record.eventSeq,
          linkId: record.linkId,
          degraded: record.degraded,
          redacted: record.redacted,
          gaps: record.gaps,
          payload: {
            owner: 'runtime-live',
            summary: {
              type: record.type,
              code: record.code,
              severity: record.severity,
              message: record.message,
              ...(record.hint ? { hint: record.hint } : null),
              ...(record.actionTag ? { actionTag: record.actionTag } : null),
              ...(record.meta !== undefined ? { meta: record.meta } : null),
            },
          },
        })
        continue
      }
      if (isProcessDebugSourceRecord(record)) {
        diagnostics.diagnosticProjectionAllocations += 1
        recordOperationEvent({
          target: sourceTarget,
          eventKind: 'process',
          label: record.label ?? record.type,
          txnSeq: record.txnSeq,
          opSeq: record.opSeq,
          eventSeq: record.eventSeq,
          linkId: record.linkId,
          degraded: record.degraded,
          redacted: record.redacted,
          gaps: record.gaps,
          payload: {
            owner: 'runtime-live',
            summary: {
              type: record.type,
              label: record.label ?? record.type,
              ...(record.severity ? { severity: record.severity } : null),
              ...(record.meta !== undefined ? { meta: record.meta } : null),
            },
          },
        })
        continue
      }
      gaps.push(
        makeGap({
          code: 'unsupported-event-kind',
          summary: 'Debug source record is not supported by runtime-live ledger normalization.',
          target,
        }),
      )
    }
    return gaps
  }

  const addDebugSource = (record: LiveDebugSourceRecord): void => {
    if (!enabled) return
    debugSourceRecords.push(record)
    while (debugSourceRecords.length > retention.maxCarrierQueueEntries) {
      debugSourceRecords.shift()
    }
    diagnostics.carrierQueueEntries = debugSourceRecords.length
  }

  const readWindow = (request: LiveOperationWindowRequest): LiveOperationWindow => {
    const target = makeLiveTargetCoordinate(request.target)
    const targetKey = liveTargetCoordinateKey(target)
    const windowRetention = retention
    const limit = effectiveLimit(windowRetention, request)
    const emptyBudget = summarizeRequestBudget(windowRetention, request.budget, 0)
    const zeroWatermark = makeZeroWatermark(target)

    const disabledWindow = (code: string, summary: string): LiveOperationWindow => ({
      kind: 'live.operation.window',
      schemaVersion: 'live-operation-window.v1',
      target,
      targetKey,
      ...(request.attachmentId ? { attachmentId: request.attachmentId } : null),
      startWatermark: zeroWatermark,
      endWatermark: zeroWatermark,
      ...(request.cursor ? { cursor: request.cursor } : null),
      limit,
      events: [],
      completeness: 'degraded',
      dropped: [],
      degraded: [],
      gaps: [makeGap({ code, summary, target, severity: 'info' })],
      budget: emptyBudget,
    })

    if (!enabled) {
      return disabledWindow('live-ledger-disabled', 'Live inspect collection is disabled.')
    }

    diagnostics.ledgerWindowProjectionAllocations += 1

    const normalizedGaps = normalizeDebugSourcesForRead(request)
    const diagnosticOnlyRequest =
      request.eventKinds !== undefined &&
      request.eventKinds.length > 0 &&
      request.eventKinds.every((kind) => kind === 'diagnostic' || kind === 'process')
    const cleanedWatermark = cleanedTargets.get(targetKey)
    if (cleanedWatermark) {
      return {
        ...disabledWindow('target-ledger-cleaned', 'The target ledger was cleaned after terminal attachment lifecycle.'),
        startWatermark: cleanedWatermark,
        endWatermark: cleanedWatermark,
        gaps: [
          makeGap({
            code: 'target-ledger-cleaned',
            summary: 'The target ledger was cleaned after terminal attachment lifecycle.',
            target,
            severity: 'info',
          }),
        ],
      }
    }

    const store = stores.get(targetKey)
    if (!store) {
      if (diagnosticOnlyRequest && normalizedGaps.length > 0) {
        return {
          ...disabledWindow(normalizedGaps[0]?.code ?? 'diagnostics-disabled', normalizedGaps[0]?.summary ?? 'Diagnostic ledger read returned a structured gap.'),
          gaps: normalizedGaps,
        }
      }
      return {
        ...disabledWindow('missing-operation-window', 'No operation window has been retained for this target.'),
        gaps: [
          ...normalizedGaps,
          makeGap({
            code: 'missing-operation-window',
            summary: 'No operation window has been retained for this target.',
            target,
            severity: 'info',
          }),
        ],
      }
    }

    const cursorTargetMismatch = request.cursor && request.cursor.targetKey !== targetKey
    const cursorSeq = cursorTargetMismatch ? undefined : request.cursor?.ledgerSeq
    const ordered = store.events
      .filter((event) => cursorSeq === undefined || event.order.ledgerSeq > cursorSeq)
      .filter((event) => !request.eventKinds || request.eventKinds.includes(event.eventKind))
      .sort((a, b) => a.order.ledgerSeq - b.order.ledgerSeq)
    const windowEvents = ordered.map((event) => {
      if (
        event.stateAfter?.sourceKind === 'current-head-exact' &&
        compareLiveLedgerWatermarks(event.watermark, store.currentWatermark) !== 'same'
      ) {
        return {
          ...event,
          stateAfter: undefined,
          degraded: [
            ...event.degraded,
            makeDegradedMarker({
              target: store.target,
              targetKey: store.targetKey,
              reason: 'state-after-watermark-mismatch',
              summary: 'current-head-exact stateAfter no longer matches the target head watermark.',
              observedAt: store.currentWatermark,
            }),
          ],
          gaps: [
            ...event.gaps,
            makeGap({
              code: 'state-after-watermark-mismatch',
              summary: 'current-head-exact stateAfter no longer matches the target head watermark.',
              target: store.target,
            }),
          ],
        }
      }
      if (
        event.stateAfter ||
        event.watermark.ledgerSeq >= store.currentWatermark.ledgerSeq ||
        event.gaps.some((gap) => gap.code.startsWith('state-after-'))
      ) {
        return event
      }
      return {
        ...event,
        gaps: [
          ...event.gaps,
          makeGap({
            code: 'missing-state-after-source',
            summary: 'No owner-approved stateAfter source is available for this historical event.',
            target: store.target,
          }),
        ],
      }
    })
    const limited = cursorSeq === undefined ? windowEvents.slice(-limit) : windowEvents.slice(0, limit)
    const droppedAfterCursor =
      cursorSeq !== undefined && store.droppedBeforeSeq !== undefined && cursorSeq < store.droppedBeforeSeq
        ? store.dropped
        : cursorSeq !== undefined
          ? store.dropped.filter((marker) => (marker.lastDroppedSeq ?? 0) > cursorSeq)
          : store.dropped
    const dropped = coalesceDroppedMarkers(store.target, store.targetKey, droppedAfterCursor)
    const gaps = [
      ...normalizedGaps,
      ...(cursorTargetMismatch
        ? [
            makeGap({
              code: 'invalid-ledger-watermark',
              summary: 'Window cursor watermark belongs to a different live target.',
              target,
            }),
          ]
        : []),
    ]
    const completeness: LiveOperationWindow['completeness'] = cursorTargetMismatch
      ? 'degraded'
      : (cursorSeq !== undefined && store.droppedBeforeSeq !== undefined && cursorSeq < store.droppedBeforeSeq) ||
          dropped.length > 0
        ? 'partial-dropped'
        : normalizedGaps.length > 0
          ? 'degraded'
          : 'complete'
    const startWatermark = limited[0]?.watermark ?? request.cursor ?? store.currentWatermark
    return {
      kind: 'live.operation.window',
      schemaVersion: 'live-operation-window.v1',
      target: store.target,
      targetKey: store.targetKey,
      ...(request.attachmentId ? { attachmentId: request.attachmentId } : null),
      startWatermark,
      endWatermark: store.currentWatermark,
      ...(request.cursor ? { cursor: request.cursor } : null),
      limit,
      events: limited,
      completeness,
      dropped,
      degraded: [...store.degraded],
      gaps,
      budget: summarizeRequestBudget(store.retention, request.budget, store.inlineBytes),
    }
  }

  const cleanupTarget = (
    targetInput: LiveTargetCoordinate,
    reason: LiveLedgerDroppedMarker['reason'] = 'cleanup.target-terminal',
  ): void => {
    if (!enabled) return
    const target = makeLiveTargetCoordinate(targetInput)
    const targetKey = liveTargetCoordinateKey(target)
    const store = stores.get(targetKey)
    const observedAt = store?.currentWatermark ?? makeZeroWatermark(target)
    if (store && store.events.length > 0) {
      addDroppedMarker(
        store,
        makeDroppedMarker({
          target,
          targetKey,
          reason,
          droppedCount: store.events.length,
          firstDroppedSeq: store.events[0]?.order.ledgerSeq,
          lastDroppedSeq: store.events[store.events.length - 1]?.order.ledgerSeq,
          observedAt,
        }),
      )
    }
    stores.delete(targetKey)
    cleanedTargets.set(targetKey, observedAt)
    for (let index = debugSourceRecords.length - 1; index >= 0; index -= 1) {
      if (normalizeDebugTargetKey(debugSourceRecords[index]!) === targetKey) {
        debugSourceRecords.splice(index, 1)
      }
    }
    diagnostics.carrierQueueEntries = debugSourceRecords.length
  }

  return {
    recordOperationEvent,
    readWindow,
    addDebugSourceRecord: (record: LiveDebugSourceRecord): void => {
      addDebugSource(record)
    },
    addRuntimeDebugEventRef: (ref: RuntimeDebugEventRef, target?: LiveTargetCoordinate): void => {
      addDebugSource(liveDebugSourceRecordFromRuntimeDebugEventRef(ref, target))
    },
    cleanupTarget,
    cleanupAttachment: (
      _attachmentId: string,
      targets: ReadonlyArray<LiveTargetCoordinate>,
      reason: LiveLedgerDroppedMarker['reason'] = 'cleanup.target-terminal',
    ): void => {
      for (const target of targets) {
        cleanupTarget(target, reason)
      }
    },
    getLedger: (targetInput: LiveTargetCoordinate): LiveOperationLedger | undefined => {
      const target = makeLiveTargetCoordinate(targetInput)
      const store = stores.get(liveTargetCoordinateKey(target))
      return store ? ledgerDto(store) : undefined
    },
    getDiagnostics: (): LiveLedgerDiagnostics => ({ ...diagnostics }),
    hasTargetStore: (targetInput: LiveTargetCoordinate): boolean => {
      const target = makeLiveTargetCoordinate(targetInput)
      return stores.has(liveTargetCoordinateKey(target))
    },
    isTargetCleaned: (targetInput: LiveTargetCoordinate): boolean => {
      const target = makeLiveTargetCoordinate(targetInput)
      return cleanedTargets.has(liveTargetCoordinateKey(target))
    },
  }
}
