import type { CliCommand } from '../args.js'

export type VerificationChainTemplateId = 'static-contract' | 'dynamic-evidence' | 'change-safety' | 'closure-ready'

export type VerificationChainTemplateV1 = {
  readonly id: VerificationChainTemplateId
  readonly purpose: string
  readonly commandSteps: ReadonlyArray<ReadonlyArray<CliCommand>>
}

export type VerificationChainCatalogV1 = {
  readonly schemaVersion: 1
  readonly kind: 'VerificationChainCatalog'
  readonly source: 'primitives.capability-model.v1'
  readonly chains: ReadonlyArray<VerificationChainTemplateV1>
}

export const VERIFICATION_CHAIN_CATALOG_V1: VerificationChainCatalogV1 = {
  schemaVersion: 1,
  kind: 'VerificationChainCatalog',
  source: 'primitives.capability-model.v1',
  chains: [
    {
      id: 'static-contract',
      purpose: 'Export and validate static control-surface artifacts before running business flows.',
      commandSteps: [['describe'], ['ir.export'], ['ir.validate']],
    },
    {
      id: 'dynamic-evidence',
      purpose: 'Run dynamic trialrun and collect deterministic runtime evidence for diagnosis.',
      commandSteps: [['describe'], ['trialrun']],
    },
    {
      id: 'change-safety',
      purpose: 'Apply report-first structural changes and verify with static and semantic diff checks.',
      commandSteps: [['describe'], ['transform.module', 'anchor.autofill'], ['ir.export'], ['ir.validate'], ['ir.diff']],
    },
    {
      id: 'closure-ready',
      purpose: 'Build a minimal autonomous loop with primitives and executable next actions.',
      commandSteps: [['describe'], ['ir.export'], ['trialrun'], ['ir.validate'], ['next-actions.exec', 'verify-loop']],
    },
  ],
}
