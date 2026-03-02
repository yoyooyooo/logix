import type { JsonValue, ArtifactOutput } from '../result.js'

export type ControlCommand = {
  readonly schemaVersion: 1
  readonly kind: 'ControlCommand'
  readonly runId: string
  readonly instanceId: string
  readonly command: string
  readonly input: Readonly<Record<string, JsonValue>>
}

export type ControlEvent = {
  readonly schemaVersion: 1
  readonly kind: 'ControlEvent'
  readonly event:
    | 'parse.started'
    | 'parse.completed'
    | 'normalize.completed'
    | 'validate.completed'
    | 'execute.completed'
    | 'emit.completed'
  readonly refs: {
    readonly runId: string
    readonly instanceId: string
    readonly txnSeq: number
    readonly opSeq: number
    readonly attemptSeq: number
  }
  readonly payload?: Readonly<Record<string, JsonValue>>
}

export type ControlState = {
  readonly schemaVersion: 1
  readonly kind: 'ControlState'
  readonly status: 'queued' | 'running' | 'pass' | 'violation' | 'error' | 'cancelled'
  readonly counters: {
    readonly nextTxnSeq: number
    readonly nextOpSeq: number
    readonly retries: number
  }
}

export type ReasonLevel = 'error' | 'warn' | 'info'

export type ReasonItem = {
  readonly code: string
  readonly message: string
  readonly data?: Readonly<Record<string, JsonValue>>
}

export const CANONICAL_NEXT_ACTION = {
  RUN_COMMAND: 'run-command',
  RERUN: 'rerun',
  INSPECT: 'inspect',
  STOP: 'stop',
  COMMAND_RUN: 'command.run',
  COMMAND_INSPECT_MIGRATION: 'command.inspect-migration',
  COMMAND_FIX_AND_RERUN: 'command.fix-and-rerun',
  COMMAND_RETRY: 'command.retry',
  COMMAND_INSPECT_NO_PROGRESS: 'command.inspect-no-progress',
  COMMAND_IMPLEMENT: 'command.implement',
  COMMAND_INSPECT_ERROR: 'command.inspect-error',
  PREFLIGHT_FIX_AND_RERUN: 'preflight.fix-and-rerun',
} as const

export type CanonicalNextAction = (typeof CANONICAL_NEXT_ACTION)[keyof typeof CANONICAL_NEXT_ACTION]

export type NextAction = {
  readonly id: string
  readonly action: string
  readonly args?: Readonly<Record<string, JsonValue>>
  readonly ifReasonCodes?: ReadonlyArray<string>
}

export type CommandResultV2 = {
  readonly schemaVersion: 2
  readonly kind: 'CommandResult'
  readonly runId: string
  readonly instanceId: string
  readonly txnSeq: number
  readonly opSeq: number
  readonly attemptSeq: number
  readonly command: string
  readonly ok: boolean
  readonly exitCode: 0 | 1 | 2 | 3 | 4 | 5
  readonly reasonCode: string
  readonly reasonLevel: ReasonLevel
  readonly reasons: ReadonlyArray<ReasonItem>
  readonly artifacts: ReadonlyArray<ArtifactOutput>
  readonly nextActions: ReadonlyArray<NextAction>
  readonly trajectory: ReadonlyArray<{
    readonly attemptSeq: number
    readonly reasonCode: string
  }>
  readonly ext?: Readonly<Record<string, JsonValue>>
}
