import { asSerializableErrorSummary } from '../errors.js'
import type { CommandVerdict } from '../protocol/resultV2.js'
import type { ReasonItem } from '../protocol/types.js'
import { gateFailureReasonCode, type VerifyGateResult } from './gates.js'
import { evaluateRetryPolicy, makeRetrySignature, type RetryPolicyDecision, type RetrySignaturePoint } from './retryPolicy.js'
import { classifyTransientError, toRetryableReasonFromTransient } from './transientClassifier.js'

export const VERIFY_REASON_CODE_PASS = 'VERIFY_PASS'

export type VerifyLoopDecision = {
  readonly verdict: CommandVerdict
  readonly reasonCode: string
  readonly reasons: ReadonlyArray<ReasonItem>
  readonly retryDecision?: RetryPolicyDecision
}

export type VerifyLoopStateInput = {
  readonly gateResults: ReadonlyArray<VerifyGateResult>
  readonly cause?: unknown
  readonly retryContext?: {
    readonly attemptSeq: number
    readonly maxAttempts: number
    readonly noProgressThreshold?: number
    readonly trajectory: ReadonlyArray<RetrySignaturePoint>
    readonly signature?: string
  }
}

const firstByStatus = (
  gateResults: ReadonlyArray<VerifyGateResult>,
  status: VerifyGateResult['status'],
): VerifyGateResult | undefined => gateResults.find((item) => item.status === status)

const allSkipped = (gateResults: ReadonlyArray<VerifyGateResult>): boolean =>
  gateResults.length > 0 && gateResults.every((result) => result.status === 'skipped')

const baseDecisionFromGateResults = (gateResults: ReadonlyArray<VerifyGateResult>): VerifyLoopDecision => {
  if (gateResults.length === 0) {
    return {
      verdict: 'NOT_IMPLEMENTED',
      reasonCode: 'CLI_NOT_IMPLEMENTED',
      reasons: [{ code: 'CLI_NOT_IMPLEMENTED', message: '未提供可执行 gate 结果' }],
    }
  }

  const failed = firstByStatus(gateResults, 'fail')
  if (failed) {
    const reasonCode = failed.reasonCode ?? gateFailureReasonCode(failed.gate)
    return {
      verdict: 'VIOLATION',
      reasonCode,
      reasons: [
        {
          code: reasonCode,
          message: `门禁失败：${failed.gate}`,
          data: { gate: failed.gate, status: failed.status },
        },
      ],
    }
  }

  const retryable = firstByStatus(gateResults, 'retryable')
  if (retryable) {
    const reasonCode = retryable.reasonCode ?? 'VERIFY_RETRYABLE'
    return {
      verdict: 'RETRYABLE',
      reasonCode,
      reasons: [
        {
          code: reasonCode,
          message: `门禁可重试：${retryable.gate}`,
          data: { gate: retryable.gate, status: retryable.status },
        },
      ],
    }
  }

  if (allSkipped(gateResults)) {
    return {
      verdict: 'NOT_IMPLEMENTED',
      reasonCode: 'CLI_NOT_IMPLEMENTED',
      reasons: [{ code: 'CLI_NOT_IMPLEMENTED', message: '当前 gate 均为 skipped，尚未实现' }],
    }
  }

  return {
    verdict: 'PASS',
    reasonCode: VERIFY_REASON_CODE_PASS,
    reasons: [{ code: VERIFY_REASON_CODE_PASS, message: '所有 gate 校验通过' }],
  }
}

const decisionFromCause = (cause: unknown): VerifyLoopDecision => {
  const transient = classifyTransientError(cause)
  if (transient.isTransient) {
    return {
      verdict: 'RETRYABLE',
      reasonCode: transient.reasonCode ?? 'VERIFY_RETRYABLE',
      reasons: [toRetryableReasonFromTransient(cause) ?? { code: 'VERIFY_RETRYABLE', message: '检测到瞬态错误，可重试' }],
    }
  }

  const summary = asSerializableErrorSummary(cause)
  return {
    verdict: 'ERROR',
    reasonCode: 'CLI_PROTOCOL_VIOLATION',
    reasons: [
      {
        code: 'CLI_PROTOCOL_VIOLATION',
        message: summary.message,
        ...(summary.code || summary.name
          ? {
              data: {
                ...(summary.code ? { sourceCode: summary.code } : null),
                ...(summary.name ? { sourceName: summary.name } : null),
              },
            }
          : null),
      },
    ],
  }
}

export const deriveVerdictFromGateResults = (gateResults: ReadonlyArray<VerifyGateResult>): CommandVerdict =>
  baseDecisionFromGateResults(gateResults).verdict

export const evaluateVerifyLoopState = (input: VerifyLoopStateInput): VerifyLoopDecision => {
  const initialDecision = typeof input.cause === 'undefined' ? baseDecisionFromGateResults(input.gateResults) : decisionFromCause(input.cause)

  if (initialDecision.verdict !== 'RETRYABLE' || !input.retryContext) {
    return initialDecision
  }

  const currentSignature =
    input.retryContext.signature ??
    makeRetrySignature({
      verdict: initialDecision.verdict,
      reasonCode: initialDecision.reasonCode,
      gateResults: input.gateResults,
    })

  const retryDecision = evaluateRetryPolicy({
    attemptSeq: input.retryContext.attemptSeq,
    maxAttempts: input.retryContext.maxAttempts,
    currentSignature,
    trajectory: input.retryContext.trajectory,
    noProgressThreshold: input.retryContext.noProgressThreshold,
  })

  if (retryDecision.shouldRetry) {
    return {
      ...initialDecision,
      retryDecision,
    }
  }

  return {
    verdict: 'NO_PROGRESS',
    reasonCode: retryDecision.reasonCode,
    reasons: [
      {
        code: 'VERIFY_NO_PROGRESS',
        message:
          retryDecision.stopReason === 'max_attempts_exhausted'
            ? '重试预算耗尽，停止自动重试'
            : '连续重试未取得进展，停止自动重试',
        data: {
          attemptsRemaining: retryDecision.attemptsRemaining,
          noProgressStreak: retryDecision.noProgressStreak,
          stopReason: retryDecision.stopReason ?? 'no_progress',
        },
      },
    ],
    retryDecision,
  }
}

