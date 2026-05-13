import type { BoundedLogEntry } from './logs.js'
import {
  appendBoundedLog,
  makeLifecycleLog,
  makeOperationLog,
} from './logs.js'

export type ProgramSessionAction = { readonly _tag: string; readonly payload?: unknown }

export type ProgramSessionStatus = 'ready' | 'running' | 'failed' | 'stale'

export interface ProgramSessionOperationRoot {
  readonly projectId: string
  readonly revision: number
  readonly sessionId: string
  readonly opSeq: number
}

export interface ProgramSessionOperation {
  readonly kind: 'dispatch' | 'run'
  readonly actionTag?: string
  readonly payload?: unknown
}

export interface ProgramSessionTraceRef {
  readonly traceId: string
  readonly label: string
}

export interface ProgramSessionState {
  readonly sessionId: string
  readonly projectId: string
  readonly revision: number
  readonly status: ProgramSessionStatus
  readonly operationSeq: number
  readonly stale: boolean
  readonly staleReason?: string
  readonly state?: unknown
  readonly lastOperation?: ProgramSessionOperation
  readonly logs: ReadonlyArray<BoundedLogEntry>
  readonly traces: ReadonlyArray<ProgramSessionTraceRef>
  readonly error?: { readonly kind: string; readonly message: string }
}

export const makeProgramSessionId = (projectId: string, revision: number, seq: number): string =>
  `${projectId}:r${revision}:s${seq}`

export const createInitialProgramSession = (input: {
  readonly projectId: string
  readonly revision: number
  readonly seq: number
}): ProgramSessionState => {
  const sessionId = makeProgramSessionId(input.projectId, input.revision, input.seq)

  return {
    sessionId,
    projectId: input.projectId,
    revision: input.revision,
    status: 'ready',
    operationSeq: 0,
    stale: false,
    logs: [
      makeLifecycleLog({
        message: `session started ${sessionId}`,
        sessionId,
      }),
    ],
    traces: [],
  }
}

export const createRestartedProgramSession = (input: {
  readonly projectId: string
  readonly revision: number
  readonly seq: number
  readonly previousSessionId: string
  readonly previousRevision: number
}): ProgramSessionState => {
  const session = createInitialProgramSession({
    projectId: input.projectId,
    revision: input.revision,
    seq: input.seq,
  })

  return {
    ...session,
    logs: [
      ...session.logs,
      makeLifecycleLog({
        message: `session auto restarted from ${input.previousSessionId} after source revision r${input.revision}`,
        sessionId: session.sessionId,
      }),
    ],
    traces: [
      {
        traceId: `${session.sessionId}:restart`,
        label: `restart from r${input.previousRevision} to r${input.revision}`,
      },
    ],
  }
}

export const recordProgramSessionDispatchAccepted = (
  session: ProgramSessionState,
  input: { readonly actionTag: string },
): ProgramSessionState => {
  const operationSeq = session.operationSeq + 1

  return {
    ...session,
    status: 'running',
    logs: appendBoundedLog(session.logs, makeOperationLog({
      message: `dispatch accepted ${input.actionTag}`,
      sessionId: session.sessionId,
      operationSeq,
    })),
  }
}

export const makeProgramSessionOperationRoot = (
  session: ProgramSessionState,
  opSeq: number,
): ProgramSessionOperationRoot => ({
  projectId: session.projectId,
  revision: session.revision,
  sessionId: session.sessionId,
  opSeq,
})

export const canCommitProgramSessionOperation = (
  current: ProgramSessionState | undefined,
  root: ProgramSessionOperationRoot,
): boolean =>
  current?.projectId === root.projectId
  && current.revision === root.revision
  && current.sessionId === root.sessionId
  && current.operationSeq + 1 === root.opSeq

export const recordProgramSessionOperation = (
  session: ProgramSessionState,
  input: {
    readonly operation: ProgramSessionOperation
    readonly state: unknown
    readonly logs: ReadonlyArray<BoundedLogEntry>
    readonly traces: ReadonlyArray<ProgramSessionTraceRef>
  },
): ProgramSessionState => {
  const operationSeq = session.operationSeq + 1
  const completionLog: BoundedLogEntry = makeOperationLog({
    message: input.operation.actionTag
      ? `dispatch completed ${input.operation.actionTag}`
      : `${input.operation.kind} completed`,
    sessionId: session.sessionId,
    operationSeq,
  })

  return {
    ...session,
    status: 'ready',
    operationSeq,
    state: input.state,
    lastOperation: input.operation,
    logs: [...session.logs, ...input.logs, completionLog].slice(-100),
    traces: input.traces,
    error: undefined,
  }
}

export const recordProgramSessionFailure = (
  session: ProgramSessionState,
  input: {
    readonly operation: ProgramSessionOperation
    readonly error: { readonly kind: string; readonly message: string }
    readonly logs: ReadonlyArray<BoundedLogEntry>
  },
): ProgramSessionState => {
  const operationSeq = session.operationSeq + 1
  const failureLog: BoundedLogEntry = makeOperationLog({
    level: 'error',
    message: input.operation.actionTag
      ? `dispatch failed ${input.operation.actionTag}: ${input.error.message}`
      : `${input.operation.kind} failed: ${input.error.message}`,
    sessionId: session.sessionId,
    operationSeq,
  })

  return {
    ...session,
    status: 'failed',
    operationSeq,
    lastOperation: input.operation,
    logs: [...session.logs, ...input.logs, failureLog].slice(-100),
    error: input.error,
  }
}

export const markProgramSessionStale = (
  session: ProgramSessionState,
  input: { readonly revision: number },
): ProgramSessionState => ({
  ...session,
  stale: true,
  staleReason: `Session snapshot r${session.revision} is stale after source revision r${input.revision}.`,
  logs: appendBoundedLog(session.logs, makeOperationLog({
    level: 'warn',
    message: `session stale after source revision r${input.revision}`,
    sessionId: session.sessionId,
    operationSeq: session.operationSeq,
  })),
})
