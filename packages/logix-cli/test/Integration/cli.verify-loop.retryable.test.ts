import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'
import { assertRegisteredReasonCode } from '../../src/internal/protocol/reasonCatalog.js'

describe('logix-cli integration (verify-loop retryable)', () => {
  it('returns retryable(exitCode=3) and exposes attempt trajectory', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-verify-loop-retryable-'))
    const out = await Effect.runPromise(
      runCli(['verify-loop', '--runId', 'verify-retry-1', '--mode', 'run', '--target', 'fixture:retryable', '--out', tmp]),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')

    expect(out.exitCode).toBe(3)
    expect(out.result.ok).toBe(false)
    expect(out.result.reasonCode).toBe('VERIFY_RETRYABLE')
    expect(assertRegisteredReasonCode(out.result.reasonCode)).toBe('VERIFY_RETRYABLE')
    expect(out.result.attemptSeq).toBe(1)
    expect(out.result.nextActions[0]?.ifReasonCodes).toEqual(['VERIFY_RETRYABLE'])
    expect(['rerun', 'command.retry']).toContain(out.result.nextActions[0]?.action)
    const report = JSON.parse(await fs.readFile(path.join(tmp, 'verify-loop.report.json'), 'utf8')) as any
    expect(report?.verdict).toBe('RETRYABLE')
    expect(report?.exitCode).toBe(3)
    expect(report?.attemptSeq).toBe(1)
    expect(report?.reasonCode).toBe('VERIFY_RETRYABLE')
    const retryAction = (report?.nextActions as ReadonlyArray<any> | undefined)?.find(
      (item) => item?.action === 'rerun' || item?.action === 'command.retry',
    )
    expect(retryAction).toBeDefined()
    expect((retryAction?.args as { readonly target?: string } | undefined)?.target).toBe('fixture:retryable')
    expect((retryAction?.args as { readonly target?: string } | undefined)?.target).not.toBe('fixture:pass')
    expect(report?.gateResults.every((item: any) => typeof item.command === 'string' && item.command.length > 0)).toBe(true)
    expect(report?.gateResults.every((item: any) => Number.isInteger(item.exitCode) && item.exitCode >= 0)).toBe(true)

    const controlEventsRaw = JSON.parse(await fs.readFile(path.join(tmp, 'control.events.json'), 'utf8')) as any
    const controlEvents = Array.isArray(controlEventsRaw)
      ? controlEventsRaw
      : Array.isArray(controlEventsRaw?.events)
        ? controlEventsRaw.events
        : []
    const phases = controlEvents.map((event: any) => event.event)
    expect(phases[0]).toBe('parse.completed')
    expect(phases[1]).toBe('normalize.completed')
    expect(phases[2]).toBe('validate.completed')
    expect(phases[phases.length - 1]).toBe('emit.completed')
    const executeEvents = controlEvents.filter((event: any) => event.event === 'execute.completed')
    expect(executeEvents.length).toBe(report?.gateResults.length)
    expect(executeEvents[0]?.payload?.reasonCode).toBe(report?.reasonCode)
    expect(executeEvents[0]?.payload?.command).toBe('verify-loop')
  })

  it('does not remap violation nextActions args.target to fixture:pass', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-verify-loop-violation-'))
    const out = await Effect.runPromise(
      runCli([
        'verify-loop',
        '--runId',
        'verify-violation-target-1',
        '--mode',
        'run',
        '--target',
        'fixture:violation',
        '--out',
        tmp,
      ]),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')

    expect(out.exitCode).toBe(2)
    expect(out.result.ok).toBe(false)
    const report = JSON.parse(await fs.readFile(path.join(tmp, 'verify-loop.report.json'), 'utf8')) as any
    const rerunAction = (report?.nextActions as ReadonlyArray<any> | undefined)?.find(
      (item) => item?.action === 'rerun' || item?.action === 'command.retry',
    )
    expect(rerunAction).toBeDefined()
    expect((rerunAction?.args as { readonly target?: string } | undefined)?.target).toBe('fixture:violation')
    expect((rerunAction?.args as { readonly target?: string } | undefined)?.target).not.toBe('fixture:pass')
  })

  it('keeps real gate command executable and does not emit runInBand for control-surface artifact gate', async () => {
    const out = await Effect.runPromise(
      runCli([
        'verify-loop',
        '--runId',
        'verify-missing-target-1',
        '--mode',
        'run',
        '--target',
        'packages/logix-cli/__missing_target__',
      ]),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')

    const reportArtifact = out.result.artifacts.find((item) => item.outputKey === 'verifyLoopReport')
    const report = reportArtifact?.inline as any
    const gate = report?.gateResults.find((item: any) => item.gate === 'gate:control-surface-artifact')
    expect(typeof gate?.command).toBe('string')
    expect(gate?.command.includes('--runInBand')).toBe(false)
  })
})
