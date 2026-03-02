import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

describe('logix-cli integration (verify-loop transient => retryable)', () => {
  it('maps transient faults to RETRYABLE(exitCode=3)', async () => {
    const out = await Effect.runPromise(
      runCli(['verify-loop', '--runId', 'verify-transient-1', '--mode', 'run', '--target', 'fixture:transient']),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')

    expect(out.exitCode).toBe(3)
    expect(out.result.ok).toBe(false)
    expect(out.result.reasonCode).toBe('VERIFY_RETRYABLE')

    const reportArtifact = out.result.artifacts.find((item) => item.outputKey === 'verifyLoopReport')
    const report = reportArtifact?.inline as any
    expect(report?.verdict).toBe('RETRYABLE')
    expect(report?.reasonCode).toBe('VERIFY_RETRYABLE')
    expect(report?.reasons?.[0]?.data?.signal).toBeDefined()
  })
})
