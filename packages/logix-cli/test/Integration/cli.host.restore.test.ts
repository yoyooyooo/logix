import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

describe('logix-cli host (099) restore', () => {
  it('should restore browser globals after command finishes', async () => {
    const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, 'window')
    const windowValue = (globalThis as any).window

    const entry = path.resolve(__dirname, '../fixtures/BrowserGlobalModule.ts#AppRoot')
    const out = await Effect.runPromise(runCli(['ir', 'export', '--runId', 'host-restore-1', '--host', 'browser-mock', '--entry', entry]))
    expect(out.kind).toBe('result')

    expect(Object.prototype.hasOwnProperty.call(globalThis, 'window')).toBe(hadWindow)
    expect((globalThis as any).window).toBe(windowValue)
  })
})

