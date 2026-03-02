import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

const writeJson = async (filePath: string, value: unknown): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

describe('logix-cli integration (non-tty dangerous write deny)', () => {
  it('denies dangerous write by default and returns structured reason code', async () => {
    const out = await Effect.runPromise(
      runCli(['anchor', 'autofill', '--runId', 'danger-write-1', '--mode', 'write'], {
        stdinIsTTY: false,
        env: {
          ...process.env,
          LOGIX_CLI_ALLOW_NON_TTY_DANGEROUS_WRITE: '0',
        },
      }),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')

    expect(out.exitCode).toBe(2)
    expect(out.result.ok).toBe(false)
    expect(out.result.reasonCode).toBe('CLI_NON_TTY_DANGEROUS_WRITE_DENIED')
    expect(out.result.reasonCode).not.toBe('CLI_PROTOCOL_VIOLATION')
    expect(out.result.reasons[0]?.code).toBe('CLI_NON_TTY_DANGEROUS_WRITE_DENIED')
    expect(out.result.reasons[0]?.data).toMatchObject({
      stage: 'preflight.validate',
      command: 'anchor.autofill',
      mode: 'write',
      stdinIsTTY: false,
    })
  })

  it('denies extension load in non-TTY even without --mode write', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-non-tty-load-'))
    try {
      const manifestPath = path.join(tmp, 'extension.manifest.json')
      const stateFile = path.join(tmp, 'state', 'extensions.state.json')

      await writeJson(manifestPath, {
        manifestVersion: 'ext.v1',
        extensionId: 'demo-extension',
        revision: 'r1',
        runtime: {
          apiVersion: 'v1',
          entry: './entry.js',
          hooks: ['setup'],
        },
        capabilities: {
          hostApis: ['emit-control-event'],
        },
      })

      const out = await Effect.runPromise(
        runCli(['extension', 'load', '--runId', 'danger-ext-load-1', '--manifest', manifestPath, '--stateFile', stateFile], {
          stdinIsTTY: false,
          env: {
            ...process.env,
            LOGIX_CLI_ALLOW_NON_TTY_DANGEROUS_WRITE: '0',
          },
        }),
      )

      expect(out.kind).toBe('result')
      if (out.kind !== 'result') throw new Error('expected result')

      expect(out.exitCode).toBe(2)
      expect(out.result.reasonCode).toBe('CLI_NON_TTY_DANGEROUS_WRITE_DENIED')
      expect(out.result.reasons[0]?.data).toMatchObject({
        stage: 'preflight.validate',
        command: 'extension.load',
        mode: 'report',
        stdinIsTTY: false,
      })
    } finally {
      await fs.rm(tmp, { recursive: true, force: true })
    }
  })

  it('denies extension reload in non-TTY even without --mode write', async () => {
    const out = await Effect.runPromise(
      runCli(['extension', 'reload', '--runId', 'danger-ext-reload-1', '--stateFile', 'state/extensions.state.json'], {
        stdinIsTTY: false,
        env: {
          ...process.env,
          LOGIX_CLI_ALLOW_NON_TTY_DANGEROUS_WRITE: '0',
        },
      }),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')

    expect(out.exitCode).toBe(2)
    expect(out.result.reasonCode).toBe('CLI_NON_TTY_DANGEROUS_WRITE_DENIED')
    expect(out.result.reasons[0]?.data).toMatchObject({
      stage: 'preflight.validate',
      command: 'extension.reload',
      mode: 'report',
      stdinIsTTY: false,
    })
  })
})
