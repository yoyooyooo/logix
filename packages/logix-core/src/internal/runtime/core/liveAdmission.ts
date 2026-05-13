import type {
  LiveAdmissionDenialReason,
  LiveBindingHeader,
  LiveOperationRequest,
  LiveTargetCoordinate,
} from './liveTypes.js'
import { liveTargetCoordinateKey } from './liveTypes.js'
import type { RuntimeReflectionManifest } from '../../reflection/programManifest.js'
import { checkStaticLiveBinding, type StaticLiveBindingIndex } from '../../reflection/staticLiveBinding.js'

export type LiveAdmissionResult =
  | {
      readonly ok: true
      readonly kind: 'operation.accepted'
      readonly request: LiveOperationRequest
    }
  | {
      readonly ok: false
      readonly kind: 'operation.denied'
      readonly reason: LiveAdmissionDenialReason
      readonly noMutation: true
      readonly request: LiveOperationRequest
      readonly binding?: LiveBindingHeader
    }

export interface LiveAdmissionContext {
  readonly authorizedTargets?: ReadonlyArray<LiveTargetCoordinate>
  readonly staleManifestDigests?: ReadonlyArray<string>
  readonly reflectionManifest?: RuntimeReflectionManifest
  readonly actionIndex?: StaticLiveBindingIndex
}

const denied = (
  request: LiveOperationRequest,
  reason: LiveAdmissionDenialReason,
  binding?: LiveBindingHeader,
): LiveAdmissionResult => ({
  ok: false,
  kind: 'operation.denied',
  reason,
  noMutation: true,
  request,
  ...(binding ? { binding } : null),
})

const isTargetAuthorized = (request: LiveOperationRequest, context: LiveAdmissionContext): boolean => {
  if (!context.authorizedTargets) return true
  const requestKey = liveTargetCoordinateKey(request.target)
  return context.authorizedTargets.some((target) => liveTargetCoordinateKey(target) === requestKey)
}

export const admitLiveOperation = (
  request: LiveOperationRequest,
  context: LiveAdmissionContext = {},
): LiveAdmissionResult => {
  if (!isTargetAuthorized(request, context)) return denied(request, 'unauthorized-target')

  if (request.operationKind !== 'dispatch.declaredAction') {
    return { ok: true, kind: 'operation.accepted', request }
  }

  const binding = checkStaticLiveBinding({
    manifest: context.reflectionManifest,
    actionIndex: context.actionIndex,
    request,
    requireAction: true,
    staleManifestDigests: context.staleManifestDigests,
  })
  if (!binding.ok) return denied(request, binding.reason, binding.binding)
  return { ok: true, kind: 'operation.accepted', request: { ...request, ...binding.binding } }
}
