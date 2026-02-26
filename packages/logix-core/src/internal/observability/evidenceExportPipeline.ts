import type { EvidencePackage } from './evidence.js'
import type { JsonValue } from './jsonValue.js'
import type { EvidenceSink } from './runSession.js'

export interface EvidenceExportCollection {
  readonly convergeSummary?: JsonValue
  readonly runtimeSummary?: JsonValue
}

export interface EvidenceExportSummary {
  readonly summary?: JsonValue
}

export const collectEvidenceExport = (args: {
  readonly convergeStaticIrByDigest: ReadonlyMap<string, JsonValue>
  readonly kernelImplementationRef?: JsonValue
  readonly runtimeServicesEvidence?: JsonValue
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

  return {
    convergeSummary,
    runtimeSummary,
  }
}

export const summarizeEvidenceExport = (collection: EvidenceExportCollection): EvidenceExportSummary => {
  const summary =
    collection.convergeSummary != null || collection.runtimeSummary != null
      ? ({
          ...(collection.convergeSummary != null ? { converge: collection.convergeSummary } : {}),
          ...(collection.runtimeSummary != null ? { runtime: collection.runtimeSummary } : {}),
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
