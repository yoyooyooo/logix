import { makeVerificationControlPlaneReport } from '@logixjs/core/ControlPlane'
import {
  authorityRefOf,
  deriveRuntimeWorkbenchProjectionIndex,
} from '@logixjs/core/repo-internal/workbench-api'
import { describe, expect, it } from 'vitest'

const makeReport = (summary: string) =>
  makeVerificationControlPlaneReport({
    kind: 'VerificationControlPlaneReport',
    stage: 'trial',
    mode: 'startup',
    verdict: 'FAIL',
    errorCode: 'MissingDependency',
    summary,
    environment: { runId: 'run:identity' },
    artifacts: [
      {
        outputKey: 'trialReport',
        kind: 'VerificationControlPlaneReport',
        digest: 'sha256:trial-report',
      },
    ],
    repairHints: [
      {
        code: 'MissingDependency',
        canAutoRetry: false,
        upgradeToStage: 'trial',
        focusRef: { declSliceId: 'service:BusinessService' },
        relatedArtifactOutputKeys: ['trialReport'],
      },
    ],
    findings: [
      {
        kind: 'dependency',
        code: 'MissingDependency',
        ownerCoordinate: 'service:BusinessService',
        summary,
        focusRef: { declSliceId: 'service:BusinessService' },
      },
    ],
    nextRecommendedStage: 'trial',
  })

describe('Runtime Workbench identity contract', () => {
  it('does not derive control-plane authority ids from report summary text', () => {
    const firstInput = { kind: 'control-plane-report' as const, report: makeReport('Service missing'), sourceDigest: 'sha256:source-a' }
    const secondInput = { kind: 'control-plane-report' as const, report: makeReport('Business service was not provided'), sourceDigest: 'sha256:source-a' }

    expect(authorityRefOf(firstInput).id).toBe(authorityRefOf(secondInput).id)
  })

  it('does not derive finding ids from report summary text', () => {
    const first = deriveRuntimeWorkbenchProjectionIndex({
      truthInputs: [{ kind: 'control-plane-report', report: makeReport('Service missing'), sourceDigest: 'sha256:source-a' }],
    })
    const second = deriveRuntimeWorkbenchProjectionIndex({
      truthInputs: [
        {
          kind: 'control-plane-report',
          report: makeReport('Business service was not provided'),
          sourceDigest: 'sha256:source-a',
        },
      ],
    })

    const firstFinding = Object.values(first.indexes?.findingsById ?? {}).find((finding) => finding.class === 'control-plane-finding')
    const secondFinding = Object.values(second.indexes?.findingsById ?? {}).find((finding) => finding.class === 'control-plane-finding')
    expect(firstFinding?.id).toBe(secondFinding?.id)
  })
})
