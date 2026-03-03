import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '../../../..')
const bootstrapScript = path.resolve(repoRoot, 'specs/103-cli-minimal-kernel-self-loop/scripts/bootstrap-loop.mjs')
const autonomousScript = path.resolve(repoRoot, 'examples/logix/scripts/cli-autonomous-loop.mjs')

const quoteForShell = (value: string): string => `"${value.replace(/"/g, '\\"')}"`

const makeBootstrapCliStub = (markerFile: string): string => {
  const runPayload = {
    kind: 'CommandResult',
    exitCode: 3,
    reasonCode: 'VERIFY_RETRYABLE',
    instanceId: 'stub-instance',
    nextActions: [
      {
        id: 'bootstrap-unknown-action',
        action: 'command.run',
        args: {
          command: `${quoteForShell(process.execPath)} -e "require('node:fs').writeFileSync(${JSON.stringify(markerFile)}, 'executed')"`,
        },
        ifReasonCodes: ['VERIFY_RETRYABLE'],
      },
    ],
  }

  return [
    "const argv = process.argv.slice(2)",
    "if (argv.includes('--help')) process.exit(0)",
    `const payload = ${JSON.stringify(runPayload)}`,
    "process.stdout.write(`${JSON.stringify(payload)}\\n`)",
    'process.exit(0)',
    '',
  ].join('\n')
}

const makeAutonomousCliStub = (markerFile: string): string => {
  const unknownAction = {
    id: 'autonomous-unknown-action',
    action: 'command.run',
    args: {
      command: `${quoteForShell(process.execPath)} -e "require('node:fs').writeFileSync(${JSON.stringify(markerFile)}, 'executed')"`,
    },
    ifReasonCodes: ['VERIFY_RETRYABLE'],
  }

  const reportBase = {
    schemaVersion: 1,
    kind: 'VerifyLoopReport',
    instanceId: 'stub-instance',
    gateScope: 'runtime',
    txnSeq: 1,
    opSeq: 1,
    attemptSeq: 1,
    trajectory: [{ attemptSeq: 1, reasonCode: 'VERIFY_RETRYABLE' }],
  }

  const commandResultPass = {
    kind: 'CommandResult',
    exitCode: 0,
    reasonCode: 'VERIFY_PASS',
    instanceId: 'stub-instance',
    txnSeq: 1,
    opSeq: 1,
    attemptSeq: 1,
    nextActions: [],
    reasons: [],
  }

  return [
    "const fs = require('node:fs')",
    "const path = require('node:path')",
    'const argv = process.argv.slice(2)',
    "if (argv.includes('--help')) process.exit(0)",
    "const flag = (name) => { const index = argv.indexOf(name); return index >= 0 ? argv[index + 1] : undefined }",
    "const command = argv[0] ?? ''",
    "const mode = flag('--mode') ?? 'run'",
    "const runId = flag('--runId') ?? 'stub-run'",
    "const outDir = flag('--out')",
    `const unknownAction = ${JSON.stringify(unknownAction)}`,
    `const reportBase = ${JSON.stringify(reportBase)}`,
    `const commandResultPass = ${JSON.stringify(commandResultPass)}`,
    "const writeReport = (payload) => {",
    '  if (!outDir) return',
    '  fs.mkdirSync(outDir, { recursive: true })',
    "  fs.writeFileSync(path.join(outDir, 'verify-loop.report.json'), `${JSON.stringify(payload, null, 2)}\\n`, 'utf8')",
    '}',
    "if (command === 'verify-loop' && mode === 'run') {",
    '  const report = { ...reportBase, runId, mode: "run", verdict: "RETRYABLE", reasonCode: "VERIFY_RETRYABLE", nextActions: [unknownAction] }',
    '  writeReport(report)',
    "  process.stdout.write(`${JSON.stringify({ kind: 'CommandResult', exitCode: 3, reasonCode: 'VERIFY_RETRYABLE', instanceId: 'stub-instance', txnSeq: report.txnSeq, opSeq: report.opSeq, attemptSeq: report.attemptSeq, nextActions: [unknownAction] })}\\n`)",
    '  process.exit(0)',
    '}',
    "if (command === 'verify-loop') {",
    '  const report = { ...reportBase, runId, mode, verdict: "PASS", reasonCode: "VERIFY_PASS", nextActions: [], trajectory: [{ attemptSeq: 1, reasonCode: "VERIFY_PASS" }] }',
    '  writeReport(report)',
    "  process.stdout.write(`${JSON.stringify({ kind: 'CommandResult', exitCode: 0, reasonCode: 'VERIFY_PASS', instanceId: 'stub-instance', txnSeq: report.txnSeq, opSeq: report.opSeq, attemptSeq: report.attemptSeq, nextActions: [] })}\\n`)",
    '  process.exit(0)',
    '}',
    "process.stdout.write(`${JSON.stringify(commandResultPass)}\\n`)",
    'process.exit(0)',
    '',
  ].join('\n')
}

const writeFixtureScripts = async (args: {
  readonly tempRoot: string
  readonly cliStubSource: string
}) => {
  const fakeRepoRoot = path.join(args.tempRoot, 'repo')
  const fixtureBootstrapScript = path.join(fakeRepoRoot, 'specs/103-cli-minimal-kernel-self-loop/scripts/bootstrap-loop.mjs')
  const fixtureAutonomousScript = path.join(fakeRepoRoot, 'examples/logix/scripts/cli-autonomous-loop.mjs')
  const fakeCli = path.join(fakeRepoRoot, 'packages/logix-cli/dist/bin/logix.js')

  await fs.mkdir(path.dirname(fixtureBootstrapScript), { recursive: true })
  await fs.mkdir(path.dirname(fixtureAutonomousScript), { recursive: true })
  await fs.mkdir(path.dirname(fakeCli), { recursive: true })
  await fs.writeFile(fixtureBootstrapScript, await fs.readFile(bootstrapScript, 'utf8'), 'utf8')
  await fs.writeFile(fixtureAutonomousScript, await fs.readFile(autonomousScript, 'utf8'), 'utf8')
  await fs.writeFile(fakeCli, args.cliStubSource, 'utf8')

  return { fakeRepoRoot, fixtureBootstrapScript, fixtureAutonomousScript }
}

describe('logix-cli integration (next-actions dsl-no-hardcode e2e)', () => {
  it('bootstrap-loop rejects unknown action with args.command fallback', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-dsl-no-hardcode-bootstrap-'))
    const markerFile = path.join(tempRoot, 'bootstrap-marker.txt')
    const fixture = await writeFixtureScripts({
      tempRoot,
      cliStubSource: makeBootstrapCliStub(markerFile),
    })
    const outDir = path.join(tempRoot, 'artifacts')
    const auditFile = path.join(tempRoot, 'bootstrap-loop.audit.json')

    const run = spawnSync(
      process.execPath,
      [
        fixture.fixtureBootstrapScript,
        '--runIdPrefix',
        'dsl-no-hardcode-bootstrap',
        '--target',
        'fixture:retryable',
        '--maxRounds',
        '3',
        '--maxAttempts',
        '3',
        '--outDir',
        outDir,
        '--auditFile',
        auditFile,
      ],
      {
        cwd: fixture.fakeRepoRoot,
        env: process.env,
        encoding: 'utf8',
      },
    )

    expect(run.status).toBe(2)
    expect(run.stdout).toContain('decision=error:unknown-action:command.run')
    await expect(fs.stat(markerFile)).rejects.toThrow()
  })

  it('autonomous-loop rejects unknown action with args.command fallback', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-dsl-no-hardcode-autonomous-'))
    const markerFile = path.join(tempRoot, 'autonomous-marker.txt')
    const fixture = await writeFixtureScripts({
      tempRoot,
      cliStubSource: makeAutonomousCliStub(markerFile),
    })
    const outDir = path.join(tempRoot, 'artifacts')

    const run = spawnSync(
      process.execPath,
      [
        fixture.fixtureAutonomousScript,
        '--runIdPrefix',
        'dsl-no-hardcode-autonomous',
        '--outDir',
        outDir,
        '--entry',
        'virtual/basic.ts#AppRoot',
        '--verifyTarget',
        'fixture:retryable',
        '--gateScope',
        'runtime',
        '--allowFixture',
        '--repoRoot',
        fixture.fakeRepoRoot,
      ],
      {
        cwd: fixture.fakeRepoRoot,
        env: process.env,
        encoding: 'utf8',
      },
    )

    expect(run.status).toBe(1)
    expect(run.stdout).toContain('[autonomous-loop] config gateScope=runtime')
    expect(run.stderr).toContain('[autonomous-loop] fatal: [autonomous-loop] canonical DSL 协议错误')
    await expect(fs.stat(markerFile)).rejects.toThrow()
  })
})
