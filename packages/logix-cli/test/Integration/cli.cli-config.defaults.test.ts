import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

describe('logix-cli integration: logix.cli.json defaults', () => {
  it('should run with defaults from --cliConfig (entry + outRoot)', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-config-defaults-'))
    const outRoot = path.join(tmp, 'out-root')
    const configFile = path.join(tmp, 'logix.cli.json')
    const entry = path.resolve(__dirname, '../fixtures/BasicModule.ts#AppRoot')

    await fs.writeFile(
      configFile,
      JSON.stringify({ schemaVersion: 1, defaults: { outRoot, entry, diagnosticsLevel: 'off', timeout: 2000 } }, null, 2),
      'utf8',
    )

    const res = await Effect.runPromise(runCli(['trialrun', '--runId', 'r1', '--cliConfig', configFile]))

    expect(res.kind).toBe('result')
    if (res.kind !== 'result') throw new Error('expected result')
    expect(res.exitCode).toBe(0)
    expect(res.result.ok).toBe(true)

    await fs.stat(path.join(outRoot, 'trialrun', 'r1', 'trialrun.report.json'))
  })
})

