import { ControlPlane } from '@logixjs/core'
import { describe, expect, it } from 'vitest'
import { deriveRuntimeWorkbenchProjectionIndex } from '@logixjs/core/repo-internal/workbench-api'
import { makeWorkbenchReport } from './Workbench.testkit.js'

describe('Runtime Workbench shape separation contract', () => {
  it('keeps Runtime.run result and Check/Trial report in separate sessions', () => {
    const runResult = { runId: 'run-1', value: { count: 1 } }
    const report = makeWorkbenchReport({ verdict: 'PASS' })
    const index = deriveRuntimeWorkbenchProjectionIndex({
      truthInputs: [
        { kind: 'run-result', runId: runResult.runId, status: 'passed', value: runResult.value, sourceDigest: 'sha256:source-a' },
        { kind: 'control-plane-report', report, sourceDigest: 'sha256:source-a' },
      ],
    })

    expect(ControlPlane.isVerificationControlPlaneReport(runResult)).toBe(false)
    expect(ControlPlane.isVerificationControlPlaneReport(report)).toBe(true)
    expect(index.sessions.map((session) => session.inputKind).sort()).toEqual(['control-plane-report', 'run-result'])

    const runArtifact = Object.values(index.indexes?.artifactsById ?? {}).find((artifact) => artifact.kind === 'run')
    expect(ControlPlane.isVerificationControlPlaneReport(runArtifact?.preview)).toBe(false)
  })
})
