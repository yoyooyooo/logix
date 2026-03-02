import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'
import type { RunOutcome } from '../../src/Commands.js'

const makeManifest = (revision: string) => ({
  manifestVersion: 'ext.v1',
  extensionId: 'demo-extension',
  revision,
  runtime: {
    apiVersion: 'v1',
    entry: './extension-entry.js',
    hooks: ['setup', 'healthcheck', 'teardown'],
  },
  capabilities: {
    hostApis: ['emit-control-event'],
  },
  limits: {
    timeoutMs: 50,
    maxQueueSize: 8,
  },
})

const writeJson = async (filePath: string, value: unknown): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

const requireResult = (value: RunOutcome): Extract<RunOutcome, { kind: 'result' }> => {
  expect(value.kind).toBe('result')
  if (value.kind !== 'result') throw new Error('expected result')
  return value
}

const runCliWithTty = (argv: ReadonlyArray<string>) => runCli(argv, { stdinIsTTY: true })

const readStateRevision = async (stateFile: string): Promise<string | undefined> => {
  const parsed = JSON.parse(await fs.readFile(stateFile, 'utf8')) as any
  return parsed?.manifest?.revision
}

describe('logix-cli integration (extension stateFile single source of truth)', () => {
  it('status only reads stateFile and reload updates stateFile from recorded manifest path', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-extension-sot-'))
    try {
      const manifestPath = path.join(tmp, 'extension.manifest.json')
      const stateFile = path.join(tmp, 'state', 'extensions.state.json')

      await writeJson(manifestPath, makeManifest('r1'))
      requireResult(
        await Effect.runPromise(
          runCliWithTty(['extension', 'load', '--runId', 'ext-sot-load-1', '--manifest', manifestPath, '--stateFile', stateFile]),
        ),
      )

      await writeJson(manifestPath, makeManifest('r2'))

      const statusBeforeReload = requireResult(
        await Effect.runPromise(
          runCliWithTty(['extension', 'status', '--runId', 'ext-sot-status-1', '--stateFile', stateFile]),
        ),
      )
      const beforeRevision = (statusBeforeReload.result.artifacts.find((artifact) => artifact.outputKey === 'extensionState')?.inline as any)
        ?.state?.manifest?.revision
      expect(beforeRevision).toBe('r1')

      const reload = requireResult(
        await Effect.runPromise(
          runCliWithTty(['extension', 'reload', '--runId', 'ext-sot-reload-1', '--stateFile', stateFile]),
        ),
      )
      expect(reload.exitCode).toBe(0)
      const afterRevision = (reload.result.artifacts.find((artifact) => artifact.outputKey === 'extensionState')?.inline as any)?.state?.manifest
        ?.revision
      expect(afterRevision).toBe('r2')

      expect(await readStateRevision(stateFile)).toBe('r2')
    } finally {
      await fs.rm(tmp, { recursive: true, force: true })
    }
  })

  it('keeps previous stateFile content when reload fails (rollback path)', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-extension-rollback-'))
    try {
      const manifestPath = path.join(tmp, 'extension.manifest.json')
      const stateFile = path.join(tmp, 'state', 'extensions.state.json')

      await writeJson(manifestPath, makeManifest('r1'))
      requireResult(
        await Effect.runPromise(
          runCliWithTty([
            'extension',
            'load',
            '--runId',
            'ext-rollback-load-1',
            '--manifest',
            manifestPath,
            '--stateFile',
            stateFile,
          ]),
        ),
      )

      await writeJson(manifestPath, {
        ...makeManifest('r2'),
        extensionId: 'INVALID_EXTENSION_ID',
      })

      const reloadFailed = requireResult(
        await Effect.runPromise(
          runCliWithTty(['extension', 'reload', '--runId', 'ext-rollback-reload-1', '--stateFile', stateFile]),
        ),
      )
      expect(reloadFailed.exitCode).toBe(1)
      expect(reloadFailed.result.ok).toBe(false)
      expect(reloadFailed.result.reasonCode).toBe('EXT_MANIFEST_INVALID')

      expect(await readStateRevision(stateFile)).toBe('r1')

      const statusAfterFailure = requireResult(
        await Effect.runPromise(
          runCliWithTty(['extension', 'status', '--runId', 'ext-rollback-status-1', '--stateFile', stateFile]),
        ),
      )
      const revisionAfterFailure = (statusAfterFailure.result.artifacts.find((artifact) => artifact.outputKey === 'extensionState')?.inline as any)
        ?.state?.manifest?.revision
      expect(revisionAfterFailure).toBe('r1')
    } finally {
      await fs.rm(tmp, { recursive: true, force: true })
    }
  })

  it('keeps extension artifact file separated from stateFile when --out shares same directory', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-extension-artifact-split-'))
    try {
      const manifestPath = path.join(tmp, 'extension.manifest.json')
      const outDir = path.join(tmp, 'state')
      const stateFile = path.join(outDir, 'extension.state.json')

      await writeJson(manifestPath, makeManifest('r1'))

      const load = requireResult(
        await Effect.runPromise(
          runCliWithTty([
            'extension',
            'load',
            '--runId',
            'ext-artifact-load-1',
            '--manifest',
            manifestPath,
            '--stateFile',
            stateFile,
            '--out',
            outDir,
          ]),
        ),
      )
      expect(load.exitCode).toBe(0)
      expect(await readStateRevision(stateFile)).toBe('r1')
      const loadArtifactFile = load.result.artifacts.find((artifact) => artifact.outputKey === 'extensionState')?.file
      expect(loadArtifactFile).toBe('extension.state.json.artifact.json')
      expect(loadArtifactFile).not.toBe(path.basename(stateFile))

      await writeJson(manifestPath, makeManifest('r2'))

      const reload = requireResult(
        await Effect.runPromise(
          runCliWithTty([
            'extension',
            'reload',
            '--runId',
            'ext-artifact-reload-1',
            '--stateFile',
            stateFile,
            '--out',
            outDir,
          ]),
        ),
      )
      expect(reload.exitCode).toBe(0)
      expect(await readStateRevision(stateFile)).toBe('r2')
      const reloadArtifactFile = reload.result.artifacts.find((artifact) => artifact.outputKey === 'extensionState')?.file
      expect(reloadArtifactFile).toBe('extension.state.json.artifact.json')
      expect(reloadArtifactFile).not.toBe(path.basename(stateFile))

      const status = requireResult(
        await Effect.runPromise(
          runCliWithTty(['extension', 'status', '--runId', 'ext-artifact-status-1', '--stateFile', stateFile, '--out', outDir]),
        ),
      )
      expect(status.exitCode).toBe(0)
      const statusArtifactFile = status.result.artifacts.find((artifact) => artifact.outputKey === 'extensionState')?.file
      expect(statusArtifactFile).toBe('extension.state.json.artifact.json')
      expect(statusArtifactFile).not.toBe(path.basename(stateFile))
      expect(await readStateRevision(stateFile)).toBe('r2')
    } finally {
      await fs.rm(tmp, { recursive: true, force: true })
    }
  })
})
