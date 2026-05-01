import { ControlPlane } from '@logixjs/core'

export const makeControlPlaneReport = (
  stage: 'check' | 'trial',
  mode: 'static' | 'startup',
) =>
  ControlPlane.makeVerificationControlPlaneReport({
    kind: 'VerificationControlPlaneReport',
    stage,
    mode,
    verdict: 'PASS',
    errorCode: null,
    summary: `${stage} passed`,
    environment: { runId: `${stage}-fixture` },
    artifacts: [],
    repairHints: [],
    nextRecommendedStage: null,
  })
