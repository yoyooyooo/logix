import type { JsonValue } from './jsonValue.js'
import type { ObservationEnvelope } from './envelope.js'
import type { EvidencePackage } from './evidence.js'

export interface AggregatedTimelineEntry {
  readonly seq: number
  readonly timestamp: number
  readonly type: string
  readonly kind?: string
  readonly label?: string
  readonly ref?: {
    readonly moduleId?: string
    readonly instanceId?: string
    readonly txnId?: string
  }
}

export interface AggregatedDiagnosticEntry {
  readonly seq: number
  readonly label?: string
  readonly errorSummary?: JsonValue
}

export interface AggregatedSnapshot {
  readonly run: { readonly runId: string; readonly protocolVersion: string }
  readonly stats: { readonly totalEvents: number; readonly droppedEvents: number }
  readonly timeline: ReadonlyArray<AggregatedTimelineEntry>
  readonly instances: ReadonlyArray<readonly [key: string, count: number]>
  readonly latestStates: ReadonlyArray<readonly [key: string, state: JsonValue]>
  readonly latestTraitSummaries: ReadonlyArray<readonly [key: string, summary: JsonValue]>
  readonly diagnostics: ReadonlyArray<AggregatedDiagnosticEntry>
}

type JsonRecord = { readonly [key: string]: JsonValue }

const isRecord = (value: JsonValue | undefined): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asNonEmptyString = (value: JsonValue | undefined): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined

const asFiniteNumber = (value: JsonValue | undefined): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

const toRuntimeKey = (runtimeLabel: string, moduleId: string): string => `${runtimeLabel}::${moduleId}`
const toInstanceKey = (runtimeLabel: string, moduleId: string, instanceId: string): string =>
  `${runtimeLabel}::${moduleId}::${instanceId}`

const asRuntimeDebugEventRef = (payload: JsonValue): JsonRecord | undefined => {
  if (!isRecord(payload)) return undefined

  // Minimum required fields (see specs/005/contracts/runtime-debug-event-ref.schema.json)
  if (!asNonEmptyString(payload.moduleId) || !asNonEmptyString(payload.instanceId)) return undefined
  if (!asNonEmptyString(payload.kind) || !asNonEmptyString(payload.label)) return undefined
  if (asFiniteNumber(payload.timestamp) === undefined) return undefined

  // eventSeq/txnSeq are strongly recommended but not strictly required for aggregation; tolerate missing for forward-compat.
  return payload
}

export const aggregateObservationEnvelopes = (options: {
  readonly runId: string
  readonly protocolVersion: string
  readonly events: ReadonlyArray<ObservationEnvelope>
}): AggregatedSnapshot => {
  const sorted = options.events.slice().sort((a, b) => a.seq - b.seq)

  const seenSeq = new Set<number>()
  const timeline: AggregatedTimelineEntry[] = []
  const instances = new Map<string, number>()
  const latestStates = new Map<string, JsonValue>()
  const latestTraitSummaries = new Map<string, JsonValue>()
  const diagnostics: AggregatedDiagnosticEntry[] = []

  let droppedEvents = 0

  for (const env of sorted) {
    if (seenSeq.has(env.seq)) {
      droppedEvents += 1
      continue
    }
    seenSeq.add(env.seq)

    let kind: string | undefined
    let label: string | undefined
    let refEntry:
      | {
          readonly moduleId?: string
          readonly instanceId?: string
          readonly txnId?: string
        }
      | undefined

    if (env.type === 'debug:event') {
      const ref = asRuntimeDebugEventRef(env.payload)
      if (ref) {
        kind = asNonEmptyString(ref.kind)
        label = asNonEmptyString(ref.label)

        const moduleId = asNonEmptyString(ref.moduleId)
        const instanceId = asNonEmptyString(ref.instanceId)
        const txnId = asNonEmptyString(ref.txnId)
        const runtimeLabel = asNonEmptyString(ref.runtimeLabel) ?? 'unknown'

        refEntry = {
          ...(moduleId ? { moduleId } : {}),
          ...(instanceId ? { instanceId } : {}),
          ...(txnId ? { txnId } : {}),
        }

        // Instance counts: use lifecycle events encoded as debug:event refs.
        if (kind === 'lifecycle' && (label === 'module:init' || label === 'module:destroy')) {
          if (moduleId && instanceId) {
            const key = toRuntimeKey(runtimeLabel, moduleId)
            const prev = instances.get(key) ?? 0
            const next = label === 'module:init' ? prev + 1 : prev - 1
            if (next <= 0) {
              instances.delete(key)
            } else {
              instances.set(key, next)
            }
          }
        }

        // Latest state caches: only when meta contains projected state/traitSummary.
        if (kind === 'state' && label === 'state:update') {
          if (moduleId && instanceId) {
            const meta = ref.meta
            if (isRecord(meta)) {
              const state = meta.state
              if (state !== undefined) {
                latestStates.set(toInstanceKey(runtimeLabel, moduleId, instanceId), state)
              }
              const traitSummary = meta.traitSummary
              if (traitSummary !== undefined) {
                latestTraitSummaries.set(toInstanceKey(runtimeLabel, moduleId, instanceId), traitSummary)
              }
            }
          }
        }

        // Diagnostics index: errors and diagnostic events.
        const errorSummary = ref.errorSummary
        if (errorSummary !== undefined || kind === 'diagnostic') {
          diagnostics.push({
            seq: env.seq,
            ...(label ? { label } : {}),
            ...(errorSummary !== undefined ? { errorSummary } : {}),
          })
        }
      }
    }

    timeline.push({
      seq: env.seq,
      timestamp: env.timestamp,
      type: env.type,
      ...(kind ? { kind } : {}),
      ...(label ? { label } : {}),
      ...(refEntry ? { ref: refEntry } : {}),
    })
  }

  const toSortedEntries = <V>(map: Map<string, V>): Array<readonly [string, V]> =>
    Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))

  return {
    run: { runId: options.runId, protocolVersion: options.protocolVersion },
    stats: {
      totalEvents: timeline.length,
      droppedEvents,
    },
    timeline,
    instances: toSortedEntries(instances),
    latestStates: toSortedEntries(latestStates),
    latestTraitSummaries: toSortedEntries(latestTraitSummaries),
    diagnostics,
  }
}

export const aggregateEvidencePackage = (pkg: EvidencePackage): AggregatedSnapshot =>
  aggregateObservationEnvelopes({
    runId: pkg.runId,
    protocolVersion: pkg.protocolVersion,
    events: pkg.events,
  })
