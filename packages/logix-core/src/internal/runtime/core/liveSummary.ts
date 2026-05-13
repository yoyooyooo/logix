import type { VerificationControlPlaneArtifactRef } from '../../../ControlPlane.js'
import type {
  FieldSummaryProjection,
} from './liveFieldInspect.js'
import type {
  LiveInspectArtifact,
  LiveInspectFacetPayloadBase,
  LiveStructuredEvidenceGap,
} from './liveInspect.js'
import { makeLiveInspectArtifact, makeLiveInspectGap } from './liveInspect.js'
import type {
  LiveLedgerDroppedMarker,
  LiveLedgerEventEnvelope,
  LiveLedgerEventKind,
  LiveLedgerOrderKey,
  LiveLedgerWatermark,
  LiveOperationWindow,
} from './liveLedger.js'
import type {
  LiveBudgetProfile,
  LiveDegradedMarker,
  LiveRedactionMarker,
  LiveTargetDescriptor,
} from './liveTypes.js'
import { liveTargetCoordinateKey } from './liveTypes.js'

export type LiveSummarySchemaVersion = 'live-summary.v1'
export type LiveSummarySliceAuthority = 'runtime-live' | 'field-runtime'

export interface LiveSummaryLatestEventMarker {
  readonly eventId: string
  readonly eventKind: LiveLedgerEventKind
  readonly label: string
  readonly sourceAuthority: 'runtime-live'
  readonly order: LiveLedgerOrderKey
  readonly watermark: LiveLedgerWatermark
  readonly txnSeq?: number
  readonly opSeq?: number
  readonly linkId?: string
  readonly artifactRef?: VerificationControlPlaneArtifactRef
}

export interface LiveSummaryOperationSlice {
  readonly sourceAuthority: 'runtime-live'
  readonly targetKey: string
  readonly operationCount: number
  readonly eventCount: number
  readonly eventKindCounts: Readonly<Record<LiveLedgerEventKind, number>>
  readonly latestEvent?: LiveSummaryLatestEventMarker
  readonly startWatermark: LiveLedgerWatermark
  readonly endWatermark: LiveLedgerWatermark
  readonly completeness: LiveOperationWindow['completeness']
  readonly dropped: ReadonlyArray<LiveLedgerDroppedMarker>
  readonly degraded: ReadonlyArray<LiveDegradedMarker>
  readonly redacted: ReadonlyArray<LiveRedactionMarker>
  readonly gaps: ReadonlyArray<LiveStructuredEvidenceGap>
}

export interface LiveSummaryFieldConvergenceSlice {
  readonly sourceAuthority: 'field-runtime'
  readonly targetKey: string
  readonly fieldSummary: FieldSummaryProjection
  readonly artifactRef?: VerificationControlPlaneArtifactRef
  readonly degraded?: LiveDegradedMarker
  readonly redacted: ReadonlyArray<LiveRedactionMarker>
  readonly gaps: ReadonlyArray<LiveStructuredEvidenceGap>
}

export interface LiveSummaryProjection {
  readonly kind: 'live.summary.projection'
  readonly schemaVersion: LiveSummarySchemaVersion
  readonly generatedBy: string
  readonly target: LiveTargetDescriptor
  readonly targetKey: string
  readonly operation?: LiveSummaryOperationSlice
  readonly fieldConvergence?: LiveSummaryFieldConvergenceSlice
  readonly dropped: ReadonlyArray<LiveLedgerDroppedMarker>
  readonly degraded: ReadonlyArray<LiveDegradedMarker>
  readonly redacted: ReadonlyArray<LiveRedactionMarker>
  readonly gaps: ReadonlyArray<LiveStructuredEvidenceGap>
  readonly budget: LiveBudgetProfile
}

export interface LiveSummaryInspectPayload extends LiveInspectFacetPayloadBase {
  readonly summary: LiveSummaryProjection
}

export interface MakeLiveSummaryInspectArtifactInput {
  readonly target: LiveTargetDescriptor
  readonly producer: string
  readonly operationWindow?: LiveOperationWindow
  readonly fieldSummaryArtifact?: LiveInspectArtifact<'field-summary'>
  readonly budget?: LiveBudgetProfile
  readonly gaps?: ReadonlyArray<LiveStructuredEvidenceGap>
}

const defaultBudget: LiveBudgetProfile = { maxEvents: 16, maxInlineBytes: 4096 }

const cloneDto = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((item) => cloneDto(item)) as T
  const out: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (child !== undefined) out[key] = cloneDto(child)
  }
  return out as T
}

const stableKey = (value: unknown): string => {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const uniqueBy = <T>(items: ReadonlyArray<T>, keyOf: (item: T) => string): ReadonlyArray<T> => {
  const seen = new Set<string>()
  const out: Array<T> = []
  for (const item of items) {
    const key = keyOf(item)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

const uniqueGaps = (gaps: ReadonlyArray<LiveStructuredEvidenceGap>): ReadonlyArray<LiveStructuredEvidenceGap> =>
  uniqueBy(gaps, (gap) => `${gap.owner}:${gap.code}:${gap.gapId}`)

const uniqueMarkers = <T>(markers: ReadonlyArray<T>): ReadonlyArray<T> =>
  uniqueBy(markers, stableKey)

const budgetForSummary = (input: MakeLiveSummaryInspectArtifactInput): LiveBudgetProfile =>
  input.budget ??
  input.operationWindow?.budget.request ??
  input.fieldSummaryArtifact?.facet.budget ??
  defaultBudget

const projectionBytesForSummary = (budget: LiveBudgetProfile): number =>
  Math.max(budget.maxInlineBytes, Math.ceil(budget.maxInlineBytes * 1.5))

const isOperationEvent = (eventKind: LiveLedgerEventKind): boolean => eventKind.startsWith('operation.')

const latestEventMarker = (event: LiveLedgerEventEnvelope): LiveSummaryLatestEventMarker => ({
  eventId: event.eventId,
  eventKind: event.eventKind,
  label: event.label,
  sourceAuthority: event.sourceAuthority,
  order: cloneDto(event.order),
  watermark: cloneDto(event.watermark),
  ...(event.txnSeq !== undefined ? { txnSeq: event.txnSeq } : null),
  ...(event.opSeq !== undefined ? { opSeq: event.opSeq } : null),
  ...(event.linkId ? { linkId: event.linkId } : null),
  ...(event.artifactRef ? { artifactRef: cloneDto(event.artifactRef) } : null),
})

const projectOperationSlice = (operationWindow: LiveOperationWindow): LiveSummaryOperationSlice => {
  const eventKindCounts: Partial<Record<LiveLedgerEventKind, number>> = {}
  for (const event of operationWindow.events) {
    eventKindCounts[event.eventKind] = (eventKindCounts[event.eventKind] ?? 0) + 1
  }
  const sortedEvents = [...operationWindow.events].sort((a, b) => a.order.ledgerSeq - b.order.ledgerSeq)
  const latest = sortedEvents[sortedEvents.length - 1]
  return {
    sourceAuthority: 'runtime-live',
    targetKey: operationWindow.targetKey,
    operationCount: operationWindow.events.filter((event) => isOperationEvent(event.eventKind)).length,
    eventCount: operationWindow.events.length,
    eventKindCounts: eventKindCounts as Readonly<Record<LiveLedgerEventKind, number>>,
    ...(latest ? { latestEvent: latestEventMarker(latest) } : null),
    startWatermark: cloneDto(operationWindow.startWatermark),
    endWatermark: cloneDto(operationWindow.endWatermark),
    completeness: operationWindow.completeness,
    dropped: uniqueMarkers(operationWindow.dropped).map((marker) => cloneDto(marker)),
    degraded: uniqueMarkers([
      ...operationWindow.degraded.map((marker) => cloneDto(marker)),
      ...operationWindow.events.flatMap((event) => event.degraded.map((marker) => cloneDto(marker))),
    ]),
    redacted: uniqueMarkers(operationWindow.events.flatMap((event) => event.redacted.map((marker) => cloneDto(marker)))),
    gaps: uniqueGaps([
      ...operationWindow.gaps.map((gap) => cloneDto(gap)),
      ...operationWindow.events.flatMap((event) => event.gaps.map((gap) => cloneDto(gap))),
    ]),
  }
}

const missingOperationGap = (target: LiveTargetDescriptor): LiveStructuredEvidenceGap =>
  makeLiveInspectGap({
    gapId: `live:summary:missing-operation-window:${liveTargetCoordinateKey(target)}`,
    code: 'missing-operation-window',
    summary: 'No owner-backed operation window is available for summary projection.',
    severity: 'info',
    target,
    owner: 'runtime-live',
    reopenBar: 'reopen when runtime-live operation window is available',
  })

const missingFieldSummaryGap = (target: LiveTargetDescriptor): LiveStructuredEvidenceGap =>
  makeLiveInspectGap({
    gapId: `live:summary:missing-field-summary:${liveTargetCoordinateKey(target)}`,
    code: 'missing-field-summary',
    summary: 'No owner-backed field convergence summary is available.',
    severity: 'info',
    target,
    owner: 'field-runtime',
    reopenBar: 'reopen when field-runtime summary producer is available',
  })

const isFieldSummaryProjection = (value: unknown): value is FieldSummaryProjection =>
  typeof value === 'object' &&
  value !== null &&
  (value as FieldSummaryProjection).kind === 'live.field.summary' &&
  (value as FieldSummaryProjection).schemaVersion === 'live-field-inspect.v1'

const projectFieldConvergenceSlice = (
  artifact: LiveInspectArtifact<'field-summary'>,
): LiveSummaryFieldConvergenceSlice | undefined => {
  const payload = artifact.facet.payload
  if (!isFieldSummaryProjection(payload)) return undefined
  return {
    sourceAuthority: 'field-runtime',
    targetKey: payload.targetKey,
    fieldSummary: cloneDto(payload),
    ...(artifact.artifactRef ?? artifact.facet.artifactRef
      ? { artifactRef: cloneDto(artifact.artifactRef ?? artifact.facet.artifactRef!) }
      : null),
    ...(artifact.facet.degraded ? { degraded: cloneDto(artifact.facet.degraded) } : null),
    redacted: artifact.facet.redacted?.map((marker) => cloneDto(marker)) ?? [],
    gaps: artifact.facet.gaps.map((gap) => cloneDto(gap)),
  }
}

export const makeLiveSummaryProjection = (
  input: MakeLiveSummaryInspectArtifactInput,
): LiveSummaryProjection => {
  const budget = budgetForSummary(input)
  const operation = input.operationWindow ? projectOperationSlice(input.operationWindow) : undefined
  const fieldConvergence = input.fieldSummaryArtifact
    ? projectFieldConvergenceSlice(input.fieldSummaryArtifact)
    : undefined
  const fieldGaps = input.fieldSummaryArtifact
    ? input.fieldSummaryArtifact.facet.gaps.map((gap) => cloneDto(gap))
    : [missingFieldSummaryGap(input.target)]
  const gaps = uniqueGaps([
    ...(input.gaps ?? []).map((gap) => cloneDto(gap)),
    ...(operation ? operation.gaps.map((gap) => cloneDto(gap)) : [missingOperationGap(input.target)]),
    ...fieldGaps.map((gap) => cloneDto(gap)),
  ])

  return {
    kind: 'live.summary.projection',
    schemaVersion: 'live-summary.v1',
    generatedBy: input.producer,
    target: cloneDto(input.target),
    targetKey: liveTargetCoordinateKey(input.target),
    ...(operation ? { operation } : null),
    ...(fieldConvergence ? { fieldConvergence } : null),
    dropped: uniqueMarkers(operation?.dropped.map((marker) => cloneDto(marker)) ?? []),
    degraded: uniqueMarkers([
      ...(operation?.degraded.map((marker) => cloneDto(marker)) ?? []),
      ...(fieldConvergence?.degraded ? [cloneDto(fieldConvergence.degraded)] : []),
    ]),
    redacted: uniqueMarkers([
      ...(operation?.redacted.map((marker) => cloneDto(marker)) ?? []),
      ...(fieldConvergence?.redacted.map((marker) => cloneDto(marker)) ?? []),
    ]),
    gaps,
    budget,
  }
}

export const makeLiveSummaryInspectArtifact = (
  input: MakeLiveSummaryInspectArtifactInput,
): LiveInspectArtifact<'summary'> => {
  const budget = budgetForSummary(input)
  const summary = makeLiveSummaryProjection(input)
  return makeLiveInspectArtifact({
    section: 'summary',
    target: input.target,
    sourceAuthority: 'runtime-live',
    producer: input.producer,
    budget,
    projectionMaxDepth: 12,
    projectionMaxJsonBytes: projectionBytesForSummary(budget),
    gaps: summary.gaps,
    degraded: summary.degraded[0],
    redacted: summary.redacted,
    payload: {
      schemaVersion: 'live-inspect.v1',
      generatedBy: input.producer,
      summary,
    } satisfies LiveSummaryInspectPayload,
  })
}
