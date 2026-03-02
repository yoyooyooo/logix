import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

const getReport = async (
  result: {
    readonly artifacts: ReadonlyArray<{
      readonly outputKey: string
      readonly inline?: unknown
      readonly file?: string
    }>
  },
): Promise<any> => {
  const artifact = result.artifacts.find((item) => item.outputKey === 'verifyLoopReport')
  if (!artifact) return undefined
  if (typeof artifact.inline !== 'undefined') return artifact.inline
  if (typeof artifact.file !== 'string' || artifact.file.length === 0) return undefined
  const content = await fs.readFile(artifact.file, 'utf8')
  return JSON.parse(content)
}

describe('logix-cli integration (verify-loop resume identity monotonic)', () => {
  it('keeps attempt/txn/op monotonic and carries multi-round trajectory across run/resume', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-verify-loop-identity-monotonic-'))
    const runOut = await Effect.runPromise(
      runCli([
        'verify-loop',
        '--runId',
        'identity-mono-attempt-01',
        '--mode',
        'run',
        '--target',
        'fixture:retryable',
        '--out',
        path.join(tmp, 'attempt-01'),
      ]),
    )
    const resumeOut = await Effect.runPromise(
      runCli([
        'verify-loop',
        '--runId',
        'identity-mono-attempt-02',
        '--mode',
        'resume',
        '--instanceId',
        'identity-mono',
        '--previousRunId',
        'identity-mono-attempt-01',
        '--target',
        'fixture:retryable',
        '--out',
        path.join(tmp, 'attempt-02'),
      ]),
    )
    const resumeOut2 = await Effect.runPromise(
      runCli([
        'verify-loop',
        '--runId',
        'identity-mono-attempt-03',
        '--mode',
        'resume',
        '--instanceId',
        'identity-mono',
        '--previousRunId',
        'identity-mono-attempt-02',
        '--target',
        'fixture:pass',
        '--out',
        path.join(tmp, 'attempt-03'),
      ]),
    )

    expect(runOut.kind).toBe('result')
    expect(resumeOut.kind).toBe('result')
    expect(resumeOut2.kind).toBe('result')
    if (runOut.kind !== 'result' || resumeOut.kind !== 'result' || resumeOut2.kind !== 'result') throw new Error('expected result')

    const runReport = await getReport(runOut.result)
    const resumeReport = await getReport(resumeOut.result)
    const resumeReport2 = await getReport(resumeOut2.result)

    expect(runReport.instanceId).toBe('identity-mono')
    expect(resumeReport.instanceId).toBe('identity-mono')
    expect(resumeReport2.instanceId).toBe('identity-mono')

    expect(runReport.attemptSeq).toBe(1)
    expect(resumeReport.attemptSeq).toBe(2)
    expect(resumeReport2.attemptSeq).toBe(3)

    expect(runReport.txnSeq).toBe(1)
    expect(resumeReport.txnSeq).toBe(2)
    expect(resumeReport2.txnSeq).toBe(3)

    expect(runReport.opSeq).toBe(1)
    expect(resumeReport.opSeq).toBe(2)
    expect(resumeReport2.opSeq).toBe(3)

    expect(runOut.result.attemptSeq).toBe(runReport.attemptSeq)
    expect(resumeOut.result.attemptSeq).toBe(resumeReport.attemptSeq)
    expect(resumeOut2.result.attemptSeq).toBe(resumeReport2.attemptSeq)

    expect(runOut.result.txnSeq).toBe(runReport.txnSeq)
    expect(resumeOut.result.txnSeq).toBe(resumeReport.txnSeq)
    expect(resumeOut2.result.txnSeq).toBe(resumeReport2.txnSeq)

    expect(runOut.result.opSeq).toBe(runReport.opSeq)
    expect(resumeOut.result.opSeq).toBe(resumeReport.opSeq)
    expect(resumeOut2.result.opSeq).toBe(resumeReport2.opSeq)

    expect(resumeReport.trajectory.map((point: any) => point.attemptSeq)).toEqual([1, 2])
    expect(resumeOut.result.trajectory.map((point) => point.attemptSeq)).toEqual([1, 2])
    expect(resumeReport2.trajectory.map((point: any) => point.attemptSeq)).toEqual([2, 3])
    expect(resumeOut2.result.trajectory.map((point) => point.attemptSeq)).toEqual([2, 3])
  })

  it('supports legal resume monotonic recovery after one fail-fast identity drift', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-verify-loop-identity-recover-'))
    const runOut = await Effect.runPromise(
      runCli([
        'verify-loop',
        '--runId',
        'identity-recover-attempt-01',
        '--mode',
        'run',
        '--target',
        'fixture:retryable',
        '--out',
        path.join(tmp, 'attempt-01'),
      ]),
    )

    const driftOut = await Effect.runPromise(
      runCli([
        'verify-loop',
        '--runId',
        'drifted-root-attempt-02',
        '--mode',
        'resume',
        '--instanceId',
        'identity-recover',
        '--previousRunId',
        'identity-recover-attempt-01',
        '--target',
        'fixture:retryable',
        '--out',
        path.join(tmp, 'attempt-02-drift'),
      ]),
    )

    const resumeOut = await Effect.runPromise(
      runCli([
        'verify-loop',
        '--runId',
        'identity-recover-attempt-02',
        '--mode',
        'resume',
        '--instanceId',
        'identity-recover',
        '--previousRunId',
        'identity-recover-attempt-01',
        '--target',
        'fixture:pass',
        '--out',
        path.join(tmp, 'attempt-02'),
      ]),
    )

    expect(runOut.kind).toBe('result')
    expect(driftOut.kind).toBe('result')
    expect(resumeOut.kind).toBe('result')
    if (runOut.kind !== 'result' || driftOut.kind !== 'result' || resumeOut.kind !== 'result') throw new Error('expected result')

    expect(driftOut.exitCode).toBe(2)
    expect(driftOut.result.reasonCode).toBe('CLI_PROTOCOL_VIOLATION')
    expect(driftOut.result.reasons[0]?.message).toContain('runId identity 漂移')
    expect(driftOut.result.artifacts.find((item) => item.outputKey === 'verifyLoopReport')).toBeUndefined()

    const runReport = await getReport(runOut.result)
    const resumeReport = await getReport(resumeOut.result)
    expect(runReport.instanceId).toBe('identity-recover')
    expect(resumeReport.instanceId).toBe('identity-recover')
    expect(runReport.attemptSeq).toBe(1)
    expect(resumeReport.attemptSeq).toBe(2)
    expect(runReport.txnSeq).toBe(1)
    expect(resumeReport.txnSeq).toBe(2)
    expect(runReport.opSeq).toBe(1)
    expect(resumeReport.opSeq).toBe(2)
    expect(resumeOut.result.trajectory.map((point) => point.attemptSeq)).toEqual([1, 2])
  })

  it('accepts legal resume runId without attempt suffix and keeps monotonic counters/trajectory', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-verify-loop-identity-no-suffix-'))
    const runOut = await Effect.runPromise(
      runCli([
        'verify-loop',
        '--runId',
        'identity-no-suffix-attempt-01',
        '--mode',
        'run',
        '--target',
        'fixture:retryable',
        '--out',
        path.join(tmp, 'attempt-01'),
      ]),
    )
    const resumeOut = await Effect.runPromise(
      runCli([
        'verify-loop',
        '--runId',
        'identity-no-suffix-attempt-02',
        '--mode',
        'resume',
        '--instanceId',
        'identity-no-suffix',
        '--previousRunId',
        'identity-no-suffix-attempt-01',
        '--target',
        'fixture:retryable',
        '--out',
        path.join(tmp, 'attempt-02'),
      ]),
    )
    const resumeOutNoSuffix = await Effect.runPromise(
      runCli([
        'verify-loop',
        '--runId',
        'identity-no-suffix',
        '--mode',
        'resume',
        '--instanceId',
        'identity-no-suffix',
        '--previousRunId',
        'identity-no-suffix-attempt-02',
        '--target',
        'fixture:pass',
        '--out',
        path.join(tmp, 'attempt-03'),
      ]),
    )

    expect(runOut.kind).toBe('result')
    expect(resumeOut.kind).toBe('result')
    expect(resumeOutNoSuffix.kind).toBe('result')
    if (runOut.kind !== 'result' || resumeOut.kind !== 'result' || resumeOutNoSuffix.kind !== 'result')
      throw new Error('expected result')

    const runReport = await getReport(runOut.result)
    const resumeReport = await getReport(resumeOut.result)
    const resumeReportNoSuffix = await getReport(resumeOutNoSuffix.result)

    expect(runReport.runId).toBe('identity-no-suffix-attempt-01')
    expect(resumeReport.runId).toBe('identity-no-suffix-attempt-02')
    expect(resumeReportNoSuffix.runId).toBe('identity-no-suffix')

    expect(runReport.instanceId).toBe('identity-no-suffix')
    expect(resumeReport.instanceId).toBe('identity-no-suffix')
    expect(resumeReportNoSuffix.instanceId).toBe('identity-no-suffix')

    expect(runReport.attemptSeq).toBe(1)
    expect(resumeReport.attemptSeq).toBe(2)
    expect(resumeReportNoSuffix.attemptSeq).toBe(3)

    expect(runReport.txnSeq).toBe(1)
    expect(resumeReport.txnSeq).toBe(2)
    expect(resumeReportNoSuffix.txnSeq).toBe(3)

    expect(runReport.opSeq).toBe(1)
    expect(resumeReport.opSeq).toBe(2)
    expect(resumeReportNoSuffix.opSeq).toBe(3)

    expect(resumeOutNoSuffix.result.attemptSeq).toBe(3)
    expect(resumeOutNoSuffix.result.txnSeq).toBe(3)
    expect(resumeOutNoSuffix.result.opSeq).toBe(3)
    expect(resumeOutNoSuffix.result.trajectory.map((point) => point.attemptSeq)).toEqual([2, 3])
    expect(resumeReportNoSuffix.trajectory.map((point: any) => point.attemptSeq)).toEqual([2, 3])
  })
})
