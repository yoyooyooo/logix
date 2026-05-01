import { makeVerificationControlPlaneReport } from '../../../src/ControlPlane.js'

export const makeWorkbenchReport = (args?: {
  readonly verdict?: 'PASS' | 'FAIL' | 'INCONCLUSIVE'
  readonly artifacts?: boolean
  readonly focusRef?: boolean
}) =>
  makeVerificationControlPlaneReport({
    kind: 'VerificationControlPlaneReport',
    stage: 'trial',
    mode: 'startup',
    verdict: args?.verdict ?? 'FAIL',
    errorCode: args?.verdict === 'PASS' ? null : 'WB_TEST_FAILURE',
    summary: args?.verdict === 'PASS' ? 'startup passed' : 'startup failed',
    environment: { runId: 'run:workbench:test' },
    artifacts:
      args?.artifacts === false
        ? []
        : [
            {
              outputKey: 'trial-report',
              kind: 'trial-report',
              digest: 'sha256:trial-report',
            },
          ],
    repairHints: [
      {
        code: 'WB_TEST_FAILURE',
        canAutoRetry: false,
        upgradeToStage: 'trial',
        focusRef: args?.focusRef === false ? null : { sourceRef: 'src/workbench.ts:1' },
        relatedArtifactOutputKeys: args?.artifacts === false ? undefined : ['trial-report'],
      },
    ],
    nextRecommendedStage: args?.verdict === 'PASS' ? null : 'trial',
  })
