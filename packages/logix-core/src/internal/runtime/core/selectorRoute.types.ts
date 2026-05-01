import type { ReadQueryCompiled, ReadQueryFallbackReason } from './ReadQuery.js'

export type SelectorPrecisionQuality = 'exact' | 'broad-root' | 'broad-state' | 'dynamic' | 'debug' | 'unknown'

export type SelectorRouteKind = 'exact' | 'reject' | 'internal-resilience'

export type SelectorRouteFailureCode =
  | 'selector.broad_root'
  | 'selector.broad_state'
  | 'selector.dynamic_fallback'
  | 'selector.debug_marker'
  | 'selector.unknown'

export interface SelectorFingerprint {
  readonly value: string
  readonly readsDigest?: number
  readonly pathAuthorityEpoch: number
}

export interface SelectorRouteDecision {
  readonly kind: SelectorRouteKind
  readonly selectorFingerprint: SelectorFingerprint
  readonly selectorIdLabel: string
  readonly precisionQuality: SelectorPrecisionQuality
  readonly failureCode?: SelectorRouteFailureCode
  readonly fallbackReason?: ReadQueryFallbackReason | string
  readonly repairHint?: string
}

export type SelectorQualityArtifactStage = 'static' | 'startup' | 'scenario' | 'host-harness'

export interface SelectorQualityArtifact {
  readonly stage: SelectorQualityArtifactStage
  readonly producer: string
  readonly selectorFingerprint: string
  readonly precisionQuality: SelectorPrecisionQuality
  readonly routeKind: SelectorRouteKind
  readonly fallbackKind?: string
  readonly repairHint?: string
  readonly sourceRef?: string
}

export const toSelectorQualityArtifact = (args: {
  readonly stage: SelectorQualityArtifactStage
  readonly producer: string
  readonly route: SelectorRouteDecision
  readonly sourceRef?: string
}): SelectorQualityArtifact => ({
  stage: args.stage,
  producer: args.producer,
  selectorFingerprint: args.route.selectorFingerprint.value,
  precisionQuality: args.route.precisionQuality,
  routeKind: args.route.kind,
  ...(args.route.fallbackReason ? { fallbackKind: String(args.route.fallbackReason) } : null),
  ...(args.route.repairHint ? { repairHint: args.route.repairHint } : null),
  ...(args.sourceRef ? { sourceRef: args.sourceRef } : null),
})

export interface SelectorPrecisionRecord {
  readonly selectorIdLabel: string
  readonly precisionQuality: SelectorPrecisionQuality
  readonly fallbackReason?: ReadQueryFallbackReason | string
  readonly repairHint?: string
}

export interface SelectorRouteInput<S = unknown, V = unknown> {
  readonly readQuery: ReadQueryCompiled<S, V>
  readonly pathAuthorityEpoch?: number
  readonly allowInternalResilience?: boolean
}

export const selectorInternalResilienceMarker: unique symbol = Symbol.for(
  '@logixjs/core/internal/selector-route/resilience',
) as any

export interface SelectorInternalResilienceMarked {
  readonly [selectorInternalResilienceMarker]: true
}

export interface SelectorRouteErrorDetails {
  readonly selectorIdLabel: string
  readonly selectorFingerprint: string
  readonly precisionQuality: SelectorPrecisionQuality
  readonly failureCode: SelectorRouteFailureCode
  readonly fallbackReason?: ReadQueryFallbackReason | string
  readonly repairHint: string
}

export interface SelectorRouteError extends Error {
  readonly _tag: 'SelectorRouteError'
  readonly details: SelectorRouteErrorDetails
}

export const makeSelectorRouteError = (decision: SelectorRouteDecision): SelectorRouteError => {
  const failureCode = decision.failureCode ?? 'selector.unknown'
  const repairHint = decision.repairHint ?? 'Use an exact selector input with stable declared reads.'
  return Object.assign(
    new Error(
      `[SelectorRouteError] ${failureCode}: selector=${decision.selectorIdLabel}, fingerprint=${decision.selectorFingerprint.value}. ${repairHint}`,
    ),
    {
      _tag: 'SelectorRouteError' as const,
      details: {
        selectorIdLabel: decision.selectorIdLabel,
        selectorFingerprint: decision.selectorFingerprint.value,
        precisionQuality: decision.precisionQuality,
        failureCode,
        fallbackReason: decision.fallbackReason,
        repairHint,
      },
    },
  ) as SelectorRouteError
}
