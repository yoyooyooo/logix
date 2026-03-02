import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '../../../..')
const scriptPath = path.resolve(repoRoot, 'specs/103-cli-minimal-kernel-self-loop/scripts/scenario-playbook-runner.mjs')
const s08Playbook = path.resolve(repoRoot, 'specs/103-cli-minimal-kernel-self-loop/contracts/examples/s08.playbook.json')

describe('logix-cli integration (scenario external-source sync)', () => {
  it('runs S08 scenario playbook with primitive chain and emits stable verdict artifacts', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-scenario-s08-'))
    const outDir = path.join(tmp, 'out')

    const run = spawnSync(process.execPath, [scriptPath, '--input', s08Playbook, '--outDir', outDir, '--repoRoot', repoRoot], {
      cwd: repoRoot,
      env: process.env,
      encoding: 'utf8',
    })

    expect(run.status).toBe(0)
    expect(run.stderr).toBe('')
    expect(run.stdout).toContain('scenario=S08')

    const report = JSON.parse(await fs.readFile(path.join(outDir, 'scenario-playbook.report.json'), 'utf8')) as any
    const verdict = JSON.parse(await fs.readFile(path.join(outDir, 'scenario.verdict.json'), 'utf8')) as any

    expect(report?.scenarioId).toBe('S08')
    expect(Array.isArray(report?.primitiveChain)).toBe(true)
    expect(report.primitiveChain).toEqual(['describe', 'trialrun.evidence', 'verify-loop.run', 'next-actions.exec'])
    expect(report?.summary?.finalVerdict).toBe('PASS')
    expect(report?.summary?.finalReasonCode).toBe('VERIFY_PASS')
    expect(report?.steps?.some((item: any) => item.id === 'trialrun.evidence')).toBe(true)
    expect(report?.steps?.some((item: any) => item.id === 'verify-loop.run')).toBe(true)

    expect(verdict?.scenarioId).toBe('S08')
    expect(verdict?.finalVerdict).toBe('PASS')
    expect(verdict?.finalReasonCode).toBe('VERIFY_PASS')
    expect(Array.isArray(verdict?.decision?.steps)).toBe(true)
  }, 180_000)
})
