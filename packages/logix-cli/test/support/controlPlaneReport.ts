import type { VerificationControlPlaneReport } from '@logixjs/core/ControlPlane'

export const makeControlPlaneReportFixture = (input?: {
  readonly runId?: string
  readonly stage?: VerificationControlPlaneReport['stage']
  readonly mode?: VerificationControlPlaneReport['mode']
  readonly verdict?: VerificationControlPlaneReport['verdict']
  readonly errorCode?: string | null
  readonly environment?: Record<string, unknown>
}): VerificationControlPlaneReport => ({
  schemaVersion: 1,
  kind: 'VerificationControlPlaneReport',
  stage: input?.stage ?? 'trial',
  mode: input?.mode ?? 'startup',
  verdict: input?.verdict ?? 'PASS',
  errorCode: input?.errorCode ?? null,
  summary: input?.verdict === 'FAIL' ? 'failed' : 'ok',
  environment: {
    runId: input?.runId ?? 'fixture:run',
    ...(input?.environment ?? {}),
  },
  artifacts: [],
  repairHints: [],
  nextRecommendedStage: null,
})
