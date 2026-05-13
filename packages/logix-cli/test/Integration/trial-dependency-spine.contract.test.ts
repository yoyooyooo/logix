import path from 'node:path'
import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'
import { isVerificationControlPlaneReport, type VerificationControlPlaneReport } from '@logixjs/core/ControlPlane'

import { runCli } from '../../src/internal/entry.js'

const missingServiceEntry = (): string =>
  `${path.resolve(__dirname, '../fixtures/MissingServiceProgram.ts')}#MissingServiceProgram`

describe('CLI trial dependency spine contract', () => {
  it('preserves core dependency causes and primary report linkage', async () => {
    const out = await Effect.runPromise(runCli([
      'trial',
      '--runId',
      'cli-trial-missing-service',
      '--entry',
      missingServiceEntry(),
      '--mode',
      'startup',
    ]))

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected CLI result')

    const result = out.result
    const reportArtifact = result.artifacts.find((artifact) => artifact.outputKey === result.primaryReportOutputKey)
    expect(result.primaryReportOutputKey).toBeDefined()
    expect(result.artifacts.some((artifact) => artifact.outputKey === result.primaryReportOutputKey)).toBe(true)
    expect(isVerificationControlPlaneReport(reportArtifact?.inline)).toBe(true)

    const report = reportArtifact?.inline as unknown as VerificationControlPlaneReport
    expect(report.stage).toBe('trial')
    expect(report.mode).toBe('startup')
    expect(report.dependencyCauses?.[0]).toMatchObject({
      kind: 'service',
      phase: 'startup-boot',
      ownerCoordinate: 'service:BusinessService',
      providerSource: 'runtime-overlay',
      focusRef: { declSliceId: 'service:BusinessService' },
      errorCode: 'MissingDependency',
    })
    expect(report.findings?.[0]).toMatchObject({
      kind: 'dependency',
      code: 'MissingDependency',
      ownerCoordinate: 'service:BusinessService',
    })
    expect(report.repairHints[0]).toMatchObject({
      code: 'MissingDependency',
      canAutoRetry: false,
      upgradeToStage: 'trial',
      focusRef: { declSliceId: 'service:BusinessService' },
    })
    expect(report.nextRecommendedStage).toBe('trial')
  })
})
