import * as Logix from '@logixjs/core'
import type { DevtoolsSnapshot } from '../snapshot/index.js'

export type ProjectionBudgetByEvent = ReadonlyArray<Logix.Debug.ProjectionBudgetAttribution>
export type ProjectionBudgetSummary = {
  readonly totals: { readonly dropped: number; readonly oversized: number }
  readonly byEvent: ProjectionBudgetByEvent
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined

const asFiniteNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

const normalizeProjectionBudgetAttribution = (value: unknown): Logix.Debug.ProjectionBudgetAttribution | undefined => {
  if (!isRecord(value)) return undefined

  const key = asNonEmptyString(value.key)
  const source = value.source === 'runtime-debug-event' || value.source === 'raw-debug-event' ? value.source : undefined
  const eventType = asNonEmptyString(value.eventType)
  const dropped = asFiniteNumber(value.dropped)
  const oversized = asFiniteNumber(value.oversized)

  if (!key || !source || !eventType || dropped === undefined || oversized === undefined) return undefined

  return {
    key,
    source,
    eventType,
    kind: asNonEmptyString(value.kind),
    label: asNonEmptyString(value.label),
    costClass:
      value.costClass === 'runtime_core' ||
      value.costClass === 'controlplane_phase' ||
      value.costClass === 'devtools_projection'
        ? value.costClass
        : undefined,
    gateClass: value.gateClass === 'hard' || value.gateClass === 'soft' ? value.gateClass : undefined,
    samplingPolicy:
      value.samplingPolicy === 'always' || value.samplingPolicy === 'budgeted' || value.samplingPolicy === 'sampled'
        ? value.samplingPolicy
        : undefined,
    dropped,
    oversized,
  }
}

const toTopProjectionBudgetByEvent = (values: Iterable<unknown>): ProjectionBudgetByEvent =>
  Array.from(values)
    .map(normalizeProjectionBudgetAttribution)
    .filter((item): item is Logix.Debug.ProjectionBudgetAttribution => item !== undefined)
    .filter((item) => item.dropped !== 0 || item.oversized !== 0)
    .sort((a, b) => {
      const byTotal = b.dropped + b.oversized - (a.dropped + a.oversized)
      if (byTotal !== 0) return byTotal
      const byOversized = b.oversized - a.oversized
      if (byOversized !== 0) return byOversized
      return a.key.localeCompare(b.key)
    })
    .slice(0, 10)

export const readProjectionBudgetSummaryFromEvidenceSummary = (summary: unknown): ProjectionBudgetSummary | undefined => {
  if (!isRecord(summary)) return undefined
  const projectionBudget = isRecord(summary.projectionBudget) ? summary.projectionBudget : undefined
  if (!projectionBudget) return undefined

  const totals = isRecord(projectionBudget.totals) ? projectionBudget.totals : undefined
  const dropped = totals ? asFiniteNumber(totals.dropped) : undefined
  const oversized = totals ? asFiniteNumber(totals.oversized) : undefined

  const byEvent = Array.isArray(projectionBudget.byEvent) ? toTopProjectionBudgetByEvent(projectionBudget.byEvent) : []

  if (dropped === undefined || oversized === undefined) {
    if (byEvent.length === 0) return undefined
    return {
      totals: { dropped: 0, oversized: 0 },
      byEvent,
    }
  }

  return {
    totals: { dropped, oversized },
    byEvent,
  }
}

export const readProjectionBudgetSummaryFromSnapshot = (snapshot: DevtoolsSnapshot): ProjectionBudgetSummary | undefined => {
  const exportBudget = isRecord(snapshot.exportBudget) ? snapshot.exportBudget : undefined
  if (!exportBudget) return undefined

  const dropped = asFiniteNumber(exportBudget.dropped) ?? 0
  const oversized = asFiniteNumber(exportBudget.oversized) ?? 0

  const byEventRaw = exportBudget.byEvent
  const byEvent = byEventRaw instanceof Map ? toTopProjectionBudgetByEvent(byEventRaw.values()) : []

  if (dropped === 0 && oversized === 0 && byEvent.length === 0) return undefined

  return {
    totals: { dropped, oversized },
    byEvent,
  }
}

export const makeProjectionBudgetSyntheticEvent = (args: {
  readonly runtimeLabel: string
  readonly moduleId: string
  readonly instanceId: string
  readonly timestamp: number
  readonly summary: ProjectionBudgetSummary
}): Logix.Debug.RuntimeDebugEventRef =>
  ({
    eventId: `${args.instanceId}::e0::projectionBudget`,
    eventSeq: 0,
    moduleId: args.moduleId,
    instanceId: args.instanceId,
    runtimeLabel: args.runtimeLabel,
    txnSeq: 0,
    txnId: undefined,
    timestamp: args.timestamp,
    kind: 'devtools',
    label: 'devtools:projectionBudget',
    costClass: 'devtools_projection',
    gateClass: 'soft',
    samplingPolicy: 'sampled',
    meta: {
      totals: args.summary.totals,
      byEvent: args.summary.byEvent,
    } as any,
  }) as unknown as Logix.Debug.RuntimeDebugEventRef
