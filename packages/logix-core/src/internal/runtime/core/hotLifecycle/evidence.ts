import type { JsonValue } from '../../../protocol/jsonValue.js'
import type { ObservationEnvelope } from '../../../verification/evidence.js'
import { makeHotLifecycleEventId } from './identity.js'
import {
  HOT_LIFECYCLE_EVIDENCE_TYPE,
  type HotLifecycleEvidence,
  type HostBindingCleanupSummary,
  type MakeHotLifecycleEvidenceOptions,
  type RuntimeResourceSummary,
} from './types.js'

const errorToString = (error: unknown): string =>
  error instanceof Error ? error.message : typeof error === 'string' ? error : String(error)

const countResidualActive = (summary: RuntimeResourceSummary): number => {
  let count = 0
  for (const item of Object.values(summary)) {
    count += item.active + item.closing
  }
  return count
}

const hasHostCleanupSummary = (summary: HostBindingCleanupSummary | undefined): summary is HostBindingCleanupSummary =>
  !!summary && Object.keys(summary).length > 0

export const makeHotLifecycleEvidence = (options: MakeHotLifecycleEvidenceOptions): HotLifecycleEvidence => {
  const errors = (options.errors ?? []).map(errorToString).slice(0, 8)
  const cleanupStatus = options.cleanupStatus ?? (errors.length > 0 ? 'failed' : 'closed')
  const base = {
    type: HOT_LIFECYCLE_EVIDENCE_TYPE as 'runtime.hot-lifecycle',
    ownerId: options.ownerId,
    eventId: makeHotLifecycleEventId(options.ownerId, options.eventSeq),
    cleanupId: options.cleanupId,
    decision: options.decision,
    reason: options.reason,
    previousRuntimeInstanceId: options.previousRuntimeInstanceId,
    resourceSummary: options.resourceSummary,
    cleanupStatus,
    idempotent: Boolean(options.idempotent),
    residualActiveCount: countResidualActive(options.resourceSummary),
    errors,
  } satisfies Omit<HotLifecycleEvidence, 'nextRuntimeInstanceId' | 'hostCleanupSummary'>
  return {
    ...base,
    ...(options.nextRuntimeInstanceId ? { nextRuntimeInstanceId: options.nextRuntimeInstanceId } : null),
    ...(hasHostCleanupSummary(options.hostCleanupSummary) ? { hostCleanupSummary: options.hostCleanupSummary } : null),
  }
}

export const makeHotLifecycleObservationEnvelope = (options: {
  readonly runId: string
  readonly seq: number
  readonly timestamp?: number
  readonly event: HotLifecycleEvidence
  readonly protocolVersion?: string
}): ObservationEnvelope => ({
  protocolVersion: options.protocolVersion ?? 'v1',
  runId: options.runId,
  seq: options.seq,
  timestamp: options.timestamp ?? Date.now(),
  type: HOT_LIFECYCLE_EVIDENCE_TYPE,
  payload: options.event as unknown as JsonValue,
})
