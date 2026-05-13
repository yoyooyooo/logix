import type {
  WorkbenchArtifactAttachment,
  WorkbenchEvidenceGap,
  WorkbenchFinding,
  WorkbenchMetric,
  WorkbenchNormalizedEvent,
  WorkbenchNormalizedInput,
  WorkbenchScope,
  WorkbenchSession,
  WorkbenchSessionCoordinate,
  WorkbenchStableCoordinate,
  WorkbenchHostViewModel,
} from './model.js'
import { deriveRuntimeWorkbenchProjectionIndex } from '@logixjs/core/repo-internal/workbench-api'
import type {
  RuntimeWorkbenchArtifactProjection,
  RuntimeWorkbenchEvidenceGap,
  RuntimeWorkbenchFindingProjection,
  RuntimeWorkbenchProjectionIndex,
  RuntimeWorkbenchSessionProjection,
} from '@logixjs/core/repo-internal/workbench-api'
import { buildRuntimeWorkbenchAuthorityBundle } from './normalize.js'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asString = (value: unknown): string | undefined => (typeof value === 'string' && value.length > 0 ? value : undefined)

const asFiniteNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

const requiredString = (value: unknown, fallback: string): string => asString(value) ?? fallback

const scopeIdOf = (runtimeLabel: string): string => `scope:${runtimeLabel}`

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

const metricFromEvents = (events: ReadonlyArray<WorkbenchNormalizedEvent>): WorkbenchMetric => {
  let renderCount = 0
  let actionCount = 0
  let stateCount = 0
  let diagnosticCount = 0
  let minTs: number | undefined
  let maxTs: number | undefined

  for (const event of events) {
    const ref = event.ref as any
    if (ref.kind === 'react-render' || ref.kind === 'react-selector') renderCount += 1
    if (ref.kind === 'action') actionCount += 1
    if (ref.kind === 'state') stateCount += 1
    if (ref.kind === 'diagnostic' || ref.label === 'diagnostic') diagnosticCount += 1
    const ts = event.coordinate.timestamp
    if (ts !== undefined) {
      minTs = minTs === undefined ? ts : Math.min(minTs, ts)
      maxTs = maxTs === undefined ? ts : Math.max(maxTs, ts)
    }
  }

  return {
    eventCount: events.length,
    renderCount,
    actionCount,
    stateCount,
    diagnosticCount,
    durationMs: minTs === undefined || maxTs === undefined ? 0 : Math.max(0, maxTs - minTs),
  }
}

const range = (values: ReadonlyArray<number | undefined>): { readonly start: number; readonly end: number } | undefined => {
  const present = values.filter((value): value is number => value !== undefined)
  if (present.length === 0) return undefined
  return {
    start: Math.min(...present),
    end: Math.max(...present),
  }
}

const coordinateForGroup = (
  events: ReadonlyArray<WorkbenchNormalizedEvent>,
  fallback: WorkbenchStableCoordinate,
): WorkbenchSessionCoordinate => ({
  runtimeLabel: fallback.runtimeLabel,
  moduleId: fallback.moduleId,
  instanceId: fallback.instanceId,
  txnSeqRange: range(events.map((event) => event.coordinate.txnSeq)),
  eventSeqRange: range(events.map((event) => event.coordinate.eventSeq)),
  timestampRange: range(events.map((event) => event.coordinate.timestamp)),
})

const deriveScopes = (events: ReadonlyArray<WorkbenchNormalizedEvent>): ReadonlyArray<WorkbenchScope> => {
  const byRuntime = new Map<string, Map<string, Set<string>>>()
  for (const event of events) {
    const runtimeLabel = requiredString(event.coordinate.runtimeLabel, 'unknown')
    const moduleId = requiredString(event.coordinate.moduleId, 'unknown')
    const instanceId = requiredString(event.coordinate.instanceId, 'unknown')
    const modules = byRuntime.get(runtimeLabel) ?? new Map<string, Set<string>>()
    const instances = modules.get(moduleId) ?? new Set<string>()
    instances.add(instanceId)
    modules.set(moduleId, instances)
    byRuntime.set(runtimeLabel, modules)
  }

  return Array.from(byRuntime.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([runtimeLabel, modules]) => ({
      id: scopeIdOf(runtimeLabel),
      runtimeLabel,
      modules: Array.from(modules.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([moduleId, instances]) => ({
          moduleId,
          instances: Array.from(instances).sort(),
        })),
    }))
}

const groupEventsByProjectedSession = (
  events: ReadonlyArray<WorkbenchNormalizedEvent>,
): ReadonlyMap<string, ReadonlyArray<WorkbenchNormalizedEvent>> => {
  const bySession = new Map<string, WorkbenchNormalizedEvent[]>()
  const sorted = [...events].sort(compareNormalizedEvent)

  for (const event of sorted) {
    const unit = event.coordinate.txnSeq !== undefined ? `txn:${event.coordinate.txnSeq}` : `event:${event.coordinate.eventSeq ?? 'unknown'}`
    const sessionId = [
      requiredString(event.coordinate.runtimeLabel, 'unknown'),
      requiredString(event.coordinate.moduleId, 'unknown'),
      requiredString(event.coordinate.instanceId, 'unknown'),
      unit,
    ].join(':')
    const list = bySession.get(sessionId) ?? []
    list.push(event)
    bySession.set(sessionId, list)
  }

  return bySession
}

const projectionEventKeyOf = (session: RuntimeWorkbenchSessionProjection): string | undefined => {
  const coordinate = session.runtimeCoordinate
  if (!coordinate?.runtimeLabel || !coordinate.moduleId || !coordinate.instanceId) return undefined
  const unit = coordinate.txnSeq !== undefined ? `txn:${coordinate.txnSeq}` : `event:${coordinate.eventSeq ?? 'unknown'}`
  return [coordinate.runtimeLabel, coordinate.moduleId, coordinate.instanceId, unit].join(':')
}

const authorityEvidenceRef = (session: RuntimeWorkbenchSessionProjection): string =>
  `${session.authorityRef.kind}:${session.authorityRef.id}`

const attachmentFromProjection = (artifact: RuntimeWorkbenchArtifactProjection): WorkbenchArtifactAttachment => ({
  artifactKey: artifact.artifactOutputKey ?? artifact.id,
  artifactKind: artifact.kind,
  ...(artifact.artifactRef ? { artifactRef: artifact.artifactRef } : null),
  evidenceRefs: artifact.authorityRef ? [`${artifact.authorityRef.kind}:${artifact.authorityRef.id}`] : [],
  summary: artifact.artifactOutputKey ?? artifact.id,
})

const sourceRefFromFocusRef = (focusRef: unknown): string | undefined =>
  isRecord(focusRef) && typeof (focusRef as any).sourceRef === 'string' ? ((focusRef as any).sourceRef as string) : undefined

const findingKindFromProjection = (finding: RuntimeWorkbenchFindingProjection): WorkbenchFinding['kind'] => {
  if (finding.class === 'control-plane-finding') return 'report'
  if (finding.class === 'evidence-gap') return 'evidence-gap'
  if (finding.class === 'degradation-notice') return 'activity'
  return 'diagnostic'
}

const reportRefFromProjection = (
  finding: RuntimeWorkbenchFindingProjection,
): WorkbenchFinding['reportRef'] | undefined => {
  if (finding.class !== 'control-plane-finding') return undefined
  const parts = finding.authorityRef?.id.split(':') ?? []
  return {
    stage: parts[0],
    mode: parts[1],
    verdict: parts[2],
    errorCode: finding.code,
    nextRecommendedStage: finding.repairMirror?.nextRecommendedStage ?? undefined,
  }
}

const findingFromProjection = (args: {
  readonly finding: RuntimeWorkbenchFindingProjection
  readonly session: RuntimeWorkbenchSessionProjection
  readonly scopeId: string
  readonly artifactsByOutputKey: ReadonlyMap<string, WorkbenchArtifactAttachment>
}): WorkbenchFinding => {
  const artifacts = args.finding.artifactOutputKeys.flatMap((outputKey) => {
    const artifact = args.artifactsByOutputKey.get(outputKey)
    return artifact ? [artifact] : []
  })
  return {
    id: args.finding.id,
    sessionId: args.session.id,
    scopeId: args.scopeId,
    severity: args.finding.severity,
    kind: findingKindFromProjection(args.finding),
    summary: args.finding.summary,
    focusRef: args.finding.focusRef,
    sourceRef: sourceRefFromFocusRef(args.finding.focusRef),
    evidenceRefs: args.finding.authorityRef ? [`${args.finding.authorityRef.kind}:${args.finding.authorityRef.id}`] : [],
    artifacts,
    ...(reportRefFromProjection(args.finding) ? { reportRef: reportRefFromProjection(args.finding) } : null),
    ...(args.session.runtimeCoordinate ? { coordinate: args.session.runtimeCoordinate } : null),
  }
}

const gapFromProjection = (gap: RuntimeWorkbenchEvidenceGap): WorkbenchEvidenceGap => ({
  code: gap.code,
  owner: gap.owner === 'bundle' || gap.owner === 'source' ? 'evidence-gap-bucket' : gap.owner,
  evidenceRefs: gap.authorityRef ? [`${gap.authorityRef.kind}:${gap.authorityRef.id}`] : [],
  projectionGapId: gap.id,
})

const fallbackCoordinateForSession = (session: RuntimeWorkbenchSessionProjection): WorkbenchStableCoordinate => ({
  runtimeLabel: session.runtimeCoordinate?.runtimeLabel ?? session.authorityRef.kind,
  moduleId: session.runtimeCoordinate?.moduleId ?? session.inputKind,
  instanceId: session.runtimeCoordinate?.instanceId ?? session.authorityRef.id,
  ...(session.runtimeCoordinate?.txnSeq !== undefined ? { txnSeq: session.runtimeCoordinate.txnSeq } : null),
  ...(session.runtimeCoordinate?.opSeq !== undefined ? { opSeq: session.runtimeCoordinate.opSeq } : null),
  ...(session.runtimeCoordinate?.eventSeq !== undefined ? { eventSeq: session.runtimeCoordinate.eventSeq } : null),
  ...(session.runtimeCoordinate?.timestamp !== undefined ? { timestamp: session.runtimeCoordinate.timestamp } : null),
})

const deriveProjectionView = (args: {
  readonly projection: RuntimeWorkbenchProjectionIndex
  readonly events: ReadonlyArray<WorkbenchNormalizedEvent>
}): {
  readonly sessions: ReadonlyArray<WorkbenchSession>
  readonly findings: ReadonlyArray<WorkbenchFinding>
  readonly artifacts: ReadonlyArray<WorkbenchArtifactAttachment>
  readonly gaps: ReadonlyArray<WorkbenchEvidenceGap>
} => {
  const eventGroups = groupEventsByProjectedSession(args.events)
  const artifactsById = args.projection.indexes?.artifactsById ?? {}
  const findingsById = args.projection.indexes?.findingsById ?? {}
  const gapsById = args.projection.indexes?.gapsById ?? {}
  const attachments = Object.values(artifactsById).map(attachmentFromProjection)
  const artifactsByOutputKey = new Map(attachments.map((artifact) => [artifact.artifactKey, artifact]))
  const gaps = Object.values(gapsById).map(gapFromProjection)
  const findings: WorkbenchFinding[] = []
  const sessions: WorkbenchSession[] = []

  for (const session of args.projection.sessions) {
    const groupKey = projectionEventKeyOf(session)
    const events = groupKey ? (eventGroups.get(groupKey) ?? []) : []
    const scopeId = scopeIdOf(session.runtimeCoordinate?.runtimeLabel ?? session.authorityRef.kind)
    const sessionFindings = session.findingRefs.flatMap((findingId) => {
      const finding = findingsById[findingId]
      return finding ? [findingFromProjection({ finding, session, scopeId, artifactsByOutputKey })] : []
    })
    findings.push(...sessionFindings)
    const sessionGaps = session.gapRefs.flatMap((gapId) => {
      const gap = gapsById[gapId]
      return gap ? [gapFromProjection(gap)] : []
    })
    const sessionArtifactKeys = new Set<string>()
    for (const artifactRef of session.artifactRefs) {
      const artifact = artifactsById[artifactRef]
      if (artifact) sessionArtifactKeys.add(artifact.artifactOutputKey ?? artifact.id)
    }
    for (const finding of sessionFindings) {
      for (const artifact of finding.artifacts) {
        sessionArtifactKeys.add(artifact.artifactKey)
      }
    }

    sessions.push({
      id: session.id,
      scopeId,
      coordinate: coordinateForGroup(events, fallbackCoordinateForSession(session)),
      evidenceRefs: events.length > 0 ? events.map((event) => event.evidenceRef) : [authorityEvidenceRef(session)],
      metrics: metricFromEvents(events),
      findingIds: sessionFindings.map((finding) => finding.id),
      artifactKeys: Array.from(sessionArtifactKeys).sort(),
      gaps: sessionGaps,
    })
  }

  return {
    sessions,
    findings,
    artifacts: attachments,
    gaps,
  }
}

export const deriveWorkbenchHostViewModel = (input: WorkbenchNormalizedInput): WorkbenchHostViewModel => {
  const projection = deriveRuntimeWorkbenchProjectionIndex(buildRuntimeWorkbenchAuthorityBundle(input))
  const scopes = deriveScopes(input.events)
  const view = deriveProjectionView({ projection, events: input.events })

  if (input.events.length === 0 && projection.sessions.length === 0) {
    return {
      inputSource: input.source,
      projection,
      scopes,
      sessions: [],
      findings: [],
      artifacts: [],
      gaps: [{ code: 'debug-event-without-stable-coordinate', owner: 'empty', evidenceRefs: [] }],
      defaultDrilldown: { kind: 'timeline' },
    }
  }

  return {
    inputSource: input.source,
    projection,
    scopes,
    sessions: view.sessions,
    findings: view.findings,
    artifacts: view.artifacts,
    gaps: view.gaps,
    defaultDrilldown: { kind: view.findings.some((finding) => finding.kind === 'report') ? 'report' : 'timeline' },
  }
}
