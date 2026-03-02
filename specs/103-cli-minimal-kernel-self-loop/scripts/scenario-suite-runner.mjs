import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const defaultRepoRoot = path.resolve(here, '../../..')
const scenarioPlaybookRunnerPath = path.resolve(here, './scenario-playbook-runner.mjs')

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

  if (!inputPath) throw new Error('[scenario-suite] 缺少参数 --input <suite.json>')
  if (!outDir) throw new Error('[scenario-suite] 缺少参数 --outDir <dir>')
  return { inputPath, outDir, repoRoot }
}

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true })
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'))

const sha256File = (filePath) => createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')

const parseChecksumFile = (filePath) => {
  if (!fs.existsSync(filePath)) return { valid: false, entries: [], issues: ['CHECKSUMS_FILE_MISSING'] }
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const entries = []
  const issues = []
  for (const line of lines) {
    const match = line.match(/^([a-f0-9]{64})\s{2}(.+)$/u)
    if (!match?.[1] || !match?.[2]) {
      issues.push(`CHECKSUM_LINE_INVALID:${line}`)
      continue
    }
    entries.push({ sha256: match[1], relativePath: match[2] })
  }
  return { valid: issues.length === 0, entries, issues }
}

const verifyChecksums = (scenarioOutDir) => {
  const parsed = parseChecksumFile(path.resolve(scenarioOutDir, 'checksums.sha256'))
  if (!parsed.valid) return { valid: false, issues: parsed.issues }

  const issues = []
  for (const entry of parsed.entries) {
    const target = path.resolve(scenarioOutDir, entry.relativePath)
    if (!fs.existsSync(target)) {
      issues.push(`CHECKSUM_TARGET_MISSING:${entry.relativePath}`)
      continue
    }
    const actual = sha256File(target)
    if (actual !== entry.sha256) {
      issues.push(`CHECKSUM_MISMATCH:${entry.relativePath}`)
    }
  }
  return { valid: issues.length === 0, issues }
}

const toScenarioStatus = (args) => {
  if (!args.hasReport || !args.hasVerdict) return 'missing'
  if (!args.checksumsValid) return 'partial'
  if (!args.requiredChainMatched) return 'partial'
  if (!args.requiredArtifactsPresent) return 'partial'
  if (args.finalVerdict !== 'PASS') return 'partial'
  if (args.runStatus !== 0) return 'partial'
  return 'covered'
}

const run = () => {
  const args = parseArgs()
  ensureDir(args.outDir)

  const suite = readJson(args.inputPath)
  if (!suite || typeof suite !== 'object' || Array.isArray(suite)) {
    throw new Error('[scenario-suite] input 根对象必须是 object')
  }
  if (suite.schemaVersion !== 1 || suite.kind !== 'ScenarioSuiteInput') {
    throw new Error('[scenario-suite] schemaVersion/kind 非法')
  }
  if (!Array.isArray(suite.scenarios) || suite.scenarios.length === 0) {
    throw new Error('[scenario-suite] scenarios 必须是非空数组')
  }

  const scenarios = []
  for (const [index, item] of suite.scenarios.entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`[scenario-suite] scenarios[${index}] 必须是对象`)
    }
    const scenarioId = typeof item.scenarioId === 'string' ? item.scenarioId : ''
    const playbookPath = typeof item.playbookPath === 'string' ? item.playbookPath : ''
    if (!/^S[0-9]{2}$/u.test(scenarioId)) throw new Error(`[scenario-suite] scenarios[${index}].scenarioId 非法`)
    if (playbookPath.trim().length === 0) throw new Error(`[scenario-suite] scenarios[${index}].playbookPath 为空`)

    const requiredChain = Array.isArray(item.requiredChain) ? item.requiredChain.filter((x) => typeof x === 'string') : []
    const requiredArtifacts = Array.isArray(item.requiredArtifacts)
      ? item.requiredArtifacts.filter((x) => typeof x === 'string')
      : []
    if (requiredArtifacts.length === 0) {
      throw new Error(`[scenario-suite] scenarios[${index}].requiredArtifacts 不能为空`)
    }

    scenarios.push({
      scenarioId,
      playbookPath: path.resolve(args.repoRoot, playbookPath),
      requiredChain,
      requiredArtifacts,
    })
  }

  const scenarioResults = []
  for (const scenario of scenarios) {
    const scenarioOutDir = path.resolve(args.outDir, 'scenarios', scenario.scenarioId)
    ensureDir(scenarioOutDir)

    const exec = spawnSync(
      process.execPath,
      [scenarioPlaybookRunnerPath, '--input', scenario.playbookPath, '--outDir', scenarioOutDir, '--repoRoot', args.repoRoot],
      { cwd: args.repoRoot, env: process.env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    )

    const reportPath = path.resolve(scenarioOutDir, 'scenario-playbook.report.json')
    const verdictPath = path.resolve(scenarioOutDir, 'scenario.verdict.json')
    const hasReport = fs.existsSync(reportPath)
    const hasVerdict = fs.existsSync(verdictPath)
    const report = hasReport ? readJson(reportPath) : undefined
    const verdict = hasVerdict ? readJson(verdictPath) : undefined

    const checksums = verifyChecksums(scenarioOutDir)

    const requiredChainMatched =
      scenario.requiredChain.length === 0
        ? true
        : JSON.stringify(scenario.requiredChain) === JSON.stringify(Array.isArray(report?.primitiveChain) ? report.primitiveChain : [])
    const requiredArtifactsPresent = scenario.requiredArtifacts.every((artifact) => fs.existsSync(path.resolve(scenarioOutDir, artifact)))

    const finalVerdict = typeof verdict?.finalVerdict === 'string' ? verdict.finalVerdict : 'BLOCKED'
    const finalReasonCode =
      typeof verdict?.finalReasonCode === 'string'
        ? verdict.finalReasonCode
        : hasVerdict
          ? 'SCENARIO_VERDICT_MISSING_REASON'
          : 'SCENARIO_VERDICT_MISSING'

    const reasonCodes = Array.isArray(verdict?.reasonCodes)
      ? verdict.reasonCodes.filter((item) => typeof item === 'string')
      : [finalReasonCode]

    const status = toScenarioStatus({
      hasReport,
      hasVerdict,
      checksumsValid: checksums.valid,
      requiredChainMatched,
      requiredArtifactsPresent,
      finalVerdict,
      runStatus: typeof exec.status === 'number' ? exec.status : 1,
    })

    scenarioResults.push({
      scenarioId: scenario.scenarioId,
      status,
      finalVerdict,
      finalReasonCode,
      reasonCodes: Array.from(new Set(reasonCodes)),
      checksumsValid: checksums.valid,
      requiredChainMatched,
      requiredArtifactsPresent,
      runStatus: typeof exec.status === 'number' ? exec.status : 1,
      artifacts: [
        ...[reportPath, verdictPath].filter((filePath) => fs.existsSync(filePath)).map((filePath) => ({
          path: path.relative(args.outDir, filePath).split(path.sep).join('/'),
          sha256: sha256File(filePath),
          size: fs.statSync(filePath).size,
        })),
      ],
      issues: checksums.issues,
    })

    process.stdout.write(
      `[scenario-suite] scenario=${scenario.scenarioId} runStatus=${typeof exec.status === 'number' ? exec.status : 'N/A'} status=${status} verdict=${finalVerdict} reason=${finalReasonCode}\n`,
    )
  }

  const summary = {
    covered: scenarioResults.filter((item) => item.status === 'covered').length,
    partial: scenarioResults.filter((item) => item.status === 'partial').length,
    missing: scenarioResults.filter((item) => item.status === 'missing').length,
    total: scenarioResults.length,
  }

  const bundle = {
    schemaVersion: 1,
    kind: 'VerificationBundle',
    suiteId: typeof suite.suiteId === 'string' ? suite.suiteId : 'scenario-suite',
    generatedAt: new Date().toISOString(),
    requiredScenarios: scenarios.map((item) => item.scenarioId),
    scenarios: scenarioResults,
    summary,
  }

  const bundlePath = path.resolve(args.outDir, 'verification.bundle.json')
  fs.writeFileSync(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8')

  process.stdout.write(
    `[scenario-suite] summary suiteId=${bundle.suiteId} covered=${summary.covered} partial=${summary.partial} missing=${summary.missing} total=${summary.total} bundle=${bundlePath}\n`,
  )
}

try {
  run()
} catch (error) {
  const msg = error instanceof Error ? error.message : String(error)
  process.stderr.write(`[scenario-suite] fatal: ${msg}\n`)
  process.exitCode = 1
}
