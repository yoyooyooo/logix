// Repo-internal evidence and artifact protocol.
// Canonical runtime verification should enter through Runtime.trial / runtime.*.

import * as Evidence from './verification/evidence.js'
export type {
  ControlEffectIndexEntryV1,
  ControlSurfaceManifestModuleEntryV1,
  ControlSurfaceManifestV1,
} from './observability/controlSurfaceManifest.js'
export {
  exportControlSurfaceManifest,
  exportEffectsIndexDigest,
  exportControlProgramEffectsIndex,
} from './observability/controlSurfaceManifest.js'
export type { ControlProgramStaticIrV1, ControlProgramSurfaceV1, WorkflowStaticIrV1 } from './observability/controlProgramSurface.js'
export { exportControlProgramSurface } from './observability/controlProgramSurface.js'

export type { JsonValue } from './protocol/jsonValue.js'
export type { ArtifactEnvelope, ArtifactKey, TrialRunArtifacts } from './observability/artifacts/model.js'
export type {
  TrialRunArtifactExporter,
  TrialRunArtifactInspectionContext,
} from './artifacts/exporter.js'
export { registerTrialRunArtifactExporter } from './observability/artifacts/registry.js'

export const protocolVersion = Evidence.OBSERVABILITY_PROTOCOL_VERSION

export interface ObservationEnvelope extends Evidence.ObservationEnvelope {}
export interface EvidencePackageSource extends Evidence.EvidencePackageSource {}
export interface EvidencePackage extends Evidence.EvidencePackage {}

export const exportEvidencePackage = Evidence.exportEvidencePackage
export const importEvidencePackage = Evidence.importEvidencePackage
