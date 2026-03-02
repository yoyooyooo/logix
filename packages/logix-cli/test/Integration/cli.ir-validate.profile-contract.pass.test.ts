import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'
import { EXAMPLE_ENTRY_DIRTY_FORM } from '../helpers/exampleEntries.js'

describe('logix-cli integration (ir validate profile contract pass)', () => {
  it('returns pass when contract key artifacts are present', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-ir-contract-pass-'))
    try {
      const configFile = path.join(tmp, 'logix.cli.json')
      await fs.writeFile(
        configFile,
        JSON.stringify(
          {
            schemaVersion: 1,
            profiles: {
              contract: {},
            },
          },
          null,
          2,
        ),
        'utf8',
      )

      const entry = EXAMPLE_ENTRY_DIRTY_FORM

      const exported = await Effect.runPromise(runCli(['ir', 'export', '--runId', 'ir-contract-pass-export-1', '--entry', entry, '--out', tmp]))
      expect(exported.kind).toBe('result')
      if (exported.kind !== 'result') throw new Error('expected result')
      expect(exported.exitCode).toBe(0)

      const trialrun = await Effect.runPromise(
        runCli([
          'trialrun',
          '--runId',
          'ir-contract-pass-trialrun-1',
          '--entry',
          entry,
          '--emit',
          'evidence',
          '--includeTrace',
          '--out',
          tmp,
        ]),
      )
      expect(trialrun.kind).toBe('result')
      if (trialrun.kind !== 'result') throw new Error('expected result')
      expect(trialrun.exitCode).toBe(0)

      const validate = await Effect.runPromise(
        runCli([
          'ir',
          'validate',
          '--runId',
          'ir-contract-pass-validate-1',
          '--in',
          tmp,
          '--cliConfig',
          configFile,
          '--profile',
          'contract',
        ]),
      )

      expect(validate.kind).toBe('result')
      if (validate.kind !== 'result') throw new Error('expected result')
      expect(validate.exitCode).toBe(0)
      expect(validate.result.ok).toBe(true)
      expect(validate.result.reasonCode).toBe('VERIFY_PASS')

      const artifact = validate.result.artifacts.find((item) => item.outputKey === 'irValidateReport')
      expect(artifact).toBeDefined()
      expect(artifact?.kind).toBe('IrValidateReport')

      const report = artifact?.inline as any
      expect(report?.status).toBe('pass')
      expect(report?.missingRequiredFiles).toEqual([])
    } finally {
      await fs.rm(tmp, { recursive: true, force: true })
    }
  })
})
