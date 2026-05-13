import type {
  LiveAdapterKind,
  LiveAttachmentOffer,
  LiveTargetCoordinate,
} from '../runtime/core/liveTypes.js'
import { makeLiveTargetCoordinate } from '../runtime/core/liveTypes.js'

export interface LiveAdapterOfferInput {
  readonly attachmentId: string
  readonly adapterKind: LiveAdapterKind
  readonly targets: ReadonlyArray<LiveTargetCoordinate>
  readonly capabilityLeaseId?: string
  readonly pendingEvidenceRefs?: ReadonlyArray<string>
}

export interface LiveSelectionCoordinateHandoff {
  readonly target: LiveTargetCoordinate
  readonly selectionId?: string
  readonly artifactOutputKey?: string
}

export const makeLiveAdapterOffer = (input: LiveAdapterOfferInput): LiveAttachmentOffer => ({
  attachmentId: input.attachmentId.trim() || 'unknown-attachment',
  adapterKind: input.adapterKind,
  targets: input.targets.map(makeLiveTargetCoordinate),
  ...(input.capabilityLeaseId ? { capabilityLeaseId: input.capabilityLeaseId } : null),
  ...(input.pendingEvidenceRefs ? { pendingEvidenceRefs: input.pendingEvidenceRefs } : null),
})

export const makeLiveSelectionCoordinateHandoff = (
  input: LiveSelectionCoordinateHandoff,
): LiveSelectionCoordinateHandoff => ({
  target: makeLiveTargetCoordinate(input.target),
  ...(input.selectionId ? { selectionId: input.selectionId } : null),
  ...(input.artifactOutputKey ? { artifactOutputKey: input.artifactOutputKey } : null),
})
