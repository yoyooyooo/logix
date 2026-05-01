import * as Logix from '@logixjs/core'
import * as CoreEvidence from '@logixjs/core/repo-internal/evidence-api'
import type { FormSourceOwnershipContract } from './fields.js'
import type { RulesManifest } from './rules.js'

export const formRulesManifestArtifactKey = '@logixjs/form.rulesManifest@v1' as const
export const formEvidenceContractArtifactKey = '@logixjs/form.evidenceContract@v1' as const

export type FormCompanionOwnershipContract = {
  readonly fieldPath: string
  readonly deps: ReadonlyArray<string>
  readonly companionRef: string
  readonly sourceRef?: string
}

export type FormRulesManifestArtifactPayload = {
  readonly manifest: RulesManifest
  readonly warnings: ReadonlyArray<string>
}

export type FormEvidenceContractArtifactPayload = {
  readonly submitAttempt: {
    readonly sourceRef: '$form.submitAttempt'
    readonly summaryRef: '$form.submitAttempt.summary'
    readonly compareFeedRef: '$form.submitAttempt.compareFeed'
  }
  readonly cleanupReceipts: {
    readonly receiptPathPrefix: 'ui.$cleanup'
    readonly reasonSlotPrefix: 'cleanup:'
    readonly subjectRefKind: 'cleanup'
  }
  readonly companions: ReadonlyArray<FormCompanionOwnershipContract>
  readonly sources: ReadonlyArray<FormSourceOwnershipContract>
}

export const makeFormRulesManifestArtifactExporter = (params: {
  readonly getManifest: () => RulesManifest
  readonly getWarnings: () => ReadonlyArray<string>
}): CoreEvidence.TrialRunArtifactExporter => ({
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

export const makeFormEvidenceContractArtifactExporter = (params: {
  readonly getSourceOwnership: () => ReadonlyArray<FormSourceOwnershipContract>
  readonly getCompanionOwnership: () => ReadonlyArray<FormCompanionOwnershipContract>
}): CoreEvidence.TrialRunArtifactExporter => ({
  exporterId: 'logix-form.evidenceContract@v1',
  artifactKey: formEvidenceContractArtifactKey,
  export: () =>
    ({
      submitAttempt: {
        sourceRef: '$form.submitAttempt',
        summaryRef: '$form.submitAttempt.summary',
        compareFeedRef: '$form.submitAttempt.compareFeed',
      },
      cleanupReceipts: {
        receiptPathPrefix: 'ui.$cleanup',
        reasonSlotPrefix: 'cleanup:',
        subjectRefKind: 'cleanup',
      },
      companions: params.getCompanionOwnership(),
      sources: params.getSourceOwnership(),
    }) satisfies FormEvidenceContractArtifactPayload,
})
