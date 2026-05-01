import type { VerificationControlPlaneReport } from '@logixjs/core/ControlPlane'
import type { ProgramPanelControlPlaneState } from '../state/workbenchTypes.js'

export interface ControlPlaneDiagnosticRow {
  readonly id: string
  readonly severity: 'error' | 'warning' | 'info'
  readonly code: string
  readonly source: string
  readonly message: string
  readonly authority: string
  readonly evidence: string
}

export interface ControlPlaneDiagnosticInput {
  readonly checkState: ProgramPanelControlPlaneState
  readonly trialStartupState: ProgramPanelControlPlaneState
}

export interface ControlPlaneDiagnosticSummary {
  readonly errors: number
  readonly warnings: number
  readonly info: number
}

export const summarizeControlPlaneDiagnosticRows = (
  rows: ReadonlyArray<ControlPlaneDiagnosticRow>,
): ControlPlaneDiagnosticSummary => ({
  errors: rows.filter((row) => row.severity === 'error').length,
  warnings: rows.filter((row) => row.severity === 'warning').length,
  info: rows.filter((row) => row.severity === 'info').length,
})

export const projectControlPlaneDiagnosticRows = (
  input: ControlPlaneDiagnosticInput,
): ReadonlyArray<ControlPlaneDiagnosticRow> => [
  ...rowsFromState('Check', input.checkState),
  ...rowsFromState('Trial', input.trialStartupState),
]

const rowsFromState = (
  label: 'Check' | 'Trial',
  state: ProgramPanelControlPlaneState,
): ReadonlyArray<ControlPlaneDiagnosticRow> => {
  if (state.status === 'failed') {
    return [
      {
        id: `${label}:command-failed`,
        severity: 'error',
        code: 'PLAYGROUND_COMMAND_FAILED',
        source: label,
        message: state.message,
        authority: `playground.${label.toLowerCase()}`,
        evidence: state.message,
      },
    ]
  }
  if (state.status !== 'passed') return []
  return rowsFromReport(state.report)
}

const rowsFromReport = (report: VerificationControlPlaneReport): ReadonlyArray<ControlPlaneDiagnosticRow> => {
  const authority = `runtime.${report.stage}/${report.mode}`
  const severity = severityFromReport(report)
  const findings = report.findings ?? []

  if (findings.length > 0) {
    return findings.map((finding, index) => ({
      id: `${authority}:finding:${finding.code}:${finding.ownerCoordinate}:${index}`,
      severity,
      code: finding.code,
      source: finding.ownerCoordinate,
      message: finding.summary,
      authority,
      evidence: formatEvidence({
        focusRef: finding.focusRef,
        sourceArtifactRef: finding.sourceArtifactRef,
        artifactOutputKeys: report.artifacts.map((artifact) => artifact.outputKey),
      }),
    }))
  }

  return [
    {
      id: `${authority}:summary:${report.errorCode ?? report.verdict}`,
      severity,
      code: report.errorCode ?? report.verdict,
      source: `${report.stage}/${report.mode}`,
      message: report.summary,
      authority,
      evidence: formatEvidence({
        artifactOutputKeys: report.artifacts.map((artifact) => artifact.outputKey),
        dependencyCauses: report.dependencyCauses,
        lifecycle: report.lifecycle,
      }),
    },
  ]
}

const severityFromReport = (report: VerificationControlPlaneReport): ControlPlaneDiagnosticRow['severity'] => {
  if (report.verdict === 'FAIL') return 'error'
  if (report.verdict === 'INCONCLUSIVE') return 'warning'
  return 'info'
}

const formatEvidence = (value: unknown): string => JSON.stringify(value)
