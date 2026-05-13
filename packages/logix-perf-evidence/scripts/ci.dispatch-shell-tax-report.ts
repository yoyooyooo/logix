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

type DispatchShellABLike = {
  readonly migratedCost?: boolean
  readonly migratedRisks?: ReadonlyArray<{ readonly name?: string; readonly deltaMs?: number }>
}

export type DispatchShellTaxClassification = 'tax_removed' | 'tax_migrated' | 'inconclusive' | 'failed'
export type DispatchShellTaxClaimStrength = 'hard' | 'clue' | 'none'

export type DispatchShellTaxReport = {
  readonly schemaVersion: 1
  readonly suiteId: 'dispatchShell.fixedCost'
  readonly classification: DispatchShellTaxClassification
  readonly claimStrength: DispatchShellTaxClaimStrength
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
  readonly phaseFindings: ReadonlyArray<{
    readonly name: string
    readonly before?: number
    readonly after?: number
    readonly deltaMs?: number
    readonly interpretation: 'removed' | 'increased' | 'stable' | 'missing'
  }>
  readonly inputs: {
    readonly diff?: string
    readonly before?: string
    readonly after?: string
    readonly ab?: string
  }
}

const SUITE_ID = 'dispatchShell.fixedCost'
const DEFAULT_PHASE_EPSILON_MS = 0.05

const usage = (): string => `\
Usage:
  pnpm perf ci:dispatch-shell-tax-report -- --diff <diff.json> [--before <before.json>] [--after <after.json>] [--ab <ab.json>] [--profile <quick|default|soak>] [--out <report.md>] [--json-out <report.json>]

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
  const ab = get('--ab')
  const profile = get('--profile')
  const out = get('--out')
  const jsonOut = get('--json-out')

  if (!diff) {
    throw new Error(`Missing --diff\n\n${usage()}`)
  }

  return { diff, before, after, ab, profile, out, jsonOut }
}

const readJson = async <T>(file: string): Promise<T> => {
  const text = await fs.readFile(file, 'utf8')
  return JSON.parse(text) as T
}

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

const asNumber = (value: number | string | undefined): number | undefined =>
  isFiniteNumber(value) ? value : undefined

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

const suiteHasBadPointStatus = (report: PerfReportLike | undefined): boolean =>
  Boolean(
    report?.suites
      ?.find((suite) => suite.id === SUITE_ID)
      ?.points?.some((point) => point.status === 'timeout' || point.status === 'failed'),
  )

const findDispatchSuite = (diff: PerfDiffLike): SuiteDiffLike | undefined =>
  diff.suites?.find((suite) => suite.id === SUITE_ID)

const hasTimeoutOrFailedMarker = (
  suite: SuiteDiffLike | undefined,
  beforeReport: PerfReportLike | undefined,
  afterReport: PerfReportLike | undefined,
): boolean => {
  const notes = suite?.notes?.toLowerCase() ?? ''
  return (
    notes.includes('timeout') ||
    notes.includes('failed') ||
    suiteHasBadPointStatus(beforeReport) ||
    suiteHasBadPointStatus(afterReport)
  )
}

const hasStabilityWarning = (diff: PerfDiffLike, suite: SuiteDiffLike | undefined): boolean => {
  const warnings = diff.meta?.comparability?.warnings ?? []
  return warnings.some((w) => w.includes('stabilityWarning')) || Boolean(suite?.notes?.includes('stabilityWarning'))
}

const hasDirtyWarning = (
  diff: PerfDiffLike,
  beforeReport: PerfReportLike | undefined,
  afterReport: PerfReportLike | undefined,
): boolean => {
  const warnings = diff.meta?.comparability?.warnings ?? []
  return warnings.some((w) => w.startsWith('git.dirty.')) || beforeReport?.meta?.git?.dirty === true || afterReport?.meta?.git?.dirty === true
}

const phaseDeltas = (suite: SuiteDiffLike | undefined, epsilonMs: number): DispatchShellTaxReport['phaseFindings'] => {
  const evidence = suite?.evidenceDeltas ?? []
  return evidence
    .filter((delta) => delta.name.startsWith('runtime.txnPhase.') && delta.name.endsWith('Ms'))
    .map((delta) => {
      const before = asNumber(delta.before.value)
      const after = asNumber(delta.after.value)
      const valueMissing = before === undefined || after === undefined || delta.before.missing > 0 || delta.after.missing > 0
      const unavailable = delta.before.unavailable > 0 || delta.after.unavailable > 0
      if (valueMissing || unavailable) {
        return {
          name: delta.name,
          before,
          after,
          interpretation: 'missing' as const,
        }
      }

      const deltaMs = after - before
      const interpretation: DispatchShellTaxReport['phaseFindings'][number]['interpretation'] =
        deltaMs < -epsilonMs
          ? 'removed'
          : deltaMs > epsilonMs
            ? 'increased'
            : 'stable'

      return {
        name: delta.name,
        before,
        after,
        deltaMs,
        interpretation,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

const totalFindings = (suite: SuiteDiffLike | undefined): DispatchShellTaxReport['totalFindings'] =>
  (suite?.metricDeltas ?? [])
    .filter((metric) => metric.metric === 'runtime.txnCommitMs')
    .map((metric) => ({
      metric: metric.metric,
      improved: metric.topImprovements.length,
      regressed: metric.topRegressions.length,
      missing: metric.missing,
      unavailable: metric.unavailable,
      bestP95DeltaMs: metric.topImprovements[0]?.deltaMs.p95Ms,
      worstP95DeltaMs: metric.topRegressions[0]?.deltaMs.p95Ms,
    }))

const hasTotalImprovement = (findings: DispatchShellTaxReport['totalFindings']): boolean =>
  findings.some((finding) => finding.improved > 0 && (finding.bestP95DeltaMs ?? 0) < 0)

const hasTotalRegression = (findings: DispatchShellTaxReport['totalFindings']): boolean =>
  findings.some((finding) => finding.regressed > 0 && (finding.worstP95DeltaMs ?? 0) > 0)

export const buildDispatchShellTaxReport = (args: {
  readonly diff: PerfDiffLike
  readonly beforeReport?: PerfReportLike
  readonly afterReport?: PerfReportLike
  readonly ab?: DispatchShellABLike
  readonly profile?: string
  readonly inputs?: DispatchShellTaxReport['inputs']
  readonly phaseIncreaseEpsilonMs?: number
}): DispatchShellTaxReport => {
  const diff = args.diff
  const suite = findDispatchSuite(diff)
  const profile = inferProfile({
    explicitProfile: args.profile,
    beforeReport: args.beforeReport,
    afterReport: args.afterReport,
  })
  const epsilonMs = args.phaseIncreaseEpsilonMs ?? DEFAULT_PHASE_EPSILON_MS

  const comparable = diff.meta?.comparability?.comparable === true
  const warnings = diff.meta?.comparability?.warnings ?? []
  const regressions = diff.summary?.regressions ?? 0
  const budgetViolations = diff.summary?.budgetViolations ?? 0
  const profileHardEligible = profile === 'default' || profile === 'soak'
  const dirty = hasDirtyWarning(diff, args.beforeReport, args.afterReport)
  const stabilityWarning = hasStabilityWarning(diff, suite)
  const timeoutOrFailed = hasTimeoutOrFailedMarker(suite, args.beforeReport, args.afterReport)
  const phases = phaseDeltas(suite, epsilonMs)
  const missingPhaseEvidence = phases.length === 0 || phases.some((phase) => phase.interpretation === 'missing')
  const totals = totalFindings(suite)
  const missingMetricEvidence = totals.some((finding) => finding.missing > 0 || finding.unavailable > 0)

  const gates: DispatchShellTaxReport['gates'] = [
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
      detail: 'dispatchShell.fixedCost before/after points must not timeout or fail',
    },
    {
      id: 'phaseEvidence',
      passed: !missingPhaseEvidence,
      severity: 'hard',
      detail: 'runtime.txnPhase.*Ms evidence must be present and available',
    },
    {
      id: 'metricEvidence',
      passed: !missingMetricEvidence,
      severity: 'hard',
      detail: 'runtime.txnCommitMs metric delta must not be missing or unavailable',
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
  if (timeoutOrFailed) blockers.push('dispatchShell.fixedCost has timeout/failed marker')
  if (missingPhaseEvidence) blockers.push('phase evidence is missing or unavailable')
  if (missingMetricEvidence) blockers.push('metric delta evidence is missing or unavailable')

  const hasHardFailure = gates.some((gate) => gate.severity === 'hard' && !gate.passed)
  const hasClueOnlyGate = gates.some((gate) => gate.severity === 'clue' && !gate.passed)
  const migratedByPhase = phases.some((phase) => phase.interpretation === 'increased') || args.ab?.migratedCost === true
  const improvedTotal = hasTotalImprovement(totals)
  const regressedTotal = hasTotalRegression(totals)

  let classification: DispatchShellTaxClassification = 'inconclusive'
  let claimStrength: DispatchShellTaxClaimStrength = 'none'

  if (hasHardFailure || regressedTotal) {
    classification = 'failed'
    claimStrength = 'none'
  } else if (hasClueOnlyGate) {
    classification = 'inconclusive'
    claimStrength = 'clue'
  } else if (improvedTotal && migratedByPhase) {
    classification = 'tax_migrated'
    claimStrength = 'hard'
  } else if (improvedTotal) {
    classification = 'tax_removed'
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
    phaseFindings: phases,
    inputs: args.inputs ?? {},
  }
}

const formatValue = (value: number | undefined): string => (value === undefined ? 'n/a' : value.toFixed(4))

export const renderDispatchShellTaxReportMarkdown = (report: DispatchShellTaxReport): string => {
  const lines: string[] = []
  lines.push('# Dispatch Shell Tax Migration Report')
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
    lines.push('- no runtime.txnCommitMs delta available')
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
  lines.push('## Phase Evidence')
  if (report.phaseFindings.length === 0) {
    lines.push('- no runtime.txnPhase.*Ms evidence available')
  } else {
    for (const phase of report.phaseFindings) {
      lines.push(
        `- \`${phase.name}\`: before=${formatValue(phase.before)}, after=${formatValue(phase.after)}, deltaMs=${formatValue(
          phase.deltaMs,
        )}, interpretation=${phase.interpretation}`,
      )
    }
  }

  lines.push('')
  return `${lines.join('\n')}\n`
}

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2))
  const [diff, beforeReport, afterReport, ab] = await Promise.all([
    readJson<PerfDiffLike>(args.diff),
    args.before ? readJson<PerfReportLike>(args.before) : Promise.resolve(undefined),
    args.after ? readJson<PerfReportLike>(args.after) : Promise.resolve(undefined),
    args.ab ? readJson<DispatchShellABLike>(args.ab) : Promise.resolve(undefined),
  ])

  const report = buildDispatchShellTaxReport({
    diff,
    beforeReport,
    afterReport,
    ab,
    profile: args.profile,
    inputs: {
      diff: args.diff,
      before: args.before,
      after: args.after,
      ab: args.ab,
    },
  })

  if (args.jsonOut) {
    await fs.mkdir(path.dirname(args.jsonOut), { recursive: true })
    await fs.writeFile(args.jsonOut, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    // eslint-disable-next-line no-console
    console.log(`[logix-perf] wrote ${args.jsonOut}`)
  }

  const markdown = renderDispatchShellTaxReportMarkdown(report)
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
