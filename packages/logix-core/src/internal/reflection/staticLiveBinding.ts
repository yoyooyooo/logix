import type { ReflectedActionDescriptor, RuntimeReflectionManifest } from './programManifest.js'

export interface StaticLiveBindingRequest {
  readonly manifestDigest?: string
  readonly actionTag?: string
  readonly payloadSchemaRef?: string
  readonly validatorAvailable?: boolean
}

export interface StaticLiveBindingHeader {
  readonly manifestDigest?: string
  readonly actionTag?: string
  readonly payloadSchemaRef?: string
  readonly validatorAvailable?: boolean
  readonly bindingStatus: 'matched' | 'missing' | 'mismatch' | 'stale' | 'unknown'
}

export type StaticLiveBindingDenialReason =
  | 'missing-live-manifest-binding'
  | 'unknown-live-manifest-binding'
  | 'stale-manifest'
  | 'digest-mismatch'
  | 'payload-schema-digest-mismatch'
  | 'unavailable-action-contract'
  | 'missing-validator'

export type StaticLiveBindingResult =
  | {
      readonly ok: true
      readonly binding: StaticLiveBindingHeader
    }
  | {
      readonly ok: false
      readonly reason: StaticLiveBindingDenialReason
      readonly binding: StaticLiveBindingHeader
    }

export interface CheckStaticLiveBindingInput {
  readonly manifest?: RuntimeReflectionManifest
  readonly actionIndex?: StaticLiveBindingIndex
  readonly request: StaticLiveBindingRequest
  readonly requireAction?: boolean
  readonly staleManifestDigests?: ReadonlyArray<string>
}

export interface StaticLiveBindingIndexDiagnostics {
  readonly manifestDigest: string
  readonly actionCount: number
  readonly indexedActionCount: number
  readonly actionLookupCount: number
  readonly linearScanCount: number
  readonly projectionRowAllocationCount: number
  readonly disposed: boolean
}

export interface StaticLiveBindingIndex {
  readonly manifestDigest: string
  readonly getAction: (actionTag: string) => ReflectedActionDescriptor | undefined
  readonly listActions: (
    options?: { readonly maxActions?: number },
  ) => {
    readonly actions: ReadonlyArray<ReflectedActionDescriptor>
    readonly truncated: boolean
    readonly originalActionCount: number
  }
  readonly recordProjectionRowAllocation: (count: number) => void
  readonly dispose: () => void
  readonly getDiagnostics: () => StaticLiveBindingIndexDiagnostics
}

export const createStaticLiveBindingIndex = (manifest: RuntimeReflectionManifest): StaticLiveBindingIndex => {
  const actionsByTag = new Map<string, ReflectedActionDescriptor>()
  for (const action of manifest.actions) {
    actionsByTag.set(action.actionTag, action)
  }
  let actionLookupCount = 0
  let projectionRowAllocationCount = 0
  let disposed = false

  return {
    manifestDigest: manifest.digest,
    getAction: (actionTag) => {
      actionLookupCount += 1
      if (disposed) return undefined
      return actionsByTag.get(actionTag)
    },
    listActions: (options = {}) => {
      if (disposed) {
        return { actions: [], truncated: false, originalActionCount: 0 }
      }
      const maxActions =
        typeof options.maxActions === 'number' && Number.isFinite(options.maxActions) && options.maxActions >= 0
          ? Math.floor(options.maxActions)
          : undefined
      if (maxActions === undefined || manifest.actions.length <= maxActions) {
        return {
          actions: manifest.actions,
          truncated: false,
          originalActionCount: manifest.actions.length,
        }
      }
      return {
        actions: manifest.actions.slice(0, maxActions),
        truncated: true,
        originalActionCount: manifest.actions.length,
      }
    },
    recordProjectionRowAllocation: (count) => {
      if (disposed) return
      projectionRowAllocationCount += Math.max(0, Math.floor(count))
    },
    dispose: () => {
      disposed = true
      actionsByTag.clear()
    },
    getDiagnostics: () => ({
      manifestDigest: manifest.digest,
      actionCount: manifest.actions.length,
      indexedActionCount: disposed ? 0 : actionsByTag.size,
      actionLookupCount,
      linearScanCount: 0,
      projectionRowAllocationCount,
      disposed,
    }),
  }
}

const makeBaseBinding = (
  request: StaticLiveBindingRequest,
  manifest: RuntimeReflectionManifest | undefined,
): Omit<StaticLiveBindingHeader, 'bindingStatus'> => {
  const manifestDigest = request.manifestDigest ?? manifest?.digest
  return {
    ...(manifestDigest ? { manifestDigest } : null),
    ...(request.actionTag ? { actionTag: request.actionTag } : null),
    ...(request.payloadSchemaRef ? { payloadSchemaRef: request.payloadSchemaRef } : null),
    ...(request.validatorAvailable !== undefined ? { validatorAvailable: request.validatorAvailable } : null),
  }
}

const denied = (
  reason: StaticLiveBindingDenialReason,
  binding: StaticLiveBindingHeader,
): StaticLiveBindingResult => ({
  ok: false,
  reason,
  binding,
})

export const checkStaticLiveBinding = (input: CheckStaticLiveBindingInput): StaticLiveBindingResult => {
  const { manifest, request } = input
  const base = makeBaseBinding(request, manifest)

  if (request.manifestDigest && input.staleManifestDigests?.includes(request.manifestDigest)) {
    return denied('stale-manifest', { ...base, bindingStatus: 'stale' })
  }

  if (!manifest) {
    return denied('missing-live-manifest-binding', { ...base, bindingStatus: 'missing' })
  }

  if (request.manifestDigest && request.manifestDigest !== manifest.digest) {
    return denied('digest-mismatch', { ...base, bindingStatus: 'mismatch' })
  }

  if (!request.actionTag) {
    if (input.requireAction) {
      return denied('unavailable-action-contract', {
        ...base,
        manifestDigest: request.manifestDigest ?? manifest.digest,
        bindingStatus: 'unknown',
      })
    }
    return {
      ok: true,
      binding: {
        ...base,
        manifestDigest: request.manifestDigest ?? manifest.digest,
        bindingStatus: 'matched',
      },
    }
  }

  const actionIndex =
    input.actionIndex && input.actionIndex.manifestDigest === manifest.digest
      ? input.actionIndex
      : createStaticLiveBindingIndex(manifest)
  const action = actionIndex.getAction(request.actionTag)
  if (!action) {
    return denied('unavailable-action-contract', {
      ...base,
      manifestDigest: request.manifestDigest ?? manifest.digest,
      actionTag: request.actionTag,
      bindingStatus: 'missing',
    })
  }

  const schemaDigest = action.payload.schemaDigest
  const payloadSchemaRef = request.payloadSchemaRef ?? schemaDigest
  const validatorAvailable = request.validatorAvailable ?? action.payload.validatorAvailable
  if (schemaDigest && request.payloadSchemaRef && request.payloadSchemaRef !== schemaDigest) {
    return denied('payload-schema-digest-mismatch', {
      manifestDigest: request.manifestDigest ?? manifest.digest,
      actionTag: action.actionTag,
      payloadSchemaRef: schemaDigest,
      validatorAvailable,
      bindingStatus: 'mismatch',
    })
  }

  if (schemaDigest && validatorAvailable !== true) {
    return denied('missing-validator', {
      manifestDigest: request.manifestDigest ?? manifest.digest,
      actionTag: action.actionTag,
      payloadSchemaRef,
      validatorAvailable,
      bindingStatus: 'matched',
    })
  }

  return {
    ok: true,
    binding: {
      manifestDigest: request.manifestDigest ?? manifest.digest,
      actionTag: action.actionTag,
      ...(payloadSchemaRef ? { payloadSchemaRef } : null),
      validatorAvailable,
      bindingStatus: 'matched',
    },
  }
}
