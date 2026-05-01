import { describe, expect, it } from 'vitest'
import { makeVerificationControlPlaneReport } from '@logixjs/core/ControlPlane'
import { deriveWorkbenchHostViewModel, normalizeControlPlaneReport } from '../../src/internal/state/workbench/index.js'

describe('DVTools report placement', () => {
  it('attaches report fields to finding or drilldown without report lane', () => {
    const report = makeVerificationControlPlaneReport({
      kind: 'VerificationControlPlaneReport',
      stage: 'trial',
      mode: 'startup',
      verdict: 'FAIL',
      errorCode: 'runtime-startup-failed',
      summary: 'startup failed',
      environment: { runId: 'report-placement' },
      repairHints: [
        {
          code: 'runtime-startup-failed',
          canAutoRetry: false,
          upgradeToStage: 'trial',
          focusRef: { sourceRef: 'src/form.ts:12' },
          relatedArtifactOutputKeys: ['startup-log'],
        },
      ],
      artifacts: [{ outputKey: 'startup-log', kind: 'startup-log', file: 'artifact://startup-log' }],
      nextRecommendedStage: 'trial',
    })

    const model = deriveWorkbenchHostViewModel(normalizeControlPlaneReport(report))

    expect((model as any).reportLane).toBeUndefined()
    expect(model.findings[0]?.reportRef).toBeDefined()
    expect(model.findings[0]?.artifacts[0]?.artifactKey).toBe('startup-log')
  })

  it('creates core coordinate and artifact gaps when report has no coordinates', () => {
    const model = deriveWorkbenchHostViewModel(
      normalizeControlPlaneReport(
        makeVerificationControlPlaneReport({
          kind: 'VerificationControlPlaneReport',
          stage: 'trial',
          mode: 'startup',
          verdict: 'FAIL',
          errorCode: 'runtime-startup-failed',
          summary: 'no refs',
          environment: { runId: 'report-placement' },
          artifacts: [],
          repairHints: [],
          nextRecommendedStage: 'trial',
        }),
      ),
    )

    expect(model.gaps.map((gap) => gap.code)).toContain('missing-focus-ref')
    expect(model.gaps.map((gap) => gap.code)).toContain('missing-artifact-output-key')
  })
})
