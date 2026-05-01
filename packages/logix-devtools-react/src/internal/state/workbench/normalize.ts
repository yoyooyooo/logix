import type * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import { isVerificationControlPlaneReport } from '@logixjs/core/ControlPlane'
import type {
  RuntimeWorkbenchArtifactRefInput,
  RuntimeWorkbenchAuthorityBundle,
  RuntimeWorkbenchContextRef,
  RuntimeWorkbenchDebugEventRef,
  RuntimeWorkbenchSelectionHint,
  RuntimeWorkbenchTruthInput,
} from '@logixjs/core/repo-internal/workbench-api'
import type { DevtoolsSnapshot } from '../../snapshot/index.js'
import type {
  WorkbenchEvidenceGap,
  WorkbenchNormalizedEvent,
  WorkbenchNormalizedInput,
  WorkbenchStableCoordinate,
} from './model.js'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asString = (value: unknown): string | undefined => (typeof value === 'string' && value.length > 0 ? value : undefined)

const asFiniteNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

const requiredString = (value: unknown, fallback: string): string => asString(value) ?? fallback

const compareMaybeNumber = (a: number | undefined, b: number | undefined): number => {
  if (a === undefined && b === undefined) return 0
  if (a === undefined) return 1
  if (b === undefined) return -1
  return a - b
}

const compareNormalizedEvent = (a: WorkbenchNormalizedEvent, b: WorkbenchNormalizedEvent): number =>
  requiredString(a.coordinate.runtimeLabel, 'unknown').localeCompare(requiredString(b.coordinate.runtimeLabel, 'unknown')) ||
  requiredString(a.coordinate.moduleId, 'unknown').localeCompare(requiredString(b.coordinate.moduleId, 'unknown')) ||
  requiredString(a.coordinate.instanceId, 'unknown').localeCompare(requiredString(b.coordinate.instanceId, 'unknown')) ||
  compareMaybeNumber(a.coordinate.txnSeq, b.coordinate.txnSeq) ||
  compareMaybeNumber(a.coordinate.opSeq, b.coordinate.opSeq) ||
  compareMaybeNumber(a.coordinate.eventSeq, b.coordinate.eventSeq) ||
  compareMaybeNumber(a.coordinate.timestamp, b.coordinate.timestamp)

const projectionBatchKeyOf = (event: WorkbenchNormalizedEvent): string => {
  const unit = event.coordinate.txnSeq !== undefined ? `txn:${event.coordinate.txnSeq}` : `event:${event.coordinate.eventSeq ?? 'unknown'}`
  return [
    requiredString(event.coordinate.runtimeLabel, 'unknown'),
    requiredString(event.coordinate.moduleId, 'unknown'),
    requiredString(event.coordinate.instanceId, 'unknown'),
    unit,
  ].join(':')
}

const groupEventsForProjection = (
  events: ReadonlyArray<WorkbenchNormalizedEvent>,
): ReadonlyArray<{ readonly key: string; readonly events: ReadonlyArray<WorkbenchNormalizedEvent> }> => {
  const groups = new Map<string, WorkbenchNormalizedEvent[]>()
  for (const event of [...events].sort(compareNormalizedEvent)) {
    const key = projectionBatchKeyOf(event)
    const group = groups.get(key) ?? []
    group.push(event)
    groups.set(key, group)
  }
  return Array.from(groups.entries()).map(([key, groupedEvents]) => ({ key, events: groupedEvents }))
}

const artifactRefFromValue = (value: unknown): RuntimeWorkbenchArtifactRefInput['artifact'] | undefined => {
  if (!isRecord(value)) return undefined
  const outputKey = asString((value as any).outputKey) ?? asString((value as any).key) ?? asString((value as any).artifactKey)
  const kind = asString((value as any).kind) ?? asString((value as any).artifactKind)
  if (!outputKey || !kind) return undefined
  const file = asString((value as any).file) ?? asString((value as any).ref) ?? asString((value as any).path)
  const reasonCodes = Array.isArray((value as any).reasonCodes)
    ? ((value as any).reasonCodes as ReadonlyArray<unknown>).filter((item): item is string => typeof item === 'string')
    : undefined
  return {
    outputKey,
    kind,
    ...(file ? { file } : null),
    ...(asString((value as any).digest) ? { digest: asString((value as any).digest) } : null),
    ...(reasonCodes && reasonCodes.length > 0 ? { reasonCodes } : null),
  }
}

const sourceDigestFromEvidencePackage = (pkg: unknown): string | undefined => {
  if (!isRecord(pkg)) return undefined
  const summary = isRecord((pkg as any).summary) ? ((pkg as any).summary as Record<string, unknown>) : undefined
  return (
    asString((pkg as any).sourceDigest) ??
    asString((pkg as any).digest) ??
    asString(summary?.sourceDigest) ??
    asString(summary?.staticIrDigest)
  )
}

const selectionHintsFromManifest = (manifest: unknown): ReadonlyArray<RuntimeWorkbenchSelectionHint> => {
  if (!isRecord(manifest)) return []
  const hints: RuntimeWorkbenchSelectionHint[] = []
  const sessionId = asString((manifest as any).sessionId)
  const findingId = asString((manifest as any).findingId)
  const artifactOutputKey = asString((manifest as any).artifactOutputKey) ?? asString((manifest as any).artifactKey)
  if (sessionId) hints.push({ kind: 'selected-session', sessionId })
  if (findingId) hints.push({ kind: 'selected-finding', findingId })
  if (artifactOutputKey) hints.push({ kind: 'selected-artifact', artifactOutputKey })
  hints.push({
    kind: 'imported-selection-manifest',
    ...(asString((manifest as any).selectionId) ? { selectionId: asString((manifest as any).selectionId) } : null),
    ...(sessionId ? { sessionId } : null),
    ...(findingId ? { findingId } : null),
    ...(artifactOutputKey ? { artifactOutputKey } : null),
    ...('focusRef' in manifest ? { focusRef: (manifest as any).focusRef } : null),
  })
  return hints
}

const debugEventForProjection = (event: WorkbenchNormalizedEvent): RuntimeWorkbenchDebugEventRef => {
  const ref = event.ref as any
  const downgrade = isRecord(ref.downgrade) ? (ref.downgrade as Record<string, unknown>) : undefined
  const downgradeReason = asString(downgrade?.reason) ?? asString(ref.downgrade)
  return {
    eventId: asString(ref.eventId) ?? event.evidenceRef,
    runtimeLabel: event.coordinate.runtimeLabel,
    moduleId: event.coordinate.moduleId,
    instanceId: event.coordinate.instanceId,
    txnSeq: event.coordinate.txnSeq,
    opSeq: event.coordinate.opSeq,
    eventSeq: event.coordinate.eventSeq,
    timestamp: event.coordinate.timestamp,
    label: asString(ref.label),
    type: asString(ref.kind),
    degraded: downgradeReason === 'non_serializable' || downgradeReason === 'oversized',
    dropped: Boolean(ref.dropped),
  }
}

const asEvent = (value: unknown): CoreDebug.RuntimeDebugEventRef | undefined => {
  if (!isRecord(value)) return undefined
  const kind = asString(value.kind)
  const label = asString(value.label)
  const moduleId = asString(value.moduleId)
  const instanceId = asString(value.instanceId)
  if (!kind || !label || !moduleId || !instanceId) return undefined
  return value as unknown as CoreDebug.RuntimeDebugEventRef
}

const coordinateFromEvent = (event: CoreDebug.RuntimeDebugEventRef): Partial<WorkbenchStableCoordinate> => ({
  runtimeLabel: event.runtimeLabel ?? 'unknown',
  moduleId: event.moduleId,
  instanceId: event.instanceId,
  txnSeq: asFiniteNumber((event as any).txnSeq),
  opSeq: asFiniteNumber((event as any).opSeq),
  eventSeq: asFiniteNumber((event as any).eventSeq),
  timestamp: asFiniteNumber((event as any).timestamp),
})

const evidenceRefFromEvent = (event: CoreDebug.RuntimeDebugEventRef, index: number): string => {
  const eventId = asString((event as any).eventId)
  if (eventId) return `debug:event:${eventId}`
  const eventSeq = asFiniteNumber((event as any).eventSeq)
  if (eventSeq !== undefined) return `debug:event:${eventSeq}`
  return `debug:event:index-${index}`
}

const gapForMissingCoordinates = (
  event: CoreDebug.RuntimeDebugEventRef,
  evidenceRef: string,
): ReadonlyArray<WorkbenchEvidenceGap> => {
  const coordinate = coordinateFromEvent(event)
  const gaps: WorkbenchEvidenceGap[] = []
  if (!coordinate.runtimeLabel) {
    gaps.push({ code: 'debug-event-without-stable-coordinate', owner: 'gap-session', evidenceRefs: [evidenceRef], coordinate })
  }
  if (!coordinate.instanceId) {
    gaps.push({ code: 'debug-event-without-stable-coordinate', owner: 'gap-session', evidenceRefs: [evidenceRef], coordinate })
  }
  if (coordinate.txnSeq === undefined) {
    gaps.push({ code: 'debug-event-without-stable-coordinate', owner: 'gap-session', evidenceRefs: [evidenceRef], coordinate })
  }
  if (coordinate.eventSeq === undefined) {
    gaps.push({ code: 'debug-event-without-stable-coordinate', owner: 'gap-session', evidenceRefs: [evidenceRef], coordinate })
  }
  const downgrade = isRecord((event as any).downgrade) ? ((event as any).downgrade as Record<string, unknown>) : undefined
  const downgradeReason = asString(downgrade?.reason) ?? asString((event as any).downgrade)
  if (downgradeReason === 'non_serializable') {
    gaps.push({ code: 'over-budget-evidence', owner: 'drilldown', evidenceRefs: [evidenceRef], coordinate })
  }
  if (downgradeReason === 'oversized') {
    gaps.push({ code: 'over-budget-evidence', owner: 'drilldown', evidenceRefs: [evidenceRef], coordinate })
  }
  return gaps
}

export const normalizeDebugEvents = (
  events: ReadonlyArray<unknown>,
): {
  readonly events: ReadonlyArray<WorkbenchNormalizedEvent>
  readonly gaps: ReadonlyArray<WorkbenchEvidenceGap>
} => {
  const normalized: WorkbenchNormalizedEvent[] = []
  const gaps: WorkbenchEvidenceGap[] = []

  events.forEach((value, index) => {
    const event = asEvent(value)
    if (!event) return
    const evidenceRef = evidenceRefFromEvent(event, index)
    normalized.push({
      ref: event,
      evidenceRef,
      coordinate: coordinateFromEvent(event),
    })
    gaps.push(...gapForMissingCoordinates(event, evidenceRef))
  })

  return { events: normalized, gaps }
}

export const normalizeLiveSnapshot = (snapshot: DevtoolsSnapshot): WorkbenchNormalizedInput => {
  const normalized = normalizeDebugEvents((snapshot as any).events ?? [])
  return {
    source: { kind: 'live-snapshot' },
    events: normalized.events,
    evidencePackage: undefined,
    report: undefined,
    gaps: normalized.gaps,
  }
}

export const normalizeImportedEvidencePackage = (pkg: unknown): WorkbenchNormalizedInput => {
  const rawEvents = (() => {
    if (!isRecord(pkg)) return []
    if (Array.isArray((pkg as any).events)) {
      const events = (pkg as any).events as ReadonlyArray<unknown>
      return events.map((entry) => {
        if (!isRecord(entry)) return entry
        return (entry as any).type === 'debug:event' && isRecord((entry as any).payload) ? (entry as any).payload : entry
      })
    }
    return []
  })()

  const normalized = normalizeDebugEvents(rawEvents)
  const gaps: WorkbenchEvidenceGap[] = [...normalized.gaps]
  if (isRecord(pkg)) {
    const exportBudget = isRecord((pkg as any).exportBudget) ? ((pkg as any).exportBudget as Record<string, unknown>) : undefined
    const dropped = asFiniteNumber(exportBudget?.dropped)
    const oversized = asFiniteNumber(exportBudget?.oversized)
    if (dropped && dropped > 0) {
      gaps.push({ code: 'over-budget-evidence', owner: 'evidence-gap-bucket', evidenceRefs: [] })
    }
    if (oversized && oversized > 0) {
      gaps.push({ code: 'over-budget-evidence', owner: 'evidence-gap-bucket', evidenceRefs: [] })
    }
  }

  return {
    source: { kind: 'imported-evidence' },
    events: normalized.events,
    evidencePackage: pkg,
    report: undefined,
    gaps,
    selectionHints: isRecord(pkg) ? selectionHintsFromManifest((pkg as any).selectionManifest) : [],
  }
}

export const normalizeControlPlaneReport = (report: unknown): WorkbenchNormalizedInput => ({
  source: { kind: 'control-plane-report' },
  events: [],
  evidencePackage: undefined,
  report,
  gaps: [],
})

export const mergeWorkbenchInputs = (...inputs: ReadonlyArray<WorkbenchNormalizedInput>): WorkbenchNormalizedInput => {
  const present = inputs.filter((input) => input.events.length > 0 || input.report !== undefined || input.gaps.length > 0)
  if (present.length === 0) {
    return {
      source: { kind: 'merged' },
      events: [],
      evidencePackage: undefined,
      report: undefined,
      gaps: [],
    }
  }

  return {
    source: present.length === 1 ? present[0]!.source : { kind: 'merged' },
    events: present.flatMap((input) => input.events),
    evidencePackage: present.find((input) => input.evidencePackage !== undefined)?.evidencePackage,
    report: present.find((input) => input.report !== undefined)?.report,
    gaps: present.flatMap((input) => input.gaps),
    selectionHints: present.flatMap((input) => input.selectionHints ?? []),
  }
}

export const buildRuntimeWorkbenchAuthorityBundle = (input: WorkbenchNormalizedInput): RuntimeWorkbenchAuthorityBundle => {
  const truthInputs: RuntimeWorkbenchTruthInput[] = []
  const contextRefs: RuntimeWorkbenchContextRef[] = []
  const evidenceDigest = sourceDigestFromEvidencePackage(input.evidencePackage)

  if (evidenceDigest) {
    contextRefs.push({
      kind: 'source-snapshot',
      projectId: 'logix-dvtools',
      digest: evidenceDigest,
    })
  }

  for (const group of groupEventsForProjection(input.events)) {
    truthInputs.push({
      kind: 'debug-event-batch',
      batchId: `${input.source.kind}:${group.key}`,
      events: group.events.map(debugEventForProjection),
      ...(evidenceDigest ? { sourceDigest: evidenceDigest } : null),
    })
  }

  if (isVerificationControlPlaneReport(input.report)) {
    truthInputs.push({
      kind: 'control-plane-report',
      report: input.report,
      ...(evidenceDigest ? { sourceDigest: evidenceDigest } : null),
    })
  }

  if (isRecord(input.evidencePackage)) {
    const artifacts = Array.isArray((input.evidencePackage as any).artifacts)
      ? ((input.evidencePackage as any).artifacts as ReadonlyArray<unknown>).flatMap((value) => {
          const artifact = artifactRefFromValue(value)
          return artifact ? [artifact] : []
        })
      : []
    if (artifacts.length > 0) {
      truthInputs.push({
        kind: 'evidence-package',
        packageId: asString((input.evidencePackage as any).packageId) ?? 'logix-dvtools-import',
        artifacts,
        ...(evidenceDigest ? { sourceDigest: evidenceDigest } : null),
      })
    }
  }

  return {
    truthInputs,
    ...(contextRefs.length > 0 ? { contextRefs } : null),
    ...((input.selectionHints?.length ?? 0) > 0 ? { selectionHints: input.selectionHints } : null),
  }
}
