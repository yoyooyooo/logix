import type { VerificationControlPlaneArtifactRef } from '../../../ControlPlane.js'

export type LiveAttachmentLifecycleState =
  | 'disabled'
  | 'offered'
  | 'attached'
  | 'draining'
  | 'revoked'
  | 'disconnected'
  | 'target-unavailable'
  | 'cleaned'

export type LiveAdapterKind = 'browser-dev' | 'node-local' | 'playground' | 'devtools' | 'cloud' | 'test'

export interface LiveTargetCoordinate {
  readonly runtimeId: string
  readonly moduleId: string
  readonly instanceId: string
}

export interface LiveAttachmentState {
  readonly attachmentId: string
  readonly state: LiveAttachmentLifecycleState
}

export interface LiveHostCoordinate {
  readonly hostKind: 'browser' | 'node' | 'playground' | 'cloud' | 'cli-daemon' | 'test'
  readonly processId?: string
  readonly tabId?: string
  readonly projectId?: string
  readonly url?: string
  readonly environmentFingerprintRef?: string
}

export interface LiveTransportProjection {
  readonly carrier: 'websocket' | 'ipc' | 'stdio' | 'in-process' | 'test'
  readonly connectionId?: string
  readonly socketPath?: string
  readonly port?: number
  readonly health?: 'connecting' | 'ready' | 'degraded' | 'closed'
}

export interface LiveBudgetProfile {
  readonly maxEvents: number
  readonly maxInlineBytes: number
  readonly timeoutMs?: number
}

export type LiveOperationKind =
  | 'target.discover'
  | 'capture.eventWindow'
  | 'snapshot.read'
  | 'wait.condition'
  | 'evidence.export'
  | 'dispatch.declaredAction'
  | 'profile.runtimeSummary'

export type LiveStageClass = 'static' | 'startup' | 'scenario' | 'host-harness' | 'drilldown-only'

export interface LiveOperationRequest {
  readonly actorId: string
  readonly operationKind: LiveOperationKind
  readonly target: LiveTargetCoordinate
  readonly permissionScope?: string
  readonly capabilityLeaseId?: string
  readonly manifestDigest?: string
  readonly actionTag?: string
  readonly payloadSchemaRef?: string
  readonly validatorAvailable?: boolean
  readonly budget: LiveBudgetProfile
  readonly redactionPolicyRef: string
}

export interface LiveBindingHeader {
  readonly manifestDigest?: string
  readonly actionTag?: string
  readonly payloadSchemaRef?: string
  readonly validatorAvailable?: boolean
  readonly bindingStatus: 'matched' | 'missing' | 'mismatch' | 'stale' | 'unknown'
}

export interface LiveTargetDescriptor extends LiveTargetCoordinate {
  readonly attachmentId: string
  readonly adapterKind: LiveAdapterKind
  readonly hostCoordinate?: LiveHostCoordinate
  readonly transport?: LiveTransportProjection
}

export interface LiveAttachmentOffer {
  readonly attachmentId: string
  readonly adapterKind: LiveAdapterKind
  readonly targets: ReadonlyArray<LiveTargetCoordinate>
  readonly hostCoordinate?: LiveHostCoordinate
  readonly transport?: LiveTransportProjection
  readonly capabilityLeaseId?: string
  readonly pendingEvidenceRefs?: ReadonlyArray<string>
}

export interface LiveCapabilities {
  readonly enabled: boolean
  readonly canAttach: boolean
  readonly canCapture: boolean
  readonly canMutate: boolean
  readonly reason?: 'bridge-disabled'
}

export interface LiveRegistryDiagnostics {
  readonly captureBufferAllocations: number
  readonly transportAllocations: number
  readonly operationRequests: number
}

export interface LiveCleanupResult {
  readonly attachmentId: string
  readonly state: 'cleaned'
  readonly drainedEvidenceRefs?: ReadonlyArray<string>
  readonly dropped?: {
    readonly reason: string
  }
  readonly degraded?: {
    readonly reason: string
  }
}

export type LiveAdmissionDenialReason =
  | 'missing-live-manifest-binding'
  | 'unknown-live-manifest-binding'
  | 'stale-manifest'
  | 'digest-mismatch'
  | 'payload-schema-digest-mismatch'
  | 'unavailable-action-contract'
  | 'unauthorized-target'
  | 'missing-validator'
  | 'unsupported-operation'
  | 'terminal-attachment'
  | 'bridge-disabled'

export interface LiveEvidenceGap {
  readonly kind: 'evidence.gap'
  readonly gapId: string
  readonly code: string
  readonly summary: string
  readonly severity: 'info' | 'warning' | 'error'
  readonly stageClass: LiveStageClass
  readonly target?: LiveTargetCoordinate
}

export interface LiveOperationDeniedFacet {
  readonly kind: 'operation.denied'
  readonly operationId: string
  readonly actorId: string
  readonly operationKind: LiveOperationKind
  readonly target: LiveTargetCoordinate
  readonly reason: LiveAdmissionDenialReason
  readonly noMutation: true
  readonly stageClass: LiveStageClass
  readonly binding?: LiveBindingHeader
  readonly budget?: LiveBudgetProfile
  readonly redactionPolicyRef?: string
}

export interface LiveOperationAcceptedFacet {
  readonly kind: 'operation.accepted'
  readonly operationId: string
  readonly actorId: string
  readonly operationKind: LiveOperationKind
  readonly target: LiveTargetCoordinate
  readonly stageClass: LiveStageClass
  readonly binding?: LiveBindingHeader
}

export interface LiveOperationCompletedFacet {
  readonly kind: 'operation.completed'
  readonly operationId: string
  readonly target: LiveTargetCoordinate
  readonly stageClass: LiveStageClass
  readonly binding?: LiveBindingHeader
  readonly resultSummaryDigest?: string
  readonly artifactRef?: VerificationControlPlaneArtifactRef
}

export interface LiveOperationFailedFacet {
  readonly kind: 'operation.failed'
  readonly operationId: string
  readonly target: LiveTargetCoordinate
  readonly stageClass: LiveStageClass
  readonly binding?: LiveBindingHeader
  readonly resultSummaryDigest?: string
  readonly boundedCause?: string
}

export interface LiveRedactionMarker {
  readonly category: string
  readonly reason: string
}

export interface LiveDroppedMarker {
  readonly count: number
  readonly reason: string
}

export interface LiveDegradedMarker {
  readonly reason: string
}

export interface LiveCaptureFacet {
  readonly kind: 'live.capture'
  readonly captureId: string
  readonly captureKind: 'event-window' | 'snapshot' | 'profile' | 'selector-route' | 'host-commit'
  readonly target: LiveTargetCoordinate
  readonly stageClass: LiveStageClass
  readonly budget: LiveBudgetProfile
  readonly localOnly?: boolean
  readonly profileSummary?: {
    readonly authority: 'react-host-adjunct'
    readonly source: 'local-browser' | 'repo-internal-host-harness'
    readonly sampleCount: number
    readonly targetRef?: LiveTargetCoordinate
    readonly attachmentId?: string
    readonly linkRefs?: ReadonlyArray<string>
  }
  readonly samplingProfileRef?: string
  readonly dropped?: LiveDroppedMarker
  readonly degraded?: LiveDegradedMarker
  readonly redacted?: ReadonlyArray<LiveRedactionMarker>
  readonly artifactRef?: VerificationControlPlaneArtifactRef
}

export type LiveEvidenceFacet =
  | LiveOperationDeniedFacet
  | LiveOperationAcceptedFacet
  | LiveOperationCompletedFacet
  | LiveOperationFailedFacet
  | LiveCaptureFacet
  | LiveEvidenceGap

export const makeLiveTargetCoordinate = (input: LiveTargetCoordinate): LiveTargetCoordinate => ({
  runtimeId: input.runtimeId.trim() || 'unknown-runtime',
  moduleId: input.moduleId.trim() || 'unknown-module',
  instanceId: input.instanceId.trim() || 'unknown-instance',
})

export const makeLiveAttachmentState = (input: {
  readonly attachmentId: string
  readonly state: LiveAttachmentLifecycleState
}): LiveAttachmentState => ({
  attachmentId: input.attachmentId.trim() || 'unknown-attachment',
  state: input.state,
})

export const liveTargetCoordinateKey = (target: LiveTargetCoordinate): string => {
  const normalized = makeLiveTargetCoordinate(target)
  return `${normalized.runtimeId}/${normalized.moduleId}/${normalized.instanceId}`
}

export const isLiveTerminalState = (state: LiveAttachmentLifecycleState): boolean =>
  state === 'revoked' || state === 'disconnected' || state === 'target-unavailable' || state === 'cleaned'
