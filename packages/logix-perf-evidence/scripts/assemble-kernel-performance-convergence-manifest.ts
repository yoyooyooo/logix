import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import {
  KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_COUNTER_IDS,
  KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_STAGE_IDS,
  KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_SUITE_IDS,
  type KernelPerformanceConvergenceManifest,
  type KernelPerformanceConvergenceRequiredCounterId,
  type KernelPerformanceConvergenceRequiredSuiteId,
  type KernelPerformanceConvergenceStageId,
} from './ci.kernel-performance-convergence-stage-gate.js'

export type KernelPerformanceConvergenceAssemblyInput = Readonly<{
  readonly schemaVersion?: 1
  readonly generatedAt?: string
  readonly envId?: string
  readonly profile?: string
  readonly matrixId?: string
  readonly matrixHash?: string
  readonly reports?: ReadonlyArray<unknown>
  readonly stages?: ReadonlyArray<Readonly<{
    readonly id: KernelPerformanceConvergenceStageId | string
    readonly status?: string
    readonly evidenceRefs?: ReadonlyArray<string>
    readonly notes?: string
  }>>
  readonly suites?: ReadonlyArray<Readonly<{ readonly id: string; readonly status?: string }>>
  readonly counters?: Partial<Record<KernelPerformanceConvergenceRequiredCounterId, number>>
  readonly sentinels?: Readonly<{
    readonly txnHotPath?: unknown
    readonly runtimeExternalStore?: unknown
    readonly kernelHotPathAudit?: unknown
  }>
  readonly localCi?: KernelPerformanceConvergenceManifest['localCi']
  readonly cloud?: KernelPerformanceConvergenceManifest['cloud']
  readonly evidenceRefs?: ReadonlyArray<string>
}>

type UnknownRecord = Record<string, unknown>

type CounterCandidate = Readonly<{
  readonly id: KernelPerformanceConvergenceRequiredCounterId
  readonly value: number
  readonly source: string
}>

const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null && !Array.isArray(value)

const isRequiredCounterId = (value: unknown): value is KernelPerformanceConvergenceRequiredCounterId =>
  typeof value === 'string' && (KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_COUNTER_IDS as ReadonlyArray<string>).includes(value)

const isRequiredSuiteId = (value: unknown): value is KernelPerformanceConvergenceRequiredSuiteId =>
  typeof value === 'string' && (KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_SUITE_IDS as ReadonlyArray<string>).includes(value)

const isStageId = (value: unknown): value is KernelPerformanceConvergenceStageId =>
  typeof value === 'string' && (KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_STAGE_IDS as ReadonlyArray<string>).includes(value)

const asCount = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return undefined
  return Math.floor(value)
}

const addCounter = (
  candidates: CounterCandidate[],
  id: KernelPerformanceConvergenceRequiredCounterId,
  value: unknown,
  source: string,
): void => {
  const count = asCount(value)
  if (count === undefined) return
  candidates.push({ id, value: count, source })
}

const readProp = (value: unknown, key: string): unknown => (isRecord(value) ? value[key] : undefined)

const getNested = (value: unknown, path: ReadonlyArray<string>): unknown => {
  let current: unknown = value
  for (const key of path) {
    current = readProp(current, key)
  }
  return current
}

const reportKind = (report: unknown): string => {
  const kind = readProp(report, 'kind')
  return typeof kind === 'string' ? kind : 'unknown'
}

const reportEvidenceRefs = (report: unknown): ReadonlyArray<string> => {
  const direct = readProp(report, 'evidenceRefs')
  if (Array.isArray(direct)) return direct.filter((value): value is string => typeof value === 'string')

  const inputs = readProp(report, 'inputs')
  if (!isRecord(inputs)) return []
  return Object.values(inputs).filter((value): value is string => typeof value === 'string' && value.length > 0)
}

const reportCounters = (report: unknown): CounterCandidate[] => {
  const out: CounterCandidate[] = []
  const kind = reportKind(report)

  const counters = readProp(report, 'counters')
  if (isRecord(counters)) {
    for (const [key, value] of Object.entries(counters)) {
      if (isRequiredCounterId(key)) addCounter(out, key, value === 'missing' ? undefined : value, `${kind}.counters`)
    }
  }

  const watchedCounters = readProp(report, 'watchedCounters')
  if (Array.isArray(watchedCounters)) {
    for (const entry of watchedCounters) {
      const id = readProp(entry, 'id')
      if (isRequiredCounterId(id)) addCounter(out, id, readProp(entry, 'value'), `${kind}.watchedCounters`)
    }
  }

  return out
}

const sentinelsToCounters = (sentinels: KernelPerformanceConvergenceAssemblyInput['sentinels']): CounterCandidate[] => {
  const out: CounterCandidate[] = []
  const txn = sentinels?.txnHotPath
  addCounter(out, 'dirtyPlan.dirtyAll', readProp(txn, 'dirtyAllFallbackCountP1Gate'), 'txnHotPathSentinels.dirtyAllFallbackCountP1Gate')
  addCounter(out, 'diagnosticsOff.payloadCount', readProp(txn, 'debugEventAllocCountOff'), 'txnHotPathSentinels.debugEventAllocCountOff')
  addCounter(out, 'listEvidence.stringNormalizeHotPath', readProp(txn, 'joinSplitInTxnWindowCount'), 'txnHotPathSentinels.joinSplitInTxnWindowCount')

  const runtimeExternalStore = sentinels?.runtimeExternalStore
  addCounter(
    out,
    'runtimeStore.runSyncFallbackAfterBoot',
    readProp(runtimeExternalStore, 'runSyncFallbackAfterBootCount'),
    'runtimeExternalStoreSentinels.runSyncFallbackAfterBootCount',
  )
  addCounter(
    out,
    'runtimeStore.retainedTopicLeak',
    readProp(runtimeExternalStore, 'activeReadQueryRetainCount'),
    'runtimeExternalStoreSentinels.activeReadQueryRetainCount',
  )

  const audit = sentinels?.kernelHotPathAudit
  const byArea = readProp(audit, 'byArea')
  const byReason = readProp(audit, 'byReason')
  if (isRecord(byReason)) {
    // Only map exact global fallback reasons when the audit exposes them. Area-specific exact counters should still be
    // preferred when supplied by a stage report or evidence-lock report.
    addCounter(out, 'dirtyPlan.unknownWrite', byReason.unknown_write, 'kernelHotPathAudit.byReason.unknown_write')
    addCounter(out, 'dirtyPlan.missingRegistry', byReason.missing_registry, 'kernelHotPathAudit.byReason.missing_registry')
  }
  if (isRecord(byArea)) {
    addCounter(out, 'source.fullFallback', byArea.source_dirty_gate, 'kernelHotPathAudit.byArea.source_dirty_gate')
    addCounter(out, 'selector.evaluateAll', byArea.selector_dirty_route, 'kernelHotPathAudit.byArea.selector_dirty_route')
  }

  return out
}

export const normalizeKernelPerformanceConvergenceCounters = (
  input: KernelPerformanceConvergenceAssemblyInput,
): Partial<Record<KernelPerformanceConvergenceRequiredCounterId, number>> => {
  const candidates: CounterCandidate[] = []
  for (const [id, value] of Object.entries(input.counters ?? {})) {
    if (isRequiredCounterId(id)) addCounter(candidates, id, value, 'assemblyInput.counters')
  }
  for (const report of input.reports ?? []) {
    candidates.push(...reportCounters(report))
  }
  candidates.push(...sentinelsToCounters(input.sentinels))

  const normalized: Partial<Record<KernelPerformanceConvergenceRequiredCounterId, number>> = {}
  for (const id of KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_COUNTER_IDS) {
    const exactInput = candidates.find((candidate) => candidate.id === id && candidate.source === 'assemblyInput.counters')
    const exactReport = candidates.find((candidate) => candidate.id === id && !candidate.source.includes('kernelHotPathAudit'))
    const fallback = candidates.find((candidate) => candidate.id === id)
    const selected = exactInput ?? exactReport ?? fallback
    if (selected) normalized[id] = selected.value
  }
  return normalized
}

const normalizeSuiteStatus = (status: unknown): 'pass' | 'fail' | 'timeout' | 'missing' => {
  if (status === 'pass') return 'pass'
  if (status === 'timeout') return 'timeout'
  if (status === 'fail' || status === 'failed') return 'fail'
  return 'missing'
}

const statusFromClaim = (report: unknown): 'pass' | 'fail' | 'missing' => {
  const classification = readProp(report, 'classification')
  if (classification === 'blocked' || classification === 'migrated_cost' || classification === 'migrated_risk') return 'fail'
  if (classification === 'incomplete' || classification === 'inconclusive') return 'missing'
  const claimStrength = readProp(report, 'claimStrength')
  if (claimStrength === 'hard' || claimStrength === 'clue') return 'pass'
  return 'missing'
}

const reportSuites = (report: unknown): ReadonlyArray<Readonly<{ readonly id: string; readonly status: 'pass' | 'fail' | 'timeout' | 'missing' }>> => {
  const direct = readProp(report, 'suites')
  if (Array.isArray(direct)) {
    return direct
      .map((suite) => ({ id: readProp(suite, 'id'), status: normalizeSuiteStatus(readProp(suite, 'status')) }))
      .filter((suite): suite is { id: string; status: 'pass' | 'fail' | 'timeout' | 'missing' } => typeof suite.id === 'string')
  }

  const requiredHotPaths = readProp(report, 'requiredHotPaths')
  if (Array.isArray(requiredHotPaths)) {
    const allPass = statusFromClaim(report) === 'pass'
    return [{ id: 'adversarial.matrix.requiredHotPaths', status: allPass ? 'pass' : statusFromClaim(report) }]
  }

  return []
}

const assembleSuites = (
  input: KernelPerformanceConvergenceAssemblyInput,
): ReadonlyArray<Readonly<{ readonly id: string; readonly status: 'pass' | 'fail' | 'timeout' | 'missing' }>> => {
  const byId = new Map<string, 'pass' | 'fail' | 'timeout' | 'missing'>()
  const set = (id: string, status: 'pass' | 'fail' | 'timeout' | 'missing') => {
    const previous = byId.get(id)
    if (previous === 'fail' || previous === 'timeout') return
    if (status === 'fail' || status === 'timeout') {
      byId.set(id, status)
      return
    }
    if (previous === 'pass') return
    byId.set(id, status)
  }

  for (const report of input.reports ?? []) {
    for (const suite of reportSuites(report)) set(suite.id, suite.status)
  }
  for (const suite of input.suites ?? []) set(suite.id, normalizeSuiteStatus(suite.status))

  return KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_SUITE_IDS.map((id) => ({ id, status: byId.get(id) ?? 'missing' }))
}

const stageFromReport = (stageId: KernelPerformanceConvergenceStageId, reports: ReadonlyArray<unknown>): NonNullable<KernelPerformanceConvergenceManifest['stages']>[number] | undefined => {
  if (stageId === 'adversarialMatrix') {
    const report = reports.find((candidate) => reportKind(candidate) === 'AdversarialPerformanceMatrixReport')
    if (!report) return undefined
    const status = statusFromClaim(report)
    return {
      id: stageId,
      status: status === 'pass' ? 'validated' : status === 'fail' ? 'blocked' : 'implemented',
      evidenceRefs: reportEvidenceRefs(report),
    }
  }

  if (stageId === 'P2') {
    const report = reports.find((candidate) => reportKind(candidate) === 'ExamplesPlaygroundIsolationReport')
    if (!report) return undefined
    const classification = readProp(report, 'classification')
    return {
      id: stageId,
      status: classification === 'isolated' ? 'validated' : classification === 'blocked' ? 'blocked' : 'implemented',
      evidenceRefs: reportEvidenceRefs(report),
    }
  }

  return undefined
}

const assembleStages = (input: KernelPerformanceConvergenceAssemblyInput): KernelPerformanceConvergenceManifest['stages'] => {
  const reports = input.reports ?? []
  const explicit = new Map((input.stages ?? []).map((stage) => [stage.id, stage]))
  return KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_STAGE_IDS.map((id) => {
    const explicitStage = explicit.get(id)
    if (explicitStage) {
      return {
        id,
        status: explicitStage.status ?? 'implemented',
        evidenceRefs: Array.from(new Set(explicitStage.evidenceRefs ?? [])).sort(),
        ...(explicitStage.notes ? { notes: explicitStage.notes } : {}),
      }
    }
    return stageFromReport(id, reports) ?? { id, status: 'not_started', evidenceRefs: [] }
  })
}

const firstNumberFromReports = (reports: ReadonlyArray<unknown>, paths: ReadonlyArray<ReadonlyArray<string>>): number | undefined => {
  for (const report of reports) {
    for (const p of paths) {
      const value = asCount(getNested(report, p))
      if (value !== undefined) return value
    }
  }
  return undefined
}

const firstBooleanFromReports = (reports: ReadonlyArray<unknown>, paths: ReadonlyArray<ReadonlyArray<string>>): boolean | undefined => {
  for (const report of reports) {
    for (const p of paths) {
      const value = getNested(report, p)
      if (typeof value === 'boolean') return value
    }
  }
  return undefined
}

const migrationCounts = (reports: ReadonlyArray<unknown>): { readonly migratedCost: number | undefined; readonly migratedRisk: number | undefined } => {
  let migratedCost = 0
  let migratedRisk = 0
  let seen = false
  for (const report of reports) {
    const directCost = asCount(readProp(report, 'migratedCost'))
    const directRisk = asCount(readProp(report, 'migratedRisk'))
    if (directCost !== undefined) {
      migratedCost += directCost
      seen = true
    } else {
      const costList = readProp(report, 'migratedCost')
      if (Array.isArray(costList)) {
        migratedCost += costList.length
        seen = true
      }
    }
    if (directRisk !== undefined) {
      migratedRisk += directRisk
      seen = true
    } else {
      const riskList = readProp(report, 'migratedRisk')
      if (Array.isArray(riskList)) {
        migratedRisk += riskList.length
        seen = true
      }
    }
    const riskOrCostMigration = readProp(report, 'riskOrCostMigration')
    if (isRecord(riskOrCostMigration)) {
      const c = asCount(riskOrCostMigration.migratedCost)
      const r = asCount(riskOrCostMigration.migratedRisk)
      if (c !== undefined) {
        migratedCost += c
        seen = true
      }
      if (r !== undefined) {
        migratedRisk += r
        seen = true
      }
    }
  }
  return seen ? { migratedCost, migratedRisk } : { migratedCost: undefined, migratedRisk: undefined }
}

export const assembleKernelPerformanceConvergenceManifest = (
  input: KernelPerformanceConvergenceAssemblyInput,
): KernelPerformanceConvergenceManifest => {
  const reports = input.reports ?? []
  const profile = input.profile ?? (getNested(reports[0], ['profile']) as string | undefined) ?? 'unknown'
  const migrated = migrationCounts(reports)

  const summary = {
    comparable: firstBooleanFromReports(reports, [['comparable']]),
    regressions: firstNumberFromReports(reports, [['summary', 'regressions'], ['regressions']]),
    budgetExceeded: firstNumberFromReports(reports, [['summary', 'budgetExceeded'], ['summary', 'budgetViolations'], ['budgetExceeded']]),
    timeouts: firstNumberFromReports(reports, [['summary', 'timeouts'], ['timeouts']]),
    stabilityWarnings: firstNumberFromReports(reports, [['summary', 'stabilityWarnings'], ['stabilityWarnings']]),
    missingSuites: firstNumberFromReports(reports, [['summary', 'missingSuites'], ['missingSuites']]),
  }

  const manifest: KernelPerformanceConvergenceManifest = {
    schemaVersion: 1,
    generatedAt: input.generatedAt ?? new Date(0).toISOString(),
    ...(input.envId ? { envId: input.envId } : {}),
    profile,
    ...(summary.comparable === undefined ? {} : { comparable: summary.comparable }),
    ...(summary.regressions === undefined ? {} : { regressions: summary.regressions }),
    ...(summary.budgetExceeded === undefined ? {} : { budgetExceeded: summary.budgetExceeded }),
    ...(summary.timeouts === undefined ? {} : { timeouts: summary.timeouts }),
    ...(summary.stabilityWarnings === undefined ? {} : { stabilityWarnings: summary.stabilityWarnings }),
    ...(summary.missingSuites === undefined ? {} : { missingSuites: summary.missingSuites }),
    stages: assembleStages(input),
    suites: assembleSuites(input),
    counters: normalizeKernelPerformanceConvergenceCounters(input),
    evidenceRefs: Array.from(new Set([...(input.evidenceRefs ?? []), ...reports.flatMap(reportEvidenceRefs)])).sort(),
    ...(input.localCi ? { localCi: input.localCi } : {}),
    migration: {
      ...(migrated.migratedCost === undefined ? {} : { migratedCost: migrated.migratedCost }),
      ...(migrated.migratedRisk === undefined ? {} : { migratedRisk: migrated.migratedRisk }),
    },
    cloud: input.cloud ?? {
      unableToVerify: ['Cloud LLM did not run local CI, browser suites, or performance collection for this assembled manifest.'],
    },
  }

  return manifest
}

const usage = (): string => `\
Usage:
  pnpm exec tsx packages/logix-perf-evidence/scripts/assemble-kernel-performance-convergence-manifest.ts --input <assembly.json> --out <manifest.json>

Notes:
  The assembly input may include reports, raw sentinels, explicit stage/suite statuses, counters, and cloud limitations.
  This script assembles a manifest only; run ci.kernel-performance-convergence-stage-gate.ts to classify it.
`

const parseArgs = (argv: ReadonlyArray<string>) => {
  const get = (name: string): string | undefined => {
    const idx = argv.lastIndexOf(name)
    if (idx < 0) return undefined
    const value = argv[idx + 1]
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${name}`)
    return value
  }
  const input = get('--input')
  const out = get('--out')
  if (!input || !out) throw new Error(`Missing --input or --out\n\n${usage()}`)
  return { input, out }
}

const readJson = async <T>(file: string): Promise<T> => JSON.parse(await fs.readFile(file, 'utf8')) as T

export const runKernelPerformanceConvergenceManifestAssemblerCli = async (
  argv: ReadonlyArray<string>,
): Promise<KernelPerformanceConvergenceManifest> => {
  const args = parseArgs(argv)
  const input = await readJson<KernelPerformanceConvergenceAssemblyInput>(args.input)
  const manifest = assembleKernelPerformanceConvergenceManifest(input)
  await fs.mkdir(path.dirname(args.out), { recursive: true })
  await fs.writeFile(args.out, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  return manifest
}

if (process.argv[1]?.endsWith('assemble-kernel-performance-convergence-manifest.ts')) {
  runKernelPerformanceConvergenceManifestAssemblerCli(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
