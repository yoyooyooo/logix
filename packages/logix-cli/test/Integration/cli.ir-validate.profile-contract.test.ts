import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'
import { EXAMPLE_ENTRY_DIRTY_FORM } from '../helpers/exampleEntries.js'

describe('logix-cli integration (ir validate profile contract)', () => {
  it('returns violation with stable reason codes when contract key artifacts are missing', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-ir-contract-'))
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
      const exported = await Effect.runPromise(runCli(['ir', 'export', '--runId', 'ir-contract-export-1', '--entry', entry, '--out', tmp]))
      expect(exported.kind).toBe('result')
      if (exported.kind !== 'result') throw new Error('expected result')
      expect(exported.exitCode).toBe(0)

      const trialrun = await Effect.runPromise(
        runCli(['trialrun', '--runId', 'ir-contract-trial-1', '--entry', entry, '--emit', 'evidence', '--out', tmp]),
      )
      expect(trialrun.kind).toBe('result')
      if (trialrun.kind !== 'result') throw new Error('expected result')
      expect(trialrun.exitCode).toBe(0)

      await fs.unlink(path.join(tmp, 'evidence.json'))

      const validate = await Effect.runPromise(
        runCli([
          'ir',
          'validate',
          '--runId',
          'ir-contract-validate-1',
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
      expect(validate.exitCode).toBe(2)
      expect(validate.result.ok).toBe(false)

      const artifact = validate.result.artifacts.find((item) => item.outputKey === 'irValidateReport')
      expect(artifact).toBeDefined()
      expect(artifact?.reasonCodes).toContain('MISSING_REQUIRED_FILE:evidence.json')
      expect(artifact?.reasonCodes).toContain('CONTRACT_MISSING_KEY_ARTIFACT:evidence.json')

      const report = artifact?.inline as any
      expect(report?.kind).toBe('IrValidateReport')
      expect(report?.profile).toBe('contract')
      expect(report?.status).toBe('violation')
      expect(report?.requiredFiles).toEqual([
        'control-surface.manifest.json',
        'trialrun.report.json',
        'trace.slim.json',
        'evidence.json',
      ])
      expect(report?.missingRequiredFiles).toEqual(['evidence.json'])
    } finally {
      await fs.rm(tmp, { recursive: true, force: true })
    }
  })

  it('returns violation when contract profile receives single artifact file input', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-ir-contract-single-file-'))
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

      const artifactFile = path.join(tmp, 'control-surface.manifest.json')
      await fs.writeFile(
        artifactFile,
        JSON.stringify(
          {
            version: 1,
            digest: 'manifest-digest-for-single-file',
            modules: [],
          },
          null,
          2,
        ),
        'utf8',
      )

      const validate = await Effect.runPromise(
        runCli([
          'ir',
          'validate',
          '--runId',
          'ir-contract-single-file-validate-1',
          '--artifact',
          artifactFile,
          '--cliConfig',
          configFile,
          '--profile',
          'contract',
        ]),
      )

      expect(validate.kind).toBe('result')
      if (validate.kind !== 'result') throw new Error('expected result')
      expect(validate.exitCode).toBe(2)
      expect(validate.result.ok).toBe(false)

      const artifact = validate.result.artifacts.find((item) => item.outputKey === 'irValidateReport')
      expect(artifact).toBeDefined()
      expect(artifact?.reasonCodes).toContain('CONTRACT_PROFILE_REQUIRES_DIRECTORY_INPUT')

      const report = artifact?.inline as any
      expect(report?.kind).toBe('IrValidateReport')
      expect(report?.profile).toBe('contract')
      expect(report?.status).toBe('violation')
      expect(report?.input).toEqual({
        kind: 'file',
        file: artifactFile,
      })
    } finally {
      await fs.rm(tmp, { recursive: true, force: true })
    }
  })
})
