import type { LiveAttachmentOffer, LiveEvidenceFacet, LiveTargetDescriptor } from './liveTypes.js'

export type LiveWireRole = 'browser' | 'cli' | 'daemon'

export type LiveWireMessageType =
  | 'host.offer'
  | 'host.disconnect'
  | 'live.targets.request'
  | 'live.targets.response'
  | 'live.operation.request'
  | 'live.operation.response'
  | 'live.evidence.export.request'
  | 'live.evidence.export.response'
  | 'live.status.request'
  | 'live.status.response'
  | 'live.error'

export interface LiveWireEnvelope<TPayload = unknown> {
  readonly schemaVersion: 1
  readonly id: string
  readonly role: LiveWireRole
  readonly type: LiveWireMessageType
  readonly payload: TPayload
}

export interface LiveWireHostOfferPayload extends LiveAttachmentOffer {}

export interface LiveWireTargetsPayload {
  readonly targets: ReadonlyArray<LiveTargetDescriptor>
}

export interface LiveWireEvidencePayload {
  readonly facets: ReadonlyArray<LiveEvidenceFacet>
}

export interface LiveWireOperationRequestPayload {
  readonly requestId: string
  readonly attachmentId: string
  readonly operation: 'snapshot.read'
  readonly target?: LiveTargetDescriptor
}

export interface LiveWireOperationResponsePayload {
  readonly requestId: string
  readonly attachmentId: string
  readonly ok: boolean
  readonly artifact?:
    | {
        readonly outputKey: string
        readonly kind: 'LiveCapture'
        readonly value: LiveEvidenceFacet
      }
    | undefined
  readonly gap?: LiveEvidenceFacet
}

const roles = new Set<LiveWireRole>(['browser', 'cli', 'daemon'])
const messageTypes = new Set<LiveWireMessageType>([
  'host.offer',
  'host.disconnect',
  'live.targets.request',
  'live.targets.response',
  'live.operation.request',
  'live.operation.response',
  'live.evidence.export.request',
  'live.evidence.export.response',
  'live.status.request',
  'live.status.response',
  'live.error',
])
const forbiddenRootFields = new Set(['repairHints', 'nextRecommendedStage', 'verdict', 'primaryReportOutputKey'])

const isRecord = (value: unknown): value is Record<PropertyKey, unknown> =>
  typeof value === 'object' && value !== null

export const makeLiveWireEnvelope = <TPayload>(input: {
  readonly id: string
  readonly role: LiveWireRole
  readonly type: LiveWireMessageType
  readonly payload: TPayload
}): LiveWireEnvelope<TPayload> => ({
  schemaVersion: 1,
  id: input.id,
  role: input.role,
  type: input.type,
  payload: input.payload,
})

export const isLiveWireEnvelope = (value: unknown): value is LiveWireEnvelope => {
  if (!isRecord(value)) return false
  for (const field of forbiddenRootFields) {
    if (field in value) return false
  }
  return (
    value.schemaVersion === 1 &&
    typeof value.id === 'string' &&
    roles.has(value.role as LiveWireRole) &&
    messageTypes.has(value.type as LiveWireMessageType) &&
    'payload' in value
  )
}
