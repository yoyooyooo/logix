import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '../../../..')
const scriptPath = path.resolve(repoRoot, 'specs/103-cli-minimal-kernel-self-loop/scripts/scenario-playbook-runner.mjs')
const s01Playbook = path.resolve(repoRoot, 'specs/103-cli-minimal-kernel-self-loop/contracts/examples/s01.playbook.json')

type ScenarioVerdict = {
  readonly finalVerdict: string
  readonly finalReasonCode: string
  readonly reasonCodes: ReadonlyArray<string>
  readonly decision: {
    readonly primitiveChain: ReadonlyArray<string>
    readonly steps: ReadonlyArray<{
      readonly id: string
      readonly exitCode: number
      readonly reasonCode: string
    }>
  }
}

type ScenarioReport = {
  readonly scenarioId: string
  readonly runIdPrefix: string
  readonly primitiveChain: ReadonlyArray<string>
  readonly steps: ReadonlyArray<{
    readonly id: string
    readonly exitCode: number
    readonly reasonCode: string
  }>
  readonly summary: {
    readonly finalVerdict: string
    readonly finalReasonCode: string
    readonly failedSteps: number
  }
}

describe('logix-cli integration (scenario-playbook primitives chain)', () => {
  it('runs primitive-only chain and emits report/verdict/checksums artifacts', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-scenario-playbook-chain-'))
    const outDir = path.join(tmp, 'out')

    const run = spawnSync(
      process.execPath,
      [scriptPath, '--input', s01Playbook, '--outDir', outDir, '--repoRoot', repoRoot],
      {
        cwd: repoRoot,
        env: process.env,
        encoding: 'utf8',
      },
    )

    expect(run.status).toBe(0)
    expect(run.stderr).toBe('')
    expect(run.stdout).toContain('[scenario-playbook] step=describe')
    expect(run.stdout).toContain('[scenario-playbook] step=verify-loop.run')
    expect(run.stdout).toContain('finalVerdict=PASS')

    const reportPath = path.join(outDir, 'scenario-playbook.report.json')
    const verdictPath = path.join(outDir, 'scenario.verdict.json')
    const checksumsPath = path.join(outDir, 'checksums.sha256')

    expect(existsSync(reportPath)).toBe(true)
    expect(existsSync(verdictPath)).toBe(true)
    expect(existsSync(checksumsPath)).toBe(true)

    const report = JSON.parse(await fs.readFile(reportPath, 'utf8')) as ScenarioReport
    const verdict = JSON.parse(await fs.readFile(verdictPath, 'utf8')) as ScenarioVerdict
    const checksums = await fs.readFile(checksumsPath, 'utf8')

    expect(report.scenarioId).toBe('S01')
    expect(report.runIdPrefix).toBe('scenario-s01')
    expect(report.summary.finalVerdict).toBe('PASS')
    expect(report.summary.failedSteps).toBe(0)
    expect(report.steps.length).toBe(report.primitiveChain.length)
    expect(report.steps.every((step) => step.exitCode === 0)).toBe(true)
    expect(report.steps.map((step) => step.id)).toEqual(report.primitiveChain)

    expect(verdict.finalVerdict).toBe('PASS')
    expect(verdict.finalReasonCode).toBe('VERIFY_PASS')
    expect(verdict.reasonCodes).toContain('VERIFY_PASS')
    expect(verdict.decision.primitiveChain).toEqual(report.primitiveChain)
    expect(verdict.decision.steps.length).toBe(report.steps.length)

    expect(checksums).toMatch(/\s{2}scenario-playbook\.report\.json$/m)
    expect(checksums).toMatch(/\s{2}scenario\.verdict\.json$/m)
  }, 180_000)
})
