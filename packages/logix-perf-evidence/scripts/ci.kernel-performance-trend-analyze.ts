import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import type { KernelPerformanceKnobSnapshotReport } from './ci.kernel-performance-knob-snapshot.js'
import {
  claimBoundary,
  classifyTrendMovement,
  runtimeMappingForCounter,
  runtimeMappingForSuite,
  type KernelPerformanceClaimBoundary,
  type KernelPerformanceMovementClassification,
} from './lib/kernel-performance-observability.js'

type TrendStatus = 'stable' | 'movement' | 'incomparable' | 'insufficient'

export type KernelPerformanceTrendReport = Readonly<{
  readonly schemaVersion: 1
  readonly kind: 'KernelPerformanceTrendReport'
  readonly generatedAt: string
  readonly branch: string
  readonly profile: string
  readonly inputCount: number
  readonly comparableCount: number
  readonly status: TrendStatus
  readonly baseline?: Readonly<{ readonly commitSha?: string; readonly envId?: string; readonly matrixHash?: string }>
  readonly latest?: Readonly<{ readonly commitSha?: string; readonly envId?: string; readonly matrixHash?: string }>
  readonly counterMovements: ReadonlyArray<Readonly<{
    readonly counter: string
    readonly fromStatus: 'present' | 'missing'
    readonly toStatus: 'present' | 'missing'
    readonly fromValue?: number
    readonly toValue?: number
    readonly movement: 'missing_to_present' | 'present_to_missing' | 'zero_to_positive' | 'positive_to_zero' | 'value_changed'
  }>>
  readonly suiteMovements: ReadonlyArray<Readonly<{
    readonly suite: string
    readonly fromStatus: string
    readonly toStatus: string
  }>>
  readonly metricMovements: ReadonlyArray<Readonly<{
    readonly suiteId: string
    readonly metric: string
    readonly fromMaxP95Ms?: number
    readonly toMaxP95Ms?: number
    readonly deltaP95Ms?: number
    readonly ratioP95?: number
  }>>
  readonly markerMovements: Readonly<{ readonly from: number; readonly to: number }>
  readonly missingEvidenceMovements: Readonly<{ readonly from: number; readonly to: number }>
  readonly ownerMovements: ReadonlyArray<Readonly<{
    readonly ownerPath: string
    readonly classification: KernelPerformanceMovementClassification
    readonly counters: ReadonlyArray<string>
    readonly suites: ReadonlyArray<string>
    readonly metrics: ReadonlyArray<string>
  }>>
  readonly knobMovements: ReadonlyArray<Readonly<{
    readonly knob: string
    readonly ownerPath: string
    readonly classification: KernelPerformanceMovementClassification
  }>>
  readonly blockers: ReadonlyArray<string>
  readonly claimBoundary: KernelPerformanceClaimBoundary
  readonly allowedClaims: ReadonlyArray<string>
  readonly forbiddenClaims: ReadonlyArray<string>
}>

const FORBIDDEN_CLAIMS = [
  'Trend artifacts prove final 231-235 convergence.',
  'Trend artifacts replace explicit before/after convergence for scoped PR claims.',
  'LLM summary is a gate authority.',
] as const

const readJson = async <T>(file: string): Promise<T> => JSON.parse(await fs.readFile(file, 'utf8')) as T

const writeJson = async (file: string, value: unknown): Promise<void> => {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

const walkFiles = async (dir: string): Promise<ReadonlyArray<string>> => {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  const out: string[] = []
  for (const entry of entries) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walkFiles(file)))
    else if (entry.isFile()) out.push(file)
  }
  return out
}

const findSnapshotReports = async (inputDir: string): Promise<ReadonlyArray<string>> =>
  (await walkFiles(inputDir))
    .filter((file) => /reports[/\\]snapshot\.[^/\\]+\.json$/.test(file))
    .sort()

const shortCommit = (sha: string | undefined): string => (sha ?? 'unknown').slice(0, 8)

const comparableSnapshots = (snapshots: ReadonlyArray<KernelPerformanceKnobSnapshotReport>) => {
  if (snapshots.length === 0) return []
  const latest = snapshots[snapshots.length - 1]!
  return snapshots.filter(
    (snapshot) =>
      snapshot.profile === latest.profile &&
      snapshot.envId === latest.envId &&
      snapshot.matrixHash === latest.matrixHash,
  )
}

const counterById = (snapshot: KernelPerformanceKnobSnapshotReport) =>
  new Map(snapshot.counterCensus.map((entry) => [entry.counter, entry]))

const suiteById = (snapshot: KernelPerformanceKnobSnapshotReport) =>
  new Map(snapshot.requiredSuites.map((suite) => [suite.id, suite.status]))

const metricByKey = (snapshot: KernelPerformanceKnobSnapshotReport) =>
  new Map(snapshot.metrics.map((metric) => [`${metric.suiteId}\u0000${metric.metric}`, metric]))

const buildCounterMovements = (
  baseline: KernelPerformanceKnobSnapshotReport,
  latest: KernelPerformanceKnobSnapshotReport,
): KernelPerformanceTrendReport['counterMovements'] => {
  const before = counterById(baseline)
  const after = counterById(latest)
  const out: KernelPerformanceTrendReport['counterMovements'][number][] = []
  for (const counter of new Set([...before.keys(), ...after.keys()])) {
    const b = before.get(counter)
    const a = after.get(counter)
    const fromStatus = b?.status ?? 'missing'
    const toStatus = a?.status ?? 'missing'
    const fromValue = b?.value
    const toValue = a?.value
    let movement: KernelPerformanceTrendReport['counterMovements'][number]['movement'] | undefined
    if (fromStatus === 'missing' && toStatus === 'present') movement = 'missing_to_present'
    else if (fromStatus === 'present' && toStatus === 'missing') movement = 'present_to_missing'
    else if ((fromValue ?? 0) === 0 && (toValue ?? 0) > 0) movement = 'zero_to_positive'
    else if ((fromValue ?? 0) > 0 && (toValue ?? 0) === 0) movement = 'positive_to_zero'
    else if (fromValue !== undefined && toValue !== undefined && fromValue !== toValue) movement = 'value_changed'
    if (movement) out.push({ counter, fromStatus, toStatus, fromValue, toValue, movement })
  }
  return out.sort((a, b) => a.counter.localeCompare(b.counter))
}

const buildSuiteMovements = (
  baseline: KernelPerformanceKnobSnapshotReport,
  latest: KernelPerformanceKnobSnapshotReport,
): KernelPerformanceTrendReport['suiteMovements'] => {
  const before = suiteById(baseline)
  const after = suiteById(latest)
  const out: KernelPerformanceTrendReport['suiteMovements'][number][] = []
  for (const suite of new Set([...before.keys(), ...after.keys()])) {
    const fromStatus = before.get(suite) ?? 'missing'
    const toStatus = after.get(suite) ?? 'missing'
    if (fromStatus !== toStatus) out.push({ suite, fromStatus, toStatus })
  }
  return out.sort((a, b) => a.suite.localeCompare(b.suite))
}

const buildMetricMovements = (
  baseline: KernelPerformanceKnobSnapshotReport,
  latest: KernelPerformanceKnobSnapshotReport,
): KernelPerformanceTrendReport['metricMovements'] => {
  const before = metricByKey(baseline)
  const after = metricByKey(latest)
  const out: KernelPerformanceTrendReport['metricMovements'][number][] = []
  for (const key of new Set([...before.keys(), ...after.keys()])) {
    const b = before.get(key)
    const a = after.get(key)
    if (!b || !a || b.maxP95Ms === undefined || a.maxP95Ms === undefined) continue
    const deltaP95Ms = a.maxP95Ms - b.maxP95Ms
    if (Math.abs(deltaP95Ms) < 0.000001) continue
    out.push({
      suiteId: a.suiteId,
      metric: a.metric,
      fromMaxP95Ms: b.maxP95Ms,
      toMaxP95Ms: a.maxP95Ms,
      deltaP95Ms,
      ratioP95: b.maxP95Ms === 0 ? undefined : a.maxP95Ms / b.maxP95Ms,
    })
  }
  return out
    .sort((a, b) => Math.abs(b.deltaP95Ms ?? 0) - Math.abs(a.deltaP95Ms ?? 0))
    .slice(0, 50)
}

const buildOwnerMovements = (args: {
  readonly counterMovements: KernelPerformanceTrendReport['counterMovements']
  readonly suiteMovements: KernelPerformanceTrendReport['suiteMovements']
  readonly metricMovements: KernelPerformanceTrendReport['metricMovements']
}): KernelPerformanceTrendReport['ownerMovements'] => {
  const owners = new Map<string, { counters: Set<string>; suites: Set<string>; metrics: Set<string>; hasCounterRisk: boolean; hasBlocker: boolean; hasMetricIncrease: boolean; hasMetricDecrease: boolean }>()
  const ensure = (ownerPath: string) => {
    const current =
      owners.get(ownerPath) ??
      {
        counters: new Set<string>(),
        suites: new Set<string>(),
        metrics: new Set<string>(),
        hasCounterRisk: false,
        hasBlocker: false,
        hasMetricIncrease: false,
        hasMetricDecrease: false,
      }
    owners.set(ownerPath, current)
    return current
  }

  for (const movement of args.counterMovements) {
    const mapping = runtimeMappingForCounter(movement.counter)
    const owner = ensure(mapping.ownerPath)
    owner.counters.add(movement.counter)
    if (
      movement.movement === 'present_to_missing' ||
      movement.movement === 'zero_to_positive' ||
      (movement.movement === 'value_changed' && (movement.toValue ?? 0) > (movement.fromValue ?? 0))
    ) {
      owner.hasCounterRisk = true
    }
  }

  for (const movement of args.suiteMovements) {
    const mapping = runtimeMappingForSuite(movement.suite)
    const owner = ensure(mapping.ownerPath)
    owner.suites.add(movement.suite)
    if (movement.toStatus === 'fail' || movement.toStatus === 'timeout' || movement.toStatus === 'missing') {
      owner.hasBlocker = true
    }
  }

  for (const movement of args.metricMovements) {
    const mapping = runtimeMappingForSuite(movement.suiteId)
    const owner = ensure(mapping.ownerPath)
    owner.metrics.add(`${movement.suiteId}:${movement.metric}`)
    if ((movement.deltaP95Ms ?? 0) > 0) owner.hasMetricIncrease = true
    if ((movement.deltaP95Ms ?? 0) < 0) owner.hasMetricDecrease = true
  }

  return Array.from(owners.entries())
    .map(([ownerPath, movement]) => ({
      ownerPath,
      classification: classifyTrendMovement(movement),
      counters: Array.from(movement.counters).sort(),
      suites: Array.from(movement.suites).sort(),
      metrics: Array.from(movement.metrics).sort(),
    }))
    .sort((a, b) => a.ownerPath.localeCompare(b.ownerPath))
}

const buildKnobMovements = (
  ownerMovements: KernelPerformanceTrendReport['ownerMovements'],
): KernelPerformanceTrendReport['knobMovements'] => {
  const out = new Map<string, KernelPerformanceTrendReport['knobMovements'][number]>()
  for (const movement of ownerMovements) {
    const suiteIds = [...movement.suites, ...movement.metrics.map((metric) => metric.split(':')[0] ?? '')].filter(Boolean)
    const counterMappings = movement.counters.map((counter) => runtimeMappingForCounter(counter))
    const suiteMappings = suiteIds.map((suite) => runtimeMappingForSuite(suite))
    for (const mapping of [...counterMappings, ...suiteMappings]) {
      for (const knob of mapping.pressureKnobs) {
        const key = `${movement.ownerPath}\u0000${knob}`
        out.set(key, {
          knob,
          ownerPath: movement.ownerPath,
          classification: movement.classification,
        })
      }
    }
  }
  return Array.from(out.values()).sort((a, b) => `${a.ownerPath}:${a.knob}`.localeCompare(`${b.ownerPath}:${b.knob}`))
}

export const buildKernelPerformanceTrendReport = (args: {
  readonly branch: string
  readonly profile: string
  readonly snapshots: ReadonlyArray<KernelPerformanceKnobSnapshotReport>
}): KernelPerformanceTrendReport => {
  const comparable = comparableSnapshots(args.snapshots)
  const latest = args.snapshots.at(-1)
  const blockers: string[] = []
  if (args.snapshots.length < 2) blockers.push('fewer than two snapshot artifacts')
  if (latest && comparable.length < 2) {
    blockers.push('fewer than two comparable snapshot artifacts for latest env/profile/matrixHash')
  }

  const baseline = comparable.length >= 2 ? comparable[0] : undefined
  const head = comparable.length >= 2 ? comparable[comparable.length - 1] : undefined
  const counterMovements = baseline && head ? buildCounterMovements(baseline, head) : []
  const suiteMovements = baseline && head ? buildSuiteMovements(baseline, head) : []
  const metricMovements = baseline && head ? buildMetricMovements(baseline, head) : []
  const markerMovements = {
    from: baseline?.summary.markers ?? 0,
    to: head?.summary.markers ?? 0,
  }
  const missingEvidenceMovements = {
    from: baseline?.missingEvidence.length ?? 0,
    to: head?.missingEvidence.length ?? 0,
  }
  const ownerMovements = buildOwnerMovements({ counterMovements, suiteMovements, metricMovements })
  const knobMovements = buildKnobMovements(ownerMovements)

  const hasMovement =
    counterMovements.length > 0 ||
    suiteMovements.length > 0 ||
    metricMovements.length > 0 ||
    markerMovements.from !== markerMovements.to ||
    missingEvidenceMovements.from !== missingEvidenceMovements.to

  return {
    schemaVersion: 1,
    kind: 'KernelPerformanceTrendReport',
    generatedAt: new Date().toISOString(),
    branch: args.branch,
    profile: args.profile,
    inputCount: args.snapshots.length,
    comparableCount: comparable.length,
    status: blockers.length > 0 ? 'insufficient' : hasMovement ? 'movement' : 'stable',
    ...(baseline ? { baseline: { commitSha: baseline.commitSha, envId: baseline.envId, matrixHash: baseline.matrixHash } } : {}),
    ...(head ? { latest: { commitSha: head.commitSha, envId: head.envId, matrixHash: head.matrixHash } } : {}),
    counterMovements,
    suiteMovements,
    metricMovements,
    markerMovements,
    missingEvidenceMovements,
    ownerMovements,
    knobMovements,
    blockers,
    claimBoundary: claimBoundary({
      artifactRole: 'trend',
      claimStrength: 'trend-candidate',
      allowedClaimKinds: ['trend-prioritization'],
    }),
    allowedClaims: [
      'This report compares retained same-branch knob snapshot artifacts with matching env/profile/matrixHash.',
      'Use it to prioritize evidence gaps, regressions, timeout movement, and owner-path investigation.',
    ],
    forbiddenClaims: FORBIDDEN_CLAIMS,
  }
}

export const renderKernelPerformanceTrendMarkdown = (report: KernelPerformanceTrendReport): string => {
  const lines = [
    '# Kernel Performance Trend Report',
    '',
    `branch: ${report.branch}`,
    `profile: ${report.profile}`,
    `status: ${report.status}`,
    `inputCount: ${report.inputCount}`,
    `comparableCount: ${report.comparableCount}`,
    `baseline: ${shortCommit(report.baseline?.commitSha)} env=${report.baseline?.envId ?? ''}`,
    `latest: ${shortCommit(report.latest?.commitSha)} env=${report.latest?.envId ?? ''}`,
    `claimStrength: ${report.claimBoundary.claimStrength}`,
    '',
    '## Counter Movements',
    '',
    '| counter | movement | from | to |',
    '| --- | --- | ---: | ---: |',
    ...report.counterMovements.map(
      (item) => `| ${item.counter} | ${item.movement} | ${item.fromValue ?? item.fromStatus} | ${item.toValue ?? item.toStatus} |`,
    ),
    ...(report.counterMovements.length === 0 ? ['| none |  |  |  |'] : []),
    '',
    '## Suite Movements',
    '',
    '| suite | from | to |',
    '| --- | --- | --- |',
    ...report.suiteMovements.map((item) => `| ${item.suite} | ${item.fromStatus} | ${item.toStatus} |`),
    ...(report.suiteMovements.length === 0 ? ['| none |  |  |'] : []),
    '',
    '## Top Metric Movements',
    '',
    '| suite | metric | fromP95 | toP95 | deltaP95 | ratioP95 |',
    '| --- | --- | ---: | ---: | ---: | ---: |',
    ...report.metricMovements
      .slice(0, 20)
      .map(
        (item) =>
          `| ${item.suiteId} | ${item.metric} | ${item.fromMaxP95Ms ?? ''} | ${item.toMaxP95Ms ?? ''} | ${item.deltaP95Ms ?? ''} | ${item.ratioP95 ?? ''} |`,
      ),
    ...(report.metricMovements.length === 0 ? ['| none |  |  |  |  |  |'] : []),
    '',
    '## Owner Movements',
    '',
    '| owner | classification | counters | suites | metrics |',
    '| --- | --- | --- | --- | --- |',
    ...report.ownerMovements.map(
      (item) =>
        `| ${item.ownerPath} | ${item.classification} | ${item.counters.join(', ')} | ${item.suites.join(', ')} | ${item.metrics.join(', ')} |`,
    ),
    ...(report.ownerMovements.length === 0 ? ['| none |  |  |  |  |'] : []),
    '',
    '## Knob Movements',
    '',
    '| knob | owner | classification |',
    '| --- | --- | --- |',
    ...report.knobMovements.map((item) => `| ${item.knob} | ${item.ownerPath} | ${item.classification} |`),
    ...(report.knobMovements.length === 0 ? ['| none |  |  |'] : []),
    '',
    '## Blockers',
    '',
    ...(report.blockers.length > 0 ? report.blockers.map((item) => `- ${item}`) : ['- none']),
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
  pnpm exec tsx packages/logix-perf-evidence/scripts/ci.kernel-performance-trend-analyze.ts --input-dir <downloaded-artifacts> --out-dir <perf/trend> [--branch branch] [--profile default]
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
const artifactNameSegment = (value: string): string => value.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'unknown'

const sha256 = async (file: string): Promise<string> => createHash('sha256').update(await fs.readFile(file)).digest('hex')

const writeSha256Sums = async (outDir: string): Promise<void> => {
  const files = [...(await walkFiles(outDir)).filter((file) => path.basename(file) !== 'SHA256SUMS')].sort()
  const lines: string[] = []
  for (const file of files) {
    lines.push(`${await sha256(file)}  ${path.relative(outDir, file).split(path.sep).join('/')}`)
  }
  await fs.writeFile(path.join(outDir, 'SHA256SUMS'), `${lines.join('\n')}\n`, 'utf8')
}

export const runKernelPerformanceTrendAnalyzeCli = async (argv: ReadonlyArray<string>): Promise<KernelPerformanceTrendReport> => {
  const inputDir = value(argv, '--input-dir')
  const outDir = value(argv, '--out-dir') ?? 'perf/trend'
  if (!inputDir) throw new Error(`Missing --input-dir\n\n${usage()}`)
  const branch = value(argv, '--branch') ?? process.env.GITHUB_REF_NAME ?? 'unknown'
  const profile = value(argv, '--profile') ?? process.env.PERF_PROFILE ?? 'default'
  const branchSegment = artifactNameSegment(branch)
  const files = await findSnapshotReports(inputDir)
  const snapshots = (await Promise.all(files.map((file) => readJson<KernelPerformanceKnobSnapshotReport>(file))))
    .filter((snapshot) => snapshot.kind === 'KernelPerformanceKnobSnapshotReport')
    .filter((snapshot) => snapshot.profile === profile)
    .sort((a, b) => (a.generatedAt || '').localeCompare(b.generatedAt || ''))

  const report = buildKernelPerformanceTrendReport({ branch, profile, snapshots })
  await writeJson(path.join(outDir, 'metadata', 'artifact-index.json'), {
    schemaVersion: 1,
    generatedAt: report.generatedAt,
    branch,
    profile,
    inputDir,
    files,
  })
  await writeJson(path.join(outDir, 'reports', `trend.${branchSegment}.${profile}.json`), report)
  await writeJson(path.join(outDir, 'diff', `trend.${branchSegment}.${profile}.json`), {
    schemaVersion: 1,
    generatedAt: report.generatedAt,
    counterMovements: report.counterMovements,
    suiteMovements: report.suiteMovements,
    metricMovements: report.metricMovements,
    markerMovements: report.markerMovements,
    missingEvidenceMovements: report.missingEvidenceMovements,
  })
  const md = renderKernelPerformanceTrendMarkdown(report)
  await fs.mkdir(path.join(outDir, 'reports'), { recursive: true })
  await fs.writeFile(path.join(outDir, 'reports', `trend.${branchSegment}.${profile}.md`), md, 'utf8')
  await fs.writeFile(path.join(outDir, 'reports', 'summary.md'), md, 'utf8')
  await writeSha256Sums(outDir)
  if (process.env.GITHUB_STEP_SUMMARY) {
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, md, 'utf8')
  }
  return report
}

if (process.argv[1]?.endsWith('ci.kernel-performance-trend-analyze.ts')) {
  runKernelPerformanceTrendAnalyzeCli(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
