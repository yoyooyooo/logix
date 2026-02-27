import { Context, Effect, FiberRef, Layer } from 'effect'
import type { JsonValue } from './jsonValue.js'
import { projectJsonValue } from './jsonValue.js'
import type { EvidencePackage } from './evidence.js'
import { collectEvidenceExport, reExportEvidencePackage, summarizeEvidenceExport } from './evidenceExportPipeline.js'
import type { RunSession } from './runSession.js'
import { makeEvidenceSink } from './runSession.js'
import {
  currentDiagnosticsLevel,
  toRuntimeDebugEventRef,
  type Event as DebugEvent,
  type Sink as DebugSink,
} from '../runtime/core/DebugSink.js'

export interface EvidenceCollector {
  readonly session: RunSession
  readonly debugSink: DebugSink
  readonly registerConvergeStaticIr: (staticIr: unknown) => void
  readonly setKernelImplementationRef: (ref: unknown) => void
  readonly setRuntimeServicesEvidence: (evidence: unknown) => void
  readonly exportEvidencePackage: (options?: { readonly maxEvents?: number }) => EvidencePackage
  readonly clear: () => void
}

class EvidenceCollectorTagImpl extends Context.Tag('@logixjs/core/EvidenceCollector')<
  EvidenceCollectorTagImpl,
  EvidenceCollector
>() {}

export const EvidenceCollectorTag = EvidenceCollectorTagImpl

export const evidenceCollectorLayer = (
  collector: EvidenceCollector,
): Layer.Layer<EvidenceCollectorTagImpl, never, never> =>
  Layer.succeed(EvidenceCollectorTag, collector) as Layer.Layer<EvidenceCollectorTagImpl, never, never>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const makeEvidenceCollector = (session: RunSession): EvidenceCollector => {
  const sink = makeEvidenceSink(session)

  const convergeStaticIrByDigest = new Map<string, JsonValue>()
  let kernelImplementationRef: JsonValue | undefined
  let runtimeServicesEvidence: JsonValue | undefined

  const exportBudget = {
    dropped: 0,
    oversized: 0,
    nonSerializable: 0,
  }

  const traceDigestDegradeCounts = {
    digest_missing: 0,
    lookup_key_missing: 0,
    digest_mismatch: 0,
  }

  const debugSink: DebugSink = {
    record: (event: DebugEvent) =>
      Effect.gen(function* () {
        const level = yield* FiberRef.get(currentDiagnosticsLevel)
        const instanceIdRaw = (event as any).instanceId
        const instanceId = typeof instanceIdRaw === 'string' && instanceIdRaw.length > 0 ? instanceIdRaw : 'unknown'
        const eventSeq = level === 'off' ? undefined : session.local.nextSeq('eventSeq', instanceId)
        const ref = toRuntimeDebugEventRef(event, {
          diagnosticsLevel: level,
          eventSeq,
          onMetaProjection: ({ stats }) => {
            exportBudget.dropped += stats.dropped
            exportBudget.oversized += stats.oversized
          },
        })
        if (!ref) return

        const digestDegradeReason = (() => {
          const meta = (ref as any).meta
          if (!isRecord(meta)) return undefined
          const degrade = (meta as any).traceDigestDegrade
          if (!isRecord(degrade)) return undefined
          const reasonCode = degrade.reasonCode
          return reasonCode === 'digest_missing' ||
            reasonCode === 'lookup_key_missing' ||
            reasonCode === 'digest_mismatch'
            ? reasonCode
            : undefined
        })()
        if (digestDegradeReason) {
          traceDigestDegradeCounts[digestDegradeReason] += 1
        }

        const projected = projectJsonValue(ref)
        exportBudget.dropped += projected.stats.dropped
        exportBudget.oversized += projected.stats.oversized
        exportBudget.nonSerializable += projected.stats.nonSerializable

        sink.record('debug:event', projected.value, {
          timestamp: ref.timestamp,
        })
      }),
  }

  const registerConvergeStaticIr = (staticIr: unknown): void => {
    if (!isRecord(staticIr)) return
    const digest = staticIr.staticIrDigest
    if (typeof digest !== 'string' || digest.length === 0) return
    const projected = projectJsonValue(staticIr)
    exportBudget.dropped += projected.stats.dropped
    exportBudget.oversized += projected.stats.oversized
    exportBudget.nonSerializable += projected.stats.nonSerializable
    convergeStaticIrByDigest.set(digest, projected.value)
  }

  const setKernelImplementationRef = (ref: unknown): void => {
    const projected = projectJsonValue(ref)
    exportBudget.dropped += projected.stats.dropped
    exportBudget.oversized += projected.stats.oversized
    exportBudget.nonSerializable += projected.stats.nonSerializable
    kernelImplementationRef = projected.value
  }

  const setRuntimeServicesEvidence = (evidence: unknown): void => {
    const projected = projectJsonValue(evidence)
    exportBudget.dropped += projected.stats.dropped
    exportBudget.oversized += projected.stats.oversized
    exportBudget.nonSerializable += projected.stats.nonSerializable
    runtimeServicesEvidence = projected.value
  }

  const exportEvidencePackage = (options?: { readonly maxEvents?: number }): EvidencePackage => {
    const collection = collectEvidenceExport({
      convergeStaticIrByDigest,
      kernelImplementationRef,
      runtimeServicesEvidence,
      traceDigestDegradeCounts,
    })
    const summary = summarizeEvidenceExport(collection)

    return reExportEvidencePackage({
      sink,
      maxEvents: options?.maxEvents,
      summary,
    })
  }

  const clear = (): void => {
    sink.clear()
    convergeStaticIrByDigest.clear()
    kernelImplementationRef = undefined
    runtimeServicesEvidence = undefined
    exportBudget.dropped = 0
    exportBudget.oversized = 0
    exportBudget.nonSerializable = 0
    traceDigestDegradeCounts.digest_missing = 0
    traceDigestDegradeCounts.lookup_key_missing = 0
    traceDigestDegradeCounts.digest_mismatch = 0
  }

  return {
    session,
    debugSink,
    registerConvergeStaticIr,
    setKernelImplementationRef,
    setRuntimeServicesEvidence,
    exportEvidencePackage,
    clear,
  }
}
