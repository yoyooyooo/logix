import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { parseCliInvocation } from '../../src/internal/args.js'
import { resolveCliConfigArgvPrefix } from '../../src/internal/cliConfig.js'

describe('args: logix.cli.json argv prefix', () => {
  it('should merge defaults + profile and allow argv overrides (last-wins)', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-config-prefix-'))
    const configFile = path.join(tmp, 'logix.cli.json')

    await fs.writeFile(
      configFile,
      JSON.stringify(
        {
          schemaVersion: 1,
          defaults: { diagnosticsLevel: 'off', includeTrace: true },
          profiles: { ci: { diagnosticsLevel: 'full', includeTrace: false } },
        },
        null,
        2,
      ),
      'utf8',
    )

    const argv = [
      'trialrun',
      '--runId',
      'r1',
      '--cliConfig',
      configFile,
      '--profile',
      'ci',
      '--entry',
      'x.ts#AppRoot',
      '--includeTrace',
    ]
    const prefix = await Effect.runPromise(resolveCliConfigArgvPrefix(argv))
    const argv2 = [...prefix, ...argv]

    const parsed = await Effect.runPromise(parseCliInvocation(argv2, { helpText: 'help' }))
    expect(parsed.kind).toBe('command')
    if (parsed.kind !== 'command') throw new Error('expected command')
    expect(parsed.command).toBe('trialrun')
    expect(parsed.diagnosticsLevel).toBe('full')
    expect(parsed.includeTrace).toBe(true)
  })
})
