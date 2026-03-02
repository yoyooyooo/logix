import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'
import { EXAMPLE_ENTRY_DIRTY_FORM } from '../helpers/exampleEntries.js'

describe('logix-cli integration (trialrun evidence)', () => {
  it('emits trace.slim.json and evidence.json when --emit evidence is set', async () => {
    const out = await Effect.runPromise(
      runCli([
        'trialrun',
        '--runId',
        'trialrun-evidence-1',
        '--entry',
        EXAMPLE_ENTRY_DIRTY_FORM,
        '--emit',
        'evidence',
      ]),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.exitCode).toBe(0)
    expect(out.result.ok).toBe(true)

    const artifactKeys = out.result.artifacts.map((artifact) => artifact.outputKey)
    expect(artifactKeys).toContain('trialRunReport')
    expect(artifactKeys).toContain('traceSlim')
    expect(artifactKeys).toContain('evidence')

    const traceSlim = out.result.artifacts.find((artifact) => artifact.outputKey === 'traceSlim')?.inline as any
    expect(traceSlim?.kind).toBe('TraceSlim')
    expect(Array.isArray(traceSlim?.events)).toBe(true)
    expect(traceSlim?.events?.length).toBeGreaterThan(0)

    const evidence = out.result.artifacts.find((artifact) => artifact.outputKey === 'evidence')?.inline as any
    expect(evidence?.kind).toBe('TrialRunEvidence')
    expect(typeof evidence?.links?.trialRunReportDigest).toBe('string')
    expect(typeof evidence?.links?.traceSlimDigest).toBe('string')
  })
})
