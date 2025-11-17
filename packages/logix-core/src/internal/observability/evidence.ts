import { isJsonValue, type JsonValue } from './jsonValue.js'

export const OBSERVABILITY_PROTOCOL_VERSION = 'v1'

export interface ObservationEnvelope {
  readonly protocolVersion: string
  readonly runId: string
  readonly seq: number
  readonly timestamp: number
  readonly type: string
  readonly payload: JsonValue
}

export interface EvidencePackageSource {
  readonly host: string
  readonly label?: string
}

export interface EvidencePackage {
  readonly protocolVersion: string
  readonly runId: string
  readonly createdAt: number
  readonly source: EvidencePackageSource
  readonly events: ReadonlyArray<ObservationEnvelope>
  readonly summary?: JsonValue
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined

const asFiniteNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

const asPositiveInt = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  const n = Math.floor(value)
  return n >= 1 ? n : undefined
}

export const exportEvidencePackage = (options: {
  readonly runId: string
  readonly source: EvidencePackageSource
  readonly events: ReadonlyArray<ObservationEnvelope>
  readonly createdAt?: number
  readonly protocolVersion?: string
  readonly summary?: JsonValue
}): EvidencePackage => {
  const protocolVersion = options.protocolVersion ?? OBSERVABILITY_PROTOCOL_VERSION
  return {
    protocolVersion,
    runId: options.runId,
    createdAt: options.createdAt ?? Date.now(),
    source: options.source,
    events: options.events.slice().sort((a, b) => a.seq - b.seq),
    summary: options.summary,
  }
}

export const importEvidencePackage = (input: unknown): EvidencePackage => {
  const fallback: EvidencePackage = {
    protocolVersion: OBSERVABILITY_PROTOCOL_VERSION,
    runId: 'unknown',
    createdAt: Date.now(),
    source: { host: 'unknown' },
    events: [],
  }

  if (!isRecord(input)) return fallback

  const protocolVersion = asNonEmptyString(input.protocolVersion) ?? fallback.protocolVersion
  const runId = asNonEmptyString(input.runId) ?? fallback.runId
  const createdAt = asFiniteNumber(input.createdAt) ?? fallback.createdAt

  const sourceRaw = input.source
  const source: EvidencePackageSource = isRecord(sourceRaw)
    ? {
        host: asNonEmptyString(sourceRaw.host) ?? 'unknown',
        label: typeof sourceRaw.label === 'string' ? sourceRaw.label : undefined,
      }
    : fallback.source

  const eventsRaw = Array.isArray(input.events) ? input.events : []
  const events: ObservationEnvelope[] = []

  for (const e of eventsRaw) {
    if (!isRecord(e)) continue

    const seq = asPositiveInt(e.seq)
    const timestamp = asFiniteNumber(e.timestamp)
    const type = asNonEmptyString(e.type)
    const payloadRaw = e.payload

    if (!seq || timestamp === undefined || !type || !isJsonValue(payloadRaw)) {
      continue
    }

    events.push({
      protocolVersion: asNonEmptyString(e.protocolVersion) ?? protocolVersion,
      runId: asNonEmptyString(e.runId) ?? runId,
      seq,
      timestamp,
      type,
      payload: payloadRaw,
    })
  }

  const summary = isJsonValue(input.summary) ? input.summary : undefined

  return {
    protocolVersion,
    runId,
    createdAt,
    source,
    events: events.sort((a, b) => a.seq - b.seq),
    summary,
  }
}
