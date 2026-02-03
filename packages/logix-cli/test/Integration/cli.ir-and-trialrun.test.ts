import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

const readJson = async (filePath: string): Promise<unknown> => JSON.parse(await fs.readFile(filePath, 'utf8'))

describe('logix-cli integration (US1)', () => {
  it('should run ir export and trialrun against a TS module entry', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-'))
    const entry = path.resolve(__dirname, '../fixtures/BasicModule.ts#AppRoot')

    const ir = await Effect.runPromise(runCli(['ir', 'export', '--runId', 'r1', '--entry', entry, '--out', tmp]))
    expect(ir.kind).toBe('result')
    if (ir.kind !== 'result') throw new Error('expected result')
    expect(ir.exitCode).toBe(0)
    expect(ir.result.ok).toBe(true)

    const manifestPath = path.join(tmp, 'control-surface.manifest.json')
    const manifest = await readJson(manifestPath)
    expect((manifest as any)?.version).toBe(1)

    const tr = await Effect.runPromise(runCli([
      'trialrun',
      '--runId',
      'r2',
      '--entry',
      entry,
      '--out',
      tmp,
      '--diagnosticsLevel',
      'off',
      '--timeout',
      '2000',
    ]))
    expect(tr.kind).toBe('result')
    if (tr.kind !== 'result') throw new Error('expected result')
    expect([0, 1]).toContain(tr.exitCode)
    const report = await readJson(path.join(tmp, 'trialrun.report.json'))
    expect(typeof (report as any)?.ok).toBe('boolean')
    expect((report as any).evidence).toBeUndefined()
  })
})
