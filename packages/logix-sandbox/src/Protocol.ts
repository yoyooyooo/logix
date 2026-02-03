import type { LogEntry, SandboxErrorInfo, TraceSpan, MockManifest, UiIntentPacket } from './Types.js'

export type SandboxProtocolVersion = 'v1'
export const SANDBOX_PROTOCOL_VERSION: SandboxProtocolVersion = 'v1'

export interface SandboxMessageBase {
  readonly protocolVersion?: SandboxProtocolVersion
}

// Commands (Host → Worker)
export interface InitCommand extends SandboxMessageBase {
  type: 'INIT'
  payload?: {
    env?: Record<string, unknown>
    wasmUrl?: string
    kernelUrl?: string
  }
}

export interface CompileCommand extends SandboxMessageBase {
  type: 'COMPILE'
  payload: {
    code: string
    filename?: string
    mockManifest?: MockManifest
  }
}

export interface RunCommand extends SandboxMessageBase {
  type: 'RUN'
  payload: {
    runId: string
    actions?: ReadonlyArray<{ _tag: string; payload?: unknown }>
    useCompiledCode?: boolean
  }
}

export interface UiCallbackCommand extends SandboxMessageBase {
  type: 'UI_CALLBACK'
  payload: {
    runId: string
    intentId: string
    callback: string
    data?: unknown
  }
}

export interface TerminateCommand extends SandboxMessageBase {
  type: 'TERMINATE'
}

export type SandboxCommand = InitCommand | CompileCommand | RunCommand | UiCallbackCommand | TerminateCommand

// Events (Worker → Host)
export interface ReadyEvent extends SandboxMessageBase {
  type: 'READY'
  payload: {
    version: string
    compilerReady: boolean
  }
}

export interface CompileResultEvent extends SandboxMessageBase {
  type: 'COMPILE_RESULT'
  payload: {
    success: boolean
    bundle?: string
    errors?: string[]
  }
}

export interface LogEvent extends SandboxMessageBase {
  type: 'LOG'
  payload: LogEntry
}

export interface TraceEvent extends SandboxMessageBase {
  type: 'TRACE'
  payload: TraceSpan
}

export interface UiIntentEvent extends SandboxMessageBase {
  type: 'UI_INTENT'
  payload: UiIntentPacket
}

export interface UiCallbackAckEvent extends SandboxMessageBase {
  type: 'UI_CALLBACK_ACK'
  payload: {
    runId: string
    intentId: string
    callback: string
    accepted: boolean
    message?: string
  }
}

export interface ErrorEvent extends SandboxMessageBase {
  type: 'ERROR'
  payload: SandboxErrorInfo
}

export interface CompleteEvent extends SandboxMessageBase {
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

export type ProtocolDecodeIssue = {
  readonly path: string
  readonly message: string
  readonly expected?: string
  readonly actual?: string
}

export type ProtocolDecodeResult<A> =
  | { readonly ok: true; readonly value: A }
  | { readonly ok: false; readonly issues: ReadonlyArray<ProtocolDecodeIssue> }

const ok = <A>(value: A): ProtocolDecodeResult<A> => ({ ok: true, value })
const err = <A = never>(issues: ReadonlyArray<ProtocolDecodeIssue>): ProtocolDecodeResult<A> => ({ ok: false, issues })

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const describe = (value: unknown): string => {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

const issue = (
  path: string,
  message: string,
  expected?: string,
  actualValue?: unknown,
): ProtocolDecodeIssue => ({
  path,
  message,
  ...(expected ? { expected } : null),
  ...(typeof actualValue !== 'undefined' ? { actual: describe(actualValue) } : null),
})

export const decodeSandboxCommand = (input: unknown): ProtocolDecodeResult<SandboxCommand> => {
  if (!isRecord(input)) {
    return err([issue('$', 'expected object', 'object', input)])
  }

  const type = input.type
  if (typeof type !== 'string') {
    return err([issue('$.type', 'expected string', 'string', type)])
  }

  const issues: Array<ProtocolDecodeIssue> = []
  const protocolVersion = (input as any).protocolVersion
  if (typeof protocolVersion !== 'undefined' && protocolVersion !== SANDBOX_PROTOCOL_VERSION) {
    issues.push(
      issue(
        '$.protocolVersion',
        typeof protocolVersion === 'string'
          ? `unsupported protocolVersion: ${protocolVersion}`
          : 'expected string',
        SANDBOX_PROTOCOL_VERSION,
        protocolVersion,
      ),
    )
  }

  switch (type) {
    case 'INIT': {
      const payload = input.payload
      if (issues.length > 0) return err(issues)
      if (typeof payload === 'undefined') return ok({ type: 'INIT', protocolVersion: SANDBOX_PROTOCOL_VERSION })
      if (!isRecord(payload)) return err([issue('$.payload', 'expected object', 'object', payload)])

      let env: Record<string, unknown> | undefined = undefined
      if (typeof payload.env !== 'undefined') {
        if (isRecord(payload.env)) env = payload.env
        else issues.push(issue('$.payload.env', 'expected object', 'object', payload.env))
      }

      let wasmUrl: string | undefined = undefined
      if (typeof payload.wasmUrl !== 'undefined') {
        if (typeof payload.wasmUrl === 'string') wasmUrl = payload.wasmUrl
        else issues.push(issue('$.payload.wasmUrl', 'expected string', 'string', payload.wasmUrl))
      }

      let kernelUrl: string | undefined = undefined
      if (typeof payload.kernelUrl !== 'undefined') {
        if (typeof payload.kernelUrl === 'string') kernelUrl = payload.kernelUrl
        else issues.push(issue('$.payload.kernelUrl', 'expected string', 'string', payload.kernelUrl))
      }

      if (issues.length > 0) return err(issues)

      return ok({
        type: 'INIT',
        protocolVersion: SANDBOX_PROTOCOL_VERSION,
        payload: {
          ...(typeof env !== 'undefined' ? { env } : {}),
          ...(typeof wasmUrl !== 'undefined' ? { wasmUrl } : {}),
          ...(typeof kernelUrl !== 'undefined' ? { kernelUrl } : {}),
        },
      })
    }

    case 'COMPILE': {
      const payload = input.payload
      if (!isRecord(payload)) return err([issue('$.payload', 'expected object', 'object', payload)])

      let code: string | undefined = undefined
      if (typeof payload.code === 'string') code = payload.code
      else issues.push(issue('$.payload.code', 'expected string', 'string', payload.code))

      let filename: string | undefined = undefined
      if (typeof payload.filename !== 'undefined') {
        if (typeof payload.filename === 'string') filename = payload.filename
        else issues.push(issue('$.payload.filename', 'expected string', 'string', payload.filename))
      }

      let mockManifest: MockManifest | undefined = undefined
      if (typeof payload.mockManifest !== 'undefined') {
        if (isRecord(payload.mockManifest)) mockManifest = payload.mockManifest as MockManifest
        else issues.push(issue('$.payload.mockManifest', 'expected object', 'object', payload.mockManifest))
      }

      if (issues.length > 0) return err(issues)

      return ok({
        type: 'COMPILE',
        protocolVersion: SANDBOX_PROTOCOL_VERSION,
        payload: {
          code: code as string,
          ...(typeof filename !== 'undefined' ? { filename } : {}),
          ...(typeof mockManifest !== 'undefined' ? { mockManifest } : {}),
        },
      })
    }

    case 'RUN': {
      const payload = input.payload
      if (!isRecord(payload)) return err([issue('$.payload', 'expected object', 'object', payload)])

      let runId: string | undefined = undefined
      if (typeof payload.runId === 'string') runId = payload.runId
      else issues.push(issue('$.payload.runId', 'expected string', 'string', payload.runId))

      let useCompiledCode: boolean | undefined = undefined
      if (typeof payload.useCompiledCode !== 'undefined') {
        if (typeof payload.useCompiledCode === 'boolean') useCompiledCode = payload.useCompiledCode
        else issues.push(issue('$.payload.useCompiledCode', 'expected boolean', 'boolean', payload.useCompiledCode))
      }

      let actions: ReadonlyArray<{ _tag: string; payload?: unknown }> | undefined = undefined
      if (typeof payload.actions !== 'undefined') {
        if (!Array.isArray(payload.actions)) {
          issues.push(issue('$.payload.actions', 'expected array', 'array', payload.actions))
        } else {
          for (let i = 0; i < payload.actions.length; i++) {
            const item = payload.actions[i]
            if (!isRecord(item)) {
              issues.push(issue(`$.payload.actions[${i}]`, 'expected object', 'object', item))
              continue
            }
            const tag = item._tag
            if (typeof tag !== 'string') {
              issues.push(issue(`$.payload.actions[${i}]._tag`, 'expected string', 'string', tag))
            }
          }
          actions = payload.actions as ReadonlyArray<{ _tag: string; payload?: unknown }>
        }
      }

      if (issues.length > 0) return err(issues)

      return ok({
        type: 'RUN',
        protocolVersion: SANDBOX_PROTOCOL_VERSION,
        payload: {
          runId: runId as string,
          ...(typeof actions !== 'undefined' ? { actions } : {}),
          ...(typeof useCompiledCode !== 'undefined' ? { useCompiledCode } : {}),
        },
      })
    }

    case 'UI_CALLBACK': {
      const payload = input.payload
      if (!isRecord(payload)) return err([issue('$.payload', 'expected object', 'object', payload)])

      let runId: string | undefined = undefined
      if (typeof payload.runId === 'string') runId = payload.runId
      else issues.push(issue('$.payload.runId', 'expected string', 'string', payload.runId))

      let intentId: string | undefined = undefined
      if (typeof payload.intentId === 'string') intentId = payload.intentId
      else issues.push(issue('$.payload.intentId', 'expected string', 'string', payload.intentId))

      let callback: string | undefined = undefined
      if (typeof payload.callback === 'string') callback = payload.callback
      else issues.push(issue('$.payload.callback', 'expected string', 'string', payload.callback))

      if (issues.length > 0) return err(issues)

      return ok({
        type: 'UI_CALLBACK',
        protocolVersion: SANDBOX_PROTOCOL_VERSION,
        payload: {
          runId: runId as string,
          intentId: intentId as string,
          callback: callback as string,
          ...(typeof payload.data !== 'undefined' ? { data: payload.data } : {}),
        },
      })
    }

    case 'TERMINATE':
      if (issues.length > 0) return err(issues)
      return ok({ type: 'TERMINATE', protocolVersion: SANDBOX_PROTOCOL_VERSION })

    default:
      if (issues.length > 0) return err(issues)
      return err([issue('$.type', `unknown command type: ${type}`)])
  }
}

const isLogLevel = (value: unknown): value is LogEntry['level'] =>
  value === 'debug' || value === 'info' || value === 'warn' || value === 'error'

const isLogSource = (value: unknown): value is Exclude<LogEntry['source'], undefined> =>
  value === 'console' || value === 'effect' || value === 'logix'

const isTraceStatus = (value: unknown): value is TraceSpan['status'] =>
  value === 'running' || value === 'success' || value === 'error' || value === 'cancelled'

const isUiIntentKind = (value: unknown): value is UiIntentPacket['intent'] =>
  value === 'mount' || value === 'update' || value === 'unmount' || value === 'action'

const isSandboxErrorCode = (value: unknown): value is SandboxErrorInfo['code'] =>
  value === 'INIT_FAILED' ||
  value === 'RUNTIME_ERROR' ||
  value === 'TIMEOUT' ||
  value === 'WORKER_TERMINATED' ||
  value === 'PROTOCOL_ERROR'

const isProtocolDirection = (
  value: unknown,
): value is NonNullable<SandboxErrorInfo['protocol']>['direction'] =>
  value === 'HostToWorker' || value === 'WorkerToHost'

export const decodeSandboxEvent = (input: unknown): ProtocolDecodeResult<SandboxEvent> => {
  if (!isRecord(input)) {
    return err([issue('$', 'expected object', 'object', input)])
  }

  const type = input.type
  if (typeof type !== 'string') {
    return err([issue('$.type', 'expected string', 'string', type)])
  }

  const issues: Array<ProtocolDecodeIssue> = []
  const protocolVersion = (input as any).protocolVersion
  if (typeof protocolVersion !== 'undefined' && protocolVersion !== SANDBOX_PROTOCOL_VERSION) {
    issues.push(
      issue(
        '$.protocolVersion',
        typeof protocolVersion === 'string'
          ? `unsupported protocolVersion: ${protocolVersion}`
          : 'expected string',
        SANDBOX_PROTOCOL_VERSION,
        protocolVersion,
      ),
    )
  }

  switch (type) {
    case 'READY': {
      const payload = input.payload
      if (!isRecord(payload)) return err([issue('$.payload', 'expected object', 'object', payload)])

      const version = payload.version
      if (typeof version !== 'string') issues.push(issue('$.payload.version', 'expected string', 'string', version))

      const compilerReady = payload.compilerReady
      if (typeof compilerReady !== 'boolean') {
        issues.push(issue('$.payload.compilerReady', 'expected boolean', 'boolean', compilerReady))
      }

      if (issues.length > 0) return err(issues)

      return ok({
        type: 'READY',
        protocolVersion: SANDBOX_PROTOCOL_VERSION,
        payload: { version: version as string, compilerReady: compilerReady as boolean },
      })
    }

    case 'COMPILE_RESULT': {
      const payload = input.payload
      if (!isRecord(payload)) return err([issue('$.payload', 'expected object', 'object', payload)])

      const success = payload.success
      if (typeof success !== 'boolean') issues.push(issue('$.payload.success', 'expected boolean', 'boolean', success))

      let bundle: string | undefined = undefined
      if (typeof payload.bundle !== 'undefined') {
        if (typeof payload.bundle === 'string') bundle = payload.bundle
        else issues.push(issue('$.payload.bundle', 'expected string', 'string', payload.bundle))
      }

      let errors: string[] | undefined = undefined
      if (typeof payload.errors !== 'undefined') {
        if (!Array.isArray(payload.errors)) {
          issues.push(issue('$.payload.errors', 'expected array', 'array', payload.errors))
        } else {
          for (let i = 0; i < payload.errors.length; i++) {
            if (typeof payload.errors[i] !== 'string') {
              issues.push(issue(`$.payload.errors[${i}]`, 'expected string', 'string', payload.errors[i]))
            }
          }
          errors = Array.from(payload.errors as ReadonlyArray<string>)
        }
      }

      if (issues.length > 0) return err(issues)

      return ok({
        type: 'COMPILE_RESULT',
        protocolVersion: SANDBOX_PROTOCOL_VERSION,
        payload: {
          success: success as boolean,
          ...(typeof bundle !== 'undefined' ? { bundle } : {}),
          ...(typeof errors !== 'undefined' ? { errors } : {}),
        },
      })
    }

    case 'LOG': {
      const payload = input.payload
      if (!isRecord(payload)) return err([issue('$.payload', 'expected object', 'object', payload)])

      const level = payload.level
      if (!isLogLevel(level)) issues.push(issue('$.payload.level', 'expected LogLevel', 'debug|info|warn|error', level))

      const args = payload.args
      if (!Array.isArray(args)) issues.push(issue('$.payload.args', 'expected array', 'array', args))

      const timestamp = payload.timestamp
      if (typeof timestamp !== 'number') issues.push(issue('$.payload.timestamp', 'expected number', 'number', timestamp))

      let source: LogEntry['source'] | undefined = undefined
      if (typeof payload.source !== 'undefined') {
        if (isLogSource(payload.source)) source = payload.source
        else issues.push(issue('$.payload.source', 'expected LogSource', 'console|effect|logix', payload.source))
      }

      if (issues.length > 0) return err(issues)

      return ok({
        type: 'LOG',
        protocolVersion: SANDBOX_PROTOCOL_VERSION,
        payload: {
          level: level as LogEntry['level'],
          args: args as ReadonlyArray<unknown>,
          timestamp: timestamp as number,
          ...(typeof source !== 'undefined' ? { source } : {}),
        },
      })
    }

    case 'TRACE': {
      const payload = input.payload
      if (!isRecord(payload)) return err([issue('$.payload', 'expected object', 'object', payload)])

      const spanId = payload.spanId
      if (typeof spanId !== 'string') issues.push(issue('$.payload.spanId', 'expected string', 'string', spanId))

      const name = payload.name
      if (typeof name !== 'string') issues.push(issue('$.payload.name', 'expected string', 'string', name))

      const startTime = payload.startTime
      if (typeof startTime !== 'number') issues.push(issue('$.payload.startTime', 'expected number', 'number', startTime))

      const status = payload.status
      if (!isTraceStatus(status)) {
        issues.push(issue('$.payload.status', 'expected TraceStatus', 'running|success|error|cancelled', status))
      }

      let parentSpanId: string | undefined = undefined
      if (typeof payload.parentSpanId !== 'undefined') {
        if (typeof payload.parentSpanId === 'string') parentSpanId = payload.parentSpanId
        else issues.push(issue('$.payload.parentSpanId', 'expected string', 'string', payload.parentSpanId))
      }

      let endTime: number | undefined = undefined
      if (typeof payload.endTime !== 'undefined') {
        if (typeof payload.endTime === 'number') endTime = payload.endTime
        else issues.push(issue('$.payload.endTime', 'expected number', 'number', payload.endTime))
      }

      let attributes: Record<string, unknown> | undefined = undefined
      if (typeof payload.attributes !== 'undefined') {
        if (isRecord(payload.attributes)) attributes = payload.attributes
        else issues.push(issue('$.payload.attributes', 'expected object', 'object', payload.attributes))
      }

      let intentId: string | undefined = undefined
      if (typeof payload.intentId !== 'undefined') {
        if (typeof payload.intentId === 'string') intentId = payload.intentId
        else issues.push(issue('$.payload.intentId', 'expected string', 'string', payload.intentId))
      }

      let stepId: string | undefined = undefined
      if (typeof payload.stepId !== 'undefined') {
        if (typeof payload.stepId === 'string') stepId = payload.stepId
        else issues.push(issue('$.payload.stepId', 'expected string', 'string', payload.stepId))
      }

      if (issues.length > 0) return err(issues)

      return ok({
        type: 'TRACE',
        protocolVersion: SANDBOX_PROTOCOL_VERSION,
        payload: {
          spanId: spanId as string,
          ...(typeof parentSpanId !== 'undefined' ? { parentSpanId } : {}),
          name: name as string,
          startTime: startTime as number,
          ...(typeof endTime !== 'undefined' ? { endTime } : {}),
          status: status as TraceSpan['status'],
          ...(typeof attributes !== 'undefined' ? { attributes } : {}),
          ...(typeof intentId !== 'undefined' ? { intentId } : {}),
          ...(typeof stepId !== 'undefined' ? { stepId } : {}),
        },
      })
    }

    case 'UI_INTENT': {
      const payload = input.payload
      if (!isRecord(payload)) return err([issue('$.payload', 'expected object', 'object', payload)])

      const id = payload.id
      if (typeof id !== 'string') issues.push(issue('$.payload.id', 'expected string', 'string', id))

      const component = payload.component
      if (typeof component !== 'string') issues.push(issue('$.payload.component', 'expected string', 'string', component))

      const intent = payload.intent
      if (!isUiIntentKind(intent)) {
        issues.push(issue('$.payload.intent', 'expected UiIntentKind', 'mount|update|unmount|action', intent))
      }

      const props = payload.props
      if (!isRecord(props)) issues.push(issue('$.payload.props', 'expected object', 'object', props))

      let callbacks: ReadonlyArray<string> | undefined = undefined
      if (!Array.isArray(payload.callbacks)) {
        issues.push(issue('$.payload.callbacks', 'expected array', 'array', payload.callbacks))
      } else {
        for (let i = 0; i < payload.callbacks.length; i++) {
          if (typeof payload.callbacks[i] !== 'string') {
            issues.push(issue(`$.payload.callbacks[${i}]`, 'expected string', 'string', payload.callbacks[i]))
          }
        }
        callbacks = payload.callbacks as ReadonlyArray<string>
      }

      let children: ReadonlyArray<UiIntentPacket> | undefined = undefined
      if (typeof payload.children !== 'undefined') {
        if (Array.isArray(payload.children)) children = payload.children as ReadonlyArray<UiIntentPacket>
        else issues.push(issue('$.payload.children', 'expected array', 'array', payload.children))
      }

      let meta: UiIntentPacket['meta'] | undefined = undefined
      if (typeof payload.meta !== 'undefined') {
        if (isRecord(payload.meta)) meta = payload.meta as any
        else issues.push(issue('$.payload.meta', 'expected object', 'object', payload.meta))
      }

      if (issues.length > 0) return err(issues)

      return ok({
        type: 'UI_INTENT',
        protocolVersion: SANDBOX_PROTOCOL_VERSION,
        payload: {
          id: id as string,
          component: component as string,
          intent: intent as UiIntentPacket['intent'],
          props: props as Record<string, unknown>,
          callbacks: callbacks as ReadonlyArray<string>,
          ...(typeof children !== 'undefined' ? { children } : {}),
          ...(typeof meta !== 'undefined' ? { meta } : {}),
        },
      })
    }

    case 'UI_CALLBACK_ACK': {
      const payload = input.payload
      if (!isRecord(payload)) return err([issue('$.payload', 'expected object', 'object', payload)])

      const runId = payload.runId
      if (typeof runId !== 'string') issues.push(issue('$.payload.runId', 'expected string', 'string', runId))

      const intentId = payload.intentId
      if (typeof intentId !== 'string') issues.push(issue('$.payload.intentId', 'expected string', 'string', intentId))

      const callback = payload.callback
      if (typeof callback !== 'string') issues.push(issue('$.payload.callback', 'expected string', 'string', callback))

      const accepted = payload.accepted
      if (typeof accepted !== 'boolean') issues.push(issue('$.payload.accepted', 'expected boolean', 'boolean', accepted))

      let message: string | undefined = undefined
      if (typeof payload.message !== 'undefined') {
        if (typeof payload.message === 'string') message = payload.message
        else issues.push(issue('$.payload.message', 'expected string', 'string', payload.message))
      }

      if (issues.length > 0) return err(issues)

      return ok({
        type: 'UI_CALLBACK_ACK',
        protocolVersion: SANDBOX_PROTOCOL_VERSION,
        payload: {
          runId: runId as string,
          intentId: intentId as string,
          callback: callback as string,
          accepted: accepted as boolean,
          ...(typeof message !== 'undefined' ? { message } : {}),
        },
      })
    }

    case 'ERROR': {
      const payload = input.payload
      if (!isRecord(payload)) return err([issue('$.payload', 'expected object', 'object', payload)])

      const code = payload.code
      if (!isSandboxErrorCode(code)) {
        issues.push(issue('$.payload.code', 'expected SandboxErrorCode', 'known SandboxErrorCode', code))
      }

      const message = payload.message
      if (typeof message !== 'string') issues.push(issue('$.payload.message', 'expected string', 'string', message))

      let stack: string | undefined = undefined
      if (typeof payload.stack !== 'undefined') {
        if (typeof payload.stack === 'string') stack = payload.stack
        else issues.push(issue('$.payload.stack', 'expected string', 'string', payload.stack))
      }

      let protocol: SandboxErrorInfo['protocol'] | undefined = undefined
      if (typeof payload.protocol !== 'undefined') {
        if (!isRecord(payload.protocol)) {
          issues.push(issue('$.payload.protocol', 'expected object', 'object', payload.protocol))
        } else {
          const direction = (payload.protocol as any).direction
          if (!isProtocolDirection(direction)) {
            issues.push(issue('$.payload.protocol.direction', 'expected ProtocolDirection', 'HostToWorker|WorkerToHost', direction))
          }

          const messageType = (payload.protocol as any).messageType
          if (typeof messageType !== 'undefined' && typeof messageType !== 'string') {
            issues.push(issue('$.payload.protocol.messageType', 'expected string', 'string', messageType))
          }

          const protocolIssues = (payload.protocol as any).issues
          if (!Array.isArray(protocolIssues)) {
            issues.push(issue('$.payload.protocol.issues', 'expected array', 'array', protocolIssues))
          } else {
            for (let i = 0; i < protocolIssues.length; i++) {
              const item = protocolIssues[i]
              if (!isRecord(item)) {
                issues.push(issue(`$.payload.protocol.issues[${i}]`, 'expected object', 'object', item))
                continue
              }
              if (typeof item.path !== 'string') {
                issues.push(issue(`$.payload.protocol.issues[${i}].path`, 'expected string', 'string', item.path))
              }
              if (typeof item.message !== 'string') {
                issues.push(issue(`$.payload.protocol.issues[${i}].message`, 'expected string', 'string', item.message))
              }
              if (typeof item.expected !== 'undefined' && typeof item.expected !== 'string') {
                issues.push(issue(`$.payload.protocol.issues[${i}].expected`, 'expected string', 'string', item.expected))
              }
              if (typeof item.actual !== 'undefined' && typeof item.actual !== 'string') {
                issues.push(issue(`$.payload.protocol.issues[${i}].actual`, 'expected string', 'string', item.actual))
              }
            }
          }

          if (issues.length === 0) {
            protocol = payload.protocol as any
          }
        }
      }

      let requestedKernelId: string | undefined = undefined
      if (typeof payload.requestedKernelId !== 'undefined') {
        if (typeof payload.requestedKernelId === 'string') requestedKernelId = payload.requestedKernelId
        else issues.push(issue('$.payload.requestedKernelId', 'expected string', 'string', payload.requestedKernelId))
      }

      let availableKernelIds: ReadonlyArray<string> | undefined = undefined
      if (typeof payload.availableKernelIds !== 'undefined') {
        if (!Array.isArray(payload.availableKernelIds)) {
          issues.push(issue('$.payload.availableKernelIds', 'expected array', 'array', payload.availableKernelIds))
        } else {
          for (let i = 0; i < payload.availableKernelIds.length; i++) {
            if (typeof payload.availableKernelIds[i] !== 'string') {
              issues.push(issue(`$.payload.availableKernelIds[${i}]`, 'expected string', 'string', payload.availableKernelIds[i]))
            }
          }
          availableKernelIds = payload.availableKernelIds as ReadonlyArray<string>
        }
      }

      let effectiveKernelId: string | undefined = undefined
      if (typeof payload.effectiveKernelId !== 'undefined') {
        if (typeof payload.effectiveKernelId === 'string') effectiveKernelId = payload.effectiveKernelId
        else issues.push(issue('$.payload.effectiveKernelId', 'expected string', 'string', payload.effectiveKernelId))
      }

      let fallbackReason: string | undefined = undefined
      if (typeof payload.fallbackReason !== 'undefined') {
        if (typeof payload.fallbackReason === 'string') fallbackReason = payload.fallbackReason
        else issues.push(issue('$.payload.fallbackReason', 'expected string', 'string', payload.fallbackReason))
      }

      if (issues.length > 0) return err(issues)

      return ok({
        type: 'ERROR',
        protocolVersion: SANDBOX_PROTOCOL_VERSION,
        payload: {
          code: code as SandboxErrorInfo['code'],
          message: message as string,
          ...(typeof stack !== 'undefined' ? { stack } : {}),
          ...(typeof protocol !== 'undefined' ? { protocol } : {}),
          ...(typeof requestedKernelId !== 'undefined' ? { requestedKernelId } : {}),
          ...(typeof availableKernelIds !== 'undefined' ? { availableKernelIds } : {}),
          ...(typeof effectiveKernelId !== 'undefined' ? { effectiveKernelId } : {}),
          ...(typeof fallbackReason !== 'undefined' ? { fallbackReason } : {}),
        },
      })
    }

    case 'COMPLETE': {
      const payload = input.payload
      if (!isRecord(payload)) return err([issue('$.payload', 'expected object', 'object', payload)])

      const runId = payload.runId
      if (typeof runId !== 'string') issues.push(issue('$.payload.runId', 'expected string', 'string', runId))

      const duration = payload.duration
      if (typeof duration !== 'number') issues.push(issue('$.payload.duration', 'expected number', 'number', duration))

      if (issues.length > 0) return err(issues)

      return ok({
        type: 'COMPLETE',
        protocolVersion: SANDBOX_PROTOCOL_VERSION,
        payload: {
          runId: runId as string,
          duration: duration as number,
          ...(typeof payload.stateSnapshot !== 'undefined' ? { stateSnapshot: payload.stateSnapshot } : {}),
        },
      })
    }

    default:
      if (issues.length > 0) return err(issues)
      return err([issue('$.type', `unknown event type: ${type}`)])
  }
}
