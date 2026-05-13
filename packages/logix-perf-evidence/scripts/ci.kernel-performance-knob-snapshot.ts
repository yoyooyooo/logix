import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import {
  KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_COUNTER_IDS,
  KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_SUITE_IDS,
  type KernelPerformanceConvergenceRequiredCounterId,
  type KernelPerformanceConvergenceRequiredSuiteId,
} from './ci.kernel-performance-convergence-stage-gate.js'
import {
  claimBoundary,
  runtimeMappingForSuite,
  type KernelPerformanceClaimBoundary,
  type KernelPerformanceRuntimeMapping,
} from './lib/kernel-performance-observability.js'

type Primitive = string | number | boolean
type UnknownRecord = Record<string, unknown>

type EvidenceResult = Readonly<{
  readonly name?: unknown
  readonly status?: unknown
  readonly value?: unknown
  readonly unit?: unknown
  readonly unavailableReason?: unknown
}>

type MetricResult = Readonly<{
  readonly name?: unknown
  readonly status?: unknown
  readonly stats?: Readonly<{ readonly medianMs?: unknown; readonly p95Ms?: unknown }>
  readonly unavailableReason?: unknown
}>

type PointResult = Readonly<{
  readonly params?: Record<string, Primitive>
  readonly status?: unknown
  readonly reason?: unknown
  readonly metrics?: ReadonlyArray<MetricResult>
  readonly evidence?: ReadonlyArray<EvidenceResult>
}>

type SuiteResult = Readonly<{
  readonly id?: unknown
  readonly title?: unknown
  readonly priority?: unknown
  readonly primaryAxis?: unknown
  readonly points?: ReadonlyArray<PointResult>
}>

type PerfReport = Readonly<{
  readonly schemaVersion?: unknown
  readonly meta?: Readonly<{
    readonly createdAt?: unknown
    readonly generator?: unknown
    readonly matrixId?: unknown
    readonly matrixUpdatedAt?: unknown
    readonly matrixHash?: unknown
    readonly git?: Readonly<{ readonly branch?: unknown; readonly commit?: unknown; readonly dirty?: unknown }>
    readonly config?: Readonly<{
      readonly profile?: unknown
      readonly runs?: unknown
      readonly warmupDiscard?: unknown
      readonly timeoutMs?: unknown
    }>
    readonly env?: Readonly<{
      readonly os?: unknown
      readonly arch?: unknown
      readonly node?: unknown
      readonly pnpm?: unknown
      readonly vitest?: unknown
      readonly playwright?: unknown
      readonly browser?: Readonly<{ readonly name?: unknown; readonly version?: unknown; readonly headless?: unknown }>
    }>
  }>
  readonly suites?: ReadonlyArray<SuiteResult>
}>

export type KernelPerformanceCounterCensusEntry = Readonly<{
  readonly counter: KernelPerformanceConvergenceRequiredCounterId
  readonly stage: 'P0' | 'P1' | 'P2' | 'final'
  readonly status: 'present' | 'missing'
  readonly value?: number
  readonly sourceSuite?: string
  readonly sourceName?: string
  readonly sourceFile?: string
}>

export type KernelPerformanceKnobCell = Readonly<{
  readonly cellId: string
  readonly suiteId: string
  readonly owner: string
  readonly status: 'pass' | 'fail' | 'timeout' | 'missing' | 'skipped'
  readonly knobs: Record<string, Primitive>
  readonly mapping: KernelPerformanceRuntimeMapping
  readonly sourceFile: string
}>

export type KernelPerformanceKnobSnapshotReport = Readonly<{
  readonly schemaVersion: 1
  readonly kind: 'KernelPerformanceKnobSnapshotReport'
  readonly generatedAt: string
  readonly profile: string
  readonly envId?: string
  readonly commitSha?: string
  readonly branch?: string
  readonly workflow?: string
  readonly runId?: string
  readonly matrixId?: string
  readonly matrixHash?: string
  readonly sourceReport: string
  readonly summary: {
    readonly suites: number
    readonly cells: number
    readonly pass: number
    readonly fail: number
    readonly timeout: number
    readonly missing: number
    readonly skipped: number
    readonly markers: number
    readonly countersPresent: number
    readonly countersMissing: number
  }
  readonly suiteStatus: ReadonlyArray<Readonly<{
    readonly id: string
    readonly status: 'pass' | 'fail' | 'timeout' | 'missing' | 'skipped'
    readonly pointCount: number
  }>>
  readonly requiredSuites: ReadonlyArray<Readonly<{
    readonly id: KernelPerformanceConvergenceRequiredSuiteId
    readonly status: 'pass' | 'fail' | 'timeout' | 'missing' | 'skipped'
  }>>
  readonly counterCensus: ReadonlyArray<KernelPerformanceCounterCensusEntry>
  readonly knobCells: ReadonlyArray<KernelPerformanceKnobCell>
  readonly metrics: ReadonlyArray<Readonly<{
    readonly suiteId: string
    readonly metric: string
    readonly ok: number
    readonly unavailable: number
    readonly maxMedianMs?: number
    readonly maxP95Ms?: number
  }>>
  readonly markers: ReadonlyArray<UnknownRecord>
  readonly missingEvidence: ReadonlyArray<string>
  readonly blocked: ReadonlyArray<string>
  readonly claimBoundary: KernelPerformanceClaimBoundary
  readonly allowedClaims: ReadonlyArray<string>
  readonly forbiddenClaims: ReadonlyArray<string>
}>

type BuildSnapshotArgs = Readonly<{
  readonly report: PerfReport
  readonly reportPath: string
  readonly profile?: string
  readonly envId?: string
  readonly examplesReport?: UnknownRecord
  readonly markers?: ReadonlyArray<UnknownRecord>
}>

const FORBIDDEN_CLAIMS = [
  'This snapshot proves a before/after performance improvement.',
  'This snapshot proves final 231-235 convergence.',
  'This snapshot proves release-safe runtime performance.',
] as const

const SUITE_OWNER: Readonly<Record<string, string>> = {
  'negativeBoundaries.dirtyPattern': 'dirtyPlan/source/selector',
  'converge.txnCommit': 'field-kernel converge',
  'form.listScopeCheck': 'form/list evidence',
  'externalStore.ingest.tickNotify': 'source/external store',
  'runtimeStore.noTearing.tickNotify': 'RuntimeStore/React host',
  'react.strictSuspenseJitter': 'React host scheduling',
  'diagnostics.overhead': 'diagnostics',
  'diagnostics.overhead.e2e': 'diagnostics',
  'txnQueue.directIdle': 'txn queue / lane policy',
  'txnLanes.urgentBacklog': 'txn queue / lane policy',
  'dispatchShell.fixedCost': 'dispatch fixed-cost shell',
  'examples.runtimeWitness': 'examples runtime witness',
  'examples.playgroundNoiseIsolation': 'examples playground isolation',
}

const COUNTER_STAGE: Record<KernelPerformanceConvergenceRequiredCounterId, 'P0' | 'P1' | 'P2' | 'final'> = {
  'dirtyPlan.unknownWrite': 'P0',
  'dirtyPlan.missingRegistry': 'P0',
  'dirtyPlan.dirtyAll': 'P0',
  'dirtyPlan.nonFieldAuthority': 'P0',
  'dirtyPlan.legacyDirtyInput': 'P0',
  'source.fullFallback': 'P0',
  'source.rowFullScan': 'P0',
  'source.keyEval.unrelatedMutation': 'P0',
  'selector.evaluateAll': 'P0',
  'selector.dirtyAllFallback': 'P0',
  'selector.nonFieldAuthorityFallback': 'P0',
  'txnQueue.directIdleQueueWaitNonZero': 'P0',
  'txnQueue.directIdleBackpressureNonZero': 'P0',
  'dispatch.noTopicFanoutAlloc': 'P1',
  'runtimeStore.runSyncFallbackAfterBoot': 'P1',
  'runtimeStore.retainedTopicLeak': 'P1',
  'diagnosticsOff.payloadCount': 'P1',
  'listEvidence.stringNormalizeHotPath': 'P1',
  'examples.kernelPlaygroundCostMixed': 'P2',
  'examples.publicResidueViolation': 'P2',
}

const COUNTER_ALIASES: Record<KernelPerformanceConvergenceRequiredCounterId, ReadonlyArray<string>> = {
  'dirtyPlan.unknownWrite': ['dirtyPlan.unknownWrite', 'dirtyPlanUnknownWrite', 'unknownWriteCount'],
  'dirtyPlan.missingRegistry': ['dirtyPlan.missingRegistry', 'dirtyPlanMissingRegistry', 'missingRegistryCount'],
  'dirtyPlan.dirtyAll': ['dirtyPlan.dirtyAll', 'dirtyPlanDirtyAll', 'dirtyAllCount', 'dirtyAllFallbackCount'],
  'dirtyPlan.nonFieldAuthority': ['dirtyPlan.nonFieldAuthority', 'dirtyPlanNonFieldAuthority', 'nonFieldAuthorityCount'],
  'dirtyPlan.legacyDirtyInput': ['dirtyPlan.legacyDirtyInput', 'dirtyPlanLegacyDirtyInput', 'legacyDirtyInputCount'],
  'source.fullFallback': ['source.fullFallback', 'source.fullFallbackCount', 'sourceFullFallbackCount'],
  'source.rowFullScan': ['source.rowFullScan', 'source.rowFullScanCount', 'sourceRowFullScanCount'],
  'source.keyEval.unrelatedMutation': [
    'source.keyEval.unrelatedMutation',
    'source.keyEval.unrelatedMutationCount',
    'sourceKeyEvalUnrelatedMutation',
    'sourceUnrelatedKeyEvalCount',
  ],
  'selector.evaluateAll': ['selector.evaluateAll', 'selector.evaluateAllCount', 'selectorEvaluateAllCount'],
  'selector.dirtyAllFallback': ['selector.dirtyAllFallback', 'selector.dirtyAllFallbackCount'],
  'selector.nonFieldAuthorityFallback': [
    'selector.nonFieldAuthorityFallback',
    'selector.nonFieldAuthorityFallbackCount',
  ],
  'txnQueue.directIdleQueueWaitNonZero': ['txnQueue.directIdleQueueWaitNonZero'],
  'txnQueue.directIdleBackpressureNonZero': ['txnQueue.directIdleBackpressureNonZero'],
  'dispatch.noTopicFanoutAlloc': ['dispatch.noTopicFanoutAlloc', 'dispatchNoTopicFanoutAlloc', 'noTopicFanoutAlloc'],
  'runtimeStore.runSyncFallbackAfterBoot': [
    'runtimeStore.runSyncFallbackAfterBoot',
    'runtimeStore.runSyncFallbackAfterBootCount',
    'selectorNotify.runSyncFallbackCount',
    'runSyncFallbackCount',
  ],
  'runtimeStore.retainedTopicLeak': ['runtimeStore.retainedTopicLeak', 'runtimeStore.retainedTopicLeakCount'],
  'diagnosticsOff.payloadCount': ['diagnosticsOff.payloadCount', 'diagnosticsOffPayloadCount'],
  'listEvidence.stringNormalizeHotPath': [
    'listEvidence.stringNormalizeHotPath',
    'listEvidence.stringNormalizeHotPathCount',
  ],
  'examples.kernelPlaygroundCostMixed': ['examples.kernelPlaygroundCostMixed', 'kernelPlaygroundCostMixed'],
  'examples.publicResidueViolation': ['examples.publicResidueViolation', 'publicResidueViolation'],
}

const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null && !Array.isArray(value)
const stringValue = (value: unknown): string | undefined => (typeof value === 'string' && value.length > 0 ? value : undefined)
const booleanValue = (value: unknown): boolean | undefined => (typeof value === 'boolean' ? value : undefined)
const finiteNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

const readJson = async <T>(file: string): Promise<T> => JSON.parse(await fs.readFile(file, 'utf8')) as T

const writeJson = async (file: string, value: unknown): Promise<void> => {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

const suiteId = (suite: SuiteResult): string => stringValue(suite.id) ?? 'unknown'

const normalizePointStatus = (status: unknown): 'pass' | 'fail' | 'timeout' | 'missing' | 'skipped' => {
  if (status === 'ok' || status === 'pass' || status === 'passed') return 'pass'
  if (status === 'timeout') return 'timeout'
  if (status === 'skipped') return 'skipped'
  if (status === 'failed' || status === 'fail') return 'fail'
  return 'missing'
}

const combineStatuses = (statuses: ReadonlyArray<'pass' | 'fail' | 'timeout' | 'missing' | 'skipped'>) => {
  if (statuses.length === 0) return 'missing' as const
  if (statuses.includes('timeout')) return 'timeout' as const
  if (statuses.includes('fail')) return 'fail' as const
  if (statuses.every((status) => status === 'skipped')) return 'skipped' as const
  if (statuses.includes('missing')) return 'missing' as const
  return 'pass' as const
}

const cellIdFor = (suite: SuiteResult, point: PointResult): string => {
  const params = point.params ?? {}
  const paramsKey = Object.keys(params)
    .sort()
    .map((key) => `${key}=${String(params[key])}`)
    .join('|')
  return `${suiteId(suite)}${paramsKey ? `::${paramsKey}` : '::suite'}`
}

const ownerForSuite = (id: string): string => SUITE_OWNER[id] ?? 'unclassified'

const metricKey = (suite: string, metric: string): string => `${suite}\u0000${metric}`

const collectMetricSummary = (report: PerfReport): KernelPerformanceKnobSnapshotReport['metrics'] => {
  const byKey = new Map<string, { suiteId: string; metric: string; ok: number; unavailable: number; medians: number[]; p95s: number[] }>()
  for (const suite of report.suites ?? []) {
    const id = suiteId(suite)
    for (const point of suite.points ?? []) {
      for (const metric of point.metrics ?? []) {
        const name = stringValue(metric.name)
        if (!name) continue
        const key = metricKey(id, name)
        const prev = byKey.get(key) ?? { suiteId: id, metric: name, ok: 0, unavailable: 0, medians: [], p95s: [] }
        if (metric.status === 'ok') {
          prev.ok += 1
          const median = finiteNumber(metric.stats?.medianMs)
          const p95 = finiteNumber(metric.stats?.p95Ms)
          if (median !== undefined) prev.medians.push(median)
          if (p95 !== undefined) prev.p95s.push(p95)
        } else {
          prev.unavailable += 1
        }
        byKey.set(key, prev)
      }
    }
  }
  return Array.from(byKey.values())
    .map((item) => ({
      suiteId: item.suiteId,
      metric: item.metric,
      ok: item.ok,
      unavailable: item.unavailable,
      ...(item.medians.length > 0 ? { maxMedianMs: Math.max(...item.medians) } : {}),
      ...(item.p95s.length > 0 ? { maxP95Ms: Math.max(...item.p95s) } : {}),
    }))
    .sort((a, b) => `${a.suiteId}:${a.metric}`.localeCompare(`${b.suiteId}:${b.metric}`))
}

type EvidenceHit = Readonly<{ readonly value: number; readonly sourceSuite: string; readonly sourceName: string }>

const collectEvidenceHits = (report: PerfReport, examplesReport?: UnknownRecord): ReadonlyArray<EvidenceHit> => {
  const hits: EvidenceHit[] = []
  for (const suite of report.suites ?? []) {
    const id = suiteId(suite)
    for (const point of suite.points ?? []) {
      for (const evidence of point.evidence ?? []) {
        const name = stringValue(evidence.name)
        if (!name || evidence.status !== 'ok') continue
        const value = finiteNumber(evidence.value)
        if (value === undefined || value < 0) continue
        hits.push({ value, sourceSuite: id, sourceName: name })
      }
    }
  }

  const counters = examplesReport?.counters
  if (isRecord(counters)) {
    for (const [name, raw] of Object.entries(counters)) {
      const value = finiteNumber(raw)
      if (value === undefined || value < 0) continue
      hits.push({ value, sourceSuite: 'examples.playgroundIsolation', sourceName: name })
    }
  }

  hits.push(...deriveTxnQueueHits(report))
  return hits
}

const evidenceValue = (point: PointResult, name: string): number | undefined => {
  const evidence = point.evidence?.find((item) => item.name === name)
  if (!evidence || evidence.status !== 'ok') return undefined
  return finiteNumber(evidence.value)
}

const deriveTxnQueueHits = (report: PerfReport): ReadonlyArray<EvidenceHit> => {
  let directIdleQueueWaitNonZero = 0
  for (const suite of report.suites ?? []) {
    for (const point of suite.points ?? []) {
      const directIdle = evidenceValue(point, 'txnQueue.urgent.startMode.directIdle')
      const queueWait = evidenceValue(point, 'txnQueue.urgent.queueWaitMs')
      if (directIdle && directIdle > 0 && queueWait !== undefined && queueWait > 0) {
        directIdleQueueWaitNonZero += 1
      }
    }
  }
  return directIdleQueueWaitNonZero > 0
    ? [
        {
          value: directIdleQueueWaitNonZero,
          sourceSuite: 'txnQueue.directIdle',
          sourceName: 'derived.txnQueue.directIdleQueueWaitNonZero',
        },
      ]
    : []
}

const buildCounterCensus = (args: {
  readonly report: PerfReport
  readonly examplesReport?: UnknownRecord
  readonly sourceFile: string
}): ReadonlyArray<KernelPerformanceCounterCensusEntry> => {
  const hits = collectEvidenceHits(args.report, args.examplesReport)
  return KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_COUNTER_IDS.map((counter) => {
    const aliases = COUNTER_ALIASES[counter]
    const relevant = hits.filter((hit) => aliases.includes(hit.sourceName))
    if (relevant.length === 0) {
      return { counter, stage: COUNTER_STAGE[counter], status: 'missing' }
    }
    const selected = relevant.reduce((best, hit) => (hit.value > best.value ? hit : best), relevant[0]!)
    return {
      counter,
      stage: COUNTER_STAGE[counter],
      status: 'present',
      value: Math.floor(selected.value),
      sourceSuite: selected.sourceSuite,
      sourceName: selected.sourceName,
      sourceFile: args.sourceFile,
    }
  })
}

const buildKnobCells = (report: PerfReport, sourceFile: string): ReadonlyArray<KernelPerformanceKnobCell> =>
  (report.suites ?? []).flatMap((suite) => {
    const id = suiteId(suite)
    return (suite.points ?? []).map((point) => ({
      cellId: cellIdFor(suite, point),
      suiteId: id,
      owner: ownerForSuite(id),
      status: normalizePointStatus(point.status),
      knobs: point.params ?? {},
      mapping: runtimeMappingForSuite(id),
      sourceFile,
    }))
  })

const buildSuiteStatus = (report: PerfReport): KernelPerformanceKnobSnapshotReport['suiteStatus'] =>
  (report.suites ?? [])
    .map((suite) => {
      const statuses = (suite.points ?? []).map((point) => normalizePointStatus(point.status))
      return { id: suiteId(suite), status: combineStatuses(statuses), pointCount: statuses.length }
    })
    .sort((a, b) => a.id.localeCompare(b.id))

const buildRequiredSuites = (
  suiteStatus: KernelPerformanceKnobSnapshotReport['suiteStatus'],
  examplesReport?: UnknownRecord,
): KernelPerformanceKnobSnapshotReport['requiredSuites'] => {
  const byId = new Map(suiteStatus.map((suite) => [suite.id, suite.status]))
  const examplesSuites = examplesReport?.suites
  if (Array.isArray(examplesSuites)) {
    for (const suite of examplesSuites) {
      const id = isRecord(suite) ? stringValue(suite.id) : undefined
      if (!id) continue
      byId.set(id, normalizePointStatus(isRecord(suite) ? suite.status : undefined))
    }
  }
  return KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_SUITE_IDS.map((id) => ({ id, status: byId.get(id) ?? 'missing' }))
}

export const buildKernelPerformanceKnobSnapshot = (args: BuildSnapshotArgs): KernelPerformanceKnobSnapshotReport => {
  const profile =
    args.profile ??
    stringValue(args.report.meta?.config?.profile) ??
    stringValue(args.examplesReport?.profile) ??
    'unknown'
  const env = args.report.meta?.env
  const browser = env?.browser
  const envId =
    args.envId ??
    [
      stringValue(env?.os) ?? process.platform,
      stringValue(env?.arch) ?? process.arch,
      stringValue(browser?.name) ?? 'browser',
      stringValue(browser?.version) ?? 'unknown',
      booleanValue(browser?.headless) === false ? 'headed' : 'headless',
    ]
      .join('.')
      .replace(/[^A-Za-z0-9._-]+/g, '-')

  const suiteStatus = buildSuiteStatus(args.report)
  const knobCells = buildKnobCells(args.report, args.reportPath)
  const counterCensus = buildCounterCensus({
    report: args.report,
    examplesReport: args.examplesReport,
    sourceFile: args.reportPath,
  })
  const requiredSuites = buildRequiredSuites(suiteStatus, args.examplesReport)
  const statusCounts = knobCells.reduce(
    (acc, cell) => {
      acc[cell.status] += 1
      return acc
    },
    { pass: 0, fail: 0, timeout: 0, missing: 0, skipped: 0 },
  )
  const countersPresent = counterCensus.filter((entry) => entry.status === 'present').length
  const missingEvidence = [
    ...counterCensus.filter((entry) => entry.status === 'missing').map((entry) => `counter missing: ${entry.counter}`),
    ...requiredSuites.filter((suite) => suite.status === 'missing').map((suite) => `suite missing: ${suite.id}`),
  ]
  const markers = args.markers ?? []
  const blocked = [
    ...knobCells.filter((cell) => cell.status === 'fail' || cell.status === 'timeout').map((cell) => `${cell.cellId}: ${cell.status}`),
    ...markers.map((marker) => {
      const phase = stringValue(marker.phase) ?? 'unknown'
      const reason = stringValue(marker.reason) ?? stringValue(marker.status) ?? 'blocked'
      return `${phase}: ${reason}`
    }),
  ]

  return {
    schemaVersion: 1,
    kind: 'KernelPerformanceKnobSnapshotReport',
    generatedAt: new Date().toISOString(),
    profile,
    envId,
    commitSha: stringValue(args.report.meta?.git?.commit) ?? process.env.GITHUB_SHA,
    branch: stringValue(args.report.meta?.git?.branch) ?? process.env.GITHUB_REF_NAME,
    workflow: process.env.GITHUB_WORKFLOW,
    runId: process.env.GITHUB_RUN_ID,
    matrixId: stringValue(args.report.meta?.matrixId),
    matrixHash: stringValue(args.report.meta?.matrixHash),
    sourceReport: args.reportPath,
    summary: {
      suites: suiteStatus.length,
      cells: knobCells.length,
      ...statusCounts,
      markers: markers.length,
      countersPresent,
      countersMissing: counterCensus.length - countersPresent,
    },
    suiteStatus,
    requiredSuites,
    counterCensus,
    knobCells,
    metrics: collectMetricSummary(args.report),
    markers,
    missingEvidence,
    blocked,
    claimBoundary: claimBoundary({
      artifactRole: 'snapshot',
      claimStrength: 'current-state',
      allowedClaimKinds: ['current-state'],
    }),
    allowedClaims: [
      'This snapshot describes the current commit pressure vector, counter visibility, suite status, logs, and markers.',
      'Use same-branch trend or explicit convergence artifacts before making improvement claims.',
    ],
    forbiddenClaims: FORBIDDEN_CLAIMS,
  }
}

export const renderKernelPerformanceKnobSnapshotMarkdown = (report: KernelPerformanceKnobSnapshotReport): string => {
  const lines = [
    '# Kernel Performance Knob Snapshot',
    '',
    `profile: ${report.profile}`,
    `envId: ${report.envId ?? ''}`,
    `commitSha: ${report.commitSha ?? ''}`,
    `branch: ${report.branch ?? ''}`,
    `matrixId: ${report.matrixId ?? ''}`,
    `matrixHash: ${report.matrixHash ?? ''}`,
    `claimStrength: ${report.claimBoundary.claimStrength}`,
    '',
    '## Summary',
    '',
    `- suites: ${report.summary.suites}`,
    `- cells: ${report.summary.cells}`,
    `- pass/fail/timeout/missing/skipped: ${report.summary.pass}/${report.summary.fail}/${report.summary.timeout}/${report.summary.missing}/${report.summary.skipped}`,
    `- counters present/missing: ${report.summary.countersPresent}/${report.summary.countersMissing}`,
    `- markers: ${report.summary.markers}`,
    '',
    '## Counter Census',
    '',
    '| counter | stage | status | value | sourceSuite | sourceName |',
    '| --- | --- | --- | ---: | --- | --- |',
    ...report.counterCensus.map(
      (entry) =>
        `| ${entry.counter} | ${entry.stage} | ${entry.status} | ${entry.value ?? ''} | ${entry.sourceSuite ?? ''} | ${entry.sourceName ?? ''} |`,
    ),
    '',
    '## Required Suites',
    '',
    '| suite | status |',
    '| --- | --- |',
    ...report.requiredSuites.map((suite) => `| ${suite.id} | ${suite.status} |`),
    '',
    '## Blocked',
    '',
    ...(report.blocked.length > 0 ? report.blocked.slice(0, 25).map((item) => `- ${item}`) : ['- none']),
    '',
    '## Missing Evidence',
    '',
    ...(report.missingEvidence.length > 0 ? report.missingEvidence.slice(0, 40).map((item) => `- ${item}`) : ['- none']),
    '',
    '## Claim Boundary',
    '',
    ...report.forbiddenClaims.map((claim) => `- forbidden: ${claim}`),
    '',
  ]
  return `${lines.join('\n')}\n`
}

const usage = (): string => `\
Usage:
  pnpm exec tsx packages/logix-perf-evidence/scripts/ci.kernel-performance-knob-snapshot.ts --report <raw.json> --out-dir <perf/snapshot> [--profile default] [--env-id env] [--examples-report examples.json] [--marker marker.json]...
`

const values = (argv: ReadonlyArray<string>, name: string): ReadonlyArray<string> => {
  const out: string[] = []
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] !== name) continue
    const value = argv[i + 1]
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${name}`)
    out.push(value)
  }
  return out
}

const value = (argv: ReadonlyArray<string>, name: string): string | undefined => values(argv, name).at(-1)
const hasFlag = (argv: ReadonlyArray<string>, name: string): boolean => argv.includes(name)

const sha256 = async (file: string): Promise<string> => createHash('sha256').update(await fs.readFile(file)).digest('hex')

const walkFiles = async (dir: string): Promise<ReadonlyArray<string>> => {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  const out: string[] = []
  for (const entry of entries) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walkFiles(file)))
    else if (entry.isFile() && entry.name !== 'SHA256SUMS') out.push(file)
  }
  return out
}

const writeSha256Sums = async (outDir: string): Promise<void> => {
  const files = [...(await walkFiles(outDir))].sort()
  const lines: string[] = []
  for (const file of files) {
    lines.push(`${await sha256(file)}  ${path.relative(outDir, file).split(path.sep).join('/')}`)
  }
  await fs.writeFile(path.join(outDir, 'SHA256SUMS'), `${lines.join('\n')}\n`, 'utf8')
}

const fileExists = async (file: string): Promise<boolean> =>
  fs
    .access(file)
    .then(() => true)
    .catch(() => false)

const blockedReport = (args: { readonly profile?: string; readonly envId?: string }): PerfReport => {
  const [os, arch] = (args.envId ?? '').split('.')
  return {
    schemaVersion: 1,
    meta: {
      createdAt: new Date().toISOString(),
      generator: 'ci.kernel-performance-knob-snapshot.blocked',
      git: {
        branch: process.env.GITHUB_REF_NAME,
        commit: process.env.HEAD_SHA ?? process.env.GITHUB_SHA,
        dirty: false,
      },
      config: {
        profile: args.profile ?? process.env.PERF_PROFILE ?? 'unknown',
      },
      env: {
        os: os || process.env.RUNNER_OS || process.platform,
        arch: arch || process.env.RUNNER_ARCH || process.arch,
        node: process.version,
      },
    },
    suites: [],
  }
}

export const runKernelPerformanceKnobSnapshotCli = async (argv: ReadonlyArray<string>): Promise<KernelPerformanceKnobSnapshotReport> => {
  const reportPath = value(argv, '--report')
  const outDir = value(argv, '--out-dir') ?? 'perf/snapshot'
  if (!reportPath) throw new Error(`Missing --report\n\n${usage()}`)

  const profile = value(argv, '--profile')
  const envId = value(argv, '--env-id')
  const report = (await fileExists(reportPath))
    ? await readJson<PerfReport>(reportPath)
    : hasFlag(argv, '--allow-missing-report')
      ? blockedReport({ profile, envId })
      : await readJson<PerfReport>(reportPath)
  const examplesReportPath = value(argv, '--examples-report')
  const examplesReport = examplesReportPath ? await readJson<UnknownRecord>(examplesReportPath) : undefined
  const markerPaths = values(argv, '--marker')
  const markers = await Promise.all(markerPaths.map((file) => readJson<UnknownRecord>(file)))
  const snapshot = buildKernelPerformanceKnobSnapshot({
    report,
    reportPath,
    profile,
    envId,
    examplesReport,
    markers,
  })

  const rawName = `snapshot.${(snapshot.commitSha ?? 'unknown').slice(0, 8)}.${snapshot.envId ?? 'env'}.${snapshot.profile}.json`
  const normalizedPath = path.join(outDir, 'normalized', rawName)
  await writeJson(normalizedPath, report)
  await writeJson(path.join(outDir, 'metadata', 'run-env.json'), {
    schemaVersion: 1,
    generatedAt: snapshot.generatedAt,
    workflow: snapshot.workflow,
    runId: snapshot.runId,
    runner: { os: process.env.RUNNER_OS, arch: process.env.RUNNER_ARCH, name: process.env.RUNNER_NAME },
    envId: snapshot.envId,
    node: report.meta?.env?.node,
    pnpm: report.meta?.env?.pnpm,
    playwright: report.meta?.env?.playwright,
    browser: report.meta?.env?.browser,
    profile: snapshot.profile,
  })
  await writeJson(path.join(outDir, 'metadata', 'git.json'), {
    schemaVersion: 1,
    commitSha: snapshot.commitSha,
    branch: snapshot.branch,
    dirty: report.meta?.git?.dirty,
    ref: process.env.GITHUB_REF,
  })
  await writeJson(path.join(outDir, 'metadata', 'matrix.json'), {
    schemaVersion: 1,
    matrixId: snapshot.matrixId,
    matrixHash: snapshot.matrixHash,
    matrixUpdatedAt: report.meta?.matrixUpdatedAt,
    profile: snapshot.profile,
    sourceReport: reportPath,
  })
  await writeJson(path.join(outDir, 'metadata', 'knob-manifest.json'), {
    schemaVersion: 1,
    generatedAt: snapshot.generatedAt,
    profile: snapshot.profile,
    envId: snapshot.envId,
    matrixId: snapshot.matrixId,
    matrixHash: snapshot.matrixHash,
    cells: snapshot.knobCells,
  })
  await writeJson(path.join(outDir, 'counters', 'counter-census.json'), {
    schemaVersion: 1,
    generatedAt: snapshot.generatedAt,
    profile: snapshot.profile,
    envId: snapshot.envId,
    counters: snapshot.counterCensus,
  })
  await writeJson(path.join(outDir, 'reports', `snapshot.${snapshot.profile}.json`), snapshot)
  const md = renderKernelPerformanceKnobSnapshotMarkdown(snapshot)
  await fs.mkdir(path.join(outDir, 'reports'), { recursive: true })
  await fs.writeFile(path.join(outDir, 'reports', `snapshot.${snapshot.profile}.md`), md, 'utf8')
  await fs.writeFile(path.join(outDir, 'reports', 'summary.md'), md, 'utf8')
  await writeSha256Sums(outDir)

  if (process.env.GITHUB_STEP_SUMMARY) {
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, md, 'utf8')
  }

  return snapshot
}

if (process.argv[1]?.endsWith('ci.kernel-performance-knob-snapshot.ts')) {
  runKernelPerformanceKnobSnapshotCli(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
