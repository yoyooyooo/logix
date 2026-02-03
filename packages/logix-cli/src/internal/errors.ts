import { Cause } from 'effect'

export type SerializableErrorSummary = {
  readonly name?: string
  readonly message: string
  readonly code?: string
  readonly hint?: string
}

export type CliExitCode = 0 | 1 | 2

export const isCliViolationCode = (code: string | undefined): boolean =>
  typeof code === 'string' && (code === 'CLI_VIOLATION' || code.startsWith('CLI_VIOLATION_'))

export const isCliUsageCode = (code: string | undefined): boolean =>
  typeof code === 'string' &&
  (code === 'CLI_INVALID_ARGUMENT' ||
    code === 'CLI_INVALID_COMMAND' ||
    code === 'CLI_MISSING_RUNID' ||
    code === 'CLI_INVALID_INPUT' ||
    code === 'CLI_ENTRY_NO_EXPORT' ||
    code === 'CLI_ENTRY_IMPORT_FAILED' ||
    code === 'CLI_HOST_MISSING_BROWSER_GLOBAL' ||
    code === 'CLI_HOST_MISMATCH')

export const exitCodeFromErrorSummary = (error: SerializableErrorSummary | undefined): CliExitCode =>
  isCliViolationCode(error?.code) || isCliUsageCode(error?.code) ? 2 : 1

export class CliError extends Error {
  readonly code: string
  readonly hint?: string
  readonly cause?: unknown

  constructor(params: { readonly code: string; readonly message: string; readonly hint?: string; readonly cause?: unknown }) {
    super(params.message)
    this.name = 'CliError'
    this.code = params.code
    this.hint = params.hint
    this.cause = params.cause
  }
}

export const makeCliError = (params: {
  readonly code: string
  readonly message: string
  readonly hint?: string
  readonly cause?: unknown
}): CliError => new CliError(params)

const truncate = (value: string, maxLen: number): string => (value.length <= maxLen ? value : value.slice(0, maxLen))

const getMessageFromUnknown = (cause: unknown): string => {
  if (typeof cause === 'string') return cause
  if (typeof cause === 'number' || typeof cause === 'boolean' || typeof cause === 'bigint') return String(cause)
  if (cause instanceof CliError && typeof cause.cause !== 'undefined') {
    const inner = getMessageFromUnknown(cause.cause)
    return inner.length > 0 ? `${cause.message} | cause: ${inner}` : cause.message
  }
  if (cause instanceof Error) return cause.message || cause.name || 'Error'
  if (cause && typeof cause === 'object' && 'message' in (cause as any) && typeof (cause as any).message === 'string') {
    const msg = (cause as any).message as string
    if (msg.length > 0) return msg
  }
  if (Cause.isCause(cause)) {
    try {
      const pretty = Cause.pretty(cause, { renderErrorCause: true })
      if (typeof pretty === 'string' && pretty.length > 0) return pretty
    } catch {
      // ignore
    }
  }
  return 'Unknown error'
}

export const asSerializableErrorSummary = (cause: unknown): SerializableErrorSummary => {
  const message = truncate(getMessageFromUnknown(cause), 256)

  if (cause && typeof cause === 'object') {
    const any: any = cause as any
    return {
      ...(typeof any.name === 'string' && any.name.length > 0 ? { name: any.name } : null),
      message,
      ...(typeof any.code === 'string' && any.code.length > 0 ? { code: any.code } : null),
      ...(typeof any.hint === 'string' && any.hint.length > 0 ? { hint: any.hint } : null),
    }
  }

  return { message }
}
