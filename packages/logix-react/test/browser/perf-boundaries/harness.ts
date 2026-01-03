import { Effect, Layer } from 'effect'
import * as Logix from '@logix/core'
import * as CoreNg from '@logix/core-ng'

export type Primitive = string | number | boolean
export type Params = Record<string, Primitive>

export type AbsoluteBudget = {
  readonly id?: string
  readonly type: 'absolute'
  readonly metric: string
  readonly p95Ms: number
}

export type RelativeBudget = {
  readonly id?: string
  readonly type: 'relative'
  readonly metric: string
  readonly maxRatio: number
  readonly numeratorRef: string
  readonly denominatorRef: string
}

export type Budget = AbsoluteBudget | RelativeBudget

export type MetricResult =
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

export type MetricSample = number | { readonly unavailableReason: string }

export type EvidenceUnit = 'count' | 'ratio' | 'bytes' | 'string'

export type EvidenceSample = number | string | { readonly unavailableReason: string }

export type EvidenceResult =
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

export type PointResult = {
  readonly params: Params
  readonly status: 'ok' | 'timeout' | 'failed' | 'skipped'
  readonly reason?: string
  readonly metrics: ReadonlyArray<MetricResult>
  readonly evidence?: ReadonlyArray<EvidenceResult>
}

export type ThresholdResult = {
  readonly budget: Budget
  readonly where?: Params
  readonly maxLevel: Primitive | null
  readonly firstFailLevel?: Primitive | null
  readonly reason?: string
}

export type SuiteSpec = {
  readonly primaryAxis: string
  readonly axes: Record<string, ReadonlyArray<Primitive>>
}

export type MatrixSuite = SuiteSpec & {
  readonly id: string
  readonly title?: string
  readonly priority?: 'P1' | 'P2' | 'P3'
  readonly metrics: ReadonlyArray<string>
  readonly budgets?: ReadonlyArray<Budget>
  readonly requiredEvidence?: ReadonlyArray<string>
}

export type ProfileConfig = {
  readonly runs: number
  readonly warmupDiscard: number
  readonly timeoutMs: number
}

export const getProfileConfig = (matrix: {
  readonly defaults: {
    readonly runs: number
    readonly warmupDiscard: number
    readonly timeoutMs: number
    readonly profiles?: Record<string, ProfileConfig>
  }
}): ProfileConfig => {
  const profile = import.meta.env.VITE_LOGIX_PERF_PROFILE
  const profiles = matrix.defaults.profiles ?? {}

  if (profile && profiles[profile]) {
    return profiles[profile]!
  }

  return {
    runs: matrix.defaults.runs,
    warmupDiscard: matrix.defaults.warmupDiscard,
    timeoutMs: matrix.defaults.timeoutMs,
  }
}

const quantile = (sorted: ReadonlyArray<number>, q: number): number => {
  if (sorted.length === 0) return Number.NaN
  const clamped = Math.min(1, Math.max(0, q))
  const idx = Math.floor(clamped * (sorted.length - 1))
  return sorted[idx]!
}

export const summarizeMs = (
  samples: ReadonlyArray<number>,
): { readonly n: number; readonly medianMs: number; readonly p95Ms: number } => {
  const sorted = samples.slice().sort((a, b) => a - b)
  return {
    n: sorted.length,
    medianMs: quantile(sorted, 0.5),
    p95Ms: quantile(sorted, 0.95),
  }
}

const summarizeNumber = (samples: ReadonlyArray<number>): number => {
  const sorted = samples.slice().sort((a, b) => a - b)
  return quantile(sorted, 0.5)
}

const inferEvidenceUnit = (name: string): EvidenceUnit => {
  const lowered = name.toLowerCase()
  if (lowered.includes('bytes') || lowered.includes('byte')) return 'bytes'
  if (lowered.includes('ratio') || lowered.includes('rate')) return 'ratio'
  return 'count'
}

const defaultEvidenceFromParams = (params: Params): Record<string, EvidenceSample> => {
  const policyMode = params.policyMode
  const yieldStrategy = params.yieldStrategy
  const keyMode = params.keyMode

  const out: Record<string, EvidenceSample> = {}

  const perfKernelRaw = import.meta.env.VITE_LOGIX_PERF_KERNEL_ID
  out['runtime.kernelId'] = perfKernelRaw === 'core' ? 'core' : perfKernelRaw === 'core-ng' ? 'core-ng' : 'core'

  if (policyMode !== undefined) {
    out['react.policy.mode'] = String(policyMode)
  }

  if (yieldStrategy !== undefined) {
    out['react.policy.yieldStrategy'] = String(yieldStrategy)
  }

  if (keyMode !== undefined) {
    out['react.module.keyMode'] = String(keyMode)
  }

  return out
}

export const silentDebugLayer = Logix.Debug.replace([
  {
    record: () => Effect.void,
  },
])

const readPerfKernelId = (): Logix.Kernel.KernelId | undefined => {
  const raw = import.meta.env.VITE_LOGIX_PERF_KERNEL_ID
  if (raw === 'core') return 'core'
  if (raw === 'core-ng') return 'core-ng'
  return 'core'
}

export const makePerfKernelLayer = (): Layer.Layer<any, never, never> => {
  const kernelId = readPerfKernelId()
  if (kernelId === 'core') return Layer.empty as Layer.Layer<any, never, never>

  return CoreNg.coreNgFullCutoverLayer({
    capabilities: ['perf:fullCutover'],
  }) as Layer.Layer<any, never, never>
}

const withTimeout = async <A>(
  timeoutMs: number,
  run: () => Promise<A>,
): Promise<{ readonly ok: true; readonly value: A } | { readonly ok: false; readonly reason: 'timeout' }> => {
  if (timeoutMs <= 0) return { ok: false, reason: 'timeout' }

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  try {
    const value = await Promise.race([
      run(),
      new Promise<never>((_resolve, reject) => {
        timeoutId = setTimeout(() => reject(new Error('timeout')), timeoutMs)
      }),
    ])
    return { ok: true, value }
  } catch (e) {
    if (e instanceof Error && e.message === 'timeout') {
      return { ok: false, reason: 'timeout' }
    }
    throw e
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
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

const findPoint = (points: ReadonlyArray<PointResult>, expected: Params): PointResult | undefined =>
  points.find((p) => Object.keys(expected).every((k) => p.params[k] === expected[k]))

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

const computeThresholdMaxLevelAbsolute = (
  suiteSpec: SuiteSpec,
  points: ReadonlyArray<PointResult>,
  budget: AbsoluteBudget,
  where: Params,
): { readonly maxLevel: Primitive | null; readonly firstFailLevel?: Primitive | null; readonly reason?: string } => {
  const axisLevels = suiteSpec.axes[suiteSpec.primaryAxis] ?? []
  const metric = budget.metric

  let maxLevel: Primitive | null = null
  for (const level of axisLevels) {
    const params: Params = { ...where, [suiteSpec.primaryAxis]: level }
    const point = findPoint(points, params)
    if (!point) {
      return { maxLevel, firstFailLevel: level, reason: 'missing' }
    }

    const res = getMetricP95Ms(point, metric)
    if (!res.ok) {
      return { maxLevel, firstFailLevel: level, reason: res.reason }
    }

    if (res.p95Ms <= budget.p95Ms) {
      maxLevel = level
      continue
    }

    return { maxLevel, firstFailLevel: level, reason: 'budgetExceeded' }
  }

  return { maxLevel }
}

const computeThresholdMaxLevelRelative = (
  suiteSpec: SuiteSpec,
  points: ReadonlyArray<PointResult>,
  budget: RelativeBudget,
  where: Params,
): { readonly maxLevel: Primitive | null; readonly firstFailLevel?: Primitive | null; readonly reason?: string } => {
  const axisLevels = suiteSpec.axes[suiteSpec.primaryAxis] ?? []
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

    const numeratorPoint = findPoint(points, numeratorParams)
    if (!numeratorPoint) {
      return { maxLevel, firstFailLevel: level, reason: 'missingNumerator' }
    }
    const denominatorPoint = findPoint(points, denominatorParams)
    if (!denominatorPoint) {
      return { maxLevel, firstFailLevel: level, reason: 'missingDenominator' }
    }

    const numeratorP95 = getMetricP95Ms(numeratorPoint, metric)
    if (!numeratorP95.ok) {
      return { maxLevel, firstFailLevel: level, reason: `numerator:${numeratorP95.reason}` }
    }

    const denominatorP95 = getMetricP95Ms(denominatorPoint, metric)
    if (!denominatorP95.ok) {
      return {
        maxLevel,
        firstFailLevel: level,
        reason: `denominator:${denominatorP95.reason}`,
      }
    }

    if (denominatorP95.p95Ms <= 0) {
      return { maxLevel, firstFailLevel: level, reason: 'denominatorZero' }
    }

    const ratio = numeratorP95.p95Ms / denominatorP95.p95Ms
    if (ratio <= budget.maxRatio) {
      maxLevel = level
      continue
    }

    return { maxLevel, firstFailLevel: level, reason: 'budgetExceeded' }
  }

  return { maxLevel }
}

export const computeSuiteThresholds = (
  suiteSpec: SuiteSpec,
  points: ReadonlyArray<PointResult>,
  budgets: ReadonlyArray<Budget>,
): ReadonlyArray<ThresholdResult> => {
  const thresholds: ThresholdResult[] = []

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

    const otherAxes = Object.keys(suiteSpec.axes).filter((k) => k !== suiteSpec.primaryAxis && !refAxes.includes(k))
    const otherAxisLevels = otherAxes.map((k) => suiteSpec.axes[k] ?? [])
    const whereCombos = cartesian(otherAxisLevels).map((values) => {
      const where: Params = {}
      for (let i = 0; i < otherAxes.length; i++) {
        where[otherAxes[i]!] = values[i]!
      }
      return where
    })

    for (const where of whereCombos) {
      const res =
        budget.type === 'absolute'
          ? computeThresholdMaxLevelAbsolute(suiteSpec, points, budget, where)
          : computeThresholdMaxLevelRelative(suiteSpec, points, budget, where)

      thresholds.push({
        budget,
        where: Object.keys(where).length > 0 ? where : undefined,
        maxLevel: res.maxLevel,
        firstFailLevel: res.firstFailLevel ?? null,
        reason: res.reason,
      })
    }
  }

  return thresholds
}

export const runMatrixSuite = async (
  suite: MatrixSuite,
  config: {
    readonly runs: number
    readonly warmupDiscard: number
    readonly timeoutMs: number
  },
  measureOnce: (
    params: Params,
  ) => Promise<
    | Record<string, MetricSample>
    | { readonly metrics: Record<string, MetricSample>; readonly evidence?: Record<string, EvidenceSample> }
  >,
  options?: {
    readonly enrichParams?: (params: Params) => Params
    readonly shouldSkip?: (params: Params) => { readonly skip: boolean; readonly reason?: string }
    readonly cutOffOn?: ReadonlyArray<'timeout' | 'failed'>
  },
): Promise<{ readonly points: ReadonlyArray<PointResult>; readonly thresholds: ReadonlyArray<ThresholdResult> }> => {
  const { runs, warmupDiscard, timeoutMs } = config
  const primaryAxis = suite.primaryAxis
  const primaryLevels = suite.axes[primaryAxis] ?? []

  const axisKeys = Object.keys(suite.axes)
  const otherAxes = axisKeys.filter((k) => k !== primaryAxis)
  const cutOffOn = new Set(options?.cutOffOn ?? ['timeout', 'failed'])

  const requiredEvidence = Array.isArray(suite.requiredEvidence) ? suite.requiredEvidence : []

  const makeSkippedPoint = (
    rawParams: Params,
    unavailableReason: 'cutOff' | 'skipped',
    reason?: string,
  ): PointResult => ({
    params: rawParams,
    status: 'skipped',
    reason,
    metrics: suite.metrics.map((name) => ({
      name,
      unit: 'ms',
      status: 'unavailable',
      unavailableReason,
    })),
    evidence:
      requiredEvidence.length > 0
        ? requiredEvidence.map((name) => ({
            name,
            unit: inferEvidenceUnit(name),
            status: 'unavailable',
            unavailableReason,
          }))
        : undefined,
  })

  const measurePoint = async (rawParams: Params): Promise<PointResult> => {
    const samplesByMetric = new Map<string, number[]>()
    const unavailableByMetric = new Map<string, string>()

    const samplesByEvidenceNumber = new Map<string, number[]>()
    const samplesByEvidenceString = new Map<string, string[]>()
    const unavailableByEvidence = new Map<string, string>()

    let status: PointResult['status'] = 'ok'
    let reason: string | undefined

    const pointStartedAt = performance.now()

    for (let runIndex = 0; runIndex < runs; runIndex++) {
      const elapsedMs = performance.now() - pointStartedAt
      const remainingMs = timeoutMs - elapsedMs
      if (remainingMs <= 0) {
        status = 'timeout'
        reason = `pointTimeoutMs=${timeoutMs}`
        break
      }

      const res = await withTimeout(remainingMs, () => measureOnce(rawParams))
      if (!res.ok) {
        status = 'timeout'
        reason = `pointTimeoutMs=${timeoutMs}`
        break
      }

      const envelope = res.value
      const metricsSamples =
        typeof envelope === 'object' &&
        envelope !== null &&
        'metrics' in envelope &&
        typeof (envelope as any).metrics === 'object' &&
        (envelope as any).metrics !== null
          ? ((envelope as any).metrics as Record<string, MetricSample>)
          : (envelope as Record<string, MetricSample>)

      const evidenceSamples =
        typeof envelope === 'object' &&
        envelope !== null &&
        'metrics' in envelope &&
        typeof (envelope as any).metrics === 'object' &&
        (envelope as any).metrics !== null
          ? ((envelope as any).evidence as Record<string, EvidenceSample> | undefined)
          : undefined

      const mergedEvidence = {
        ...defaultEvidenceFromParams(rawParams),
        ...(evidenceSamples ?? {}),
      }

      for (const metricName of suite.metrics) {
        const v = metricsSamples[metricName]
        if (typeof v === 'number' && Number.isFinite(v)) {
          const list = samplesByMetric.get(metricName) ?? []
          list.push(v)
          samplesByMetric.set(metricName, list)
        } else if (v && typeof v === 'object') {
          if (!unavailableByMetric.has(metricName)) {
            unavailableByMetric.set(metricName, (v as any).unavailableReason ?? 'unavailable')
          }
        }
      }

      for (const [name, v] of Object.entries(mergedEvidence)) {
        if (typeof v === 'number' && Number.isFinite(v)) {
          const list = samplesByEvidenceNumber.get(name) ?? []
          list.push(v)
          samplesByEvidenceNumber.set(name, list)
        } else if (typeof v === 'string') {
          const list = samplesByEvidenceString.get(name) ?? []
          list.push(v)
          samplesByEvidenceString.set(name, list)
        } else if (v && typeof v === 'object') {
          if (!unavailableByEvidence.has(name)) {
            unavailableByEvidence.set(name, (v as any).unavailableReason ?? 'unavailable')
          }
        }
      }
    }

    if (status !== 'ok') {
      return {
        params: rawParams,
        status,
        reason,
        metrics: suite.metrics.map((name) => ({
          name,
          unit: 'ms',
          status: 'unavailable',
          unavailableReason: reason ?? status,
        })),
        evidence:
          requiredEvidence.length > 0
            ? requiredEvidence.map((name) => ({
                name,
                unit: inferEvidenceUnit(name),
                status: 'unavailable',
                unavailableReason: reason ?? status,
              }))
            : undefined,
      }
    }

    const metrics: MetricResult[] = []
    for (const metricName of suite.metrics) {
      const samples = samplesByMetric.get(metricName) ?? []
      const trimmed = samples.slice(Math.min(warmupDiscard, samples.length))
      if (trimmed.length === 0) {
        metrics.push({
          name: metricName,
          unit: 'ms',
          status: 'unavailable',
          unavailableReason:
            unavailableByMetric.get(metricName) ?? (samples.length === 0 ? 'metricMissing' : 'insufficientSamples'),
        })
        continue
      }

      metrics.push({
        name: metricName,
        unit: 'ms',
        status: 'ok',
        stats: summarizeMs(trimmed),
      })
    }

    const evidenceNames = Array.from(
      new Set<string>([
        ...requiredEvidence,
        ...samplesByEvidenceNumber.keys(),
        ...samplesByEvidenceString.keys(),
        ...unavailableByEvidence.keys(),
      ]),
    ).sort()

    const evidence: EvidenceResult[] = []
    for (const name of evidenceNames) {
      const nums = samplesByEvidenceNumber.get(name) ?? []
      const strs = samplesByEvidenceString.get(name) ?? []
      const trimmedNums = nums.slice(Math.min(warmupDiscard, nums.length))
      const trimmedStrs = strs.slice(Math.min(warmupDiscard, strs.length))

      if (trimmedNums.length > 0) {
        evidence.push({
          name,
          unit: inferEvidenceUnit(name),
          status: 'ok',
          value: summarizeNumber(trimmedNums),
        })
        continue
      }

      if (trimmedStrs.length > 0) {
        evidence.push({
          name,
          unit: 'string',
          status: 'ok',
          value: trimmedStrs[trimmedStrs.length - 1]!,
        })
        continue
      }

      evidence.push({
        name,
        unit: strs.length > 0 ? 'string' : inferEvidenceUnit(name),
        status: 'unavailable',
        unavailableReason:
          unavailableByEvidence.get(name) ??
          (nums.length === 0 && strs.length === 0 ? 'evidenceMissing' : 'insufficientSamples'),
      })
    }

    return {
      params: rawParams,
      status: 'ok',
      metrics,
      evidence: evidence.length > 0 ? evidence : undefined,
    }
  }

  const relativeBudgetRefs = (suite.budgets ?? [])
    .filter((b): b is RelativeBudget => b.type === 'relative')
    .map((b) => ({
      numerator: parseRef(b.numeratorRef),
      denominator: parseRef(b.denominatorRef),
    }))

  const refAxesSet = new Set<string>()
  for (const ref of relativeBudgetRefs) {
    for (const k of Object.keys(ref.numerator)) {
      if (k !== primaryAxis) refAxesSet.add(k)
    }
    for (const k of Object.keys(ref.denominator)) {
      if (k !== primaryAxis) refAxesSet.add(k)
    }
  }

  const baseAxes = otherAxes.filter((k) => !refAxesSet.has(k))
  const refAxes = otherAxes.filter((k) => refAxesSet.has(k))

  const orderAxisLevels = (axis: string): ReadonlyArray<Primitive> => {
    const levels = suite.axes[axis] ?? []
    if (relativeBudgetRefs.length === 0 || levels.length === 0) return levels

    const out: Primitive[] = []
    const pushIfExists = (v: unknown): void => {
      if (v === undefined) return
      if (!levels.some((x) => x === v)) return
      if (out.some((x) => x === v)) return
      out.push(v as Primitive)
    }

    for (const ref of relativeBudgetRefs) {
      pushIfExists(ref.denominator[axis])
      pushIfExists(ref.numerator[axis])
    }

    for (const level of levels) {
      if (!out.some((x) => x === level)) out.push(level)
    }

    return out
  }

  const makeWhereCombos = (axes: ReadonlyArray<string>, axisLevels: ReadonlyArray<ReadonlyArray<Primitive>>): ReadonlyArray<Params> =>
    cartesian(axisLevels).map((values) => {
      const where: Params = {}
      for (let i = 0; i < axes.length; i++) {
        where[axes[i]!] = values[i]!
      }
      return where
    })

  const baseWhereCombos = makeWhereCombos(baseAxes, baseAxes.map((k) => suite.axes[k] ?? []))
  const refWhereCombos = makeWhereCombos(refAxes, refAxes.map((k) => orderAxisLevels(k)))

  type CutOffState = {
    cutOff: boolean
    cutOffReason?: string
    cutOffSkippedCount: number
  }

  const cutOffStateByWhereKey = new Map<string, CutOffState>()
  const getCutOffState = (whereKey: string): CutOffState => {
    const cached = cutOffStateByWhereKey.get(whereKey)
    if (cached) return cached
    const created: CutOffState = { cutOff: false, cutOffSkippedCount: 0 }
    cutOffStateByWhereKey.set(whereKey, created)
    return created
  }

  const whereKeyFromWhere = (where: Params): string => otherAxes.map((k) => `${k}=${String(where[k])}`).join('|')
  const whereKeyFromParams = (params: Params): string => otherAxes.map((k) => `${k}=${String((params as any)[k])}`).join('|')

  const points: PointResult[] = []
  for (const baseWhere of baseWhereCombos) {
    for (const level of primaryLevels) {
      for (const refWhere of refWhereCombos) {
        const where: Params = { ...baseWhere, ...refWhere }
        const whereKey = whereKeyFromWhere(where)
        const cutOffState = getCutOffState(whereKey)

        const baseParams: Params = { ...where, [primaryAxis]: level }
        const rawParams = options?.enrichParams ? options.enrichParams(baseParams) : baseParams
        const skip = options?.shouldSkip?.(rawParams)

        if (cutOffState.cutOff || skip?.skip) {
          if (cutOffState.cutOff) cutOffState.cutOffSkippedCount += 1

          points.push(
            makeSkippedPoint(
              rawParams,
              cutOffState.cutOff ? 'cutOff' : 'skipped',
              cutOffState.cutOff ? cutOffState.cutOffReason : skip?.reason,
            ),
          )
          continue
        }

        const point = await measurePoint(rawParams)
        points.push(point)

        if (point.status !== 'ok' && cutOffOn.has(point.status)) {
          cutOffState.cutOff = true
          cutOffState.cutOffReason = point.reason ?? point.status
        }
      }
    }
  }

  const pointsWithCutOffCount = points.map((p) => {
    const whereKey = whereKeyFromParams(p.params)
    const cutOffSkippedCount = cutOffStateByWhereKey.get(whereKey)?.cutOffSkippedCount ?? 0
    const prevEvidence = (p.evidence ?? []).filter((e) => e.name !== 'budget.cutOffCount')
    return {
      ...p,
      evidence: [
        ...prevEvidence,
        {
          name: 'budget.cutOffCount',
          unit: 'count',
          status: 'ok',
          value: cutOffSkippedCount,
        },
      ],
    }
  })

  const thresholds = computeSuiteThresholds(
    { primaryAxis: suite.primaryAxis, axes: suite.axes },
    pointsWithCutOffCount,
    suite.budgets ?? [],
  )

  return { points: pointsWithCutOffCount, thresholds }
}

export const withNodeEnv = async <A>(nodeEnv: string, run: () => Promise<A>): Promise<A> => {
  const proc = (globalThis as any).process as { env?: Record<string, string | undefined> } | undefined
  const prevNodeEnv = proc?.env?.NODE_ENV
  const prevExecVmMode = proc?.env?.LOGIX_CORE_NG_EXEC_VM_MODE

  ;(globalThis as any).process = proc ?? { env: {} }
  ;(globalThis as any).process.env = (globalThis as any).process.env ?? {}
  ;(globalThis as any).process.env.NODE_ENV = nodeEnv

  const viteExecVmMode = import.meta.env.VITE_LOGIX_CORE_NG_EXEC_VM_MODE
  if (typeof viteExecVmMode === 'string' && viteExecVmMode.trim().length > 0) {
    ;(globalThis as any).process.env.LOGIX_CORE_NG_EXEC_VM_MODE = viteExecVmMode.trim()
  }

  try {
    return await run()
  } finally {
    const env = (globalThis as any).process?.env as Record<string, string | undefined> | undefined
    if (env) {
      if (prevNodeEnv === undefined) {
        delete env.NODE_ENV
      } else {
        env.NODE_ENV = prevNodeEnv
      }

      if (viteExecVmMode !== undefined) {
        if (prevExecVmMode === undefined) {
          delete env.LOGIX_CORE_NG_EXEC_VM_MODE
        } else {
          env.LOGIX_CORE_NG_EXEC_VM_MODE = prevExecVmMode
        }
      }
    }
  }
}
