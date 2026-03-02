import fs from 'node:fs'
import path from 'node:path'

import type { CommandResult } from '../result.js'
import { makeInstanceIdFromRun } from './identity.js'
import { makeCommandResultV2, type CommandVerdict } from './resultV2.js'
import { isRegisteredReasonCode, type RegisteredReasonCode } from './reasonCatalog.js'
import { normalizeReasonTrajectory, normalizeReasonTrajectoryFromUnknown } from './trajectory.js'
import { CANONICAL_NEXT_ACTION, type CommandResultV2, type NextAction, type ReasonItem } from './types.js'

const isV2Result = (result: CommandResult | CommandResultV2): result is CommandResultV2 =>
  result.schemaVersion === 2 && 'instanceId' in result && 'reasonCode' in result

type IdentitySnapshot = {
  readonly instanceId: string
  readonly txnSeq: number
  readonly opSeq: number
  readonly attemptSeq: number
}

type VerifyLoopReportSnapshot = {
  readonly verdict: CommandVerdict
  readonly reasonCode: RegisteredReasonCode
  readonly reasons: ReadonlyArray<ReasonItem>
  readonly nextActions: ReadonlyArray<NextAction>
  readonly identity: IdentitySnapshot
  readonly trajectory: ReadonlyArray<{ readonly attemptSeq: number; readonly reasonCode: string }>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isPositiveInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 1
const hasNonEmptyTrimmedString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

const isCommandVerdict = (value: unknown): value is CommandVerdict =>
  value === 'PASS' ||
  value === 'ERROR' ||
  value === 'VIOLATION' ||
  value === 'RETRYABLE' ||
  value === 'NOT_IMPLEMENTED' ||
  value === 'NO_PROGRESS'

const VERIFY_LOOP_REPORT_FILE_NAME = 'verify-loop.report.json'
const PATH_TRAVERSAL_SEGMENT_RE = /(^|[\\/])\.\.([\\/]|$)/

const hasIllegalVerifyLoopPathChar = (value: string): boolean => {
  for (const ch of value) {
    const code = ch.charCodeAt(0)
    if (code >= 0x00 && code <= 0x1f) return true
    if (ch === '<' || ch === '>' || ch === '"' || ch === '|' || ch === '?' || ch === '*') return true
  }
  return false
}

const isSafeVerifyLoopArtifactFilePath = (file: string): boolean => {
  const normalized = file.trim()
  if (normalized.length === 0) return false
  if (hasIllegalVerifyLoopPathChar(normalized)) return false
  if (PATH_TRAVERSAL_SEGMENT_RE.test(normalized)) return false
  return path.basename(normalized) === VERIFY_LOOP_REPORT_FILE_NAME
}

const resolveVerifyLoopArtifactFilePath = (file: string): string | undefined => {
  if (!isSafeVerifyLoopArtifactFilePath(file)) return undefined
  return path.isAbsolute(file) ? file : path.resolve(process.cwd(), file)
}

const readArtifactPayload = (artifact: { readonly inline?: unknown; readonly file?: string }): unknown => {
  const file = typeof artifact.file === 'string' ? artifact.file.trim() : ''
  const hasInline = typeof artifact.inline !== 'undefined'
  const hasFile = file.length > 0

  if (hasInline && hasFile) return undefined
  if (hasInline) return artifact.inline
  if (!hasFile) return undefined

  const resolved = resolveVerifyLoopArtifactFilePath(file)
  if (!resolved) return undefined
  try {
    const raw = fs.readFileSync(resolved, 'utf8')
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

const extractOptionalIdentityField = (payload: Record<string, unknown>): IdentitySnapshot | undefined | null => {
  if (!Object.prototype.hasOwnProperty.call(payload, 'identity')) return undefined
  const value = payload.identity
  if (!isRecord(value)) return null
  if (
    !hasNonEmptyTrimmedString(value.instanceId) ||
    !isPositiveInteger(value.txnSeq) ||
    !isPositiveInteger(value.opSeq) ||
    !isPositiveInteger(value.attemptSeq)
  ) {
    return null
  }

  return {
    instanceId: value.instanceId.trim(),
    txnSeq: value.txnSeq,
    opSeq: value.opSeq,
    attemptSeq: value.attemptSeq,
  }
}

const normalizeReasonItems = (input: unknown): ReadonlyArray<ReasonItem> => {
  if (!Array.isArray(input)) return []
  const out: ReasonItem[] = []
  for (const item of input) {
    if (!isRecord(item)) continue
    const code = typeof item.code === 'string' ? toRegisteredReasonCode(item.code) : undefined
    const message = typeof item.message === 'string' ? item.message.trim() : ''
    if (!code || message.length === 0) continue
    out.push({
      code,
      message,
      ...(isRecord(item.data) ? { data: item.data as ReasonItem['data'] } : null),
    })
  }
  return out
}

const normalizeNextActions = (input: unknown): ReadonlyArray<NextAction> => {
  if (!Array.isArray(input)) return []
  const out: NextAction[] = []
  for (const item of input) {
    if (!isRecord(item)) continue
    const id = typeof item.id === 'string' ? item.id.trim() : ''
    const action = typeof item.action === 'string' ? item.action.trim() : ''
    if (id.length === 0 || action.length === 0) continue
    const ifReasonCodes =
      Array.isArray(item.ifReasonCodes) && item.ifReasonCodes.length > 0
        ? Array.from(
            new Set(
              item.ifReasonCodes
                .map((code) => (typeof code === 'string' ? toRegisteredReasonCode(code) : undefined))
                .filter((code): code is RegisteredReasonCode => typeof code === 'string'),
            ),
          ).sort()
        : undefined
    out.push({
      id,
      action,
      ...(isRecord(item.args) ? { args: item.args as NextAction['args'] } : null),
      ...(ifReasonCodes && ifReasonCodes.length > 0 ? { ifReasonCodes } : null),
    })
  }
  return out
}

const extractVerifyLoopReportSnapshot = (result: CommandResult): VerifyLoopReportSnapshot | undefined => {
  if (result.command !== 'verify-loop') return undefined
  const reportArtifact = result.artifacts.find((artifact) => artifact.outputKey === 'verifyLoopReport')
  if (!reportArtifact) return undefined

  const payload = readArtifactPayload(reportArtifact)
  if (!isRecord(payload)) return undefined

  const verdict = isCommandVerdict(payload.verdict) ? payload.verdict : undefined
  const reasonCode = typeof payload.reasonCode === 'string' ? toRegisteredReasonCode(payload.reasonCode) : undefined
  const reportRunId = typeof payload.runId === 'string' ? payload.runId.trim() : ''
  const instanceId = typeof payload.instanceId === 'string' ? payload.instanceId.trim() : ''
  const txnSeq = isPositiveInteger(payload.txnSeq) ? payload.txnSeq : undefined
  const opSeq = isPositiveInteger(payload.opSeq) ? payload.opSeq : undefined
  const attemptSeq = isPositiveInteger(payload.attemptSeq) ? payload.attemptSeq : undefined

  if (!verdict || !reasonCode || instanceId.length === 0 || !txnSeq || !opSeq || !attemptSeq) {
    return undefined
  }

  const optionalIdentity = extractOptionalIdentityField(payload)
  if (optionalIdentity === null) return undefined
  if (
    optionalIdentity &&
    (optionalIdentity.instanceId !== instanceId ||
      optionalIdentity.txnSeq !== txnSeq ||
      optionalIdentity.opSeq !== opSeq ||
      optionalIdentity.attemptSeq !== attemptSeq)
  ) {
    return undefined
  }

  if (reportRunId.length > 0 && reportRunId !== result.runId) {
    return undefined
  }

  const reasons = normalizeReasonItems(payload.reasons)
  const nextActions = normalizeNextActions(payload.nextActions)
  const trajectory = normalizeReasonTrajectoryFromUnknown({
    trajectory: payload.trajectory,
    fallback: {
      attemptSeq,
      reasonCode,
    },
  })
  return {
    verdict,
    reasonCode,
    reasons,
    nextActions,
    identity: {
      instanceId,
      txnSeq,
      opSeq,
      attemptSeq,
    },
    trajectory,
  }
}

const REASON_ALIAS: Readonly<Record<string, RegisteredReasonCode>> = {
  CLI_MISSING_RUNID: 'CLI_INVALID_ARGUMENT',
  CLI_INVALID_INPUT: 'CLI_INVALID_ARGUMENT',
  CLI_ENTRY_NO_EXPORT: 'CLI_INVALID_ARGUMENT',
  CLI_ENTRY_IMPORT_FAILED: 'CLI_PROTOCOL_VIOLATION',
  CLI_VIOLATION_IR_VALIDATE: 'CLI_PROTOCOL_VIOLATION',
  CLI_VIOLATION_IR_DIFF: 'CLI_PROTOCOL_VIOLATION',
  CLI_HOST_MISSING_BROWSER_GLOBAL: 'CLI_INVALID_ARGUMENT',
  CLI_HOST_MISMATCH: 'CLI_INVALID_ARGUMENT',
  CLI_COMMAND_FAILED: 'CLI_PROTOCOL_VIOLATION',
  CLI_INTERNAL: 'CLI_PROTOCOL_VIOLATION',
}

const COMMAND_MERGED_REASON_CODE: RegisteredReasonCode = 'E_CLI_COMMAND_MERGED'
const UNRESOLVED_ENTRY_PLACEHOLDER = '__LOGIX_UNRESOLVED_MODULE__#__LOGIX_UNRESOLVED_EXPORT__'
const ARTIFACT_DIR_PLACEHOLDER = '__LOGIX_ARTIFACT_DIR__'

type MergedCommandMigration = {
  readonly actionId: string
  readonly makeCommand: (runId: string) => string
}

const MERGED_COMMAND_MIGRATIONS: Readonly<Record<string, MergedCommandMigration>> = {
  'contract-suite.run': {
    actionId: 'run-ir-validate-contract-profile',
    makeCommand: (runId) => `logix ir validate --runId ${runId} --profile contract --in ${ARTIFACT_DIR_PLACEHOLDER}`,
  },
  'spy.evidence': {
    actionId: 'run-trialrun-evidence',
    makeCommand: (runId) =>
      `logix trialrun --runId ${runId} --entry ${UNRESOLVED_ENTRY_PLACEHOLDER} --emit evidence`,
  },
  'anchor.index': {
    actionId: 'run-ir-export-with-anchors',
    makeCommand: (runId) => `logix ir export --runId ${runId} --entry ${UNRESOLVED_ENTRY_PLACEHOLDER} --with-anchors`,
  },
}

const resolveMergedReplacement = (args: {
  readonly command: string
  readonly runId: string
  readonly hint?: string
}): { readonly actionId: string; readonly command: string } | undefined => {
  const hintedCommand = typeof args.hint === 'string' ? args.hint.trim() : ''
  const migration = MERGED_COMMAND_MIGRATIONS[args.command]
  if (hintedCommand.length > 0) {
    return {
      actionId: migration?.actionId ?? 'run-merged-command',
      command: hintedCommand,
    }
  }
  if (!migration) return undefined
  return {
    actionId: migration.actionId,
    command: migration.makeCommand(args.runId),
  }
}

const isGateFailureReasonCode = (code: string | undefined): boolean =>
  typeof code === 'string' && code.startsWith('GATE_') && code.endsWith('_FAILED')

const toRegisteredReasonCode = (code: string | undefined): RegisteredReasonCode | undefined => {
  if (!code || code.length === 0) return undefined
  if (isRegisteredReasonCode(code)) return code
  return REASON_ALIAS[code]
}

const defaultReasonCodeByVerdict = (verdict: CommandVerdict): RegisteredReasonCode => {
  switch (verdict) {
    case 'PASS':
      return 'VERIFY_PASS'
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

const inferVerdict = (ok: boolean, reasonCode: RegisteredReasonCode | undefined): CommandVerdict => {
  if (ok) return 'PASS'
  if (!reasonCode) return 'ERROR'
  if (reasonCode === COMMAND_MERGED_REASON_CODE) return 'VIOLATION'
  if (reasonCode === 'CLI_NOT_IMPLEMENTED') return 'NOT_IMPLEMENTED'
  if (reasonCode === 'VERIFY_RETRYABLE') return 'RETRYABLE'
  if (reasonCode === 'VERIFY_NO_PROGRESS') return 'NO_PROGRESS'
  if (reasonCode === 'CLI_INVALID_ARGUMENT' || reasonCode === 'CLI_INVALID_COMMAND' || reasonCode === 'CLI_PROTOCOL_VIOLATION') {
    return 'VIOLATION'
  }
  if (isGateFailureReasonCode(reasonCode)) return 'VIOLATION'
  return 'ERROR'
}

const makeReasonMessage = (args: {
  readonly ok: boolean
  readonly verdict: CommandVerdict
  readonly errorMessage?: string
}): string => {
  if (args.errorMessage && args.errorMessage.length > 0) return args.errorMessage
  if (args.ok) return '命令执行通过'
  switch (args.verdict) {
    case 'NOT_IMPLEMENTED':
      return '命令尚未实现'
    case 'RETRYABLE':
      return '命令可重试'
    case 'NO_PROGRESS':
      return '命令无进展'
    case 'VIOLATION':
      return '命令违反协议约束'
    case 'ERROR':
      return '命令执行失败'
    case 'PASS':
      return '命令执行通过'
  }
}

const makeNextActions = (args: {
  readonly verdict: CommandVerdict
  readonly reasonCode: RegisteredReasonCode
  readonly command: string
  readonly runId: string
  readonly errorHint?: string
}): ReadonlyArray<NextAction> => {
  if (args.reasonCode === COMMAND_MERGED_REASON_CODE) {
    const replacement = resolveMergedReplacement({
      command: args.command,
      runId: args.runId,
      hint: args.errorHint,
    })
    if (replacement) {
      return [
        {
          id: replacement.actionId,
          action: CANONICAL_NEXT_ACTION.COMMAND_RUN,
          args: {
            command: replacement.command,
          },
          ifReasonCodes: [args.reasonCode],
        },
      ]
    }
    return [
      {
        id: 'inspect-command-migration',
        action: CANONICAL_NEXT_ACTION.COMMAND_INSPECT_MIGRATION,
        args: {
          command: args.command,
        },
        ifReasonCodes: [args.reasonCode],
      },
    ]
  }

  switch (args.verdict) {
    case 'PASS':
      return []
    case 'VIOLATION':
      return [{ id: 'fix-and-rerun', action: CANONICAL_NEXT_ACTION.COMMAND_FIX_AND_RERUN, ifReasonCodes: [args.reasonCode] }]
    case 'RETRYABLE':
      return [{ id: 'retry-command', action: CANONICAL_NEXT_ACTION.COMMAND_RETRY, ifReasonCodes: [args.reasonCode] }]
    case 'NO_PROGRESS':
      return [
        { id: 'inspect-no-progress', action: CANONICAL_NEXT_ACTION.COMMAND_INSPECT_NO_PROGRESS, ifReasonCodes: [args.reasonCode] },
      ]
    case 'NOT_IMPLEMENTED':
      return [{ id: 'implement-command', action: CANONICAL_NEXT_ACTION.COMMAND_IMPLEMENT, ifReasonCodes: [args.reasonCode] }]
    case 'ERROR':
      return [{ id: 'inspect-error', action: CANONICAL_NEXT_ACTION.COMMAND_INSPECT_ERROR, ifReasonCodes: [args.reasonCode] }]
  }
}

export const toCommandResultV2 = (result: CommandResult | CommandResultV2): CommandResultV2 => {
  if (isV2Result(result)) return result

  const verifyLoopSnapshot = extractVerifyLoopReportSnapshot(result)
  const sourceReasonCode = verifyLoopSnapshot?.reasonCode ?? toRegisteredReasonCode(result.error?.code)
  const verdict = verifyLoopSnapshot?.verdict ?? inferVerdict(result.ok, sourceReasonCode)
  const reasonCode = sourceReasonCode ?? defaultReasonCodeByVerdict(verdict)
  const identity = verifyLoopSnapshot?.identity ?? {
    instanceId: makeInstanceIdFromRun(result.runId),
    txnSeq: 1,
    opSeq: 1,
    attemptSeq: 1,
  }

  const reason: ReasonItem = {
    code: reasonCode,
    message: makeReasonMessage({
      ok: result.ok,
      verdict,
      errorMessage: result.error?.message,
    }),
    ...(result.error?.code && result.error.code !== reasonCode
      ? {
          data: {
            sourceCode: result.error.code,
          },
        }
      : null),
  }

  const reasons = verifyLoopSnapshot?.reasons.length ? verifyLoopSnapshot.reasons : [reason]
  const nextActions =
    verifyLoopSnapshot?.nextActions.length ?
      verifyLoopSnapshot.nextActions
    : makeNextActions({
        verdict,
        reasonCode,
        command: result.command,
        runId: result.runId,
        errorHint: result.error?.hint,
      })
  const trajectory = normalizeReasonTrajectory({
    points: verifyLoopSnapshot?.trajectory ?? [],
    fallback: {
      attemptSeq: identity.attemptSeq,
      reasonCode,
    },
  })

  return makeCommandResultV2({
    runId: result.runId,
    instanceId: identity.instanceId,
    txnSeq: identity.txnSeq,
    opSeq: identity.opSeq,
    attemptSeq: identity.attemptSeq,
    command: result.command,
    verdict,
    reasonCode,
    reasons,
    artifacts: result.artifacts,
    nextActions,
    trajectory,
  })
}
