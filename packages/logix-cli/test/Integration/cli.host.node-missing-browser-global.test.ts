import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

describe('logix-cli host (099) node -> missing browser global', () => {
  it('should fail with a structured host error + cliDiagnostics', async () => {
    const entry = path.resolve(__dirname, '../fixtures/BrowserGlobalModule.ts#AppRoot')

    const out = await Effect.runPromise(
      runCli(['trialrun', '--runId', 'host-node-1', '--entry', entry, '--diagnosticsLevel', 'off', '--timeout', '2000']),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.exitCode).toBe(2)
    expect(out.result.ok).toBe(false)
    expect(out.result.error?.code).toBe('CLI_HOST_MISSING_BROWSER_GLOBAL')

    const diag = out.result.artifacts.find((a) => a.outputKey === 'cliDiagnostics')
    expect(diag?.ok).toBe(true)
    expect((diag as any)?.inline?.kind).toBe('CliDiagnostics')
    expect((diag as any)?.inline?.diagnostics?.[0]?.action?.command).toContain('--host browser-mock')
  })
})

