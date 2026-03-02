import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'
import { extractModeRequiredFields, loadVerifyLoopInputSchema, loadVerifyLoopReportSchema } from '../helpers/verifyLoopSchema.js'

const getReport = (result: { readonly artifacts: ReadonlyArray<{ readonly outputKey: string; readonly inline?: unknown }> }): any =>
  result.artifacts.find((item) => item.outputKey === 'verifyLoopReport')?.inline

describe('logix-cli integration (verify-loop run/resume trace)', () => {
  it('keeps stable instanceId and increasing attemptSeq across run/resume', async () => {
    const runOut = await Effect.runPromise(
      runCli(['verify-loop', '--runId', 'verify-trace-attempt-01', '--mode', 'run', '--target', 'fixture:pass']),
    )
    const resumeOut = await Effect.runPromise(
      runCli([
        'verify-loop',
        '--runId',
        'verify-trace-attempt-02',
        '--mode',
        'resume',
        '--instanceId',
        'verify-trace',
        '--previousRunId',
        'verify-trace-attempt-01',
        '--target',
        'fixture:retryable',
      ]),
    )
    const resumeOut2 = await Effect.runPromise(
      runCli([
        'verify-loop',
        '--runId',
        'verify-trace-attempt-03',
        '--mode',
        'resume',
        '--instanceId',
        'verify-trace',
        '--previousRunId',
        'verify-trace-attempt-02',
        '--target',
        'fixture:pass',
      ]),
    )

    expect(runOut.kind).toBe('result')
    expect(resumeOut.kind).toBe('result')
    expect(resumeOut2.kind).toBe('result')
    if (runOut.kind !== 'result' || resumeOut.kind !== 'result' || resumeOut2.kind !== 'result') throw new Error('expected result')

    const runReport = getReport(runOut.result)
    const resumeReport = getReport(resumeOut.result)
    const resumeReport2 = getReport(resumeOut2.result)

    expect(runOut.result.instanceId).toBe(runReport.instanceId)
    expect(resumeOut.result.instanceId).toBe(resumeReport.instanceId)
    expect(resumeOut2.result.instanceId).toBe(resumeReport2.instanceId)
    expect(runOut.result.txnSeq).toBe(runReport.txnSeq)
    expect(resumeOut.result.txnSeq).toBe(resumeReport.txnSeq)
    expect(resumeOut2.result.txnSeq).toBe(resumeReport2.txnSeq)
    expect(runOut.result.opSeq).toBe(runReport.opSeq)
    expect(resumeOut.result.opSeq).toBe(resumeReport.opSeq)
    expect(resumeOut2.result.opSeq).toBe(resumeReport2.opSeq)
    expect(runOut.result.attemptSeq).toBe(runReport.attemptSeq)
    expect(resumeOut.result.attemptSeq).toBe(resumeReport.attemptSeq)
    expect(resumeOut2.result.attemptSeq).toBe(resumeReport2.attemptSeq)
    expect(runReport.instanceId).toBe(resumeReport.instanceId)
    expect(runReport.instanceId).toBe(resumeReport2.instanceId)
    expect(runReport.attemptSeq).toBe(1)
    expect(resumeReport.attemptSeq).toBe(2)
    expect(resumeReport2.attemptSeq).toBe(3)
    expect(resumeReport.previousRunId).toBe('verify-trace-attempt-01')
    expect(resumeReport2.previousRunId).toBe('verify-trace-attempt-02')
  })

  it('fails fast when resume instanceId drifts from previous run identity', async () => {
    const out = await Effect.runPromise(
      runCli([
        'verify-loop',
        '--runId',
        'verify-trace-drift-2',
        '--mode',
        'resume',
        '--instanceId',
        'drifted-instance',
        '--previousRunId',
        'verify-trace-drift-1',
        '--target',
        'fixture:retryable',
      ]),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')

    expect(out.exitCode).toBe(2)
    expect(out.result.reasonCode).toBe('CLI_PROTOCOL_VIOLATION')
    expect(out.result.reasons[0]?.message).toContain('identity 漂移')
  })

  it('requires --instanceId at argument layer for resume mode', async () => {
    const out = await Effect.runPromise(
      runCli([
        'verify-loop',
        '--runId',
        'verify-trace-missing-instance-2',
        '--mode',
        'resume',
        '--previousRunId',
        'verify-trace-missing-instance-1',
        '--target',
        'fixture:retryable',
      ]),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')

    expect(out.exitCode).toBe(2)
    expect(out.result.reasonCode).toBe('CLI_INVALID_ARGUMENT')
    expect(out.result.reasons[0]?.message).toContain('--instanceId')
  })

  it('keeps run/resume required fields aligned in input/report schema', async () => {
    const inputSchema = await loadVerifyLoopInputSchema()
    const reportSchema = await loadVerifyLoopReportSchema()
    const inputModeReq = extractModeRequiredFields(inputSchema)
    const reportModeReq = extractModeRequiredFields(reportSchema)

    expect(inputModeReq.run).toContain('runId')
    expect(inputModeReq.resume).toEqual(['runId', 'previousRunId'])
    expect(reportModeReq.resume).toContain('previousRunId')
  })
})
