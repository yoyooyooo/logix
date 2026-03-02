import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

type CliRunner = {
  readonly command: string
  readonly baseArgs: ReadonlyArray<string>
}

type ParsedCommandResult = {
  readonly kind: 'CommandResult'
  readonly exitCode: number
  readonly reasonCode: string
  readonly reasons?: ReadonlyArray<{ readonly code?: string }>
}

const repoRoot = path.resolve(__dirname, '../../../..')
const cliDistBin = path.resolve(repoRoot, 'packages/logix-cli/dist/bin/logix.js')
const cliSrcBin = path.resolve(repoRoot, 'packages/logix-cli/src/bin/logix.ts')

const resolveCliRunner = (): CliRunner =>
  existsSync(cliDistBin)
    ? {
        command: process.execPath,
        baseArgs: [cliDistBin],
      }
    : {
        command: process.execPath,
        baseArgs: ['--import', 'tsx/esm', cliSrcBin],
      }

const parseCommandResult = (stdoutText: string): ParsedCommandResult => {
  const lines = stdoutText
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i]
    try {
      const parsed = JSON.parse(line) as ParsedCommandResult
      if (parsed && parsed.kind === 'CommandResult') {
        return parsed
      }
    } catch {
      continue
    }
  }

  throw new Error('failed to parse CommandResult from CLI stdout')
}

const runVerifyLoopProcess = (args: {
  readonly runId: string
  readonly target: string
  readonly outDir: string
}): { readonly status: number | null; readonly stdout: string; readonly stderr: string } => {
  const cliRunner = resolveCliRunner()
  const run = spawnSync(
    cliRunner.command,
    [
      ...cliRunner.baseArgs,
      'verify-loop',
      '--runId',
      args.runId,
      '--mode',
      'run',
      '--target',
      args.target,
      '--out',
      args.outDir,
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  if (run.error) {
    throw run.error
  }

  return {
    status: run.status,
    stdout: run.stdout ?? '',
    stderr: run.stderr ?? '',
  }
}

describe('logix-cli integration (verify-loop process exit e2e)', () => {
  it('maps violation fixture to process exitCode=2 and registered reason', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-verify-loop-process-violation-'))
    const outDir = path.join(tmp, 'out')

    const run = runVerifyLoopProcess({
      runId: 'process-verify-violation-1',
      target: 'fixture:violation',
      outDir,
    })

    expect(run.status).toBe(2)
    expect(run.stderr).toBe('')

    const result = parseCommandResult(run.stdout)
    expect(result.exitCode).toBe(2)
    expect(result.reasonCode).toBe('GATE_TEST_FAILED')
    expect(result.reasons?.[0]?.code).toBe('GATE_TEST_FAILED')

    const report = JSON.parse(await fs.readFile(path.join(outDir, 'verify-loop.report.json'), 'utf8')) as {
      readonly verdict: string
      readonly exitCode: number
      readonly reasonCode: string
    }
    expect(report.verdict).toBe('VIOLATION')
    expect(report.exitCode).toBe(2)
    expect(report.reasonCode).toBe('GATE_TEST_FAILED')
  })

  it('maps not-implemented fixture to process exitCode=4 and reason CLI_NOT_IMPLEMENTED', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-verify-loop-process-not-implemented-'))
    const outDir = path.join(tmp, 'out')

    const run = runVerifyLoopProcess({
      runId: 'process-verify-not-implemented-1',
      target: 'fixture:not-implemented',
      outDir,
    })

    expect(run.status).toBe(4)
    expect(run.stderr).toBe('')

    const result = parseCommandResult(run.stdout)
    expect(result.exitCode).toBe(4)
    expect(result.reasonCode).toBe('CLI_NOT_IMPLEMENTED')
    expect(result.reasons?.[0]?.code).toBe('CLI_NOT_IMPLEMENTED')

    const report = JSON.parse(await fs.readFile(path.join(outDir, 'verify-loop.report.json'), 'utf8')) as {
      readonly verdict: string
      readonly exitCode: number
      readonly reasonCode: string
    }
    expect(report.verdict).toBe('NOT_IMPLEMENTED')
    expect(report.exitCode).toBe(4)
    expect(report.reasonCode).toBe('CLI_NOT_IMPLEMENTED')
  })
})
