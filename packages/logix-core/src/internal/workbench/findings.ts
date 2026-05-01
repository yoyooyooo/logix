import type {
  VerificationControlPlaneArtifactRef,
  VerificationControlPlaneFinding,
  VerificationControlPlaneRepairHint,
  VerificationControlPlaneReport,
} from '../../ControlPlane.js'
import type { RuntimeWorkbenchAuthorityRef, RuntimeWorkbenchRunResultInput } from './authority.js'
import type { RuntimeWorkbenchEvidenceGap } from './gaps.js'

export type RuntimeWorkbenchFindingClass =
  | 'control-plane-finding'
  | 'run-failure-facet'
  | 'evidence-gap'
  | 'degradation-notice'

export interface RuntimeWorkbenchRepairMirror {
  readonly repairHints?: ReadonlyArray<VerificationControlPlaneRepairHint>
  readonly nextRecommendedStage?: VerificationControlPlaneReport['nextRecommendedStage']
}

export interface RuntimeWorkbenchFindingProjection {
  readonly id: string
  readonly class: RuntimeWorkbenchFindingClass
  readonly authorityRef?: RuntimeWorkbenchAuthorityRef
  readonly derivedFrom?: ReadonlyArray<RuntimeWorkbenchAuthorityRef>
  readonly summary: string
  readonly severity: 'info' | 'warning' | 'error'
  readonly code?: string
  readonly focusRef?: unknown
  readonly artifactOutputKeys: ReadonlyArray<string>
  readonly repairMirror?: RuntimeWorkbenchRepairMirror
}

export const findingsFromControlPlaneReport = (
  report: VerificationControlPlaneReport,
  authorityRef: RuntimeWorkbenchAuthorityRef,
): ReadonlyArray<RuntimeWorkbenchFindingProjection> => {
  const explicitFindings = report.findings ?? []
  if (explicitFindings.length === 0) {
    return [
      findingFromReportSummary({
        report,
        authorityRef,
        index: 0,
      }),
    ]
  }

  return explicitFindings.map((finding, index) =>
    findingFromReportFinding({
      report,
      finding,
      authorityRef,
      index,
    }),
  )
}

export const findingFromRunFailure = (
  input: RuntimeWorkbenchRunResultInput,
  authorityRef: RuntimeWorkbenchAuthorityRef,
): RuntimeWorkbenchFindingProjection | undefined => {
  if (input.status !== 'failed') return undefined
  return {
    id: `finding:run-failure:${input.runId}`,
    class: 'run-failure-facet',
    authorityRef,
    summary: input.failure?.message ?? 'Runtime.run failed',
    severity: 'error',
    ...(input.failure?.code ? { code: input.failure.code } : null),
    artifactOutputKeys: [],
  }
}

export const findingFromGap = (gap: RuntimeWorkbenchEvidenceGap): RuntimeWorkbenchFindingProjection => ({
  id: `finding:${gap.id}`,
  class: 'evidence-gap',
  ...(gap.authorityRef ? { authorityRef: gap.authorityRef } : null),
  ...(gap.derivedFrom ? { derivedFrom: gap.derivedFrom } : null),
  summary: gap.summary,
  severity: gap.severity,
  code: gap.code,
  artifactOutputKeys: [],
})

export const degradationFinding = (args: {
  readonly id: string
  readonly authorityRef: RuntimeWorkbenchAuthorityRef
  readonly summary: string
}): RuntimeWorkbenchFindingProjection => ({
  id: `finding:degradation:${args.id}`,
  class: 'degradation-notice',
  authorityRef: args.authorityRef,
  summary: args.summary,
  severity: 'warning',
  artifactOutputKeys: [],
})

const findingFromReportSummary = (args: {
  readonly report: VerificationControlPlaneReport
  readonly authorityRef: RuntimeWorkbenchAuthorityRef
  readonly index: number
}): RuntimeWorkbenchFindingProjection => ({
  id: `finding:control-plane:${args.report.stage}:${args.report.mode}:${args.report.errorCode ?? args.report.verdict}:${args.index}`,
  class: 'control-plane-finding',
  authorityRef: args.authorityRef,
  summary: args.report.summary,
  severity: severityFromReport(args.report),
  ...(args.report.errorCode ? { code: args.report.errorCode } : null),
  focusRef: args.report.repairHints.find((hint) => hint.focusRef !== null)?.focusRef,
  artifactOutputKeys: artifactKeysFromReport(args.report),
  repairMirror: {
    repairHints: args.report.repairHints,
    nextRecommendedStage: args.report.nextRecommendedStage,
  },
})

const findingFromReportFinding = (args: {
  readonly report: VerificationControlPlaneReport
  readonly finding: VerificationControlPlaneFinding
  readonly authorityRef: RuntimeWorkbenchAuthorityRef
  readonly index: number
}): RuntimeWorkbenchFindingProjection => ({
  id: `finding:control-plane:${args.finding.kind}:${args.finding.code}:${args.finding.ownerCoordinate}:${args.index}`,
  class: 'control-plane-finding',
  authorityRef: args.authorityRef,
  summary: args.finding.summary,
  severity: severityFromReport(args.report),
  code: args.finding.code,
  focusRef: args.finding.focusRef,
  artifactOutputKeys: artifactKeysFromReport(args.report),
  repairMirror: {
    repairHints: args.report.repairHints,
    nextRecommendedStage: args.report.nextRecommendedStage,
  },
})

const severityFromReport = (report: VerificationControlPlaneReport): RuntimeWorkbenchFindingProjection['severity'] => {
  if (report.verdict === 'FAIL') return 'error'
  if (report.verdict === 'INCONCLUSIVE') return 'warning'
  return 'info'
}

const artifactKeysFromReport = (report: {
  readonly artifacts: ReadonlyArray<VerificationControlPlaneArtifactRef>
  readonly repairHints?: ReadonlyArray<VerificationControlPlaneRepairHint>
}): ReadonlyArray<string> => {
  const keys = new Set(report.artifacts.map((artifact) => artifact.outputKey))
  for (const hint of report.repairHints ?? []) {
    for (const key of hint.relatedArtifactOutputKeys ?? []) {
      keys.add(key)
    }
  }
  return Array.from(keys).sort()
}
