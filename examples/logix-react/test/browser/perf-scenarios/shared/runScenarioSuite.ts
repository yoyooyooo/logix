import matrix from '@logixjs/perf-evidence/assets/matrix.json'

import type { Primitive, ScenarioBudget, ScenarioSuite } from '../protocol'

const LOGIX_PERF_REPORT_PREFIX = 'LOGIX_PERF_REPORT:'

type AbsoluteBudget = Extract<ScenarioBudget, { type: 'absolute' }>
type RelativeBudget = Extract<ScenarioBudget, { type: 'relative' }>

export type ScenarioMetricStats = {
  readonly n: number
  readonly medianMs: number
  readonly p95Ms: number
}

export type ScenarioMetric =
  | {
      readonly name: string
      readonly unit: 'ms'
      readonly status: 'ok'
      readonly stats: ScenarioMetricStats
    }
  | {
      readonly name: string
      readonly unit: 'ms'
      readonly status: 'unavailable'
      readonly unavailableReason: string
    }

export type ScenarioEvidence =
  | {
      readonly name: string
      readonly unit: 'count' | 'ratio' | 'bytes' | 'string'
      readonly status: 'ok'
      readonly value: number | string
    }
  | {
      readonly name: string
      readonly unit: 'count' | 'ratio' | 'bytes' | 'string'
      readonly status: 'unavailable'
      readonly unavailableReason: string
    }

export type ScenarioPointResult = {
  readonly params: Readonly<Record<string, Primitive>>
  readonly status: 'ok' | 'failed' | 'timeout' | 'skipped'
  readonly reason?: string
  readonly metrics: ReadonlyArray<ScenarioMetric>
  readonly evidence?: ReadonlyArray<ScenarioEvidence>
}

export type ScenarioThresholdResult = {
  readonly budget: ScenarioBudget
  readonly where?: Readonly<Record<string, Primitive>>
  readonly maxLevel: Primitive | null
  readonly firstFailLevel?: Primitive | null
  readonly reason?: string
}

export type ScenarioSuiteResult = {
  readonly id: string
  readonly title: string
  readonly priority: 'P1' | 'P2' | 'P3'
  readonly primaryAxis: string
  readonly budgets: ReadonlyArray<ScenarioBudget>
  readonly points: ReadonlyArray<ScenarioPointResult>
  readonly thresholds: ReadonlyArray<ScenarioThresholdResult>
}

export type ScenarioRunner = (args: {
  readonly suite: ScenarioSuite
  readonly params: Readonly<Record<string, Primitive>>
}) => Promise<ScenarioPointResult>

export type PerfProfileConfig = {
  readonly profile: string
  readonly runs: number
  readonly warmupDiscard: number
  readonly timeoutMs: number
  readonly stability?: {
    readonly maxP95DeltaRatio: number
    readonly maxP95DeltaMs: number
  }
}

export type DiffConclusion = {
  readonly mode: 'hard' | 'triage'
  readonly verdict: 'pass' | 'fail' | 'needs-triage'
  readonly reason: string
}

const cartesian = <T>(axes: ReadonlyArray<ReadonlyArray<T>>): ReadonlyArray<ReadonlyArray<T>> => {
  if (axes.length === 0) return [[]]
  const [head, ...tail] = axes
  const rest = cartesian(tail)
  const out: Array<ReadonlyArray<T>> = []
  for (const h of head ?? []) {
    for (const r of rest) {
      out.push([h, ...r])
    }
  }
  return out
}

const parseRef = (ref: string): Record<string, Primitive> => {
  const out: Record<string, Primitive> = {}
  for (const part of ref.split('&')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (!key) continue

    if (value === 'true') out[key] = true
    else if (value === 'false') out[key] = false
    else if (/^-?\d+(\.\d+)?$/.test(value)) out[key] = Number(value)
    else out[key] = value
  }
  return out
}

const findPoint = (
  points: ReadonlyArray<ScenarioPointResult>,
  expected: Readonly<Record<string, Primitive>>,
): ScenarioPointResult | undefined =>
  points.find((point) => Object.keys(expected).every((key) => point.params[key] === expected[key]))

const getMetricP95Ms = (
  point: ScenarioPointResult,
  metric: string,
): { readonly ok: true; readonly p95Ms: number } | { readonly ok: false; readonly reason: string } => {
  if (point.status !== 'ok') {
    return { ok: false, reason: point.reason ?? point.status }
  }

  const m = point.metrics.find((entry) => entry.name === metric)
  if (!m) return { ok: false, reason: 'metricMissing' }
  if (m.status !== 'ok') return { ok: false, reason: m.unavailableReason }
  return { ok: true, p95Ms: m.stats.p95Ms }
}

const computeAbsoluteThreshold = (
  suite: ScenarioSuite,
  points: ReadonlyArray<ScenarioPointResult>,
  budget: AbsoluteBudget,
  where: Readonly<Record<string, Primitive>>,
): { readonly maxLevel: Primitive | null; readonly firstFailLevel?: Primitive | null; readonly reason?: string } => {
  const levels = suite.axes[suite.primaryAxis] ?? []
  let maxLevel: Primitive | null = null

  for (const level of levels) {
    const expectedParams: Record<string, Primitive> = {
      ...where,
      [suite.primaryAxis]: level,
    }
    const point = findPoint(points, expectedParams)
    if (!point) {
      return { maxLevel, firstFailLevel: level, reason: 'missing' }
    }

    const metric = getMetricP95Ms(point, budget.metric)
    if (!metric.ok) {
      return { maxLevel, firstFailLevel: level, reason: metric.reason }
    }

    if (metric.p95Ms <= budget.p95Ms) {
      maxLevel = level
      continue
    }
    return { maxLevel, firstFailLevel: level, reason: 'budgetExceeded' }
  }

  return { maxLevel }
}

const computeRelativeThreshold = (
  suite: ScenarioSuite,
  points: ReadonlyArray<ScenarioPointResult>,
  budget: RelativeBudget,
  where: Readonly<Record<string, Primitive>>,
): { readonly maxLevel: Primitive | null; readonly firstFailLevel?: Primitive | null; readonly reason?: string } => {
  const levels = suite.axes[suite.primaryAxis] ?? []
  const numeratorRef = parseRef(budget.numeratorRef)
  const denominatorRef = parseRef(budget.denominatorRef)
  const minDeltaMs = typeof budget.minDeltaMs === 'number' && Number.isFinite(budget.minDeltaMs) ? budget.minDeltaMs : 0

  let maxLevel: Primitive | null = null

  for (const level of levels) {
    const numeratorPoint = findPoint(points, {
      ...where,
      ...numeratorRef,
      [suite.primaryAxis]: level,
    })
    if (!numeratorPoint) {
      return { maxLevel, firstFailLevel: level, reason: 'missingNumerator' }
    }

    const denominatorPoint = findPoint(points, {
      ...where,
      ...denominatorRef,
      [suite.primaryAxis]: level,
    })
    if (!denominatorPoint) {
      return { maxLevel, firstFailLevel: level, reason: 'missingDenominator' }
    }

    const numeratorP95 = getMetricP95Ms(numeratorPoint, budget.metric)
    if (!numeratorP95.ok) {
      return { maxLevel, firstFailLevel: level, reason: `numerator:${numeratorP95.reason}` }
    }

    const denominatorP95 = getMetricP95Ms(denominatorPoint, budget.metric)
    if (!denominatorP95.ok) {
      return { maxLevel, firstFailLevel: level, reason: `denominator:${denominatorP95.reason}` }
    }
    if (denominatorP95.p95Ms <= 0) {
      return { maxLevel, firstFailLevel: level, reason: 'denominatorZero' }
    }

    const ratio = numeratorP95.p95Ms / denominatorP95.p95Ms
    const deltaMs = numeratorP95.p95Ms - denominatorP95.p95Ms
    const overBudget = ratio > budget.maxRatio && deltaMs > minDeltaMs
    if (!overBudget) {
      maxLevel = level
      continue
    }

    return { maxLevel, firstFailLevel: level, reason: 'budgetExceeded' }
  }

  return { maxLevel }
}

const computeSuiteThresholds = (
  suite: ScenarioSuite,
  points: ReadonlyArray<ScenarioPointResult>,
): ReadonlyArray<ScenarioThresholdResult> => {
  const thresholds: ScenarioThresholdResult[] = []

  for (const budget of suite.budgets) {
    const refAxes =
      budget.type === 'relative'
        ? Array.from(new Set([...Object.keys(parseRef(budget.numeratorRef)), ...Object.keys(parseRef(budget.denominatorRef))]))
        : []

    const otherAxes = Object.keys(suite.axes).filter((axis) => axis !== suite.primaryAxis && !refAxes.includes(axis))
    const combos = cartesian(otherAxes.map((axis) => suite.axes[axis] ?? [])).map((values) => {
      const where: Record<string, Primitive> = {}
      for (let index = 0; index < otherAxes.length; index++) {
        where[otherAxes[index]!] = values[index]!
      }
      return where
    })

    for (const where of combos) {
      const result =
        budget.type === 'absolute'
          ? computeAbsoluteThreshold(suite, points, budget, where)
          : computeRelativeThreshold(suite, points, budget, where)

      thresholds.push({
        budget,
        where: Object.keys(where).length > 0 ? where : undefined,
        maxLevel: result.maxLevel,
        firstFailLevel: result.firstFailLevel ?? null,
        reason: result.reason,
      })
    }
  }

  return thresholds
}

const inferBrowserVersion = (): string | undefined => {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
  if (!ua) return undefined

  const chrome = ua.match(/(?:HeadlessChrome|Chrome)\/(\d+(?:\.\d+)+)/)
  if (chrome?.[1]) return chrome[1]

  const firefox = ua.match(/\bFirefox\/(\d+(?:\.\d+)+)\b/)
  if (firefox?.[1]) return firefox[1]

  const safari = ua.match(/\bVersion\/(\d+(?:\.\d+)+)\b/)
  if (safari?.[1]) return safari[1]

  return undefined
}

const resolveBrowserName = (): string => {
  const name = (matrix as any)?.defaults?.browser?.name
  return typeof name === 'string' && name.length > 0 ? name : 'chromium'
}

export const resolvePerfProfileConfig = (profileOverride?: string): PerfProfileConfig => {
  const profileFromEnv = (import.meta as any).env?.VITE_LOGIX_PERF_PROFILE as string | undefined
  const profile = profileOverride ?? profileFromEnv ?? 'default'
  const defaults = (matrix as any)?.defaults ?? {}
  const profiles = defaults.profiles ?? {}
  const selected = profiles[profile] ?? {}

  const runs = Number.isFinite(selected.runs) ? selected.runs : defaults.runs
  const warmupDiscard = Number.isFinite(selected.warmupDiscard) ? selected.warmupDiscard : defaults.warmupDiscard
  const timeoutMs = Number.isFinite(selected.timeoutMs) ? selected.timeoutMs : defaults.timeoutMs

  return {
    profile,
    runs: Number.isFinite(runs) ? runs : 20,
    warmupDiscard: Number.isFinite(warmupDiscard) ? warmupDiscard : 3,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 20_000,
    stability: defaults.stability,
  }
}

export const toSmokeProfile = (config: PerfProfileConfig): PerfProfileConfig => ({
  ...config,
  profile: `${config.profile}:smoke`,
  runs: Math.min(config.runs, 8),
  warmupDiscard: Math.min(config.warmupDiscard, 2),
  timeoutMs: Math.min(config.timeoutMs, 8_000),
})

export const resolveDiffConclusion = (args: {
  readonly comparable: boolean
  readonly regressions: number
}): DiffConclusion => {
  if (!args.comparable) {
    return {
      mode: 'triage',
      verdict: 'needs-triage',
      reason: 'comparability=false',
    }
  }
  if (args.regressions > 0) {
    return {
      mode: 'hard',
      verdict: 'fail',
      reason: 'regressions>0',
    }
  }
  return {
    mode: 'hard',
    verdict: 'pass',
    reason: 'no-regressions',
  }
}

export const runScenarioSuite = async (args: {
  readonly suite: ScenarioSuite
  readonly points: ReadonlyArray<Readonly<Record<string, Primitive>>>
  readonly runPoint: ScenarioRunner
}): Promise<ScenarioSuiteResult> => {
  const pointResults: ScenarioPointResult[] = []
  for (const params of args.points) {
    pointResults.push(await args.runPoint({ suite: args.suite, params }))
  }

  return {
    id: args.suite.id,
    title: args.suite.title,
    priority: args.suite.priority,
    primaryAxis: args.suite.primaryAxis,
    budgets: args.suite.budgets,
    points: pointResults,
    thresholds: computeSuiteThresholds(args.suite, pointResults),
  }
}

export const emitScenarioPerfReport = (args: {
  readonly suites: ReadonlyArray<ScenarioSuiteResult>
  readonly profile: PerfProfileConfig
  readonly generator: string
}): void => {
  const browserVersion = inferBrowserVersion()

  const report = {
    schemaVersion: 1,
    meta: {
      createdAt: new Date().toISOString(),
      generator: args.generator,
      matrixId: (matrix as any)?.id ?? 'logix-browser-perf-matrix-v1',
      config: {
        runs: args.profile.runs,
        warmupDiscard: args.profile.warmupDiscard,
        timeoutMs: args.profile.timeoutMs,
        headless: true,
        profile: args.profile.profile,
        stability: args.profile.stability,
      },
      env: {
        os: 'browser',
        arch: 'browser',
        node: 'browser',
        browser: {
          name: resolveBrowserName(),
          headless: true,
          version: browserVersion,
        },
      },
    },
    suites: args.suites,
  }

  // eslint-disable-next-line no-console
  console.log(`${LOGIX_PERF_REPORT_PREFIX}${JSON.stringify(report)}`)
}
