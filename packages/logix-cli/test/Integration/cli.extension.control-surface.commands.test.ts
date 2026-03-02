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

describe('logix-cli integration (extension control-surface commands)', () => {
  it('supports validate/load/status/reload happy path with stateFile SSoT', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-extension-commands-'))
    try {
      const manifestPath = path.join(tmp, 'extension.manifest.json')
      const stateFile = path.join(tmp, 'state', 'extensions.state.json')

      await writeJson(manifestPath, makeManifest('r1'))

      const validate = requireResult(
        await Effect.runPromise(
          runCliWithTty(['extension', 'validate', '--runId', 'ext-cmd-validate-1', '--manifest', manifestPath]),
        ),
      )
      expect(validate.exitCode).toBe(0)
      expect(validate.result.reasonCode).toBe('VERIFY_PASS')
      const validateArtifact = validate.result.artifacts.find((artifact) => artifact.outputKey === 'extensionManifestCheck')
      expect((validateArtifact?.inline as any)?.revision).toBe('r1')

      const load = requireResult(
        await Effect.runPromise(
          runCliWithTty(['extension', 'load', '--runId', 'ext-cmd-load-1', '--manifest', manifestPath, '--stateFile', stateFile]),
        ),
      )
      expect(load.exitCode).toBe(0)
      const loadState = (load.result.artifacts.find((artifact) => artifact.outputKey === 'extensionState')?.inline as any)?.state
      expect(loadState?.manifest?.revision).toBe('r1')

      const statusBeforeReload = requireResult(
        await Effect.runPromise(
          runCliWithTty(['extension', 'status', '--runId', 'ext-cmd-status-1', '--stateFile', stateFile, '--json']),
        ),
      )
      expect(statusBeforeReload.exitCode).toBe(0)
      const statusBeforeState = (statusBeforeReload.result.artifacts.find((artifact) => artifact.outputKey === 'extensionState')?.inline as any)
      expect(statusBeforeState?.json).toBe(true)
      expect(statusBeforeState?.state?.manifest?.revision).toBe('r1')

      await writeJson(manifestPath, makeManifest('r2'))

      const reload = requireResult(
        await Effect.runPromise(
          runCliWithTty(['extension', 'reload', '--runId', 'ext-cmd-reload-1', '--stateFile', stateFile]),
        ),
      )
      expect(reload.exitCode).toBe(0)
      const reloadState = reload.result.artifacts.find((artifact) => artifact.outputKey === 'extensionState')?.inline as any
      expect(reloadState?.previousRevision).toBe('r1')
      expect(reloadState?.state?.manifest?.revision).toBe('r2')

      const statusAfterReload = requireResult(
        await Effect.runPromise(
          runCliWithTty(['extension', 'status', '--runId', 'ext-cmd-status-2', '--stateFile', stateFile]),
        ),
      )
      expect(statusAfterReload.exitCode).toBe(0)
      const statusAfterState = (statusAfterReload.result.artifacts.find((artifact) => artifact.outputKey === 'extensionState')?.inline as any)
      expect(statusAfterState?.state?.manifest?.revision).toBe('r2')
    } finally {
      await fs.rm(tmp, { recursive: true, force: true })
    }
  })
})
