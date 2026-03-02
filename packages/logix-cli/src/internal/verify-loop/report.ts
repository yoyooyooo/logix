import { makeCliError } from '../errors.js'
import { exitCodeFromVerdict, type CommandVerdict } from '../protocol/resultV2.js'
import type { ReasonTrajectoryPoint } from '../protocol/trajectory.js'
import { CANONICAL_NEXT_ACTION, type NextAction, type ReasonItem } from '../protocol/types.js'
import type { JsonValue } from '../result.js'
import { normalizeGateResults, type VerifyGateResult, type VerifyGateScope } from './gates.js'
import { VERIFY_REASON_CODE_PASS } from './stateMachine.js'

export type VerifyLoopMode = 'run' | 'resume'

export type VerifyLoopArtifact = {
  readonly name: string
  readonly path: string
}

export type VerifyLoopReportV1 = {
  readonly schemaVersion: 1
  readonly kind: 'VerifyLoopReport'
  readonly runId: string
  readonly instanceId: string
  readonly mode: VerifyLoopMode
  readonly gateScope: VerifyGateScope
  readonly previousRunId?: string
  readonly txnSeq: number
  readonly opSeq: number
  readonly attemptSeq: number
  readonly verdict: CommandVerdict
  readonly exitCode: 0 | 1 | 2 | 3 | 4 | 5
  readonly gateResults: ReadonlyArray<VerifyGateResult & { readonly command: string; readonly exitCode: number }>
  readonly reasonCode: string
  readonly reasons: ReadonlyArray<ReasonItem>
  readonly trajectory: ReadonlyArray<ReasonTrajectoryPoint>
  readonly nextActions: ReadonlyArray<NextAction>
  readonly artifacts: ReadonlyArray<VerifyLoopArtifact>
  readonly ext?: Readonly<Record<string, JsonValue>>
}

const TOKEN_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const assertNonEmpty = (label: string, value: string): string => {
  const normalized = value.trim()
  if (normalized.length > 0) return normalized
  throw makeCliError({
    code: 'CLI_INVALID_ARGUMENT',
    message: `[Logix][CLI] ${label} 不能为空`,
  })
}

const assertPositiveInteger = (label: string, value: number): void => {
  if (Number.isInteger(value) && value >= 1) return
  throw makeCliError({
    code: 'CLI_INVALID_ARGUMENT',
    message: `[Logix][CLI] ${label} 必须 >= 1`,
  })
}

const assertToken = (label: string, value: string): string => {
  const token = assertNonEmpty(label, value)
  if (TOKEN_RE.test(token)) return token
  throw makeCliError({
    code: 'CLI_INVALID_ARGUMENT',
    message: `[Logix][CLI] ${label} 非法：${token}`,
  })
}

const defaultReasonCodeByVerdict = (verdict: CommandVerdict): string => {
  switch (verdict) {
    case 'PASS':
      return VERIFY_REASON_CODE_PASS
    case 'ERROR':
      return 'CLI_PROTOCOL_VIOLATION'
    case 'VIOLATION':
      return 'CLI_PROTOCOL_VIOLATION'
    case 'RETRYABLE':
      return 'VERIFY_RETRYABLE'
    case 'NOT_IMPLEMENTED':
      return 'CLI_NOT_IMPLEMENTED'
    case 'NO_PROGRESS':
      return 'VERIFY_NO_PROGRESS'
  }
}

const defaultReasonMessageByVerdict = (verdict: CommandVerdict): string => {
  switch (verdict) {
    case 'PASS':
      return '所有 gate 已通过'
    case 'ERROR':
      return 'verify-loop 执行异常'
    case 'VIOLATION':
      return '门禁出现违规项'
    case 'RETRYABLE':
      return '检测到可重试故障'
    case 'NOT_IMPLEMENTED':
      return '门禁链未实现'
    case 'NO_PROGRESS':
      return '连续重试无进展'
  }
}

const normalizeReasons = (args: {
  readonly reasonCode: string
  readonly verdict: CommandVerdict
  readonly reasons: ReadonlyArray<ReasonItem> | undefined
}): ReadonlyArray<ReasonItem> => {
  if (!args.reasons || args.reasons.length === 0) {
    return [
      {
        code: args.reasonCode,
        message: defaultReasonMessageByVerdict(args.verdict),
      },
    ]
  }

  return args.reasons.map((reason) => ({
    code: assertNonEmpty('reasons[].code', reason.code),
    message: assertNonEmpty('reasons[].message', reason.message),
    ...(reason.data ? { data: reason.data } : null),
  }))
}

const defaultNextActions = (verdict: CommandVerdict, reasonCode: string, target: string | undefined): ReadonlyArray<NextAction> => {
  const rerunTarget = typeof target === 'string' ? target.trim() : ''
  const assertDefaultRerunTarget = (): string => {
    if (rerunTarget.length > 0) return rerunTarget
    throw makeCliError({
      code: 'CLI_PROTOCOL_VIOLATION',
      message: '[Logix][CLI] default nextActions 生成失败：缺少 rerun args.target',
    })
  }

  switch (verdict) {
    case 'PASS':
      return []
    case 'VIOLATION':
      return [
        {
          id: 'resume-after-violation',
          action: CANONICAL_NEXT_ACTION.RERUN,
          args: {
            mode: 'resume',
            target: assertDefaultRerunTarget(),
            resumePolicy: 'after-violation',
          },
          ifReasonCodes: [reasonCode],
        },
      ]
    case 'RETRYABLE':
      return [
        {
          id: 'resume-after-retryable',
          action: CANONICAL_NEXT_ACTION.RERUN,
          args: {
            mode: 'resume',
            target: assertDefaultRerunTarget(),
            resumePolicy: 'after-retryable',
          },
          ifReasonCodes: [reasonCode],
        },
      ]
    case 'NO_PROGRESS':
      return [
        {
          id: 'diagnose-no-progress',
          action: CANONICAL_NEXT_ACTION.INSPECT,
          args: { mode: 'manual', recommend: 'inspect-and-decide' },
          ifReasonCodes: [reasonCode],
        },
      ]
    case 'NOT_IMPLEMENTED':
      return [
        {
          id: 'implement-missing-gates',
          action: CANONICAL_NEXT_ACTION.STOP,
          args: { mode: 'manual', reason: 'implement-missing-gates', gateScope: 'runtime' },
          ifReasonCodes: [reasonCode],
        },
      ]
    case 'ERROR':
      return [
        {
          id: 'inspect-runtime-error',
          action: CANONICAL_NEXT_ACTION.INSPECT,
          args: { mode: 'inspect', recommend: 'manual-rerun' },
          ifReasonCodes: [reasonCode],
        },
      ]
  }
}

const isObjectRecord = (value: unknown): value is Readonly<Record<string, JsonValue>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const ALLOWED_VERIFY_LOOP_ACTIONS = new Set<string>([
  CANONICAL_NEXT_ACTION.RUN_COMMAND,
  CANONICAL_NEXT_ACTION.RERUN,
  CANONICAL_NEXT_ACTION.INSPECT,
  CANONICAL_NEXT_ACTION.STOP,
])

const normalizeNextActions = (nextActions: ReadonlyArray<NextAction>): ReadonlyArray<NextAction> => {
  const seen = new Set<string>()
  const out: NextAction[] = []

  for (const action of nextActions) {
    const id = assertToken('nextActions[].id', action.id)
    if (seen.has(id)) {
      throw makeCliError({
        code: 'CLI_PROTOCOL_VIOLATION',
        message: `[Logix][CLI] nextActions 存在重复 id：${id}`,
      })
    }
    seen.add(id)

    const actionName = assertNonEmpty('nextActions[].action', action.action)
    if (!ALLOWED_VERIFY_LOOP_ACTIONS.has(actionName)) {
      throw makeCliError({
        code: 'CLI_PROTOCOL_VIOLATION',
        message: `[Logix][CLI] nextActions[].action 非法：${actionName}`,
      })
    }
    const args = isObjectRecord(action.args) ? action.args : {}
    const ifReasonCodes =
      action.ifReasonCodes && action.ifReasonCodes.length > 0
        ? Array.from(new Set(action.ifReasonCodes.map((code) => assertNonEmpty('nextActions[].ifReasonCodes[]', code)))).sort()
        : undefined

    out.push({
      id,
      action: actionName,
      args,
      ...(ifReasonCodes ? { ifReasonCodes } : null),
    })
  }

  out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return out
}

const normalizeArtifacts = (artifacts: ReadonlyArray<VerifyLoopArtifact>): ReadonlyArray<VerifyLoopArtifact> =>
  Array.from(artifacts)
    .map((artifact) => ({
      name: assertNonEmpty('artifacts[].name', artifact.name),
      path: assertNonEmpty('artifacts[].path', artifact.path),
    }))
    .sort((a, b) => {
      if (a.name < b.name) return -1
      if (a.name > b.name) return 1
      return a.path < b.path ? -1 : a.path > b.path ? 1 : 0
    })

const normalizeTrajectory = (trajectory: ReadonlyArray<ReasonTrajectoryPoint>): ReadonlyArray<ReasonTrajectoryPoint> => {
  const normalized = Array.from(trajectory).map((point, index) => ({
    attemptSeq: (() => {
      assertPositiveInteger(`trajectory[${index}].attemptSeq`, point.attemptSeq)
      return point.attemptSeq
    })(),
    reasonCode: assertNonEmpty(`trajectory[${index}].reasonCode`, point.reasonCode),
  }))

  if (normalized.length === 0) {
    throw makeCliError({
      code: 'CLI_PROTOCOL_VIOLATION',
      message: '[Logix][CLI] trajectory 不能为空',
    })
  }

  return normalized
}

export const makeVerifyLoopReport = (args: {
  readonly runId: string
  readonly instanceId: string
  readonly mode: VerifyLoopMode
  readonly gateScope: VerifyGateScope
  readonly previousRunId?: string
  readonly txnSeq: number
  readonly opSeq: number
  readonly attemptSeq: number
  readonly verdict: CommandVerdict
  readonly gateResults: ReadonlyArray<{
    readonly gate: string
    readonly status: string
    readonly durationMs: number
    readonly reasonCode?: string
    readonly command?: string
    readonly exitCode?: number
  }>
  readonly reasonCode?: string
  readonly reasons?: ReadonlyArray<ReasonItem>
  readonly trajectory: ReadonlyArray<ReasonTrajectoryPoint>
  readonly nextActions?: ReadonlyArray<NextAction>
  readonly target?: string
  readonly artifacts?: ReadonlyArray<VerifyLoopArtifact>
  readonly ext?: Readonly<Record<string, JsonValue>>
}): VerifyLoopReportV1 => {
  const runId = assertNonEmpty('runId', args.runId)
  const instanceId = assertToken('instanceId', args.instanceId)
  const mode = args.mode
  if (mode !== 'run' && mode !== 'resume') {
    throw makeCliError({
      code: 'CLI_INVALID_ARGUMENT',
      message: `[Logix][CLI] mode 非法：${String(mode)}`,
    })
  }
  if (mode === 'resume') {
    assertNonEmpty('previousRunId', args.previousRunId ?? '')
  }
  assertPositiveInteger('txnSeq', args.txnSeq)
  assertPositiveInteger('opSeq', args.opSeq)
  assertPositiveInteger('attemptSeq', args.attemptSeq)

  const gateResults: ReadonlyArray<VerifyGateResult & { readonly command: string; readonly exitCode: number }> = normalizeGateResults({
    scope: args.gateScope,
    gateResults: args.gateResults,
  }).map((item, index) => {
    const command = assertNonEmpty(`gateResults[${index}].command`, item.command ?? '')
    const exitCode = typeof item.exitCode === 'number' ? item.exitCode : undefined
    if (typeof exitCode !== 'number' || !Number.isInteger(exitCode) || exitCode < 0) {
      throw makeCliError({
        code: 'CLI_PROTOCOL_VIOLATION',
        message: `[Logix][CLI] gateResults[${index}].exitCode 必须是 >= 0 的整数`,
      })
    }
    return {
      ...item,
      command,
      exitCode,
    }
  })
  if (gateResults.length === 0) {
    throw makeCliError({
      code: 'CLI_INVALID_ARGUMENT',
      message: '[Logix][CLI] gateResults 不能为空',
    })
  }

  const autoReasonCode = (() => {
    if (args.verdict === 'VIOLATION') {
      const failed = gateResults.find((result) => result.status === 'fail')
      if (failed?.reasonCode) return failed.reasonCode
    }
    if (args.verdict === 'RETRYABLE') {
      const retryable = gateResults.find((result) => result.status === 'retryable')
      if (retryable?.reasonCode) return retryable.reasonCode
    }
    return defaultReasonCodeByVerdict(args.verdict)
  })()

  const reasonCode = assertNonEmpty('reasonCode', args.reasonCode ?? autoReasonCode)
  const reasons = normalizeReasons({
    reasonCode,
    verdict: args.verdict,
    reasons: args.reasons,
  })
  const trajectory = normalizeTrajectory(args.trajectory)
  if (mode === 'resume' && trajectory.length < 2) {
    throw makeCliError({
      code: 'CLI_PROTOCOL_VIOLATION',
      message: '[Logix][CLI] resume 模式 trajectory 必须包含至少两轮',
    })
  }
  const tail = trajectory[trajectory.length - 1]
  if (tail.attemptSeq !== args.attemptSeq || tail.reasonCode !== reasonCode) {
    throw makeCliError({
      code: 'CLI_PROTOCOL_VIOLATION',
      message: '[Logix][CLI] trajectory 终点必须与 report identity/reason 对齐',
    })
  }
  const nextActions = normalizeNextActions(args.nextActions ?? defaultNextActions(args.verdict, reasonCode, args.target))
  const artifacts = normalizeArtifacts(args.artifacts ?? [])

  return {
    schemaVersion: 1,
    kind: 'VerifyLoopReport',
    runId,
    instanceId,
    mode,
    gateScope: args.gateScope,
    ...(mode === 'resume' ? { previousRunId: assertNonEmpty('previousRunId', args.previousRunId ?? '') } : null),
    txnSeq: args.txnSeq,
    opSeq: args.opSeq,
    attemptSeq: args.attemptSeq,
    verdict: args.verdict,
    exitCode: exitCodeFromVerdict(args.verdict),
    gateResults,
    reasonCode,
    reasons,
    trajectory,
    nextActions,
    artifacts,
    ...(args.ext ? { ext: args.ext } : null),
  }
}
