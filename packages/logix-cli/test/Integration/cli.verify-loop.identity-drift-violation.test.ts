import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

describe('logix-cli integration (verify-loop identity drift violation)', () => {
  it('fails fast when resume instanceId drifts from previous run identity', async () => {
    const out = await Effect.runPromise(
      runCli([
        'verify-loop',
        '--runId',
        'identity-drift-attempt-02',
        '--mode',
        'resume',
        '--instanceId',
        'drifted-instance',
        '--previousRunId',
        'identity-drift-attempt-01',
        '--target',
        'fixture:retryable',
      ]),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.exitCode).toBe(2)
    expect(out.result.reasonCode).toBe('CLI_PROTOCOL_VIOLATION')
    expect(out.result.reasons[0]?.message).toContain('identity 漂移')
    expect(out.result.artifacts.find((item) => item.outputKey === 'verifyLoopReport')).toBeUndefined()
  })

  it('fails fast when resume runId attempt suffix is not previous + 1', async () => {
    const out = await Effect.runPromise(
      runCli([
        'verify-loop',
        '--runId',
        'identity-drift-attempt-04',
        '--mode',
        'resume',
        '--instanceId',
        'identity-drift',
        '--previousRunId',
        'identity-drift-attempt-01',
        '--target',
        'fixture:retryable',
      ]),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.exitCode).toBe(2)
    expect(out.result.reasonCode).toBe('CLI_PROTOCOL_VIOLATION')
    expect(out.result.reasons[0]?.message).toContain('attemptSeq 连续性失败')
    expect(out.result.artifacts.find((item) => item.outputKey === 'verifyLoopReport')).toBeUndefined()
  })

  it('fails fast when resume runId root drifts from previousRunId identity even with matching instanceId', async () => {
    const out = await Effect.runPromise(
      runCli([
        'verify-loop',
        '--runId',
        'another-root-attempt-02',
        '--mode',
        'resume',
        '--instanceId',
        'identity-drift',
        '--previousRunId',
        'identity-drift-attempt-01',
        '--target',
        'fixture:retryable',
      ]),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.exitCode).toBe(2)
    expect(out.result.reasonCode).toBe('CLI_PROTOCOL_VIOLATION')
    expect(out.result.reasons[0]?.message).toContain('runId identity 漂移')
    expect(out.result.artifacts.find((item) => item.outputKey === 'verifyLoopReport')).toBeUndefined()
  })

  it('fails fast when resume attempt suffix regresses below previousRunId attempt', async () => {
    const out = await Effect.runPromise(
      runCli([
        'verify-loop',
        '--runId',
        'identity-drift-attempt-02',
        '--mode',
        'resume',
        '--instanceId',
        'identity-drift',
        '--previousRunId',
        'identity-drift-attempt-03',
        '--target',
        'fixture:retryable',
      ]),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.exitCode).toBe(2)
    expect(out.result.reasonCode).toBe('CLI_PROTOCOL_VIOLATION')
    expect(out.result.reasons[0]?.message).toContain('attemptSeq 连续性失败')
    expect(out.result.reasons[0]?.message).toContain('expected=4')
    expect(out.result.reasons[0]?.message).toContain('actual=2')
    expect(out.result.artifacts.find((item) => item.outputKey === 'verifyLoopReport')).toBeUndefined()
  })

  it('fails fast when resume reuses previousRunId as current runId', async () => {
    const out = await Effect.runPromise(
      runCli([
        'verify-loop',
        '--runId',
        'identity-drift-attempt-01',
        '--mode',
        'resume',
        '--instanceId',
        'identity-drift',
        '--previousRunId',
        'identity-drift-attempt-01',
        '--target',
        'fixture:retryable',
      ]),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.exitCode).toBe(2)
    expect(out.result.reasonCode).toBe('CLI_PROTOCOL_VIOLATION')
    expect(out.result.reasons[0]?.message).toContain('禁止复用 previousRunId')
    expect(out.result.artifacts.find((item) => item.outputKey === 'verifyLoopReport')).toBeUndefined()
  })
})
