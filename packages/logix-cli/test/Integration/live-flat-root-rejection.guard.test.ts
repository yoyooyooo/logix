import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/internal/entry.js'

describe('live flat root rejection', () => {
  it('rejects flat live roots and keeps trigger out of the public route', async () => {
    const cases: ReadonlyArray<ReadonlyArray<string>> = [
      ['status', '--runId', 'flat-live'],
      ['capture', '--runId', 'flat-live'],
      ['snapshot', '--runId', 'flat-live'],
      ['wait', '--runId', 'flat-live'],
      ['export', '--runId', 'flat-live'],
      ['trigger', '--runId', 'flat-live'],
    ]

    for (const argv of cases) {
      const out = await Effect.runPromise(runCli(argv))
      expect(out.kind).toBe('result')
      if (out.kind !== 'result') throw new Error('expected result')
      expect(out.exitCode).toBe(2)
      expect(out.result.kind).toBe('CommandResult')
      expect(out.result.error?.code).toBe('CLI_INVALID_COMMAND')
    }
  })
})
