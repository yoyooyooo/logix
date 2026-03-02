import { makeCliError } from '../errors.js'
import type { CommandResultV2 } from './types.js'

type JsonRecord = Record<string, unknown>

type ReasonLevel = 'error' | 'warn' | 'info'

type VerifyLoopMode = 'run' | 'resume'

type VerifyLoopGateScope = 'runtime' | 'governance'

type VerifyLoopVerdict = 'PASS' | 'ERROR' | 'VIOLATION' | 'RETRYABLE' | 'NOT_IMPLEMENTED' | 'NO_PROGRESS'

type VerifyLoopGate =
  | 'gate:type'
  | 'gate:lint'
  | 'gate:test'
  | 'gate:control-surface-artifact'
  | 'gate:diagnostics-protocol'
  | 'gate:perf-hard'
  | 'gate:ssot-drift'
  | 'gate:migration-forward-only'

type NextActionsExecutionStatus = 'executed' | 'failed' | 'no-op'
type DescribeAgentGuidanceId = 'static-contract' | 'dynamic-evidence' | 'change-safety' | 'closure-ready'

const TOKEN_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const DIGEST_RE = /^sha256:[0-9a-f]{64}$/

const COMMAND_RESULT_ROOT_KEYS = new Set<string>([
  'schemaVersion',
  'kind',
  'runId',
  'instanceId',
  'txnSeq',
  'opSeq',
  'attemptSeq',
  'command',
  'ok',
  'exitCode',
  'reasonCode',
  'reasonLevel',
  'reasons',
  'artifacts',
  'nextActions',
  'trajectory',
  'ext',
])

const REASON_ITEM_KEYS = new Set<string>(['code', 'message', 'data'])

const ARTIFACT_KEYS = new Set<string>([
  'outputKey',
  'kind',
  'schemaVersion',
  'ok',
  'file',
  'inline',
  'truncated',
  'budgetBytes',
  'actualBytes',
  'digest',
  'reasonCodes',
  'error',
])

const NEXT_ACTION_KEYS = new Set<string>(['id', 'action', 'args', 'ifReasonCodes'])

const TRAJECTORY_ITEM_KEYS = new Set<string>(['attemptSeq', 'reasonCode'])

const ERROR_SUMMARY_KEYS = new Set<string>(['name', 'message', 'code', 'hint'])

const VERIFY_LOOP_REPORT_ROOT_KEYS = new Set<string>([
  'schemaVersion',
  'kind',
  'runId',
  'instanceId',
  'mode',
  'gateScope',
  'previousRunId',
  'txnSeq',
  'opSeq',
  'attemptSeq',
  'verdict',
  'exitCode',
  'gateResults',
  'reasonCode',
  'reasons',
  'trajectory',
  'nextActions',
  'artifacts',
  'ext',
])

const VERIFY_LOOP_GATE_RESULT_KEYS = new Set<string>(['gate', 'status', 'durationMs', 'command', 'exitCode', 'reasonCode'])

const VERIFY_LOOP_ARTIFACT_KEYS = new Set<string>(['name', 'path'])

const NEXT_ACTIONS_EXECUTION_ROOT_KEYS = new Set<string>([
  'schemaVersion',
  'kind',
  'runId',
  'instanceId',
  'txnSeq',
  'opSeq',
  'attemptSeq',
  'sourceReportPath',
  'sourceReportDigest',
  'reportPath',
  'sourceReasonCode',
  'engine',
  'strict',
  'summary',
  'results',
])

const NEXT_ACTIONS_EXECUTION_SUMMARY_KEYS = new Set<string>(['executed', 'failed', 'noOp'])

const NEXT_ACTIONS_EXECUTION_RESULT_KEYS = new Set<string>(['id', 'action', 'status', 'reason', 'command', 'exitCode', 'rerun'])

const NEXT_ACTIONS_EXECUTION_RERUN_KEYS = new Set<string>(['runId', 'exitCode'])

const DESCRIBE_REPORT_ROOT_KEYS = new Set<string>([
  'schemaVersion',
  'kind',
  'nonGoals',
  'agentGuidance',
  'protocol',
  'commands',
  'runtimeExecutableTruth',
  'migrationEntries',
  'configVisibility',
  'ext',
])

const DESCRIBE_AGENT_GUIDANCE_KEYS = new Set<string>(['source', 'verificationChains'])
const DESCRIBE_AGENT_CHAIN_KEYS = new Set<string>([
  'id',
  'purpose',
  'primitiveChain',
  'expectedArtifacts',
  'expectedOutputKeys',
])
const DESCRIBE_AGENT_CHAIN_ID_SET = new Set<DescribeAgentGuidanceId>([
  'static-contract',
  'dynamic-evidence',
  'change-safety',
  'closure-ready',
])

const DESCRIBE_PROTOCOL_KEYS = new Set<string>(['commandResultSchemaRef', 'reasonCodeCatalogRef', 'exitCodes'])
const DESCRIBE_EXIT_CODE_KEYS = new Set<string>(['code', 'meaning'])

const DESCRIBE_RUNTIME_TRUTH_KEYS = new Set<string>([
  'source',
  'executableCommandNames',
  'migrationCommandNames',
  'unavailableCommandNames',
])
const DESCRIBE_MIGRATION_ENTRY_KEYS = new Set<string>(['command', 'replacementHint'])

const DESCRIBE_CONFIG_VISIBILITY_KEYS = new Set<string>([
  'precedence',
  'argv',
  'argvWithConfigPrefix',
  'cliConfigPathArg',
  'profile',
  'discoveredPath',
  'layers',
  'effective',
  'overrideTrail',
  'discovery',
])

const DESCRIBE_EXT_KEYS = new Set<string>(['internal'])
const DESCRIBE_EXT_INTERNAL_KEYS = new Set<string>(['orchestration'])
const DESCRIBE_EXT_ORCHESTRATION_KEYS = new Set<string>(['source', 'contractRef', 'remediationMapRef', 'scenarios'])
const DESCRIBE_EXT_SCENARIO_KEYS = new Set<string>(['id', 'recommendedPrimitiveChain'])

const VERIFICATION_CHAIN_CATALOG_ROOT_KEYS = new Set<string>(['schemaVersion', 'kind', 'source', 'chains'])
const VERIFICATION_CHAIN_TEMPLATE_KEYS = new Set<string>(['id', 'purpose', 'commandSteps'])

const VERIFY_LOOP_GATE_SCOPE_RUNTIME: ReadonlyArray<VerifyLoopGate> = [
  'gate:type',
  'gate:lint',
  'gate:test',
  'gate:control-surface-artifact',
  'gate:diagnostics-protocol',
]

const VERIFY_LOOP_GATE_SCOPE_GOVERNANCE: ReadonlyArray<VerifyLoopGate> = [
  'gate:perf-hard',
  'gate:ssot-drift',
  'gate:migration-forward-only',
]

const VERIFY_LOOP_GATES_ALL = new Set<VerifyLoopGate>([...VERIFY_LOOP_GATE_SCOPE_RUNTIME, ...VERIFY_LOOP_GATE_SCOPE_GOVERNANCE])

const VERIFY_LOOP_NEXT_ACTIONS = new Set<string>(['run-command', 'rerun', 'inspect', 'stop'])

const REASON_LEVEL_SET = new Set<ReasonLevel>(['error', 'warn', 'info'])

const VERIFY_LOOP_MODE_SET = new Set<VerifyLoopMode>(['run', 'resume'])

const VERIFY_LOOP_SCOPE_SET = new Set<VerifyLoopGateScope>(['runtime', 'governance'])

const VERIFY_LOOP_VERDICT_SET = new Set<VerifyLoopVerdict>(['PASS', 'ERROR', 'VIOLATION', 'RETRYABLE', 'NOT_IMPLEMENTED', 'NO_PROGRESS'])

const VERIFY_LOOP_STATUS_SET = new Set<string>(['pass', 'fail', 'retryable', 'skipped'])

const NEXT_ACTIONS_EXECUTION_STATUS_SET = new Set<NextActionsExecutionStatus>(['executed', 'failed', 'no-op'])

const throwProtocolViolation = (schemaName: string, path: string, message: string): never => {
  throw makeCliError({
    code: 'CLI_PROTOCOL_VIOLATION',
    message: `[Logix][CLI] ${schemaName} schema 校验失败（${path}）：${message}`,
  })
}

const isRecord = (value: unknown): value is JsonRecord => typeof value === 'object' && value !== null && !Array.isArray(value)

const assertRecord = (schemaName: string, path: string, value: unknown): JsonRecord => {
  if (isRecord(value)) return value
  return throwProtocolViolation(schemaName, path, '必须是对象')
}

const assertKnownKeys = (schemaName: string, path: string, value: JsonRecord, allowed: ReadonlySet<string>): void => {
  for (const key of Object.keys(value)) {
    if (allowed.has(key)) continue
    throwProtocolViolation(schemaName, path, `出现未知字段 '${key}'`)
  }
}

const assertRequiredKeys = (schemaName: string, path: string, value: JsonRecord, required: ReadonlyArray<string>): void => {
  for (const key of required) {
    if (Object.prototype.hasOwnProperty.call(value, key)) continue
    throwProtocolViolation(schemaName, path, `缺少必填字段 '${key}'`)
  }
}

const assertNonEmptyString = (schemaName: string, path: string, value: unknown): string => {
  if (typeof value === 'string' && value.length > 0) return value
  return throwProtocolViolation(schemaName, path, '必须是非空字符串')
}

const assertToken = (schemaName: string, path: string, value: unknown): string => {
  const token = assertNonEmptyString(schemaName, path, value)
  if (TOKEN_RE.test(token)) return token
  return throwProtocolViolation(schemaName, path, `必须匹配 ${TOKEN_RE.source}`)
}

const assertIntegerAtLeast = (schemaName: string, path: string, value: unknown, minimum: number): number => {
  if (typeof value === 'number' && Number.isInteger(value) && value >= minimum) return value
  return throwProtocolViolation(schemaName, path, `必须是 >= ${minimum} 的整数`)
}

const assertEnumNumber = (schemaName: string, path: string, value: unknown, allowed: ReadonlyArray<number>): number => {
  if (typeof value === 'number' && Number.isInteger(value) && allowed.includes(value)) return value
  return throwProtocolViolation(schemaName, path, `必须是枚举值 [${allowed.join(', ')}]`)
}

const assertBoolean = (schemaName: string, path: string, value: unknown): boolean => {
  if (typeof value === 'boolean') return value
  return throwProtocolViolation(schemaName, path, '必须是布尔值')
}

const assertStringArray = (schemaName: string, path: string, value: unknown): ReadonlyArray<string> => {
  if (!Array.isArray(value)) {
    return throwProtocolViolation(schemaName, path, '必须是字符串数组')
  }

  const seen = new Set<string>()
  const output: string[] = []
  for (let i = 0; i < value.length; i++) {
    const itemPath = `${path}[${i}]`
    const item = assertNonEmptyString(schemaName, itemPath, value[i])
    if (seen.has(item)) {
      throwProtocolViolation(schemaName, itemPath, `出现重复值 '${item}'`)
    }
    seen.add(item)
    output.push(item)
  }
  return output
}

const assertStringArrayLoose = (schemaName: string, path: string, value: unknown): ReadonlyArray<string> => {
  if (!Array.isArray(value)) {
    return throwProtocolViolation(schemaName, path, '必须是字符串数组')
  }
  return value.map((item, index) => assertNonEmptyString(schemaName, `${path}[${index}]`, item))
}

const assertStringMatrix = (schemaName: string, path: string, value: unknown): ReadonlyArray<ReadonlyArray<string>> => {
  if (!Array.isArray(value)) {
    return throwProtocolViolation(schemaName, path, '必须是二维字符串数组')
  }

  const matrix = value as ReadonlyArray<unknown>
  const out: string[][] = []
  for (let i = 0; i < matrix.length; i++) {
    const rowPath = `${path}[${i}]`
    const row = matrix[i]
    if (!Array.isArray(row)) {
      throwProtocolViolation(schemaName, rowPath, '必须是字符串数组')
    }
    const values = assertStringArray(schemaName, rowPath, row)
    if (values.length === 0) {
      throwProtocolViolation(schemaName, rowPath, '至少包含一个候选命令')
    }
    out.push([...values])
  }

  return out
}

const assertDescribeAgentGuidance = (schemaName: string, path: string, value: unknown): void => {
  const record = assertRecord(schemaName, path, value)
  assertKnownKeys(schemaName, path, record, DESCRIBE_AGENT_GUIDANCE_KEYS)
  assertRequiredKeys(schemaName, path, record, ['source', 'verificationChains'])

  if (record.source !== 'primitives.capability-model.v1') {
    throwProtocolViolation(schemaName, `${path}.source`, "必须等于 'primitives.capability-model.v1'")
  }

  const chains = record.verificationChains
  if (!Array.isArray(chains) || chains.length === 0) {
    throwProtocolViolation(schemaName, `${path}.verificationChains`, '必须是非空数组')
  }

  const seenIds = new Set<string>()
  const chainItems = chains as ReadonlyArray<unknown>
  for (let i = 0; i < chainItems.length; i++) {
    const chainPath = `${path}.verificationChains[${i}]`
    const chain = assertRecord(schemaName, chainPath, chainItems[i])
    assertKnownKeys(schemaName, chainPath, chain, DESCRIBE_AGENT_CHAIN_KEYS)
    assertRequiredKeys(schemaName, chainPath, chain, ['id', 'purpose', 'primitiveChain', 'expectedArtifacts', 'expectedOutputKeys'])

    const id = assertNonEmptyString(schemaName, `${chainPath}.id`, chain.id) as DescribeAgentGuidanceId
    if (!DESCRIBE_AGENT_CHAIN_ID_SET.has(id)) {
      throwProtocolViolation(schemaName, `${chainPath}.id`, '不是允许的 guidance id')
    }
    if (seenIds.has(id)) {
      throwProtocolViolation(schemaName, `${chainPath}.id`, `出现重复 id '${id}'`)
    }
    seenIds.add(id)

    assertNonEmptyString(schemaName, `${chainPath}.purpose`, chain.purpose)

    const primitiveChain = assertStringArray(schemaName, `${chainPath}.primitiveChain`, chain.primitiveChain)
    if (primitiveChain.length === 0) {
      throwProtocolViolation(schemaName, `${chainPath}.primitiveChain`, '至少包含一个命令')
    }

    const expectedArtifacts = assertStringArray(schemaName, `${chainPath}.expectedArtifacts`, chain.expectedArtifacts)
    if (expectedArtifacts.length === 0) {
      throwProtocolViolation(schemaName, `${chainPath}.expectedArtifacts`, '至少包含一个 artifact 文件名')
    }

    const expectedOutputKeys = assertStringArray(schemaName, `${chainPath}.expectedOutputKeys`, chain.expectedOutputKeys)
    if (expectedOutputKeys.length === 0) {
      throwProtocolViolation(schemaName, `${chainPath}.expectedOutputKeys`, '至少包含一个 outputKey')
    }
  }
}

const assertReasonItem = (schemaName: string, path: string, value: unknown): void => {
  const record = assertRecord(schemaName, path, value)
  assertKnownKeys(schemaName, path, record, REASON_ITEM_KEYS)
  assertRequiredKeys(schemaName, path, record, ['code', 'message'])

  assertNonEmptyString(schemaName, `${path}.code`, record.code)
  assertNonEmptyString(schemaName, `${path}.message`, record.message)

  if (Object.prototype.hasOwnProperty.call(record, 'data')) {
    assertRecord(schemaName, `${path}.data`, record.data)
  }
}

const assertSerializableErrorSummary = (schemaName: string, path: string, value: unknown): void => {
  const record = assertRecord(schemaName, path, value)
  assertKnownKeys(schemaName, path, record, ERROR_SUMMARY_KEYS)
  assertRequiredKeys(schemaName, path, record, ['message'])

  assertNonEmptyString(schemaName, `${path}.message`, record.message)
  if (Object.prototype.hasOwnProperty.call(record, 'name')) {
    assertNonEmptyString(schemaName, `${path}.name`, record.name)
  }
  if (Object.prototype.hasOwnProperty.call(record, 'code')) {
    assertNonEmptyString(schemaName, `${path}.code`, record.code)
  }
  if (Object.prototype.hasOwnProperty.call(record, 'hint')) {
    assertNonEmptyString(schemaName, `${path}.hint`, record.hint)
  }
}

const assertArtifact = (schemaName: string, path: string, value: unknown): void => {
  const record = assertRecord(schemaName, path, value)
  assertKnownKeys(schemaName, path, record, ARTIFACT_KEYS)
  assertRequiredKeys(schemaName, path, record, ['outputKey', 'kind', 'ok'])

  assertNonEmptyString(schemaName, `${path}.outputKey`, record.outputKey)
  assertNonEmptyString(schemaName, `${path}.kind`, record.kind)

  if (Object.prototype.hasOwnProperty.call(record, 'schemaVersion')) {
    assertIntegerAtLeast(schemaName, `${path}.schemaVersion`, record.schemaVersion, 0)
  }

  const ok = assertBoolean(schemaName, `${path}.ok`, record.ok)

  const hasFile = Object.prototype.hasOwnProperty.call(record, 'file')
  const hasInline = Object.prototype.hasOwnProperty.call(record, 'inline')

  if (hasFile === hasInline) {
    throwProtocolViolation(schemaName, path, "必须且只能提供一个输出载体（'file' 或 'inline'）")
  }

  if (hasFile) {
    assertNonEmptyString(schemaName, `${path}.file`, record.file)
  }

  if (Object.prototype.hasOwnProperty.call(record, 'truncated')) {
    assertBoolean(schemaName, `${path}.truncated`, record.truncated)
  }

  if (Object.prototype.hasOwnProperty.call(record, 'budgetBytes')) {
    assertIntegerAtLeast(schemaName, `${path}.budgetBytes`, record.budgetBytes, 1)
  }

  if (Object.prototype.hasOwnProperty.call(record, 'actualBytes')) {
    assertIntegerAtLeast(schemaName, `${path}.actualBytes`, record.actualBytes, 0)
  }

  if (Object.prototype.hasOwnProperty.call(record, 'digest')) {
    const digest = assertNonEmptyString(schemaName, `${path}.digest`, record.digest)
    if (!DIGEST_RE.test(digest)) {
      throwProtocolViolation(schemaName, `${path}.digest`, `必须匹配 ${DIGEST_RE.source}`)
    }
  }

  if (Object.prototype.hasOwnProperty.call(record, 'reasonCodes')) {
    assertStringArray(schemaName, `${path}.reasonCodes`, record.reasonCodes)
  }

  if (Object.prototype.hasOwnProperty.call(record, 'error')) {
    assertSerializableErrorSummary(schemaName, `${path}.error`, record.error)
    if (ok) {
      throwProtocolViolation(schemaName, path, 'ok=true 时不允许包含 error 字段')
    }
  } else if (!ok) {
    throwProtocolViolation(schemaName, path, 'ok=false 时必须提供 error 字段')
  }
}

const assertNextAction = (schemaName: string, path: string, value: unknown): void => {
  const record = assertRecord(schemaName, path, value)
  assertKnownKeys(schemaName, path, record, NEXT_ACTION_KEYS)
  assertRequiredKeys(schemaName, path, record, ['id', 'action'])

  assertToken(schemaName, `${path}.id`, record.id)
  assertNonEmptyString(schemaName, `${path}.action`, record.action)

  if (Object.prototype.hasOwnProperty.call(record, 'args')) {
    assertRecord(schemaName, `${path}.args`, record.args)
  }

  if (Object.prototype.hasOwnProperty.call(record, 'ifReasonCodes')) {
    assertStringArray(schemaName, `${path}.ifReasonCodes`, record.ifReasonCodes)
  }
}

const assertTrajectoryItem = (schemaName: string, path: string, value: unknown): void => {
  const record = assertRecord(schemaName, path, value)
  assertKnownKeys(schemaName, path, record, TRAJECTORY_ITEM_KEYS)
  assertRequiredKeys(schemaName, path, record, ['attemptSeq', 'reasonCode'])

  assertIntegerAtLeast(schemaName, `${path}.attemptSeq`, record.attemptSeq, 1)
  assertNonEmptyString(schemaName, `${path}.reasonCode`, record.reasonCode)
}

export function assertCommandResultV2Schema(value: unknown): asserts value is CommandResultV2 {
  const schemaName = 'CommandResult@v2'
  const record = assertRecord(schemaName, '$', value)

  assertKnownKeys(schemaName, '$', record, COMMAND_RESULT_ROOT_KEYS)
  assertRequiredKeys(schemaName, '$', record, [
    'schemaVersion',
    'kind',
    'runId',
    'instanceId',
    'txnSeq',
    'opSeq',
    'attemptSeq',
    'command',
    'ok',
    'exitCode',
    'reasonCode',
    'reasonLevel',
    'reasons',
    'artifacts',
    'nextActions',
    'trajectory',
  ])

  if (record.schemaVersion !== 2) {
    throwProtocolViolation(schemaName, '$.schemaVersion', '必须等于 2')
  }

  if (record.kind !== 'CommandResult') {
    throwProtocolViolation(schemaName, '$.kind', "必须等于 'CommandResult'")
  }

  assertNonEmptyString(schemaName, '$.runId', record.runId)
  assertToken(schemaName, '$.instanceId', record.instanceId)
  assertIntegerAtLeast(schemaName, '$.txnSeq', record.txnSeq, 1)
  assertIntegerAtLeast(schemaName, '$.opSeq', record.opSeq, 1)
  assertIntegerAtLeast(schemaName, '$.attemptSeq', record.attemptSeq, 1)
  assertNonEmptyString(schemaName, '$.command', record.command)
  assertBoolean(schemaName, '$.ok', record.ok)
  assertEnumNumber(schemaName, '$.exitCode', record.exitCode, [0, 1, 2, 3, 4, 5])
  assertNonEmptyString(schemaName, '$.reasonCode', record.reasonCode)

  const reasonLevel = assertNonEmptyString(schemaName, '$.reasonLevel', record.reasonLevel)
  if (!REASON_LEVEL_SET.has(reasonLevel as ReasonLevel)) {
    throwProtocolViolation(schemaName, '$.reasonLevel', `必须是 [${Array.from(REASON_LEVEL_SET).join(', ')}]`)
  }

  const reasons = record.reasons
  if (!Array.isArray(reasons)) {
    throwProtocolViolation(schemaName, '$.reasons', '必须是数组')
  }
  const reasonItems = reasons as ReadonlyArray<unknown>
  for (let i = 0; i < reasonItems.length; i++) {
    assertReasonItem(schemaName, `$.reasons[${i}]`, reasonItems[i])
  }

  const artifacts = record.artifacts
  if (!Array.isArray(artifacts)) {
    throwProtocolViolation(schemaName, '$.artifacts', '必须是数组')
  }
  const artifactItems = artifacts as ReadonlyArray<unknown>
  for (let i = 0; i < artifactItems.length; i++) {
    assertArtifact(schemaName, `$.artifacts[${i}]`, artifactItems[i])
  }

  const nextActions = record.nextActions
  if (!Array.isArray(nextActions)) {
    throwProtocolViolation(schemaName, '$.nextActions', '必须是数组')
  }
  const nextActionItems = nextActions as ReadonlyArray<unknown>
  for (let i = 0; i < nextActionItems.length; i++) {
    assertNextAction(schemaName, `$.nextActions[${i}]`, nextActionItems[i])
  }

  const trajectory = record.trajectory
  if (!Array.isArray(trajectory)) {
    throwProtocolViolation(schemaName, '$.trajectory', '必须是数组')
  }
  const trajectoryItems = trajectory as ReadonlyArray<unknown>
  for (let i = 0; i < trajectoryItems.length; i++) {
    assertTrajectoryItem(schemaName, `$.trajectory[${i}]`, trajectoryItems[i])
  }

  if (Object.prototype.hasOwnProperty.call(record, 'ext')) {
    assertRecord(schemaName, '$.ext', record.ext)
  }
}

const assertVerifyLoopNextAction = (schemaName: string, path: string, value: unknown): void => {
  const record = assertRecord(schemaName, path, value)
  assertKnownKeys(schemaName, path, record, NEXT_ACTION_KEYS)
  assertRequiredKeys(schemaName, path, record, ['id', 'action', 'args'])

  assertToken(schemaName, `${path}.id`, record.id)
  const action = assertNonEmptyString(schemaName, `${path}.action`, record.action)
  if (!VERIFY_LOOP_NEXT_ACTIONS.has(action)) {
    throwProtocolViolation(schemaName, `${path}.action`, `必须是 [${Array.from(VERIFY_LOOP_NEXT_ACTIONS).join(', ')}]`)
  }

  assertRecord(schemaName, `${path}.args`, record.args)

  if (Object.prototype.hasOwnProperty.call(record, 'ifReasonCodes')) {
    assertStringArray(schemaName, `${path}.ifReasonCodes`, record.ifReasonCodes)
  }
}

const assertVerifyLoopArtifact = (schemaName: string, path: string, value: unknown): void => {
  const record = assertRecord(schemaName, path, value)
  assertKnownKeys(schemaName, path, record, VERIFY_LOOP_ARTIFACT_KEYS)
  assertRequiredKeys(schemaName, path, record, ['name', 'path'])

  assertNonEmptyString(schemaName, `${path}.name`, record.name)
  assertNonEmptyString(schemaName, `${path}.path`, record.path)
}

const assertVerifyLoopGateResult = (schemaName: string, path: string, gateScope: VerifyLoopGateScope, value: unknown): void => {
  const record = assertRecord(schemaName, path, value)
  assertKnownKeys(schemaName, path, record, VERIFY_LOOP_GATE_RESULT_KEYS)
  assertRequiredKeys(schemaName, path, record, ['gate', 'status', 'durationMs', 'command', 'exitCode'])

  const gate = assertNonEmptyString(schemaName, `${path}.gate`, record.gate) as VerifyLoopGate
  if (!VERIFY_LOOP_GATES_ALL.has(gate)) {
    throwProtocolViolation(schemaName, `${path}.gate`, '不是允许的 gate')
  }

  if (gateScope === 'runtime' && !VERIFY_LOOP_GATE_SCOPE_RUNTIME.includes(gate)) {
    throwProtocolViolation(schemaName, `${path}.gate`, `runtime gateScope 不允许 '${gate}'`)
  }

  if (gateScope === 'governance' && !VERIFY_LOOP_GATE_SCOPE_GOVERNANCE.includes(gate)) {
    throwProtocolViolation(schemaName, `${path}.gate`, `governance gateScope 不允许 '${gate}'`)
  }

  const status = assertNonEmptyString(schemaName, `${path}.status`, record.status)
  if (!VERIFY_LOOP_STATUS_SET.has(status)) {
    throwProtocolViolation(schemaName, `${path}.status`, `必须是 [${Array.from(VERIFY_LOOP_STATUS_SET).join(', ')}]`)
  }

  assertIntegerAtLeast(schemaName, `${path}.durationMs`, record.durationMs, 0)
  assertNonEmptyString(schemaName, `${path}.command`, record.command)
  assertIntegerAtLeast(schemaName, `${path}.exitCode`, record.exitCode, 0)

  if (Object.prototype.hasOwnProperty.call(record, 'reasonCode')) {
    assertNonEmptyString(schemaName, `${path}.reasonCode`, record.reasonCode)
  }
}

export const assertVerifyLoopReportV1Schema = (value: unknown): void => {
  const schemaName = 'verify-loop.report@v1'
  const record = assertRecord(schemaName, '$', value)

  assertKnownKeys(schemaName, '$', record, VERIFY_LOOP_REPORT_ROOT_KEYS)
  assertRequiredKeys(schemaName, '$', record, [
    'schemaVersion',
    'kind',
    'runId',
    'instanceId',
    'mode',
    'gateScope',
    'txnSeq',
    'opSeq',
    'attemptSeq',
    'verdict',
    'exitCode',
    'gateResults',
    'reasonCode',
    'reasons',
    'trajectory',
    'nextActions',
    'artifacts',
  ])

  if (record.schemaVersion !== 1) {
    throwProtocolViolation(schemaName, '$.schemaVersion', '必须等于 1')
  }

  if (record.kind !== 'VerifyLoopReport') {
    throwProtocolViolation(schemaName, '$.kind', "必须等于 'VerifyLoopReport'")
  }

  assertNonEmptyString(schemaName, '$.runId', record.runId)
  assertToken(schemaName, '$.instanceId', record.instanceId)

  const mode = assertNonEmptyString(schemaName, '$.mode', record.mode) as VerifyLoopMode
  if (!VERIFY_LOOP_MODE_SET.has(mode)) {
    throwProtocolViolation(schemaName, '$.mode', `必须是 [${Array.from(VERIFY_LOOP_MODE_SET).join(', ')}]`)
  }

  const gateScope = assertNonEmptyString(schemaName, '$.gateScope', record.gateScope) as VerifyLoopGateScope
  if (!VERIFY_LOOP_SCOPE_SET.has(gateScope)) {
    throwProtocolViolation(schemaName, '$.gateScope', `必须是 [${Array.from(VERIFY_LOOP_SCOPE_SET).join(', ')}]`)
  }

  if (mode === 'resume') {
    assertNonEmptyString(schemaName, '$.previousRunId', record.previousRunId)
  }

  assertIntegerAtLeast(schemaName, '$.txnSeq', record.txnSeq, 1)
  assertIntegerAtLeast(schemaName, '$.opSeq', record.opSeq, 1)
  assertIntegerAtLeast(schemaName, '$.attemptSeq', record.attemptSeq, 1)

  const verdict = assertNonEmptyString(schemaName, '$.verdict', record.verdict) as VerifyLoopVerdict
  if (!VERIFY_LOOP_VERDICT_SET.has(verdict)) {
    throwProtocolViolation(schemaName, '$.verdict', `必须是 [${Array.from(VERIFY_LOOP_VERDICT_SET).join(', ')}]`)
  }

  assertEnumNumber(schemaName, '$.exitCode', record.exitCode, [0, 1, 2, 3, 4, 5])

  const gateResults = record.gateResults
  if (!Array.isArray(gateResults) || gateResults.length === 0) {
    throwProtocolViolation(schemaName, '$.gateResults', '必须是非空数组')
  }

  const gateResultItems = gateResults as ReadonlyArray<unknown>
  for (let i = 0; i < gateResultItems.length; i++) {
    assertVerifyLoopGateResult(schemaName, `$.gateResults[${i}]`, gateScope, gateResultItems[i])
  }

  assertNonEmptyString(schemaName, '$.reasonCode', record.reasonCode)

  const reasons = record.reasons
  if (!Array.isArray(reasons)) {
    throwProtocolViolation(schemaName, '$.reasons', '必须是数组')
  }
  const verifyReasonItems = reasons as ReadonlyArray<unknown>
  for (let i = 0; i < verifyReasonItems.length; i++) {
    assertReasonItem(schemaName, `$.reasons[${i}]`, verifyReasonItems[i])
  }

  const trajectory = record.trajectory
  if (!Array.isArray(trajectory)) {
    throwProtocolViolation(schemaName, '$.trajectory', '必须是数组')
  }
  const verifyTrajectoryItems = trajectory as ReadonlyArray<unknown>
  for (let i = 0; i < verifyTrajectoryItems.length; i++) {
    assertTrajectoryItem(schemaName, `$.trajectory[${i}]`, verifyTrajectoryItems[i])
  }
  if (mode === 'resume' && verifyTrajectoryItems.length < 2) {
    throwProtocolViolation(schemaName, '$.trajectory', 'resume 模式下至少需要两轮轨迹')
  }

  const nextActions = record.nextActions
  if (!Array.isArray(nextActions)) {
    throwProtocolViolation(schemaName, '$.nextActions', '必须是数组')
  }
  const verifyNextActionItems = nextActions as ReadonlyArray<unknown>
  for (let i = 0; i < verifyNextActionItems.length; i++) {
    assertVerifyLoopNextAction(schemaName, `$.nextActions[${i}]`, verifyNextActionItems[i])
  }

  const artifacts = record.artifacts
  if (!Array.isArray(artifacts)) {
    throwProtocolViolation(schemaName, '$.artifacts', '必须是数组')
  }
  const verifyArtifactItems = artifacts as ReadonlyArray<unknown>
  for (let i = 0; i < verifyArtifactItems.length; i++) {
    assertVerifyLoopArtifact(schemaName, `$.artifacts[${i}]`, verifyArtifactItems[i])
  }

  if (Object.prototype.hasOwnProperty.call(record, 'ext')) {
    assertRecord(schemaName, '$.ext', record.ext)
  }
}

const assertNextActionsExecutionResult = (schemaName: string, path: string, value: unknown): void => {
  const record = assertRecord(schemaName, path, value)
  assertKnownKeys(schemaName, path, record, NEXT_ACTIONS_EXECUTION_RESULT_KEYS)
  assertRequiredKeys(schemaName, path, record, ['id', 'action', 'status'])

  assertToken(schemaName, `${path}.id`, record.id)
  assertNonEmptyString(schemaName, `${path}.action`, record.action)

  const status = assertNonEmptyString(schemaName, `${path}.status`, record.status) as NextActionsExecutionStatus
  if (!NEXT_ACTIONS_EXECUTION_STATUS_SET.has(status)) {
    throwProtocolViolation(schemaName, `${path}.status`, `必须是 [${Array.from(NEXT_ACTIONS_EXECUTION_STATUS_SET).join(', ')}]`)
  }

  if (Object.prototype.hasOwnProperty.call(record, 'reason')) {
    assertNonEmptyString(schemaName, `${path}.reason`, record.reason)
  }

  if (Object.prototype.hasOwnProperty.call(record, 'command')) {
    assertNonEmptyString(schemaName, `${path}.command`, record.command)
  }

  if (Object.prototype.hasOwnProperty.call(record, 'exitCode')) {
    assertIntegerAtLeast(schemaName, `${path}.exitCode`, record.exitCode, 0)
  }

  if (Object.prototype.hasOwnProperty.call(record, 'rerun')) {
    const rerun = assertRecord(schemaName, `${path}.rerun`, record.rerun)
    assertKnownKeys(schemaName, `${path}.rerun`, rerun, NEXT_ACTIONS_EXECUTION_RERUN_KEYS)
    assertRequiredKeys(schemaName, `${path}.rerun`, rerun, ['runId', 'exitCode'])
    assertNonEmptyString(schemaName, `${path}.rerun.runId`, rerun.runId)
    assertEnumNumber(schemaName, `${path}.rerun.exitCode`, rerun.exitCode, [0, 1, 2, 3, 4, 5])
  }
}

export const assertNextActionsExecutionV1Schema = (value: unknown): void => {
  const schemaName = 'next-actions.execution@v1'
  const record = assertRecord(schemaName, '$', value)

  assertKnownKeys(schemaName, '$', record, NEXT_ACTIONS_EXECUTION_ROOT_KEYS)
  assertRequiredKeys(schemaName, '$', record, [
    'schemaVersion',
    'kind',
    'runId',
    'instanceId',
    'txnSeq',
    'opSeq',
    'attemptSeq',
    'sourceReportPath',
    'sourceReportDigest',
    'reportPath',
    'sourceReasonCode',
    'engine',
    'strict',
    'summary',
    'results',
  ])

  if (record.schemaVersion !== 1) {
    throwProtocolViolation(schemaName, '$.schemaVersion', '必须等于 1')
  }

  if (record.kind !== 'NextActionsExecution') {
    throwProtocolViolation(schemaName, '$.kind', "必须等于 'NextActionsExecution'")
  }

  assertNonEmptyString(schemaName, '$.runId', record.runId)
  assertToken(schemaName, '$.instanceId', record.instanceId)
  assertIntegerAtLeast(schemaName, '$.txnSeq', record.txnSeq, 1)
  assertIntegerAtLeast(schemaName, '$.opSeq', record.opSeq, 1)
  assertIntegerAtLeast(schemaName, '$.attemptSeq', record.attemptSeq, 1)
  assertNonEmptyString(schemaName, '$.sourceReportPath', record.sourceReportPath)

  const digest = assertNonEmptyString(schemaName, '$.sourceReportDigest', record.sourceReportDigest)
  if (!DIGEST_RE.test(digest)) {
    throwProtocolViolation(schemaName, '$.sourceReportDigest', `必须匹配 ${DIGEST_RE.source}`)
  }

  assertNonEmptyString(schemaName, '$.reportPath', record.reportPath)
  assertNonEmptyString(schemaName, '$.sourceReasonCode', record.sourceReasonCode)

  if (record.engine !== 'bootstrap') {
    throwProtocolViolation(schemaName, '$.engine', "必须等于 'bootstrap'")
  }

  assertBoolean(schemaName, '$.strict', record.strict)

  const summary = assertRecord(schemaName, '$.summary', record.summary)
  assertKnownKeys(schemaName, '$.summary', summary, NEXT_ACTIONS_EXECUTION_SUMMARY_KEYS)
  assertRequiredKeys(schemaName, '$.summary', summary, ['executed', 'failed', 'noOp'])

  assertIntegerAtLeast(schemaName, '$.summary.executed', summary.executed, 0)
  assertIntegerAtLeast(schemaName, '$.summary.failed', summary.failed, 0)
  assertIntegerAtLeast(schemaName, '$.summary.noOp', summary.noOp, 0)

  const results = record.results
  if (!Array.isArray(results)) {
    throwProtocolViolation(schemaName, '$.results', '必须是数组')
  }

  const executionResults = results as ReadonlyArray<unknown>
  for (let i = 0; i < executionResults.length; i++) {
    assertNextActionsExecutionResult(schemaName, `$.results[${i}]`, executionResults[i])
  }
}

export const assertVerificationChainCatalogV1Schema = (value: unknown): void => {
  const schemaName = 'verification-chain-catalog@v1'
  const record = assertRecord(schemaName, '$', value)

  assertKnownKeys(schemaName, '$', record, VERIFICATION_CHAIN_CATALOG_ROOT_KEYS)
  assertRequiredKeys(schemaName, '$', record, ['schemaVersion', 'kind', 'source', 'chains'])

  if (record.schemaVersion !== 1) {
    throwProtocolViolation(schemaName, '$.schemaVersion', '必须等于 1')
  }
  if (record.kind !== 'VerificationChainCatalog') {
    throwProtocolViolation(schemaName, '$.kind', "必须等于 'VerificationChainCatalog'")
  }
  if (record.source !== 'primitives.capability-model.v1') {
    throwProtocolViolation(schemaName, '$.source', "必须等于 'primitives.capability-model.v1'")
  }

  const chains = record.chains
  if (!Array.isArray(chains) || chains.length === 0) {
    throwProtocolViolation(schemaName, '$.chains', '必须是非空数组')
  }

  const seenIds = new Set<string>()
  const chainItems = chains as ReadonlyArray<unknown>
  for (let i = 0; i < chainItems.length; i++) {
    const path = `$.chains[${i}]`
    const chain = assertRecord(schemaName, path, chainItems[i])
    assertKnownKeys(schemaName, path, chain, VERIFICATION_CHAIN_TEMPLATE_KEYS)
    assertRequiredKeys(schemaName, path, chain, ['id', 'purpose', 'commandSteps'])

    const id = assertNonEmptyString(schemaName, `${path}.id`, chain.id) as DescribeAgentGuidanceId
    if (!DESCRIBE_AGENT_CHAIN_ID_SET.has(id)) {
      throwProtocolViolation(schemaName, `${path}.id`, '不是允许的 guidance id')
    }
    if (seenIds.has(id)) {
      throwProtocolViolation(schemaName, `${path}.id`, `出现重复 id '${id}'`)
    }
    seenIds.add(id)

    assertNonEmptyString(schemaName, `${path}.purpose`, chain.purpose)
    const commandSteps = assertStringMatrix(schemaName, `${path}.commandSteps`, chain.commandSteps)
    if (commandSteps.length === 0) {
      throwProtocolViolation(schemaName, `${path}.commandSteps`, '至少包含一个步骤')
    }
  }
}

export const assertDescribeReportV1Schema = (value: unknown): void => {
  const schemaName = 'describe.report@v1'
  const record = assertRecord(schemaName, '$', value)

  assertKnownKeys(schemaName, '$', record, DESCRIBE_REPORT_ROOT_KEYS)
  assertRequiredKeys(schemaName, '$', record, [
    'schemaVersion',
    'kind',
    'nonGoals',
    'agentGuidance',
    'protocol',
    'commands',
    'runtimeExecutableTruth',
    'migrationEntries',
    'configVisibility',
  ])

  if (record.schemaVersion !== 1) {
    throwProtocolViolation(schemaName, '$.schemaVersion', '必须等于 1')
  }
  if (record.kind !== 'CliDescribeReport') {
    throwProtocolViolation(schemaName, '$.kind', "必须等于 'CliDescribeReport'")
  }

  assertStringArray(schemaName, '$.nonGoals', record.nonGoals)
  assertDescribeAgentGuidance(schemaName, '$.agentGuidance', record.agentGuidance)

  const protocol = assertRecord(schemaName, '$.protocol', record.protocol)
  assertKnownKeys(schemaName, '$.protocol', protocol, DESCRIBE_PROTOCOL_KEYS)
  assertRequiredKeys(schemaName, '$.protocol', protocol, ['commandResultSchemaRef', 'reasonCodeCatalogRef', 'exitCodes'])
  assertNonEmptyString(schemaName, '$.protocol.commandResultSchemaRef', protocol.commandResultSchemaRef)
  assertNonEmptyString(schemaName, '$.protocol.reasonCodeCatalogRef', protocol.reasonCodeCatalogRef)
  if (!Array.isArray(protocol.exitCodes) || protocol.exitCodes.length === 0) {
    throwProtocolViolation(schemaName, '$.protocol.exitCodes', '必须是非空数组')
  }
  const exitCodes = protocol.exitCodes as ReadonlyArray<unknown>
  for (let i = 0; i < exitCodes.length; i++) {
    const exitPath = `$.protocol.exitCodes[${i}]`
    const exitItem = assertRecord(schemaName, exitPath, exitCodes[i])
    assertKnownKeys(schemaName, exitPath, exitItem, DESCRIBE_EXIT_CODE_KEYS)
    assertRequiredKeys(schemaName, exitPath, exitItem, ['code', 'meaning'])
    assertEnumNumber(schemaName, `${exitPath}.code`, exitItem.code, [0, 1, 2, 3, 4, 5])
    assertNonEmptyString(schemaName, `${exitPath}.meaning`, exitItem.meaning)
  }

  if (!Array.isArray(record.commands)) {
    throwProtocolViolation(schemaName, '$.commands', '必须是数组')
  }
  const commands = record.commands as ReadonlyArray<unknown>
  for (let i = 0; i < commands.length; i++) {
    const commandPath = `$.commands[${i}]`
    const commandItem = assertRecord(schemaName, commandPath, commands[i])
    assertNonEmptyString(schemaName, `${commandPath}.name`, commandItem.name)
  }

  const runtimeTruth = assertRecord(schemaName, '$.runtimeExecutableTruth', record.runtimeExecutableTruth)
  assertKnownKeys(schemaName, '$.runtimeExecutableTruth', runtimeTruth, DESCRIBE_RUNTIME_TRUTH_KEYS)
  assertRequiredKeys(schemaName, '$.runtimeExecutableTruth', runtimeTruth, [
    'source',
    'executableCommandNames',
    'migrationCommandNames',
    'unavailableCommandNames',
  ])
  if (runtimeTruth.source !== 'command-registry.availability') {
    throwProtocolViolation(schemaName, '$.runtimeExecutableTruth.source', "必须等于 'command-registry.availability'")
  }
  assertStringArray(schemaName, '$.runtimeExecutableTruth.executableCommandNames', runtimeTruth.executableCommandNames)
  assertStringArray(schemaName, '$.runtimeExecutableTruth.migrationCommandNames', runtimeTruth.migrationCommandNames)
  assertStringArray(schemaName, '$.runtimeExecutableTruth.unavailableCommandNames', runtimeTruth.unavailableCommandNames)

  if (!Array.isArray(record.migrationEntries)) {
    throwProtocolViolation(schemaName, '$.migrationEntries', '必须是数组')
  }
  const migrationEntries = record.migrationEntries as ReadonlyArray<unknown>
  for (let i = 0; i < migrationEntries.length; i++) {
    const migrationPath = `$.migrationEntries[${i}]`
    const item = assertRecord(schemaName, migrationPath, migrationEntries[i])
    assertKnownKeys(schemaName, migrationPath, item, DESCRIBE_MIGRATION_ENTRY_KEYS)
    assertRequiredKeys(schemaName, migrationPath, item, ['command', 'replacementHint'])
    assertNonEmptyString(schemaName, `${migrationPath}.command`, item.command)
    assertNonEmptyString(schemaName, `${migrationPath}.replacementHint`, item.replacementHint)
  }

  const configVisibility = assertRecord(schemaName, '$.configVisibility', record.configVisibility)
  assertKnownKeys(schemaName, '$.configVisibility', configVisibility, DESCRIBE_CONFIG_VISIBILITY_KEYS)
  assertRequiredKeys(schemaName, '$.configVisibility', configVisibility, [
    'precedence',
    'argv',
    'argvWithConfigPrefix',
    'layers',
    'effective',
    'overrideTrail',
    'discovery',
  ])

  const precedence = assertStringArray(schemaName, '$.configVisibility.precedence', configVisibility.precedence)
  const expectedPrecedence = ['defaults', 'profile', 'env', 'argv']
  if (precedence.length !== expectedPrecedence.length || precedence.some((value, index) => value !== expectedPrecedence[index])) {
    throwProtocolViolation(schemaName, '$.configVisibility.precedence', `必须等于 [${expectedPrecedence.join(', ')}]`)
  }
  assertStringArrayLoose(schemaName, '$.configVisibility.argv', configVisibility.argv)
  assertStringArrayLoose(schemaName, '$.configVisibility.argvWithConfigPrefix', configVisibility.argvWithConfigPrefix)
  if (!Array.isArray(configVisibility.layers)) {
    throwProtocolViolation(schemaName, '$.configVisibility.layers', '必须是数组')
  }
  if (!Array.isArray(configVisibility.effective)) {
    throwProtocolViolation(schemaName, '$.configVisibility.effective', '必须是数组')
  }
  const effectiveItems = configVisibility.effective as ReadonlyArray<unknown>
  for (let i = 0; i < effectiveItems.length; i++) {
    assertRecord(schemaName, `$.configVisibility.effective[${i}]`, effectiveItems[i])
  }
  if (!Array.isArray(configVisibility.overrideTrail)) {
    throwProtocolViolation(schemaName, '$.configVisibility.overrideTrail', '必须是数组')
  }
  const overrideTrail = configVisibility.overrideTrail as ReadonlyArray<unknown>
  for (let i = 0; i < overrideTrail.length; i++) {
    assertRecord(schemaName, `$.configVisibility.overrideTrail[${i}]`, overrideTrail[i])
  }
  assertRecord(schemaName, '$.configVisibility.discovery', configVisibility.discovery)

  if (Object.prototype.hasOwnProperty.call(record, 'ext')) {
    const ext = assertRecord(schemaName, '$.ext', record.ext)
    assertKnownKeys(schemaName, '$.ext', ext, DESCRIBE_EXT_KEYS)
    const internal = assertRecord(schemaName, '$.ext.internal', ext.internal)
    assertKnownKeys(schemaName, '$.ext.internal', internal, DESCRIBE_EXT_INTERNAL_KEYS)
    const orchestration = assertRecord(schemaName, '$.ext.internal.orchestration', internal.orchestration)
    assertKnownKeys(schemaName, '$.ext.internal.orchestration', orchestration, DESCRIBE_EXT_ORCHESTRATION_KEYS)
    assertRequiredKeys(schemaName, '$.ext.internal.orchestration', orchestration, [
      'source',
      'contractRef',
      'remediationMapRef',
      'scenarios',
    ])
    assertNonEmptyString(schemaName, '$.ext.internal.orchestration.source', orchestration.source)
    assertNonEmptyString(schemaName, '$.ext.internal.orchestration.contractRef', orchestration.contractRef)
    assertNonEmptyString(schemaName, '$.ext.internal.orchestration.remediationMapRef', orchestration.remediationMapRef)
    if (!Array.isArray(orchestration.scenarios)) {
      throwProtocolViolation(schemaName, '$.ext.internal.orchestration.scenarios', '必须是数组')
    }
    const scenarios = orchestration.scenarios as ReadonlyArray<unknown>
    for (let i = 0; i < scenarios.length; i++) {
      const scenarioPath = `$.ext.internal.orchestration.scenarios[${i}]`
      const scenario = assertRecord(schemaName, scenarioPath, scenarios[i])
      assertKnownKeys(schemaName, scenarioPath, scenario, DESCRIBE_EXT_SCENARIO_KEYS)
      assertRequiredKeys(schemaName, scenarioPath, scenario, ['id', 'recommendedPrimitiveChain'])
      assertNonEmptyString(schemaName, `${scenarioPath}.id`, scenario.id)
      assertStringArray(schemaName, `${scenarioPath}.recommendedPrimitiveChain`, scenario.recommendedPrimitiveChain)
    }
  }
}
