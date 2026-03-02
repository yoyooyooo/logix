import { asSerializableErrorSummary } from '../errors.js'
import type { ReasonItem } from '../protocol/types.js'

export type TransientClassification = {
  readonly isTransient: boolean
  readonly reasonCode?: 'VERIFY_RETRYABLE'
  readonly signal?: string
  readonly source?: 'code' | 'message'
}

const TRANSIENT_CODE_EXACT = new Set<string>(['EAGAIN', 'EOF', 'ETIMEDOUT', 'EPIPE', 'ECONNRESET'])

const TRANSIENT_MESSAGE_PATTERNS: ReadonlyArray<RegExp> = [
  /\bsocket hang up\b/i,
  /\bconnection reset by peer\b/i,
  /\btemporar(?:y|ily) unavailable\b/i,
  /\bnetwork .*tim(?:e)?d out\b/i,
  /\bunexpected eof\b/i,
  /\bbroken pipe\b/i,
]

const normalizeCode = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const code = value.trim().toUpperCase()
  return code.length > 0 ? code : undefined
}

const isTransientCode = (code: string): boolean => {
  if (TRANSIENT_CODE_EXACT.has(code)) return true
  return code.startsWith('ECONN')
}

const collectCandidateCodes = (cause: unknown): ReadonlyArray<string> => {
  const out = new Set<string>()

  const push = (value: unknown): void => {
    const normalized = normalizeCode(value)
    if (normalized) out.add(normalized)
  }

  if (cause && typeof cause === 'object') {
    const anyCause = cause as Record<string, unknown>
    push(anyCause.code)
    push(anyCause.errno)

    const nested = anyCause.cause
    if (nested && typeof nested === 'object') {
      const nestedAny = nested as Record<string, unknown>
      push(nestedAny.code)
      push(nestedAny.errno)
    }
  }

  const summary = asSerializableErrorSummary(cause)
  push(summary.code)

  return Array.from(out)
}

export const classifyTransientError = (cause: unknown): TransientClassification => {
  for (const code of collectCandidateCodes(cause)) {
    if (isTransientCode(code)) {
      return {
        isTransient: true,
        reasonCode: 'VERIFY_RETRYABLE',
        signal: code,
        source: 'code',
      }
    }
  }

  const summary = asSerializableErrorSummary(cause)
  for (const pattern of TRANSIENT_MESSAGE_PATTERNS) {
    if (pattern.test(summary.message)) {
      return {
        isTransient: true,
        reasonCode: 'VERIFY_RETRYABLE',
        signal: pattern.source,
        source: 'message',
      }
    }
  }

  return { isTransient: false }
}

export const isTransientError = (cause: unknown): boolean => classifyTransientError(cause).isTransient

export const toRetryableReasonFromTransient = (cause: unknown): ReasonItem | undefined => {
  const classification = classifyTransientError(cause)
  if (!classification.isTransient) return undefined
  return {
    code: 'VERIFY_RETRYABLE',
    message: '检测到瞬态错误，可安全重试',
    ...(classification.signal
      ? {
          data: {
            signal: classification.signal,
            source: classification.source ?? 'code',
          },
        }
      : null),
  }
}

