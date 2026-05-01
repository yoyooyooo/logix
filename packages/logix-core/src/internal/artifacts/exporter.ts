import type { EnvironmentIr } from '../observability/trialRunModule.js'
import type { ModuleManifest } from '../reflection/manifest.js'
import type { exportStaticIr } from '../reflection/staticIr.js'
import type { JsonValue } from '../protocol/jsonValue.js'
import type { ArtifactKey } from '../observability/artifacts/model.js'

export interface TrialRunArtifactInspectionContext {
  readonly moduleId: string
  readonly manifest?: ModuleManifest
  readonly staticIr?: ReturnType<typeof exportStaticIr>
  readonly environment?: EnvironmentIr
}

export interface TrialRunArtifactExporter {
  readonly exporterId: string
  readonly artifactKey: ArtifactKey
  readonly export: (ctx: TrialRunArtifactInspectionContext) => JsonValue | undefined
}
