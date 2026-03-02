import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'
import { assertRegisteredReasonCode } from '../../src/internal/protocol/reasonCatalog.js'

describe('logix-cli integration (verify-loop violation)', () => {
  it('returns violation(exitCode=2) with registered reason code', async () => {
    const out = await Effect.runPromise(
      runCli(['verify-loop', '--runId', 'verify-violation-1', '--mode', 'run', '--target', 'fixture:violation']),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')

    expect(out.exitCode).toBe(2)
    expect(out.result.ok).toBe(false)
    expect(out.result.reasonCode).toBe('GATE_TEST_FAILED')
    expect(assertRegisteredReasonCode(out.result.reasonCode)).toBe('GATE_TEST_FAILED')

    const reportArtifact = out.result.artifacts.find((item) => item.outputKey === 'verifyLoopReport')
    expect(reportArtifact?.kind).toBe('VerifyLoopReport')
    const report = reportArtifact?.inline as any
    expect(report?.verdict).toBe('VIOLATION')
    expect(report?.exitCode).toBe(2)
    expect(report?.reasonCode).toBe('GATE_TEST_FAILED')
    expect(report?.gateScope).toBe('runtime')
  })
})
