import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

type Primitive = string | number | boolean

type EvidenceAgg = {
  readonly ok: number
  readonly unavailable: number
  readonly missing: number
  readonly value?: number | string
}

type EvidenceDelta = {
  readonly name: string
  readonly unit?: string
  readonly scope?: string
  readonly before: EvidenceAgg
  readonly after: EvidenceAgg
  readonly message?: string
}

type MetricDeltaPoint = {
  readonly params: Record<string, Primitive>
  readonly deltaMs: { readonly medianMs: number; readonly p95Ms: number }
  readonly ratio: { readonly median: number; readonly p95: number }
}

type MetricDeltaSummary = {
  readonly metric: string
  readonly unit: 'ms'
  readonly compared: number
  readonly missing: number
  readonly unavailable: number
  readonly topRegressions: ReadonlyArray<MetricDeltaPoint>
  readonly topImprovements: ReadonlyArray<MetricDeltaPoint>
}

type SuiteDiffLike = {
  readonly id: string
  readonly notes?: string
  readonly evidenceDeltas?: ReadonlyArray<EvidenceDelta>
  readonly metricDeltas?: ReadonlyArray<MetricDeltaSummary>
}

export type PerfDiffLike = {
  readonly schemaVersion: number
  readonly meta?: {
    readonly from?: { readonly file?: string; readonly commit?: string }
    readonly to?: { readonly file?: string; readonly commit?: string }
    readonly comparability?: {
      readonly comparable: boolean
      readonly allowConfigDrift: boolean
      readonly allowEnvDrift: boolean
      readonly configMismatches?: ReadonlyArray<string>
      readonly envMismatches?: ReadonlyArray<string>
      readonly warnings?: ReadonlyArray<string>
    }
  }
  readonly summary?: {
    readonly regressions?: number
    readonly improvements?: number
    readonly budgetViolations?: number
  }
  readonly suites?: ReadonlyArray<SuiteDiffLike>
}

type PerfReportLike = {
  readonly meta?: {
    readonly config?: { readonly profile?: string }
    readonly git?: { readonly dirty?: boolean }
  }
  readonly suites?: ReadonlyArray<{
    readonly id: string
    readonly points?: ReadonlyArray<{ readonly status?: string; readonly reason?: string }>
  }>
}

export type SelectorNotifyTaxClassification =
  | 'tax_removed'
  | 'tax_migrated'
  | 'stable_guarded'
  | 'inconclusive'
  | 'failed'
export type SelectorNotifyTaxClaimStrength = 'hard' | 'clue' | 'none'

export type SelectorNotifyTaxReport = {
  readonly schemaVersion: 1
  readonly suiteId: 'runtimeStore.noTearing.tickNotify'
  readonly classification: SelectorNotifyTaxClassification
  readonly claimStrength: SelectorNotifyTaxClaimStrength
  readonly profile: string
  readonly gates: ReadonlyArray<{
    readonly id: string
    readonly passed: boolean
    readonly severity: 'hard' | 'clue'
    readonly detail: string
  }>
  readonly blockers: ReadonlyArray<string>
  readonly totalFindings: ReadonlyArray<{
    readonly metric: string
    readonly improved: number
    readonly regressed: number
    readonly missing: number
    readonly unavailable: number
    readonly bestP95DeltaMs?: number
    readonly worstP95DeltaMs?: number
  }>
  readonly watchedFindings: ReadonlyArray<{
    readonly name: string
    readonly before?: number
    readonly after?: number
    readonly delta?: number
    readonly interpretation: 'removed' | 'increased' | 'stable' | 'missing'
  }>
  readonly migratedPhases: ReadonlyArray<string>
  readonly allowedClaims: ReadonlyArray<string>
  readonly forbiddenClaims: ReadonlyArray<string>
  readonly inputs: {
    readonly diff?: string
    readonly before?: string
    readonly after?: string
  }
}

const SUITE_ID = 'runtimeStore.noTearing.tickNotify'
const TOTAL_METRIC = 'timePerTickMs'
const WATCHED_COUNTERS = [
  'selectorNotify.notifiedTopicCount',
  'selectorNotify.renderCount',
  'selectorNotify.runSyncFallbackCount',
  'selectorNotify.retainedTopicCount',
  'selectorNotify.listenerSnapshotCloneCount',
  'selectorNotify.broadcastFallbackCount',
] as const
const DEFAULT_COUNTER_EPSILON = 0

const usage = (): string => `\
Usage:
  pnpm perf ci:selector-notify-tax-report -- --diff <diff.json> [--before <before.json>] [--after <after.json>] [--profile <quick|default|soak>] [--out <report.md>] [--json-out <report.json>]

Notes:
  The script reads existing evidence only. It does not run perf collection and does not define suite budgets.
`

const parseArgs = (argv: ReadonlyArray<string>) => {
  const get = (name: string): string | undefined => {
    const idx = argv.lastIndexOf(name)
    if (idx < 0) return undefined
    const value = argv[idx + 1]
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${name}`)
    }
    return value
  }

  const diff = get('--diff')
  const before = get('--before')
  const after = get('--after')
  const profile = get('--profile')
  const out = get('--out')
  const jsonOut = get('--json-out')

  if (!diff) {
    throw new Error(`Missing --diff\n\n${usage()}`)
  }

  return { diff, before, after, profile, out, jsonOut }
}

const readJson = async <T>(file: string): Promise<T> => JSON.parse(await fs.readFile(file, 'utf8')) as T

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

const asNumber = (value: number | string | undefined): number | undefined => (isFiniteNumber(value) ? value : undefined)

const inferProfile = (args: {
  readonly explicitProfile?: string
  readonly beforeReport?: PerfReportLike
  readonly afterReport?: PerfReportLike
}): string => {
  if (args.explicitProfile && args.explicitProfile.trim().length > 0) {
    return args.explicitProfile.trim()
  }

  const before = args.beforeReport?.meta?.config?.profile
  const after = args.afterReport?.meta?.config?.profile
  if (before && after && before === after) return before
  if (after) return after
  if (before) return before
  return 'unknown'
}

const findSelectorSuite = (diff: PerfDiffLike): SuiteDiffLike | undefined => diff.suites?.find((suite) => suite.id === SUITE_ID)

const suiteHasBadPointStatus = (report: PerfReportLike | undefined): boolean =>
  Boolean(
    report?.suites
      ?.find((suite) => suite.id === SUITE_ID)
      ?.points?.some((point) => point.status === 'timeout' || point.status === 'failed'),
  )

const hasTimeoutOrFailedMarker = (
  suite: SuiteDiffLike | undefined,
  beforeReport: PerfReportLike | undefined,
  afterReport: PerfReportLike | undefined,
): boolean => {
  const notes = suite?.notes?.toLowerCase() ?? ''
  return notes.includes('timeout') || notes.includes('failed') || suiteHasBadPointStatus(beforeReport) || suiteHasBadPointStatus(afterReport)
}

const hasDirtyWarning = (
  diff: PerfDiffLike,
  beforeReport: PerfReportLike | undefined,
  afterReport: PerfReportLike | undefined,
): boolean => {
  const warnings = diff.meta?.comparability?.warnings ?? []
  return warnings.some((w) => w.startsWith('git.dirty.')) || beforeReport?.meta?.git?.dirty === true || afterReport?.meta?.git?.dirty === true
}

const hasStabilityWarning = (diff: PerfDiffLike, suite: SuiteDiffLike | undefined): boolean => {
  const warnings = diff.meta?.comparability?.warnings ?? []
  return warnings.some((w) => w.includes('stabilityWarning')) || Boolean(suite?.notes?.includes('stabilityWarning'))
}

const totalFindings = (suite: SuiteDiffLike | undefined): SelectorNotifyTaxReport['totalFindings'] =>
  (suite?.metricDeltas ?? [])
    .filter((metric) => metric.metric === TOTAL_METRIC)
    .map((metric) => ({
      metric: metric.metric,
      improved: metric.topImprovements.length,
      regressed: metric.topRegressions.length,
      missing: metric.missing,
      unavailable: metric.unavailable,
      bestP95DeltaMs: metric.topImprovements[0]?.deltaMs.p95Ms,
      worstP95DeltaMs: metric.topRegressions[0]?.deltaMs.p95Ms,
    }))

const hasTotalImprovement = (findings: SelectorNotifyTaxReport['totalFindings']): boolean =>
  findings.some((finding) => finding.improved > 0 && (finding.bestP95DeltaMs ?? 0) < 0)

const hasTotalRegression = (findings: SelectorNotifyTaxReport['totalFindings']): boolean =>
  findings.some((finding) => finding.regressed > 0 && (finding.worstP95DeltaMs ?? 0) > 0)

const watchedFindings = (
  suite: SuiteDiffLike | undefined,
  epsilon: number,
): SelectorNotifyTaxReport['watchedFindings'] => {
  const evidence = suite?.evidenceDeltas ?? []
  return WATCHED_COUNTERS.map((name) => {
    const delta = evidence.find((item) => item.name === name)
    const before = asNumber(delta?.before.value)
    const after = asNumber(delta?.after.value)
    const valueMissing =
      !delta ||
      before === undefined ||
      after === undefined ||
      delta.before.missing > 0 ||
      delta.after.missing > 0 ||
      delta.before.unavailable > 0 ||
      delta.after.unavailable > 0

    if (valueMissing) {
      return { name, before, after, interpretation: 'missing' as const }
    }

    const valueDelta = after - before
    const interpretation: SelectorNotifyTaxReport['watchedFindings'][number]['interpretation'] =
      valueDelta < -epsilon ? 'removed' : valueDelta > epsilon ? 'increased' : 'stable'

    return { name, before, after, delta: valueDelta, interpretation }
  })
}

const allowedClaims = (classification: SelectorNotifyTaxClassification): ReadonlyArray<string> => {
  const base = ['Focused validation passed.']
  if (classification === 'tax_removed') {
    return [...base, 'Comparable focused evidence supports selector notify path improvement.']
  }
  if (classification === 'stable_guarded') {
    return [...base, 'Structural selector notify sentinels pass; performance improvement is not hard-claimed.']
  }
  return base
}

const forbiddenClaims = (): ReadonlyArray<string> => [
  'Global Runtime performance improved.',
  'No global regressions.',
  'React performance is fixed.',
  'Selector notify path is optimal.',
]

export const buildSelectorNotifyTaxReport = (args: {
  readonly diff: PerfDiffLike
  readonly beforeReport?: PerfReportLike
  readonly afterReport?: PerfReportLike
  readonly profile?: string
  readonly inputs?: SelectorNotifyTaxReport['inputs']
  readonly counterEpsilon?: number
}): SelectorNotifyTaxReport => {
  const diff = args.diff
  const suite = findSelectorSuite(diff)
  const profile = inferProfile({
    explicitProfile: args.profile,
    beforeReport: args.beforeReport,
    afterReport: args.afterReport,
  })
  const epsilon = args.counterEpsilon ?? DEFAULT_COUNTER_EPSILON

  const comparable = diff.meta?.comparability?.comparable === true
  const warnings = diff.meta?.comparability?.warnings ?? []
  const regressions = diff.summary?.regressions ?? 0
  const budgetViolations = diff.summary?.budgetViolations ?? 0
  const profileHardEligible = profile === 'default' || profile === 'soak'
  const dirty = hasDirtyWarning(diff, args.beforeReport, args.afterReport)
  const stabilityWarning = hasStabilityWarning(diff, suite)
  const timeoutOrFailed = hasTimeoutOrFailedMarker(suite, args.beforeReport, args.afterReport)
  const totals = totalFindings(suite)
  const watched = watchedFindings(suite, epsilon)
  const missingMetricEvidence = totals.length === 0 || totals.some((finding) => finding.missing > 0 || finding.unavailable > 0)
  const missingWatchedEvidence = watched.some((finding) => finding.interpretation === 'missing')

  const gates: SelectorNotifyTaxReport['gates'] = [
    {
      id: 'profile',
      passed: profileHardEligible,
      severity: 'clue',
      detail: `profile=${profile}; hard claims require default or soak`,
    },
    {
      id: 'comparable',
      passed: comparable,
      severity: 'clue',
      detail: 'diff.meta.comparability.comparable must be true',
    },
    {
      id: 'regressions',
      passed: regressions === 0,
      severity: 'hard',
      detail: `summary.regressions=${regressions}`,
    },
    {
      id: 'budgetViolations',
      passed: budgetViolations === 0,
      severity: 'hard',
      detail: `summary.budgetViolations=${budgetViolations}`,
    },
    {
      id: 'warnings',
      passed: warnings.length === 0 && !dirty && !stabilityWarning,
      severity: 'clue',
      detail: warnings.length > 0 ? warnings.join('; ') : 'no comparability warnings',
    },
    {
      id: 'pointStatus',
      passed: !timeoutOrFailed,
      severity: 'hard',
      detail: `${SUITE_ID} before/after points must not timeout or fail`,
    },
    {
      id: 'metricEvidence',
      passed: !missingMetricEvidence,
      severity: 'hard',
      detail: `${TOTAL_METRIC} metric delta must be present and available`,
    },
    {
      id: 'watchedEvidence',
      passed: !missingWatchedEvidence,
      severity: 'hard',
      detail: 'selector notify watched evidence must be present and available',
    },
  ]

  const blockers: string[] = []
  if (!profileHardEligible) blockers.push(`profile=${profile} is clue-only; hard claims require default or soak`)
  if (!comparable) blockers.push('diff comparability is false')
  if (dirty) blockers.push('git dirty evidence is clue-only')
  if (stabilityWarning) blockers.push('stability warnings make this clue-only')
  if (warnings.length > 0 && !dirty && !stabilityWarning) blockers.push('comparability warnings are present')
  if (regressions !== 0) blockers.push('summary.regressions must be 0 for a hard claim')
  if (budgetViolations !== 0) blockers.push('summary.budgetViolations must be 0 for a hard claim')
  if (timeoutOrFailed) blockers.push(`${SUITE_ID} has timeout/failed marker`)
  if (missingMetricEvidence) blockers.push('metric delta evidence is missing or unavailable')
  if (missingWatchedEvidence) blockers.push('watched selector notify evidence is missing or unavailable')

  const hasHardFailure = gates.some((gate) => gate.severity === 'hard' && !gate.passed)
  const hasClueOnlyGate = gates.some((gate) => gate.severity === 'clue' && !gate.passed)
  const migratedPhases = watched.filter((finding) => finding.interpretation === 'increased').map((finding) => finding.name)
  const improvedWatched = watched.some((finding) => finding.interpretation === 'removed')
  const improvedTotal = hasTotalImprovement(totals)
  const regressedTotal = hasTotalRegression(totals)

  let classification: SelectorNotifyTaxClassification = 'inconclusive'
  let claimStrength: SelectorNotifyTaxClaimStrength = 'none'

  if (hasHardFailure || regressedTotal) {
    classification = 'failed'
    claimStrength = 'none'
  } else if (hasClueOnlyGate) {
    classification = 'inconclusive'
    claimStrength = 'clue'
  } else if (improvedTotal && migratedPhases.length > 0) {
    classification = 'tax_migrated'
    claimStrength = 'hard'
  } else if (improvedTotal) {
    classification = 'tax_removed'
    claimStrength = 'hard'
  } else if (improvedWatched) {
    classification = 'stable_guarded'
    claimStrength = 'hard'
  } else {
    classification = 'inconclusive'
    claimStrength = 'none'
  }

  return {
    schemaVersion: 1,
    suiteId: SUITE_ID,
    classification,
    claimStrength,
    profile,
    gates,
    blockers,
    totalFindings: totals,
    watchedFindings: watched,
    migratedPhases,
    allowedClaims: allowedClaims(classification),
    forbiddenClaims: forbiddenClaims(),
    inputs: args.inputs ?? {},
  }
}

const formatValue = (value: number | undefined): string => (value === undefined ? 'n/a' : value.toFixed(4))

export const renderSelectorNotifyTaxReportMarkdown = (report: SelectorNotifyTaxReport): string => {
  const lines: string[] = []
  lines.push('# Selector Notify Tax Migration Report')
  lines.push('')
  lines.push(`- suite: \`${report.suiteId}\``)
  lines.push(`- profile: \`${report.profile}\``)
  lines.push(`- classification: \`${report.classification}\``)
  lines.push(`- claimStrength: \`${report.claimStrength}\``)

  const inputEntries = Object.entries(report.inputs).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  if (inputEntries.length > 0) {
    lines.push('')
    lines.push('## Inputs')
    for (const [name, value] of inputEntries) {
      lines.push(`- ${name}: \`${value}\``)
    }
  }

  lines.push('')
  lines.push('## Gates')
  for (const gate of report.gates) {
    lines.push(`- ${gate.passed ? 'PASS' : 'BLOCK'} \`${gate.id}\` (${gate.severity}): ${gate.detail}`)
  }

  if (report.blockers.length > 0) {
    lines.push('')
    lines.push('## Blockers')
    for (const blocker of report.blockers) {
      lines.push(`- ${blocker}`)
    }
  }

  lines.push('')
  lines.push('## Total Metric')
  if (report.totalFindings.length === 0) {
    lines.push(`- no ${TOTAL_METRIC} delta available`)
  } else {
    for (const finding of report.totalFindings) {
      lines.push(
        `- \`${finding.metric}\`: improved=${finding.improved}, regressed=${finding.regressed}, missing=${finding.missing}, unavailable=${finding.unavailable}, bestP95DeltaMs=${formatValue(
          finding.bestP95DeltaMs,
        )}, worstP95DeltaMs=${formatValue(finding.worstP95DeltaMs)}`,
      )
    }
  }

  lines.push('')
  lines.push('## Watched Counters')
  for (const finding of report.watchedFindings) {
    lines.push(
      `- \`${finding.name}\`: before=${formatValue(finding.before)}, after=${formatValue(finding.after)}, delta=${formatValue(
        finding.delta,
      )}, interpretation=${finding.interpretation}`,
    )
  }

  lines.push('')
  lines.push('## Claims')
  lines.push('Allowed:')
  for (const claim of report.allowedClaims) {
    lines.push(`- ${claim}`)
  }
  lines.push('')
  lines.push('Forbidden:')
  for (const claim of report.forbiddenClaims) {
    lines.push(`- ${claim}`)
  }

  lines.push('')
  return `${lines.join('\n')}\n`
}

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2))
  const [diff, beforeReport, afterReport] = await Promise.all([
    readJson<PerfDiffLike>(args.diff),
    args.before ? readJson<PerfReportLike>(args.before) : Promise.resolve(undefined),
    args.after ? readJson<PerfReportLike>(args.after) : Promise.resolve(undefined),
  ])

  const report = buildSelectorNotifyTaxReport({
    diff,
    beforeReport,
    afterReport,
    profile: args.profile,
    inputs: {
      diff: args.diff,
      before: args.before,
      after: args.after,
    },
  })

  if (args.jsonOut) {
    await fs.mkdir(path.dirname(args.jsonOut), { recursive: true })
    await fs.writeFile(args.jsonOut, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    // eslint-disable-next-line no-console
    console.log(`[logix-perf] wrote ${args.jsonOut}`)
  }

  const markdown = renderSelectorNotifyTaxReportMarkdown(report)
  if (args.out) {
    await fs.mkdir(path.dirname(args.out), { recursive: true })
    await fs.writeFile(args.out, markdown, 'utf8')
    // eslint-disable-next-line no-console
    console.log(`[logix-perf] wrote ${args.out}`)
    return
  }

  // eslint-disable-next-line no-console
  console.log(markdown.trimEnd())
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err)
    process.exitCode = 1
  })
}
