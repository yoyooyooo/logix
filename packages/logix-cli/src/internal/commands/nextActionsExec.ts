import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { Effect } from 'effect'

import { makeArtifactOutput } from '../artifacts.js'
import type { CliInvocation, VerifyLoopExecutor, VerifyLoopGateScope, VerifyLoopMode } from '../args.js'
import { asSerializableErrorSummary, makeCliError } from '../errors.js'
import { assertNextActionsExecutionV1Schema } from '../protocol/schemaValidation.js'
import { makeCommandResult, type CommandResult, type JsonValue } from '../result.js'
import { sha256DigestOfJson } from '../stableJson.js'
import { runVerifyLoop } from './verifyLoop.js'

type NextActionsExecInvocation = Extract<CliInvocation, { readonly command: 'next-actions.exec' }>

type NextActionRecord = {
  readonly id: string
  readonly action: string
  readonly args?: Readonly<Record<string, JsonValue>>
  readonly ifReasonCodes?: ReadonlyArray<string>
}

type VerifyLoopReportRecord = {
  readonly runId?: string
  readonly instanceId?: string
  readonly txnSeq?: number
  readonly opSeq?: number
  readonly attemptSeq?: number
  readonly reasonCode: string
  readonly gateScope: VerifyLoopGateScope
  readonly nextActions: ReadonlyArray<NextActionRecord>
}

type ExecutionStatus = 'executed' | 'failed' | 'no-op'

type ActionExecutionResult = {
  readonly id: string
  readonly action: string
  readonly status: ExecutionStatus
  readonly reason?: string
  readonly command?: string
  readonly exitCode?: number
  readonly rerun?: {
    readonly runId: string
    readonly exitCode: number
  }
}

type NextActionsExecutionReport = {
  readonly schemaVersion: 1
  readonly kind: 'NextActionsExecution'
  readonly runId: string
  readonly instanceId: string
  readonly txnSeq: number
  readonly opSeq: number
  readonly attemptSeq: number
  readonly sourceReportPath: string
  readonly sourceReportDigest: string
  readonly reportPath: string
  readonly sourceReasonCode: string
  readonly engine: 'bootstrap'
  readonly strict: boolean
  readonly policy: {
    readonly onFailure: 'continue' | 'fail-fast'
    readonly onUnsupportedAction: 'continue' | 'fail-fast'
    readonly onMissingRequiredArgs: 'continue' | 'fail-fast'
  }
  readonly summary: {
    readonly executed: number
    readonly failed: number
    readonly noOp: number
  }
  readonly results: ReadonlyArray<ActionExecutionResult>
}

type ActionDispatchResult = {
  readonly result: ActionExecutionResult
  readonly failFast: boolean
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

const asActionArgs = (value: unknown): Readonly<Record<string, JsonValue>> | undefined => {
  if (!isRecord(value)) return undefined
  return value as Readonly<Record<string, JsonValue>>
}

const NEXT_ACTION_ALLOWED_KEYS = new Set<string>(['id', 'action', 'args', 'ifReasonCodes'])
const TOKEN_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const throwInvalidNextActionInput = (path: string, message: string): never => {
  throw makeCliError({
    code: 'CLI_INVALID_INPUT',
    message: `[Logix][CLI] next-actions exec ${path} ${message}`,
  })
}

const parsePositiveIntegerFromUnknown = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined

const parseNonEmptyStringFromUnknown = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined

const ensureRecordInput = (value: unknown, path: string): Record<string, unknown> => {
  if (!isRecord(value)) {
    throwInvalidNextActionInput(path, '必须是对象')
  }
  return value as Record<string, unknown>
}

const parseStringArrayInput = (value: unknown, path: string): ReadonlyArray<string> => {
  if (!Array.isArray(value)) {
    throwInvalidNextActionInput(path, '必须是字符串数组')
  }
  const arrayValue = value as ReadonlyArray<unknown>
  const normalizedValues: string[] = []
  for (let codeIndex = 0; codeIndex < arrayValue.length; codeIndex++) {
    const code = arrayValue[codeIndex]
    if (typeof code === 'string') {
      const normalized = code.trim()
      if (normalized.length === 0) {
        throwInvalidNextActionInput(`${path}[${codeIndex}]`, '必须是非空字符串')
      }
      normalizedValues.push(normalized)
      continue
    }
    throwInvalidNextActionInput(`${path}[${codeIndex}]`, '必须是非空字符串')
  }
  return normalizedValues
}

const parseNextActions = (raw: unknown, rootPath: string): ReadonlyArray<NextActionRecord> => {
  if (typeof raw === 'undefined') return []
  if (!Array.isArray(raw)) {
    throwInvalidNextActionInput(rootPath, '必须是数组')
  }

  const rawNextActions = raw as ReadonlyArray<unknown>
  const nextActions: NextActionRecord[] = []
  for (let index = 0; index < rawNextActions.length; index++) {
    const item = ensureRecordInput(rawNextActions[index], `${rootPath}[${index}]`)
    const itemPath = `${rootPath}[${index}]`

    for (const key of Object.keys(item)) {
      if (!NEXT_ACTION_ALLOWED_KEYS.has(key)) {
        throwInvalidNextActionInput(`${itemPath}.${key}`, '是未知字段')
      }
    }

    const id = typeof item.id === 'string' ? item.id.trim() : ''
    const action = typeof item.action === 'string' ? item.action.trim() : ''
    if (id.length === 0) {
      throwInvalidNextActionInput(`${itemPath}.id`, '必须是非空字符串')
    }
    if (!TOKEN_RE.test(id)) {
      throwInvalidNextActionInput(`${itemPath}.id`, `必须匹配 ${TOKEN_RE.source}`)
    }
    if (action.length === 0) {
      throwInvalidNextActionInput(`${itemPath}.action`, '必须是非空字符串')
    }
    if (!TOKEN_RE.test(action)) {
      throwInvalidNextActionInput(`${itemPath}.action`, `必须匹配 ${TOKEN_RE.source}`)
    }

    if (Object.prototype.hasOwnProperty.call(item, 'args') && !isRecord(item.args)) {
      throwInvalidNextActionInput(`${itemPath}.args`, '必须是对象')
    }

    let ifReasonCodes: ReadonlyArray<string> | undefined
    if (Object.prototype.hasOwnProperty.call(item, 'ifReasonCodes')) {
      const normalized = parseStringArrayInput(item.ifReasonCodes, `${itemPath}.ifReasonCodes`)
      ifReasonCodes = Array.from(new Set(normalized)).sort()
    }

    const actionArgs = asActionArgs(item.args)
    nextActions.push({
      id,
      action,
      ...(actionArgs ? { args: actionArgs } : {}),
      ...(ifReasonCodes ? { ifReasonCodes } : {}),
    })
  }
  return nextActions
}

const parseReport = (value: unknown): VerifyLoopReportRecord => {
  if (Array.isArray(value)) {
    return {
      runId: undefined,
      instanceId: undefined,
      txnSeq: undefined,
      opSeq: undefined,
      attemptSeq: undefined,
      reasonCode: 'NEXT_ACTIONS_DSL',
      gateScope: 'runtime',
      nextActions: parseNextActions(value, 'nextActions'),
    }
  }

  if (!isRecord(value)) {
    throw makeCliError({
      code: 'CLI_INVALID_INPUT',
      message: '[Logix][CLI] next-actions exec 输入报告必须是对象',
    })
  }

  const reasonCode = typeof value.reasonCode === 'string' && value.reasonCode.trim().length > 0 ? value.reasonCode.trim() : 'NEXT_ACTIONS_DSL'

  const gateScope = value.gateScope === 'governance' ? 'governance' : 'runtime'
  const nextActions = Object.prototype.hasOwnProperty.call(value, 'nextActions')
    ? parseNextActions(value.nextActions, 'nextActions')
    : parseNextActions(value.actions, 'actions')

  return {
    runId: parseNonEmptyStringFromUnknown(value.runId),
    instanceId: parseNonEmptyStringFromUnknown(value.instanceId),
    txnSeq: parsePositiveIntegerFromUnknown(value.txnSeq),
    opSeq: parsePositiveIntegerFromUnknown(value.opSeq),
    attemptSeq: parsePositiveIntegerFromUnknown(value.attemptSeq),
    reasonCode,
    gateScope,
    nextActions,
  }
}

const shouldSkipByReasonCode = (action: NextActionRecord, reasonCode: string): boolean =>
  reasonCode !== 'NEXT_ACTIONS_DSL' &&
  Array.isArray(action.ifReasonCodes) &&
  action.ifReasonCodes.length > 0 &&
  !action.ifReasonCodes.includes(reasonCode)

const parseMode = (value: JsonValue | undefined): VerifyLoopMode => (value === 'resume' ? 'resume' : 'run')

const parseGateScope = (value: JsonValue | undefined, fallback: VerifyLoopGateScope): VerifyLoopGateScope =>
  value === 'governance' ? 'governance' : value === 'runtime' ? 'runtime' : fallback

const parseExecutor = (value: JsonValue | undefined): VerifyLoopExecutor | undefined => {
  if (value === 'real' || value === 'fixture') return value
  return undefined
}

const parsePositiveInteger = (value: JsonValue | undefined): number | undefined =>
  typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined

const parseNonNegativeInteger = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined

const parseNonEmptyString = (value: JsonValue | undefined): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined

const parseBoolean = (value: JsonValue | undefined): boolean | undefined => (typeof value === 'boolean' ? value : undefined)

const failurePolicy = (strict: boolean): 'continue' | 'fail-fast' => (strict ? 'fail-fast' : 'continue')

const ATTEMPT_SUFFIX_RE = /-attempt-(\d+)$/u

const buildResumeRunId = (previousRunId: string): string => {
  const normalized = previousRunId.trim()
  const matched = normalized.match(ATTEMPT_SUFFIX_RE)
  if (!matched) return `${normalized}-attempt-2`
  const currentAttempt = Number.parseInt(matched[1] ?? '1', 10)
  const nextAttempt = Number.isInteger(currentAttempt) && currentAttempt >= 1 ? currentAttempt + 1 : 2
  return `${normalized.slice(0, normalized.length - matched[0].length)}-attempt-${nextAttempt}`
}

const executeRunCommandAction = (action: NextActionRecord, strict: boolean): ActionDispatchResult => {
  const args = action.args ?? {}
  const command = parseNonEmptyString(args.command)
  if (!command) {
    return {
      result: {
        id: action.id,
        action: action.action,
        status: 'failed',
        reason: 'missing args.command',
      },
      failFast: strict,
    }
  }

  const commandArgs = Array.isArray(args.argv)
    ? args.argv.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : []

  const cwd = parseNonEmptyString(args.cwd)

  const run =
    commandArgs.length > 0
      ? spawnSync(command, commandArgs, {
          cwd,
          env: process.env,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      : spawnSync(command, {
          cwd,
          env: process.env,
          encoding: 'utf8',
          shell: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        })

  if (run.error) {
    return {
      result: {
        id: action.id,
        action: action.action,
        status: 'failed',
        reason: run.error.message,
        command: commandArgs.length > 0 ? `${command} ${commandArgs.join(' ')}`.trim() : command,
        exitCode: 1,
      },
      failFast: strict,
    }
  }

  const exitCode = typeof run.status === 'number' ? run.status : 1
  return {
    result: {
      id: action.id,
      action: action.action,
      status: exitCode === 0 ? 'executed' : 'failed',
      ...(exitCode === 0 ? null : { reason: `command exited with ${exitCode}` }),
      command: commandArgs.length > 0 ? `${command} ${commandArgs.join(' ')}`.trim() : command,
      exitCode,
    },
    failFast: exitCode !== 0 && strict,
  }
}

const executeRerunVerifyLoopAction = (
  inv: NextActionsExecInvocation,
  action: NextActionRecord,
  sourceReasonCode: string,
  sourceGateScope: VerifyLoopGateScope,
): Effect.Effect<ActionDispatchResult, never> =>
  Effect.gen(function* () {
    const args = action.args ?? {}
    const target = parseNonEmptyString(args.target)

    if (!target) {
      return {
        result: {
          id: action.id,
          action: action.action,
          status: 'failed',
          reason: 'missing args.target for rerun-verify-loop',
        },
        failFast: inv.strict,
      }
    }

    const mode = parseMode(args.mode)
    const gateScope = parseGateScope(args.gateScope, sourceGateScope)
    const maxAttempts = parsePositiveInteger(args.maxAttempts)
    const instanceId = parseNonEmptyString(args.instanceId)
    const previousRunId = parseNonEmptyString(args.previousRunId)
    const previousReasonCode = parseNonEmptyString(args.previousReasonCode) ?? sourceReasonCode
    const runId =
      parseNonEmptyString(args.runId) ??
      (mode === 'resume' && previousRunId ? buildResumeRunId(previousRunId) : `${inv.global.runId}-${action.id}`)
    const executor = parseExecutor(args.executor)
    const emitNextActions = parseBoolean(args.emitNextActions) ?? false

    if (mode === 'resume' && (!instanceId || !previousRunId)) {
      return {
        result: {
          id: action.id,
          action: action.action,
          status: 'failed',
          reason: 'resume mode requires args.instanceId and args.previousRunId',
        },
        failFast: inv.strict,
      }
    }

    const rerunResult = yield* runVerifyLoop({
      kind: 'command',
      command: 'verify-loop',
      global: {
        runId,
        ...(inv.global.outDir ? { outDir: path.join(inv.global.outDir, `next-actions-${action.id}`) } : null),
        ...(inv.global.budgetBytes ? { budgetBytes: inv.global.budgetBytes } : null),
        ...(inv.global.mode ? { mode: inv.global.mode } : null),
        ...(inv.global.tsconfig ? { tsconfig: inv.global.tsconfig } : null),
        host: inv.global.host,
      },
      mode,
      gateScope,
      target,
      ...(executor ? { executor } : null),
      emitNextActions,
      ...(typeof maxAttempts === 'number' ? { maxAttempts } : null),
      ...(instanceId ? { instanceId } : null),
      ...(previousRunId ? { previousRunId } : null),
      ...(previousReasonCode ? { previousReasonCode } : null),
    })

    const rerunExitCode = parseNonNegativeInteger(rerunResult.exitCode)
    if (typeof rerunExitCode !== 'number') {
      return {
        result: {
          id: action.id,
          action: action.action,
          status: 'failed',
          reason: 'rerun verify-loop returned invalid exitCode',
        },
        failFast: true,
      }
    }

    return {
      result: {
        id: action.id,
        action: action.action,
        status: 'executed',
        ...(rerunResult.ok ? null : { reason: `rerun verify-loop exited with ${rerunExitCode}` }),
        exitCode: rerunExitCode,
        rerun: {
          runId,
          exitCode: rerunExitCode,
        },
      },
      failFast: false,
    }
  })

const executeAction = (
  inv: NextActionsExecInvocation,
  action: NextActionRecord,
  sourceReasonCode: string,
  sourceGateScope: VerifyLoopGateScope,
): Effect.Effect<ActionDispatchResult, never> =>
  Effect.gen(function* () {
    if (shouldSkipByReasonCode(action, sourceReasonCode)) {
      return {
        result: {
          id: action.id,
          action: action.action,
          status: 'no-op',
          reason: `ifReasonCodes not matched: ${sourceReasonCode}`,
        },
        failFast: false,
      }
    }

    if (action.action === 'run-command') {
      return executeRunCommandAction(action, inv.strict)
    }

    if (action.action === 'rerun-verify-loop' || action.action === 'rerun') {
      return yield* executeRerunVerifyLoopAction(inv, action, sourceReasonCode, sourceGateScope)
    }

    if (action.action === 'inspect') {
      return {
        result: {
          id: action.id,
          action: action.action,
          status: 'executed',
          reason: 'inspect action acknowledged',
        },
        failFast: false,
      }
    }

    if (action.action === 'stop') {
      return {
        result: {
          id: action.id,
          action: action.action,
          status: 'executed',
          reason: 'stop action requested chain halt',
        },
        failFast: true,
      }
    }

    return {
      result: {
        id: action.id,
        action: action.action,
        status: 'failed',
        reason: `unsupported action '${action.action}'`,
      },
      failFast: inv.strict,
    }
  })

export const runNextActionsExec = (inv: NextActionsExecInvocation): Effect.Effect<CommandResult, never> => {
  const runId = inv.global.runId

  return Effect.gen(function* () {
    const sourceReportPath = path.resolve(inv.reportPath)
    const reportRaw = yield* Effect.try({
      try: () => fs.readFileSync(sourceReportPath, 'utf8'),
      catch: (cause) =>
        makeCliError({
          code: 'CLI_INVALID_INPUT',
          message: `[Logix][CLI] next-actions exec 无法读取 report：${sourceReportPath}`,
          cause,
        }),
    })

    const reportPayload = yield* Effect.try({
      try: () => JSON.parse(reportRaw),
      catch: (cause) =>
        makeCliError({
          code: 'CLI_INVALID_INPUT',
          message: `[Logix][CLI] next-actions exec report 非法：${sourceReportPath}`,
          cause,
        }),
    })

    const parsed = yield* Effect.try({
      try: () => parseReport(reportPayload),
      catch: (cause) =>
        makeCliError({
          code: 'CLI_INVALID_INPUT',
          message: `[Logix][CLI] next-actions exec report 非法：${sourceReportPath}`,
          cause,
        }),
    })
    const sourceReportDigest = sha256DigestOfJson(reportPayload)
    const executionRunId = parsed.runId ?? runId
    const instanceId = parsed.instanceId ?? executionRunId
    const txnSeq = parsed.txnSeq ?? 1
    const opSeq = parsed.opSeq ?? 1
    const attemptSeq = parsed.attemptSeq ?? 1

    const results: ActionExecutionResult[] = []
    for (const action of parsed.nextActions) {
      const dispatch = yield* executeAction(inv, action, parsed.reasonCode, parsed.gateScope)
      results.push(dispatch.result)
      if (dispatch.failFast) break
    }

    const summary = {
      executed: results.filter((item) => item.status === 'executed').length,
      failed: results.filter((item) => item.status === 'failed').length,
      noOp: results.filter((item) => item.status === 'no-op').length,
    }

    const executionReport: NextActionsExecutionReport = {
      schemaVersion: 1,
      kind: 'NextActionsExecution',
      runId: executionRunId,
      instanceId,
      txnSeq,
      opSeq,
      attemptSeq,
      sourceReportPath,
      sourceReportDigest,
      reportPath: sourceReportPath,
      sourceReasonCode: parsed.reasonCode,
      engine: inv.engine,
      strict: inv.strict,
      policy: {
        onFailure: failurePolicy(inv.strict),
        onUnsupportedAction: failurePolicy(inv.strict),
        onMissingRequiredArgs: failurePolicy(inv.strict),
      },
      summary,
      results,
    }
    assertNextActionsExecutionV1Schema(executionReport)

    const artifact = yield* makeArtifactOutput({
      outDir: inv.global.outDir,
      budgetBytes: inv.global.budgetBytes,
      fileName: 'next-actions.execution.json',
      outputKey: 'nextActionsExecution',
      kind: 'NextActionsExecution',
      value: executionReport,
    })

    if (summary.failed > 0) {
      return makeCommandResult({
        runId,
        command: 'next-actions.exec',
        ok: false,
        exitCode: 2,
        artifacts: [artifact],
        error: asSerializableErrorSummary(
          makeCliError({
            code: 'CLI_COMMAND_FAILED',
            message: `[Logix][CLI] next-actions exec 存在失败动作（failed=${summary.failed}）`,
          }),
        ),
      })
    }

    return makeCommandResult({
      runId,
      command: 'next-actions.exec',
      ok: true,
      exitCode: 0,
      artifacts: [artifact],
    })
  }).pipe(
    Effect.catchAll((cause) =>
      Effect.succeed(
        makeCommandResult({
          runId,
          command: 'next-actions.exec',
          ok: false,
          artifacts: [],
          error: asSerializableErrorSummary(cause),
        }),
      ),
    ),
  )
}
