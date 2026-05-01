import type { MinimumProgramActionManifest } from './programManifest.js'

export type CrossToolConsumptionClass =
  | 'authority'
  | 'contextRef'
  | 'debugEvidence'
  | 'hostViewState'
  | 'evidenceGap'

export interface CrossToolConsumptionBase {
  readonly class: CrossToolConsumptionClass
  readonly kind: string
  readonly id: string
}

export interface MinimumProgramActionManifestAuthority extends CrossToolConsumptionBase {
  readonly class: 'authority'
  readonly kind: 'minimum-program-action-manifest'
  readonly manifest: MinimumProgramActionManifest
}

export interface ProductDeclarationContextRef extends CrossToolConsumptionBase {
  readonly class: 'contextRef'
  readonly kind: 'product-declaration'
  readonly productKind: 'driver' | 'scenario' | 'service-source'
  readonly projectId: string
  readonly declarationId: string
  readonly label?: string
}

export interface ProductExpectationDebugEvidence extends CrossToolConsumptionBase {
  readonly class: 'debugEvidence'
  readonly kind: 'product-expectation-result'
  readonly productKind: 'scenario'
  readonly runId: string
  readonly stepId: string
  readonly status: 'passed' | 'failed'
  readonly message?: string
}

export interface UiLayoutHostViewState extends CrossToolConsumptionBase {
  readonly class: 'hostViewState'
  readonly kind: 'ui-layout-state'
  readonly owner: 'playground' | 'devtools' | 'cli' | 'host'
  readonly summary: string
}

export interface ReflectionEvidenceGap extends CrossToolConsumptionBase {
  readonly class: 'evidenceGap'
  readonly kind: 'reflection-evidence-gap'
  readonly code: string
  readonly owner: 'reflection' | 'manifest' | 'payload' | 'operation' | 'source'
  readonly message: string
  readonly severity: 'info' | 'warning' | 'error'
}

export type CrossToolConsumptionFact =
  | MinimumProgramActionManifestAuthority
  | ProductDeclarationContextRef
  | ProductExpectationDebugEvidence
  | UiLayoutHostViewState
  | ReflectionEvidenceGap

export const classifyCrossToolConsumption = (fact: CrossToolConsumptionFact): CrossToolConsumptionClass =>
  fact.class

export const createMinimumActionManifestAuthority = (
  manifest: MinimumProgramActionManifest,
): MinimumProgramActionManifestAuthority => ({
  class: 'authority',
  kind: 'minimum-program-action-manifest',
  id: manifest.digest,
  manifest,
})

export const createFallbackSourceRegexEvidenceGap = ({
  projectId,
  revision,
  message,
}: {
  readonly projectId: string
  readonly revision?: number
  readonly message: string
}): ReflectionEvidenceGap => ({
  class: 'evidenceGap',
  kind: 'reflection-evidence-gap',
  id: ['fallback-source-regex', projectId, revision ?? 'unknown'].join(':'),
  code: 'fallback-source-regex',
  owner: 'reflection',
  message,
  severity: 'warning',
})

export const createProductDeclarationContextRef = ({
  productKind,
  projectId,
  declarationId,
  label,
}: {
  readonly productKind: 'driver' | 'scenario' | 'service-source'
  readonly projectId: string
  readonly declarationId: string
  readonly label?: string
}): ProductDeclarationContextRef => ({
  class: 'contextRef',
  kind: 'product-declaration',
  id: `${productKind}:${projectId}:${declarationId}`,
  productKind,
  projectId,
  declarationId,
  ...(label ? { label } : {}),
})

export const createProductExpectationDebugEvidence = ({
  runId,
  stepId,
  status,
  message,
}: {
  readonly runId: string
  readonly stepId: string
  readonly status: 'passed' | 'failed'
  readonly message?: string
}): ProductExpectationDebugEvidence => ({
  class: 'debugEvidence',
  kind: 'product-expectation-result',
  id: `scenario:${runId}:${stepId}`,
  productKind: 'scenario',
  runId,
  stepId,
  status,
  ...(message ? { message } : {}),
})

export const createUiLayoutHostViewState = ({
  owner,
  stateId,
  summary,
}: {
  readonly owner: 'playground' | 'devtools' | 'cli' | 'host'
  readonly stateId: string
  readonly summary: string
}): UiLayoutHostViewState => ({
  class: 'hostViewState',
  kind: 'ui-layout-state',
  id: `${owner}:${stateId}`,
  owner,
  summary,
})
