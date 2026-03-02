import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

type DevserverResult = {
  readonly kind?: string
  readonly ok?: boolean
  readonly error?: {
    readonly code?: string
    readonly message?: string
  }
}

type Runner = {
  readonly command: string
  readonly args: ReadonlyArray<string>
}

const repoRoot = path.resolve(__dirname, '../../../..')
const distBin = path.resolve(repoRoot, 'packages/logix-cli/dist/bin/logix-devserver.js')
const srcBin = path.resolve(repoRoot, 'packages/logix-cli/src/bin/logix-devserver.ts')

const resolveRunner = (): Runner =>
  existsSync(distBin)
    ? {
        command: process.execPath,
        args: [distBin],
      }
    : {
        command: process.execPath,
        args: ['--import', 'tsx/esm', srcBin],
      }

const parseLastJsonLine = (stdoutText: string): DevserverResult => {
  const lines = stdoutText
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      return JSON.parse(lines[i]) as DevserverResult
    } catch {
      continue
    }
  }

  throw new Error('failed to parse DevServerUnavailable payload from stdout')
}

describe('logix-cli integration (devserver unavailable contract)', () => {
  it('returns CLI_NOT_IMPLEMENTED payload when devserver is not enabled', () => {
    const runner = resolveRunner()
    const run = spawnSync(runner.command, [...runner.args, '--port', '0'], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    if (run.error) throw run.error

    expect(run.status).toBe(1)
    expect(run.stderr ?? '').toBe('')

    const payload = parseLastJsonLine(run.stdout ?? '')
    expect(payload.kind).toBe('DevServerUnavailable')
    expect(payload.ok).toBe(false)
    expect(payload.error?.code).toBe('CLI_NOT_IMPLEMENTED')
  })
})
