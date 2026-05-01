import type { EvidencePackage } from './evidence.js'
import type { JsonValue } from '../protocol/jsonValue.js'
import type { EvidenceSink } from './runSession.js'
import { HOT_LIFECYCLE_EVIDENCE_TYPE, type HotLifecycleEvidence } from '../runtime/core/hotLifecycle/index.js'

export interface EvidenceExportCollection {
  readonly convergeSummary?: JsonValue
  readonly runtimeSummary?: JsonValue
  readonly hotLifecycleSummary?: JsonValue
}

export interface EvidenceExportSummary {
  readonly summary?: JsonValue
}

export const collectEvidenceExport = (args: {
  readonly convergeStaticIrByDigest: ReadonlyMap<string, JsonValue>
  readonly kernelImplementationRef?: JsonValue
  readonly runtimeServicesEvidence?: JsonValue
  readonly hotLifecycleEvents?: ReadonlyArray<HotLifecycleEvidence>
}): EvidenceExportCollection => {
  const convergeSummary =
    args.convergeStaticIrByDigest.size > 0
      ? ({
          staticIrByDigest: Object.fromEntries(
            Array.from(args.convergeStaticIrByDigest.entries()).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
          ),
        } as unknown as JsonValue)
      : undefined

  const runtimeSummary =
    args.kernelImplementationRef != null || args.runtimeServicesEvidence != null
      ? ({
          ...(args.kernelImplementationRef != null ? { kernelImplementationRef: args.kernelImplementationRef } : {}),
          ...(args.runtimeServicesEvidence != null ? { services: args.runtimeServicesEvidence } : {}),
        } as unknown as JsonValue)
      : undefined

  const hotLifecycleSummary =
    args.hotLifecycleEvents && args.hotLifecycleEvents.length > 0
      ? ({
          events: args.hotLifecycleEvents.map((event) => ({
            ownerId: event.ownerId,
            eventId: event.eventId,
            cleanupId: event.cleanupId,
            decision: event.decision,
            reason: event.reason,
            previousRuntimeInstanceId: event.previousRuntimeInstanceId,
            nextRuntimeInstanceId: event.nextRuntimeInstanceId,
            cleanupStatus: event.cleanupStatus,
            residualActiveCount: event.residualActiveCount,
          })),
        } as unknown as JsonValue)
      : undefined

  return {
    convergeSummary,
    runtimeSummary,
    hotLifecycleSummary,
  }
}

export const summarizeEvidenceExport = (collection: EvidenceExportCollection): EvidenceExportSummary => {
  const summary =
    collection.convergeSummary != null || collection.runtimeSummary != null || collection.hotLifecycleSummary != null
      ? ({
          ...(collection.convergeSummary != null ? { converge: collection.convergeSummary } : {}),
          ...(collection.runtimeSummary != null ? { runtime: collection.runtimeSummary } : {}),
          ...(collection.hotLifecycleSummary != null
            ? { [HOT_LIFECYCLE_EVIDENCE_TYPE]: collection.hotLifecycleSummary }
            : {}),
        } as unknown as JsonValue)
      : undefined

  return { summary }
}

export const reExportEvidencePackage = (args: {
  readonly sink: EvidenceSink
  readonly maxEvents?: number
  readonly summary: EvidenceExportSummary
}): EvidencePackage =>
  args.sink.export({
    maxEvents: args.maxEvents,
    summary: args.summary.summary,
  })
