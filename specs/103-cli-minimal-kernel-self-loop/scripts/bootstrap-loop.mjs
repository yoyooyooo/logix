import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '../../..')
const cliDistBin = path.resolve(repoRoot, 'packages/logix-cli/dist/bin/logix.js')
const cliSrcBin = path.resolve(repoRoot, 'packages/logix-cli/src/bin/logix.ts')

const defaults = {
  runIdPrefix: 'bootstrap-loop',
  gateScope: 'runtime',
  target: 'fixture:retryable',
  retryTarget: undefined,
  maxRounds: 3,
  maxAttempts: 3,
  outDir: path.resolve(process.cwd(), '.artifacts/bootstrap-loop'),
}

const parseArgs = () => {
  const argv = process.argv.slice(2)
  const parsed = { ...defaults }
  let auditFile

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    const next = argv[i + 1]

    if (token === '--runIdPrefix' && typeof next === 'string') parsed.runIdPrefix = next
    if (token === '--gateScope' && (next === 'runtime' || next === 'governance')) parsed.gateScope = next
    if (token === '--target' && typeof next === 'string') parsed.target = next
    if (token === '--retryTarget' && typeof next === 'string') parsed.retryTarget = next
    if (token === '--maxRounds' && typeof next === 'string') parsed.maxRounds = Number(next)
    if (token === '--maxAttempts' && typeof next === 'string') parsed.maxAttempts = Number(next)
    if (token === '--outDir' && typeof next === 'string') parsed.outDir = path.resolve(process.cwd(), next)
    if (token === '--auditFile' && typeof next === 'string') auditFile = path.resolve(process.cwd(), next)

    if (token?.startsWith('--')) i += 1
  }

  const asPositiveInteger = (value, fallback) => (Number.isInteger(value) && value >= 1 ? value : fallback)
  const normalized = {
    ...parsed,
    maxRounds: asPositiveInteger(parsed.maxRounds, defaults.maxRounds),
    maxAttempts: asPositiveInteger(parsed.maxAttempts, defaults.maxAttempts),
  }

  const normalizedAuditFile = auditFile ?? path.resolve(normalized.outDir, 'bootstrap-loop.audit.json')
  return { ...normalized, auditFile: normalizedAuditFile }
}

const resolveCliRunner = () => {
  if (fs.existsSync(cliSrcBin)) {
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

  if (fs.existsSync(cliDistBin)) {
    return {
      command: process.execPath,
      baseArgs: [cliDistBin],
      label: 'dist',
    }
  }

  throw new Error('[bootstrap-loop] 未找到可执行 CLI runner（src/dist 都不可用）')
}

const parseCommandResult = (stdoutText) => {
  const lines = stdoutText
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i]
    try {
      const parsed = JSON.parse(line)
      if (parsed && parsed.kind === 'CommandResult') {
        return parsed
      }
    } catch {
      continue
    }
  }

  throw new Error('[bootstrap-loop] 无法从 CLI stdout 解析 CommandResult JSON')
}

const parseNextActions = (result) => {
  if (!Array.isArray(result?.nextActions)) return []
  return result.nextActions
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : '',
      action: typeof item.action === 'string' ? item.action : '',
      args: item.args && typeof item.args === 'object' && !Array.isArray(item.args) ? item.args : {},
      ifReasonCodes: Array.isArray(item.ifReasonCodes)
        ? item.ifReasonCodes.filter((code) => typeof code === 'string' && code.length > 0)
        : [],
    }))
}

const VERDICT_BY_EXIT_CODE = {
  0: 'PASS',
  1: 'ERROR',
  2: 'VIOLATION',
  3: 'RETRYABLE',
  4: 'NOT_IMPLEMENTED',
  5: 'NO_PROGRESS',
}

const resolveBootstrapLoopExitCode = (args) => {
  if (args.protocolErrorDetected) return 2
  if (Number.isInteger(args.finalExitCode) && args.finalExitCode >= 0) return args.finalExitCode
  return 1
}

const parseVerifyLoopReportFromDisk = (reportPath) => {
  if (!fs.existsSync(reportPath)) return undefined
  try {
    const text = fs.readFileSync(reportPath, 'utf8')
    const parsed = JSON.parse(text)
    if (parsed && parsed.kind === 'VerifyLoopReport') return parsed
    return undefined
  } catch {
    return undefined
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

const resolveInstanceIdFromArgs = (args) => {
  const { nextAction, currentInstanceId } = args
  if (typeof nextAction.args.instanceId === 'string' && nextAction.args.instanceId.length > 0) {
    return nextAction.args.instanceId
  }
  return currentInstanceId
}

const executeCanonicalAction = (args) => {
  const { nextAction, currentTarget, currentInstanceId } = args

  if (nextAction.action === CANONICAL_ACTION.RERUN) {
    const rerunTarget = typeof nextAction.args.target === 'string' ? nextAction.args.target.trim() : ''
    if (rerunTarget.length === 0) {
      return {
        continueLoop: false,
        decision: `error:${nextAction.action}:${nextAction.id}:missing-args.target`,
        nextTarget: undefined,
        nextInstanceId: resolveInstanceIdFromArgs({ nextAction, currentInstanceId }),
        protocolError: true,
      }
    }

    return {
      continueLoop: true,
      decision: `continue:${nextAction.action}:${nextAction.id}`,
      nextTarget: rerunTarget,
      nextInstanceId: resolveInstanceIdFromArgs({ nextAction, currentInstanceId }),
      protocolError: false,
    }
  }

  if (nextAction.action === CANONICAL_ACTION.RUN_COMMAND) {
    const command = typeof nextAction.args.command === 'string' ? nextAction.args.command.trim() : ''
    if (command.length === 0) {
      return {
        continueLoop: false,
        decision: `error:${nextAction.action}:${nextAction.id}:missing-args.command`,
        nextTarget: undefined,
        nextInstanceId: resolveInstanceIdFromArgs({ nextAction, currentInstanceId }),
        protocolError: true,
      }
    }

    const exec = spawnSync(command, {
      cwd: repoRoot,
      env: process.env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    })
    const commandExitCode = typeof exec.status === 'number' ? exec.status : 1
    if (exec.error || commandExitCode !== 0) {
      return {
        continueLoop: false,
        decision: `stop:${CANONICAL_ACTION.RUN_COMMAND}:${nextAction.id}:exit-${commandExitCode}`,
        nextTarget: undefined,
        nextInstanceId: resolveInstanceIdFromArgs({ nextAction, currentInstanceId }),
        protocolError: false,
      }
    }

    return {
      continueLoop: true,
      decision: `continue:${CANONICAL_ACTION.RUN_COMMAND}:${nextAction.id}`,
      nextTarget: currentTarget,
      nextInstanceId: resolveInstanceIdFromArgs({ nextAction, currentInstanceId }),
      protocolError: false,
    }
  }

  if (nextAction.action === CANONICAL_ACTION.INSPECT || nextAction.action === CANONICAL_ACTION.STOP) {
    return {
      continueLoop: false,
      decision: `stop:${nextAction.action}:${nextAction.id}`,
      nextTarget: undefined,
      nextInstanceId: resolveInstanceIdFromArgs({ nextAction, currentInstanceId }),
      protocolError: false,
    }
  }

  return {
    continueLoop: false,
    decision: `error:unknown-action:${nextAction.action}`,
    nextTarget: undefined,
    nextInstanceId: resolveInstanceIdFromArgs({ nextAction, currentInstanceId }),
    protocolError: true,
  }
}

const decideNext = (args) => {
  const { verdict, reasonCode, nextActions, attempt, maxRounds, target, instanceId } = args

  if (verdict === 'PASS') {
    return {
      continueLoop: false,
      decision: 'stop:pass',
      nextTarget: undefined,
      nextInstanceId: instanceId,
      protocolError: false,
    }
  }

  if (attempt >= maxRounds) {
    return {
      continueLoop: false,
      decision: 'stop:max-rounds',
      nextTarget: undefined,
      nextInstanceId: instanceId,
      protocolError: false,
    }
  }

  const executableActions = nextActions.filter((nextAction) => actionMatchesReasonCode(nextAction, reasonCode))
  if (executableActions.length === 0) {
    return {
      continueLoop: false,
      decision: 'stop:no-matching-next-action',
      nextTarget: undefined,
      nextInstanceId: instanceId,
      protocolError: false,
    }
  }

  return executeCanonicalAction({
    nextAction: executableActions[0],
    currentTarget: target,
    currentInstanceId: instanceId,
  })
}

const makeRunId = (prefix, attempt) => `${prefix}-attempt-${String(attempt).padStart(2, '0')}`

const run = () => {
  const options = parseArgs()
  const cliRunner = resolveCliRunner()
  fs.mkdirSync(options.outDir, { recursive: true })

  /** @type {Array<{
   * runId: string
   * reasonCode: string
   * attempt: number
   * verdict: string
   * exitCode: number
   * mode: 'run' | 'resume'
   * target: string
   * nextActions: Array<{id: string, action: string, args: Record<string, unknown>, ifReasonCodes: Array<string>}>
   * decision: string
   * cliExitCode: number
   * outDir: string
   * }>} */
  const records = []

  let target = options.target
  let previousRunId
  let instanceId
  let protocolErrorDetected = false

  for (let attempt = 1; attempt <= options.maxRounds; attempt += 1) {
    const runId = makeRunId(options.runIdPrefix, attempt)
    const mode = attempt === 1 ? 'run' : 'resume'
    const attemptOutDir = path.resolve(options.outDir, `attempt-${String(attempt).padStart(2, '0')}`)
    fs.mkdirSync(attemptOutDir, { recursive: true })

    const cliArgs = [
      ...cliRunner.baseArgs,
      'verify-loop',
      '--runId',
      runId,
      '--mode',
      mode,
      '--target',
      target,
      '--gateScope',
      options.gateScope,
      '--maxAttempts',
      String(options.maxAttempts),
      '--out',
      attemptOutDir,
    ]

    if (mode === 'resume') {
      if (!previousRunId) {
        throw new Error('[bootstrap-loop] resume 模式缺少 previousRunId')
      }
      if (!instanceId) {
        throw new Error('[bootstrap-loop] resume 模式缺少 instanceId')
      }
      cliArgs.push('--previousRunId', previousRunId)
      cliArgs.push('--instanceId', instanceId)
    }

    const exec = spawnSync(cliRunner.command, cliArgs, {
      cwd: repoRoot,
      env: process.env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    if (exec.error) throw exec.error

    const result = parseCommandResult(exec.stdout ?? '')
    const reportPath = path.resolve(attemptOutDir, 'verify-loop.report.json')
    const report = parseVerifyLoopReportFromDisk(reportPath)
    const cliExitCode = typeof exec.status === 'number' ? exec.status : 1
    const commandExitCode = typeof result.exitCode === 'number' ? result.exitCode : typeof report?.exitCode === 'number' ? report.exitCode : cliExitCode
    const verdict =
      typeof report?.verdict === 'string'
        ? report.verdict
        : Object.prototype.hasOwnProperty.call(VERDICT_BY_EXIT_CODE, commandExitCode)
          ? VERDICT_BY_EXIT_CODE[commandExitCode]
          : 'ERROR'
    const reasonCode =
      typeof report?.reasonCode === 'string'
        ? report.reasonCode
        : typeof result.reasonCode === 'string'
          ? result.reasonCode
          : 'CLI_PROTOCOL_VIOLATION'
    const observedInstanceId =
      typeof report?.instanceId === 'string'
        ? report.instanceId
        : typeof result.instanceId === 'string'
          ? result.instanceId
          : undefined
    const nextActions = parseNextActions(report ?? result)

    const decision = decideNext({
      verdict,
      reasonCode,
      nextActions,
      attempt,
      maxRounds: options.maxRounds,
      target,
      instanceId: observedInstanceId ?? instanceId,
    })
    const retryTargetOverride =
      verdict === 'RETRYABLE' && typeof options.retryTarget === 'string' && options.retryTarget.trim().length > 0
        ? options.retryTarget.trim()
        : undefined
    const resolvedNextTarget = retryTargetOverride ?? decision.nextTarget
    const decisionLabel = retryTargetOverride ? `${decision.decision}:override-retry-target` : decision.decision

    const record = {
      runId,
      reasonCode,
      attempt,
      verdict,
      exitCode: commandExitCode,
      mode,
      target,
      instanceId: observedInstanceId ?? null,
      nextActions,
      decision: decisionLabel,
      cliExitCode,
      outDir: attemptOutDir,
    }
    records.push(record)

    process.stdout.write(
      `[bootstrap-loop] attempt=${record.attempt} mode=${record.mode} runId=${record.runId} target=${record.target} verdict=${record.verdict} reasonCode=${record.reasonCode} exitCode=${record.exitCode} decision=${record.decision}\n`,
    )

    if (!decision.continueLoop) {
      if (decision.protocolError) {
        protocolErrorDetected = true
      }
      instanceId = decision.nextInstanceId ?? observedInstanceId ?? instanceId
      break
    }

    previousRunId = runId
    target = resolvedNextTarget ?? target
    instanceId = decision.nextInstanceId ?? observedInstanceId ?? instanceId
  }

  if (records.length === 0) {
    throw new Error('[bootstrap-loop] 未执行任何 verify-loop 轮次')
  }

  const finalRecord = records[records.length - 1]
  const audit = {
    schemaVersion: 1,
    kind: 'BootstrapLoopAudit',
    runner: cliRunner.label,
    gateScope: options.gateScope,
    runIdPrefix: options.runIdPrefix,
    maxRounds: options.maxRounds,
    maxAttempts: options.maxAttempts,
    retryTarget: typeof options.retryTarget === 'string' && options.retryTarget.trim().length > 0 ? options.retryTarget.trim() : null,
    converged: finalRecord.verdict === 'PASS',
    finalVerdict: finalRecord.verdict,
    finalReasonCode: finalRecord.reasonCode,
    rounds: records.length,
    records: records.map((item) => ({
      runId: item.runId,
      reasonCode: item.reasonCode,
      attempt: item.attempt,
      verdict: item.verdict,
      exitCode: item.exitCode,
      mode: item.mode,
      target: item.target,
      instanceId: item.instanceId,
    })),
  }

  fs.mkdirSync(path.dirname(options.auditFile), { recursive: true })
  fs.writeFileSync(options.auditFile, `${JSON.stringify(audit, null, 2)}\n`, 'utf8')

  process.stdout.write(
    `[bootstrap-loop] summary rounds=${audit.rounds} finalVerdict=${audit.finalVerdict} finalReasonCode=${audit.finalReasonCode} converged=${audit.converged} auditFile=${options.auditFile}\n`,
  )

  process.exitCode = resolveBootstrapLoopExitCode({
    protocolErrorDetected,
    finalExitCode: finalRecord.exitCode,
  })
}

try {
  run()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`[bootstrap-loop] fatal: ${message}\n`)
  process.exitCode = 1
}
