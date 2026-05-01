import type {
  VerificationControlPlaneArtifactRef,
  VerificationControlPlaneReport,
  VerificationControlPlaneStage,
} from '../../ControlPlane.js'
import { isVerificationControlPlaneReport } from '../../ControlPlane.js'

export type RuntimeWorkbenchAuthorityKind =
  | 'run-result'
  | 'control-plane-report'
  | 'evidence-package'
  | 'artifact-ref'
  | 'reflection-node'
  | 'debug-event-batch'
  | 'evidence-gap'

export interface RuntimeWorkbenchAuthorityRef {
  readonly kind: RuntimeWorkbenchAuthorityKind | 'context' | 'gap'
  readonly id: string
}

export interface RuntimeWorkbenchRunResultInput {
  readonly kind: 'run-result'
  readonly runId: string
  readonly status: 'passed' | 'failed'
  readonly value?: unknown
  readonly valueKind?: 'json' | 'null' | 'undefined' | 'void' | 'stringified' | 'truncated'
  readonly lossy?: boolean
  readonly lossReasons?: ReadonlyArray<string>
  readonly failure?: {
    readonly code?: string
    readonly message: string
  }
  readonly durationMs?: number
  readonly sourceDigest?: string
}

export interface RuntimeWorkbenchControlPlaneReportInput {
  readonly kind: 'control-plane-report'
  readonly report: VerificationControlPlaneReport
  readonly sourceDigest?: string
}

export interface RuntimeWorkbenchEvidencePackageInput {
  readonly kind: 'evidence-package'
  readonly packageId: string
  readonly artifacts?: ReadonlyArray<VerificationControlPlaneArtifactRef>
  readonly events?: ReadonlyArray<unknown>
  readonly sourceDigest?: string
}

export interface RuntimeWorkbenchArtifactRefInput {
  readonly kind: 'artifact-ref'
  readonly artifact: VerificationControlPlaneArtifactRef
  readonly sourceDigest?: string
}

export interface RuntimeWorkbenchReflectionNodeInput {
  readonly kind: 'reflection-node'
  readonly nodeKind: 'action' | 'payload' | 'dependency'
  readonly nodeId: string
  readonly summary: string
  readonly manifestDigest?: string
  readonly actionTag?: string
  readonly payload?: {
    readonly kind: 'void' | 'nonVoid' | 'unknown'
    readonly summary?: string
    readonly schemaDigest?: string
    readonly validatorAvailable?: boolean
  }
  readonly dependency?: {
    readonly kind: 'service' | 'config' | 'program-import' | 'external-package' | 'host-fixture'
    readonly phase?: 'declaration' | 'startup-boot' | 'startup-close' | 'run' | 'scenario'
    readonly ownerCoordinate: string
    readonly providerSource?: 'program-capabilities' | 'runtime-overlay' | 'declaration' | 'host' | 'unknown'
    readonly focusRef?: unknown
    readonly sourceRef?: string
    readonly childIdentity?: string
    readonly errorCode?: string
  }
  readonly focusRef?: unknown
  readonly sourceRef?: string
  readonly degraded?: boolean
  readonly degradationReason?: string
  readonly sourceDigest?: string
}

export interface RuntimeWorkbenchDebugEventRef {
  readonly eventId?: string
  readonly runtimeLabel?: string
  readonly moduleId?: string
  readonly instanceId?: string
  readonly txnSeq?: number
  readonly opSeq?: number
  readonly eventSeq?: number
  readonly timestamp?: number
  readonly label?: string
  readonly type?: string
  readonly degraded?: boolean
  readonly dropped?: boolean
}

export interface RuntimeWorkbenchDebugEventBatchInput {
  readonly kind: 'debug-event-batch'
  readonly batchId: string
  readonly events: ReadonlyArray<RuntimeWorkbenchDebugEventRef>
  readonly sourceDigest?: string
}

export interface RuntimeWorkbenchEvidenceGapInput {
  readonly kind: 'evidence-gap'
  readonly gapId: string
  readonly code: string
  readonly owner: 'bundle' | 'session' | 'finding' | 'artifact' | 'source'
  readonly summary: string
  readonly severity: 'info' | 'warning' | 'error'
  readonly sourceDigest?: string
}

export type RuntimeWorkbenchTruthInput =
  | RuntimeWorkbenchRunResultInput
  | RuntimeWorkbenchControlPlaneReportInput
  | RuntimeWorkbenchEvidencePackageInput
  | RuntimeWorkbenchArtifactRefInput
  | RuntimeWorkbenchReflectionNodeInput
  | RuntimeWorkbenchDebugEventBatchInput
  | RuntimeWorkbenchEvidenceGapInput

export interface RuntimeWorkbenchSourceSpan {
  readonly path: string
  readonly startLine?: number
  readonly startColumn?: number
  readonly endLine?: number
  readonly endColumn?: number
}

export type RuntimeWorkbenchContextRef =
  | {
      readonly kind: 'source-snapshot'
      readonly projectId: string
      readonly digest?: string
      readonly spans?: ReadonlyArray<RuntimeWorkbenchSourceSpan>
    }
  | {
      readonly kind: 'source-locator'
      readonly locator: string
      readonly provenance: 'source-snapshot' | 'artifact' | 'report' | 'evidence' | 'debug' | 'host'
      readonly digest?: string
    }
  | {
      readonly kind: 'package-identity'
      readonly packageId: string
      readonly projectId?: string
    }
  | {
      readonly kind: 'imported-artifact-locator'
      readonly locator: string
      readonly artifactOutputKey?: string
      readonly digest?: string
    }

export type RuntimeWorkbenchSelectionHint =
  | {
      readonly kind: 'selected-session'
      readonly sessionId: string
    }
  | {
      readonly kind: 'selected-finding'
      readonly findingId: string
    }
  | {
      readonly kind: 'selected-artifact'
      readonly artifactOutputKey: string
    }
  | {
      readonly kind: 'imported-selection-manifest'
      readonly selectionId?: string
      readonly sessionId?: string
      readonly findingId?: string
      readonly artifactOutputKey?: string
      readonly focusRef?: unknown
    }

export interface RuntimeWorkbenchAuthorityBundle {
  readonly truthInputs: ReadonlyArray<RuntimeWorkbenchTruthInput>
  readonly contextRefs?: ReadonlyArray<RuntimeWorkbenchContextRef>
  readonly selectionHints?: ReadonlyArray<RuntimeWorkbenchSelectionHint>
}

export const authorityRefOf = (input: RuntimeWorkbenchTruthInput): RuntimeWorkbenchAuthorityRef => {
  switch (input.kind) {
    case 'run-result':
      return { kind: input.kind, id: input.runId }
    case 'control-plane-report':
      return {
        kind: input.kind,
        id: controlPlaneReportAuthorityId(input.report),
      }
    case 'evidence-package':
      return { kind: input.kind, id: input.packageId }
    case 'artifact-ref':
      return { kind: input.kind, id: input.artifact.outputKey }
    case 'reflection-node':
      return { kind: input.kind, id: input.nodeId }
    case 'debug-event-batch':
      return { kind: input.kind, id: input.batchId }
    case 'evidence-gap':
      return { kind: input.kind, id: input.gapId }
  }
}

export const isControlPlaneTruthInput = (
  input: RuntimeWorkbenchTruthInput,
): input is RuntimeWorkbenchControlPlaneReportInput =>
  input.kind === 'control-plane-report' && isVerificationControlPlaneReport(input.report)

export const isRunResultTruthInput = (input: RuntimeWorkbenchTruthInput): input is RuntimeWorkbenchRunResultInput =>
  input.kind === 'run-result' && !isVerificationControlPlaneReport(input)

export const stageFromTruthInput = (input: RuntimeWorkbenchTruthInput): VerificationControlPlaneStage | undefined =>
  input.kind === 'control-plane-report' ? input.report.stage : undefined

export const sourceDigestOfInput = (input: RuntimeWorkbenchTruthInput): string | undefined =>
  'sourceDigest' in input ? input.sourceDigest : undefined

export const digestText = (value: string): string => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `fnv1a:${(hash >>> 0).toString(16).padStart(8, '0')}`
}

const controlPlaneReportAuthorityId = (report: VerificationControlPlaneReport): string => {
  const focusRef = report.repairHints.find((hint) => hint.focusRef !== null)?.focusRef
  return [
    reportRunId(report),
    report.stage,
    report.mode,
    report.errorCode ?? report.verdict,
    focusRef ? focusRefId(focusRef) : 'focus:none',
    artifactKeysId(report.artifacts),
  ].join(':')
}

const reportRunId = (report: VerificationControlPlaneReport): string => {
  const environment = report.environment
  if (typeof environment === 'object' && environment !== null && !Array.isArray(environment)) {
    const runId = (environment as Record<string, unknown>).runId
    if (typeof runId === 'string' && runId.length > 0) return runId
  }
  return 'run:none'
}

const focusRefId = (focusRef: NonNullable<VerificationControlPlaneReport['repairHints'][number]['focusRef']>): string =>
  [
    focusRef.declSliceId ? `decl=${focusRef.declSliceId}` : null,
    focusRef.reasonSlotId ? `reason=${focusRef.reasonSlotId}` : null,
    focusRef.scenarioStepId ? `scenario=${focusRef.scenarioStepId}` : null,
    focusRef.sourceRef ? `source=${focusRef.sourceRef}` : null,
  ].filter((part): part is string => typeof part === 'string').join('|') || 'focus:none'

const artifactKeysId = (artifacts: VerificationControlPlaneReport['artifacts']): string =>
  artifacts.map((artifact) => artifact.outputKey).sort((a, b) => a.localeCompare(b)).join('|') || 'artifacts:none'
