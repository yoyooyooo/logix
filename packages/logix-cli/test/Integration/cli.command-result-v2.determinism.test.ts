import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

describe('logix-cli integration (command result v2 determinism)', () => {
  it('returns stable result for identical successful input', async () => {
    const argv = ['describe', '--runId', 'v2-determinism-ok', '--json'] as const
    const first = await Effect.runPromise(runCli(argv))
    const second = await Effect.runPromise(runCli(argv))

    expect(first.kind).toBe('result')
    expect(second.kind).toBe('result')
    if (first.kind !== 'result' || second.kind !== 'result') throw new Error('expected result')

    expect(first.result).toEqual(second.result)
    expect(first.exitCode).toBe(second.exitCode)
  })

  it('returns stable result for identical invalid input', async () => {
    const argv = ['describe', '--runId', 'v2-determinism-invalid'] as const
    const first = await Effect.runPromise(runCli(argv))
    const second = await Effect.runPromise(runCli(argv))

    expect(first.kind).toBe('result')
    expect(second.kind).toBe('result')
    if (first.kind !== 'result' || second.kind !== 'result') throw new Error('expected result')

    expect(first.result).toEqual(second.result)
    expect(first.exitCode).toBe(2)
    expect(second.exitCode).toBe(2)
  })
})
