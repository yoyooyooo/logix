export type PlaygroundLogSource = 'preview' | 'runner' | 'compile' | 'session'

export interface BoundedLogEntry {
  readonly level: 'debug' | 'info' | 'warn' | 'error'
  readonly message: string
  readonly source: PlaygroundLogSource
  readonly sessionId?: string
  readonly operationSeq?: number
}

export const makeLifecycleLog = (input: {
  readonly message: string
  readonly sessionId: string
  readonly level?: BoundedLogEntry['level']
  readonly operationSeq?: number
}): BoundedLogEntry => ({
  level: input.level ?? 'info',
  message: input.message,
  source: 'session',
  sessionId: input.sessionId,
  operationSeq: input.operationSeq ?? 0,
})

export const makeOperationLog = (input: {
  readonly message: string
  readonly sessionId: string
  readonly operationSeq: number
  readonly level?: BoundedLogEntry['level']
}): BoundedLogEntry => ({
  level: input.level ?? 'info',
  message: input.message,
  source: 'session',
  sessionId: input.sessionId,
  operationSeq: input.operationSeq,
})

export const makeRunnerErrorLog = (input: {
  readonly message: string
  readonly sessionId: string
  readonly operationSeq: number
}): BoundedLogEntry => ({
  level: 'error',
  message: input.message,
  source: 'runner',
  sessionId: input.sessionId,
  operationSeq: input.operationSeq,
})

export const appendBoundedLog = (
  logs: ReadonlyArray<BoundedLogEntry>,
  entry: BoundedLogEntry,
  maxEntries = 100,
): ReadonlyArray<BoundedLogEntry> => [...logs, entry].slice(-maxEntries)
