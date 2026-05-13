import { describe, expect, it } from 'vitest'
import { isVerificationControlPlaneReport } from '@logixjs/core/ControlPlane'

import { getAgentSchedulingStage, makeCommandResult, makeErrorCommandResult } from '../../src/internal/result.js'

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

  it('keeps entry failure scheduling null in the transport-gate report', () => {
    for (const code of [
      'CLI_ENTRY_NO_EXPORT',
      'CLI_ENTRY_NOT_PROGRAM',
      'CLI_ENTRY_IMPORT_FAILED',
      'PROGRAM_BLUEPRINT_MISSING',
    ]) {
      const result = makeErrorCommandResult({
        runId: `entry-${code}`,
        command: 'check',
        inputCoordinate: {
          command: 'check',
          entry: { modulePath: './entry.ts', exportName: 'Entry' },
        },
        error: {
          code,
          message: code,
        },
      })
      const primary = result.artifacts.find((artifact) => artifact.outputKey === result.primaryReportOutputKey)

      expect(result.primaryReportOutputKey).toBe('errorReport')
      expect(result.inputCoordinate.entry).toEqual({ modulePath: './entry.ts', exportName: 'Entry' })
      expect(primary?.inline).toMatchObject({
        kind: 'VerificationControlPlaneReport',
        stage: 'check',
        mode: 'static',
        errorCode: code,
        nextRecommendedStage: null,
      })
    }
  })

  it('lets agents resolve the primary report through output keys and prefer file-backed reports', () => {
    const result = makeCommandResult({
      runId: 'file-backed-report',
      command: 'trial',
      ok: true,
      inputCoordinate: { command: 'trial', entry: { modulePath: './program.ts', exportName: 'Program' } },
      primaryReportOutputKey: 'trialReport',
      artifacts: [
        { outputKey: 'sourceArtifact', kind: 'CliSourceArtifact', ok: true, inline: { kind: 'source' } },
        {
          outputKey: 'trialReport',
          kind: 'VerificationControlPlaneReport',
          ok: true,
          file: '/tmp/logix/trial-report.json',
          truncated: true,
          budgetBytes: 16,
          actualBytes: 4096,
        },
      ],
    })
    const primary = result.artifacts.find((artifact) => artifact.outputKey === result.primaryReportOutputKey)

    expect(primary).toMatchObject({
      outputKey: 'trialReport',
      kind: 'VerificationControlPlaneReport',
      file: '/tmp/logix/trial-report.json',
      truncated: true,
    })
    expect(primary?.inline).toBeUndefined()
  })

  it('keeps non-zero command exits consumable through the structured error report', () => {
    const result = makeErrorCommandResult({
      runId: 'bad-entry',
      command: 'trial',
      inputCoordinate: {
        command: 'trial',
        entry: { modulePath: './missing.ts', exportName: 'Program' },
        trialMode: 'startup',
      },
      error: {
        code: 'CLI_ENTRY_IMPORT_FAILED',
        message: 'Cannot import entry.',
      },
    })
    const primary = result.artifacts.find((artifact) => artifact.outputKey === result.primaryReportOutputKey)

    expect(result.ok).toBe(false)
    expect(result.primaryReportOutputKey).toBe('errorReport')
    expect(primary?.inline).toMatchObject({
      kind: 'VerificationControlPlaneReport',
      stage: 'trial',
      mode: 'startup',
      errorCode: 'CLI_ENTRY_IMPORT_FAILED',
      repairHints: [],
      nextRecommendedStage: null,
    })
  })

  it('uses the report-level nextRecommendedStage instead of hint-local scheduling fields', () => {
    const reportWithHintStage = {
      nextRecommendedStage: 'compare',
      repairHints: [{ code: 'hint-stage', canAutoRetry: false, upgradeToStage: 'trial', focusRef: null }],
    } as const

    expect(getAgentSchedulingStage(reportWithHintStage)).toBe('compare')
  })
})
