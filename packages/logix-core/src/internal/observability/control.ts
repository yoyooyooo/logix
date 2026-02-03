export type ControlCommandType = 'clear' | 'pause' | 'resume'

export interface ControlCommand {
  readonly protocolVersion: string
  readonly commandSeq: number
  readonly type: ControlCommandType
  readonly runId?: string
}

export interface ControlAck {
  readonly protocolVersion: string
  readonly commandSeq: number
  readonly accepted: boolean
  readonly runId?: string
  readonly reason?: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined

const asPositiveInt = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  const n = Math.floor(value)
  return n >= 1 ? n : undefined
}

export const parseControlCommand = (input: unknown): ControlCommand | undefined => {
  if (!isRecord(input)) return undefined

  const protocolVersion = asNonEmptyString(input.protocolVersion)
  const commandSeq = asPositiveInt(input.commandSeq)
  const type = asNonEmptyString(input.type) as ControlCommandType | undefined
  const runId = asNonEmptyString(input.runId)

  if (!protocolVersion || !commandSeq || !type) return undefined
  if (type !== 'clear' && type !== 'pause' && type !== 'resume') return undefined

  return {
    protocolVersion,
    commandSeq,
    type,
    ...(runId ? { runId } : {}),
  }
}

export const makeControlAck = (options: {
  readonly protocolVersion: string
  readonly commandSeq: number
  readonly accepted: boolean
  readonly runId?: string
  readonly reason?: string
}): ControlAck => ({
  protocolVersion: options.protocolVersion,
  commandSeq: options.commandSeq,
  accepted: options.accepted,
  ...(options.runId ? { runId: options.runId } : {}),
  ...(options.reason ? { reason: options.reason } : {}),
})

