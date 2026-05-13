import type { VerificationControlPlaneArtifactRef } from '../../../ControlPlane.js'
import { fnv1a32, stableStringify } from '../../digest.js'
import type { JsonValue } from '../../protocol/jsonValue.js'
import { projectJsonValue } from '../../protocol/jsonValue.js'
import type { RuntimeReflectionManifest } from '../../reflection/programManifest.js'
import {
  checkStaticLiveBinding,
  createStaticLiveBindingIndex,
  type StaticLiveBindingIndex,
} from '../../reflection/staticLiveBinding.js'
import type {
  LiveBudgetProfile,
  LiveDegradedMarker,
  LiveEvidenceGap,
  LiveRedactionMarker,
  LiveTargetCoordinate,
  LiveTargetDescriptor,
} from './liveTypes.js'
import { liveTargetCoordinateKey, makeLiveTargetCoordinate } from './liveTypes.js'
import { makeLiveEvidenceGap } from './liveEvidence.js'
import type { LiveOperationWindow } from './liveLedger.js'

export type LiveInspectSection =
  | 'target-detail'
  | 'state'
  | 'state-path'
  | 'actions'
  | 'events'
  | 'timeline'
  | 'fields'
  | 'field-graph'
  | 'field-summary'
  | 'summary'
  | 'snapshot'
  | 'react-host'

export type LiveInspectSourceAuthority =
  | 'runtime-live'
  | 'reflection'
  | 'field-runtime'
  | 'react-host'
  | 'evidence'

export interface LiveInspectFacetPayloadBase {
  readonly schemaVersion: 'live-inspect.v1'
  readonly generatedBy: string
}

export interface LiveStructuredEvidenceGap extends LiveEvidenceGap {
  readonly owner:
    | '171-live-attachment'
    | 'runtime-live'
    | 'reflection'
    | 'field-runtime'
    | 'evidence'
    | 'future-react-host'
    | 'future-profile-owner'
  readonly reopenBar: string
}

export interface LiveInspectFacetEnvelope<View extends LiveInspectSection = LiveInspectSection> {
  readonly kind: 'live.inspect.facet'
  readonly view: View
  readonly target: LiveTargetDescriptor
  readonly sourceAuthority: LiveInspectSourceAuthority
  readonly producer: string
  readonly payload?: JsonValue
  readonly artifactRef?: VerificationControlPlaneArtifactRef
  readonly budget: LiveBudgetProfile
  readonly gaps: ReadonlyArray<LiveStructuredEvidenceGap>
  readonly degraded?: LiveDegradedMarker
  readonly redacted?: ReadonlyArray<LiveRedactionMarker>
}

export interface LiveInspectArtifact<View extends LiveInspectSection = LiveInspectSection> {
  readonly kind: 'live.inspect.artifact'
  readonly section: View
  readonly facet: LiveInspectFacetEnvelope<View>
  readonly artifactRef?: VerificationControlPlaneArtifactRef
}

export interface LiveManifestBindingRef {
  readonly bindingId: string
  readonly target: LiveTargetDescriptor
  readonly manifestDigest: string
  readonly bindingStatus: 'matched' | 'missing' | 'mismatch' | 'stale' | 'unknown'
  readonly sourceAuthority: 'reflection'
  readonly programDigest?: string
  readonly moduleDigest?: string
  readonly actionManifestRef?: VerificationControlPlaneArtifactRef
  readonly validatorDigest?: string
}

const defaultBudget: LiveBudgetProfile = { maxEvents: 16, maxInlineBytes: 4096 }

const cloneTarget = (target: LiveTargetDescriptor): LiveTargetDescriptor => ({
  ...makeLiveTargetCoordinate(target),
  attachmentId: target.attachmentId,
  adapterKind: target.adapterKind,
  ...(target.hostCoordinate ? { hostCoordinate: target.hostCoordinate } : null),
  ...(target.transport ? { transport: target.transport } : null),
})

const digestJson = (prefix: string, value: unknown): string => `${prefix}:${fnv1a32(stableStringify(value))}`

const jsonSize = (value: unknown): number => {
  try {
    return JSON.stringify(value).length
  } catch {
    return 0
  }
}

export const makeLiveInspectGap = (input: {
  readonly gapId: string
  readonly code: string
  readonly summary: string
  readonly severity?: 'info' | 'warning' | 'error'
  readonly target?: LiveTargetCoordinate
  readonly owner: LiveStructuredEvidenceGap['owner']
  readonly reopenBar: string
}): LiveStructuredEvidenceGap => ({
  ...makeLiveEvidenceGap({
    gapId: input.gapId,
    code: input.code,
    summary: input.summary,
    severity: input.severity ?? 'info',
    target: input.target,
  }),
  owner: input.owner,
  reopenBar: input.reopenBar,
})

export const makeLiveTimelineContinuationGap = (input: {
  readonly code:
    | 'timeline-cursor-mismatch'
    | 'timeline-cursor-expired'
    | 'timeline-retention-gap'
    | 'timeline-watermark-incomparable'
    | 'timeline-retained-segment-missing'
  readonly target: LiveTargetCoordinate
  readonly attachmentId?: string
}): LiveStructuredEvidenceGap => {
  const target = makeLiveTargetCoordinate(input.target)
  const owner =
    input.code === 'timeline-retained-segment-missing'
      ? 'evidence'
      : 'runtime-live'
  const reopenBar =
    input.code === 'timeline-cursor-mismatch'
      ? 'reopen only if timeline cursor query identity law changes'
      : input.code === 'timeline-cursor-expired'
        ? 'reopen only if timeline cursor retention law changes'
        : input.code === 'timeline-retention-gap'
          ? 'reopen only if runtime-live ledger retention law changes'
          : input.code === 'timeline-watermark-incomparable'
            ? 'reopen only if runtime-live watermark comparison law changes'
            : 'reopen only if daemon retained owner segment lifecycle law changes'

  return makeLiveInspectGap({
    gapId: `live:timeline:${input.code}:${liveTargetCoordinateKey(target)}`,
    code: input.code,
    summary:
      input.code === 'timeline-cursor-mismatch'
        ? 'Timeline cursor does not match the current query fingerprint.'
        : input.code === 'timeline-cursor-expired'
          ? 'Timeline cursor has expired.'
          : input.code === 'timeline-retention-gap'
            ? 'Timeline continuation cannot be proven across the available retention boundary.'
            : input.code === 'timeline-watermark-incomparable'
              ? 'Timeline cursor watermark is incomparable with the available source segment chain.'
              : 'Retained owner segment is missing for this continuation.',
    severity: 'warning',
    target,
    owner,
    reopenBar,
  })
}

export const makeLiveInspectFacet = <View extends LiveInspectSection>(input: {
  readonly section: View
  readonly target: LiveTargetDescriptor
  readonly sourceAuthority: LiveInspectSourceAuthority
  readonly producer: string
  readonly payload?: unknown
  readonly artifactRef?: VerificationControlPlaneArtifactRef
  readonly budget?: LiveBudgetProfile
  readonly projectionMaxDepth?: number
  readonly projectionMaxJsonBytes?: number
  readonly projectionMaxStringLength?: number
  readonly gaps?: ReadonlyArray<LiveStructuredEvidenceGap>
  readonly degraded?: LiveDegradedMarker
  readonly redacted?: ReadonlyArray<LiveRedactionMarker>
}): LiveInspectFacetEnvelope<View> => {
  const gaps = input.gaps ?? []
  if (input.payload === undefined && gaps.length === 0) {
    throw new Error('[Logix][LiveInspect] payload-less inspect facet must include at least one structured gap')
  }

  const budget = input.budget ?? defaultBudget
  const projected = input.payload === undefined
    ? undefined
    : projectJsonValue(input.payload, {
        maxJsonBytes: budget.maxInlineBytes,
        ...(input.projectionMaxJsonBytes !== undefined ? { maxJsonBytes: input.projectionMaxJsonBytes } : null),
        ...(input.projectionMaxDepth !== undefined ? { maxDepth: input.projectionMaxDepth } : null),
        ...(input.projectionMaxStringLength !== undefined ? { maxStringLength: input.projectionMaxStringLength } : null),
      })
  const degraded = input.degraded ?? (projected?.downgrade ? { reason: projected.downgrade } : undefined)

  return {
    kind: 'live.inspect.facet',
    view: input.section,
    target: cloneTarget(input.target),
    sourceAuthority: input.sourceAuthority,
    producer: input.producer,
    ...(projected ? { payload: projected.value } : null),
    ...(input.artifactRef ? { artifactRef: input.artifactRef } : null),
    budget,
    gaps,
    ...(degraded ? { degraded } : null),
    ...(input.redacted ? { redacted: input.redacted } : null),
  }
}

export const makeLiveInspectArtifact = <View extends LiveInspectSection>(input: {
  readonly section: View
  readonly target: LiveTargetDescriptor
  readonly sourceAuthority: LiveInspectSourceAuthority
  readonly producer: string
  readonly payload?: unknown
  readonly artifactRef?: VerificationControlPlaneArtifactRef
  readonly budget?: LiveBudgetProfile
  readonly projectionMaxDepth?: number
  readonly projectionMaxJsonBytes?: number
  readonly projectionMaxStringLength?: number
  readonly gaps?: ReadonlyArray<LiveStructuredEvidenceGap>
  readonly degraded?: LiveDegradedMarker
  readonly redacted?: ReadonlyArray<LiveRedactionMarker>
}): LiveInspectArtifact<View> => {
  const facet = makeLiveInspectFacet(input)
  return {
    kind: 'live.inspect.artifact',
    section: input.section,
    facet,
    ...(input.artifactRef ? { artifactRef: input.artifactRef } : null),
  }
}

export const makeLiveTargetDetailInspectArtifact = (input: {
  readonly target: LiveTargetDescriptor
  readonly producer: string
  readonly availableSections: ReadonlyArray<LiveInspectSection>
  readonly hostContext?: { readonly hostKind: string; readonly url?: string; readonly environmentFingerprintRef?: string }
  readonly manifestDigest?: string
  readonly budget?: LiveBudgetProfile
  readonly gaps?: ReadonlyArray<LiveStructuredEvidenceGap>
}): LiveInspectArtifact<'target-detail'> =>
  makeLiveInspectArtifact({
    section: 'target-detail',
    target: input.target,
    sourceAuthority: 'runtime-live',
    producer: input.producer,
    budget: input.budget,
    gaps: input.gaps,
    payload: {
      schemaVersion: 'live-inspect.v1',
      generatedBy: input.producer,
      target: cloneTarget(input.target),
      ...(input.hostContext ? { hostContext: input.hostContext } : null),
      ...(input.manifestDigest ? { manifestDigest: input.manifestDigest } : null),
      availableSections: input.availableSections,
    } satisfies LiveInspectFacetPayloadBase & Record<string, unknown>,
  })

const readDotPath = (
  value: unknown,
  path: string,
): { readonly exists: true; readonly value: unknown } | { readonly exists: false } => {
  if (path === '$root' || path.trim() === '') return { exists: true, value }
  const segments = path.split('.').filter((segment) => segment.length > 0)
  let current = value
  for (const segment of segments) {
    if (typeof current !== 'object' || current === null) return { exists: false }
    if (!Object.prototype.hasOwnProperty.call(current, segment)) return { exists: false }
    current = (current as Record<string, unknown>)[segment]
  }
  return { exists: true, value: current }
}

const valueKindOf = (value: unknown): 'primitive' | 'object' | 'array' | 'null' => {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'object'
  return 'primitive'
}

export const makeLiveStateInspectArtifact = (input: {
  readonly target: LiveTargetDescriptor
  readonly producer: string
  readonly state: unknown
  readonly path?: string
  readonly budget?: LiveBudgetProfile
}): LiveInspectArtifact<'state' | 'state-path'> => {
  const budget = input.budget ?? defaultBudget
  if (input.path !== undefined) {
    const found = readDotPath(input.state, input.path)
    if (!found.exists) {
      return makeLiveInspectArtifact({
        section: 'state-path',
        target: input.target,
        sourceAuthority: 'runtime-live',
        producer: input.producer,
        budget,
        gaps: [
          makeLiveInspectGap({
            gapId: `live:state-path:${digestJson('path', { target: input.target, path: input.path })}`,
            code: 'missing-state-path',
            summary: `State path is not present: ${input.path}`,
            severity: 'warning',
            target: input.target,
            owner: 'runtime-live',
            reopenBar: 'reopen only if path syntax changes',
          }),
        ],
      })
    }

    const projected = projectJsonValue(found.value, { maxJsonBytes: budget.maxInlineBytes })
    return makeLiveInspectArtifact({
      section: 'state-path',
      target: input.target,
      sourceAuthority: 'runtime-live',
      producer: input.producer,
      budget,
      degraded: projected.downgrade ? { reason: projected.downgrade } : undefined,
      payload: {
        schemaVersion: 'live-inspect.v1',
        generatedBy: input.producer,
        path: input.path,
        exists: true,
        valueDigest: digestJson('state-path', projected.value),
        valuePreview: projected.value,
        valueKind: valueKindOf(found.value),
      } satisfies LiveInspectFacetPayloadBase & Record<string, unknown>,
    })
  }

  const projected = projectJsonValue(input.state, { maxJsonBytes: budget.maxInlineBytes })
  return makeLiveInspectArtifact({
    section: 'state',
    target: input.target,
    sourceAuthority: 'runtime-live',
    producer: input.producer,
    budget,
    degraded: projected.downgrade ? { reason: projected.downgrade } : undefined,
    payload: {
      schemaVersion: 'live-inspect.v1',
      generatedBy: input.producer,
      digest: digestJson('state', projected.value),
      preview: projected.value,
      sizeBytes: jsonSize(projected.value),
      truncated: projected.downgrade === 'oversized',
    } satisfies LiveInspectFacetPayloadBase & Record<string, unknown>,
  })
}

export const makeLiveManifestBindingRef = (input: {
  readonly target: LiveTargetDescriptor
  readonly manifestDigest?: string
  readonly bindingStatus?: LiveManifestBindingRef['bindingStatus']
  readonly programDigest?: string
  readonly moduleDigest?: string
  readonly actionManifestRef?: VerificationControlPlaneArtifactRef
  readonly validatorDigest?: string
}): LiveManifestBindingRef => {
  const manifestDigest = input.manifestDigest ?? 'manifest:unknown'
  return {
    bindingId: digestJson('live-binding', {
      target: input.target,
      manifestDigest,
      bindingStatus: input.bindingStatus ?? 'unknown',
    }),
    target: cloneTarget(input.target),
    manifestDigest,
    bindingStatus: input.bindingStatus ?? 'unknown',
    sourceAuthority: 'reflection',
    ...(input.programDigest ? { programDigest: input.programDigest } : null),
    ...(input.moduleDigest ? { moduleDigest: input.moduleDigest } : null),
    ...(input.actionManifestRef ? { actionManifestRef: input.actionManifestRef } : null),
    ...(input.validatorDigest ? { validatorDigest: input.validatorDigest } : null),
  }
}

export const makeLiveActionsInspectArtifact = (input: {
  readonly target: LiveTargetDescriptor
  readonly producer: string
  readonly actions: ReadonlyArray<{
    readonly actionTag: string
    readonly payloadKind?: 'void' | 'nonVoid' | 'unknown'
    readonly payloadSummary?: string
    readonly schemaDigest?: string
    readonly validatorAvailable?: boolean
    readonly bindingStatus?: LiveManifestBindingRef['bindingStatus']
  }>
  readonly binding?: LiveManifestBindingRef
  readonly budget?: LiveBudgetProfile
  readonly gaps?: ReadonlyArray<LiveStructuredEvidenceGap>
  readonly degraded?: LiveDegradedMarker
}): LiveInspectArtifact<'actions'> => {
  const binding = input.binding ?? makeLiveManifestBindingRef({ target: input.target })
  return makeLiveInspectArtifact({
    section: 'actions',
    target: input.target,
    sourceAuthority: 'reflection',
    producer: input.producer,
    budget: input.budget,
    gaps: input.gaps,
    degraded: input.degraded,
    payload: {
      schemaVersion: 'live-inspect.v1',
      generatedBy: input.producer,
      binding,
      actions: input.actions.map((action) => ({
        actionTag: action.actionTag,
        payloadKind: action.payloadKind ?? 'unknown',
        ...(action.payloadSummary ? { payloadSummary: action.payloadSummary } : null),
        ...(action.schemaDigest ? { schemaDigest: action.schemaDigest } : null),
        ...(action.validatorAvailable !== undefined ? { validatorAvailable: action.validatorAvailable } : null),
        bindingStatus: action.bindingStatus ?? binding.bindingStatus,
      })),
    } satisfies LiveInspectFacetPayloadBase & Record<string, unknown>,
  })
}

export const createLiveActionsProjection = (input: {
  readonly target: LiveTargetDescriptor
  readonly producer: string
  readonly manifest: RuntimeReflectionManifest
  readonly actionIndex?: StaticLiveBindingIndex
  readonly maxActions?: number
  readonly budget?: LiveBudgetProfile
}): LiveInspectArtifact<'actions'> => {
  const actionIndex =
    input.actionIndex && input.actionIndex.manifestDigest === input.manifest.digest
      ? input.actionIndex
      : createStaticLiveBindingIndex(input.manifest)
  const binding = checkStaticLiveBinding({
    manifest: input.manifest,
    actionIndex,
    request: {
      manifestDigest: input.manifest.digest,
    },
  })
  const listed = actionIndex.listActions({ maxActions: input.maxActions })
  actionIndex.recordProjectionRowAllocation(listed.actions.length)
  const bindingRef = makeLiveManifestBindingRef({
    target: input.target,
    manifestDigest: input.manifest.digest,
    bindingStatus: binding.ok ? 'matched' : binding.binding.bindingStatus,
    actionManifestRef: {
      outputKey: 'runtime-reflection-manifest',
      kind: 'RuntimeReflectionManifest',
      digest: input.manifest.digest,
    },
  })

  return makeLiveActionsInspectArtifact({
    target: input.target,
    producer: input.producer,
    binding: bindingRef,
    budget: input.budget,
    degraded: listed.truncated ? { reason: 'actions-truncated' } : undefined,
    actions: listed.actions.map((action) => ({
      actionTag: action.actionTag,
      payloadKind: action.payload.kind,
      ...(action.payload.summary ? { payloadSummary: action.payload.summary } : null),
      ...(action.payload.schemaDigest ? { schemaDigest: action.payload.schemaDigest } : null),
      validatorAvailable: action.payload.validatorAvailable,
      bindingStatus: bindingRef.bindingStatus,
    })),
  })
}

export const makeLiveInspectGapArtifact = (input: {
  readonly section: LiveInspectSection
  readonly target: LiveTargetDescriptor
  readonly sourceAuthority: LiveInspectSourceAuthority
  readonly producer: string
  readonly gapCode: string
  readonly summary: string
  readonly owner: LiveStructuredEvidenceGap['owner']
  readonly reopenBar: string
  readonly budget?: LiveBudgetProfile
}): LiveInspectArtifact =>
  makeLiveInspectArtifact({
    section: input.section,
    target: input.target,
    sourceAuthority: input.sourceAuthority,
    producer: input.producer,
    budget: input.budget,
    gaps: [
      makeLiveInspectGap({
        gapId: `live:${input.section}:${input.gapCode}`,
        code: input.gapCode,
        summary: input.summary,
        target: input.target,
        owner: input.owner,
        reopenBar: input.reopenBar,
      }),
    ],
  })

export const makeLiveInspectGapsArtifact = (input: {
  readonly section: LiveInspectSection
  readonly target: LiveTargetDescriptor
  readonly sourceAuthority: LiveInspectSourceAuthority
  readonly producer: string
  readonly gaps: ReadonlyArray<{
    readonly gapCode: string
    readonly summary: string
    readonly owner: LiveStructuredEvidenceGap['owner']
    readonly reopenBar: string
  }>
  readonly budget?: LiveBudgetProfile
}): LiveInspectArtifact =>
  makeLiveInspectArtifact({
    section: input.section,
    target: input.target,
    sourceAuthority: input.sourceAuthority,
    producer: input.producer,
    budget: input.budget,
    gaps: input.gaps.map((gap) =>
      makeLiveInspectGap({
        gapId: `live:${input.section}:${gap.gapCode}`,
        code: gap.gapCode,
        summary: gap.summary,
        target: input.target,
        owner: gap.owner,
        reopenBar: gap.reopenBar,
      }),
    ),
  })

export const makeLiveSnapshotInspectArtifact = (input: {
  readonly target: LiveTargetDescriptor
  readonly producer: string
  readonly facetRefs: ReadonlyArray<{ readonly section: LiveInspectSection; readonly outputKey: string; readonly kind: 'LiveInspectArtifact' }>
  readonly budget?: LiveBudgetProfile
}): LiveInspectArtifact<'snapshot'> =>
  makeLiveInspectArtifact({
    section: 'snapshot',
    target: input.target,
    sourceAuthority: 'runtime-live',
    producer: input.producer,
    budget: input.budget,
    payload: {
      schemaVersion: 'live-inspect.v1',
      generatedBy: input.producer,
      facetRefs: input.facetRefs,
    } satisfies LiveInspectFacetPayloadBase & Record<string, unknown>,
  })

export const makeLiveOperationWindowInspectArtifact = (input: {
  readonly target: LiveTargetDescriptor
  readonly producer: string
  readonly operationWindow: LiveOperationWindow
  readonly budget?: LiveBudgetProfile
  readonly gaps?: ReadonlyArray<LiveStructuredEvidenceGap>
}): LiveInspectArtifact<'events'> =>
  makeLiveInspectArtifact({
    section: 'events',
    target: input.target,
    sourceAuthority: 'runtime-live',
    producer: input.producer,
    budget: input.budget ?? input.operationWindow.budget.request,
    gaps: input.gaps ?? input.operationWindow.gaps,
    payload: {
      schemaVersion: 'live-inspect.v1',
      generatedBy: input.producer,
      operationWindow: input.operationWindow,
    } satisfies LiveInspectFacetPayloadBase & Record<string, unknown>,
  })
