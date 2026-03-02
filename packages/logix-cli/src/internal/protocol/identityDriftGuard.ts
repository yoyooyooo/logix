import { makeCliError } from '../errors.js'
import {
  extractAttemptSeqSuffix,
  makeInstanceIdFromRun,
  parseAttemptSeqFromRunId,
  type IdentityCounters,
} from './identity.js'

export type VerifyLoopIdentityMode = 'run' | 'resume'

export type ResolveVerifyLoopIdentityInput = {
  readonly mode: VerifyLoopIdentityMode
  readonly runId: string
  readonly previousRunId?: string
  readonly providedInstanceId?: string
}

export type ResolveVerifyLoopIdentityOutput = {
  readonly identity: IdentityCounters
  readonly previousAttemptSeq?: number
}

const assertNonEmptyToken = (label: string, value: string): string => {
  const normalized = value.trim()
  if (normalized.length > 0) return normalized
  throw makeCliError({
    code: 'CLI_PROTOCOL_VIOLATION',
    message: `[Logix][CLI] verify-loop ${label} 不能为空`,
  })
}

const assertInstanceIdDrift = (args: {
  readonly expectedInstanceId: string
  readonly providedInstanceId?: string
}): void => {
  const provided = typeof args.providedInstanceId === 'string' ? args.providedInstanceId.trim() : ''
  if (provided.length === 0) return
  if (provided === args.expectedInstanceId) return
  throw makeCliError({
    code: 'CLI_PROTOCOL_VIOLATION',
    message: `[Logix][CLI] verify-loop identity 漂移：expected=${args.expectedInstanceId}, actual=${provided}`,
  })
}

const assertRunIdIdentityDrift = (args: {
  readonly expectedInstanceId: string
  readonly runId: string
}): void => {
  const currentRunInstanceId = makeInstanceIdFromRun(args.runId)
  if (currentRunInstanceId === args.expectedInstanceId) return
  throw makeCliError({
    code: 'CLI_PROTOCOL_VIOLATION',
    message: `[Logix][CLI] verify-loop resume runId identity 漂移：expected=${args.expectedInstanceId}, actual=${currentRunInstanceId}`,
  })
}

const resolveRunAttemptSeq = (runId: string): number => {
  const hintedAttemptSeq = extractAttemptSeqSuffix(runId)
  return typeof hintedAttemptSeq === 'number' ? hintedAttemptSeq : 1
}

const resolveResumeAttemptSeq = (args: {
  readonly runId: string
  readonly previousRunId: string
}): {
  readonly previousAttemptSeq: number
  readonly currentAttemptSeq: number
} => {
  if (args.runId === args.previousRunId) {
    throw makeCliError({
      code: 'CLI_PROTOCOL_VIOLATION',
      message: '[Logix][CLI] verify-loop resume 必须使用新的 runId，禁止复用 previousRunId',
    })
  }

  const previousAttemptSeq = parseAttemptSeqFromRunId(args.previousRunId)
  const expectedAttemptSeq = previousAttemptSeq + 1
  const hintedAttemptSeq = extractAttemptSeqSuffix(args.runId)

  if (typeof hintedAttemptSeq === 'number' && hintedAttemptSeq !== expectedAttemptSeq) {
    throw makeCliError({
      code: 'CLI_PROTOCOL_VIOLATION',
      message: `[Logix][CLI] verify-loop resume attemptSeq 连续性失败：expected=${expectedAttemptSeq}, actual=${hintedAttemptSeq}`,
    })
  }

  return {
    previousAttemptSeq,
    currentAttemptSeq: expectedAttemptSeq,
  }
}

export const resolveVerifyLoopIdentity = (input: ResolveVerifyLoopIdentityInput): ResolveVerifyLoopIdentityOutput => {
  const runId = assertNonEmptyToken('runId', input.runId)

  if (input.mode === 'run') {
    const instanceId = makeInstanceIdFromRun(runId)
    assertInstanceIdDrift({
      expectedInstanceId: instanceId,
      providedInstanceId: input.providedInstanceId,
    })
    const attemptSeq = resolveRunAttemptSeq(runId)
    return {
      identity: {
        instanceId,
        txnSeq: attemptSeq,
        opSeq: attemptSeq,
        attemptSeq,
      },
    }
  }

  const previousRunId = assertNonEmptyToken('previousRunId', input.previousRunId ?? '')
  const instanceId = makeInstanceIdFromRun(previousRunId)
  assertInstanceIdDrift({
    expectedInstanceId: instanceId,
    providedInstanceId: input.providedInstanceId,
  })
  assertRunIdIdentityDrift({
    expectedInstanceId: instanceId,
    runId,
  })

  const { previousAttemptSeq, currentAttemptSeq } = resolveResumeAttemptSeq({
    runId,
    previousRunId,
  })

  return {
    previousAttemptSeq,
    identity: {
      instanceId,
      txnSeq: currentAttemptSeq,
      opSeq: currentAttemptSeq,
      attemptSeq: currentAttemptSeq,
    },
  }
}
