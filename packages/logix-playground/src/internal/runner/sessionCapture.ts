import type { VerificationControlPlaneReport } from '@logixjs/core/ControlPlane'
import type { PlaygroundRuntimeEvidenceEnvelope, PlaygroundRuntimeArtifactRef } from './runtimeEvidence.js'

export interface PlaygroundSessionCapture {
  readonly captureId: string
  readonly projectId: string
  readonly revision: number
  readonly opSeq: number
  readonly kind: 'run' | 'run-failure' | 'check-report' | 'trial-report'
  readonly authorityRef: string
  readonly artifactRefs: ReadonlyArray<string>
  readonly sourceDigest: string
}

export interface CompareCompatibleCapturePair {
  readonly beforeReportRef: string
  readonly afterReportRef: string
  readonly beforeArtifactRefs: ReadonlyArray<string>
  readonly afterArtifactRefs: ReadonlyArray<string>
  readonly sourceDigest: string
}

const reportRunId = (report: VerificationControlPlaneReport): string => {
  const environment = report.environment
  if (typeof environment === 'object' && environment !== null && !Array.isArray(environment)) {
    const runId = (environment as Record<string, unknown>).runId
    if (typeof runId === 'string' && runId.length > 0) return runId
  }
  return 'run:none'
}

const reportAuthorityRef = (report: VerificationControlPlaneReport): string =>
  `report:${report.stage}:${report.mode}:${reportRunId(report)}`

const artifactOutputKeys = (
  envelopeRefs: ReadonlyArray<PlaygroundRuntimeArtifactRef>,
  report: VerificationControlPlaneReport | undefined,
): ReadonlyArray<string> => {
  const keys = new Set<string>()
  for (const ref of envelopeRefs) {
    keys.add(ref.outputKey)
  }
  for (const ref of report?.artifacts ?? []) {
    keys.add(ref.outputKey)
  }
  return Array.from(keys).sort()
}

const captureKindForReport = (
  report: VerificationControlPlaneReport,
): Extract<PlaygroundSessionCapture['kind'], 'check-report' | 'trial-report'> | undefined => {
  if (report.stage === 'check') return 'check-report'
  if (report.stage === 'trial' && report.mode === 'startup') return 'trial-report'
  return undefined
}

const makeCapture = (
  envelope: PlaygroundRuntimeEvidenceEnvelope,
  kind: PlaygroundSessionCapture['kind'],
  authorityRef: string,
  artifactRefs: ReadonlyArray<string>,
): PlaygroundSessionCapture => ({
  captureId: `${envelope.operationCoordinate.instanceId}:op${envelope.operationCoordinate.opSeq}:${kind}`,
  projectId: envelope.operationCoordinate.instanceId.replace(/:r\d+$/, ''),
  revision: envelope.sourceRevision,
  opSeq: envelope.operationCoordinate.opSeq,
  kind,
  authorityRef,
  artifactRefs,
  sourceDigest: envelope.sourceDigest,
})

export const captureRefFromRuntimeEvidence = (
  envelope: PlaygroundRuntimeEvidenceEnvelope,
): PlaygroundSessionCapture | undefined => {
  if (envelope.controlPlaneReport) {
    const kind = captureKindForReport(envelope.controlPlaneReport)
    if (!kind) return undefined
    return makeCapture(
      envelope,
      kind,
      reportAuthorityRef(envelope.controlPlaneReport),
      artifactOutputKeys(envelope.artifactRefs, envelope.controlPlaneReport),
    )
  }

  const output = envelope.runtimeOutput
  if (!output || output.operation !== 'run' || !output.runId) return undefined
  if (output.status === 'failed') {
    return makeCapture(envelope, 'run-failure', `run-failure:${output.runId}`, artifactOutputKeys(envelope.artifactRefs, undefined))
  }
  return makeCapture(envelope, 'run', `run:${output.runId}`, artifactOutputKeys(envelope.artifactRefs, undefined))
}

const isReportCapture = (
  capture: PlaygroundSessionCapture | undefined,
): capture is PlaygroundSessionCapture & { readonly kind: 'check-report' | 'trial-report' } =>
  capture?.kind === 'check-report' || capture?.kind === 'trial-report'

export const buildCompareCompatibleCapturePair = (
  before: PlaygroundSessionCapture | undefined,
  after: PlaygroundSessionCapture | undefined,
): CompareCompatibleCapturePair => {
  if (!isReportCapture(before) || !isReportCapture(after)) {
    throw new Error('Playground compare requires captured reports.')
  }
  if (before.sourceDigest !== after.sourceDigest) {
    throw new Error('Playground compare requires matching source digest refs.')
  }
  return {
    beforeReportRef: before.authorityRef,
    afterReportRef: after.authorityRef,
    beforeArtifactRefs: before.artifactRefs,
    afterArtifactRefs: after.artifactRefs,
    sourceDigest: before.sourceDigest,
  }
}
