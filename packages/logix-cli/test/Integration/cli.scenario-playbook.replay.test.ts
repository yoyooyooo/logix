import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '../../../..')
const scriptPath = path.resolve(repoRoot, 'specs/103-cli-minimal-kernel-self-loop/scripts/scenario-playbook-runner.mjs')

const playbooks = [
  { scenarioId: 'S01', file: path.resolve(repoRoot, 'specs/103-cli-minimal-kernel-self-loop/contracts/examples/s01.playbook.json') },
  { scenarioId: 'S03', file: path.resolve(repoRoot, 'specs/103-cli-minimal-kernel-self-loop/contracts/examples/s03.playbook.json') },
  { scenarioId: 'S06', file: path.resolve(repoRoot, 'specs/103-cli-minimal-kernel-self-loop/contracts/examples/s06.playbook.json') },
] as const

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

const runPlaybook = (args: { readonly playbook: string; readonly outDir: string }) =>
  spawnSync(
    process.execPath,
    [scriptPath, '--input', args.playbook, '--outDir', args.outDir, '--repoRoot', repoRoot],
    {
      cwd: repoRoot,
      env: process.env,
      encoding: 'utf8',
    },
  )

const loadVerdict = async (outDir: string): Promise<ScenarioVerdict> =>
  JSON.parse(await fs.readFile(path.join(outDir, 'scenario.verdict.json'), 'utf8')) as ScenarioVerdict

describe('logix-cli integration (scenario-playbook replay)', () => {
  it('keeps S01/S03/S06 playbook verdicts stable across repeated runs', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-scenario-playbook-replay-'))

    for (const pb of playbooks) {
      const firstOut = path.join(tmp, `${pb.scenarioId}-run-1`)
      const secondOut = path.join(tmp, `${pb.scenarioId}-run-2`)

      const first = runPlaybook({ playbook: pb.file, outDir: firstOut })
      const second = runPlaybook({ playbook: pb.file, outDir: secondOut })

      expect(first.status).toBe(0)
      expect(second.status).toBe(0)

      const firstVerdict = await loadVerdict(firstOut)
      const secondVerdict = await loadVerdict(secondOut)

      expect(firstVerdict.finalVerdict).toBe('PASS')
      expect(secondVerdict.finalVerdict).toBe('PASS')
      expect(secondVerdict.finalVerdict).toBe(firstVerdict.finalVerdict)
      expect(secondVerdict.finalReasonCode).toBe(firstVerdict.finalReasonCode)
      expect(secondVerdict.reasonCodes).toEqual(firstVerdict.reasonCodes)
      expect(secondVerdict.decision.primitiveChain).toEqual(firstVerdict.decision.primitiveChain)
      expect(secondVerdict.decision.steps.map((step) => step.id)).toEqual(firstVerdict.decision.steps.map((step) => step.id))
      expect(secondVerdict.decision.steps.map((step) => step.exitCode)).toEqual(firstVerdict.decision.steps.map((step) => step.exitCode))
    }
  }, 300_000)
})
