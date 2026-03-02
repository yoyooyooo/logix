import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'
import { FIXTURE_ENTRY_MISSING_SERVICE } from '../helpers/exampleEntries.js'

describe('logix-cli integration (trialrun missing services)', () => {
  it('returns machine-readable missing service diagnostics when required Layer is absent', async () => {
    const out = await Effect.runPromise(
      runCli(['trialrun', '--runId', 'trialrun-missing-services-1', '--entry', FIXTURE_ENTRY_MISSING_SERVICE, '--emit', 'evidence']),
    )

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.exitCode).toBe(2)
    expect(out.result.ok).toBe(false)

    const reportArtifact = out.result.artifacts.find((artifact) => artifact.outputKey === 'trialRunReport')
    expect(reportArtifact).toBeDefined()
    expect(reportArtifact?.reasonCodes).toContain('TRIALRUN_MISSING_SERVICES')

    const report = reportArtifact?.inline as any
    expect(report?.kind).toBe('TrialRunReport')
    expect(report?.summary?.reasonCode).toBe('TRIALRUN_MISSING_SERVICES')
    expect(Array.isArray(report?.environment?.missingServices)).toBe(true)
    const missingServices: string[] = report?.environment?.missingServices ?? []
    expect(missingServices.length).toBeGreaterThan(0)
    expect(missingServices.some((id) => typeof id === 'string' && id.includes('CliTrialRun.RequiredService'))).toBe(true)
  })
})
