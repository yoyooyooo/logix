import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'
import { assertRegisteredReasonCode } from '../../src/internal/protocol/reasonCatalog.js'

describe('logix-cli integration (verify-loop no-progress)', () => {
  it('returns no-progress(exitCode=5) when retry loop has no progress', async () => {
    const out = await Effect.runPromise(
      runCli(['verify-loop', '--runId', 'verify-no-progress-1', '--mode', 'run', '--target', 'fixture:no-progress']),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')

    expect(out.exitCode).toBe(5)
    expect(out.result.ok).toBe(false)
    expect(out.result.reasonCode).toBe('VERIFY_NO_PROGRESS')
    expect(assertRegisteredReasonCode(out.result.reasonCode)).toBe('VERIFY_NO_PROGRESS')

    const reportArtifact = out.result.artifacts.find((item) => item.outputKey === 'verifyLoopReport')
    const report = reportArtifact?.inline as any
    expect(report?.verdict).toBe('NO_PROGRESS')
    expect(report?.exitCode).toBe(5)
    expect(report?.reasonCode).toBe('VERIFY_NO_PROGRESS')
  })
})
