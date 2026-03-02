import { makeCliError } from '../errors.js'
import type { CommandVerdict } from '../protocol/resultV2.js'
import type { VerifyGateResult } from './gates.js'

export const DEFAULT_NO_PROGRESS_THRESHOLD = 3

export type RetrySignaturePoint = {
  readonly attemptSeq: number
  readonly signature: string
}

export type RetryPolicyDecision = {
  readonly shouldRetry: boolean
  readonly verdict: 'RETRYABLE' | 'NO_PROGRESS'
  readonly reasonCode: 'VERIFY_RETRYABLE' | 'VERIFY_NO_PROGRESS'
  readonly attemptsRemaining: number
  readonly noProgressStreak: number
  readonly stopReason?: 'max_attempts_exhausted' | 'no_progress'
}

export type RetryPolicyInput = {
  readonly attemptSeq: number
  readonly maxAttempts: number
  readonly currentSignature: string
  readonly trajectory: ReadonlyArray<RetrySignaturePoint>
  readonly noProgressThreshold?: number
}

const assertPositiveInteger = (label: string, value: number): void => {
  if (Number.isInteger(value) && value > 0) return
  throw makeCliError({
    code: 'CLI_INVALID_ARGUMENT',
    message: `[Logix][CLI] ${label} 必须是正整数（当前=${String(value)}）`,
  })
}

const countTrailingStreak = (items: ReadonlyArray<string>, current: string): number => {
  let streak = 0
  for (let idx = items.length - 1; idx >= 0; idx -= 1) {
    if (items[idx] !== current) break
    streak += 1
  }
  return streak
}

export const makeRetrySignature = (args: {
  readonly verdict: CommandVerdict
  readonly reasonCode: string
  readonly gateResults?: ReadonlyArray<VerifyGateResult>
}): string => {
  const gatePart =
    args.gateResults && args.gateResults.length > 0
      ? args.gateResults
          .filter((result) => result.status !== 'pass')
          .map((result) => `${result.gate}:${result.status}`)
          .sort()
          .join('|')
      : ''
  return `${args.verdict}::${args.reasonCode}::${gatePart}`
}

export const evaluateRetryPolicy = (input: RetryPolicyInput): RetryPolicyDecision => {
  assertPositiveInteger('maxAttempts', input.maxAttempts)
  assertPositiveInteger('attemptSeq', input.attemptSeq)
  const threshold = input.noProgressThreshold ?? DEFAULT_NO_PROGRESS_THRESHOLD
  assertPositiveInteger('noProgressThreshold', threshold)

  const history = Array.from(input.trajectory)
    .sort((a, b) => a.attemptSeq - b.attemptSeq)
    .map((item) => item.signature)

  if (history.length === 0 || history[history.length - 1] !== input.currentSignature) {
    history.push(input.currentSignature)
  }

  const noProgressStreak = countTrailingStreak(history, input.currentSignature)
  const attemptsRemaining = Math.max(0, input.maxAttempts - input.attemptSeq)
  const budgetExhausted = attemptsRemaining <= 0
  const noProgress = noProgressStreak >= threshold

  if (budgetExhausted || noProgress) {
    return {
      shouldRetry: false,
      verdict: 'NO_PROGRESS',
      reasonCode: 'VERIFY_NO_PROGRESS',
      attemptsRemaining,
      noProgressStreak,
      stopReason: budgetExhausted ? 'max_attempts_exhausted' : 'no_progress',
    }
  }

  return {
    shouldRetry: true,
    verdict: 'RETRYABLE',
    reasonCode: 'VERIFY_RETRYABLE',
    attemptsRemaining,
    noProgressStreak,
  }
}

