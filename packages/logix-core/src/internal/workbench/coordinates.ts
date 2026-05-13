import type { VerificationControlPlaneFocusRef } from '../../ControlPlane.js'
import type {
  RuntimeWorkbenchContextRef,
  RuntimeWorkbenchDebugEventRef,
  RuntimeWorkbenchSourceSpan,
} from './authority.js'

export interface RuntimeWorkbenchRuntimeCoordinate {
  readonly runtimeLabel?: string
  readonly moduleId?: string
  readonly instanceId?: string
  readonly txnSeq?: number
  readonly opSeq?: number
  readonly eventSeq?: number
  readonly timestamp?: number
}

export interface RuntimeWorkbenchSourceProjection {
  readonly id: string
  readonly derivedFrom: ReadonlyArray<{ readonly kind: string; readonly id: string }>
  readonly focusRef?: VerificationControlPlaneFocusRef
  readonly sourceDigest?: string
  readonly path?: string
  readonly span?: RuntimeWorkbenchSourceSpan
  readonly provenance: 'source-snapshot' | 'artifact' | 'report' | 'evidence' | 'debug' | 'host'
}

export const runtimeCoordinateOfDebugEvent = (
  event: RuntimeWorkbenchDebugEventRef,
): RuntimeWorkbenchRuntimeCoordinate => ({
  ...(event.runtimeLabel ? { runtimeLabel: event.runtimeLabel } : null),
  ...(event.moduleId ? { moduleId: event.moduleId } : null),
  ...(event.instanceId ? { instanceId: event.instanceId } : null),
  ...(event.txnSeq !== undefined ? { txnSeq: event.txnSeq } : null),
  ...(event.opSeq !== undefined ? { opSeq: event.opSeq } : null),
  ...(event.eventSeq !== undefined ? { eventSeq: event.eventSeq } : null),
  ...(event.timestamp !== undefined ? { timestamp: event.timestamp } : null),
})

export const hasStableRuntimeCoordinate = (coordinate: RuntimeWorkbenchRuntimeCoordinate): boolean =>
  Boolean(coordinate.runtimeLabel && coordinate.moduleId && coordinate.instanceId) &&
  (coordinate.txnSeq !== undefined || coordinate.opSeq !== undefined || coordinate.eventSeq !== undefined)

export const runtimeCoordinateId = (coordinate: RuntimeWorkbenchRuntimeCoordinate): string =>
  [
    coordinate.runtimeLabel ?? 'runtime:unknown',
    coordinate.moduleId ?? 'module:unknown',
    coordinate.instanceId ?? 'instance:unknown',
    coordinate.txnSeq !== undefined ? `txn:${coordinate.txnSeq}` : undefined,
    coordinate.opSeq !== undefined ? `op:${coordinate.opSeq}` : undefined,
    coordinate.eventSeq !== undefined ? `event:${coordinate.eventSeq}` : undefined,
  ]
    .filter(Boolean)
    .join(':')

export const sourceDigestFromContext = (
  contextRefs: ReadonlyArray<RuntimeWorkbenchContextRef> | undefined,
): string | undefined => {
  const sourceSnapshot = contextRefs?.find((ref): ref is Extract<RuntimeWorkbenchContextRef, { readonly kind: 'source-snapshot' }> =>
    ref.kind === 'source-snapshot' && typeof ref.digest === 'string' && ref.digest.length > 0
  )
  return sourceSnapshot?.digest
}

export const sourceProjectionsFromContext = (
  contextRefs: ReadonlyArray<RuntimeWorkbenchContextRef> | undefined,
): ReadonlyArray<RuntimeWorkbenchSourceProjection> =>
  (contextRefs ?? []).flatMap((ref): ReadonlyArray<RuntimeWorkbenchSourceProjection> => {
    if (ref.kind === 'source-snapshot') {
      return (ref.spans ?? []).map((span) => ({
        id: `source:${ref.digest ?? ref.projectId}:${span.path}:${span.startLine ?? 0}:${span.startColumn ?? 0}`,
        derivedFrom: [{ kind: 'context', id: `source-snapshot:${ref.projectId}` }],
        ...(ref.digest ? { sourceDigest: ref.digest } : null),
        path: span.path,
        span,
        provenance: 'source-snapshot',
      }))
    }
    if (ref.kind === 'source-locator') {
      return [
        {
          id: `source-locator:${ref.locator}`,
          derivedFrom: [{ kind: 'context', id: `source-locator:${ref.locator}` }],
          ...(ref.digest ? { sourceDigest: ref.digest } : null),
          path: ref.locator,
          provenance: ref.provenance,
        },
      ]
    }
    return []
  })
