import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli, printHelp } from '../../src/internal/entry.js'
import { parseCliInvocation } from '../../src/internal/args.js'

const withIsolatedLiveStateDir = async <A>(fn: () => Promise<A>): Promise<A> => {
  const previousStateDir = process.env.LOGIX_LIVE_STATE_DIR
  const previousPort = process.env.LOGIX_LIVE_PORT
  const stateDir = await mkdtemp(path.join(os.tmpdir(), 'logix-live-no-daemon-'))
  process.env.LOGIX_LIVE_STATE_DIR = stateDir
  process.env.LOGIX_LIVE_PORT = '0'
  try {
    return await fn()
  } finally {
    if (previousStateDir === undefined) delete process.env.LOGIX_LIVE_STATE_DIR
    else process.env.LOGIX_LIVE_STATE_DIR = previousStateDir
    if (previousPort === undefined) delete process.env.LOGIX_LIVE_PORT
    else process.env.LOGIX_LIVE_PORT = previousPort
    await rm(stateDir, { recursive: true, force: true })
  }
}

describe('logix live namespace', () => {
  it('parses and runs live status as LiveCommandResult', async () => {
    const out = await Effect.runPromise(runCli(['live', 'status', '--runId', 'live-status-1']))

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.exitCode).toBe(0)
    expect(out.result.kind).toBe('LiveCommandResult')
    expect(out.result.command).toBe('live status')
    expect(out.result).not.toHaveProperty('primaryReportOutputKey')
  })

  it('returns a daemon gap for targets when no live daemon is running', async () => {
    const out = await withIsolatedLiveStateDir(() =>
      Effect.runPromise(runCli(['live', 'targets', '--runId', 'live-targets-1', '--tree'])),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.result.kind).toBe('LiveCommandResult')
    const primary = out.result.artifacts.find((artifact) => artifact.outputKey === out.result.primaryLiveOutputKey)
    expect(primary?.kind).toBe('EvidenceGap')
    expect(primary?.inline).toMatchObject({ code: 'live-daemon-not-running' })
  })

  it('returns a daemon gap from live dispatch when no live daemon is running', async () => {
    const out = await withIsolatedLiveStateDir(() =>
      Effect.runPromise(
        runCli([
          'live',
          'dispatch',
          '--runId',
          'live-dispatch-1',
          '--target',
          'runtime:missing/module:m1/instance:i1',
          '--action',
          'submit',
        ]),
      ),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.result.kind).toBe('LiveCommandResult')
    const primary = out.result.artifacts.find((artifact) => artifact.outputKey === out.result.primaryLiveOutputKey)
    expect(primary?.kind).toBe('EvidenceGap')
    expect(primary?.inline).toMatchObject({ code: 'live-daemon-not-running' })
  })

  it('returns a daemon gap from live export evidence when no live daemon is running', async () => {
    const out = await withIsolatedLiveStateDir(() =>
      Effect.runPromise(runCli(['live', 'export', 'evidence', '--runId', 'live-export-1', '--from', 'capture:1'])),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.result.kind).toBe('LiveCommandResult')
    const primary = out.result.artifacts.find((artifact) => artifact.outputKey === out.result.primaryLiveOutputKey)
    expect(primary?.kind).toBe('EvidenceGap')
    expect(primary?.inline).toMatchObject({ code: 'live-daemon-not-running' })
  })

  it('parses explicit live attachment selection for tab-safe operations', async () => {
    const parsed = await Effect.runPromise(
      parseCliInvocation(
        [
          'live',
          'snapshot',
          '--runId',
          'live-snapshot-tab-a',
          '--target',
          'runtime:r/module:m/instance:i',
          '--attachment',
          'browser:conn-1',
        ],
        { helpText: 'help' },
      ),
    )

    expect(parsed).toMatchObject({
      kind: 'command',
      command: 'live',
      live: {
        task: 'snapshot',
        target: 'runtime:r/module:m/instance:i',
        attachmentId: 'browser:conn-1',
      },
    })
  })

  it('advertises only the live namespace, not flat live roots', () => {
    const help = printHelp()

    expect(help).toContain('logix live <task>')
    expect(help).toContain('--cursor <token>')
    expect(help).not.toContain('logix status')
    expect(help).not.toContain('logix capture')
    expect(help).not.toContain('logix trigger')
  })

  it('rejects debug namespace and flat live root invocations as invalid commands', async () => {
    for (const argv of [
      ['debug', 'targets', '--runId', 'debug-rejected'],
      ['status', '--runId', 'flat-status-rejected'],
      ['capture', '--runId', 'flat-capture-rejected'],
      ['snapshot', '--runId', 'flat-snapshot-rejected'],
      ['trigger', '--runId', 'flat-trigger-rejected'],
    ]) {
      const out = await Effect.runPromise(runCli(argv))
      expect(out.kind).toBe('result')
      if (out.kind !== 'result') throw new Error('expected result')
      expect(out.exitCode).toBe(2)
      expect(out.result.kind).toBe('CommandResult')
      expect(out.result.error?.code).toBe('CLI_INVALID_COMMAND')
    }
  })

  it('does not advertise wall-clock timeline grammar alongside --cursor', () => {
    const help = printHelp()

    expect(help).toContain('--cursor <token>')
    expect(help).not.toMatch(/--since(?![A-Za-z])|--until(?![A-Za-z])|--before(?![A-Za-z])|--after-watermark(?![A-Za-z])/)
  })
})
