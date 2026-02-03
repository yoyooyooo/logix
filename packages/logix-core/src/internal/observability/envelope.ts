import { isJsonValue, type JsonValue } from './jsonValue.js'

export interface ObservationEnvelope {
  readonly protocolVersion: string
  readonly runId: string
  readonly seq: number
  readonly timestamp: number
  readonly type: string
  readonly payload: JsonValue
}

export interface ObservationEnvelopeDefaults {
  readonly protocolVersion?: string
  readonly runId?: string
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

export const parseObservationEnvelope = (
  input: unknown,
  defaults?: ObservationEnvelopeDefaults,
): ObservationEnvelope | undefined => {
  if (!isRecord(input)) return undefined

  const protocolVersion = asNonEmptyString(input.protocolVersion) ?? defaults?.protocolVersion
  const runId = asNonEmptyString(input.runId) ?? defaults?.runId
  const seq = asPositiveInt(input.seq)
  const timestamp = asFiniteNumber(input.timestamp)
  const type = asNonEmptyString(input.type)
  const payloadRaw = input.payload

  if (!protocolVersion || !runId || !seq || timestamp === undefined || !type || !isJsonValue(payloadRaw)) return undefined

  return {
    protocolVersion,
    runId,
    seq,
    timestamp,
    type,
    payload: payloadRaw,
  }
}

export const sortObservationEnvelopes = (events: ReadonlyArray<ObservationEnvelope>): ObservationEnvelope[] =>
  events.slice().sort((a, b) => a.seq - b.seq)

