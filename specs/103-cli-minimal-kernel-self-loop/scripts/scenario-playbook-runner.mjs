import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { applyScenarioFixtureAdapters } from './scenario-fixture-adapter.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const defaultRepoRoot = path.resolve(here, '../../..')
const scenarioRemediationMapPath = path.resolve(
  defaultRepoRoot,
  'specs/103-cli-minimal-kernel-self-loop/contracts/scenario-remediation-map.md',
)

const KNOWN_ROOT_KEYS = new Set([
  'schemaVersion',
  'kind',
  'scenarioId',
  'runIdPrefix',
  'context',
  'primitiveChain',
  'actions',
  'assertions',
  'fixtures',
])
const KNOWN_CONTEXT_KEYS = new Set(['entry', 'verifyTarget', 'gateScope', 'maxAttempts', 'timeBudgetMs'])
const KNOWN_ASSERTION_KEYS = new Set(['id', 'type', 'stepId', 'equals', 'lteMs'])
const KNOWN_FIXTURES_KEYS = new Set(['transformOpsPath', 'cliConfigPath', 'adapters'])
const KNOWN_FIXTURE_ADAPTER_KEYS = new Set(['id', 'kind', 'path', 'payload', 'from'])
const KNOWN_CHAIN = new Set([
  'describe',
  'ir.export',
  'trialrun.evidence',
  'ir.validate.contract',
  'ir.diff',
  'transform.module.report',
  'verify-loop.run',
  'verify-loop.resume',
  'next-actions.exec',
])

const EXIT_VERDICT = {
  0: 'PASS',
  1: 'ERROR',
  2: 'VIOLATION',
  3: 'RETRYABLE',
  4: 'NOT_IMPLEMENTED',
  5: 'NO_PROGRESS',
}

const parseArgs = () => {
  const argv = process.argv.slice(2)
  let inputPath
  let outDir
  let repoRoot = defaultRepoRoot

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    const next = argv[i + 1]
    if (token === '--input' && typeof next === 'string') inputPath = path.resolve(process.cwd(), next)
    if (token === '--outDir' && typeof next === 'string') outDir = path.resolve(process.cwd(), next)
    if (token === '--repoRoot' && typeof next === 'string') repoRoot = path.resolve(process.cwd(), next)
    if (token?.startsWith('--')) i += 1
  }

  if (!inputPath) throw new Error('[scenario-playbook] 缺少参数 --input <path>')
  if (!outDir) throw new Error('[scenario-playbook] 缺少参数 --outDir <path>')
  return { inputPath, outDir, repoRoot }
}

const resolveCliRunner = (repoRoot) => {
  const sourceBin = path.resolve(repoRoot, 'packages/logix-cli/src/bin/logix.ts')
  const distBin = path.resolve(repoRoot, 'packages/logix-cli/dist/bin/logix.js')

  if (fs.existsSync(sourceBin)) {
    const probe = spawnSync(process.execPath, ['--import', 'tsx/esm', sourceBin, '--help'], {
      cwd: repoRoot,
      env: process.env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    if (!probe.error && probe.status === 0) {
      return { command: process.execPath, baseArgs: ['--import', 'tsx/esm', sourceBin], label: 'source(tsx)' }
    }
  }

  if (fs.existsSync(distBin)) {
    return { command: process.execPath, baseArgs: [distBin], label: 'dist' }
  }

  throw new Error('[scenario-playbook] 未找到可执行 CLI runner（src/dist 都不可用）')
}

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true })
const parseJsonFile = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const sha256OfFile = (filePath) => createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
const relativeTo = (base, target) => path.relative(base, target).split(path.sep).join('/')
const sanitizeStepId = (value) => value.replaceAll('.', '-')
const makeStepRunId = (runIdPrefix, stepId, index) => `${runIdPrefix}-${sanitizeStepId(stepId)}-${String(index + 1).padStart(2, '0')}`
const isPositiveInteger = (value) => Number.isInteger(value) && value >= 1

const assertKnownKeys = (record, allowed, prefix) => {
  for (const key of Object.keys(record)) {
    if (allowed.has(key)) continue
    throw new Error(`[scenario-playbook] ${prefix} 出现未知字段 '${key}'`)
  }
}

const assertNonEmptyString = (value, prefix) => {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  throw new Error(`[scenario-playbook] ${prefix} 必须是非空字符串`)
}

const normalizeFixtureAdapters = (value) => {
  if (value === undefined) return []
  if (!Array.isArray(value)) throw new Error('[scenario-playbook] fixtures.adapters 必须是数组')

  return value.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`[scenario-playbook] fixtures.adapters[${index}] 必须是对象`)
    }
    assertKnownKeys(item, KNOWN_FIXTURE_ADAPTER_KEYS, `fixtures.adapters[${index}]`)
    const id = assertNonEmptyString(item.id, `fixtures.adapters[${index}].id`)
    const kind = assertNonEmptyString(item.kind, `fixtures.adapters[${index}].kind`)
    if (kind !== 'inline-json' && kind !== 'copy-file') {
      throw new Error(`[scenario-playbook] fixtures.adapters[${index}].kind 非法：${kind}`)
    }
    const adapter = {
      id,
      kind,
      path: assertNonEmptyString(item.path, `fixtures.adapters[${index}].path`),
    }
    if (kind === 'inline-json') {
      return { ...adapter, payload: item.payload }
    }
    return {
      ...adapter,
      from: assertNonEmptyString(item.from, `fixtures.adapters[${index}].from`),
    }
  })
}

const validatePlaybook = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('[scenario-playbook] input 根对象必须是 object')
  }
  assertKnownKeys(value, KNOWN_ROOT_KEYS, 'root')
  if (value.schemaVersion !== 1) throw new Error('[scenario-playbook] schemaVersion 必须是 1')
  if (value.kind !== 'ScenarioPlaybookInput') throw new Error('[scenario-playbook] kind 必须是 ScenarioPlaybookInput')

  const scenarioId = assertNonEmptyString(value.scenarioId, 'scenarioId')
  if (!/^S[0-9]{2}$/u.test(scenarioId)) throw new Error('[scenario-playbook] scenarioId 必须匹配 Sxx')
  const runIdPrefix = assertNonEmptyString(value.runIdPrefix, 'runIdPrefix')

  if (!value.context || typeof value.context !== 'object' || Array.isArray(value.context)) {
    throw new Error('[scenario-playbook] context 必须是 object')
  }
  assertKnownKeys(value.context, KNOWN_CONTEXT_KEYS, 'context')

  const timeBudgetMs =
    isPositiveInteger(value.context.timeBudgetMs) && value.context.timeBudgetMs <= 60_000 * 10
      ? value.context.timeBudgetMs
      : undefined

  const context = {
    entry: assertNonEmptyString(value.context.entry, 'context.entry'),
    verifyTarget: assertNonEmptyString(value.context.verifyTarget, 'context.verifyTarget'),
    gateScope: value.context.gateScope === 'governance' ? 'governance' : 'runtime',
    maxAttempts: isPositiveInteger(value.context.maxAttempts) ? value.context.maxAttempts : 3,
    ...(typeof timeBudgetMs === 'number' ? { timeBudgetMs } : null),
  }

  if (!Array.isArray(value.primitiveChain) || value.primitiveChain.length === 0) {
    throw new Error('[scenario-playbook] primitiveChain 必须是非空数组')
  }
  const primitiveChain = value.primitiveChain.map((item, index) => {
    const step = assertNonEmptyString(item, `primitiveChain[${index}]`)
    if (!KNOWN_CHAIN.has(step)) throw new Error(`[scenario-playbook] primitiveChain[${index}] 未知：${step}`)
    return step
  })

  if (!Array.isArray(value.actions)) throw new Error('[scenario-playbook] actions 必须是数组')
  if (!Array.isArray(value.assertions) || value.assertions.length === 0) {
    throw new Error('[scenario-playbook] assertions 必须是非空数组')
  }

  const assertions = value.assertions.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`[scenario-playbook] assertions[${index}] 必须是对象`)
    }
    assertKnownKeys(item, KNOWN_ASSERTION_KEYS, `assertions[${index}]`)
    const id = assertNonEmptyString(item.id, `assertions[${index}].id`)
    const type = assertNonEmptyString(item.type, `assertions[${index}].type`)
    if (!['step.exit-code', 'step.reason-code', 'final.verdict', 'step.duration-ms.lte'].includes(type)) {
      throw new Error(`[scenario-playbook] assertions[${index}].type 非法：${type}`)
    }

    if (type === 'step.duration-ms.lte') {
      if (!isPositiveInteger(item.lteMs)) {
        throw new Error(`[scenario-playbook] assertions[${index}].lteMs 必须是正整数`)
      }
      return {
        id,
        type,
        stepId: assertNonEmptyString(item.stepId, `assertions[${index}].stepId`),
        lteMs: item.lteMs,
      }
    }

    return {
      id,
      type,
      stepId: typeof item.stepId === 'string' ? item.stepId : undefined,
      equals: item.equals,
    }
  })

  let fixtures = {
    transformOpsPath: undefined,
    cliConfigPath: undefined,
    adapters: [],
  }

  if (value.fixtures !== undefined) {
    if (!value.fixtures || typeof value.fixtures !== 'object' || Array.isArray(value.fixtures)) {
      throw new Error('[scenario-playbook] fixtures 必须是对象')
    }
    assertKnownKeys(value.fixtures, KNOWN_FIXTURES_KEYS, 'fixtures')
    fixtures = {
      transformOpsPath: typeof value.fixtures.transformOpsPath === 'string' ? value.fixtures.transformOpsPath : undefined,
      cliConfigPath: typeof value.fixtures.cliConfigPath === 'string' ? value.fixtures.cliConfigPath : undefined,
      adapters: normalizeFixtureAdapters(value.fixtures.adapters),
    }
  }

  return {
    schemaVersion: 1,
    kind: 'ScenarioPlaybookInput',
    scenarioId,
    runIdPrefix,
    context,
    primitiveChain,
    actions: value.actions,
    assertions,
    fixtures,
  }
}

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
  throw new Error('[scenario-playbook] 无法从 CLI stdout 解析 CommandResult')
}

const writeContractProfileConfig = (filePath) => {
  const cfg = {
    schemaVersion: 1,
    profiles: {
      contract: {},
      'cross-module': {},
    },
  }
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, `${JSON.stringify(cfg, null, 2)}\n`, 'utf8')
}

const writeTransformOps = (filePath) => {
  const ops = [
    {
      op: 'insert',
      file: 'examples/logix/src/scenarios/__scenario_playbook_marker__.ts',
      pointer: '/generated/0',
      value: { kind: 'marker', value: 'scenario-playbook' },
    },
  ]
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, `${JSON.stringify(ops, null, 2)}\n`, 'utf8')
}

const parseScenarioRemediationMap = (filePath) => {
  if (!fs.existsSync(filePath)) return undefined
  const text = fs.readFileSync(filePath, 'utf8')
  const jsonBlock = text.match(/```json\s*([\s\S]*?)```/u)?.[1]
  if (!jsonBlock) return undefined

  const parsed = JSON.parse(jsonBlock)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined

  const normalizeAction = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
    const id = typeof value.id === 'string' && value.id.trim().length > 0 ? value.id.trim() : undefined
    const action = typeof value.action === 'string' && value.action.trim().length > 0 ? value.action.trim() : undefined
    if (!id || !action) return undefined
    const args = value.args && typeof value.args === 'object' && !Array.isArray(value.args) ? value.args : {}
    return { id, action, args }
  }

  const normalizeCodeMap = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    const out = {}
    for (const [code, actions] of Object.entries(value)) {
      if (typeof code !== 'string') continue
      if (!Array.isArray(actions)) continue
      const normalized = actions.map(normalizeAction).filter((item) => item)
      if (normalized.length > 0) out[code] = normalized
    }
    return out
  }

  const defaults = normalizeCodeMap(parsed.defaults)
  const scenarios = {}
  if (parsed.scenarios && typeof parsed.scenarios === 'object' && !Array.isArray(parsed.scenarios)) {
    for (const [scenarioId, codeMap] of Object.entries(parsed.scenarios)) {
      if (!/^S[0-9]{2}$/u.test(scenarioId)) continue
      scenarios[scenarioId] = normalizeCodeMap(codeMap)
    }
  }

  return {
    schemaVersion: parsed.schemaVersion === 1 ? 1 : 0,
    kind: parsed.kind === 'ScenarioRemediationMap' ? 'ScenarioRemediationMap' : 'Unknown',
    defaults,
    scenarios,
  }
}

const resolveRemediationActions = (args) => {
  if (!args.remediationMap || args.remediationMap.kind !== 'ScenarioRemediationMap') return []
  const codes = Array.from(new Set([args.finalReasonCode, ...args.reasonCodes])).filter((code) => typeof code === 'string')
  const scenarioMap = args.remediationMap.scenarios?.[args.scenarioId] ?? {}
  const out = []
  const seen = new Set()

  for (const code of codes) {
    const specific = Array.isArray(scenarioMap?.[code]) ? scenarioMap[code] : []
    const fallback = Array.isArray(args.remediationMap.defaults?.[code]) ? args.remediationMap.defaults[code] : []
    for (const action of [...specific, ...fallback]) {
      const key = `${action.id}|${action.action}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ reasonCode: code, ...action })
    }
  }
  return out
}

const classifyFailure = (stepVerdict) => {
  if (stepVerdict === 'RETRYABLE') return 'FAIL_SOFT'
  if (stepVerdict === 'NO_PROGRESS' || stepVerdict === 'NOT_IMPLEMENTED') return 'BLOCKED'
  return 'FAIL_HARD'
}

const run = () => {
  const args = parseArgs()
  const runner = resolveCliRunner(args.repoRoot)
  const inputRaw = parseJsonFile(args.inputPath)
  const playbook = validatePlaybook(inputRaw)

  ensureDir(args.outDir)

  const fixtureReport = applyScenarioFixtureAdapters({
    repoRoot: args.repoRoot,
    outDir: args.outDir,
    adapters: playbook.fixtures.adapters,
  })
  const fixtureReportPath = path.resolve(args.outDir, 'scenario-fixtures.report.json')
  const hasFixtureReport = fixtureReport.applied.length > 0
  if (hasFixtureReport) {
    fs.writeFileSync(fixtureReportPath, `${JSON.stringify(fixtureReport, null, 2)}\n`, 'utf8')
  }

  const paths = {
    bundle: path.resolve(args.outDir, '02-bundle'),
    validate: path.resolve(args.outDir, '03-ir-validate'),
    diff: path.resolve(args.outDir, '04-ir-diff'),
    transform: path.resolve(args.outDir, '05-transform-module'),
    verifyRun: path.resolve(args.outDir, '06-verify-loop-run'),
    verifyResume: path.resolve(args.outDir, '07-verify-loop-resume'),
    nextActions: path.resolve(args.outDir, '08-next-actions-exec'),
    config: path.resolve(args.outDir, 'logix.cli.json'),
    transformOps: path.resolve(args.outDir, 'transform.ops.json'),
  }

  const cliConfigPath =
    typeof playbook.fixtures.cliConfigPath === 'string'
      ? path.resolve(args.repoRoot, playbook.fixtures.cliConfigPath)
      : paths.config
  const transformOpsPath =
    typeof playbook.fixtures.transformOpsPath === 'string'
      ? path.resolve(args.repoRoot, playbook.fixtures.transformOpsPath)
      : paths.transformOps

  if (!fs.existsSync(cliConfigPath)) writeContractProfileConfig(cliConfigPath)
  if (!fs.existsSync(transformOpsPath)) writeTransformOps(transformOpsPath)

  const steps = []
  let lastVerify = undefined

  for (let i = 0; i < playbook.primitiveChain.length; i += 1) {
    const stepId = playbook.primitiveChain[i]
    const runId = makeStepRunId(playbook.runIdPrefix, stepId, i)

    let outDir = path.resolve(args.outDir, `${String(i + 1).padStart(2, '0')}-${sanitizeStepId(stepId)}`)
    let commandArgs

    switch (stepId) {
      case 'describe':
        commandArgs = ['describe', '--runId', runId, '--json', '--out', outDir]
        break
      case 'ir.export':
        outDir = paths.bundle
        commandArgs = ['ir', 'export', '--runId', runId, '--entry', playbook.context.entry, '--with-anchors', '--out', outDir]
        break
      case 'trialrun.evidence':
        outDir = paths.bundle
        commandArgs = ['trialrun', '--runId', runId, '--entry', playbook.context.entry, '--emit', 'evidence', '--out', outDir]
        break
      case 'ir.validate.contract':
        outDir = paths.validate
        commandArgs = [
          'ir',
          'validate',
          '--runId',
          runId,
          '--in',
          paths.bundle,
          '--cliConfig',
          cliConfigPath,
          '--profile',
          'contract',
          '--out',
          outDir,
        ]
        break
      case 'ir.diff':
        outDir = paths.diff
        commandArgs = ['ir', 'diff', '--runId', runId, '--before', paths.bundle, '--after', paths.bundle, '--out', outDir]
        break
      case 'transform.module.report':
        outDir = paths.transform
        commandArgs = [
          'transform',
          'module',
          '--runId',
          runId,
          '--ops',
          transformOpsPath,
          '--mode',
          'report',
          '--repoRoot',
          args.repoRoot,
          '--out',
          outDir,
        ]
        break
      case 'verify-loop.run':
        outDir = paths.verifyRun
        commandArgs = [
          'verify-loop',
          '--runId',
          runId,
          '--mode',
          'run',
          '--target',
          playbook.context.verifyTarget,
          '--gateScope',
          playbook.context.gateScope,
          '--maxAttempts',
          String(playbook.context.maxAttempts),
          '--out',
          outDir,
        ]
        break
      case 'verify-loop.resume':
        if (!lastVerify) throw new Error('[scenario-playbook] verify-loop.resume 依赖 verify-loop.run 产物')
        outDir = paths.verifyResume
        commandArgs = [
          'verify-loop',
          '--runId',
          runId,
          '--mode',
          'resume',
          '--previousRunId',
          lastVerify.runId,
          '--instanceId',
          lastVerify.instanceId,
          '--target',
          playbook.context.verifyTarget,
          '--gateScope',
          playbook.context.gateScope,
          '--maxAttempts',
          String(playbook.context.maxAttempts),
          '--out',
          outDir,
        ]
        break
      case 'next-actions.exec':
        if (!lastVerify) throw new Error('[scenario-playbook] next-actions.exec 依赖 verify-loop.report 产物')
        outDir = paths.nextActions
        commandArgs = ['next-actions', 'exec', '--runId', runId, '--report', lastVerify.reportPath, '--out', outDir]
        break
      default:
        throw new Error(`[scenario-playbook] 未支持的 primitive step：${stepId}`)
    }

    ensureDir(outDir)
    const startedAt = Date.now()
    const exec = spawnSync(runner.command, [...runner.baseArgs, ...commandArgs], {
      cwd: args.repoRoot,
      env: process.env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const durationMs = Date.now() - startedAt

    if (exec.error) throw exec.error
    const result = parseCommandResult(exec.stdout ?? '')
    const exitCode = typeof result.exitCode === 'number' ? result.exitCode : typeof exec.status === 'number' ? exec.status : 1
    const reasonCode = typeof result.reasonCode === 'string' ? result.reasonCode : 'CLI_PROTOCOL_VIOLATION'
    const verdict = Object.prototype.hasOwnProperty.call(EXIT_VERDICT, exitCode) ? EXIT_VERDICT[exitCode] : 'ERROR'

    const step = {
      id: stepId,
      runId,
      command: commandArgs.join(' '),
      outDir: relativeTo(args.outDir, outDir),
      durationMs,
      exitCode,
      reasonCode,
      verdict,
      instanceId: typeof result.instanceId === 'string' ? result.instanceId : undefined,
      txnSeq: typeof result.txnSeq === 'number' ? result.txnSeq : undefined,
      opSeq: typeof result.opSeq === 'number' ? result.opSeq : undefined,
      attemptSeq: typeof result.attemptSeq === 'number' ? result.attemptSeq : undefined,
    }
    steps.push(step)

    process.stdout.write(
      `[scenario-playbook] step=${step.id} runId=${step.runId} verdict=${step.verdict} reasonCode=${step.reasonCode} exitCode=${step.exitCode} durationMs=${step.durationMs} out=${step.outDir}\n`,
    )

    if (stepId === 'verify-loop.run' || stepId === 'verify-loop.resume') {
      const reportPath = path.resolve(outDir, 'verify-loop.report.json')
      if (fs.existsSync(reportPath)) {
        const report = parseJsonFile(reportPath)
        if (report && typeof report.runId === 'string' && typeof report.instanceId === 'string') {
          lastVerify = {
            runId: report.runId,
            instanceId: report.instanceId,
            reportPath,
          }
        }
      }
    }

    if (exitCode !== 0) break
  }

  const failedStep = steps.find((step) => step.exitCode !== 0)
  let finalVerdict = failedStep ? classifyFailure(failedStep.verdict) : 'PASS'
  let finalReasonCode = failedStep ? failedStep.reasonCode : 'VERIFY_PASS'

  const totalDurationMs = steps.reduce((sum, step) => sum + step.durationMs, 0)
  const budgetExceeded = isPositiveInteger(playbook.context.timeBudgetMs) && totalDurationMs > playbook.context.timeBudgetMs
  if (budgetExceeded && finalVerdict !== 'FAIL_HARD' && finalVerdict !== 'BLOCKED') {
    finalVerdict = 'FAIL_SOFT'
    finalReasonCode = 'SCENARIO_TIME_BUDGET_EXCEEDED'
  }

  const assertionResults = playbook.assertions.map((assertion) => {
    if (assertion.type === 'final.verdict') {
      const ok = assertion.equals === finalVerdict
      return {
        id: assertion.id,
        type: assertion.type,
        status: ok ? 'pass' : 'fail',
        message: ok
          ? `finalVerdict=${finalVerdict}`
          : `expected finalVerdict=${String(assertion.equals)}, actual=${finalVerdict}`,
      }
    }

    if (assertion.type === 'step.exit-code') {
      const step = steps.find((item) => item.id === assertion.stepId)
      const ok = step ? step.exitCode === assertion.equals : false
      return {
        id: assertion.id,
        type: assertion.type,
        status: ok ? 'pass' : 'fail',
        message: step
          ? `step=${step.id}, exitCode=${step.exitCode}, expected=${String(assertion.equals)}`
          : `step=${assertion.stepId ?? 'N/A'} 未执行`,
      }
    }

    if (assertion.type === 'step.reason-code') {
      const step = steps.find((item) => item.id === assertion.stepId)
      const ok = step ? step.reasonCode === assertion.equals : false
      return {
        id: assertion.id,
        type: assertion.type,
        status: ok ? 'pass' : 'fail',
        message: step
          ? `step=${step.id}, reasonCode=${step.reasonCode}, expected=${String(assertion.equals)}`
          : `step=${assertion.stepId ?? 'N/A'} 未执行`,
      }
    }

    if (assertion.type === 'step.duration-ms.lte') {
      const step = steps.find((item) => item.id === assertion.stepId)
      const ok = step && isPositiveInteger(assertion.lteMs) ? step.durationMs <= assertion.lteMs : false
      return {
        id: assertion.id,
        type: assertion.type,
        status: ok ? 'pass' : 'fail',
        message: step
          ? `step=${step.id}, durationMs=${step.durationMs}, lteMs=${String(assertion.lteMs)}`
          : `step=${assertion.stepId ?? 'N/A'} 未执行`,
      }
    }

    return {
      id: assertion.id,
      type: assertion.type,
      status: 'fail',
      message: `unsupported assertion type=${assertion.type}`,
    }
  })

  if (assertionResults.some((item) => item.status === 'fail')) {
    finalVerdict = 'FAIL_HARD'
    finalReasonCode = 'SCENARIO_ASSERTION_FAILED'
  }

  const reasonCodes = Array.from(new Set([...steps.map((step) => step.reasonCode), finalReasonCode])).sort((a, b) =>
    a.localeCompare(b),
  )

  const remediationMap = parseScenarioRemediationMap(scenarioRemediationMapPath)
  const remediationActions = resolveRemediationActions({
    remediationMap,
    scenarioId: playbook.scenarioId,
    finalReasonCode,
    reasonCodes,
  })

  const reportPath = path.resolve(args.outDir, 'scenario-playbook.report.json')
  const verdictPath = path.resolve(args.outDir, 'scenario.verdict.json')
  const checksumsPath = path.resolve(args.outDir, 'checksums.sha256')
  const remediationPath = path.resolve(args.outDir, 'scenario.remediation-actions.json')

  if (remediationActions.length > 0) {
    fs.writeFileSync(
      remediationPath,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          kind: 'ScenarioRemediationActions',
          scenarioId: playbook.scenarioId,
          finalReasonCode,
          reasonCodes,
          actions: remediationActions,
        },
        null,
        2,
      )}\n`,
      'utf8',
    )
  }

  const artifacts = [
    { name: 'scenario-playbook.report.json', path: 'scenario-playbook.report.json' },
    { name: 'scenario.verdict.json', path: 'scenario.verdict.json' },
    { name: 'checksums.sha256', path: 'checksums.sha256' },
    ...(hasFixtureReport ? [{ name: 'scenario-fixtures.report.json', path: 'scenario-fixtures.report.json' }] : []),
    ...(remediationActions.length > 0 ? [{ name: 'scenario.remediation-actions.json', path: 'scenario.remediation-actions.json' }] : []),
  ]

  const report = {
    schemaVersion: 1,
    kind: 'ScenarioPlaybookReport',
    scenarioId: playbook.scenarioId,
    runIdPrefix: playbook.runIdPrefix,
    primitiveChain: playbook.primitiveChain,
    steps,
    assertions: assertionResults,
    summary: {
      finalVerdict,
      finalReasonCode,
      passedSteps: steps.filter((step) => step.exitCode === 0).length,
      failedSteps: steps.filter((step) => step.exitCode !== 0).length,
    },
    artifacts,
    reasonCodes,
  }

  const verdict = {
    schemaVersion: 1,
    kind: 'ScenarioVerdict',
    scenarioId: playbook.scenarioId,
    runIdPrefix: playbook.runIdPrefix,
    finalVerdict,
    finalReasonCode,
    reasonCodes,
    decision: {
      primitiveChain: playbook.primitiveChain,
      steps: steps.map((step) => ({
        id: step.id,
        runId: step.runId,
        exitCode: step.exitCode,
        reasonCode: step.reasonCode,
      })),
    },
  }

  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  fs.writeFileSync(verdictPath, `${JSON.stringify(verdict, null, 2)}\n`, 'utf8')

  const checksumLines = [
    `${sha256OfFile(reportPath)}  ${relativeTo(args.outDir, reportPath)}`,
    `${sha256OfFile(verdictPath)}  ${relativeTo(args.outDir, verdictPath)}`,
    ...(hasFixtureReport ? [`${sha256OfFile(fixtureReportPath)}  ${relativeTo(args.outDir, fixtureReportPath)}`] : []),
    ...(remediationActions.length > 0 ? [`${sha256OfFile(remediationPath)}  ${relativeTo(args.outDir, remediationPath)}`] : []),
  ]
  fs.writeFileSync(checksumsPath, `${checksumLines.join('\n')}\n`, 'utf8')

  process.stdout.write(
    `[scenario-playbook] summary scenario=${playbook.scenarioId} finalVerdict=${finalVerdict} finalReasonCode=${finalReasonCode} totalDurationMs=${totalDurationMs} report=${reportPath} verdict=${verdictPath}\n`,
  )
  process.exitCode = finalVerdict === 'PASS' ? 0 : 1
}

try {
  run()
} catch (error) {
  const msg = error instanceof Error ? error.message : String(error)
  process.stderr.write(`[scenario-playbook] fatal: ${msg}\n`)
  process.exitCode = 1
}
