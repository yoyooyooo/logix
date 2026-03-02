import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

const repoRoot = path.resolve(__dirname, '../../../..')
const playgroundRoot = path.resolve(repoRoot, 'examples/logix-cli-playground')
const opsFile = path.resolve(playgroundRoot, 'tutorials/06-transform-module-report/delta.add-state-action.json')

describe('logix-cli integration (transform.module playground fixture)', () => {
  it('keeps playground tutorial ops fixture runnable', async () => {
    await fs.access(opsFile)

    const outRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-transform-playground-'))
    try {
      const out = await Effect.runPromise(
        runCli([
          'transform',
          'module',
          '--runId',
          'transform-playground-fixture-1',
          '--repoRoot',
          playgroundRoot,
          '--ops',
          opsFile,
          '--mode',
          'report',
          '--outRoot',
          outRoot,
        ]),
      )

      expect(out.kind).toBe('result')
      if (out.kind !== 'result') throw new Error('expected result')
      expect(out.exitCode).toBe(0)
      expect(out.result.reasonCode).toBe('VERIFY_PASS')

      const reportArtifact = out.result.artifacts.find((artifact) => artifact.outputKey === 'transformReport')
      expect(reportArtifact?.kind).toBe('TransformReport')
      expect(reportArtifact?.ok).toBe(true)

      const patchPlanArtifact = out.result.artifacts.find((artifact) => artifact.outputKey === 'patchPlan')
      expect(patchPlanArtifact?.kind).toBe('PatchPlan')
      expect(patchPlanArtifact?.ok).toBe(true)
    } finally {
      await fs.rm(outRoot, { recursive: true, force: true })
    }
  })
})
