// Shared verification report contract owned by @logixjs/core.

import { fnv1a32, stableStringify } from './internal/digest.js'

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | { readonly [k: string]: JsonValue }
  | ReadonlyArray<JsonValue>

export type VerificationControlPlaneStage = 'check' | 'trial' | 'compare'
export type VerificationControlPlaneMode = 'static' | 'startup' | 'scenario' | 'compare'
export type VerificationControlPlaneVerdict = 'PASS' | 'FAIL' | 'INCONCLUSIVE'
export type VerificationControlPlaneFindingKind =
  | 'blueprint'
  | 'import'
  | 'declaration'
  | 'sourceRef'
  | 'pass-boundary'
  | 'dependency'
  | 'lifecycle'
  | 'compare'
  | 'repeatability'
export type VerificationDependencyCauseKind =
  | 'service'
  | 'config'
  | 'program-import'
  | 'child-dependency'
  | 'provider-source'
export type VerificationDependencyCausePhase = 'check' | 'startup-boot' | 'startup-close'
export type VerificationProviderSource =
  | 'program-capabilities'
  | 'runtime-overlay'
  | 'internal-harness'
  | 'future-host-layer'
export type VerificationAdmissibilityResult = 'admissible' | 'inconclusive'

export interface VerificationControlPlaneArtifactRef {
  readonly outputKey: string
  readonly kind: string
  readonly file?: string
  readonly digest?: string
  readonly reasonCodes?: ReadonlyArray<string>
}

export interface VerificationControlPlaneFocusRef {
  readonly declSliceId?: string
  readonly reasonSlotId?: string
  readonly scenarioStepId?: string
  readonly sourceRef?: string
}

export interface VerificationControlPlaneRepairHint {
  readonly code: string
  readonly canAutoRetry: boolean
  readonly upgradeToStage: VerificationControlPlaneStage | 'done' | null
  readonly focusRef: VerificationControlPlaneFocusRef | null
  readonly relatedArtifactOutputKeys?: ReadonlyArray<string>
  readonly reason?: string
  readonly suggestedAction?: string
}

export interface VerificationDerivedSourceArtifact {
  readonly sourceRef: string
  readonly digest: string
  readonly producer: 'source' | 'package' | 'typecheck' | 'cli-source'
  readonly artifactRef?: string
}

export interface VerificationControlPlaneFinding {
  readonly kind: VerificationControlPlaneFindingKind
  readonly code: string
  readonly ownerCoordinate: string
  readonly summary: string
  readonly focusRef?: VerificationControlPlaneFocusRef
  readonly sourceArtifactRef?: VerificationDerivedSourceArtifact
}

export interface VerificationDependencyCause {
  readonly kind: VerificationDependencyCauseKind
  readonly phase: VerificationDependencyCausePhase
  readonly ownerCoordinate: string
  readonly providerSource: VerificationProviderSource
  readonly childIdentity?: string
  readonly focusRef: VerificationControlPlaneFocusRef | null
  readonly errorCode: string
}

export interface VerificationLifecycleSummary {
  readonly primaryFailure: string | null
  readonly closeSummary: string | null
  readonly artifactOutputKeys: ReadonlyArray<string>
  readonly phase: 'startup-boot' | 'startup-close'
}

export interface VerificationCompareAdmissibility {
  readonly declarationDigest: string
  readonly scenarioPlanDigest: string
  readonly evidenceSummaryDigest: string
  readonly environmentFingerprint: string
  readonly result: VerificationAdmissibilityResult
  readonly errorCode: string | null
}

export interface VerificationRepeatabilityEnvelope {
  readonly ignoredFields: ReadonlyArray<string>
  readonly stableFields: ReadonlyArray<string>
  readonly normalizedInputDigest: string
  readonly reportDigest: string
}

export interface VerificationControlPlaneReport {
  readonly schemaVersion: 1
  readonly kind: 'VerificationControlPlaneReport'
  readonly stage: VerificationControlPlaneStage
  readonly mode: VerificationControlPlaneMode
  readonly verdict: VerificationControlPlaneVerdict
  readonly errorCode: string | null
  readonly summary: string
  readonly environment: JsonValue
  readonly artifacts: ReadonlyArray<VerificationControlPlaneArtifactRef>
  readonly repairHints: ReadonlyArray<VerificationControlPlaneRepairHint>
  readonly nextRecommendedStage: VerificationControlPlaneStage | 'done' | null
  readonly findings?: ReadonlyArray<VerificationControlPlaneFinding>
  readonly dependencyCauses?: ReadonlyArray<VerificationDependencyCause>
  readonly lifecycle?: VerificationLifecycleSummary
  readonly admissibility?: VerificationCompareAdmissibility
  readonly repeatability?: VerificationRepeatabilityEnvelope
}

export interface VerificationControlPlaneCompareInput {
  readonly runId: string
  readonly before: VerificationControlPlaneReport
  readonly after: VerificationControlPlaneReport
  readonly evidence?: JsonValue
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const STAGES = ['check', 'trial', 'compare'] as const satisfies ReadonlyArray<VerificationControlPlaneStage>
const MODES = ['static', 'startup', 'scenario', 'compare'] as const satisfies ReadonlyArray<VerificationControlPlaneMode>
const VERDICTS = ['PASS', 'FAIL', 'INCONCLUSIVE'] as const satisfies ReadonlyArray<VerificationControlPlaneVerdict>
const REPORT_KEYS = new Set([
  'schemaVersion',
  'kind',
  'stage',
  'mode',
  'verdict',
  'errorCode',
  'summary',
  'environment',
  'artifacts',
  'repairHints',
  'nextRecommendedStage',
  'findings',
  'dependencyCauses',
  'lifecycle',
  'admissibility',
  'repeatability',
])
const ARTIFACT_REF_KEYS = new Set(['outputKey', 'kind', 'file', 'digest', 'reasonCodes'])
const FOCUS_REF_KEYS = new Set(['declSliceId', 'reasonSlotId', 'scenarioStepId', 'sourceRef'])
const DERIVED_SOURCE_ARTIFACT_KEYS = new Set(['sourceRef', 'digest', 'producer', 'artifactRef'])
const FINDING_KEYS = new Set(['kind', 'code', 'ownerCoordinate', 'summary', 'focusRef', 'sourceArtifactRef'])
const DEPENDENCY_CAUSE_KEYS = new Set([
  'kind',
  'phase',
  'ownerCoordinate',
  'providerSource',
  'childIdentity',
  'focusRef',
  'errorCode',
])
const LIFECYCLE_KEYS = new Set(['primaryFailure', 'closeSummary', 'artifactOutputKeys', 'phase'])
const ADMISSIBILITY_KEYS = new Set([
  'declarationDigest',
  'scenarioPlanDigest',
  'evidenceSummaryDigest',
  'environmentFingerprint',
  'result',
  'errorCode',
])
const REPEATABILITY_KEYS = new Set(['ignoredFields', 'stableFields', 'normalizedInputDigest', 'reportDigest'])
const REPAIR_HINT_KEYS = new Set([
  'code',
  'canAutoRetry',
  'upgradeToStage',
  'focusRef',
  'relatedArtifactOutputKeys',
  'reason',
  'suggestedAction',
])

const hasOnlyKeys = (record: Record<string, unknown>, allowed: ReadonlySet<string>): boolean =>
  Object.keys(record).every((key) => allowed.has(key))

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.length > 0
const isStringArray = (value: unknown): value is ReadonlyArray<string> =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

export const isVerificationControlPlaneStage = (value: unknown): value is VerificationControlPlaneStage =>
  typeof value === 'string' && (STAGES as ReadonlyArray<string>).includes(value)

export const isVerificationControlPlaneMode = (value: unknown): value is VerificationControlPlaneMode =>
  typeof value === 'string' && (MODES as ReadonlyArray<string>).includes(value)

export const isVerificationControlPlaneVerdict = (value: unknown): value is VerificationControlPlaneVerdict =>
  typeof value === 'string' && (VERDICTS as ReadonlyArray<string>).includes(value)

const FINDING_KINDS = [
  'blueprint',
  'import',
  'declaration',
  'sourceRef',
  'pass-boundary',
  'dependency',
  'lifecycle',
  'compare',
  'repeatability',
] as const satisfies ReadonlyArray<VerificationControlPlaneFindingKind>
const DEPENDENCY_CAUSE_KINDS = [
  'service',
  'config',
  'program-import',
  'child-dependency',
  'provider-source',
] as const satisfies ReadonlyArray<VerificationDependencyCauseKind>
const DEPENDENCY_CAUSE_PHASES = [
  'check',
  'startup-boot',
  'startup-close',
] as const satisfies ReadonlyArray<VerificationDependencyCausePhase>
const PROVIDER_SOURCES = [
  'program-capabilities',
  'runtime-overlay',
  'internal-harness',
  'future-host-layer',
] as const satisfies ReadonlyArray<VerificationProviderSource>
const SOURCE_ARTIFACT_PRODUCERS = [
  'source',
  'package',
  'typecheck',
  'cli-source',
] as const satisfies ReadonlyArray<VerificationDerivedSourceArtifact['producer']>

const isFocusRef = (value: unknown): value is VerificationControlPlaneFocusRef => {
  if (!isRecord(value)) return false
  if (!hasOnlyKeys(value, FOCUS_REF_KEYS)) return false
  if (!Object.keys(value).some((key) => FOCUS_REF_KEYS.has(key) && typeof value[key] === 'string')) return false
  if (value.declSliceId !== undefined && typeof value.declSliceId !== 'string') return false
  if (value.reasonSlotId !== undefined && typeof value.reasonSlotId !== 'string') return false
  if (value.scenarioStepId !== undefined && typeof value.scenarioStepId !== 'string') return false
  if (value.sourceRef !== undefined && typeof value.sourceRef !== 'string') return false
  return true
}

const isDerivedSourceArtifact = (value: unknown): value is VerificationDerivedSourceArtifact => {
  if (!isRecord(value)) return false
  if (!hasOnlyKeys(value, DERIVED_SOURCE_ARTIFACT_KEYS)) return false
  if (!isNonEmptyString(value.sourceRef)) return false
  if (!isNonEmptyString(value.digest)) return false
  if (typeof value.producer !== 'string' || !(SOURCE_ARTIFACT_PRODUCERS as ReadonlyArray<string>).includes(value.producer)) {
    return false
  }
  if (value.artifactRef !== undefined && typeof value.artifactRef !== 'string') return false
  return true
}

const isFinding = (value: unknown): value is VerificationControlPlaneFinding => {
  if (!isRecord(value)) return false
  if (!hasOnlyKeys(value, FINDING_KEYS)) return false
  if (typeof value.kind !== 'string' || !(FINDING_KINDS as ReadonlyArray<string>).includes(value.kind)) return false
  if (!isNonEmptyString(value.code)) return false
  if (!isNonEmptyString(value.ownerCoordinate)) return false
  if (typeof value.summary !== 'string') return false
  if (value.focusRef !== undefined && !isFocusRef(value.focusRef)) return false
  if (value.sourceArtifactRef !== undefined && !isDerivedSourceArtifact(value.sourceArtifactRef)) return false
  return true
}

const isDependencyCause = (value: unknown): value is VerificationDependencyCause => {
  if (!isRecord(value)) return false
  if (!hasOnlyKeys(value, DEPENDENCY_CAUSE_KEYS)) return false
  if (typeof value.kind !== 'string' || !(DEPENDENCY_CAUSE_KINDS as ReadonlyArray<string>).includes(value.kind)) return false
  if (typeof value.phase !== 'string' || !(DEPENDENCY_CAUSE_PHASES as ReadonlyArray<string>).includes(value.phase)) return false
  if (!isNonEmptyString(value.ownerCoordinate)) return false
  if (typeof value.providerSource !== 'string' || !(PROVIDER_SOURCES as ReadonlyArray<string>).includes(value.providerSource)) {
    return false
  }
  if (value.childIdentity !== undefined && typeof value.childIdentity !== 'string') return false
  if (!(value.focusRef === null || isFocusRef(value.focusRef))) return false
  if (!isNonEmptyString(value.errorCode)) return false
  return true
}

const isLifecycleSummary = (value: unknown): value is VerificationLifecycleSummary => {
  if (!isRecord(value)) return false
  if (!hasOnlyKeys(value, LIFECYCLE_KEYS)) return false
  if (!(value.primaryFailure === null || typeof value.primaryFailure === 'string')) return false
  if (!(value.closeSummary === null || typeof value.closeSummary === 'string')) return false
  if (!isStringArray(value.artifactOutputKeys)) return false
  return value.phase === 'startup-boot' || value.phase === 'startup-close'
}

const isAdmissibility = (value: unknown): value is VerificationCompareAdmissibility => {
  if (!isRecord(value)) return false
  if (!hasOnlyKeys(value, ADMISSIBILITY_KEYS)) return false
  if (!isNonEmptyString(value.declarationDigest)) return false
  if (!isNonEmptyString(value.scenarioPlanDigest)) return false
  if (!isNonEmptyString(value.evidenceSummaryDigest)) return false
  if (!isNonEmptyString(value.environmentFingerprint)) return false
  if (!(value.result === 'admissible' || value.result === 'inconclusive')) return false
  if (!(value.errorCode === null || typeof value.errorCode === 'string')) return false
  return true
}

const isRepeatability = (value: unknown): value is VerificationRepeatabilityEnvelope => {
  if (!isRecord(value)) return false
  if (!hasOnlyKeys(value, REPEATABILITY_KEYS)) return false
  if (!isStringArray(value.ignoredFields)) return false
  if (!isStringArray(value.stableFields)) return false
  if (!isNonEmptyString(value.normalizedInputDigest)) return false
  if (!isNonEmptyString(value.reportDigest)) return false
  return true
}

export const isVerificationControlPlaneStageModePair = (
  stage: VerificationControlPlaneStage,
  mode: VerificationControlPlaneMode,
): boolean => {
  if (stage === 'check') return mode === 'static'
  if (stage === 'trial') return mode === 'startup' || mode === 'scenario'
  return mode === 'compare'
}

export const makeVerificationControlPlaneReport = (args: {
  readonly kind: 'VerificationControlPlaneReport'
  readonly stage: VerificationControlPlaneStage
  readonly mode: VerificationControlPlaneMode
  readonly verdict: VerificationControlPlaneVerdict
  readonly errorCode: string | null
  readonly summary: string
  readonly environment: JsonValue
  readonly artifacts: ReadonlyArray<VerificationControlPlaneArtifactRef>
  readonly repairHints: ReadonlyArray<VerificationControlPlaneRepairHint>
  readonly nextRecommendedStage: VerificationControlPlaneStage | 'done' | null
  readonly findings?: ReadonlyArray<VerificationControlPlaneFinding>
  readonly dependencyCauses?: ReadonlyArray<VerificationDependencyCause>
  readonly lifecycle?: VerificationLifecycleSummary
  readonly admissibility?: VerificationCompareAdmissibility
  readonly repeatability?: VerificationRepeatabilityEnvelope
}): VerificationControlPlaneReport => {
  if (!isVerificationControlPlaneStageModePair(args.stage, args.mode)) {
    throw new Error(`[ControlPlane] invalid stage/mode pair: ${args.stage}/${args.mode}`)
  }

  const base = {
    schemaVersion: 1,
    kind: 'VerificationControlPlaneReport',
    stage: args.stage,
    mode: args.mode,
    verdict: args.verdict,
    errorCode: args.errorCode,
    summary: args.summary,
    environment: args.environment,
    artifacts: args.artifacts,
    repairHints: args.repairHints,
    nextRecommendedStage: args.nextRecommendedStage,
    ...(args.findings && args.findings.length > 0 ? { findings: args.findings } : null),
    ...(args.dependencyCauses && args.dependencyCauses.length > 0 ? { dependencyCauses: args.dependencyCauses } : null),
    ...(args.lifecycle ? { lifecycle: args.lifecycle } : null),
    ...(args.admissibility ? { admissibility: args.admissibility } : null),
  } satisfies Omit<VerificationControlPlaneReport, 'repeatability'> & {
    readonly repeatability?: VerificationRepeatabilityEnvelope
  }

  return {
    ...base,
    repeatability: args.repeatability ?? makeRepeatabilityEnvelope(base),
  }
}

export const isVerificationControlPlaneReport = (value: unknown): value is VerificationControlPlaneReport => {
  if (!isRecord(value)) return false
  if (!hasOnlyKeys(value, REPORT_KEYS)) return false
  if (value.schemaVersion !== 1) return false
  if (value.kind !== 'VerificationControlPlaneReport') return false
  if (!isVerificationControlPlaneStage(value.stage)) return false
  if (!isVerificationControlPlaneMode(value.mode)) return false
  if (!isVerificationControlPlaneStageModePair(value.stage, value.mode)) return false
  if (!isVerificationControlPlaneVerdict(value.verdict)) return false
  if (!(typeof value.errorCode === 'string' || value.errorCode === null)) return false
  if (typeof value.summary !== 'string') return false
  if (!isRecord(value.environment)) return false
  if (!Array.isArray(value.artifacts)) return false
  if (!Array.isArray(value.repairHints)) return false
  if (
    !(
      value.nextRecommendedStage === null ||
      value.nextRecommendedStage === 'done' ||
      isVerificationControlPlaneStage(value.nextRecommendedStage)
    )
  ) {
    return false
  }

  const artifactOutputKeys = new Set<string>()
  for (const artifact of value.artifacts) {
    if (!isRecord(artifact)) return false
    if (!hasOnlyKeys(artifact, ARTIFACT_REF_KEYS)) return false
    if (!isNonEmptyString(artifact.outputKey)) return false
    if (!isNonEmptyString(artifact.kind)) return false
    if (artifact.file !== undefined && typeof artifact.file !== 'string') return false
    if (artifact.digest !== undefined && typeof artifact.digest !== 'string') return false
    if (artifact.reasonCodes !== undefined) {
      if (!Array.isArray(artifact.reasonCodes) || !artifact.reasonCodes.every((item) => typeof item === 'string')) {
        return false
      }
    }
    if (artifactOutputKeys.has(artifact.outputKey)) return false
    artifactOutputKeys.add(artifact.outputKey)
  }

  const validRepairHints = value.repairHints.every((hint) => {
    if (!isRecord(hint)) return false
    if (!hasOnlyKeys(hint, REPAIR_HINT_KEYS)) return false
    if (typeof hint.code !== 'string') return false
    if (typeof hint.canAutoRetry !== 'boolean') return false
    if (!('focusRef' in hint)) return false
    if (!(hint.focusRef === null || isFocusRef(hint.focusRef))) return false
    if (hint.relatedArtifactOutputKeys !== undefined) {
      if (
        !Array.isArray(hint.relatedArtifactOutputKeys) ||
        !hint.relatedArtifactOutputKeys.every((item) => typeof item === 'string')
      ) {
        return false
      }
      if (!hint.relatedArtifactOutputKeys.every((item) => artifactOutputKeys.has(item))) return false
    }
    if (hint.reason !== undefined && typeof hint.reason !== 'string') return false
    if (hint.suggestedAction !== undefined && typeof hint.suggestedAction !== 'string') return false
    return (
      hint.upgradeToStage === null ||
      hint.upgradeToStage === 'done' ||
      isVerificationControlPlaneStage(hint.upgradeToStage)
    )
  })
  if (!validRepairHints) return false

  if (value.findings !== undefined) {
    if (!Array.isArray(value.findings) || !value.findings.every(isFinding)) return false
  }
  if (value.dependencyCauses !== undefined) {
    if (!Array.isArray(value.dependencyCauses) || !value.dependencyCauses.every(isDependencyCause)) return false
  }
  if (value.lifecycle !== undefined && !isLifecycleSummary(value.lifecycle)) return false
  if (value.lifecycle !== undefined) {
    if (!value.lifecycle.artifactOutputKeys.every((item) => artifactOutputKeys.has(item))) return false
  }
  if (value.admissibility !== undefined && !isAdmissibility(value.admissibility)) return false
  if (value.repeatability !== undefined && !isRepeatability(value.repeatability)) return false
  return true
}

const comparableEnvironment = (report: VerificationControlPlaneReport): JsonValue => {
  const env = report.environment
  if (!isRecord(env)) return {}
  return normalizeEnvironment(env) as JsonValue
}

const jsonEqual = (a: JsonValue, b: JsonValue): boolean => JSON.stringify(a) === JSON.stringify(b)

const digest = (prefix: string, value: unknown): string => `${prefix}:${fnv1a32(stableStringify(value))}`

const normalizeEnvironment = (input: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(input).sort()) {
    if (key === 'runId' || key === 'file' || key === 'outDir' || key === 'outDirs') continue
    out[key] = input[key]
  }
  return out
}

const normalizedArtifacts = (report: VerificationControlPlaneReport): ReadonlyArray<Record<string, unknown>> =>
  report.artifacts
    .map((artifact) => ({
      outputKey: artifact.outputKey,
      kind: artifact.kind,
      ...(artifact.digest ? { digest: artifact.digest } : null),
      ...(artifact.reasonCodes ? { reasonCodes: artifact.reasonCodes } : null),
    }))
    .sort((a, b) => String(a.outputKey).localeCompare(String(b.outputKey)))

const artifactDigestByKey = (report: VerificationControlPlaneReport, outputKey: string): string | undefined =>
  report.artifacts.find((artifact) => artifact.outputKey === outputKey)?.digest

const stringFromEnvironment = (report: VerificationControlPlaneReport, key: string): string | undefined => {
  if (!isRecord(report.environment)) return undefined
  const value = report.environment[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

const admissibilityToJson = (value: VerificationCompareAdmissibility): JsonValue => ({
  declarationDigest: value.declarationDigest,
  scenarioPlanDigest: value.scenarioPlanDigest,
  evidenceSummaryDigest: value.evidenceSummaryDigest,
  environmentFingerprint: value.environmentFingerprint,
  result: value.result,
  errorCode: value.errorCode,
})

export const makeCompareAdmissibility = (
  report: VerificationControlPlaneReport,
  result: VerificationAdmissibilityResult = 'admissible',
  errorCode: string | null = null,
): VerificationCompareAdmissibility => {
  const environment = isRecord(report.environment) ? normalizeEnvironment(report.environment) : {}
  return {
    declarationDigest:
      stringFromEnvironment(report, 'declarationDigest') ??
      artifactDigestByKey(report, 'module-manifest') ??
      digest('decl:none', { stage: report.stage, mode: report.mode }),
    scenarioPlanDigest: stringFromEnvironment(report, 'scenarioPlanDigest') ?? 'scenario:none',
    evidenceSummaryDigest:
      stringFromEnvironment(report, 'evidenceSummaryDigest') ??
      digest('evidence', {
        artifacts: normalizedArtifacts(report),
      }),
    environmentFingerprint: stringFromEnvironment(report, 'environmentFingerprint') ?? digest('env', environment),
    result,
    errorCode,
  }
}

const makeRepeatabilityEnvelope = (
  report: Omit<VerificationControlPlaneReport, 'repeatability'>,
): VerificationRepeatabilityEnvelope => {
  const normalized = {
    schemaVersion: report.schemaVersion,
    kind: report.kind,
    stage: report.stage,
    mode: report.mode,
    verdict: report.verdict,
    errorCode: report.errorCode,
    environment: isRecord(report.environment) ? normalizeEnvironment(report.environment) : report.environment,
    artifactKeys: report.artifacts.map((artifact) => artifact.outputKey).sort(),
    artifactDigests: normalizedArtifacts(report),
    nextRecommendedStage: report.nextRecommendedStage,
    findings: report.findings,
    dependencyCauses: report.dependencyCauses,
    lifecycle: report.lifecycle,
    admissibility: report.admissibility,
  }

  return {
    ignoredFields: ['environment.runId', 'environment.file', 'environment.outDir', 'artifacts[].file'],
    stableFields: ['verdict', 'errorCode', 'artifactKeys', 'artifactDigests', 'nextRecommendedStage'],
    normalizedInputDigest: digest('verify-input', normalized),
    reportDigest: digest('verify-report', normalized),
  }
}

const firstAdmissibilityMismatch = (
  before: VerificationCompareAdmissibility,
  after: VerificationCompareAdmissibility,
): { readonly field: keyof VerificationCompareAdmissibility; readonly code: string; readonly summary: string } | null => {
  if (before.declarationDigest !== after.declarationDigest) {
    return {
      field: 'declarationDigest',
      code: 'COMPARE_DECLARATION_DIGEST_MISMATCH',
      summary: 'Verification reports use different declaration digests',
    }
  }
  if (before.scenarioPlanDigest !== after.scenarioPlanDigest) {
    return {
      field: 'scenarioPlanDigest',
      code: 'COMPARE_SCENARIO_PLAN_DIGEST_MISMATCH',
      summary: 'Verification reports use different scenario plan digests',
    }
  }
  if (before.evidenceSummaryDigest !== after.evidenceSummaryDigest) {
    return {
      field: 'evidenceSummaryDigest',
      code: 'COMPARE_EVIDENCE_SUMMARY_DIGEST_MISMATCH',
      summary: 'Verification reports use different evidence summary digests',
    }
  }
  if (before.environmentFingerprint !== after.environmentFingerprint) {
    return {
      field: 'environmentFingerprint',
      code: 'COMPARE_ENVIRONMENT_FINGERPRINT_MISMATCH',
      summary: 'Verification reports use different environment fingerprints',
    }
  }
  return null
}

export const compareVerificationControlPlaneReports = (
  input: VerificationControlPlaneCompareInput,
): VerificationControlPlaneReport => {
  const beforeAdmissibility = makeCompareAdmissibility(input.before)
  const afterAdmissibility = makeCompareAdmissibility(input.after)
  const environment = {
    runId: input.runId,
    before: {
      stage: input.before.stage,
      mode: input.before.mode,
      verdict: input.before.verdict,
      admissibility: admissibilityToJson(beforeAdmissibility),
    },
    after: {
      stage: input.after.stage,
      mode: input.after.mode,
      verdict: input.after.verdict,
      admissibility: admissibilityToJson(afterAdmissibility),
    },
    ...(input.evidence ? { evidence: input.evidence } : null),
  } satisfies JsonValue

  const mismatch = firstAdmissibilityMismatch(beforeAdmissibility, afterAdmissibility)
  if (mismatch !== null) {
    const admissibility = {
      ...afterAdmissibility,
      result: 'inconclusive',
      errorCode: mismatch.code,
    } satisfies VerificationCompareAdmissibility
    return makeVerificationControlPlaneReport({
      kind: 'VerificationControlPlaneReport',
      stage: 'compare',
      mode: 'compare',
      verdict: 'INCONCLUSIVE',
      errorCode: mismatch.code,
      summary: mismatch.summary,
      environment,
      artifacts: [],
      repairHints: [
        {
          code: mismatch.code,
          canAutoRetry: false,
          upgradeToStage: 'compare',
          focusRef: null,
          reason: `before/after ${mismatch.field} differs`,
          suggestedAction: 'rerun before and after reports from the same normalized verification input',
        },
      ],
      findings: [
        {
          kind: 'compare',
          code: mismatch.code,
          ownerCoordinate: `compare.${mismatch.field}`,
          summary: mismatch.summary,
        },
      ],
      nextRecommendedStage: 'compare',
      admissibility,
    })
  }

  const admissibility = makeCompareAdmissibility(input.after)

  if (input.before.verdict === 'FAIL' && input.after.verdict === 'PASS') {
    return makeVerificationControlPlaneReport({
      kind: 'VerificationControlPlaneReport',
      stage: 'compare',
      mode: 'compare',
      verdict: 'PASS',
      errorCode: null,
      summary: 'Verification repair closed',
      environment,
      artifacts: [],
      repairHints: [],
      nextRecommendedStage: null,
      admissibility,
    })
  }

  if (input.before.verdict === 'PASS' && input.after.verdict !== 'PASS') {
    return makeVerificationControlPlaneReport({
      kind: 'VerificationControlPlaneReport',
      stage: 'compare',
      mode: 'compare',
      verdict: 'FAIL',
      errorCode: 'COMPARE_REPORT_REGRESSION',
      summary: 'Verification report regressed',
      environment,
      artifacts: [],
      repairHints: [
        {
          code: 'COMPARE_REPORT_REGRESSION',
          canAutoRetry: false,
          upgradeToStage: 'compare',
          focusRef: null,
          reason: 'before report passed but after report did not pass',
          suggestedAction: 'inspect after report repair hints and rerun the same stage',
        },
      ],
      nextRecommendedStage: 'compare',
      admissibility,
    })
  }

  if (!jsonEqual(comparableEnvironment(input.before), comparableEnvironment(input.after))) {
    return makeVerificationControlPlaneReport({
      kind: 'VerificationControlPlaneReport',
      stage: 'compare',
      mode: 'compare',
      verdict: 'INCONCLUSIVE',
      errorCode: 'COMPARE_ENVIRONMENT_MISMATCH',
      summary: 'Verification reports use different environments',
      environment,
      artifacts: [],
      repairHints: [
        {
          code: 'COMPARE_ENVIRONMENT_MISMATCH',
          canAutoRetry: false,
          upgradeToStage: 'compare',
          focusRef: null,
          reason: 'before/after report environment differs after fingerprint normalization',
          suggestedAction: 'rerun before and after reports under the same host and verification input',
        },
      ],
      nextRecommendedStage: 'compare',
      admissibility: {
        ...admissibility,
        result: 'inconclusive',
        errorCode: 'COMPARE_ENVIRONMENT_MISMATCH',
      },
    })
  }

  if (input.before.verdict !== input.after.verdict || input.before.errorCode !== input.after.errorCode) {
    return makeVerificationControlPlaneReport({
      kind: 'VerificationControlPlaneReport',
      stage: 'compare',
      mode: 'compare',
      verdict: 'FAIL',
      errorCode: 'COMPARE_REPORT_MISMATCH',
      summary: 'Verification reports changed without closing the repair',
      environment,
      artifacts: [],
      repairHints: [
        {
          code: 'COMPARE_REPORT_MISMATCH',
          canAutoRetry: false,
          upgradeToStage: 'compare',
          focusRef: null,
          reason: 'before/after report verdict or errorCode changed but after report is not PASS',
          suggestedAction: 'inspect report artifacts and repair the changed verification result',
        },
      ],
      nextRecommendedStage: 'compare',
      admissibility,
    })
  }

  return makeVerificationControlPlaneReport({
    kind: 'VerificationControlPlaneReport',
    stage: 'compare',
    mode: 'compare',
    verdict: 'PASS',
    errorCode: null,
    summary: 'Verification reports match',
    environment,
    artifacts: [],
    repairHints: [],
    nextRecommendedStage: null,
    admissibility,
  })
}
