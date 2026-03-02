import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '../../../..')
const scriptPath = path.resolve(repoRoot, 'specs/103-cli-minimal-kernel-self-loop/scripts/scenario-playbook-runner.mjs')
const s06PlaybookPath = path.resolve(repoRoot, 'specs/103-cli-minimal-kernel-self-loop/contracts/examples/s06.playbook.json')

describe('logix-cli integration (scenario-playbook time budget)', () => {
  it('supports time-budget control and duration assertions in playbook input', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-scenario-playbook-time-budget-'))
    const playbookPath = path.join(tmp, 's06-time-budget.playbook.json')
    const outDir = path.join(tmp, 'out')

    const basePlaybook = JSON.parse(await fs.readFile(s06PlaybookPath, 'utf8')) as any
    basePlaybook.runIdPrefix = 'scenario-s06-time-budget'
    basePlaybook.context.timeBudgetMs = 1
    basePlaybook.assertions = [
      {
        id: 'describe-duration-bounded',
        type: 'step.duration-ms.lte',
        stepId: 'describe',
        lteMs: 60000,
      },
      {
        id: 'expect-fail-soft-when-budget-exceeded',
        type: 'final.verdict',
        equals: 'FAIL_SOFT',
      },
    ]
    await fs.writeFile(playbookPath, JSON.stringify(basePlaybook, null, 2), 'utf8')

    const run = spawnSync(process.execPath, [scriptPath, '--input', playbookPath, '--outDir', outDir, '--repoRoot', repoRoot], {
      cwd: repoRoot,
      env: process.env,
      encoding: 'utf8',
    })

    expect(run.status).toBe(1)
    expect(run.stderr).toBe('')

    const report = JSON.parse(await fs.readFile(path.join(outDir, 'scenario-playbook.report.json'), 'utf8')) as any
    expect(report?.summary?.finalVerdict).toBe('FAIL_SOFT')
    expect(report?.summary?.finalReasonCode).toBe('SCENARIO_TIME_BUDGET_EXCEEDED')
    expect(Array.isArray(report?.steps)).toBe(true)
    expect(report.steps.every((step: any) => typeof step.durationMs === 'number')).toBe(true)
    const durationAssertion = report?.assertions?.find((item: any) => item.id === 'describe-duration-bounded')
    expect(durationAssertion?.status).toBe('pass')
  }, 240_000)
})
