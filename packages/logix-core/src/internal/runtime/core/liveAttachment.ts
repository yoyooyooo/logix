import { admitLiveOperation } from './liveAdmission.js'
import { makeLiveEvidenceGap, makeLiveOperationDeniedFacet } from './liveEvidence.js'
import {
  createLiveOperationLedgerStore,
  type LiveOperationLedgerStore,
} from './liveLedger.js'
import type {
  LiveAdmissionDenialReason,
  LiveAttachmentLifecycleState,
  LiveAttachmentOffer,
  LiveAttachmentState,
  LiveCapabilities,
  LiveCleanupResult,
  LiveEvidenceFacet,
  LiveOperationRequest,
  LiveRegistryDiagnostics,
  LiveTargetDescriptor,
} from './liveTypes.js'
import {
  isLiveTerminalState,
  liveTargetCoordinateKey,
  makeLiveAttachmentState,
  makeLiveTargetCoordinate,
} from './liveTypes.js'

interface RegistryEntry {
  readonly offer: LiveAttachmentOffer
  readonly state: LiveAttachmentLifecycleState
}

const staticEmptyCapabilities: LiveCapabilities = {
  enabled: false,
  canAttach: false,
  canCapture: false,
  canMutate: false,
  reason: 'bridge-disabled',
}

const enabledCapabilities: LiveCapabilities = {
  enabled: true,
  canAttach: true,
  canCapture: true,
  canMutate: true,
}

const operationIdOf = (request: LiveOperationRequest): string =>
  `live:${request.operationKind}:${liveTargetCoordinateKey(request.target)}`

export const createLiveAttachmentRegistry = (options: {
  readonly enabled: boolean
  readonly ledgerStore?: LiveOperationLedgerStore
}) => {
  const entries = new Map<string, RegistryEntry>()
  const ledgerStore = options.ledgerStore ?? createLiveOperationLedgerStore({ enabled: options.enabled })
  const diagnostics = {
    captureBufferAllocations: 0,
    transportAllocations: 0,
    operationRequests: 0,
  }

  const findEntryForTarget = (request: LiveOperationRequest): RegistryEntry | undefined => {
    const targetKey = liveTargetCoordinateKey(request.target)
    for (const entry of entries.values()) {
      if (entry.offer.targets.some((target) => liveTargetCoordinateKey(target) === targetKey)) return entry
    }
    return undefined
  }

  const deny = (request: LiveOperationRequest, reason: LiveAdmissionDenialReason) =>
    makeLiveOperationDeniedFacet({
      operationId: operationIdOf(request),
      actorId: request.actorId,
      operationKind: request.operationKind,
      target: request.target,
      reason,
      budget: request.budget,
      redactionPolicyRef: request.redactionPolicyRef,
    })

  return {
    getCapabilities: (): LiveCapabilities => (options.enabled ? enabledCapabilities : staticEmptyCapabilities),

    submitAttachmentOffer: (offer: LiveAttachmentOffer): LiveAttachmentState => {
      if (!options.enabled) return makeLiveAttachmentState({ attachmentId: offer.attachmentId, state: 'disabled' })
      const current = entries.get(offer.attachmentId)
      if (current && isLiveTerminalState(current.state)) {
        return makeLiveAttachmentState({ attachmentId: offer.attachmentId, state: current.state })
      }
      entries.set(offer.attachmentId, {
        offer: {
          ...offer,
          targets: offer.targets.map(makeLiveTargetCoordinate),
        },
        state: 'attached',
      })
      return makeLiveAttachmentState({ attachmentId: offer.attachmentId, state: 'attached' })
    },

    listTargets: (): ReadonlyArray<LiveTargetDescriptor> => {
      if (!options.enabled) return []
      return Array.from(entries.values()).flatMap((entry) => {
        if (entry.state !== 'attached') return []
        return entry.offer.targets.map((target) => ({
          ...makeLiveTargetCoordinate(target),
          attachmentId: entry.offer.attachmentId,
          adapterKind: entry.offer.adapterKind,
          ...(entry.offer.hostCoordinate ? { hostCoordinate: entry.offer.hostCoordinate } : null),
          ...(entry.offer.transport ? { transport: entry.offer.transport } : null),
        }))
      })
    },

    discoverTargets: (): ReadonlyArray<LiveTargetDescriptor> | ReturnType<typeof makeLiveEvidenceGap> => {
      const targets = Array.from(entries.values()).flatMap((entry) => {
        if (entry.state !== 'attached') return []
        return entry.offer.targets
      })
      if (targets.length === 0) {
        return makeLiveEvidenceGap({
          gapId: 'live:no-runtime-attached',
          code: 'no-runtime-attached',
          summary: 'No live runtime target is attached.',
          severity: 'warning',
        })
      }
      return Array.from(entries.values()).flatMap((entry) => {
        if (entry.state !== 'attached') return []
        return entry.offer.targets.map((target) => ({
          ...makeLiveTargetCoordinate(target),
          attachmentId: entry.offer.attachmentId,
          adapterKind: entry.offer.adapterKind,
          ...(entry.offer.hostCoordinate ? { hostCoordinate: entry.offer.hostCoordinate } : null),
          ...(entry.offer.transport ? { transport: entry.offer.transport } : null),
        }))
      })
    },

    getAttachmentState: (attachmentId: string): LiveAttachmentState | undefined => {
      const entry = entries.get(attachmentId)
      if (!entry) return undefined
      return makeLiveAttachmentState({ attachmentId, state: entry.state })
    },

    markTerminal: (
      attachmentId: string,
      state: Extract<LiveAttachmentLifecycleState, 'revoked' | 'disconnected' | 'target-unavailable' | 'cleaned'>,
    ): LiveAttachmentState => {
      const current = entries.get(attachmentId)
      if (current) {
        entries.set(attachmentId, { ...current, state })
      } else {
        entries.set(attachmentId, {
          offer: { attachmentId, adapterKind: 'test', targets: [] },
          state,
        })
      }
      return makeLiveAttachmentState({ attachmentId, state })
    },

    cleanup: (attachmentId: string): LiveCleanupResult => {
      const current = entries.get(attachmentId)
      const drainedEvidenceRefs = current?.offer.pendingEvidenceRefs
      const targets = current?.offer.targets ?? []
      ledgerStore.cleanupAttachment(attachmentId, targets, 'cleanup.target-terminal')
      if (current) {
        entries.set(attachmentId, { ...current, state: 'cleaned' })
      } else {
        entries.set(attachmentId, {
          offer: { attachmentId, adapterKind: 'test', targets: [] },
          state: 'cleaned',
        })
      }
      return {
        attachmentId,
        state: 'cleaned',
        ...(drainedEvidenceRefs && drainedEvidenceRefs.length > 0
          ? { drainedEvidenceRefs }
          : targets.length > 0
            ? { dropped: { reason: 'cleanup.target-terminal' } }
            : { degraded: { reason: 'no-pending-evidence' } }),
      }
    },

    requestOperation: (request: LiveOperationRequest): LiveEvidenceFacet => {
      diagnostics.operationRequests += 1
      if (!options.enabled) return deny(request, 'bridge-disabled')
      const entry = findEntryForTarget(request)
      if (!entry || isLiveTerminalState(entry.state)) return deny(request, 'terminal-attachment')
      const admission = admitLiveOperation(request, {
        authorizedTargets: entry.offer.targets,
      })
      if (!admission.ok) {
        const denied = deny(request, admission.reason)
        ledgerStore.recordOperationEvent({
          target: request.target,
          attachmentId: entry.offer.attachmentId,
          eventKind: 'operation.denied',
          label: denied.reason,
          budget: request.budget,
          binding: admission.binding,
          payload: {
            owner: 'runtime-live',
            summary: {
              operationKind: request.operationKind,
              reason: denied.reason,
            },
          },
        })
        return denied
      }
      const accepted: LiveEvidenceFacet = {
        kind: 'operation.accepted',
        operationId: operationIdOf(request),
        actorId: request.actorId,
        operationKind: request.operationKind,
        target: makeLiveTargetCoordinate(request.target),
        stageClass: 'drilldown-only',
      }
      ledgerStore.recordOperationEvent({
        target: request.target,
        attachmentId: entry.offer.attachmentId,
        eventKind: 'operation.accepted',
        label: request.operationKind,
        budget: request.budget,
        payload: {
          owner: 'runtime-live',
          summary: {
            actorId: request.actorId,
            operationKind: request.operationKind,
          },
        },
      })
      return accepted
    },

    openCaptureWindow: (request: LiveOperationRequest): LiveEvidenceFacet => {
      diagnostics.operationRequests += 1
      if (!options.enabled) {
        return makeLiveEvidenceGap({
          gapId: 'live:capture-disabled',
          code: 'bridge-disabled',
          summary: 'Live bridge is disabled.',
          severity: 'info',
          target: request.target,
        })
      }
      diagnostics.captureBufferAllocations += 1
      const entry = findEntryForTarget(request)
      ledgerStore.recordOperationEvent({
        target: request.target,
        ...(entry ? { attachmentId: entry.offer.attachmentId } : null),
        eventKind: 'capture.eventWindow',
        label: 'capture.eventWindow',
        budget: request.budget,
        artifactRef: {
          outputKey: 'live-operation-window',
          kind: 'LiveOperationWindow',
        },
      })
      return {
        kind: 'live.capture',
        captureId: operationIdOf(request),
        captureKind: 'event-window',
        target: makeLiveTargetCoordinate(request.target),
        stageClass: 'drilldown-only',
        budget: request.budget,
        artifactRef: {
          outputKey: 'live-operation-window',
          kind: 'LiveOperationWindow',
        },
      }
    },

    getDiagnostics: (): LiveRegistryDiagnostics => ({ ...diagnostics }),
  }
}
