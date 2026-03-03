import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync } from 'node:fs'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const scriptDir = path.dirname(scriptPath)
const defaultRepoRoot = path.resolve(scriptDir, '../../..')

const defaults = {
  runIdPrefix: 'autonomous-loop',
  outDir: path.resolve(defaultRepoRoot, '.artifacts/autonomous-loop'),
  entry: 'examples/logix/src/runtime/root.impl.ts#RootImpl',
  repoRoot: defaultRepoRoot,
  verifyTarget: 'examples/logix',
  gateScope: 'governance',
  maxAttempts: 3,
  allowFixture: false,
}

const VERDICT_BY_EXIT_CODE = {
  0: 'PASS',
  1: 'ERROR',
  2: 'VIOLATION',
  3: 'RETRYABLE',
  4: 'NOT_IMPLEMENTED',
  5: 'NO_PROGRESS',
}

const FINAL_VERDICT_BY_VERIFY_EXIT_CODE = {
  0: 'PASS',
  1: 'INFRA_FLAKY',
  2: 'FAIL_HARD',
  3: 'FAIL_SOFT',
  4: 'BLOCKED',
  5: 'INFRA_FLAKY',
}

const FINAL_EXIT_CODE_BY_VERDICT = {
  PASS: 0,
  FAIL_HARD: 2,
  FAIL_SOFT: 3,
  BLOCKED: 4,
  INFRA_FLAKY: 1,
}

const resolveAutonomousLoopExitCode = (args) => {
  if (Number.isInteger(args.verifyExitCode) && args.verifyExitCode >= 0) {
    return args.verifyExitCode
  }
  return FINAL_EXIT_CODE_BY_VERDICT[args.finalVerdict] ?? 1
}

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return parsed
}

const ATTEMPT_SUFFIX_RE = /-attempt-(\d+)$/u

const makeResumeRunIdFromPreviousRunId = (previousRunId) => {
  const trimmed = typeof previousRunId === 'string' ? previousRunId.trim() : ''
  if (trimmed.length === 0) {
    throw new Error('[autonomous-loop] verify resume 缺少 previousRunId，无法推导 runId')
  }

  const matched = trimmed.match(ATTEMPT_SUFFIX_RE)
  if (!matched) return `${trimmed}-attempt-2`
  const previousAttemptSeq = Number.parseInt(matched[1] ?? '', 10)
  if (!Number.isInteger(previousAttemptSeq) || previousAttemptSeq < 1) return `${trimmed}-attempt-2`
  return `${trimmed.slice(0, -matched[0].length)}-attempt-${previousAttemptSeq + 1}`
}

const toPosixPath = (value) => value.split(path.sep).join('/')

const relativeToOutDir = (outDir, filePath) => toPosixPath(path.relative(outDir, filePath))

const parseArgs = () => {
  const argv = process.argv.slice(2)
  const parsed = { ...defaults }

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]

    if (!token.startsWith('--')) {
      throw new Error(`[autonomous-loop] 未知参数：${token}`)
    }

    if (token === '--allowFixture') {
      parsed.allowFixture = true
      continue
    }

    const next = argv[i + 1]
    if (typeof next !== 'string' || next.startsWith('--')) {
      throw new Error(`[autonomous-loop] 参数缺值：${token}`)
    }

    if (token === '--runIdPrefix') parsed.runIdPrefix = next
    else if (token === '--outDir') parsed.outDir = path.resolve(process.cwd(), next)
    else if (token === '--entry') parsed.entry = next
    else if (token === '--repoRoot') parsed.repoRoot = path.resolve(process.cwd(), next)
    else if (token === '--verifyTarget') parsed.verifyTarget = next
    else if (token === '--gateScope' && (next === 'runtime' || next === 'governance')) parsed.gateScope = next
    else if (token === '--maxAttempts') parsed.maxAttempts = parsePositiveInteger(next, defaults.maxAttempts)
    else throw new Error(`[autonomous-loop] 不支持的参数：${token}`)

    i += 1
  }

  return parsed
}

const isFixtureVerifyTarget = (target) => target.trim().toLowerCase().startsWith('fixture:')

const parseCommandResult = (stdoutText) => {
  const lines = stdoutText
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      const parsed = JSON.parse(lines[i])
      if (parsed && parsed.kind === 'CommandResult') return parsed
    } catch {
      continue
    }
  }

  throw new Error('[autonomous-loop] 无法从 CLI stdout 解析 CommandResult')
}

const parseNextActionsFromUnknown = (value) => {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id.trim() : '',
      action: typeof item.action === 'string' ? item.action.trim() : '',
      args: item.args && typeof item.args === 'object' && !Array.isArray(item.args) ? item.args : {},
      ifReasonCodes: Array.isArray(item.ifReasonCodes)
        ? item.ifReasonCodes.filter((code) => typeof code === 'string' && code.trim().length > 0)
        : [],
    }))
    .filter((item) => item.id.length > 0 && item.action.length > 0)
}

const parsePositiveIntField = (stepName, field, value) => {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1) return value
  throw new Error(`[autonomous-loop] step=${stepName} CommandResult.${field} 非法`)
}

const parseIdentityFromCommandResult = (stepName, result) => {
  const instanceId = typeof result.instanceId === 'string' ? result.instanceId.trim() : ''
  if (instanceId.length === 0) {
    throw new Error(`[autonomous-loop] step=${stepName} CommandResult.instanceId 缺失`)
  }

  return {
    instanceId,
    txnSeq: parsePositiveIntField(stepName, 'txnSeq', result.txnSeq),
    opSeq: parsePositiveIntField(stepName, 'opSeq', result.opSeq),
    attemptSeq: parsePositiveIntField(stepName, 'attemptSeq', result.attemptSeq),
  }
}

const assertResultReportIdentityConsistent = (args) => {
  const pairs = [
    ['instanceId', args.resultIdentity.instanceId, args.reportIdentity.instanceId],
    ['txnSeq', args.resultIdentity.txnSeq, args.reportIdentity.txnSeq],
    ['opSeq', args.resultIdentity.opSeq, args.reportIdentity.opSeq],
    ['attemptSeq', args.resultIdentity.attemptSeq, args.reportIdentity.attemptSeq],
  ]

  for (const [field, expected, actual] of pairs) {
    if (expected === actual) continue
    throw new Error(
      `[autonomous-loop] step=${args.stepName} identity 漂移（field=${field}, result=${String(expected)}, report=${String(actual)}）`,
    )
  }
}

const readVerifyLoopReportFromDisk = async (args) => {
  const reportPath = path.resolve(args.stepOutDir, 'verify-loop.report.json')

  if (typeof args.minMtimeMs === 'number') {
    try {
      const meta = await stat(reportPath)
      if (meta.mtimeMs + 1 < args.minMtimeMs) {
        throw new Error(
          `[autonomous-loop] step=${args.stepName} verify-loop report 疑似陈旧产物（mtime=${meta.mtimeMs.toFixed(3)}, startedAt=${args.minMtimeMs.toFixed(3)}）`,
        )
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      throw new Error(`[autonomous-loop] step=${args.stepName} 无法校验 verify-loop report 时间戳（${reportPath}）：${detail}`)
    }
  }

  let parsed
  try {
    const reportText = await readFile(reportPath, 'utf8')
    parsed = JSON.parse(reportText)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`[autonomous-loop] step=${args.stepName} 无法读取 verify-loop report（${reportPath}）：${detail}`)
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`[autonomous-loop] step=${args.stepName} report 非对象：${reportPath}`)
  }

  const kind = typeof parsed.kind === 'string' ? parsed.kind : ''
  if (kind !== 'VerifyLoopReport') {
    throw new Error(`[autonomous-loop] step=${args.stepName} report kind 非法（expected=VerifyLoopReport, actual=${kind || 'N/A'}）`)
  }

  const runId = typeof parsed.runId === 'string' ? parsed.runId.trim() : ''
  if (runId.length === 0) {
    throw new Error(`[autonomous-loop] step=${args.stepName} report 缺少 runId：${reportPath}`)
  }

  if (runId !== args.expectedRunId) {
    throw new Error(`[autonomous-loop] step=${args.stepName} report runId 漂移（expected=${args.expectedRunId}, actual=${runId}）`)
  }

  const instanceId = typeof parsed.instanceId === 'string' ? parsed.instanceId.trim() : ''
  if (instanceId.length === 0) {
    throw new Error(`[autonomous-loop] step=${args.stepName} report 缺少 instanceId：${reportPath}`)
  }

  const mode = parsed.mode === 'run' || parsed.mode === 'resume' ? parsed.mode : undefined
  if (!mode) {
    throw new Error(`[autonomous-loop] step=${args.stepName} report mode 非法：${reportPath}`)
  }

  const parsePositiveInteger = (field, value) => {
    if (typeof value === 'number' && Number.isInteger(value) && value >= 1) return value
    throw new Error(`[autonomous-loop] step=${args.stepName} report ${field} 非法：${reportPath}`)
  }

  const txnSeq = parsePositiveInteger('txnSeq', parsed.txnSeq)
  const opSeq = parsePositiveInteger('opSeq', parsed.opSeq)
  const attemptSeq = parsePositiveInteger('attemptSeq', parsed.attemptSeq)

  const verdict = typeof parsed.verdict === 'string' ? parsed.verdict.trim() : ''
  const reasonCode = typeof parsed.reasonCode === 'string' ? parsed.reasonCode.trim() : ''
  const trajectory = Array.isArray(parsed.trajectory)
    ? parsed.trajectory
        .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
        .map((item) => ({
          attemptSeq: Number(item.attemptSeq),
          reasonCode: typeof item.reasonCode === 'string' ? item.reasonCode.trim() : '',
        }))
        .filter((item) => Number.isInteger(item.attemptSeq) && item.attemptSeq >= 1 && item.reasonCode.length > 0)
    : []

  if (trajectory.length === 0) {
    throw new Error(`[autonomous-loop] step=${args.stepName} report trajectory 不能为空：${reportPath}`)
  }

  return {
    runId,
    mode,
    instanceId,
    txnSeq,
    opSeq,
    attemptSeq,
    trajectory,
    verdict,
    reasonCode,
    nextActions: parseNextActionsFromUnknown(parsed.nextActions),
  }
}

const CANONICAL_ACTION = {
  RUN_COMMAND: 'run-command',
  RERUN: 'rerun',
  INSPECT: 'inspect',
  STOP: 'stop',
}

const actionMatchesReasonCode = (nextAction, reasonCode) =>
  nextAction.ifReasonCodes.length === 0 || nextAction.ifReasonCodes.includes(reasonCode)

const parseNonEmptyString = (value) => (typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined)

const executeCanonicalAction = (args) => {
  const { nextAction, currentTarget, currentRunId, currentInstanceId, repoRoot } = args

  if (nextAction.action === CANONICAL_ACTION.RERUN) {
    const target = parseNonEmptyString(nextAction.args.target)
    if (!target) {
      return {
        continueLoop: false,
        decision: `error:${nextAction.action}:${nextAction.id}:missing-args.target`,
        protocolError: true,
      }
    }

    const mode = parseNonEmptyString(nextAction.args.mode)
    const rerunMode = mode === 'run' || mode === 'resume' ? mode : 'resume'
    return {
      continueLoop: true,
      decision: `continue:${nextAction.action}:${nextAction.id}`,
      protocolError: false,
      nextMode: rerunMode,
      nextTarget: target,
      nextRunId: parseNonEmptyString(nextAction.args.runId),
      nextPreviousRunId: parseNonEmptyString(nextAction.args.previousRunId) ?? currentRunId,
      nextInstanceId: parseNonEmptyString(nextAction.args.instanceId) ?? currentInstanceId,
    }
  }

  if (nextAction.action === CANONICAL_ACTION.RUN_COMMAND) {
    const command = parseNonEmptyString(nextAction.args.command)
    if (!command) {
      return {
        continueLoop: false,
        decision: `error:${nextAction.action}:${nextAction.id}:missing-args.command`,
        protocolError: true,
      }
    }

    const run = spawnSync(command, {
      cwd: repoRoot,
      env: process.env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    })
    const exitCode = typeof run.status === 'number' ? run.status : 1

    if (run.error || exitCode !== 0) {
      return {
        continueLoop: false,
        decision: `stop:${CANONICAL_ACTION.RUN_COMMAND}:${nextAction.id}:exit-${exitCode}`,
        protocolError: false,
      }
    }

    return {
      continueLoop: true,
      decision: `continue:${CANONICAL_ACTION.RUN_COMMAND}:${nextAction.id}`,
      protocolError: false,
      nextMode: 'resume',
      nextTarget: currentTarget,
      nextPreviousRunId: currentRunId,
      nextInstanceId: currentInstanceId,
    }
  }

  if (nextAction.action === CANONICAL_ACTION.INSPECT || nextAction.action === CANONICAL_ACTION.STOP) {
    return {
      continueLoop: false,
      decision: `stop:${nextAction.action}:${nextAction.id}`,
      protocolError: false,
    }
  }

  return {
    continueLoop: false,
    decision: `error:unknown-action:${nextAction.action}`,
    protocolError: true,
  }
}

const decideVerifyNextAction = (args) => {
  const { verdict, reasonCode, nextActions, currentTarget, currentRunId, currentInstanceId, repoRoot } = args

  if (verdict === 'PASS') {
    return {
      continueLoop: false,
      decision: 'stop:pass',
      protocolError: false,
    }
  }

  const executableActions = nextActions.filter((nextAction) => actionMatchesReasonCode(nextAction, reasonCode))
  if (executableActions.length === 0) {
    return {
      continueLoop: false,
      decision: 'stop:no-matching-next-action',
      protocolError: false,
    }
  }

  return executeCanonicalAction({
    nextAction: executableActions[0],
    currentTarget,
    currentRunId,
    currentInstanceId,
    repoRoot,
  })
}

const makeCliRunner = (repoRoot) => {
  const cliSrcBin = path.resolve(repoRoot, 'packages/logix-cli/src/bin/logix.ts')
  const cliDistBin = path.resolve(repoRoot, 'packages/logix-cli/dist/bin/logix.js')

  if (existsSync(cliSrcBin)) {
    const probe = spawnSync(process.execPath, ['--import', 'tsx/esm', cliSrcBin, '--help'], {
      cwd: repoRoot,
      env: process.env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    if (!probe.error && probe.status === 0) {
      return {
        command: process.execPath,
        baseArgs: ['--import', 'tsx/esm', cliSrcBin],
        label: 'source(tsx)',
      }
    }
  }

  if (existsSync(cliDistBin)) {
    return {
      command: process.execPath,
      baseArgs: [cliDistBin],
      label: 'dist',
    }
  }

  throw new Error('[autonomous-loop] 未找到可执行 CLI runner（src/dist 都不可用）')
}

const runCommand = (args) => {
  const startedAtMs = Date.now()
  mkdirSync(args.stepOutDir, { recursive: true })

  const run = spawnSync(args.runner.command, [...args.runner.baseArgs, ...args.commandArgs], {
    cwd: args.repoRoot,
    env: process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  if (run.error) throw run.error

  const result = parseCommandResult(run.stdout ?? '')
  const exitCode = typeof result.exitCode === 'number' ? result.exitCode : typeof run.status === 'number' ? run.status : 1
  const reasonCode = typeof result.reasonCode === 'string' ? result.reasonCode : 'CLI_PROTOCOL_VIOLATION'
  const verdict = Object.prototype.hasOwnProperty.call(VERDICT_BY_EXIT_CODE, exitCode) ? VERDICT_BY_EXIT_CODE[exitCode] : 'ERROR'
  const identity = parseIdentityFromCommandResult(args.stepName, result)

  const step = {
    name: args.stepName,
    runId: args.runId,
    command: args.commandName,
    mode: args.mode,
    outDir: relativeToOutDir(args.rootOutDir, args.stepOutDir),
    exitCode,
    verdict,
    reasonCode,
    identity,
    reasons: Array.isArray(result.reasons)
      ? result.reasons
          .map((item) => (item && typeof item.code === 'string' ? item.code : undefined))
          .filter((code) => typeof code === 'string' && code.length > 0)
      : [],
  }

  process.stdout.write(
    `[autonomous-loop] step=${step.name} runId=${step.runId} verdict=${step.verdict} reasonCode=${step.reasonCode} exitCode=${step.exitCode} out=${step.outDir}\n`,
  )

  Object.defineProperty(step, '__startedAtMs', {
    value: startedAtMs,
    writable: false,
    enumerable: false,
    configurable: false,
  })

  return step
}

const ensurePass = (step) => {
  if (step.exitCode !== 0) {
    throw new Error(`[autonomous-loop] step=${step.name} 未通过（reasonCode=${step.reasonCode}, exitCode=${step.exitCode}）`)
  }
}

const writeTransformOpsFile = async (opsFilePath) => {
  const ops = [
    {
      op: 'insert',
      file: 'examples/logix/src/scenarios/autonomous-loop.fixture.ts',
      pointer: '/generated/0',
      value: { kind: 'marker', value: 'autonomous-loop' },
    },
  ]

  await writeFile(opsFilePath, `${JSON.stringify(ops, null, 2)}\n`, 'utf8')
}

const writeContractCliConfig = async (configPath) => {
  const config = {
    schemaVersion: 1,
    profiles: {
      contract: {},
    },
  }

  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
}

const sha256OfFile = async (filePath) => {
  const content = await readFile(filePath)
  return createHash('sha256').update(content).digest('hex')
}

const writeChecksums = async (args) => {
  const targets = args.targets
    .map((filePath) => path.resolve(filePath))
    .sort((a, b) => a.localeCompare(b))

  const lines = []
  for (const filePath of targets) {
    if (!existsSync(filePath)) {
      throw new Error(`[autonomous-loop] checksum 目标文件不存在：${filePath}`)
    }
    const hash = await sha256OfFile(filePath)
    lines.push(`${hash}  ${relativeToOutDir(args.outDir, filePath)}`)
  }

  await writeFile(args.outputFile, `${lines.join('\n')}\n`, 'utf8')
}

const main = async () => {
  const options = parseArgs()
  process.stdout.write(`[autonomous-loop] config gateScope=${options.gateScope}\n`)
  if (isFixtureVerifyTarget(options.verifyTarget) && !options.allowFixture) {
    throw new Error(
      `[autonomous-loop] verifyTarget=${options.verifyTarget} 属于 fixture target，默认禁用；如需使用请显式传 --allowFixture`,
    )
  }
  const runner = makeCliRunner(options.repoRoot)

  const describeOutDir = path.resolve(options.outDir, '01-describe')
  const bundleOutDir = path.resolve(options.outDir, '02-bundle')
  const validateOutDir = path.resolve(options.outDir, '03-ir-validate')
  const diffOutDir = path.resolve(options.outDir, '04-ir-diff')
  const transformOutDir = path.resolve(options.outDir, '05-transform-module')
  const verifyRunOutDir = path.resolve(options.outDir, '06-verify-loop-run')
  const verifyResumeOutDir = path.resolve(options.outDir, '07-verify-loop-resume')
  const cliConfigPath = path.resolve(options.outDir, 'logix.cli.json')

  const transformOpsPath = path.resolve(transformOutDir, 'transform.ops.json')

  await mkdir(options.outDir, { recursive: true })
  await mkdir(transformOutDir, { recursive: true })
  await writeTransformOpsFile(transformOpsPath)
  await writeContractCliConfig(cliConfigPath)

  const steps = []

  const describeStep = runCommand({
    runner,
    repoRoot: options.repoRoot,
    rootOutDir: options.outDir,
    stepName: 'describe',
    commandName: 'describe',
    mode: 'run',
    runId: `${options.runIdPrefix}-describe`,
    stepOutDir: describeOutDir,
    commandArgs: ['describe', '--runId', `${options.runIdPrefix}-describe`, '--json', '--out', describeOutDir],
  })
  steps.push(describeStep)
  ensurePass(describeStep)

  const irExportStep = runCommand({
    runner,
    repoRoot: options.repoRoot,
    rootOutDir: options.outDir,
    stepName: 'ir-export',
    commandName: 'ir.export',
    mode: 'run',
    runId: `${options.runIdPrefix}-ir-export`,
    stepOutDir: bundleOutDir,
    commandArgs: [
      'ir',
      'export',
      '--runId',
      `${options.runIdPrefix}-ir-export`,
      '--entry',
      options.entry,
      '--with-anchors',
      '--out',
      bundleOutDir,
    ],
  })
  steps.push(irExportStep)
  ensurePass(irExportStep)

  const trialrunStep = runCommand({
    runner,
    repoRoot: options.repoRoot,
    rootOutDir: options.outDir,
    stepName: 'trialrun-evidence',
    commandName: 'trialrun',
    mode: 'run',
    runId: `${options.runIdPrefix}-trialrun`,
    stepOutDir: bundleOutDir,
    commandArgs: [
      'trialrun',
      '--runId',
      `${options.runIdPrefix}-trialrun`,
      '--entry',
      options.entry,
      '--emit',
      'evidence',
      '--out',
      bundleOutDir,
    ],
  })
  steps.push(trialrunStep)
  ensurePass(trialrunStep)

  const validateStep = runCommand({
    runner,
    repoRoot: options.repoRoot,
    rootOutDir: options.outDir,
    stepName: 'ir-validate-contract',
    commandName: 'ir.validate',
    mode: 'run',
    runId: `${options.runIdPrefix}-ir-validate`,
    stepOutDir: validateOutDir,
    commandArgs: [
      'ir',
      'validate',
      '--runId',
      `${options.runIdPrefix}-ir-validate`,
      '--in',
      bundleOutDir,
      '--cliConfig',
      cliConfigPath,
      '--profile',
      'contract',
      '--out',
      validateOutDir,
    ],
  })
  steps.push(validateStep)
  ensurePass(validateStep)

  const irDiffStep = runCommand({
    runner,
    repoRoot: options.repoRoot,
    rootOutDir: options.outDir,
    stepName: 'ir-diff',
    commandName: 'ir.diff',
    mode: 'run',
    runId: `${options.runIdPrefix}-ir-diff`,
    stepOutDir: diffOutDir,
    commandArgs: [
      'ir',
      'diff',
      '--runId',
      `${options.runIdPrefix}-ir-diff`,
      '--before',
      bundleOutDir,
      '--after',
      bundleOutDir,
      '--out',
      diffOutDir,
    ],
  })
  steps.push(irDiffStep)
  ensurePass(irDiffStep)

  const transformStep = runCommand({
    runner,
    repoRoot: options.repoRoot,
    rootOutDir: options.outDir,
    stepName: 'transform-module-report',
    commandName: 'transform.module',
    mode: 'report',
    runId: `${options.runIdPrefix}-transform-module`,
    stepOutDir: transformOutDir,
    commandArgs: [
      'transform',
      'module',
      '--runId',
      `${options.runIdPrefix}-transform-module`,
      '--ops',
      transformOpsPath,
      '--mode',
      'report',
      '--repoRoot',
      options.repoRoot,
      '--out',
      transformOutDir,
    ],
  })
  steps.push(transformStep)
  ensurePass(transformStep)

  const verifyRunStep = runCommand({
    runner,
    repoRoot: options.repoRoot,
    rootOutDir: options.outDir,
    stepName: 'verify-loop-run',
    commandName: 'verify-loop',
    mode: 'run',
    runId: `${options.runIdPrefix}-verify-loop-run`,
    stepOutDir: verifyRunOutDir,
    commandArgs: [
      'verify-loop',
      '--runId',
      `${options.runIdPrefix}-verify-loop-run`,
      '--mode',
      'run',
      '--target',
      options.verifyTarget,
      '--gateScope',
      options.gateScope,
      '--maxAttempts',
      String(options.maxAttempts),
      '--out',
      verifyRunOutDir,
    ],
  })
  steps.push(verifyRunStep)
  const verifyRunReport = await readVerifyLoopReportFromDisk({
    stepName: verifyRunStep.name,
    stepOutDir: verifyRunOutDir,
    expectedRunId: verifyRunStep.runId,
    minMtimeMs: verifyRunStep.__startedAtMs,
  })
  assertResultReportIdentityConsistent({
    stepName: verifyRunStep.name,
    resultIdentity: verifyRunStep.identity,
    reportIdentity: verifyRunReport,
  })
  const verifyIdentityChain = [
    {
      runId: verifyRunReport.runId,
      mode: verifyRunReport.mode,
      instanceId: verifyRunStep.identity.instanceId,
      txnSeq: verifyRunStep.identity.txnSeq,
      opSeq: verifyRunStep.identity.opSeq,
      attemptSeq: verifyRunStep.identity.attemptSeq,
      reasonCode: verifyRunReport.reasonCode,
      trajectory: verifyRunReport.trajectory,
    },
  ]

  const verifyDecision = decideVerifyNextAction({
    verdict: verifyRunReport.verdict || verifyRunStep.verdict,
    reasonCode: verifyRunReport.reasonCode || verifyRunStep.reasonCode,
    nextActions: verifyRunReport.nextActions,
    currentTarget: options.verifyTarget,
    currentRunId: verifyRunStep.runId,
    currentInstanceId: verifyRunReport.instanceId,
    repoRoot: options.repoRoot,
  })

  process.stdout.write(`[autonomous-loop] verify decision=${verifyDecision.decision}\n`)

  if (verifyDecision.protocolError) {
    throw new Error(`[autonomous-loop] canonical DSL 协议错误：${verifyDecision.decision}`)
  }

  let finalVerifyStep = verifyRunStep
  let finalVerifyOutDir = verifyRunOutDir
  let finalVerifyReport = verifyRunReport
  let finalVerifyReasonCode = verifyRunReport.reasonCode || verifyRunStep.reasonCode
  const verifyDecisionChain = ['run']

  if (verifyDecision.continueLoop) {
    const followMode = verifyDecision.nextMode === 'run' ? 'run' : 'resume'
    const followTarget = verifyDecision.nextTarget ?? options.verifyTarget
    const followOutDir = followMode === 'resume' ? verifyResumeOutDir : path.resolve(options.outDir, '07-verify-loop-rerun')
    const followPreviousRunId = verifyDecision.nextPreviousRunId ?? verifyRunStep.runId
    const followRunId =
      verifyDecision.nextRunId ??
      (followMode === 'resume'
        ? makeResumeRunIdFromPreviousRunId(followPreviousRunId)
        : `${options.runIdPrefix}-verify-loop-${followMode}`)
    const followCommandArgs = [
      'verify-loop',
      '--runId',
      followRunId,
      '--mode',
      followMode,
      '--target',
      followTarget,
      '--gateScope',
      options.gateScope,
      '--maxAttempts',
      String(options.maxAttempts),
      '--out',
      followOutDir,
    ]

    if (followMode === 'resume') {
      const followInstanceId = verifyDecision.nextInstanceId ?? verifyRunReport.instanceId
      if (followInstanceId.trim().length === 0 || followPreviousRunId.trim().length === 0) {
        throw new Error('[autonomous-loop] verify resume 缺少 instanceId 或 previousRunId')
      }
      followCommandArgs.push('--instanceId', followInstanceId, '--previousRunId', followPreviousRunId)
    }

    const followStep = runCommand({
      runner,
      repoRoot: options.repoRoot,
      rootOutDir: options.outDir,
      stepName: followMode === 'resume' ? 'verify-loop-resume' : 'verify-loop-rerun',
      commandName: 'verify-loop',
      mode: followMode,
      runId: followRunId,
      stepOutDir: followOutDir,
      commandArgs: followCommandArgs,
    })
    steps.push(followStep)

    const followReport = await readVerifyLoopReportFromDisk({
      stepName: followStep.name,
      stepOutDir: followOutDir,
      expectedRunId: followStep.runId,
      minMtimeMs: followStep.__startedAtMs,
    })
    assertResultReportIdentityConsistent({
      stepName: followStep.name,
      resultIdentity: followStep.identity,
      reportIdentity: followReport,
    })

    finalVerifyStep = followStep
    finalVerifyOutDir = followOutDir
    finalVerifyReport = followReport
    finalVerifyReasonCode = followReport.reasonCode || followStep.reasonCode
    verifyDecisionChain.push(followMode)
    verifyIdentityChain.push({
      runId: followReport.runId,
      mode: followReport.mode,
      instanceId: followStep.identity.instanceId,
      txnSeq: followStep.identity.txnSeq,
      opSeq: followStep.identity.opSeq,
      attemptSeq: followStep.identity.attemptSeq,
      reasonCode: followReport.reasonCode,
      trajectory: followReport.trajectory,
    })
  }

  const finalVerdict =
    Object.prototype.hasOwnProperty.call(FINAL_VERDICT_BY_VERIFY_EXIT_CODE, finalVerifyStep.exitCode)
      ? FINAL_VERDICT_BY_VERIFY_EXIT_CODE[finalVerifyStep.exitCode]
      : 'INFRA_FLAKY'

  const reasonCodes = Array.from(
    new Set(
      steps
        .flatMap((step) => [step.reasonCode, ...step.reasons])
        .filter((code) => typeof code === 'string' && code.length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b))

  const verdictPath = path.resolve(options.outDir, 'verdict.json')
  const checksumsPath = path.resolve(options.outDir, 'checksums.sha256')

  const verdict = {
    schemaVersion: 1,
    kind: 'AutonomousLoopVerdict',
    runIdPrefix: options.runIdPrefix,
    entry: options.entry,
    repoRoot: options.repoRoot,
    runner: runner.label,
    steps,
    decision: {
      source: 'verify-loop',
      chain: verifyDecisionChain,
      finalRunId: finalVerifyStep.runId,
      finalReasonCode: finalVerifyReasonCode,
      finalExitCode: finalVerifyStep.exitCode,
      verifyVerdict: finalVerifyStep.verdict,
      identityChain: verifyIdentityChain,
      finalIdentity: {
        instanceId: finalVerifyReport.instanceId,
        txnSeq: finalVerifyReport.txnSeq,
        opSeq: finalVerifyReport.opSeq,
        attemptSeq: finalVerifyReport.attemptSeq,
        trajectory: finalVerifyReport.trajectory,
      },
    },
    finalVerdict,
    reasonCodes,
  }

  await writeFile(verdictPath, `${JSON.stringify(verdict, null, 2)}\n`, 'utf8')

  const verifyReportTargets = [path.resolve(verifyRunOutDir, 'verify-loop.report.json')]
  if (finalVerifyOutDir !== verifyRunOutDir) {
    verifyReportTargets.push(path.resolve(finalVerifyOutDir, 'verify-loop.report.json'))
  }

  await writeChecksums({
    outDir: options.outDir,
    outputFile: checksumsPath,
    targets: [
      verdictPath,
      path.resolve(bundleOutDir, 'trialrun.report.json'),
      path.resolve(bundleOutDir, 'trace.slim.json'),
      path.resolve(bundleOutDir, 'evidence.json'),
      path.resolve(validateOutDir, 'ir.validate.report.json'),
      path.resolve(diffOutDir, 'ir.diff.report.json'),
      path.resolve(transformOutDir, 'transform.report.json'),
      ...verifyReportTargets,
    ],
  })

  process.stdout.write(
    `[autonomous-loop] summary finalVerdict=${finalVerdict} finalReasonCode=${finalVerifyReasonCode} verdictFile=${verdictPath} checksumsFile=${checksumsPath}\n`,
  )

  process.exitCode = resolveAutonomousLoopExitCode({
    finalVerdict,
    verifyExitCode: finalVerifyStep.exitCode,
  })
}

try {
  await main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`[autonomous-loop] fatal: ${message}\n`)
  process.exitCode = 1
}
