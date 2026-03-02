import fs from 'node:fs'

import type { JsonValue } from '../result.js'
import type { ControlEvent, CommandResultV2 } from './types.js'

export type ControlEventsArtifact = {
  readonly schemaVersion: 1
  readonly kind: 'ControlEvents'
  readonly events: ReadonlyArray<ControlEvent>
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

const toPayloadRecord = (value: unknown): Readonly<Record<string, JsonValue>> | undefined => {
  if (!isRecord(value)) return undefined
  return value as Readonly<Record<string, JsonValue>>
}

const readArtifactPayload = (artifact: { readonly inline?: unknown; readonly file?: string }): unknown => {
  if (typeof artifact.inline !== 'undefined') return artifact.inline
  if (!artifact.file || artifact.file.length === 0) return undefined
  try {
    const raw = fs.readFileSync(artifact.file, 'utf8')
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

const extractControlEvents = (result: CommandResultV2): ReadonlyArray<ControlEvent> => {
  const artifact = result.artifacts.find((item) => item.outputKey === 'controlEvents')
  if (!artifact) return []
  const payload = readArtifactPayload(artifact)
  if (!isRecord(payload) || !Array.isArray(payload.events)) return []

  const events: ControlEvent[] = []
  for (const entry of payload.events) {
    if (!isRecord(entry)) continue
    if (entry.kind !== 'ControlEvent') continue
    if (typeof entry.event !== 'string') continue
    if (!isRecord(entry.refs)) continue
    const runId = typeof entry.refs.runId === 'string' ? entry.refs.runId : undefined
    const instanceId = typeof entry.refs.instanceId === 'string' ? entry.refs.instanceId : undefined
    const txnSeq = Number.isInteger(entry.refs.txnSeq) ? (entry.refs.txnSeq as number) : undefined
    const opSeq = Number.isInteger(entry.refs.opSeq) ? (entry.refs.opSeq as number) : undefined
    const attemptSeq = Number.isInteger(entry.refs.attemptSeq) ? (entry.refs.attemptSeq as number) : undefined
    if (!runId || !instanceId || !txnSeq || !opSeq || !attemptSeq) continue
    const payloadRecord = toPayloadRecord(entry.payload)
    events.push({
      schemaVersion: 1,
      kind: 'ControlEvent',
      event: entry.event as ControlEvent['event'],
      refs: {
        runId,
        instanceId,
        txnSeq,
        opSeq,
        attemptSeq,
      },
      ...(payloadRecord ? { payload: payloadRecord } : null),
    })
  }

  return events
}

const hasControlEventsArtifact = (result: CommandResultV2): boolean =>
  result.artifacts.some((item) => item.outputKey === 'controlEvents')

const extractExecutePayloads = (events: ReadonlyArray<ControlEvent>): ReadonlyArray<Readonly<Record<string, JsonValue>>> => {
  const payloads: Readonly<Record<string, JsonValue>>[] = []
  for (const event of events) {
    if (event.event !== 'execute.completed') continue
    payloads.push(
      event.payload ?? {
        command: 'unknown',
        reasonCode: 'CLI_PROTOCOL_VIOLATION',
        ok: false,
      },
    )
  }
  return payloads
}

const buildCanonicalEvents = (args: {
  readonly result: CommandResultV2
  readonly executePayloads: ReadonlyArray<Readonly<Record<string, JsonValue>>>
}): ReadonlyArray<ControlEvent> => {
  const fixedPayload = {
    command: args.result.command,
    reasonCode: args.result.reasonCode,
    ok: args.result.ok,
  } as const

  const executePayloads = args.executePayloads.length > 0 ? args.executePayloads : [fixedPayload]
  const staged = [
    { event: 'parse.completed' as const, payload: fixedPayload },
    { event: 'normalize.completed' as const, payload: fixedPayload },
    { event: 'validate.completed' as const, payload: fixedPayload },
    ...executePayloads.map((payload) => ({ event: 'execute.completed' as const, payload })),
    { event: 'emit.completed' as const, payload: fixedPayload },
  ] as const

  return staged.map(
    (entry, index): ControlEvent => ({
      schemaVersion: 1,
      kind: 'ControlEvent',
      event: entry.event,
      refs: {
        runId: args.result.runId,
        instanceId: args.result.instanceId,
        txnSeq: args.result.txnSeq,
        opSeq: args.result.opSeq + index,
        attemptSeq: args.result.attemptSeq,
      },
      payload: entry.payload,
    }),
  )
}

const makeControlEventsArtifact = (args: {
  readonly result: CommandResultV2
  readonly executePayloads: ReadonlyArray<Readonly<Record<string, JsonValue>>>
}) => ({
  outputKey: 'controlEvents',
  kind: 'ControlEvents',
  schemaVersion: 1,
  ok: true,
  inline: {
    schemaVersion: 1,
    kind: 'ControlEvents',
    events: buildCanonicalEvents({
      result: args.result,
      executePayloads: args.executePayloads,
    }),
  } as ControlEventsArtifact,
  reasonCodes: [args.result.reasonCode],
})

export const withControlEventsArtifact = (result: CommandResultV2): CommandResultV2 => {
  if (hasControlEventsArtifact(result)) {
    const existingEvents = extractControlEvents(result)
    if (existingEvents.length === 0) return result
    const executePayloads = extractExecutePayloads(existingEvents)
    const mergedArtifact = makeControlEventsArtifact({
      result,
      executePayloads,
    })
    return {
      ...result,
      artifacts: [
        ...result.artifacts.filter((artifact) => artifact.outputKey !== 'controlEvents'),
        mergedArtifact,
      ],
    }
  }

  const existingEvents = extractControlEvents(result)
  const executePayloads = extractExecutePayloads(existingEvents)
  const mergedArtifact = makeControlEventsArtifact({
    result,
    executePayloads,
  })

  return {
    ...result,
    artifacts: [
      ...result.artifacts.filter((artifact) => artifact.outputKey !== 'controlEvents'),
      mergedArtifact,
    ],
  }
}
