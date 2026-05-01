import type { VerificationControlPlaneArtifactRef } from '../../ControlPlane.js'
import type { RuntimeWorkbenchAuthorityRef } from './authority.js'
import type { RuntimeWorkbenchRuntimeCoordinate, RuntimeWorkbenchSourceProjection } from './coordinates.js'
import type { RuntimeWorkbenchFindingProjection } from './findings.js'
import type { RuntimeWorkbenchEvidenceGap } from './gaps.js'

export interface RuntimeWorkbenchArtifactProjection {
  readonly id: string
  readonly authorityRef?: RuntimeWorkbenchAuthorityRef
  readonly derivedFrom?: ReadonlyArray<RuntimeWorkbenchAuthorityRef>
  readonly artifactOutputKey?: string
  readonly artifactRef?: string
  readonly kind: 'report' | 'evidence' | 'run' | 'debug' | 'source' | 'reflection'
  readonly sourceRefs: ReadonlyArray<string>
  readonly preview?: unknown
}

export interface RuntimeWorkbenchSessionProjection {
  readonly id: string
  readonly authorityRef: RuntimeWorkbenchAuthorityRef
  readonly inputKind: string
  readonly status: 'passed' | 'failed' | 'inconclusive' | 'unknown'
  readonly sourceDigest?: string
  readonly runtimeCoordinate?: RuntimeWorkbenchRuntimeCoordinate
  readonly findingRefs: ReadonlyArray<string>
  readonly artifactRefs: ReadonlyArray<string>
  readonly drilldownRefs: ReadonlyArray<string>
  readonly gapRefs: ReadonlyArray<string>
}

export interface RuntimeWorkbenchProjectionIndexes {
  readonly findingsById: Readonly<Record<string, RuntimeWorkbenchFindingProjection>>
  readonly artifactsById: Readonly<Record<string, RuntimeWorkbenchArtifactProjection>>
  readonly gapsById: Readonly<Record<string, RuntimeWorkbenchEvidenceGap>>
  readonly sourcesById: Readonly<Record<string, RuntimeWorkbenchSourceProjection>>
}

export interface RuntimeWorkbenchProjectionIndex {
  readonly sessions: ReadonlyArray<RuntimeWorkbenchSessionProjection>
  readonly indexes?: RuntimeWorkbenchProjectionIndexes
}

export const makeProjectionIndex = (args: {
  readonly sessions: ReadonlyArray<RuntimeWorkbenchSessionProjection>
  readonly findings: ReadonlyArray<RuntimeWorkbenchFindingProjection>
  readonly artifacts: ReadonlyArray<RuntimeWorkbenchArtifactProjection>
  readonly gaps: ReadonlyArray<RuntimeWorkbenchEvidenceGap>
  readonly sources: ReadonlyArray<RuntimeWorkbenchSourceProjection>
}): RuntimeWorkbenchProjectionIndex => ({
  sessions: args.sessions,
  indexes: {
    findingsById: Object.fromEntries(args.findings.map((finding) => [finding.id, finding])),
    artifactsById: Object.fromEntries(args.artifacts.map((artifact) => [artifact.id, artifact])),
    gapsById: Object.fromEntries(args.gaps.map((gap) => [gap.id, gap])),
    sourcesById: Object.fromEntries(args.sources.map((source) => [source.id, source])),
  },
})

export const artifactProjectionFromReportArtifact = (
  artifact: VerificationControlPlaneArtifactRef,
  authorityRef: RuntimeWorkbenchAuthorityRef,
): RuntimeWorkbenchArtifactProjection => ({
  id: `artifact:${artifact.outputKey}`,
  authorityRef,
  artifactOutputKey: artifact.outputKey,
  artifactRef: artifact.file,
  kind: 'report',
  sourceRefs: [],
  preview: {
    kind: artifact.kind,
    ...(artifact.digest ? { digest: artifact.digest } : null),
    ...(artifact.reasonCodes ? { reasonCodes: artifact.reasonCodes } : null),
  },
})

export const artifactProjectionFromEvidenceArtifact = (
  artifact: VerificationControlPlaneArtifactRef,
  authorityRef: RuntimeWorkbenchAuthorityRef,
): RuntimeWorkbenchArtifactProjection => ({
  id: `artifact:${artifact.outputKey}`,
  authorityRef,
  artifactOutputKey: artifact.outputKey,
  artifactRef: artifact.file,
  kind: 'evidence',
  sourceRefs: [],
  preview: {
    kind: artifact.kind,
    ...(artifact.digest ? { digest: artifact.digest } : null),
    ...(artifact.reasonCodes ? { reasonCodes: artifact.reasonCodes } : null),
  },
})
