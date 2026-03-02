import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'
import { EXAMPLE_ENTRY_DIRTY_FORM } from '../helpers/exampleEntries.js'

describe('logix-cli integration (config default entry + trace profile)', () => {
  it('allows ir export / trialrun without explicit --entry when defaults.entry and profile are provided', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-config-default-entry-'))
    const previousCwd = process.cwd()

    try {
      await fs.writeFile(
        path.join(tmp, 'logix.cli.json'),
        JSON.stringify(
          {
            schemaVersion: 1,
            defaults: {
              entry: EXAMPLE_ENTRY_DIRTY_FORM,
            },
            profiles: {
              trace: {
                includeTrace: true,
                diagnosticsLevel: 'full',
              },
            },
          },
          null,
          2,
        ),
        'utf8',
      )

      process.chdir(tmp)

      const exported = await Effect.runPromise(runCli(['ir', 'export', '--runId', 'config-default-entry-export-1', '--out', tmp]))
      expect(exported.kind).toBe('result')
      if (exported.kind !== 'result') throw new Error('expected result')
      expect(exported.exitCode).toBe(0)
      expect(exported.result.reasonCode).toBe('VERIFY_PASS')

      const trialrun = await Effect.runPromise(
        runCli(['trialrun', '--runId', 'config-default-entry-trialrun-1', '--profile', 'trace', '--out', tmp]),
      )
      expect(trialrun.kind).toBe('result')
      if (trialrun.kind !== 'result') throw new Error('expected result')
      expect(trialrun.exitCode).toBe(0)
      expect(trialrun.result.reasonCode).toBe('VERIFY_PASS')
    } finally {
      process.chdir(previousCwd)
      await fs.rm(tmp, { recursive: true, force: true })
    }
  })
})
