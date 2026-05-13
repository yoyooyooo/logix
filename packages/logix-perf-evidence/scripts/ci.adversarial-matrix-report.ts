import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { makeAdversarialCellId, makeAdversarialMatrixHash } from './lib/adversarial-cell-id.js'

export type AdversarialMatrixClassification =
  | 'tax_removed'
  | 'stable_guarded'
  | 'tax_migrated'
  | 'migrated_risk'
  | 'migrated_cost'
  | 'blocked'
  | 'inconclusive'

export type AdversarialMatrixClaimStrength = 'hard' | 'clue' | 'none'
export type AdversarialMatrixCellStatus =
  | 'pass'
  | 'budgetExceeded'
  | 'tailOnly'
  | 'systemic'
  | 'migratedCost'
  | 'migratedRisk'
  | 'inconclusive'
  | 'missing'

export const ADVERSARIAL_MATRIX_ID = 'logix.adversarial.runtime.v1'

export const ADVERSARIAL_REQUIRED_HOT_PATHS = [
  'fieldKernel.negativeDirtyPattern',
  'fieldKernel.convergeTxnCommit',
  'fieldKernel.formListScopeCheck',
  'fieldKernel.sourceExternalStoreIngest',
  'runtimeStore.noTearingTickNotify',
  'react.strictSuspenseJitter',
  'diagnostics.overhead',
  'txnQueue.directIdle',
  'dispatchShell.fixedCost',
  'examples.runtimeWitness',
  'examples.playgroundNoiseIsolation',
] as const

export type AdversarialRequiredHotPath = (typeof ADVERSARIAL_REQUIRED_HOT_PATHS)[number]

type Primitive = string | number | boolean

type EvidenceDelta = Readonly<{
  readonly name: string
  readonly before?: { readonly value?: number | string }
  readonly after?: { readonly value?: number | string }
  readonly message?: string
}>

type MetricDeltaPoint = Readonly<{
  readonly params?: Record<string, Primitive>
  readonly deltaMs?: { readonly medianMs?: number; readonly p95Ms?: number; readonly p99Ms?: number }
  readonly ratio?: { readonly median?: number; readonly p95?: number; readonly p99?: number }
}>

type MetricDeltaSummary = Readonly<{
  readonly metric: string
  readonly topRegressions?: ReadonlyArray<MetricDeltaPoint>
  readonly topImprovements?: ReadonlyArray<MetricDeltaPoint>
  readonly compared?: number
  readonly missing?: number
  readonly unavailable?: number
}>

type SuiteDiffLike = Readonly<{
  readonly id: string
  readonly status?: string
  readonly notes?: string
  readonly cells?: ReadonlyArray<AdversarialMatrixCellInput>
  readonly points?: ReadonlyArray<{ readonly status?: string; readonly reason?: string }>
  readonly evidenceDeltas?: ReadonlyArray<EvidenceDelta>
  readonly metricDeltas?: ReadonlyArray<MetricDeltaSummary>
}>

export type AdversarialMatrixCellInput = Readonly<{
  readonly cellId?: string
  readonly id?: string
  readonly hotPath?: string
  readonly suiteId?: string
  readonly status?: string
  readonly classification?: string
  readonly axes?: Record<string, unknown>
  readonly primary?: Readonly<{
    readonly metric?: string
    readonly pass?: boolean
    readonly ratioP95?: number
    readonly deltaP95Ms?: number
    readonly medianA?: number
    readonly medianB?: number
    readonly p95A?: number
    readonly p95B?: number
  }>
  readonly phase?: Record<string, number | undefined>
  readonly phaseDeltas?: Record<string, number | undefined>
  readonly counters?: Record<string, number | undefined>
  readonly counterDeltas?: Record<string, number | undefined>
  readonly reasons?: ReadonlyArray<string>
}>

export type AdversarialMatrixDiffLike = Readonly<{
  readonly schemaVersion?: number
  readonly matrixId?: string
  readonly matrixHash?: string
  readonly profile?: string
  readonly envId?: string
  readonly cells?: ReadonlyArray<AdversarialMatrixCellInput>
  readonly adversarialCells?: ReadonlyArray<AdversarialMatrixCellInput>
  readonly meta?: {
    readonly config?: { readonly profile?: string; readonly matrixId?: string; readonly matrixHash?: string }
    readonly environment?: { readonly envId?: string }
    readonly comparability?: {
      readonly comparable?: boolean
      readonly warnings?: ReadonlyArray<string>
      readonly configMismatches?: ReadonlyArray<string>
      readonly envMismatches?: ReadonlyArray<string>
    }
  }
  readonly summary?: {
    readonly regressions?: number
    readonly improvements?: number
    readonly budgetViolations?: number
    readonly budgetExceeded?: number
    readonly timeouts?: number
    readonly missingSuites?: number
    readonly stabilityWarnings?: number
  }
  readonly suites?: ReadonlyArray<SuiteDiffLike>
}>

export type AdversarialMatrixPerfReportLike = Readonly<{
  readonly meta?: {
    readonly config?: { readonly profile?: string; readonly matrixId?: string; readonly matrixHash?: string }
    readonly environment?: { readonly envId?: string }
  }
  readonly suites?: ReadonlyArray<SuiteDiffLike>
}>

export type NormalizedAdversarialCell = Readonly<{
  readonly cellId: string
  readonly hotPath: string
  readonly status: AdversarialMatrixCellStatus
  readonly classification?: string
  readonly axes: Record<string, unknown>
  readonly reasons: ReadonlyArray<string>
  readonly phaseDeltas: Record<string, number>
  readonly counterDeltas: Record<string, number>
}>

export type AdversarialHotPathSummary = Readonly<{
  readonly hotPath: AdversarialRequiredHotPath
  readonly present: boolean
  readonly pass: number
  readonly budgetExceeded: number
  readonly systemic: number
  readonly tailOnly: number
  readonly migratedCost: number
  readonly migratedRisk: number
  readonly inconclusive: number
  readonly firstFail?: string
}>

export type AdversarialMatrixReport = Readonly<{
  readonly schemaVersion: 1
  readonly kind: 'AdversarialPerformanceMatrixReport'
  readonly generatedAt: string
  readonly matrixId: string
  readonly matrixHash: string
  readonly matrixHashSource: 'artifact' | 'computed-fallback'
  readonly profile: string
  readonly envId?: string
  readonly comparable: boolean | 'missing'
  readonly classification: AdversarialMatrixClassification
  readonly claimStrength: AdversarialMatrixClaimStrength
  readonly summary: {
    readonly regressions: number | 'missing'
    readonly budgetExceeded: number | 'missing'
    readonly timeouts: number | 'missing'
    readonly missingSuites: number | 'missing'
    readonly stabilityWarnings: number | 'missing'
  }
  readonly requiredHotPaths: ReadonlyArray<AdversarialHotPathSummary>
  readonly cells: ReadonlyArray<NormalizedAdversarialCell>
  readonly blockers: ReadonlyArray<string>
  readonly missingEvidence: ReadonlyArray<string>
  readonly migratedCost: ReadonlyArray<string>
  readonly migratedRisk: ReadonlyArray<string>
  readonly allowedClaims: ReadonlyArray<string>
  readonly forbiddenClaims: ReadonlyArray<string>
  readonly inputs: { readonly diff?: string; readonly before?: string; readonly after?: string }
}>

const SUITE_TO_HOT_PATH: Record<string, AdversarialRequiredHotPath> = {
  'negativeBoundaries.dirtyPattern': 'fieldKernel.negativeDirtyPattern',
  'fieldKernel.negativeDirtyPattern': 'fieldKernel.negativeDirtyPattern',
  'converge.txnCommit': 'fieldKernel.convergeTxnCommit',
  'fieldKernel.convergeTxnCommit': 'fieldKernel.convergeTxnCommit',
  'form.listScopeCheck': 'fieldKernel.formListScopeCheck',
  'fieldKernel.formListScopeCheck': 'fieldKernel.formListScopeCheck',
  'externalStore.ingest.tickNotify': 'fieldKernel.sourceExternalStoreIngest',
  'fieldKernel.sourceExternalStoreIngest': 'fieldKernel.sourceExternalStoreIngest',
  'runtimeStore.noTearing.tickNotify': 'runtimeStore.noTearingTickNotify',
  'runtimeStore.noTearingTickNotify': 'runtimeStore.noTearingTickNotify',
  'react.strictSuspenseJitter': 'react.strictSuspenseJitter',
  'diagnostics.overhead': 'diagnostics.overhead',
  'txnQueue.directIdle': 'txnQueue.directIdle',
  'dispatchShell.fixedCost': 'dispatchShell.fixedCost',
  'examples.runtimeWitness': 'examples.runtimeWitness',
  'examples.playgroundNoiseIsolation': 'examples.playgroundNoiseIsolation',
}


const MIGRATION_PHASES = [
  'selectorRouteMs',
  'sourceKeyEvalMs',
  'runtimeStoreNotifyMs',
  'externalStoreSnapshotMs',
  'reactRenderMs',
  'diagnosticsEmitMs',
  'diagnosticsOffAllocBytes',
  'txnQueueWaitMs',
  'txnQueueBackpressureMs',
  'dispatchShellMs',
  'runtimeExampleWitnessMs',
  'playgroundProductMs',
  'allocBytesApprox',
] as const

const RISK_COUNTERS = [
  'fallbackCount',
  'dirtyAllCount',
  'selectorEvaluateAllCount',
  'sourceFullFallbackCount',
  'renderCount',
  'retainedTopicCount',
  'runSyncFallbackCount',
  'unknownWriteCount',
  'missingRegistryCount',
  'sourceUnrelatedKeyEvalCount',
  'dirtyPlanUnknownWrite',
  'dirtyPlanMissingRegistry',
  'sourceKeyEvalUnrelatedMutation',
  'noTopicFanoutAlloc',
  'diagnosticsOffPayloadCount',
  'listEvidenceStringNormalizeHotPath',
  'kernelPlaygroundCostMixed',
  'publicResidueViolation',
] as const

const FORBIDDEN_CLAIMS = [
  'Global Runtime performance improved.',
  'No regressions exist globally.',
  'React performance improved globally.',
  'The selector notification path is optimal.',
  'The field-kernel converge planner is optimal.',
  'Quick/adversarial-quick evidence proves release-safe performance.',
] as const

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const asNumber = (value: unknown): number | undefined => {
  if (isFiniteNumber(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const n = Number(value)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

const asNonNegativeIntegerOrMissing = (value: unknown): number | 'missing' => {
  const n = asNumber(value)
  if (n === undefined || n < 0) return 'missing'
  return Math.floor(n)
}

const isPositive = (value: unknown): boolean => {
  const n = asNumber(value)
  return n !== undefined && n > 0
}

const normalizeProfile = (input: {
  readonly explicitProfile?: string
  readonly diff: AdversarialMatrixDiffLike
  readonly before?: AdversarialMatrixPerfReportLike
  readonly after?: AdversarialMatrixPerfReportLike
}): string => {
  for (const value of [
    input.explicitProfile,
    input.diff.profile,
    input.diff.meta?.config?.profile,
    input.after?.meta?.config?.profile,
    input.before?.meta?.config?.profile,
  ]) {
    if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  }
  return 'unknown'
}

const normalizeMatrixId = (diff: AdversarialMatrixDiffLike): string => {
  const value = diff.matrixId ?? diff.meta?.config?.matrixId
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : ADVERSARIAL_MATRIX_ID
}

const normalizeMatrixHash = (diff: AdversarialMatrixDiffLike): string | undefined => {
  const value = diff.matrixHash ?? diff.meta?.config?.matrixHash
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

const resolveMatrixHash = (args: {
  readonly diff: AdversarialMatrixDiffLike
  readonly cells: ReadonlyArray<NormalizedAdversarialCell>
  readonly profile: string
  readonly matrixId: string
}): { readonly matrixHash: string; readonly matrixHashSource: 'artifact' | 'computed-fallback' } => {
  const explicit = normalizeMatrixHash(args.diff)
  if (explicit) return { matrixHash: explicit, matrixHashSource: 'artifact' }
  return {
    matrixHash: makeAdversarialMatrixHash({
      matrixId: args.matrixId,
      profile: args.profile,
      requiredHotPaths: ADVERSARIAL_REQUIRED_HOT_PATHS,
      cells: args.cells.map((cell) => ({ cellId: cell.cellId, hotPath: cell.hotPath, axes: cell.axes })),
    }),
    matrixHashSource: 'computed-fallback',
  }
}

const normalizeEnvId = (input: {
  readonly diff: AdversarialMatrixDiffLike
  readonly before?: AdversarialMatrixPerfReportLike
  readonly after?: AdversarialMatrixPerfReportLike
}): string | undefined => {
  for (const value of [
    input.diff.envId,
    input.diff.meta?.environment?.envId,
    input.after?.meta?.environment?.envId,
    input.before?.meta?.environment?.envId,
  ]) {
    if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  }
  return undefined
}

const normalizeHotPath = (cell: AdversarialMatrixCellInput, fallbackSuiteId?: string): string => {
  const raw = cell.hotPath ?? cell.suiteId ?? fallbackSuiteId ?? ''
  return SUITE_TO_HOT_PATH[raw] ?? raw
}

const normalizeStatusFromString = (value: string | undefined): AdversarialMatrixCellStatus | undefined => {
  if (!value) return undefined
  if (value === 'pass' || value === 'passed') return 'pass'
  if (value === 'budgetExceeded' || value === 'budget_exceeded' || value === 'budget') return 'budgetExceeded'
  if (value === 'tailOnly' || value === 'tail-only') return 'tailOnly'
  if (value === 'systemic') return 'systemic'
  if (value === 'migratedCost' || value === 'migrated_cost') return 'migratedCost'
  if (value === 'migratedRisk' || value === 'migrated_risk') return 'migratedRisk'
  if (value === 'fail' || value === 'failed' || value === 'timeout') return 'systemic'
  if (value === 'missing') return 'missing'
  if (value === 'inconclusive' || value === 'unknown') return 'inconclusive'
  return undefined
}

const pointStatus = (suite: SuiteDiffLike): AdversarialMatrixCellStatus | undefined => {
  const statuses = suite.points?.map((point) => point.status).filter(Boolean) ?? []
  if (statuses.some((status) => status === 'timeout' || status === 'failed' || status === 'fail')) return 'systemic'
  if (statuses.some((status) => status === 'budgetExceeded' || status === 'budget_exceeded')) return 'budgetExceeded'
  if (statuses.some((status) => status === 'inconclusive')) return 'inconclusive'
  if (statuses.length > 0 && statuses.every((status) => status === 'pass' || status === 'passed')) return 'pass'
  return undefined
}

const metricStatus = (suite: SuiteDiffLike): AdversarialMatrixCellStatus | undefined => {
  const regressions = suite.metricDeltas?.flatMap((delta) => delta.topRegressions ?? []) ?? []
  if (regressions.length === 0) return undefined
  const systemic = regressions.some((point) => isPositive(point.ratio?.median))
  return systemic ? 'systemic' : 'tailOnly'
}

const evidenceCounterDeltas = (suite: SuiteDiffLike): Record<string, number> => {
  const out: Record<string, number> = {}
  for (const delta of suite.evidenceDeltas ?? []) {
    const before = asNumber(delta.before?.value) ?? 0
    const after = asNumber(delta.after?.value) ?? 0
    out[delta.name] = after - before
  }
  return out
}

const normalizeNumbers = (input: Record<string, number | undefined> | undefined): Record<string, number> => {
  const out: Record<string, number> = {}
  for (const [key, value] of Object.entries(input ?? {})) {
    if (isFiniteNumber(value)) out[key] = value
  }
  return out
}

const normalizeCell = (cell: AdversarialMatrixCellInput, fallbackSuiteId?: string): NormalizedAdversarialCell => {
  const hotPath = normalizeHotPath(cell, fallbackSuiteId)
  const explicitStatus = normalizeStatusFromString(cell.status) ?? normalizeStatusFromString(cell.classification)
  const primaryFailed = cell.primary?.pass === false
  const status = explicitStatus ?? (primaryFailed ? 'budgetExceeded' : 'pass')
  const axes = cell.axes ?? {}
  const cellId = cell.cellId ?? cell.id ?? makeAdversarialCellId({ hotPath: hotPath || 'unknown', axes, suiteId: fallbackSuiteId, metric: cell.primary?.metric })
  return {
    cellId,
    hotPath: hotPath || 'unknown',
    status,
    classification: cell.classification,
    axes,
    reasons: cell.reasons ?? [],
    phaseDeltas: { ...normalizeNumbers(cell.phaseDeltas), ...normalizeNumbers(cell.phase) },
    counterDeltas: { ...normalizeNumbers(cell.counterDeltas), ...normalizeNumbers(cell.counters) },
  }
}

const suiteCell = (suite: SuiteDiffLike): NormalizedAdversarialCell => {
  const status = normalizeStatusFromString(suite.status) ?? pointStatus(suite) ?? metricStatus(suite) ?? 'pass'
  return normalizeCell(
    {
      cellId: `${SUITE_TO_HOT_PATH[suite.id] ?? suite.id}::suite`,
      hotPath: SUITE_TO_HOT_PATH[suite.id] ?? suite.id,
      status,
      counterDeltas: evidenceCounterDeltas(suite),
      reasons: suite.notes ? [suite.notes] : [],
    },
    suite.id,
  )
}

const normalizeCells = (diff: AdversarialMatrixDiffLike): ReadonlyArray<NormalizedAdversarialCell> => {
  const direct = diff.cells ?? diff.adversarialCells
  if (direct && direct.length > 0) return direct.map((cell) => normalizeCell(cell))

  const out: NormalizedAdversarialCell[] = []
  for (const suite of diff.suites ?? []) {
    if (suite.cells && suite.cells.length > 0) {
      out.push(...suite.cells.map((cell) => normalizeCell(cell, suite.id)))
    } else {
      out.push(suiteCell(suite))
    }
  }
  return out
}

const detectMigratedCost = (cell: NormalizedAdversarialCell): ReadonlyArray<string> => {
  const reasons: string[] = []
  if (cell.status === 'migratedCost' || cell.classification === 'migrated_cost') {
    reasons.push(`${cell.cellId}: explicitly classified as migrated cost`)
  }
  for (const phase of MIGRATION_PHASES) {
    if (isPositive(cell.phaseDeltas[phase])) reasons.push(`${cell.cellId}: ${phase} regressed by ${cell.phaseDeltas[phase]}`)
  }
  return reasons
}

const detectMigratedRisk = (cell: NormalizedAdversarialCell): ReadonlyArray<string> => {
  const reasons: string[] = []
  if (cell.status === 'migratedRisk' || cell.classification === 'migrated_risk') {
    reasons.push(`${cell.cellId}: explicitly classified as migrated risk`)
  }
  for (const counter of RISK_COUNTERS) {
    if (isPositive(cell.counterDeltas[counter])) reasons.push(`${cell.cellId}: ${counter} increased by ${cell.counterDeltas[counter]}`)
  }
  return reasons
}

const summarizeHotPaths = (cells: ReadonlyArray<NormalizedAdversarialCell>): ReadonlyArray<AdversarialHotPathSummary> => {
  return ADVERSARIAL_REQUIRED_HOT_PATHS.map((hotPath) => {
    const relevant = cells.filter((cell) => cell.hotPath === hotPath)
    const failures = relevant.filter((cell) => cell.status !== 'pass')
    return {
      hotPath,
      present: relevant.length > 0,
      pass: relevant.filter((cell) => cell.status === 'pass').length,
      budgetExceeded: relevant.filter((cell) => cell.status === 'budgetExceeded').length,
      systemic: relevant.filter((cell) => cell.status === 'systemic').length,
      tailOnly: relevant.filter((cell) => cell.status === 'tailOnly').length,
      migratedCost: relevant.filter((cell) => cell.status === 'migratedCost').length,
      migratedRisk: relevant.filter((cell) => cell.status === 'migratedRisk').length,
      inconclusive: relevant.filter((cell) => cell.status === 'inconclusive').length,
      ...(failures[0] ? { firstFail: failures[0].cellId } : null),
    }
  })
}

const profileClaimEligible = (profile: string): boolean =>
  profile === 'default' || profile === 'soak' || profile === 'adversarial-default' || profile === 'adversarial-soak'

const allowedClaimsFor = (classification: AdversarialMatrixClassification): ReadonlyArray<string> => {
  if (classification === 'tax_removed') {
    return [
      'Adversarial matrix hard gates passed for the reported matrix/profile scope.',
      'No migration was detected in the reported phase/counter ledger.',
    ]
  }
  if (classification === 'stable_guarded') {
    return [
      'Adversarial matrix structural gates are stable for the reported scope.',
      'No hard tax removal claim is made; use this as guarded stability evidence.',
    ]
  }
  if (classification === 'tax_migrated' || classification === 'migrated_cost' || classification === 'migrated_risk') {
    return ['Adversarial evidence found migration; use the report to choose the next owner fix.']
  }
  if (classification === 'blocked') return ['Adversarial matrix is blocked by failed hard gates.']
  return ['Adversarial matrix evidence is incomplete or inconclusive.']
}

export const classifyAdversarialMatrix = (args: {
  readonly diff: AdversarialMatrixDiffLike
  readonly before?: AdversarialMatrixPerfReportLike
  readonly after?: AdversarialMatrixPerfReportLike
  readonly profile?: string
  readonly inputs?: { readonly diff?: string; readonly before?: string; readonly after?: string }
}): AdversarialMatrixReport => {
  const profile = normalizeProfile({ explicitProfile: args.profile, diff: args.diff, before: args.before, after: args.after })
  const cells = normalizeCells(args.diff)
  const matrixId = normalizeMatrixId(args.diff)
  const resolvedMatrixHash = resolveMatrixHash({ diff: args.diff, cells, profile, matrixId })
  const requiredHotPaths = summarizeHotPaths(cells)
  const missingHotPaths = requiredHotPaths.filter((item) => !item.present).map((item) => item.hotPath)
  const comparable = typeof args.diff.meta?.comparability?.comparable === 'boolean' ? args.diff.meta.comparability.comparable : 'missing'
  const summary = {
    regressions: asNonNegativeIntegerOrMissing(args.diff.summary?.regressions),
    budgetExceeded: asNonNegativeIntegerOrMissing(args.diff.summary?.budgetExceeded ?? args.diff.summary?.budgetViolations),
    timeouts: asNonNegativeIntegerOrMissing(args.diff.summary?.timeouts),
    missingSuites: asNonNegativeIntegerOrMissing(args.diff.summary?.missingSuites),
    stabilityWarnings: asNonNegativeIntegerOrMissing(args.diff.summary?.stabilityWarnings ?? args.diff.meta?.comparability?.warnings?.length),
  }

  const migratedCost = cells.flatMap((cell) => detectMigratedCost(cell))
  const migratedRisk = cells.flatMap((cell) => detectMigratedRisk(cell))
  const failedCells = cells.filter((cell) => cell.status === 'budgetExceeded' || cell.status === 'systemic')
  const tailOnlyCells = cells.filter((cell) => cell.status === 'tailOnly')
  const inconclusiveCells = cells.filter((cell) => cell.status === 'inconclusive' || cell.status === 'missing')

  const missingEvidence: string[] = []
  if (comparable === 'missing') missingEvidence.push('diff.meta.comparability.comparable is missing')
  if (resolvedMatrixHash.matrixHashSource !== 'artifact') {
    missingEvidence.push('matrixHash is missing from evidence artifact; report-local computed fallback is not hard-claim proof')
  }
  if (missingHotPaths.length > 0) missingEvidence.push(`Missing required hot paths: ${missingHotPaths.join(', ')}`)
  for (const [key, value] of Object.entries(summary)) {
    if (value === 'missing') missingEvidence.push(`summary.${key} is missing`)
  }

  const blockers: string[] = []
  if (comparable === false) blockers.push('diff evidence is not comparable')
  for (const [key, value] of Object.entries(summary)) {
    if (typeof value === 'number' && value > 0) blockers.push(`summary.${key}=${value}`)
  }
  blockers.push(...failedCells.map((cell) => `${cell.cellId}: ${cell.status}`))

  let classification: AdversarialMatrixClassification
  let claimStrength: AdversarialMatrixClaimStrength
  if (blockers.length > 0) {
    classification = 'blocked'
    claimStrength = 'none'
  } else if (missingEvidence.length > 0 || inconclusiveCells.length > 0) {
    classification = 'inconclusive'
    claimStrength = 'none'
  } else if (migratedCost.length > 0) {
    classification = 'migrated_cost'
    claimStrength = 'none'
  } else if (migratedRisk.length > 0) {
    classification = 'migrated_risk'
    claimStrength = 'none'
  } else if (tailOnlyCells.length > 0) {
    classification = 'stable_guarded'
    claimStrength = profileClaimEligible(profile) ? 'clue' : 'none'
  } else if (profileClaimEligible(profile)) {
    classification = 'tax_removed'
    claimStrength = 'hard'
  } else {
    classification = 'stable_guarded'
    claimStrength = 'clue'
  }

  return {
    schemaVersion: 1,
    kind: 'AdversarialPerformanceMatrixReport',
    generatedAt: new Date(0).toISOString(),
    matrixId,
    matrixHash: resolvedMatrixHash.matrixHash,
    matrixHashSource: resolvedMatrixHash.matrixHashSource,
    profile,
    ...(normalizeEnvId({ diff: args.diff, before: args.before, after: args.after })
      ? { envId: normalizeEnvId({ diff: args.diff, before: args.before, after: args.after }) }
      : {}),
    comparable,
    classification,
    claimStrength,
    summary,
    requiredHotPaths,
    cells,
    blockers,
    missingEvidence,
    migratedCost,
    migratedRisk,
    allowedClaims: allowedClaimsFor(classification),
    forbiddenClaims: FORBIDDEN_CLAIMS,
    inputs: args.inputs ?? {},
  }
}

const renderList = (items: ReadonlyArray<string>): string => (items.length === 0 ? '- none\n' : `${items.map((item) => `- ${item}`).join('\n')}\n`)

export const renderAdversarialMatrixMarkdown = (report: AdversarialMatrixReport): string => {
  const lines = [
    '# Adversarial Performance Matrix Report',
    '',
    `classification: ${report.classification}`,
    `claimStrength: ${report.claimStrength}`,
    `matrixId: ${report.matrixId}`,
    `matrixHash: ${report.matrixHash}`,
    `matrixHashSource: ${report.matrixHashSource}`,
    `profile: ${report.profile}`,
    `envId: ${report.envId ?? ''}`,
    `comparable: ${report.comparable}`,
    '- UNKNOWN/missing is not PASS.',
    '- Quick/adversarial-quick evidence is diagnostic only.',
    '',
    '## Required Hot Paths',
    '',
    '| hotPath | present | pass | budgetExceeded | systemic | tailOnly | migratedCost | migratedRisk | inconclusive | firstFail |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
    ...report.requiredHotPaths.map(
      (item) =>
        `| ${item.hotPath} | ${item.present} | ${item.pass} | ${item.budgetExceeded} | ${item.systemic} | ${item.tailOnly} | ${item.migratedCost} | ${item.migratedRisk} | ${item.inconclusive} | ${item.firstFail ?? ''} |`,
    ),
    '',
    '## Top Cells',
    '',
    '| cellId | hotPath | status | axes |',
    '| --- | --- | --- | --- |',
    ...report.cells
      .filter((cell) => cell.status !== 'pass')
      .slice(0, 25)
      .map((cell) => `| ${cell.cellId} | ${cell.hotPath} | ${cell.status} | ${JSON.stringify(cell.axes)} |`),
    '',
    '## Cost Migration',
    '',
    renderList(report.migratedCost).trimEnd(),
    '',
    '## Risk Migration',
    '',
    renderList(report.migratedRisk).trimEnd(),
    '',
    '## Blockers',
    '',
    renderList(report.blockers).trimEnd(),
    '',
    '## Missing Evidence',
    '',
    renderList(report.missingEvidence).trimEnd(),
    '',
    '## Allowed Claims',
    '',
    renderList(report.allowedClaims).trimEnd(),
    '',
    '## Forbidden Claims',
    '',
    renderList(report.forbiddenClaims).trimEnd(),
    '',
  ]
  return `${lines.join('\n')}\n`
}

const usage = (): string => `\
Usage:
  pnpm exec tsx packages/logix-perf-evidence/scripts/ci.adversarial-matrix-report.ts --diff <diff.json> [--before <before.json>] [--after <after.json>] [--profile <adversarial-default|adversarial-soak|adversarial-quick>] [--out <report.md>] [--json-out <report.json>] [--allow-clue]

Notes:
  This script reads existing evidence only. It does not collect benchmarks.
`

const parseArgs = (argv: ReadonlyArray<string>) => {
  const get = (name: string): string | undefined => {
    const idx = argv.lastIndexOf(name)
    if (idx < 0) return undefined
    const value = argv[idx + 1]
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${name}`)
    return value
  }
  const diff = get('--diff')
  if (!diff) throw new Error(`Missing --diff\n\n${usage()}`)
  return {
    diff,
    before: get('--before'),
    after: get('--after'),
    profile: get('--profile'),
    out: get('--out'),
    jsonOut: get('--json-out'),
    allowClue: argv.includes('--allow-clue'),
  }
}

const readJson = async <T>(file: string): Promise<T> => JSON.parse(await fs.readFile(file, 'utf8')) as T

const writeTextIfRequested = async (file: string | undefined, content: string): Promise<void> => {
  if (!file) return
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, content, 'utf8')
}

export const runAdversarialMatrixReportCli = async (argv: ReadonlyArray<string>): Promise<AdversarialMatrixReport> => {
  const args = parseArgs(argv)
  const diff = await readJson<AdversarialMatrixDiffLike>(args.diff)
  const before = args.before ? await readJson<AdversarialMatrixPerfReportLike>(args.before) : undefined
  const after = args.after ? await readJson<AdversarialMatrixPerfReportLike>(args.after) : undefined
  const report = classifyAdversarialMatrix({
    diff,
    before,
    after,
    profile: args.profile,
    inputs: { diff: args.diff, ...(args.before ? { before: args.before } : {}), ...(args.after ? { after: args.after } : {}) },
  })
  await writeTextIfRequested(args.out, renderAdversarialMatrixMarkdown(report))
  await writeTextIfRequested(args.jsonOut, `${JSON.stringify(report, null, 2)}\n`)
  return report
}

if (process.argv[1]?.endsWith('ci.adversarial-matrix-report.ts')) {
  runAdversarialMatrixReportCli(process.argv.slice(2))
    .then((report) => {
      if (report.claimStrength === 'hard') return
      if (report.claimStrength === 'clue' && process.argv.includes('--allow-clue')) return
      process.exitCode = 1
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error))
      process.exitCode = 1
    })
}
