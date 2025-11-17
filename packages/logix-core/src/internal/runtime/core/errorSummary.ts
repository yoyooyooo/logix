import { Cause } from 'effect'

export type DowngradeReason = 'non_serializable' | 'oversized' | 'unknown'

export interface SerializableErrorSummary {
  readonly message: string
  readonly name?: string
  readonly code?: string
  readonly hint?: string
}

export interface ErrorSummaryResult {
  readonly errorSummary: SerializableErrorSummary
  readonly downgrade?: DowngradeReason
}

const truncate = (value: string, maxLen: number): { readonly value: string; readonly truncated: boolean } => {
  if (value.length <= maxLen) return { value, truncated: false }
  return { value: value.slice(0, maxLen), truncated: true }
}

const safeStringify = (value: unknown): { readonly ok: true; readonly json: string } | { readonly ok: false } => {
  try {
    return { ok: true, json: JSON.stringify(value) }
  } catch {
    return { ok: false }
  }
}

const getMessageFromUnknown = (cause: unknown): string => {
  if (typeof cause === 'string') return cause
  if (typeof cause === 'number' || typeof cause === 'boolean' || typeof cause === 'bigint') return String(cause)
  if (cause instanceof Error) return cause.message || cause.name || 'Error'
  if (cause && typeof cause === 'object' && 'message' in (cause as any) && typeof (cause as any).message === 'string') {
    return (cause as any).message as string
  }

  // Try Effect Cause pretty (best-effort). This may include more details than needed,
  // so callers MUST still treat it as an untrusted/oversized string and truncate.
  try {
    const pretty = Cause.pretty(cause as Cause.Cause<unknown>, { renderErrorCause: true })
    if (typeof pretty === 'string' && pretty.length > 0) return pretty
  } catch {
    // ignore
  }

  return 'Unknown error'
}

export const toSerializableErrorSummary = (
  cause: unknown,
  options?: {
    readonly maxMessageLength?: number
  },
): ErrorSummaryResult => {
  const maxMessageLength = options?.maxMessageLength ?? 256

  const messageRaw = getMessageFromUnknown(cause)
  const { value: message, truncated } = truncate(messageRaw, maxMessageLength)

  const summary: { message: string; name?: string; code?: string; hint?: string } = {
    message,
  }

  if (cause instanceof Error) {
    if (cause.name && cause.name !== 'Error') summary.name = cause.name
    const anyCause = cause as any
    if (typeof anyCause.code === 'string' && anyCause.code.length > 0) summary.code = anyCause.code
    else if (typeof anyCause.code === 'number' && Number.isFinite(anyCause.code)) summary.code = String(anyCause.code)
    if (typeof anyCause.hint === 'string' && anyCause.hint.length > 0) summary.hint = anyCause.hint
    return {
      errorSummary: summary,
      downgrade: truncated ? 'oversized' : undefined,
    }
  }

  if (cause && typeof cause === 'object') {
    const anyCause = cause as any
    if (typeof anyCause.name === 'string' && anyCause.name.length > 0) summary.name = anyCause.name
    if (typeof anyCause.code === 'string' && anyCause.code.length > 0) summary.code = anyCause.code
    if (typeof anyCause.hint === 'string' && anyCause.hint.length > 0) summary.hint = anyCause.hint
  }

  // If the original cause isn't JSON-serializable, mark it explicitly.
  const stringifyResult = safeStringify(cause)
  if (!stringifyResult.ok) {
    return {
      errorSummary: summary,
      downgrade: 'non_serializable',
    }
  }

  if (truncated) {
    return {
      errorSummary: summary,
      downgrade: 'oversized',
    }
  }

  if (message === 'Unknown error') {
    return {
      errorSummary: summary,
      downgrade: 'unknown',
    }
  }

  return { errorSummary: summary }
}
