import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

const readJson = async (filePath: string): Promise<unknown> => JSON.parse(await fs.readFile(filePath, 'utf8'))

describe('logix-cli host (099) browser-mock', () => {
  it('should load a browser-global entry and run trialrun', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-host-'))
    const entry = path.resolve(__dirname, '../fixtures/BrowserGlobalModule.ts#AppRoot')

    const out = await Effect.runPromise(
      runCli([
        'trialrun',
        '--runId',
        'host-browser-mock-1',
        '--host',
        'browser-mock',
        '--entry',
        entry,
        '--out',
        tmp,
        '--diagnosticsLevel',
        'off',
        '--timeout',
        '2000',
      ]),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.exitCode).toBe(0)
    expect(out.result.ok).toBe(true)

    const report = await readJson(path.join(tmp, 'trialrun.report.json'))
    expect(typeof (report as any)?.ok).toBe('boolean')
  })
})

