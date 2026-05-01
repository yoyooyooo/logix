import {
  createOperationAcceptedEvent,
  createOperationCompletedEvent,
} from '@logixjs/core/repo-internal/reflection-api'
import type { ProjectSnapshot } from '../snapshot/projectSnapshot.js'
import type { BoundedLogEntry } from '../session/logs.js'
import type { ProgramSessionTraceRef } from '../session/programSession.js'
import { createProgramSessionWrapperSource } from './programSessionWrapper.js'
import type { InternalSandboxTransport } from './sandboxRunner.js'

export interface ProgramSessionRunnerFailure {
  readonly kind: 'compile' | 'runtime' | 'worker' | 'serialization' | 'timeout'
  readonly message: string
}

export interface ProgramSessionDispatchInput {
  readonly snapshot: ProjectSnapshot
  readonly sessionId: string
  readonly actions: ReadonlyArray<{ readonly _tag: string; readonly payload?: unknown }>
  readonly operationSeq: number
}

export interface ProgramSessionDispatchResult {
  readonly state: unknown
  readonly logs: ReadonlyArray<BoundedLogEntry>
  readonly traces: ReadonlyArray<ProgramSessionTraceRef>
}

export interface ProgramSessionRunner {
  readonly dispatch: (input: ProgramSessionDispatchInput) => Promise<ProgramSessionDispatchResult>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const normalizeStateSnapshot = (value: unknown): { readonly state: unknown; readonly logs: ReadonlyArray<BoundedLogEntry> } => {
  if (!isRecord(value)) return { state: value, logs: [] }
  const logs = Array.isArray(value.logs) ? (value.logs as ReadonlyArray<BoundedLogEntry>) : []
  return 'state' in value ? { state: value.state, logs } : { state: value, logs }
}

const makeCurrentOperationDispatchLog = (
  input: ProgramSessionDispatchInput,
): BoundedLogEntry | undefined => {
  const action = input.actions[input.actions.length - 1]
  if (!action) return undefined

  return {
    level: 'info',
    message: `dispatch ${action._tag}`,
    source: 'runner',
    sessionId: input.sessionId,
    operationSeq: input.operationSeq,
  }
}

const normalizeCurrentOperationLogs = (
  input: ProgramSessionDispatchInput,
  logs: ReadonlyArray<BoundedLogEntry>,
): ReadonlyArray<BoundedLogEntry> => {
  const currentAction = input.actions[input.actions.length - 1]
  if (!currentAction) return logs

  const replayDispatchMessages = new Set(input.actions.map((action) => `dispatch ${action._tag}`))
  const nonSyntheticLogs = logs.filter((log) =>
    !(log.source === 'runner' && replayDispatchMessages.has(log.message)),
  )
  const currentDispatchLog = makeCurrentOperationDispatchLog(input)
  return currentDispatchLog ? [currentDispatchLog, ...nonSyntheticLogs] : nonSyntheticLogs
}

const currentActionTag = (input: ProgramSessionDispatchInput): string | undefined =>
  input.actions[input.actions.length - 1]?._tag

const currentOperationTraces = (input: ProgramSessionDispatchInput): ReadonlyArray<ProgramSessionTraceRef> => {
  const actionTag = currentActionTag(input)
  const base = {
    instanceId: input.sessionId,
    txnSeq: 0,
    opSeq: input.operationSeq,
    operationKind: 'dispatch' as const,
    ...(actionTag ? { actionTag } : {}),
  }

  return [
    createOperationAcceptedEvent(base),
    createOperationCompletedEvent(base),
  ].map((event) => ({
    traceId: event.eventId,
    label: `${event.name}${event.actionTag ? ` dispatch ${event.actionTag}` : ''}`,
  }))
}

const toFailure = (
  kind: ProgramSessionRunnerFailure['kind'],
  error: unknown,
): ProgramSessionRunnerFailure => ({
  kind,
  message: error instanceof Error ? error.message : String(error),
})

export const createProgramSessionRunner = (options: { readonly transport: InternalSandboxTransport }): ProgramSessionRunner => ({
  dispatch: async (input: ProgramSessionDispatchInput): Promise<ProgramSessionDispatchResult> => {
    const code = createProgramSessionWrapperSource(input)

    await options.transport.init()
    const compiled = await options.transport.compile(code, input.snapshot.programEntry?.entry)
    if (!compiled.success) {
      throw toFailure('compile', new Error(compiled.errors?.join('\n') ?? 'compile failed'))
      }

      try {
        const result = await options.transport.run({
          runId: `${input.sessionId}:op${input.operationSeq}`,
        })
      const snapshot = normalizeStateSnapshot(result.stateSnapshot)
      const logs = normalizeCurrentOperationLogs(input, [
        ...snapshot.logs,
        ...((result.logs ?? []) as ReadonlyArray<BoundedLogEntry>),
      ])
      return {
        state: snapshot.state,
        logs,
        traces: currentOperationTraces(input),
      }
    } catch (error) {
      throw toFailure('runtime', error)
    }
  },
})
