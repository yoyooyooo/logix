import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '../../../..')
const scriptPath = path.resolve(repoRoot, 'specs/103-cli-minimal-kernel-self-loop/scripts/scenario-playbook-runner.mjs')
const playbookPath = path.resolve(repoRoot, 'specs/103-cli-minimal-kernel-self-loop/contracts/examples/s01.playbook.json')

describe('logix-cli integration (scenario verdict aggregate)', () => {
  it('emits scenario.verdict.json and checksums for playbook chain', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-scenario-verdict-aggregate-'))
    const outDir = path.join(tmp, 'out')

    const run = spawnSync(
      process.execPath,
      [scriptPath, '--input', playbookPath, '--outDir', outDir, '--repoRoot', repoRoot],
      {
        cwd: repoRoot,
        env: process.env,
        encoding: 'utf8',
      },
    )

    expect(run.status).toBe(0)
    expect(run.stderr).toBe('')

    const reportPath = path.join(outDir, 'scenario-playbook.report.json')
    const verdictPath = path.join(outDir, 'scenario.verdict.json')
    const checksumsPath = path.join(outDir, 'checksums.sha256')

    expect(existsSync(reportPath)).toBe(true)
    expect(existsSync(verdictPath)).toBe(true)
    expect(existsSync(checksumsPath)).toBe(true)

    const report = JSON.parse(await fs.readFile(reportPath, 'utf8')) as any
    const verdict = JSON.parse(await fs.readFile(verdictPath, 'utf8')) as any
    const checksums = await fs.readFile(checksumsPath, 'utf8')

    expect(report.kind).toBe('ScenarioPlaybookReport')
    expect(report.summary?.finalVerdict).toBe('PASS')
    expect(report.summary?.failedSteps).toBe(0)
    expect(verdict.kind).toBe('ScenarioVerdict')
    expect(verdict.finalVerdict).toBe('PASS')
    expect(verdict.finalReasonCode).toBe(report.summary?.finalReasonCode)
    expect(Array.isArray(verdict.decision?.steps)).toBe(true)
    expect(verdict.decision.steps.length).toBe(report.steps.length)

    expect(checksums).toMatch(/\s{2}scenario-playbook\.report\.json$/m)
    expect(checksums).toMatch(/\s{2}scenario\.verdict\.json$/m)
  }, 180_000)
})
