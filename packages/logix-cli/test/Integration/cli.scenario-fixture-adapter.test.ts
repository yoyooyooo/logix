import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '../../../..')
const scriptPath = path.resolve(repoRoot, 'specs/103-cli-minimal-kernel-self-loop/scripts/scenario-playbook-runner.mjs')
const s08Playbook = path.resolve(repoRoot, 'specs/103-cli-minimal-kernel-self-loop/contracts/examples/s08.playbook.json')

describe('logix-cli integration (scenario fixture adapter)', () => {
  it('materializes fixture adapters and emits scenario-fixtures report artifact', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-scenario-fixture-adapter-'))
    const outDir = path.join(tmp, 'out')

    const run = spawnSync(process.execPath, [scriptPath, '--input', s08Playbook, '--outDir', outDir, '--repoRoot', repoRoot], {
      cwd: repoRoot,
      env: process.env,
      encoding: 'utf8',
    })

    expect(run.status).toBe(0)
    expect(run.stderr).toBe('')

    const fixturesReportPath = path.join(outDir, 'scenario-fixtures.report.json')
    const seededFixturePath = path.join(outDir, 'fixtures/external-source/input.json')

    const fixturesReport = JSON.parse(await fs.readFile(fixturesReportPath, 'utf8')) as any
    expect(fixturesReport?.kind).toBe('ScenarioFixtureAdapterReport')
    expect(Array.isArray(fixturesReport?.applied)).toBe(true)
    expect(fixturesReport.applied.some((item: any) => item.id === 'seed-external-source')).toBe(true)

    const seededFixture = JSON.parse(await fs.readFile(seededFixturePath, 'utf8')) as any
    expect(seededFixture?.source).toBe('demo-source')
    expect(Array.isArray(seededFixture?.items)).toBe(true)

    const report = JSON.parse(await fs.readFile(path.join(outDir, 'scenario-playbook.report.json'), 'utf8')) as any
    expect(report?.artifacts?.some((item: any) => item.name === 'scenario-fixtures.report.json')).toBe(true)
  }, 180_000)
})
