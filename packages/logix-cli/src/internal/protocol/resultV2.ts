import type { ArtifactOutput } from '../result.js'
import type { CommandResultV2, NextAction, ReasonItem, ReasonLevel } from './types.js'
import { assertRegisteredReasonCode } from './reasonCatalog.js'

export type CommandVerdict = 'PASS' | 'ERROR' | 'VIOLATION' | 'RETRYABLE' | 'NOT_IMPLEMENTED' | 'NO_PROGRESS'

const EXIT_CODE_BY_VERDICT: Record<CommandVerdict, 0 | 1 | 2 | 3 | 4 | 5> = {
  PASS: 0,
  ERROR: 1,
  VIOLATION: 2,
  RETRYABLE: 3,
  NOT_IMPLEMENTED: 4,
  NO_PROGRESS: 5,
}

const REASON_LEVEL_BY_VERDICT: Record<CommandVerdict, ReasonLevel> = {
  PASS: 'info',
  ERROR: 'error',
  VIOLATION: 'error',
  RETRYABLE: 'warn',
  NOT_IMPLEMENTED: 'warn',
  NO_PROGRESS: 'warn',
}

export const exitCodeFromVerdict = (verdict: CommandVerdict): 0 | 1 | 2 | 3 | 4 | 5 => EXIT_CODE_BY_VERDICT[verdict]

export const makeCommandResultV2 = (input: {
  readonly runId: string
  readonly instanceId: string
  readonly txnSeq: number
  readonly opSeq: number
  readonly attemptSeq: number
  readonly command: string
  readonly verdict: CommandVerdict
  readonly reasonCode: string
  readonly reasons: ReadonlyArray<ReasonItem>
  readonly artifacts: ReadonlyArray<ArtifactOutput>
  readonly nextActions?: ReadonlyArray<NextAction>
  readonly trajectory?: ReadonlyArray<{ readonly attemptSeq: number; readonly reasonCode: string }>
}): CommandResultV2 => {
  const reasonCode = assertRegisteredReasonCode(input.reasonCode)
  const reasons = input.reasons.map((reason) => ({
    ...reason,
    code: assertRegisteredReasonCode(reason.code),
  }))
  return {
    schemaVersion: 2,
    kind: 'CommandResult',
    runId: input.runId,
    instanceId: input.instanceId,
    txnSeq: input.txnSeq,
    opSeq: input.opSeq,
    attemptSeq: input.attemptSeq,
    command: input.command,
    ok: input.verdict === 'PASS',
    exitCode: exitCodeFromVerdict(input.verdict),
    reasonCode,
    reasonLevel: REASON_LEVEL_BY_VERDICT[input.verdict],
    reasons,
    artifacts: input.artifacts,
    nextActions: input.nextActions ?? [],
    trajectory: input.trajectory ?? [{ attemptSeq: input.attemptSeq, reasonCode }],
  }
}
