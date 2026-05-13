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

export type FieldKernelDirtyWorkTaxClassification =
  | 'tax_removed'
  | 'tax_migrated'
  | 'stable_guarded'
  | 'inconclusive'
  | 'failed'
export type FieldKernelDirtyWorkTaxClaimStrength = 'hard' | 'clue' | 'none'

export type FieldKernelDirtyWorkTaxReport = {
  readonly schemaVersion: 1
  readonly suiteIds: ReadonlyArray<string>
  readonly classification: FieldKernelDirtyWorkTaxClassification
  readonly claimStrength: FieldKernelDirtyWorkTaxClaimStrength
  readonly profile: string
  readonly gates: ReadonlyArray<{
    readonly id: string
    readonly passed: boolean
    readonly severity: 'hard' | 'clue'
    readonly detail: string
  }>
  readonly blockers: ReadonlyArray<string>
  readonly totalFindings: ReadonlyArray<{
    readonly suiteId: string
    readonly metric: string
    readonly improved: number
    readonly regressed: number
    readonly missing: number
    readonly unavailable: number
    readonly bestP95DeltaMs?: number
    readonly worstP95DeltaMs?: number
  }>
  readonly phaseFindings: ReadonlyArray<{
    readonly suiteId: string
    readonly name: string
    readonly before?: number
    readonly after?: number
    readonly delta?: number
    readonly interpretation: 'removed' | 'increased' | 'stable' | 'missing'
  }>
  readonly migratedCosts: ReadonlyArray<string>
  readonly allowedClaims: ReadonlyArray<string>
  readonly forbiddenClaims: ReadonlyArray<string>
  readonly inputs: {
    readonly diff?: string
    readonly before?: string
    readonly after?: string
  }
}

const FIELD_KERNEL_SUITE_IDS = [
  'converge.steps',
  'converge.txnCommit',
  'converge.timeSlicing',
  'converge.timeSlicing.txnCommit',
  'form.listScopeCheck',
  'externalStore.ingest',
  'externalStore.ingest.tickNotify',
  'negativeBoundaries.dirtyPattern',
] as const

const WATCHED_EVIDENCE_PREFIXES = [
  'fieldKernel.converge',
  'fieldKernel.validate',
  'fieldKernel.source',
  'fieldKernel.externalStore',
  'fieldKernel.dirtyPlan',
  'fieldKernel.fallback',
  'fieldKernel.diagnosticsOff',
  'converge.',
  'validate.',
  'source.',
  'externalStore.',
  'dirtyPlan.',
] as const

const WATCHED_EVIDENCE_NAMES = [
  'cache.size',
  'cache.hit',
  'cache.miss',
  'cache.evict',
  'cache.invalidate',
  'diagnostics.level',
  'workload.modules',
  'workload.ticksPerRun',
  'workload.externalStores',
] as const

const DEFAULT_COUNTER_EPSILON = 0

const usage = (): string => `\
Usage:
  pnpm perf ci:field-kernel-dirty-work-tax-report -- --diff <diff.json> [--before <before.json>] [--after <after.json>] [--profile <quick|default|soak>] [--out <report.md>] [--json-out <report.json>]

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

const isFieldKernelSuiteId = (id: string): boolean => (FIELD_KERNEL_SUITE_IDS as ReadonlyArray<string>).includes(id)

const fieldKernelSuites = (diff: PerfDiffLike): ReadonlyArray<SuiteDiffLike> =>
  (diff.suites ?? []).filter((suite) => isFieldKernelSuiteId(suite.id))

const suiteHasBadPointStatus = (report: PerfReportLike | undefined): boolean =>
  Boolean(
    report?.suites
      ?.filter((suite) => isFieldKernelSuiteId(suite.id))
      .some((suite) => suite.points?.some((point) => point.status === 'timeout' || point.status === 'failed')),
  )

const hasTimeoutOrFailedMarker = (
  suites: ReadonlyArray<SuiteDiffLike>,
  beforeReport: PerfReportLike | undefined,
  afterReport: PerfReportLike | undefined,
): boolean =>
  suites.some((suite) => {
    const notes = suite.notes?.toLowerCase() ?? ''
    return notes.includes('timeout') || notes.includes('failed')
  }) ||
  suiteHasBadPointStatus(beforeReport) ||
  suiteHasBadPointStatus(afterReport)

const hasDirtyWarning = (
  diff: PerfDiffLike,
  beforeReport: PerfReportLike | undefined,
  afterReport: PerfReportLike | undefined,
): boolean => {
  const warnings = diff.meta?.comparability?.warnings ?? []
  return warnings.some((w) => w.startsWith('git.dirty.')) || beforeReport?.meta?.git?.dirty === true || afterReport?.meta?.git?.dirty === true
}

const hasStabilityWarning = (diff: PerfDiffLike, suites: ReadonlyArray<SuiteDiffLike>): boolean => {
  const warnings = diff.meta?.comparability?.warnings ?? []
  return warnings.some((w) => w.includes('stabilityWarning')) || suites.some((suite) => suite.notes?.includes('stabilityWarning'))
}

const isWatchedEvidence = (name: string): boolean =>
  WATCHED_EVIDENCE_PREFIXES.some((prefix) => name.startsWith(prefix)) ||
  (WATCHED_EVIDENCE_NAMES as ReadonlyArray<string>).includes(name)

const totalFindings = (suites: ReadonlyArray<SuiteDiffLike>): FieldKernelDirtyWorkTaxReport['totalFindings'] =>
  suites.flatMap((suite) =>
    (suite.metricDeltas ?? []).map((metric) => ({
      suiteId: suite.id,
      metric: metric.metric,
      improved: metric.topImprovements.length,
      regressed: metric.topRegressions.length,
      missing: metric.missing,
      unavailable: metric.unavailable,
      bestP95DeltaMs: metric.topImprovements[0]?.deltaMs.p95Ms,
      worstP95DeltaMs: metric.topRegressions[0]?.deltaMs.p95Ms,
    })),
  )

const hasTotalImprovement = (findings: FieldKernelDirtyWorkTaxReport['totalFindings']): boolean =>
  findings.some((finding) => finding.improved > 0 && (finding.bestP95DeltaMs ?? 0) < 0)

const hasTotalRegression = (findings: FieldKernelDirtyWorkTaxReport['totalFindings']): boolean =>
  findings.some((finding) => finding.regressed > 0 && (finding.worstP95DeltaMs ?? 0) > 0)

const phaseFindings = (
  suites: ReadonlyArray<SuiteDiffLike>,
  epsilon: number,
): FieldKernelDirtyWorkTaxReport['phaseFindings'] =>
  suites
    .flatMap((suite) =>
      (suite.evidenceDeltas ?? [])
        .filter((delta) => isWatchedEvidence(delta.name))
        .map((delta) => {
          const before = asNumber(delta.before.value)
          const after = asNumber(delta.after.value)
          const valueMissing = before === undefined || after === undefined

          if (valueMissing) {
            return {
              suiteId: suite.id,
              name: delta.name,
              before,
              after,
              interpretation: 'missing' as const,
            }
          }

          const valueDelta = after - before
          const interpretation: FieldKernelDirtyWorkTaxReport['phaseFindings'][number]['interpretation'] =
            valueDelta < -epsilon ? 'removed' : valueDelta > epsilon ? 'increased' : 'stable'

          return {
            suiteId: suite.id,
            name: delta.name,
            before,
            after,
            delta: valueDelta,
            interpretation,
          }
        }),
    )
    .sort((a, b) => `${a.suiteId}:${a.name}`.localeCompare(`${b.suiteId}:${b.name}`))

const unique = (values: ReadonlyArray<string>): ReadonlyArray<string> => Array.from(new Set(values)).sort((a, b) => a.localeCompare(b))

const allowedClaims = (classification: FieldKernelDirtyWorkTaxClassification): ReadonlyArray<string> => {
  const base = ['Focused validation passed.']
  if (classification === 'tax_removed') {
    return [...base, 'Comparable focused evidence supports FieldKernel dirty-work reduction.']
  }
  if (classification === 'stable_guarded') {
    return [...base, 'Structural FieldKernel dirty-work sentinels pass; performance improvement is not hard-claimed.']
  }
  if (classification === 'tax_migrated') {
    return [...base, 'Focused evidence improved total cost, but migrated dirty-work cost must be resolved before broad claims.']
  }
  return base
}

const forbiddenClaims = (): ReadonlyArray<string> => [
  'Global Runtime performance improved.',
  'No global regressions.',
  'All field-kernel dirty work is fixed.',
  'FieldKernel is optimal.',
  'Production performance improved globally.',
]

export const buildFieldKernelDirtyWorkTaxReport = (args: {
  readonly diff: PerfDiffLike
  readonly beforeReport?: PerfReportLike
  readonly afterReport?: PerfReportLike
  readonly profile?: string
  readonly inputs?: FieldKernelDirtyWorkTaxReport['inputs']
  readonly counterEpsilon?: number
}): FieldKernelDirtyWorkTaxReport => {
  const diff = args.diff
  const suites = fieldKernelSuites(diff)
  const suiteIds = suites.map((suite) => suite.id)
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
  const stabilityWarning = hasStabilityWarning(diff, suites)
  const timeoutOrFailed = hasTimeoutOrFailedMarker(suites, args.beforeReport, args.afterReport)
  const totals = totalFindings(suites)
  const phases = phaseFindings(suites, epsilon)
  const missingSuiteEvidence = suites.length === 0
  const missingMetricEvidence =
    totals.length === 0 ||
    totals.every(
      (finding) =>
        finding.improved === 0 &&
        finding.regressed === 0 &&
        finding.bestP95DeltaMs === undefined &&
        finding.worstP95DeltaMs === undefined,
    )
  const missingPhaseEvidence = phases.length === 0 || phases.some((finding) => finding.interpretation === 'missing')

  const gates: FieldKernelDirtyWorkTaxReport['gates'] = [
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
      id: 'suiteEvidence',
      passed: !missingSuiteEvidence,
      severity: 'clue',
      detail: `one or more field-kernel suites must be present: ${FIELD_KERNEL_SUITE_IDS.join(', ')}`,
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
      detail: 'field-kernel before/after points must not timeout or fail',
    },
    {
      id: 'metricEvidence',
      passed: !missingMetricEvidence,
      severity: 'clue',
      detail: 'field-kernel metric deltas must be present and available',
    },
    {
      id: 'phaseEvidence',
      passed: !missingPhaseEvidence,
      severity: 'clue',
      detail: 'field-kernel watched dirty-work evidence must be present and available',
    },
  ]

  const blockers: string[] = []
  if (!profileHardEligible) blockers.push(`profile=${profile} is clue-only; hard claims require default or soak`)
  if (!comparable) blockers.push('diff comparability is false')
  if (missingSuiteEvidence) blockers.push('field-kernel suite evidence is missing')
  if (dirty) blockers.push('git dirty evidence is clue-only')
  if (stabilityWarning) blockers.push('stability warnings make this clue-only')
  if (warnings.length > 0 && !dirty && !stabilityWarning) blockers.push('comparability warnings are present')
  if (regressions !== 0) blockers.push('summary.regressions must be 0 for a hard claim')
  if (budgetViolations !== 0) blockers.push('summary.budgetViolations must be 0 for a hard claim')
  if (timeoutOrFailed) blockers.push('field-kernel suite has timeout/failed marker')
  if (missingMetricEvidence) blockers.push('metric delta evidence is missing or unavailable')
  if (missingPhaseEvidence) blockers.push('watched field-kernel dirty work evidence is missing or unavailable')

  const hasHardEvidence = !gates.some((gate) => gate.severity === 'clue' && !gate.passed)
  const hasHardFailure = gates.some((gate) => gate.severity === 'hard' && !gate.passed)
  const hasClueOnlyGate = gates.some((gate) => gate.severity === 'clue' && !gate.passed)
  const migratedCosts = unique(phases.filter((finding) => finding.interpretation === 'increased').map((finding) => finding.name))
  const improvedWatched = phases.some((finding) => finding.interpretation === 'removed')
  const improvedTotal = hasTotalImprovement(totals)
  const regressedTotal = hasTotalRegression(totals)

  let classification: FieldKernelDirtyWorkTaxClassification = 'inconclusive'
  let claimStrength: FieldKernelDirtyWorkTaxClaimStrength = 'none'

  if (timeoutOrFailed || (hasHardEvidence && (hasHardFailure || regressedTotal))) {
    classification = 'failed'
    claimStrength = 'none'
  } else if (hasClueOnlyGate) {
    classification = 'inconclusive'
    claimStrength = 'clue'
  } else if (improvedTotal && migratedCosts.length > 0) {
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
    suiteIds,
    classification,
    claimStrength,
    profile,
    gates,
    blockers,
    totalFindings: totals,
    phaseFindings: phases,
    migratedCosts,
    allowedClaims: allowedClaims(classification),
    forbiddenClaims: forbiddenClaims(),
    inputs: args.inputs ?? {},
  }
}

const formatValue = (value: number | undefined): string => (value === undefined ? 'n/a' : value.toFixed(4))

export const renderFieldKernelDirtyWorkTaxReportMarkdown = (report: FieldKernelDirtyWorkTaxReport): string => {
  const lines: string[] = []
  lines.push('# FieldKernel Dirty Work Tax Migration Report')
  lines.push('')
  lines.push(`- suiteIds: ${report.suiteIds.map((suiteId) => `\`${suiteId}\``).join(', ') || '`none`'}`)
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
  lines.push('## Total Metrics')
  if (report.totalFindings.length === 0) {
    lines.push('- no field-kernel metric delta available')
  } else {
    for (const finding of report.totalFindings) {
      lines.push(
        `- \`${finding.suiteId}:${finding.metric}\`: improved=${finding.improved}, regressed=${finding.regressed}, missing=${finding.missing}, unavailable=${finding.unavailable}, bestP95DeltaMs=${formatValue(
          finding.bestP95DeltaMs,
        )}, worstP95DeltaMs=${formatValue(finding.worstP95DeltaMs)}`,
      )
    }
  }

  lines.push('')
  lines.push('## Watched Dirty Work')
  if (report.phaseFindings.length === 0) {
    lines.push('- no fieldKernel.* dirty-work evidence available')
  } else {
    for (const finding of report.phaseFindings) {
      lines.push(
        `- \`${finding.suiteId}:${finding.name}\`: before=${formatValue(finding.before)}, after=${formatValue(
          finding.after,
        )}, delta=${formatValue(finding.delta)}, interpretation=${finding.interpretation}`,
      )
    }
  }

  if (report.migratedCosts.length > 0) {
    lines.push('')
    lines.push('## Migrated Costs')
    for (const name of report.migratedCosts) {
      lines.push(`- ${name}`)
    }
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

  const report = buildFieldKernelDirtyWorkTaxReport({
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

  const markdown = renderFieldKernelDirtyWorkTaxReportMarkdown(report)
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
