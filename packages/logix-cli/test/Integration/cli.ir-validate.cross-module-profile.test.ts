import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

const writeJson = async (filePath: string, value: unknown) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8')
}

describe('logix-cli integration (ir validate cross-module profile)', () => {
  it('passes when control-surface/workflow-surface contain at least two consistent modules', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-ir-cross-module-pass-'))
    try {
      const configFile = path.join(tmp, 'logix.cli.json')
      await writeJson(configFile, {
        schemaVersion: 1,
        profiles: {
          contract: {},
          'cross-module': {},
        },
      })

      await writeJson(path.join(tmp, 'control-surface.manifest.json'), {
        schemaVersion: 1,
        kind: 'ControlSurfaceManifest',
        version: 1,
        digest: 'sha256:manifest-digest-cross-module',
        modules: [
          { moduleId: 'module-A', workflowSurface: { digest: 'sha256:surface-a' } },
          { moduleId: 'module-B', workflowSurface: { digest: 'sha256:surface-b' } },
        ],
      })

      await writeJson(path.join(tmp, 'workflow.surface.json'), [
        { moduleId: 'module-A', surface: { digest: 'sha256:surface-a', source: 'module-A.ts#Logic' } },
        { moduleId: 'module-B', surface: { digest: 'sha256:surface-b', source: 'module-B.ts#Logic' } },
      ])

      const validate = await Effect.runPromise(
        runCli([
          'ir',
          'validate',
          '--runId',
          'ir-cross-module-pass-1',
          '--in',
          tmp,
          '--cliConfig',
          configFile,
          '--profile',
          'cross-module',
        ]),
      )

      expect(validate.kind).toBe('result')
      if (validate.kind !== 'result') throw new Error('expected result')
      expect(validate.exitCode).toBe(0)
      expect(validate.result.ok).toBe(true)
      const report = validate.result.artifacts.find((artifact) => artifact.outputKey === 'irValidateReport')?.inline as any
      expect(report?.profile).toBe('cross-module')
      expect(report?.status).toBe('pass')
      expect(report?.requiredFiles).toEqual(['control-surface.manifest.json', 'workflow.surface.json'])
    } finally {
      await fs.rm(tmp, { recursive: true, force: true })
    }
  })

  it('returns violation when cross-module profile receives file input or only one module', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-ir-cross-module-violation-'))
    try {
      const configFile = path.join(tmp, 'logix.cli.json')
      await writeJson(configFile, {
        schemaVersion: 1,
        profiles: {
          contract: {},
          'cross-module': {},
        },
      })

      const singleArtifactPath = path.join(tmp, 'control-surface.manifest.json')
      await writeJson(singleArtifactPath, {
        schemaVersion: 1,
        kind: 'ControlSurfaceManifest',
        version: 1,
        digest: 'sha256:single-module',
        modules: [{ moduleId: 'only-module', workflowSurface: { digest: 'sha256:only-surface' } }],
      })

      const fileInput = await Effect.runPromise(
        runCli([
          'ir',
          'validate',
          '--runId',
          'ir-cross-module-file-1',
          '--artifact',
          singleArtifactPath,
          '--cliConfig',
          configFile,
          '--profile',
          'cross-module',
        ]),
      )

      expect(fileInput.kind).toBe('result')
      if (fileInput.kind !== 'result') throw new Error('expected result')
      expect(fileInput.exitCode).toBe(2)
      const fileReportArtifact = fileInput.result.artifacts.find((artifact) => artifact.outputKey === 'irValidateReport')
      expect(fileReportArtifact?.reasonCodes).toContain('CROSS_MODULE_PROFILE_REQUIRES_DIRECTORY_INPUT')

      await writeJson(path.join(tmp, 'workflow.surface.json'), [
        { moduleId: 'only-module', surface: { digest: 'sha256:only-surface', source: 'only-module.ts#Logic' } },
      ])

      const dirInput = await Effect.runPromise(
        runCli([
          'ir',
          'validate',
          '--runId',
          'ir-cross-module-dir-1',
          '--in',
          tmp,
          '--cliConfig',
          configFile,
          '--profile',
          'cross-module',
        ]),
      )

      expect(dirInput.kind).toBe('result')
      if (dirInput.kind !== 'result') throw new Error('expected result')
      expect(dirInput.exitCode).toBe(2)
      const dirReportArtifact = dirInput.result.artifacts.find((artifact) => artifact.outputKey === 'irValidateReport')
      expect(dirReportArtifact?.reasonCodes).toContain('CROSS_MODULE_MODULE_COUNT_LT_2')
      expect(dirReportArtifact?.reasonCodes).toContain('CROSS_MODULE_WORKFLOW_SURFACE_LT_2')
    } finally {
      await fs.rm(tmp, { recursive: true, force: true })
    }
  })
})
