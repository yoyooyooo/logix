export type ContractSuiteProtocolVersion = 'v1'

export const CONTRACT_SUITE_PROTOCOL_VERSION: ContractSuiteProtocolVersion = 'v1'

export type ArtifactStatus = 'PRESENT' | 'TRUNCATED' | 'MISSING' | 'FAILED' | 'SKIPPED'

export type ContractSuiteReasonSeverity = 'BREAKING' | 'RISKY' | 'INFO'

export type ContractSuiteReason = {
  readonly severity: ContractSuiteReasonSeverity
  readonly code: string
  readonly message?: string
  readonly artifactKey?: string
  readonly pointer?: string
  readonly hint?: string
  readonly details?: unknown
}

export type ContractSuiteArtifactStatus = {
  readonly artifactKey: string
  readonly status: ArtifactStatus
  readonly usedByVerdict?: boolean
  readonly summary?: unknown
  readonly notes?: string
}

export type ContractSuiteVerdict = {
  readonly protocolVersion: ContractSuiteProtocolVersion
  readonly suiteId?: string
  readonly runId: string
  readonly moduleId?: string
  readonly verdict: 'PASS' | 'WARN' | 'FAIL'
  readonly summary?: {
    readonly breaking: number
    readonly risky: number
    readonly info: number
  }
  readonly reasons: ReadonlyArray<ContractSuiteReason>
  readonly artifacts: ReadonlyArray<ContractSuiteArtifactStatus>
  readonly links?: unknown
}

export type ContractSuiteTargetKind = 'patch_code' | 'patch_rule' | 'patch_mock' | 'patch_spec' | 'investigate'

export type ContractSuiteTarget = {
  readonly kind: ContractSuiteTargetKind
  readonly description?: string
}

export type ContractSuiteFactsInputs = {
  readonly stageBlueprint?: unknown
  readonly uiBlueprints?: ReadonlyArray<unknown>
  readonly uiKitRegistry?: unknown
  readonly bindingSchemas?: ReadonlyArray<unknown>
  readonly codeAssets?: ReadonlyArray<unknown>
}

export type ContractSuiteFacts = {
  readonly inputs?: ContractSuiteFactsInputs
  readonly trialRunReport: unknown
  readonly manifestDiff?: unknown
  readonly artifacts?: ReadonlyArray<{
    readonly artifactKey: string
    readonly status: ArtifactStatus
    readonly value?: unknown
    readonly notes?: string
  }>
}

export type ContractSuiteContextPack = {
  readonly protocolVersion: ContractSuiteProtocolVersion
  readonly suiteId?: string
  readonly target: ContractSuiteTarget
  readonly constraints: unknown
  readonly facts: ContractSuiteFacts
  readonly verdict?: ContractSuiteVerdict
  readonly notes?: unknown
}

export const ARTIFACT_STATUS_ORDER: ReadonlyArray<ArtifactStatus> = ['FAILED', 'MISSING', 'TRUNCATED', 'SKIPPED', 'PRESENT']

export const REASON_SEVERITY_ORDER: ReadonlyArray<ContractSuiteReasonSeverity> = ['BREAKING', 'RISKY', 'INFO']

