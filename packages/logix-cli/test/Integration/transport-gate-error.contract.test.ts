import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/internal/entry.js'

describe('CLI transport gate errors', () => {
  it('keeps pre-control-plane input failure out of nextRecommendedStage', async () => {
    const out = await Effect.runPromise(runCli(['check', '--runId', 'gate-missing-entry']))

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.exitCode).toBe(2)
    expect(out.result.primaryReportOutputKey).toBe('errorReport')
    const reportArtifact = out.result.artifacts.find((artifact) => artifact.outputKey === out.result.primaryReportOutputKey)
    expect(reportArtifact?.inline).toMatchObject({
      kind: 'VerificationControlPlaneReport',
      nextRecommendedStage: null,
    })
  })
})
