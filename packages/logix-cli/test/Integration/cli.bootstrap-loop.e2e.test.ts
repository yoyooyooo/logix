import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '../../../..')
const bootstrapScript = path.resolve(repoRoot, 'specs/103-cli-minimal-kernel-self-loop/scripts/bootstrap-loop.mjs')
const bootstrapScriptRelativePath = 'specs/103-cli-minimal-kernel-self-loop/scripts/bootstrap-loop.mjs'
const fakeCliRelativePath = 'packages/logix-cli/dist/bin/logix.js'
const BOOTSTRAP_LOOP_E2E_TIMEOUT_MS = process.env.CI === 'true' ? 45_000 : 18_000

type BootstrapAudit = {
  readonly kind: string
  readonly converged: boolean
  readonly finalVerdict: string
  readonly records: ReadonlyArray<Record<string, unknown>>
}

type StubNextAction = {
  readonly id: string
  readonly action: string
  readonly args: Record<string, unknown>
}

const quoteForShell = (value: string): string => `"${value.replace(/"/g, '\\"')}"`

const makeFakeCliStub = (args: { readonly nextAction: StubNextAction }): string => {
  const runPayload = {
    kind: 'CommandResult',
    exitCode: 3,
    reasonCode: 'VERIFY_RETRYABLE',
    instanceId: 'stub-instance',
    nextActions: [
      {
        ...args.nextAction,
        ifReasonCodes: ['VERIFY_RETRYABLE'],
      },
    ],
  }
  const resumePayload = {
    kind: 'CommandResult',
    exitCode: 0,
    reasonCode: 'VERIFY_PASS',
    instanceId: 'stub-instance',
    nextActions: [],
  }

  return [
    "const argv = process.argv.slice(2)",
    "if (argv.includes('--help')) process.exit(0)",
    "const flag = (name) => { const index = argv.indexOf(name); return index >= 0 ? argv[index + 1] : undefined }",
    "const mode = flag('--mode') ?? 'run'",
    `const runPayload = ${JSON.stringify(runPayload)}`,
    `const resumePayload = ${JSON.stringify(resumePayload)}`,
    'const payload = mode === "resume" ? resumePayload : runPayload',
    "process.stdout.write(`${JSON.stringify(payload)}\\n`)",
    'process.exit(0)',
    '',
  ].join('\n')
}

const createBootstrapLoopFixture = async (nextAction: StubNextAction) => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-bootstrap-loop-dsl-'))
  const fakeRepoRoot = path.join(tempRoot, 'repo')
  const fixtureBootstrapScript = path.join(fakeRepoRoot, bootstrapScriptRelativePath)
  const fakeCli = path.join(fakeRepoRoot, fakeCliRelativePath)

  await fs.mkdir(path.dirname(fixtureBootstrapScript), { recursive: true })
  await fs.mkdir(path.dirname(fakeCli), { recursive: true })
  await fs.writeFile(fixtureBootstrapScript, await fs.readFile(bootstrapScript, 'utf8'), 'utf8')
  await fs.writeFile(fakeCli, makeFakeCliStub({ nextAction }), 'utf8')

  return { fakeRepoRoot, fixtureBootstrapScript, tempRoot }
}

const runBootstrapLoop = (args: {
  readonly cwd: string
  readonly scriptPath: string
  readonly runIdPrefix: string
  readonly outDir: string
  readonly auditFile: string
}) =>
  spawnSync(
    process.execPath,
    [
      args.scriptPath,
      '--runIdPrefix',
      args.runIdPrefix,
      '--target',
      'fixture:retryable',
      '--maxRounds',
      '3',
      '--maxAttempts',
      '3',
      '--outDir',
      args.outDir,
      '--auditFile',
      args.auditFile,
    ],
    {
      cwd: args.cwd,
      encoding: 'utf8',
      env: process.env,
    },
  )

const readAudit = async (auditFile: string): Promise<BootstrapAudit> =>
  JSON.parse(await fs.readFile(auditFile, 'utf8')) as BootstrapAudit

describe('logix-cli integration (bootstrap-loop e2e)', () => {
  it('runs resume with canonical rerun args.target and does not rely on implicit target remap', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-bootstrap-loop-e2e-'))
    const outDir = path.join(tmp, 'artifacts')
    const auditFile = path.join(tmp, 'bootstrap-loop.audit.json')

    const run = spawnSync(
      process.execPath,
      [
        bootstrapScript,
        '--runIdPrefix',
        'bootstrap-e2e',
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
        cwd: repoRoot,
        encoding: 'utf8',
        env: process.env,
      },
    )

    expect(run.status).toBe(5)
    expect(run.stdout).toContain('[bootstrap-loop] attempt=1')
    expect(run.stdout).toContain('verdict=RETRYABLE')
    expect(run.stdout).toContain('decision=continue:rerun')
    expect(run.stdout).toContain('finalVerdict=NO_PROGRESS')
    expect(run.stderr).not.toContain('[bootstrap-loop] fatal')

    const stat = await fs.stat(auditFile)
    expect(stat.isFile()).toBe(true)

    const audit = await readAudit(auditFile)

    expect(audit.kind).toBe('BootstrapLoopAudit')
    expect(audit.converged).toBe(false)
    expect(audit.finalVerdict).toBe('NO_PROGRESS')
    expect(audit.records.length).toBeGreaterThanOrEqual(2)
    expect(audit.records[0]?.mode).toBe('run')
    expect(audit.records.slice(1).some((record) => record.mode === 'resume')).toBe(true)
    expect(audit.records[0]?.target).toBe('fixture:retryable')
    expect(audit.records[1]?.target).toBe('fixture:retryable')
    expect(audit.records.some((record) => record.target === 'fixture:pass')).toBe(false)

    for (const record of audit.records) {
      expect(typeof record.runId).toBe('string')
      expect(typeof record.reasonCode).toBe('string')
      expect(typeof record.attempt).toBe('number')
      expect(typeof record.verdict).toBe('string')
      expect(typeof record.exitCode).toBe('number')
      expect(record.mode === 'run' || record.mode === 'resume').toBe(true)
      expect(typeof record.target).toBe('string')
      expect(typeof record.instanceId === 'string' || record.instanceId === null).toBe(true)
    }
  }, BOOTSTRAP_LOOP_E2E_TIMEOUT_MS)

  it('fails fast for unknown action even when args.command exists (no fallback execution)', async () => {
    const markerFile = path.join(os.tmpdir(), `bootstrap-dsl-marker-${Date.now()}.txt`)
    const fixture = await createBootstrapLoopFixture({
      id: 'unknown-action-with-command',
      action: 'command.run',
      args: {
        command: `${quoteForShell(process.execPath)} -e "require('node:fs').writeFileSync(${JSON.stringify(markerFile)}, 'executed')"`,
      },
    })
    const outDir = path.join(fixture.tempRoot, 'artifacts')
    const auditFile = path.join(fixture.tempRoot, 'bootstrap-loop.audit.json')

    const run = runBootstrapLoop({
      cwd: fixture.fakeRepoRoot,
      scriptPath: fixture.fixtureBootstrapScript,
      runIdPrefix: 'bootstrap-unknown-action',
      outDir,
      auditFile,
    })

    expect(run.status).toBe(2)
    expect(run.stdout).toContain('decision=error:unknown-action:command.run')
    expect(run.stdout).not.toContain('attempt=2 mode=resume')
    expect(run.stderr).not.toContain('[bootstrap-loop] fatal')

    await expect(fs.stat(markerFile)).rejects.toThrow()

    const audit = await readAudit(auditFile)
    expect(audit.finalVerdict).toBe('RETRYABLE')
    expect(audit.converged).toBe(false)
    expect(audit.records.length).toBe(1)
    expect(audit.records[0]?.verdict).toBe('RETRYABLE')
  })

  it('fails fast when rerun action misses required args.target', async () => {
    const fixture = await createBootstrapLoopFixture({
      id: 'rerun-missing-target',
      action: 'rerun',
      args: {
        mode: 'resume',
      },
    })
    const outDir = path.join(fixture.tempRoot, 'artifacts')
    const auditFile = path.join(fixture.tempRoot, 'bootstrap-loop.audit.json')

    const run = runBootstrapLoop({
      cwd: fixture.fakeRepoRoot,
      scriptPath: fixture.fixtureBootstrapScript,
      runIdPrefix: 'bootstrap-rerun-missing-target',
      outDir,
      auditFile,
    })

    expect(run.status).toBe(2)
    expect(run.stdout).toContain('decision=error:rerun:rerun-missing-target:missing-args.target')
    expect(run.stdout).not.toContain('attempt=2 mode=resume')
    expect(run.stderr).not.toContain('[bootstrap-loop] fatal')

    const audit = await readAudit(auditFile)
    expect(audit.finalVerdict).toBe('RETRYABLE')
    expect(audit.converged).toBe(false)
    expect(audit.records.length).toBe(1)
    expect(audit.records[0]?.verdict).toBe('RETRYABLE')
  })
})
