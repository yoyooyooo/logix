// Observability Protocol (@logix/core/Observability).

import * as Evidence from './internal/observability/evidence.js'
export * from './internal/observability/trialRun.js'

export type { JsonValue } from './internal/observability/jsonValue.js'
export type { ArtifactEnvelope, ArtifactKey, TrialRunArtifacts } from './internal/observability/artifacts/model.js'
export type {
  TrialRunArtifactExporter,
  TrialRunArtifactInspectionContext,
} from './internal/observability/artifacts/exporter.js'
export { registerTrialRunArtifactExporter } from './internal/observability/artifacts/registry.js'

export const protocolVersion = Evidence.OBSERVABILITY_PROTOCOL_VERSION

export interface ObservationEnvelope extends Evidence.ObservationEnvelope {}
export interface EvidencePackageSource extends Evidence.EvidencePackageSource {}
export interface EvidencePackage extends Evidence.EvidencePackage {}

export const exportEvidencePackage = Evidence.exportEvidencePackage
export const importEvidencePackage = Evidence.importEvidencePackage
