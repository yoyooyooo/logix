import { describe, expect, it } from 'vitest'
import { isVerificationControlPlaneReport } from '@logixjs/core/ControlPlane'

import { makeCommandResult } from '../../src/internal/result.js'

const report = {
  schemaVersion: 1,
  kind: 'VerificationControlPlaneReport',
  stage: 'check',
  mode: 'static',
  verdict: 'PASS',
  errorCode: null,
  summary: 'ok',
  environment: {},
  artifacts: [],
  repairHints: [],
  nextRecommendedStage: 'trial',
} as const

describe('CommandResult transport contract', () => {
  it('requires inputCoordinate and primaryReportOutputKey', () => {
    const result = makeCommandResult({
      runId: 'r1',
      command: 'check',
      ok: true,
      inputCoordinate: {
        command: 'check',
        entry: { modulePath: './program.ts', exportName: 'BasicProgram' },
      },
      primaryReportOutputKey: 'checkReport',
      artifacts: [{ outputKey: 'checkReport', kind: 'VerificationControlPlaneReport', ok: true, inline: report }],
    })

    expect(result).not.toHaveProperty('mode')
    expect(result.inputCoordinate.command).toBe('check')
    expect(result.primaryReportOutputKey).toBe('checkReport')
    expect(isVerificationControlPlaneReport(result.artifacts[0]?.inline)).toBe(true)
  })

  it('rejects a primary report key missing from artifacts', () => {
    expect(() =>
      makeCommandResult({
        runId: 'r2',
        command: 'check',
        ok: true,
        inputCoordinate: { command: 'check' },
        primaryReportOutputKey: 'missing',
        artifacts: [{ outputKey: 'other', kind: 'VerificationControlPlaneReport', ok: true, inline: report }],
      }),
    ).toThrow(/primaryReportOutputKey|outputKey/)
  })

  it('keeps artifact output order deterministic after command execution sorting', () => {
    const result = makeCommandResult({
      runId: 'r3',
      command: 'check',
      ok: true,
      inputCoordinate: { command: 'check' },
      primaryReportOutputKey: 'checkReport',
      artifacts: [
        { outputKey: 'sourceArtifact', kind: 'CliSourceArtifact', ok: true, inline: { kind: 'source' } },
        { outputKey: 'checkReport', kind: 'VerificationControlPlaneReport', ok: true, inline: report },
      ],
    })

    expect(result.artifacts.map((artifact) => artifact.outputKey)).toEqual(['sourceArtifact', 'checkReport'])
  })
})
