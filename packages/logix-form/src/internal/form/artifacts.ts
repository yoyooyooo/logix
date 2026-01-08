import * as Logix from '@logixjs/core'
import type { RulesManifest } from './rules.js'

export const formRulesManifestArtifactKey = '@logixjs/form.rulesManifest@v1' as const

export type FormRulesManifestArtifactPayload = {
  readonly manifest: RulesManifest
  readonly warnings: ReadonlyArray<string>
}

export const makeFormRulesManifestArtifactExporter = (params: {
  readonly getManifest: () => RulesManifest
  readonly getWarnings: () => ReadonlyArray<string>
}): Logix.Observability.TrialRunArtifactExporter => ({
  exporterId: 'logix-form.rulesManifest@v1',
  artifactKey: formRulesManifestArtifactKey,
  export: () => {
    const manifest = params.getManifest()
    const warnings = params.getWarnings()
    return {
      manifest,
      warnings: Array.isArray(warnings) ? warnings : [],
    } satisfies FormRulesManifestArtifactPayload
  },
})
