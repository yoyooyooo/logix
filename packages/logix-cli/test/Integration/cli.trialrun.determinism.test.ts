import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'
import { EXAMPLE_ENTRY_DIRTY_FORM } from '../helpers/exampleEntries.js'

describe('logix-cli integration (trialrun determinism)', () => {
  it('keeps trialrun output stable for identical input', async () => {
    const argv = ['trialrun', '--runId', 'trialrun-det-1', '--entry', EXAMPLE_ENTRY_DIRTY_FORM] as const

    const first = await Effect.runPromise(runCli(argv))
    const second = await Effect.runPromise(runCli(argv))

    expect(first.kind).toBe('result')
    expect(second.kind).toBe('result')
    if (first.kind !== 'result' || second.kind !== 'result') throw new Error('expected result')

    expect(first.exitCode).toBe(0)
    expect(second.exitCode).toBe(0)
    expect(first.result).toEqual(second.result)

    const reportArtifact = first.result.artifacts.find((artifact) => artifact.outputKey === 'trialRunReport')
    expect(reportArtifact?.kind).toBe('TrialRunReport')
    const report = reportArtifact?.inline as any
    expect(report?.identity).toEqual({ instanceId: 'trialrun-det-1', txnSeq: 1, opSeq: 1 })
    expect(report?.summary?.reasonCode).toBe('VERIFY_PASS')
    expect(report?.summary?.emittedArtifacts).toEqual({
      trialRunReport: true,
      traceSlim: false,
      evidence: false,
    })
  })
})
