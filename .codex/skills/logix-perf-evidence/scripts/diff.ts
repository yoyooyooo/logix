import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

type Primitive = string | number | boolean
type Params = Record<string, Primitive>

type AbsoluteBudget = {
  readonly id?: string
  readonly type: 'absolute'
  readonly metric: string
  readonly p95Ms: number
}

type RelativeBudget = {
  readonly id?: string
  readonly type: 'relative'
  readonly metric: string
  readonly maxRatio: number
  readonly minDeltaMs?: number
  readonly numeratorRef: string
  readonly denominatorRef: string
}

type Budget = AbsoluteBudget | RelativeBudget

type MetricResult =
  | {
      readonly name: string
      readonly unit: 'ms'
      readonly status: 'ok'
      readonly stats: { readonly n: number; readonly medianMs: number; readonly p95Ms: number }
    }
  | {
      readonly name: string
      readonly unit: 'ms'
      readonly status: 'unavailable'
      readonly unavailableReason: string
    }

type EvidenceUnit = 'count' | 'ratio' | 'bytes' | 'string'

type EvidenceResult =
  | {
      readonly name: string
      readonly unit: EvidenceUnit
      readonly status: 'ok'
      readonly value: number | string
    }
  | {
      readonly name: string
      readonly unit: EvidenceUnit
      readonly status: 'unavailable'
      readonly unavailableReason: string
    }

type PointResult = {
  readonly params: Params
  readonly status: 'ok' | 'timeout' | 'failed' | 'skipped'
  readonly reason?: string
  readonly metrics: ReadonlyArray<MetricResult>
  readonly evidence?: ReadonlyArray<EvidenceResult>
}

type SuiteResult = {
  readonly id: string
  readonly title?: string
  readonly priority?: 'P1' | 'P2' | 'P3'
  readonly primaryAxis?: string
  readonly budgets?: ReadonlyArray<Budget>
  readonly metricCategories?: Record<string, 'e2e' | 'runtime' | 'diagnostics'>
  readonly points: ReadonlyArray<PointResult>
}

type StabilityConfig = {
  readonly maxP95DeltaRatio: number
  readonly maxP95DeltaMs: number
}

type PerfReport = {
  readonly schemaVersion: number
  readonly meta: {
    readonly createdAt: string
    readonly matrixId: string
    readonly matrixUpdatedAt?: string
    readonly matrixHash?: string
    readonly git?: { readonly branch?: string; readonly commit?: string; readonly dirty?: boolean }
    readonly config?: {
      readonly runs?: number
      readonly warmupDiscard?: number
      readonly timeoutMs?: number
      readonly headless?: boolean
      readonly profile?: string
      readonly stability?: StabilityConfig
    }
    readonly env?: {
      readonly os?: string
      readonly arch?: string
      readonly node?: string
      readonly browser?: {
        readonly name?: string
        readonly version?: string
        readonly headless?: boolean
      }
    }
  }
  readonly suites: ReadonlyArray<SuiteResult>
}

type SuiteSpec = {
  readonly id: string
  readonly title?: string
  readonly primaryAxis: string
  readonly axes: Record<string, ReadonlyArray<Primitive>>
  readonly budgets?: ReadonlyArray<Budget>
  readonly requiredEvidence?: ReadonlyArray<string>
}

type PerfMatrix = {
  readonly id: string
  readonly suites: ReadonlyArray<SuiteSpec>
}

type EvidenceAgg = {
  readonly ok: number
  readonly unavailable: number
  readonly missing: number
  readonly value?: number | string
}

type EvidenceDelta = {
  readonly name: string
  readonly unit: EvidenceUnit
  readonly scope: 'points' | 'whereSlices'
  readonly before: EvidenceAgg
  readonly after: EvidenceAgg
  readonly message: string
}

type Recommendation = {
  readonly id: string
  readonly title: string
  readonly detail?: string
}

type ThresholdDelta = {
  readonly budget: Budget
  readonly where?: Params
  readonly beforeMaxLevel: Primitive | null
  readonly afterMaxLevel: Primitive | null
  readonly message: string
  readonly recommendations?: ReadonlyArray<Recommendation>
}

type PerfDiff = {
  readonly schemaVersion: number
  readonly meta: {
    readonly createdAt: string
    readonly from: { readonly file?: string; readonly commit?: string }
    readonly to: { readonly file?: string; readonly commit?: string }
    readonly comparability: {
      readonly comparable: boolean
      readonly allowConfigDrift: boolean
      readonly allowEnvDrift: boolean
      readonly configMismatches: ReadonlyArray<string>
      readonly envMismatches: ReadonlyArray<string>
      readonly warnings: ReadonlyArray<string>
    }
  }
  readonly summary: {
    readonly regressions: number
    readonly improvements: number
    readonly budgetViolations: number
    readonly slices?: {
      readonly total: number
      readonly compared: number
      readonly skippedCoverage: number
      readonly skippedData: number
      readonly beforeOnly: number
      readonly afterOnly: number
    }
  }
  readonly suites: ReadonlyArray<{
    readonly id: string
    readonly thresholdDeltas?: ReadonlyArray<ThresholdDelta>
    readonly budgetViolations?: ReadonlyArray<unknown>
    readonly evidenceDeltas?: ReadonlyArray<EvidenceDelta>
    readonly notes?: string
  }>
}

const parseArgs = (argv: ReadonlyArray<string>) => {
  const hasFlag = (name: string): boolean => argv.includes(name)

  const get = (name: string): string | undefined => {
    const idx = argv.lastIndexOf(name)
    if (idx < 0) return undefined
    const value = argv[idx + 1]
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${name}`)
    }
    return value
  }

  const before = get('--before')
  const after = get('--after')
  const out = get('--out')
  const matrix = get('--matrix') ?? '.codex/skills/logix-perf-evidence/assets/matrix.json'
  const allowConfigDrift = hasFlag('--allow-config-drift')
  const allowEnvDrift = hasFlag('--allow-env-drift')

  if (!before || !after) {
    throw new Error(
      'Usage: pnpm perf diff -- --before <before.json> --after <after.json> [--out <diff.json>] [--matrix <matrix.json>] [--allow-config-drift] [--allow-env-drift]',
    )
  }

  return { before, after, out, matrix, allowConfigDrift, allowEnvDrift }
}

const stableParamsKey = (p: Params | undefined): string => {
  if (!p) return '{}'
  const keys = Object.keys(p).sort()
  return `{${keys.map((k) => `${k}=${String(p[k])}`).join('&')}}`
}

const budgetKey = (b: Budget): string =>
  b.id ??
  (b.type === 'absolute'
    ? `absolute:${b.metric}:p95<=${b.p95Ms}`
    : `relative:${b.metric}:${b.numeratorRef}/${b.denominatorRef}<=${b.maxRatio}`)

const readJson = async <T>(file: string): Promise<T> => {
  const text = await fs.readFile(file, 'utf8')
  return JSON.parse(text) as T
}

type ComparableConfig = {
  readonly runs: number
  readonly warmupDiscard: number
  readonly timeoutMs: number
  readonly headless: boolean | undefined
  readonly profile: string | undefined
}

type ComparableEnv = {
  readonly os: string | undefined
  readonly arch: string | undefined
  readonly node: string | undefined
  readonly browserName: string | undefined
  readonly browserHeadless: boolean | undefined
  readonly browserVersion: string | undefined
}

const assertComparable = (args: {
  readonly beforeFile: string
  readonly afterFile: string
  readonly beforeReport: PerfReport
  readonly afterReport: PerfReport
  readonly allowConfigDrift: boolean
  readonly allowEnvDrift: boolean
}): PerfDiff['meta']['comparability'] => {
  const beforeConfig: ComparableConfig = {
    runs: args.beforeReport.meta.config?.runs ?? Number.NaN,
    warmupDiscard: args.beforeReport.meta.config?.warmupDiscard ?? Number.NaN,
    timeoutMs: args.beforeReport.meta.config?.timeoutMs ?? Number.NaN,
    headless: args.beforeReport.meta.config?.headless,
    profile: args.beforeReport.meta.config?.profile,
  }

  const afterConfig: ComparableConfig = {
    runs: args.afterReport.meta.config?.runs ?? Number.NaN,
    warmupDiscard: args.afterReport.meta.config?.warmupDiscard ?? Number.NaN,
    timeoutMs: args.afterReport.meta.config?.timeoutMs ?? Number.NaN,
    headless: args.afterReport.meta.config?.headless,
    profile: args.afterReport.meta.config?.profile,
  }

  const beforeEnv: ComparableEnv = {
    os: args.beforeReport.meta.env?.os,
    arch: args.beforeReport.meta.env?.arch,
    node: args.beforeReport.meta.env?.node,
    browserName: args.beforeReport.meta.env?.browser?.name,
    browserHeadless: args.beforeReport.meta.env?.browser?.headless,
    browserVersion: args.beforeReport.meta.env?.browser?.version,
  }

  const afterEnv: ComparableEnv = {
    os: args.afterReport.meta.env?.os,
    arch: args.afterReport.meta.env?.arch,
    node: args.afterReport.meta.env?.node,
    browserName: args.afterReport.meta.env?.browser?.name,
    browserHeadless: args.afterReport.meta.env?.browser?.headless,
    browserVersion: args.afterReport.meta.env?.browser?.version,
  }

  const configMismatches: string[] = []
  const envMismatches: string[] = []
  const warnings: string[] = []

  if (args.beforeReport.meta.matrixId !== args.afterReport.meta.matrixId) {
    configMismatches.push(`matrixId: before=${args.beforeReport.meta.matrixId} after=${args.afterReport.meta.matrixId}`)
  }

  const beforeMatrixHash = args.beforeReport.meta.matrixHash
  const afterMatrixHash = args.afterReport.meta.matrixHash
  if (!beforeMatrixHash || !afterMatrixHash) {
    configMismatches.push(`matrixHash: missing (before=${String(beforeMatrixHash)} after=${String(afterMatrixHash)})`)
  } else if (beforeMatrixHash !== afterMatrixHash) {
    configMismatches.push(`matrixHash: before=${beforeMatrixHash} after=${afterMatrixHash}`)
  }

  const assertNumber = (label: string, before: number, after: number) => {
    if (!Number.isFinite(before) || !Number.isFinite(after)) {
      configMismatches.push(`${label}: missing (before=${String(before)} after=${String(after)})`)
      return
    }
    if (before !== after) {
      configMismatches.push(`${label}: before=${before} after=${after}`)
    }
  }

  assertNumber('runs', beforeConfig.runs, afterConfig.runs)
  assertNumber('warmupDiscard', beforeConfig.warmupDiscard, afterConfig.warmupDiscard)
  assertNumber('timeoutMs', beforeConfig.timeoutMs, afterConfig.timeoutMs)

  // profile/headless 仅作为提示：真正的可比性靠 runs/warmup/timeout + env（browser/headless）。
  if (beforeConfig.profile !== afterConfig.profile) {
    warnings.push(`config.profile: before=${String(beforeConfig.profile)} after=${String(afterConfig.profile)}`)
  }
  if (beforeConfig.headless !== afterConfig.headless) {
    warnings.push(`config.headless: before=${String(beforeConfig.headless)} after=${String(afterConfig.headless)}`)
  }

  const assertEnvEq = (label: string, before: string | boolean | undefined, after: string | boolean | undefined) => {
    if (before === undefined || after === undefined) {
      envMismatches.push(`${label}: missing (before=${String(before)} after=${String(after)})`)
      return
    }
    if (before !== after) {
      envMismatches.push(`${label}: before=${String(before)} after=${String(after)}`)
    }
  }

  assertEnvEq('env.os', beforeEnv.os, afterEnv.os)
  assertEnvEq('env.arch', beforeEnv.arch, afterEnv.arch)
  assertEnvEq('env.browser.name', beforeEnv.browserName, afterEnv.browserName)
  assertEnvEq('env.browser.headless', beforeEnv.browserHeadless, afterEnv.browserHeadless)

  // version 可能缺失：有就比，没有不强制。
  if (beforeEnv.browserVersion !== undefined || afterEnv.browserVersion !== undefined) {
    assertEnvEq('env.browser.version', beforeEnv.browserVersion, afterEnv.browserVersion)
  }

  // node 版本对 browser perf 的影响通常较小：只给 warning，不作为 hard gate。
  if (beforeEnv.node !== afterEnv.node) {
    warnings.push(`env.node: before=${String(beforeEnv.node)} after=${String(afterEnv.node)}`)
  }

  const beforeGit = args.beforeReport.meta.git
  const afterGit = args.afterReport.meta.git
  if (beforeGit?.dirty) warnings.push('git.dirty.before=true')
  if (afterGit?.dirty) warnings.push('git.dirty.after=true')

  if (beforeGit?.branch && afterGit?.branch && beforeGit.branch !== afterGit.branch) {
    warnings.push(`git.branch: before=${beforeGit.branch} after=${afterGit.branch}`)
  }

  if (beforeGit?.commit && afterGit?.commit && beforeGit.commit !== afterGit.commit) {
    warnings.push(`git.commit: before=${beforeGit.commit} after=${afterGit.commit}`)
  }

  const docRef = '.codex/skills/logix-perf-evidence/references/perf-evidence.md'

  if (configMismatches.length > 0 && !args.allowConfigDrift) {
    throw new Error(
      [
        '[logix-perf] PerfDiff aborted: before/after reports are NOT comparable (config drift).',
        `before=${args.beforeFile}`,
        `after=${args.afterFile}`,
        '',
        'Mismatches:',
        ...configMismatches.map((x) => `- ${x}`),
        '',
        'Fix: re-run collect with the SAME profile/runs/warmupDiscard/timeoutMs for both reports.',
        `Docs: ${docRef}`,
        'Override (triage-only): add --allow-config-drift',
      ].join('\n'),
    )
  }

  if (configMismatches.length > 0 && args.allowConfigDrift) {
    // eslint-disable-next-line no-console
    console.warn(
      '[logix-perf] PerfDiff WARNING: before/after reports are NOT comparable (config drift, diff is triage-only).\n' +
        configMismatches.map((x) => `- ${x}`).join('\n'),
    )
  }

  if (envMismatches.length > 0 && !args.allowEnvDrift) {
    throw new Error(
      [
        '[logix-perf] PerfDiff aborted: before/after reports are NOT comparable (env drift).',
        `before=${args.beforeFile}`,
        `after=${args.afterFile}`,
        '',
        'Mismatches:',
        ...envMismatches.map((x) => `- ${x}`),
        '',
        'Fix: collect both reports on the SAME machine + browser version/headless.',
        `Docs: ${docRef}`,
        'Override (triage-only): add --allow-env-drift',
      ].join('\n'),
    )
  }

  if (envMismatches.length > 0 && args.allowEnvDrift) {
    // eslint-disable-next-line no-console
    console.warn(
      '[logix-perf] PerfDiff WARNING: before/after reports are NOT comparable (env drift, diff is triage-only).\n' +
        envMismatches.map((x) => `- ${x}`).join('\n'),
    )
  }

  if (warnings.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      '[logix-perf] PerfDiff note: non-fatal drift warnings:\n' + warnings.map((x) => `- ${x}`).join('\n'),
    )
  }

  return {
    comparable: configMismatches.length === 0 && envMismatches.length === 0,
    allowConfigDrift: args.allowConfigDrift,
    allowEnvDrift: args.allowEnvDrift,
    configMismatches,
    envMismatches,
    warnings,
  }
}

const isEqualParam = (a: Primitive | undefined, b: Primitive | undefined): boolean => a === b

const findPoint = (suite: SuiteResult, expected: Params): PointResult | undefined =>
  suite.points.find((p) => Object.keys(expected).every((k) => isEqualParam(p.params[k], expected[k])))

const getMetricP95Ms = (
  point: PointResult,
  metric: string,
): { readonly ok: true; readonly p95Ms: number } | { readonly ok: false; readonly reason: string } => {
  if (point.status !== 'ok') {
    return { ok: false, reason: point.reason ?? point.status }
  }

  const m = point.metrics.find((x) => x.name === metric)
  if (!m) {
    return { ok: false, reason: 'metricMissing' }
  }
  if (m.status !== 'ok') {
    return { ok: false, reason: m.unavailableReason }
  }
  return { ok: true, p95Ms: m.stats.p95Ms }
}

const cartesian = <T>(axes: ReadonlyArray<ReadonlyArray<T>>): ReadonlyArray<ReadonlyArray<T>> => {
  if (axes.length === 0) return [[]]
  const [head, ...tail] = axes
  const rest = cartesian(tail)
  const out: Array<ReadonlyArray<T>> = []
  for (const h of head) {
    for (const r of rest) {
      out.push([h, ...r])
    }
  }
  return out
}

const isComparableReason = (reason: string | undefined): boolean => reason === undefined || reason === 'budgetExceeded'

const computeThresholdMaxLevel = (
  suiteSpec: SuiteSpec,
  suiteResult: SuiteResult,
  budget: AbsoluteBudget,
  where: Params,
  axisLevels: ReadonlyArray<Primitive>,
): { readonly maxLevel: Primitive | null; readonly reason?: string } => {
  const metric = budget.metric

  let maxLevel: Primitive | null = null
  for (const level of axisLevels) {
    const params: Params = { ...where, [suiteSpec.primaryAxis]: level }
    const point = findPoint(suiteResult, params)
    if (!point) {
      return { maxLevel, reason: 'missing' }
    }

    const res = getMetricP95Ms(point, metric)
    if (!res.ok) {
      return { maxLevel, reason: res.reason }
    }

    if (res.p95Ms <= budget.p95Ms) {
      maxLevel = level
      continue
    }

    return { maxLevel, reason: 'budgetExceeded' }
  }

  return { maxLevel }
}

const parseRef = (ref: string): Params => {
  const out: Params = {}
  for (const part of ref.split('&')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const k = trimmed.slice(0, eq).trim()
    const v = trimmed.slice(eq + 1).trim()
    if (!k) continue

    if (v === 'true') out[k] = true
    else if (v === 'false') out[k] = false
    else if (/^-?\d+(\.\d+)?$/.test(v)) out[k] = Number(v)
    else out[k] = v
  }
  return out
}

const hasAnyPointForWhere = (suite: SuiteResult, where: Params): boolean =>
  suite.points.some((p) => Object.keys(where).every((k) => isEqualParam(p.params[k], where[k])))

const commonPrefixAxisLevelsAbsolute = (
  spec: SuiteSpec,
  beforeSuite: SuiteResult,
  afterSuite: SuiteResult,
  where: Params,
): ReadonlyArray<Primitive> => {
  const full = spec.axes[spec.primaryAxis] ?? []
  const out: Primitive[] = []
  for (const level of full) {
    const params: Params = { ...where, [spec.primaryAxis]: level }
    const beforePoint = findPoint(beforeSuite, params)
    const afterPoint = findPoint(afterSuite, params)
    if (!beforePoint || !afterPoint) break
    out.push(level)
  }
  return out
}

const commonPrefixAxisLevelsRelative = (
  spec: SuiteSpec,
  beforeSuite: SuiteResult,
  afterSuite: SuiteResult,
  budget: RelativeBudget,
  where: Params,
): ReadonlyArray<Primitive> => {
  const full = spec.axes[spec.primaryAxis] ?? []
  const numeratorRef = parseRef(budget.numeratorRef)
  const denominatorRef = parseRef(budget.denominatorRef)
  const out: Primitive[] = []

  for (const level of full) {
    const numeratorParams: Params = { ...where, ...numeratorRef, [spec.primaryAxis]: level }
    const denominatorParams: Params = { ...where, ...denominatorRef, [spec.primaryAxis]: level }

    const beforeNumerator = findPoint(beforeSuite, numeratorParams)
    const beforeDenominator = findPoint(beforeSuite, denominatorParams)
    const afterNumerator = findPoint(afterSuite, numeratorParams)
    const afterDenominator = findPoint(afterSuite, denominatorParams)

    if (!beforeNumerator || !beforeDenominator || !afterNumerator || !afterDenominator) break
    out.push(level)
  }

  return out
}

const computeThresholdMaxLevelRelative = (
  suiteSpec: SuiteSpec,
  suiteResult: SuiteResult,
  budget: RelativeBudget,
  where: Params,
  axisLevels: ReadonlyArray<Primitive>,
): { readonly maxLevel: Primitive | null; readonly reason?: string } => {
  const metric = budget.metric
  const numeratorRef = parseRef(budget.numeratorRef)
  const denominatorRef = parseRef(budget.denominatorRef)

  let maxLevel: Primitive | null = null
  for (const level of axisLevels) {
    const numeratorParams: Params = {
      ...where,
      ...numeratorRef,
      [suiteSpec.primaryAxis]: level,
    }
    const denominatorParams: Params = {
      ...where,
      ...denominatorRef,
      [suiteSpec.primaryAxis]: level,
    }

    const numeratorPoint = findPoint(suiteResult, numeratorParams)
    if (!numeratorPoint) return { maxLevel, reason: 'missingNumerator' }
    const denominatorPoint = findPoint(suiteResult, denominatorParams)
    if (!denominatorPoint) return { maxLevel, reason: 'missingDenominator' }

    const numeratorP95 = getMetricP95Ms(numeratorPoint, metric)
    if (!numeratorP95.ok) return { maxLevel, reason: `numerator:${numeratorP95.reason}` }

    const denominatorP95 = getMetricP95Ms(denominatorPoint, metric)
    if (!denominatorP95.ok) {
      return { maxLevel, reason: `denominator:${denominatorP95.reason}` }
    }

    if (denominatorP95.p95Ms <= 0) {
      return { maxLevel, reason: 'denominatorZero' }
    }

    const ratio = numeratorP95.p95Ms / denominatorP95.p95Ms
    const deltaMs = numeratorP95.p95Ms - denominatorP95.p95Ms
    const minDeltaMsRaw = budget.minDeltaMs
    const minDeltaMs =
      typeof minDeltaMsRaw === 'number' && Number.isFinite(minDeltaMsRaw) ? minDeltaMsRaw : 0
    const overBudget = ratio > budget.maxRatio && deltaMs > minDeltaMs

    if (!overBudget) {
      maxLevel = level
      continue
    }

    return { maxLevel, reason: 'budgetExceeded' }
  }

  return { maxLevel }
}

const compareLevels = (levels: ReadonlyArray<Primitive>, a: Primitive | null, b: Primitive | null): number => {
  const idxA = a === null ? -1 : levels.indexOf(a)
  const idxB = b === null ? -1 : levels.indexOf(b)
  return idxA - idxB
}

const medianNumber = (samples: ReadonlyArray<number>): number => {
  if (samples.length === 0) return Number.NaN
  const sorted = samples.slice().sort((a, b) => a - b)
  const idx = Math.floor(0.5 * (sorted.length - 1))
  return sorted[idx]!
}

const inferEvidenceUnit = (name: string): EvidenceUnit => {
  const lowered = name.toLowerCase()
  if (lowered.includes('bytes') || lowered.includes('byte')) return 'bytes'
  if (lowered.includes('ratio') || lowered.includes('rate')) return 'ratio'
  return 'count'
}

type EvidenceSnapshot =
  | { readonly status: 'ok'; readonly unit: EvidenceUnit; readonly value: number | string }
  | { readonly status: 'unavailable'; readonly unit: EvidenceUnit; readonly reason: string }
  | { readonly status: 'missing'; readonly unit: EvidenceUnit; readonly reason: string }

const getEvidenceSnapshot = (point: PointResult | undefined, name: string): EvidenceSnapshot => {
  if (!point) {
    return { status: 'missing', unit: inferEvidenceUnit(name), reason: 'pointMissing' }
  }

  const list = point.evidence
  if (!list) {
    return { status: 'missing', unit: inferEvidenceUnit(name), reason: 'evidenceMissing' }
  }

  const found = list.find((e) => e.name === name)
  if (!found) {
    return { status: 'missing', unit: inferEvidenceUnit(name), reason: 'evidenceMissing' }
  }

  if (found.status === 'ok') {
    return { status: 'ok', unit: found.unit, value: found.value }
  }

  return { status: 'unavailable', unit: found.unit, reason: found.unavailableReason }
}

const listPointParams = (spec: SuiteSpec): ReadonlyArray<Params> => {
  const axes = Object.keys(spec.axes)
  const levels = axes.map((k) => spec.axes[k] ?? [])
  return cartesian(levels).map((values) => {
    const p: Params = {}
    for (let i = 0; i < axes.length; i++) {
      p[axes[i]!] = values[i]!
    }
    return p
  })
}

const computeEvidenceAggByPoints = (spec: SuiteSpec, suite: SuiteResult, evidenceName: string): EvidenceAgg => {
  const combos = listPointParams(spec)

  let ok = 0
  let unavailable = 0
  let missing = 0

  const numbers: number[] = []
  const strings: string[] = []

  let unit: EvidenceUnit = inferEvidenceUnit(evidenceName)
  let unitLocked = false

  for (const params of combos) {
    const point = findPoint(suite, params)
    const snap = getEvidenceSnapshot(point, evidenceName)
    if (!unitLocked && snap.status !== 'missing') {
      unit = snap.unit
      unitLocked = true
    }

    if (snap.status === 'missing') {
      missing += 1
      continue
    }
    if (snap.status === 'unavailable') {
      unavailable += 1
      continue
    }

    ok += 1
    if (typeof snap.value === 'number' && Number.isFinite(snap.value)) {
      numbers.push(snap.value)
    } else if (typeof snap.value === 'string') {
      strings.push(snap.value)
    }
  }

  if (unit === 'string') {
    return {
      ok,
      unavailable,
      missing,
      value: strings.length > 0 ? strings[strings.length - 1]! : undefined,
    }
  }

  if (unit === 'ratio') {
    return {
      ok,
      unavailable,
      missing,
      value: numbers.length > 0 ? medianNumber(numbers) : undefined,
    }
  }

  return {
    ok,
    unavailable,
    missing,
    value: numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) : undefined,
  }
}

const computeCutOffAggByWhereSlices = (spec: SuiteSpec, suite: SuiteResult): EvidenceAgg => {
  const axisLevels = spec.axes[spec.primaryAxis] ?? []
  const otherAxes = Object.keys(spec.axes).filter((k) => k !== spec.primaryAxis)
  const otherAxisLevels = otherAxes.map((k) => spec.axes[k] ?? [])

  const whereCombos = cartesian(otherAxisLevels).map((values) => {
    const where: Params = {}
    for (let i = 0; i < otherAxes.length; i++) {
      where[otherAxes[i]!] = values[i]!
    }
    return where
  })

  let ok = 0
  let unavailable = 0
  let missing = 0
  let total = 0

  for (const where of whereCombos) {
    let picked: EvidenceSnapshot | undefined

    for (const level of axisLevels) {
      const params: Params = { ...where, [spec.primaryAxis]: level }
      const point = findPoint(suite, params)
      const snap = getEvidenceSnapshot(point, 'budget.cutOffCount')
      if (snap.status === 'missing') continue
      picked = snap
      break
    }

    if (!picked) {
      missing += 1
      continue
    }

    if (picked.status === 'unavailable') {
      unavailable += 1
      continue
    }

    ok += 1
    if (typeof picked.value === 'number' && Number.isFinite(picked.value)) {
      total += picked.value
    }
  }

  return { ok, unavailable, missing, value: ok > 0 ? total : undefined }
}

const buildRecommendations = (
  suiteId: string,
  budget: Budget,
  category: 'e2e' | 'runtime' | 'diagnostics' | undefined,
): ReadonlyArray<Recommendation> => {
  const recs: Recommendation[] = []

  if (suiteId.startsWith('watchers.')) {
    recs.push({
      id: '014-boundary.watchers.scale-down-watchers',
      title: '减少 watcher 数量或拆分模块',
      detail: '边界回归集中在 watcher 维度，可优先尝试降低单模块 watcher 数量、拆分模块或减少级联依赖。',
    })
  } else if (suiteId.startsWith('converge.')) {
    recs.push({
      id: '014-boundary.converge.reduce-steps-or-dirty-roots',
      title: '降低 steps/dirty-roots 规模或优化收敛策略',
      detail: '事务收敛相关边界回归，可优先检查 steps/dirty-roots 配置，或回退到更保守的收敛策略。',
    })
  } else if (suiteId.startsWith('diagnostics.')) {
    recs.push({
      id: '014-boundary.diagnostics.reduce-level',
      title: '降低诊断等级或缩短诊断窗口',
      detail: '诊断开销上升时，可尝试从 full 降到 light，或仅在问题排查阶段短暂开启。',
    })
  } else if (suiteId.startsWith('negativeBoundaries.')) {
    recs.push({
      id: '014-boundary.negativeBoundaries.inspect-dirty-pattern',
      title: '收紧 dirty-pattern 基数或调整缓存策略',
      detail: '负优化边界回归，多数与高基数/低命中率 dirty-pattern 相关，可优先检查写入 pattern 与缓存配置。',
    })
  } else if (suiteId.startsWith('react.strictSuspenseJitter')) {
    recs.push({
      id: '014-boundary.reactStrictSuspense.reduce-mount-or-suspense-cycles',
      title: '降低 mountCycles 或 suspenseCycles',
      detail: '严格模式 + Suspense 抖动增大时，可优先减少一次交互内的挂载次数或挂起循环次数。',
    })
  }

  if (recs.length === 0) {
    const suffix =
      category === 'runtime'
        ? '（优先检查 runtime 维度配置，如 steps/dirty-roots/收敛策略。）'
        : category === 'diagnostics'
          ? '（优先检查诊断等级与采样开关。）'
          : ''
    recs.push({
      id: '014-boundary.general.narrow-load',
      title: '缩小负载维度或回退更保守配置',
      detail: `边界回归可先通过缩小主加压轴档位或回退更保守配置验证是否与最近改动相关${suffix}`,
    })
  }

  return recs
}

const computeStabilityWarning = (
  spec: SuiteSpec,
  beforeSuite: SuiteResult,
  afterSuite: SuiteResult,
  stability: StabilityConfig,
): string | undefined => {
  const paramsList = listPointParams(spec)

  const metricNames = new Set<string>()
  for (const p of beforeSuite.points) {
    for (const m of p.metrics) {
      metricNames.add(m.name)
    }
  }
  for (const p of afterSuite.points) {
    for (const m of p.metrics) {
      metricNames.add(m.name)
    }
  }

  for (const metric of metricNames) {
    for (const params of paramsList) {
      const beforePoint = findPoint(beforeSuite, params)
      const afterPoint = findPoint(afterSuite, params)
      if (!beforePoint || !afterPoint) continue

      const beforeP95 = getMetricP95Ms(beforePoint, metric)
      const afterP95 = getMetricP95Ms(afterPoint, metric)
      if (!beforeP95.ok || !afterP95.ok) continue

      const baseline = beforeP95.p95Ms
      const current = afterP95.p95Ms
      if (!Number.isFinite(baseline) || !Number.isFinite(current) || baseline <= 0) {
        continue
      }

      const diff = Math.abs(current - baseline)
      const limit = Math.max(stability.maxP95DeltaMs, baseline * stability.maxP95DeltaRatio)

      if (diff > limit) {
        return `stabilityWarning: metric=${metric} ${stableParamsKey(params)} baselineP95=${baseline.toFixed(
          2,
        )}ms afterP95=${current.toFixed(2)}ms diff=${diff.toFixed(2)}ms limit=${limit.toFixed(
          2,
        )}ms (possible causes: tab switch, power-saving mode, background load, browser/version drift)`
      }
    }
  }

  return undefined
}

const main = async (): Promise<void> => {
  const { before, after, out, matrix, allowConfigDrift, allowEnvDrift } = parseArgs(process.argv.slice(2))

  const [matrixJson, beforeReport, afterReport] = await Promise.all([
    readJson<PerfMatrix>(matrix),
    readJson<PerfReport>(before),
    readJson<PerfReport>(after),
  ])

  const comparability = assertComparable({
    beforeFile: before,
    afterFile: after,
    beforeReport,
    afterReport,
    allowConfigDrift,
    allowEnvDrift,
  })

  const suiteSpecById = new Map<string, SuiteSpec>(matrixJson.suites.map((s) => [s.id, s]))

  const beforeById = new Map<string, SuiteResult>(beforeReport.suites.map((s) => [s.id, s]))
  const afterById = new Map<string, SuiteResult>(afterReport.suites.map((s) => [s.id, s]))

  const suiteIds = Array.from(new Set<string>([...beforeById.keys(), ...afterById.keys()])).sort()

  let regressions = 0
  let improvements = 0

  const triageMode = allowConfigDrift || allowEnvDrift
  let slicesTotal = 0
  let slicesCompared = 0
  let slicesSkippedCoverage = 0
  let slicesSkippedData = 0
  let slicesBeforeOnly = 0
  let slicesAfterOnly = 0

  const suiteDiffs: Array<PerfDiff['suites'][number]> = []

  for (const suiteId of suiteIds) {
    const spec = suiteSpecById.get(suiteId)
    const beforeSuite = beforeById.get(suiteId)
    const afterSuite = afterById.get(suiteId)

    if (!spec || !beforeSuite || !afterSuite) {
      suiteDiffs.push({
        id: suiteId,
        notes: !spec
          ? 'missing suite spec in matrix.json'
          : !beforeSuite
            ? 'missing suite in before report'
            : 'missing suite in after report',
      })
      continue
    }

    const axisLevels = spec.axes[spec.primaryAxis] ?? []
    const budgets: ReadonlyArray<Budget> =
      (spec.budgets && spec.budgets.length > 0
        ? spec.budgets
        : beforeSuite.budgets && beforeSuite.budgets.length > 0
          ? beforeSuite.budgets
          : afterSuite.budgets) ?? []

    const thresholdDeltas: ThresholdDelta[] = []
    const regressiveSlices: Array<{
      readonly delta: number
      readonly threshold: ThresholdDelta
    }> = []

    for (const budget of budgets) {
      const refAxes =
        budget.type === 'relative'
          ? Array.from(
              new Set<string>([
                ...Object.keys(parseRef(budget.numeratorRef)),
                ...Object.keys(parseRef(budget.denominatorRef)),
              ]),
            )
          : []

      const otherAxes = Object.keys(spec.axes).filter((k) => k !== spec.primaryAxis && !refAxes.includes(k))
      const otherAxisLevels = otherAxes.map((k) => spec.axes[k] ?? [])
      const whereCombos = cartesian(otherAxisLevels).map((values) => {
        const where: Params = {}
        for (let i = 0; i < otherAxes.length; i++) {
          where[otherAxes[i]!] = values[i]!
        }
        return where
      })

      for (const where of whereCombos) {
        slicesTotal += 1

        const comparedAxisLevels = triageMode
          ? budget.type === 'absolute'
            ? commonPrefixAxisLevelsAbsolute(spec, beforeSuite, afterSuite, where)
            : commonPrefixAxisLevelsRelative(spec, beforeSuite, afterSuite, budget, where)
          : axisLevels

        if (triageMode && comparedAxisLevels.length === 0) {
          const beforeHas = hasAnyPointForWhere(beforeSuite, where)
          const afterHas = hasAnyPointForWhere(afterSuite, where)

          if (beforeHas && !afterHas) slicesBeforeOnly += 1
          else if (!beforeHas && afterHas) slicesAfterOnly += 1
          else if (beforeHas && afterHas) slicesSkippedData += 1
          else slicesSkippedCoverage += 1

          continue
        }

        const beforeRes =
          budget.type === 'absolute'
            ? computeThresholdMaxLevel(spec, beforeSuite, budget, where, comparedAxisLevels)
            : computeThresholdMaxLevelRelative(spec, beforeSuite, budget, where, comparedAxisLevels)
        const afterRes =
          budget.type === 'absolute'
            ? computeThresholdMaxLevel(spec, afterSuite, budget, where, comparedAxisLevels)
            : computeThresholdMaxLevelRelative(spec, afterSuite, budget, where, comparedAxisLevels)

        if (triageMode && (!isComparableReason(beforeRes.reason) || !isComparableReason(afterRes.reason))) {
          slicesSkippedData += 1
          continue
        }

        if (triageMode) {
          slicesCompared += 1
        }

        if (beforeRes.maxLevel === afterRes.maxLevel) {
          continue
        }

        const delta = compareLevels(axisLevels, afterRes.maxLevel, beforeRes.maxLevel)
        const category =
          (beforeSuite.metricCategories && beforeSuite.metricCategories[budget.metric]) ??
          (afterSuite.metricCategories && afterSuite.metricCategories[budget.metric])
        const categoryPrefix = category ? `[category=${category}] ` : ''

        const recommendations = delta < 0 ? buildRecommendations(suiteId, budget, category) : undefined

        const threshold: ThresholdDelta = {
          budget,
          where: Object.keys(where).length > 0 ? where : undefined,
          beforeMaxLevel: beforeRes.maxLevel,
          afterMaxLevel: afterRes.maxLevel,
          message: `${categoryPrefix}${budgetKey(budget)} ${stableParamsKey(where)}: before=${String(
            beforeRes.maxLevel,
          )} after=${String(afterRes.maxLevel)}${
            afterRes.reason ? ` (after:${afterRes.reason})` : ''
          }${beforeRes.reason ? ` (before:${beforeRes.reason})` : ''}`,
          recommendations,
        }

        thresholdDeltas.push(threshold)

        if (delta < 0) {
          regressions += 1
          regressiveSlices.push({ delta, threshold })
        }
        if (delta > 0) {
          improvements += 1
        }
      }
    }

    const requiredEvidence = Array.isArray(spec.requiredEvidence) ? spec.requiredEvidence : []
    const observedEvidence = new Set<string>()
    for (const p of beforeSuite.points) {
      for (const e of p.evidence ?? []) observedEvidence.add(e.name)
    }
    for (const p of afterSuite.points) {
      for (const e of p.evidence ?? []) observedEvidence.add(e.name)
    }

    const evidenceNames = Array.from(
      new Set<string>(['budget.cutOffCount', ...requiredEvidence, ...observedEvidence]),
    ).sort()

    const evidenceDeltas: EvidenceDelta[] = []
    for (const evidenceName of evidenceNames) {
      const scope: EvidenceDelta['scope'] = evidenceName === 'budget.cutOffCount' ? 'whereSlices' : 'points'

      const beforeAgg =
        evidenceName === 'budget.cutOffCount'
          ? computeCutOffAggByWhereSlices(spec, beforeSuite)
          : computeEvidenceAggByPoints(spec, beforeSuite, evidenceName)
      const afterAgg =
        evidenceName === 'budget.cutOffCount'
          ? computeCutOffAggByWhereSlices(spec, afterSuite)
          : computeEvidenceAggByPoints(spec, afterSuite, evidenceName)

      const changed =
        beforeAgg.value !== afterAgg.value ||
        beforeAgg.ok !== afterAgg.ok ||
        beforeAgg.unavailable !== afterAgg.unavailable ||
        beforeAgg.missing !== afterAgg.missing

      const shouldInclude =
        requiredEvidence.includes(evidenceName) ||
        beforeAgg.unavailable > 0 ||
        afterAgg.unavailable > 0 ||
        beforeAgg.missing > 0 ||
        afterAgg.missing > 0 ||
        (typeof beforeAgg.value === 'number' && beforeAgg.value !== 0) ||
        (typeof afterAgg.value === 'number' && afterAgg.value !== 0) ||
        (typeof beforeAgg.value === 'string' && beforeAgg.value.length > 0) ||
        (typeof afterAgg.value === 'string' && afterAgg.value.length > 0) ||
        changed

      if (!shouldInclude) continue

      const unit = evidenceName === 'budget.cutOffCount' ? 'count' : inferEvidenceUnit(evidenceName)

      evidenceDeltas.push({
        name: evidenceName,
        unit,
        scope,
        before: beforeAgg,
        after: afterAgg,
        message: `${evidenceName}(${scope}) unit=${unit}: before[value=${String(
          beforeAgg.value,
        )} ok=${beforeAgg.ok} unavailable=${beforeAgg.unavailable} missing=${beforeAgg.missing}] after[value=${String(
          afterAgg.value,
        )} ok=${afterAgg.ok} unavailable=${afterAgg.unavailable} missing=${afterAgg.missing}]`,
      })
    }

    let notes: string | undefined
    if (regressiveSlices.length > 0) {
      const worst = regressiveSlices.reduce((acc, cur) => (cur.delta < acc.delta ? cur : acc))
      notes = `mostSignificantRegression: ${budgetKey(
        worst.threshold.budget,
      )} ${stableParamsKey(worst.threshold.where)} (before=${String(
        worst.threshold.beforeMaxLevel,
      )}, after=${String(worst.threshold.afterMaxLevel)})`
    }

    const stability = beforeReport.meta.config?.stability ?? afterReport.meta.config?.stability
    if (stability) {
      const stabilityNote = computeStabilityWarning(spec, beforeSuite, afterSuite, stability)
      if (stabilityNote) {
        notes = notes ? `${notes}; ${stabilityNote}` : stabilityNote
      }
    }

    suiteDiffs.push({
      id: suiteId,
      thresholdDeltas: thresholdDeltas.length > 0 ? thresholdDeltas : undefined,
      budgetViolations: [],
      evidenceDeltas: evidenceDeltas.length > 0 ? evidenceDeltas : undefined,
      notes,
    })
  }

  const diff: PerfDiff = {
    schemaVersion: 1,
    meta: {
      createdAt: new Date().toISOString(),
      from: {
        file: path.relative(process.cwd(), before),
        commit: beforeReport.meta.git?.commit,
      },
      to: {
        file: path.relative(process.cwd(), after),
        commit: afterReport.meta.git?.commit,
      },
      comparability,
    },
    summary: {
      regressions,
      improvements,
      budgetViolations: 0,
      slices: triageMode
        ? {
            total: slicesTotal,
            compared: slicesCompared,
            skippedCoverage: slicesSkippedCoverage,
            skippedData: slicesSkippedData,
            beforeOnly: slicesBeforeOnly,
            afterOnly: slicesAfterOnly,
          }
        : undefined,
    },
    suites: suiteDiffs,
  }

  const json = `${JSON.stringify(diff, null, 2)}\n`
  if (out) {
    await fs.mkdir(path.dirname(out), { recursive: true })
    await fs.writeFile(out, json, 'utf8')
    // eslint-disable-next-line no-console
    console.log(`[logix-perf] wrote ${out}`)
    return
  }

  // eslint-disable-next-line no-console
  console.log(json)
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
