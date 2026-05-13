import { admitLiveOperation, type LiveAdmissionContext } from './liveAdmission.js'
import {
  makeLiveCaptureFacet,
  makeLiveOperationCompletedFacet,
  makeLiveOperationDeniedFacet,
  makeLiveOperationFailedFacet,
} from './liveEvidence.js'
import type { LiveOperationLedgerStore } from './liveLedger.js'
import type {
  LiveBindingHeader,
  LiveCaptureFacet,
  LiveEvidenceFacet,
  LiveOperationCompletedFacet,
  LiveOperationFailedFacet,
  LiveOperationRequest,
  LiveTargetCoordinate,
} from './liveTypes.js'

export interface LiveOperationContext extends LiveAdmissionContext {
  readonly targets?: ReadonlyArray<LiveTargetCoordinate>
  readonly failAfterAdmission?: string
  readonly attachmentId?: string
  readonly ledgerStore?: LiveOperationLedgerStore
}

const operationIdOf = (request: LiveOperationRequest): string =>
  `live-operation:${request.operationKind}`

const bindingOf = (request: LiveOperationRequest): LiveBindingHeader | undefined => {
  if (request.operationKind !== 'dispatch.declaredAction') return undefined
  if (!request.manifestDigest && !request.actionTag && !request.payloadSchemaRef && request.validatorAvailable === undefined) {
    return undefined
  }
  if (!request.manifestDigest && !request.actionTag) return undefined
  return {
    ...(request.manifestDigest ? { manifestDigest: request.manifestDigest } : null),
    ...(request.actionTag ? { actionTag: request.actionTag } : null),
    ...(request.payloadSchemaRef ? { payloadSchemaRef: request.payloadSchemaRef } : null),
    ...(request.validatorAvailable !== undefined ? { validatorAvailable: request.validatorAvailable } : null),
    bindingStatus: 'matched',
  }
}

const completed = (
  request: LiveOperationRequest,
  outputKey: string,
  binding?: LiveBindingHeader,
): LiveOperationCompletedFacet =>
  makeLiveOperationCompletedFacet({
    operationId: operationIdOf(request),
    target: request.target,
    ...(binding ? { binding } : null),
    artifactRef: {
      outputKey,
      kind: 'LiveOperationFacet',
    },
  })

const failed = (
  request: LiveOperationRequest,
  boundedCause: string,
  binding?: LiveBindingHeader,
): LiveOperationFailedFacet =>
  makeLiveOperationFailedFacet({
    operationId: operationIdOf(request),
    target: request.target,
    ...(binding ? { binding } : null),
    boundedCause,
  })

const capture = (
  request: LiveOperationRequest,
  captureKind: LiveCaptureFacet['captureKind'],
  outputKey: string,
): LiveCaptureFacet =>
  makeLiveCaptureFacet({
    captureId: operationIdOf(request),
    captureKind,
    target: request.target,
    budget: request.budget,
    artifactRef: {
      outputKey,
      kind: 'LiveCapture',
    },
  })

export const runLiveOperation = (
  request: LiveOperationRequest,
  context: LiveOperationContext = {},
): LiveEvidenceFacet => {
  const admission = admitLiveOperation(request, context)
  if (!admission.ok) {
    const denied = makeLiveOperationDeniedFacet({
      operationId: operationIdOf(request),
      actorId: request.actorId,
      operationKind: request.operationKind,
      target: request.target,
      reason: admission.reason,
      ...(admission.binding ? { binding: admission.binding } : null),
      budget: request.budget,
      redactionPolicyRef: request.redactionPolicyRef,
    })
    context.ledgerStore?.recordOperationEvent({
      target: request.target,
      ...(context.attachmentId ? { attachmentId: context.attachmentId } : null),
      eventKind: 'operation.denied',
      label: admission.reason,
      budget: request.budget,
      binding: admission.binding,
      payload: {
        owner: 'runtime-live',
        summary: {
          operationKind: request.operationKind,
          reason: admission.reason,
        },
      },
    })
    return denied
  }

  const binding = bindingOf(admission.request)

  const acceptedEvent = context.ledgerStore?.recordOperationEvent({
    target: request.target,
    ...(context.attachmentId ? { attachmentId: context.attachmentId } : null),
    eventKind: 'operation.accepted',
    label: request.operationKind,
    budget: request.budget,
    binding,
    payload: {
      owner: 'runtime-live',
      summary: {
        actorId: request.actorId,
        operationKind: request.operationKind,
      },
    },
  })

  if (context.failAfterAdmission) {
    const result = failed(request, context.failAfterAdmission, binding)
    context.ledgerStore?.recordOperationEvent({
      target: request.target,
      ...(context.attachmentId ? { attachmentId: context.attachmentId } : null),
      eventKind: 'operation.failed',
      label: request.operationKind,
      budget: request.budget,
      binding,
      payload: {
        owner: 'runtime-live',
        summary: {
          operationKind: request.operationKind,
          boundedCause: context.failAfterAdmission,
        },
      },
    })
    return result
  }

  const result = (() => {
    switch (request.operationKind) {
    case 'target.discover':
      return completed(request, 'live-targets', binding)
    case 'capture.eventWindow':
      return capture(request, 'event-window', 'live-capture:event-window')
    case 'snapshot.read':
      return capture(request, 'snapshot', 'live-snapshot')
    case 'wait.condition':
      return completed(request, 'live-wait', binding)
    case 'evidence.export':
      return completed(request, 'live-evidence-package', binding)
    case 'dispatch.declaredAction':
      return completed(request, 'live-operation:dispatch.declaredAction', binding)
    case 'profile.runtimeSummary':
      return capture(request, 'profile', 'live-profile-summary')
    }
  })()

  context.ledgerStore?.recordOperationEvent({
    target: request.target,
    ...(context.attachmentId ? { attachmentId: context.attachmentId } : null),
    eventKind: request.operationKind === 'capture.eventWindow' ? 'capture.eventWindow' : 'operation.completed',
    label: request.operationKind,
    budget: request.budget,
    binding,
    ...(result.kind === 'operation.completed' && result.artifactRef ? { artifactRef: result.artifactRef } : null),
    ...(result.kind === 'live.capture' && result.artifactRef ? { artifactRef: result.artifactRef } : null),
    payload: {
      owner: 'runtime-live',
      summary: {
        operationKind: request.operationKind,
        ...(acceptedEvent ? { acceptedEventId: acceptedEvent.eventId } : null),
      },
    },
  })
  return result
}
