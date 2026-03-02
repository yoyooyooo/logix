import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '../../../..')
const scriptPath = path.resolve(repoRoot, 'specs/103-cli-minimal-kernel-self-loop/scripts/scenario-playbook-runner.mjs')
const s03Playbook = path.resolve(repoRoot, 'specs/103-cli-minimal-kernel-self-loop/contracts/examples/s03.playbook.json')

describe('logix-cli integration (scenario remediation actions)', () => {
  it('maps scenario reason codes to canonical remediation actions for S03/S04/S09', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-scenario-remediation-'))
    const outDir = path.join(tmp, 'out')
    const failPlaybookPath = path.join(tmp, 's03-retryable.playbook.json')

    const basePlaybook = JSON.parse(await fs.readFile(s03Playbook, 'utf8')) as any
    basePlaybook.runIdPrefix = 'scenario-s03-retryable'
    basePlaybook.context.verifyTarget = 'fixture:retryable'
    basePlaybook.assertions = [
      {
        id: 'final-soft-fail-expected',
        type: 'final.verdict',
        equals: 'FAIL_SOFT',
      },
    ]
    await fs.writeFile(failPlaybookPath, JSON.stringify(basePlaybook, null, 2), 'utf8')

    const run = spawnSync(
      process.execPath,
      [scriptPath, '--input', failPlaybookPath, '--outDir', outDir, '--repoRoot', repoRoot],
      {
        cwd: repoRoot,
        env: process.env,
        encoding: 'utf8',
      },
    )

    expect(run.status).toBe(1)
    expect(run.stderr).toBe('')

    const report = JSON.parse(await fs.readFile(path.join(outDir, 'scenario-playbook.report.json'), 'utf8')) as any
    expect(report?.summary?.finalVerdict).toBe('FAIL_SOFT')
    expect(report?.summary?.finalReasonCode).toBe('VERIFY_RETRYABLE')
    expect(report?.artifacts?.some((artifact: any) => artifact.name === 'scenario.remediation-actions.json')).toBe(true)

    const remediation = JSON.parse(await fs.readFile(path.join(outDir, 'scenario.remediation-actions.json'), 'utf8')) as any
    expect(remediation?.kind).toBe('ScenarioRemediationActions')
    expect(remediation?.scenarioId).toBe('S03')
    expect(remediation?.finalReasonCode).toBe('VERIFY_RETRYABLE')
    expect(Array.isArray(remediation?.actions)).toBe(true)
    expect(remediation.actions.some((action: any) => action.id === 'approval-resume-check')).toBe(true)
    expect(remediation.actions.every((action: any) => typeof action.action === 'string')).toBe(true)

    const remediationMap = await fs.readFile(
      path.resolve(repoRoot, 'specs/103-cli-minimal-kernel-self-loop/contracts/scenario-remediation-map.md'),
      'utf8',
    )
    expect(remediationMap).toContain('"S03"')
    expect(remediationMap).toContain('"S04"')
    expect(remediationMap).toContain('"S09"')
  }, 180_000)
})
