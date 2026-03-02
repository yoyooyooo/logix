import { rmSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const scenario = process.argv[2]
if (!scenario) {
  throw new Error('usage: node ./scripts/contract-suite-compat.mjs <pass|with-autofill|inputs|requireRules:pass|requireRules:fail>')
}

const runIdByScenario = {
  pass: 'demo-contract-pass',
  'with-autofill': 'demo-contract-with-autofill',
  inputs: 'demo-contract-inputs',
  'requireRules:pass': 'demo-contract-requireRules-pass',
  'requireRules:fail': 'demo-contract-requireRules-fail',
}

const runId = runIdByScenario[scenario]
if (!runId) {
  throw new Error(`unknown scenario: ${scenario}`)
}

const entry = 'src/entry.basic.ts#AppRoot'
const outDir = path.resolve('.logix/out/contract-suite', scenario.replaceAll(':', '__'))
const cliConfig = './logix.cli.json'

const run = (cmd, args) => {
  const child = spawnSync(cmd, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (child.stdout) process.stdout.write(child.stdout)
  if (child.stderr) process.stderr.write(child.stderr)
  if (child.error) throw child.error
  return {
    exitCode: child.status ?? 1,
    stdout: child.stdout ?? '',
  }
}

const parseReasonCode = (stdoutText) => {
  const lines = stdoutText
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      const parsed = JSON.parse(lines[i])
      const reasonCode = parsed.reasonCode ?? parsed.error?.code ?? ''
      if (reasonCode) return reasonCode
    } catch {
      continue
    }
  }
  return ''
}

rmSync(outDir, { recursive: true, force: true })
await fs.mkdir(outDir, { recursive: true })

const exportRun = run('logix', ['ir', 'export', '--runId', `${runId}-export`, '--entry', entry, '--out', outDir, '--cliConfig', cliConfig])
if (exportRun.exitCode !== 0) process.exit(exportRun.exitCode)

const trialArgs = [
  'trialrun',
  '--runId',
  `${runId}-trialrun`,
  '--entry',
  entry,
  '--out',
  outDir,
  '--emit',
  'evidence',
  '--includeTrace',
  '--cliConfig',
  cliConfig,
]

if (scenario === 'with-autofill') {
  trialArgs.push('--includeAnchorAutofill')
}

if (scenario === 'inputs') {
  trialArgs.push('--includeContextPack', '--inputs', './inputs.demo.json')
}

const trialRun = run('logix', trialArgs)
if (trialRun.exitCode !== 0) process.exit(trialRun.exitCode)

if (scenario === 'requireRules:fail') {
  await fs.rm(path.join(outDir, 'evidence.json'), { force: true })
}

const validateRun = run('logix', [
  'ir',
  'validate',
  '--runId',
  `${runId}-validate`,
  '--in',
  outDir,
  '--profile',
  'contract',
  '--cliConfig',
  cliConfig,
])

if (scenario === 'requireRules:fail') {
  const reasonCode = parseReasonCode(validateRun.stdout)
  if (validateRun.exitCode === 2 && reasonCode === 'CLI_PROTOCOL_VIOLATION') {
    process.stdout.write('[logix-cli-playground] accepted expected violation for requireRules:fail.\n')
    process.exit(0)
  }
  process.stderr.write(
    `[logix-cli-playground] requireRules:fail expected exit=2/reason=CLI_PROTOCOL_VIOLATION, got exit=${validateRun.exitCode} reason=${reasonCode || '<empty>'}.\n`,
  )
  process.exit(validateRun.exitCode === 0 ? 1 : validateRun.exitCode)
}

process.exit(validateRun.exitCode)
