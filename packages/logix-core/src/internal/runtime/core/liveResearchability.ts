import type { LiveStageClass, LiveTargetCoordinate } from './liveTypes.js'
import { makeLiveTargetCoordinate } from './liveTypes.js'

export interface LiveMetricRef {
  readonly owner: string
  readonly unit: string
  readonly ref: string
}

export interface LiveResearchabilityGap {
  readonly code: string
  readonly summary: string
}

export interface LiveResearchabilityHeader {
  readonly evidenceSummaryDigest: string
  readonly captureWindow: {
    readonly fromSeq: number
    readonly toSeq: number
  }
  readonly stageClass: LiveStageClass
  readonly runtimeCoordinate: LiveTargetCoordinate
  readonly manifestDigest?: string
  readonly envFingerprintRef: string
  readonly sourceDigestRef?: string
  readonly buildDigestRef?: string
  readonly budgetProfileRef: string
  readonly samplingProfileRef: string
  readonly redactionPolicyRef: string
  readonly proofCommandRefs: ReadonlyArray<string>
  readonly metricRefs: ReadonlyArray<LiveMetricRef>
  readonly dropped: boolean
  readonly degraded: boolean
  readonly redacted: boolean
  readonly gaps: ReadonlyArray<LiveResearchabilityGap>
  readonly authorityRef: string
}

export const makeLiveResearchabilityHeader = (input: LiveResearchabilityHeader): LiveResearchabilityHeader => ({
  evidenceSummaryDigest: input.evidenceSummaryDigest,
  captureWindow: {
    fromSeq: Math.max(0, Math.floor(input.captureWindow.fromSeq)),
    toSeq: Math.max(0, Math.floor(input.captureWindow.toSeq)),
  },
  stageClass: input.stageClass,
  runtimeCoordinate: makeLiveTargetCoordinate(input.runtimeCoordinate),
  ...(input.manifestDigest ? { manifestDigest: input.manifestDigest } : null),
  envFingerprintRef: input.envFingerprintRef,
  ...(input.sourceDigestRef ? { sourceDigestRef: input.sourceDigestRef } : null),
  ...(input.buildDigestRef ? { buildDigestRef: input.buildDigestRef } : null),
  budgetProfileRef: input.budgetProfileRef,
  samplingProfileRef: input.samplingProfileRef,
  redactionPolicyRef: input.redactionPolicyRef,
  proofCommandRefs: Array.from(input.proofCommandRefs),
  metricRefs: input.metricRefs.map((metric) => ({
    owner: metric.owner,
    unit: metric.unit,
    ref: metric.ref,
  })),
  dropped: input.dropped,
  degraded: input.degraded,
  redacted: input.redacted,
  gaps: input.gaps.map((gap) => ({
    code: gap.code,
    summary: gap.summary,
  })),
  authorityRef: input.authorityRef,
})
