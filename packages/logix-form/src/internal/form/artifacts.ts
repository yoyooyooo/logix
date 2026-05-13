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

export type FormFinalTruthContributorKind = 'schema' | 'rule' | 'list' | 'root' | 'sourceImpact' | 'manual'

export type FormFinalTruthContributorContract = {
  readonly kind: FormFinalTruthContributorKind
  readonly owner: 'schema-decode' | 'form-rule' | 'form-list' | 'form-root' | 'form-source-impact' | 'form-handle'
  readonly carrierRef: string
  readonly reasonRef: '$form.submitAttempt'
  readonly writesCanonicalError: boolean
  readonly blocksSubmit: boolean
  readonly note: string
}

export const formFinalTruthContributorMatrix = [
  {
    kind: 'schema',
    owner: 'schema-decode',
    carrierRef: 'errors.$schema',
    reasonRef: '$form.submitAttempt',
    writesCanonicalError: true,
    blocksSubmit: true,
    note: 'Submit decode/schema lowering contributes canonical decode errors and submit blocking basis.',
  },
  {
    kind: 'rule',
    owner: 'form-rule',
    carrierRef: 'errors.<field>',
    reasonRef: '$form.submitAttempt',
    writesCanonicalError: true,
    blocksSubmit: true,
    note: 'field.rule owns field-level final truth; companion/source cannot write this carrier.',
  },
  {
    kind: 'list',
    owner: 'form-list',
    carrierRef: 'errors.<list>.rows / errors.<list>.$list',
    reasonRef: '$form.submitAttempt',
    writesCanonicalError: true,
    blocksSubmit: true,
    note: 'list item/list rules own row/list final truth and row-scoped blocking basis.',
  },
  {
    kind: 'root',
    owner: 'form-root',
    carrierRef: 'errors.$root / errors.$form',
    reasonRef: '$form.submitAttempt',
    writesCanonicalError: true,
    blocksSubmit: true,
    note: 'root rules own cross-field/cross-list final truth.',
  },
  {
    kind: 'sourceImpact',
    owner: 'form-source-impact',
    carrierRef: 'source:<fieldPath>',
    reasonRef: '$form.submitAttempt',
    writesCanonicalError: false,
    blocksSubmit: true,
    note: 'source submitImpact may block submit through pending/error state but does not become a verdict or error owner.',
  },
  {
    kind: 'manual',
    owner: 'form-handle',
    carrierRef: 'errors.$manual',
    reasonRef: '$form.submitAttempt',
    writesCanonicalError: true,
    blocksSubmit: true,
    note: 'FormHandle.setError/clearErrors own manual canonical errors; host selectors only read them.',
  },
] as const satisfies ReadonlyArray<FormFinalTruthContributorContract>

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
  readonly finalTruthContributors: ReadonlyArray<FormFinalTruthContributorContract>
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
      finalTruthContributors: formFinalTruthContributorMatrix,
      companions: params.getCompanionOwnership(),
      sources: params.getSourceOwnership(),
    }) satisfies FormEvidenceContractArtifactPayload,
})
