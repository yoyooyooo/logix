import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { formatCommandResult, runCli } from '../../src/Commands.js'

describe('logix-cli determinism (US3)', () => {
  it('should produce byte-identical artifacts and CommandResult for the same input', async () => {
    const out1 = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-det-1-'))
    const out2 = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-det-2-'))
    const entry = path.resolve(__dirname, '../fixtures/BasicModule.ts#AppRoot')

    const r1 = await Effect.runPromise(runCli(['ir', 'export', '--runId', 'det-1', '--entry', entry, '--out', out1]))
    const r2 = await Effect.runPromise(runCli(['ir', 'export', '--runId', 'det-1', '--entry', entry, '--out', out2]))

    expect(r1.kind).toBe('result')
    expect(r2.kind).toBe('result')
    if (r1.kind !== 'result' || r2.kind !== 'result') throw new Error('expected result')
    expect(r1.exitCode).toBe(0)
    expect(r2.exitCode).toBe(0)

    const outText1 = formatCommandResult(r1.result)
    const outText2 = formatCommandResult(r2.result)
    expect(outText1).toBe(outText2)

    const manifest1 = await fs.readFile(path.join(out1, 'control-surface.manifest.json'), 'utf8')
    const manifest2 = await fs.readFile(path.join(out2, 'control-surface.manifest.json'), 'utf8')
    expect(manifest1).toBe(manifest2)

    const wf1 = path.join(out1, 'workflow.surface.json')
    const wf2 = path.join(out2, 'workflow.surface.json')
    const hasWf1 = await fs
      .stat(wf1)
      .then(() => true)
      .catch(() => false)
    const hasWf2 = await fs
      .stat(wf2)
      .then(() => true)
      .catch(() => false)
    expect(hasWf1).toBe(hasWf2)
    if (hasWf1 && hasWf2) {
      const a = await fs.readFile(wf1, 'utf8')
      const b = await fs.readFile(wf2, 'utf8')
      expect(a).toBe(b)
    }
  })
})

