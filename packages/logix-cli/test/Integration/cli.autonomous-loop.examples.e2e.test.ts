import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

type AutonomousLoopVerdict = {
  readonly runIdPrefix: string
  readonly steps: ReadonlyArray<unknown>
  readonly finalVerdict: string
  readonly reasonCodes: ReadonlyArray<string>
  readonly decision?: {
    readonly chain?: ReadonlyArray<string>
    readonly identityChain?: ReadonlyArray<{
      readonly runId: string
      readonly mode: 'run' | 'resume'
      readonly instanceId: string
      readonly txnSeq: number
      readonly opSeq: number
      readonly attemptSeq: number
      readonly reasonCode: string
      readonly trajectory: ReadonlyArray<{ readonly attemptSeq: number; readonly reasonCode: string }>
    }>
  }
}

type VerifyLoopReport = {
  readonly kind: 'VerifyLoopReport'
  readonly runId: string
  readonly mode: 'run' | 'resume'
  readonly instanceId: string
  readonly previousRunId?: string
  readonly txnSeq: number
  readonly opSeq: number
  readonly attemptSeq: number
  readonly reasonCode: string
  readonly trajectory: ReadonlyArray<{ readonly attemptSeq: number; readonly reasonCode: string }>
}

const repoRoot = path.resolve(__dirname, '../../../..')
const scriptPath = path.resolve(repoRoot, 'examples/logix/scripts/cli-autonomous-loop.mjs')

const runAutonomousLoop = (args: {
  readonly outDir: string
  readonly runIdPrefix: string
  readonly entry: string
  readonly verifyTarget: string
  readonly gateScope?: 'runtime' | 'governance'
  readonly allowFixture?: boolean
}): { readonly status: number | null; readonly stdout: string; readonly stderr: string } => {
  const commandArgs = [
    scriptPath,
    '--runIdPrefix',
    args.runIdPrefix,
    '--outDir',
    args.outDir,
    '--entry',
    args.entry,
    '--verifyTarget',
    args.verifyTarget,
    '--repoRoot',
    repoRoot,
  ]

  if (args.gateScope) {
    commandArgs.push('--gateScope', args.gateScope)
  }

  if (args.allowFixture) {
    commandArgs.push('--allowFixture')
  }

  const run = spawnSync(
    process.execPath,
    commandArgs,
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

describe('logix-cli integration (autonomous-loop examples e2e)', () => {
  it('writes verdict.json/checksums.sha256 and stays deterministic on repeated runs', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-autonomous-loop-e2e-'))
    const firstOutDir = path.join(tmp, 'run-1')
    const secondOutDir = path.join(tmp, 'run-2')

    const runIdPrefix = 'autonomous-loop-e2e'
    const entry = 'examples/logix/src/runtime/root.impl.ts#RootImpl'
    const verifyTarget = 'fixture:pass'

    const first = runAutonomousLoop({
      outDir: firstOutDir,
      runIdPrefix,
      entry,
      verifyTarget,
      allowFixture: true,
    })

    expect(first.status).toBe(0)
    expect(first.stderr).toBe('')
    expect(first.stdout).toContain('[autonomous-loop] config gateScope=governance')

    const firstVerdictPath = path.join(firstOutDir, 'verdict.json')
    const firstChecksumsPath = path.join(firstOutDir, 'checksums.sha256')

    expect(existsSync(firstVerdictPath)).toBe(true)
    expect(existsSync(firstChecksumsPath)).toBe(true)

    const firstVerdict = JSON.parse(await fs.readFile(firstVerdictPath, 'utf8')) as AutonomousLoopVerdict
    expect(firstVerdict.runIdPrefix).toBe(runIdPrefix)
    expect(Array.isArray(firstVerdict.steps)).toBe(true)
    expect(firstVerdict.steps.length).toBeGreaterThan(0)
    expect(typeof firstVerdict.finalVerdict).toBe('string')
    expect(Array.isArray(firstVerdict.reasonCodes)).toBe(true)
    expect(Array.isArray(firstVerdict.decision?.chain)).toBe(true)
    expect(firstVerdict.decision?.chain?.[0]).toBe('run')
    expect(Array.isArray(firstVerdict.decision?.identityChain)).toBe(true)
    expect(firstVerdict.decision?.identityChain?.[0]?.attemptSeq).toBe(1)

    const firstChecksums = await fs.readFile(firstChecksumsPath, 'utf8')
    expect(firstChecksums).toMatch(/\s{2}verdict\.json$/m)

    const firstVerifyRunReportPath = path.join(firstOutDir, '06-verify-loop-run', 'verify-loop.report.json')
    const firstVerifyResumeReportPath = path.join(firstOutDir, '07-verify-loop-resume', 'verify-loop.report.json')
    expect(existsSync(firstVerifyRunReportPath)).toBe(true)

    const firstVerifyRunReport = JSON.parse(await fs.readFile(firstVerifyRunReportPath, 'utf8')) as VerifyLoopReport

    expect(firstVerifyRunReport.kind).toBe('VerifyLoopReport')
    expect(firstVerifyRunReport.mode).toBe('run')
    expect(firstVerifyRunReport.instanceId.length).toBeGreaterThan(0)
    expect(firstVerifyRunReport.txnSeq).toBe(1)
    expect(firstVerifyRunReport.opSeq).toBe(1)
    expect(firstVerifyRunReport.attemptSeq).toBe(1)
    expect(firstVerifyRunReport.trajectory.map((item) => item.attemptSeq)).toEqual([1])
    const firstIdentityChain = firstVerdict.decision?.identityChain ?? []
    expect(firstIdentityChain[0]).toEqual({
      runId: firstVerifyRunReport.runId,
      mode: firstVerifyRunReport.mode,
      instanceId: firstVerifyRunReport.instanceId,
      txnSeq: firstVerifyRunReport.txnSeq,
      opSeq: firstVerifyRunReport.opSeq,
      attemptSeq: firstVerifyRunReport.attemptSeq,
      reasonCode: firstVerifyRunReport.reasonCode,
      trajectory: firstVerifyRunReport.trajectory,
    })
    if (existsSync(firstVerifyResumeReportPath)) {
      const firstVerifyResumeReport = JSON.parse(await fs.readFile(firstVerifyResumeReportPath, 'utf8')) as VerifyLoopReport
      expect(firstVerifyResumeReport.kind).toBe('VerifyLoopReport')
      expect(firstVerifyResumeReport.mode).toBe('resume')
      expect(firstVerifyResumeReport.instanceId).toBe(firstVerifyRunReport.instanceId)
      expect(firstVerifyResumeReport.previousRunId).toBe(firstVerifyRunReport.runId)
      expect(firstVerifyResumeReport.txnSeq).toBe(2)
      expect(firstVerifyResumeReport.opSeq).toBe(2)
      expect(firstVerifyResumeReport.attemptSeq).toBe(2)
      expect(firstVerifyResumeReport.trajectory.length).toBeGreaterThan(1)
      expect(firstVerifyResumeReport.trajectory.map((item) => item.attemptSeq)).toEqual([1, 2])
      expect(firstVerdict.decision?.identityChain?.map((item) => item.attemptSeq)).toEqual([1, 2])
      expect(new Set(firstVerdict.decision?.identityChain?.map((item) => item.instanceId)).size).toBe(1)
      expect(firstIdentityChain[1]).toEqual({
        runId: firstVerifyResumeReport.runId,
        mode: firstVerifyResumeReport.mode,
        instanceId: firstVerifyResumeReport.instanceId,
        txnSeq: firstVerifyResumeReport.txnSeq,
        opSeq: firstVerifyResumeReport.opSeq,
        attemptSeq: firstVerifyResumeReport.attemptSeq,
        reasonCode: firstVerifyResumeReport.reasonCode,
        trajectory: firstVerifyResumeReport.trajectory,
      })
    }

    const second = runAutonomousLoop({
      outDir: secondOutDir,
      runIdPrefix,
      entry,
      verifyTarget,
      allowFixture: true,
    })

    expect(second.status).toBe(0)
    expect(second.stderr).toBe('')
    expect(second.stdout).toContain('[autonomous-loop] config gateScope=governance')

    const secondVerdictPath = path.join(secondOutDir, 'verdict.json')
    const secondChecksumsPath = path.join(secondOutDir, 'checksums.sha256')

    expect(existsSync(secondVerdictPath)).toBe(true)
    expect(existsSync(secondChecksumsPath)).toBe(true)

    const secondVerdict = JSON.parse(await fs.readFile(secondVerdictPath, 'utf8')) as AutonomousLoopVerdict

    expect(secondVerdict.finalVerdict).toBe(firstVerdict.finalVerdict)
    expect(secondVerdict.reasonCodes).toEqual(firstVerdict.reasonCodes)
    expect(secondVerdict.steps.length).toBe(firstVerdict.steps.length)

    const secondVerifyRunReportPath = path.join(secondOutDir, '06-verify-loop-run', 'verify-loop.report.json')
    const secondVerifyResumeReportPath = path.join(secondOutDir, '07-verify-loop-resume', 'verify-loop.report.json')
    expect(existsSync(secondVerifyRunReportPath)).toBe(true)

    const secondVerifyRunReport = JSON.parse(await fs.readFile(secondVerifyRunReportPath, 'utf8')) as VerifyLoopReport
    if (existsSync(secondVerifyResumeReportPath)) {
      const secondVerifyResumeReport = JSON.parse(await fs.readFile(secondVerifyResumeReportPath, 'utf8')) as VerifyLoopReport
      expect(secondVerifyResumeReport.instanceId).toBe(secondVerifyRunReport.instanceId)
      expect(secondVerifyResumeReport.previousRunId).toBe(secondVerifyRunReport.runId)
      expect(secondVerifyResumeReport.trajectory.length).toBeGreaterThan(1)
      expect(secondVerifyResumeReport.trajectory.map((item) => item.attemptSeq)).toEqual([1, 2])
    }
  }, 180_000)
})
