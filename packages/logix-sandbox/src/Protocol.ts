import type { LogEntry, SandboxErrorInfo, TraceSpan, MockManifest, UiIntentPacket } from './Types.js'

// Commands (Host → Worker)
export interface InitCommand {
  type: 'INIT'
  payload?: {
    env?: Record<string, unknown>
    wasmUrl?: string
    kernelUrl?: string
  }
}

export interface CompileCommand {
  type: 'COMPILE'
  payload: {
    code: string
    filename?: string
    mockManifest?: MockManifest
  }
}

export interface RunCommand {
  type: 'RUN'
  payload: {
    runId: string
    actions?: ReadonlyArray<{ _tag: string; payload?: unknown }>
    useCompiledCode?: boolean
  }
}

export interface UiCallbackCommand {
  type: 'UI_CALLBACK'
  payload: {
    runId: string
    intentId: string
    callback: string
    data?: unknown
  }
}

export interface TerminateCommand {
  type: 'TERMINATE'
}

export type SandboxCommand = InitCommand | CompileCommand | RunCommand | UiCallbackCommand | TerminateCommand

// Events (Worker → Host)
export interface ReadyEvent {
  type: 'READY'
  payload: {
    version: string
    compilerReady: boolean
  }
}

export interface CompileResultEvent {
  type: 'COMPILE_RESULT'
  payload: {
    success: boolean
    bundle?: string
    errors?: string[]
  }
}

export interface LogEvent {
  type: 'LOG'
  payload: LogEntry
}

export interface TraceEvent {
  type: 'TRACE'
  payload: TraceSpan
}

export interface UiIntentEvent {
  type: 'UI_INTENT'
  payload: UiIntentPacket
}

export interface UiCallbackAckEvent {
  type: 'UI_CALLBACK_ACK'
  payload: {
    runId: string
    intentId: string
    callback: string
    accepted: boolean
    message?: string
  }
}

export interface ErrorEvent {
  type: 'ERROR'
  payload: SandboxErrorInfo
}

export interface CompleteEvent {
  type: 'COMPLETE'
  payload: {
    runId: string
    duration: number
    stateSnapshot?: unknown
  }
}

export type SandboxEvent =
  | ReadyEvent
  | CompileResultEvent
  | LogEvent
  | TraceEvent
  | UiIntentEvent
  | UiCallbackAckEvent
  | ErrorEvent
  | CompleteEvent

// Type Guards
export const isReadyEvent = (e: SandboxEvent): e is ReadyEvent => e.type === 'READY'
export const isCompileResultEvent = (e: SandboxEvent): e is CompileResultEvent => e.type === 'COMPILE_RESULT'
export const isLogEvent = (e: SandboxEvent): e is LogEvent => e.type === 'LOG'
export const isTraceEvent = (e: SandboxEvent): e is TraceEvent => e.type === 'TRACE'
export const isUiIntentEvent = (e: SandboxEvent): e is UiIntentEvent => e.type === 'UI_INTENT'
export const isUiCallbackAckEvent = (e: SandboxEvent): e is UiCallbackAckEvent => e.type === 'UI_CALLBACK_ACK'
export const isErrorEvent = (e: SandboxEvent): e is ErrorEvent => e.type === 'ERROR'
export const isCompleteEvent = (e: SandboxEvent): e is CompleteEvent => e.type === 'COMPLETE'
