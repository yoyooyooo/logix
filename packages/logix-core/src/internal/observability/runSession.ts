import { Context, Layer } from 'effect'
import type { JsonValue } from './jsonValue.js'
import type { EvidencePackage, EvidencePackageSource, ObservationEnvelope } from './evidence.js'
import { exportEvidencePackage, OBSERVABILITY_PROTOCOL_VERSION } from './evidence.js'

export type RunId = string

export interface RunSessionLocalState {
  /**
   * once: a de-dup key set for "emit only once" behavior (must be isolated per session to avoid cross-session pollution).
   * Returns true if it's the first occurrence, false if the key has been seen before.
   */
  readonly once: (key: string) => boolean

  /**
   * seq: allocate monotonic sequences by key (e.g. opSeq/eventSeq), must be isolated per session.
   */
  readonly nextSeq: (namespace: string, key: string) => number

  /** Tests/reset only: clear this session's local state. */
  readonly clear: () => void
}

export interface RunSession {
  readonly runId: RunId
  readonly source: EvidencePackageSource
  readonly startedAt: number
  readonly local: RunSessionLocalState
}

class RunSessionTagImpl extends Context.Tag('@logixjs/core/RunSession')<RunSessionTagImpl, RunSession>() {}

export const RunSessionTag = RunSessionTagImpl

export interface EvidenceSink {
  readonly record: (type: string, payload: JsonValue, options?: { readonly timestamp?: number }) => void
  readonly export: (options?: {
    readonly protocolVersion?: string
    readonly createdAt?: number
    readonly summary?: JsonValue
    readonly maxEvents?: number
  }) => EvidencePackage
  readonly clear: () => void
}

const NEXT_RUN_SEQ_KEY = Symbol.for('@logixjs/core/runSession/nextRunSeq')
let fallbackNextRunSeq = 0

const nextRunSeq = (): number => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g: any = globalThis as any
    const prev = typeof g[NEXT_RUN_SEQ_KEY] === 'number' ? (g[NEXT_RUN_SEQ_KEY] as number) : 0
    const next = prev + 1
    g[NEXT_RUN_SEQ_KEY] = next
    return next
  } catch {
    fallbackNextRunSeq += 1
    return fallbackNextRunSeq
  }
}

const makeRunId = (startedAt: number): RunId => `run-${startedAt}.${nextRunSeq()}`

export const makeRunSessionLocalState = (): RunSessionLocalState => {
  const onceKeys = new Set<string>()
  const seqByNamespace = new Map<string, Map<string, number>>()

  return {
    once: (key) => {
      if (onceKeys.has(key)) return false
      onceKeys.add(key)
      return true
    },
    nextSeq: (namespace, key) => {
      const byKey = seqByNamespace.get(namespace) ?? new Map<string, number>()
      if (!seqByNamespace.has(namespace)) seqByNamespace.set(namespace, byKey)
      const prev = byKey.get(key) ?? 0
      const next = prev + 1
      byKey.set(key, next)
      return next
    },
    clear: () => {
      onceKeys.clear()
      seqByNamespace.clear()
    },
  }
}

export const makeRunSession = (options?: {
  readonly runId?: RunId
  readonly source?: EvidencePackageSource
  readonly startedAt?: number
  readonly local?: RunSessionLocalState
}): RunSession => {
  const startedAt = options?.startedAt ?? Date.now()
  return {
    runId: options?.runId ?? makeRunId(startedAt),
    source: options?.source ?? { host: 'unknown' },
    startedAt,
    local: options?.local ?? makeRunSessionLocalState(),
  }
}

export const makeEvidenceSink = (session: RunSession): EvidenceSink => {
  const events: ObservationEnvelope[] = []
  let nextSeq = 1

  return {
    record: (type, payload, options) => {
      events.push({
        protocolVersion: OBSERVABILITY_PROTOCOL_VERSION,
        runId: session.runId,
        seq: nextSeq++,
        timestamp: options?.timestamp ?? Date.now(),
        type,
        payload,
      })
    },
    export: (options) => {
      const protocolVersion = options?.protocolVersion ?? OBSERVABILITY_PROTOCOL_VERSION
      const maxEvents = options?.maxEvents

      const selected =
        typeof maxEvents === 'number' && Number.isFinite(maxEvents) && maxEvents > 0
          ? events.slice(Math.max(0, events.length - Math.floor(maxEvents)))
          : events.slice()

      return exportEvidencePackage({
        protocolVersion,
        runId: session.runId,
        source: session.source,
        createdAt: options?.createdAt,
        events: selected,
        summary: options?.summary,
      })
    },
    clear: () => {
      events.length = 0
      nextSeq = 1
    },
  }
}

export const runSessionLayer = (session?: RunSession): Layer.Layer<RunSessionTagImpl, never, never> =>
  Layer.succeed(RunSessionTag, session ?? makeRunSession()) as Layer.Layer<RunSessionTagImpl, never, never>
