const fs = require('node:fs')
const path = require('node:path')

const usage = () => `\
Usage:
  node .github/scripts/logix-perf-tail-recheck.cjs plan \\
    --before <before.json> \\
    --after <after.json> \\
    --matrix <matrix.json> \\
    [--suite-id <id>] \\
    [--budget-id <id>] \\
    [--converge-mode <mode>] \\
    [--max-candidates <n>] \\
    [--near-budget-min-ratio <ratio>] \\
    [--matrix-out <target.matrix.json>] \\
    [--env-out <github.env>] \\
    --out <plan.json>

  node .github/scripts/logix-perf-tail-recheck.cjs evaluate \\
    --plan <plan.json> \\
    --report-dir <dir> \\
    [--sample-prefix <prefix>] \\
    [--before <before.json>] \\
    [--after <after.json>] \\
    [--env-out <github.env>] \\
    --out <summary.json>
`

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))

const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

const writeEnv = (envOut, values) => {
  if (!envOut) return
  fs.mkdirSync(path.dirname(envOut), { recursive: true })
  const lines = []
  for (const [key, value] of Object.entries(values)) {
    if (value == null) continue
    lines.push(`${key}=${String(value)}`)
  }
  if (lines.length > 0) {
    fs.appendFileSync(envOut, `${lines.join('\n')}\n`, 'utf8')
  }
}

const parseIntStrict = (raw, fallback) => {
  if (raw == null || String(raw).trim().length === 0) return fallback
  const n = Number(raw)
  if (!Number.isFinite(n)) return fallback
  return Math.max(0, Math.round(n))
}

const toFiniteNumberOrNull = (raw) => {
  if (raw == null) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

const quantileCeil = (values, q) => {
  if (!Array.isArray(values) || values.length === 0) return 0
  const sorted = values
    .filter((x) => typeof x === 'number' && Number.isFinite(x))
    .slice()
    .sort((a, b) => a - b)
  if (sorted.length === 0) return 0
  const clampedQ = Math.max(0, Math.min(1, q))
  const index = Math.ceil(clampedQ * (sorted.length - 1))
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))] ?? 0
}

const toSortedUniqueNumbers = (values) =>
  Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((x) => Number(x))
        .filter((x) => Number.isFinite(x) && x > 0),
    ),
  ).sort((a, b) => a - b)

const parseRef = (ref) => {
  const out = {}
  for (const part of String(ref || '').split('&')) {
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

const findSuite = (report, suiteId) => {
  const suites = Array.isArray(report?.suites) ? report.suites : []
  return suites.find((suite) => suite?.id === suiteId) ?? null
}

const findBudget = (suiteSpec, suiteReport, budgetId) => {
  const fromSpec = Array.isArray(suiteSpec?.budgets) ? suiteSpec.budgets : []
  const foundInSpec = fromSpec.find((budget) => budget?.id === budgetId)
  if (foundInSpec) return foundInSpec

  const fromReport = Array.isArray(suiteReport?.budgets) ? suiteReport.budgets : []
  const foundInReport = fromReport.find((budget) => budget?.id === budgetId)
  if (foundInReport) return foundInReport

  const thresholds = Array.isArray(suiteReport?.thresholds) ? suiteReport.thresholds : []
  for (const threshold of thresholds) {
    if (!threshold || typeof threshold !== 'object') continue
    const budget = threshold.budget
    if (!budget || typeof budget !== 'object') continue
    if (budget.id === budgetId) return budget
  }
  return null
}

const findPoint = (suite, expectedParams) => {
  if (!suite || !Array.isArray(suite.points)) return null
  const keys = Object.keys(expectedParams || {})
  return suite.points.find((point) => keys.every((key) => point?.params?.[key] === expectedParams[key])) ?? null
}

const getMetricStatsMs = (point, metric) => {
  if (!point) return { ok: false, reason: 'pointMissing' }
  if (point.status !== 'ok') return { ok: false, reason: point.reason ?? point.status ?? 'notOk' }
  const metricEntry = Array.isArray(point.metrics) ? point.metrics.find((entry) => entry.name === metric) : null
  if (!metricEntry) return { ok: false, reason: 'metricMissing' }
  if (metricEntry.status !== 'ok') {
    return { ok: false, reason: metricEntry.unavailableReason ?? 'metricUnavailable' }
  }
  const n = metricEntry.stats?.n
  const medianMs = metricEntry.stats?.medianMs
  const p95Ms = metricEntry.stats?.p95Ms
  if (typeof n !== 'number' || typeof medianMs !== 'number' || typeof p95Ms !== 'number') {
    return { ok: false, reason: 'statsMissing' }
  }
  return { ok: true, stats: { n, medianMs, p95Ms } }
}

const getRelativeMinDeltaMs = (budget) => {
  const value = budget?.minDeltaMs
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

const isRelativeBudgetExceeded = (budget, ratio, deltaMs) =>
  ratio > budget.maxRatio && deltaMs > getRelativeMinDeltaMs(budget)

const computeRelativeStatsAt = (suite, budget, where, level) => {
  const primaryAxis = 'steps'
  const numeratorRef = parseRef(budget.numeratorRef)
  const denominatorRef = parseRef(budget.denominatorRef)
  const numeratorPoint = findPoint(suite, { ...where, ...numeratorRef, [primaryAxis]: level })
  const denominatorPoint = findPoint(suite, { ...where, ...denominatorRef, [primaryAxis]: level })
  if (!numeratorPoint) return { ok: false, reason: 'missingNumerator' }
  if (!denominatorPoint) return { ok: false, reason: 'missingDenominator' }

  const numeratorStats = getMetricStatsMs(numeratorPoint, budget.metric)
  const denominatorStats = getMetricStatsMs(denominatorPoint, budget.metric)
  if (!numeratorStats.ok) return { ok: false, reason: `numerator:${numeratorStats.reason}` }
  if (!denominatorStats.ok) return { ok: false, reason: `denominator:${denominatorStats.reason}` }
  if (!(denominatorStats.stats.p95Ms > 0) || !(denominatorStats.stats.medianMs > 0)) {
    return { ok: false, reason: 'denominatorZero' }
  }

  return {
    ok: true,
    n: Math.min(numeratorStats.stats.n, denominatorStats.stats.n),
    numeratorP95Ms: numeratorStats.stats.p95Ms,
    denominatorP95Ms: denominatorStats.stats.p95Ms,
    numeratorMedianMs: numeratorStats.stats.medianMs,
    denominatorMedianMs: denominatorStats.stats.medianMs,
    ratioP95: numeratorStats.stats.p95Ms / denominatorStats.stats.p95Ms,
    ratioMedian: numeratorStats.stats.medianMs / denominatorStats.stats.medianMs,
    deltaP95Ms: numeratorStats.stats.p95Ms - denominatorStats.stats.p95Ms,
    deltaMedianMs: numeratorStats.stats.medianMs - denominatorStats.stats.medianMs,
  }
}

const classificationRank = (classification) => {
  if (classification === 'tail-only') return 0
  if (classification === 'systemic') return 1
  if (classification === 'near-budget-pass') return 2
  return 3
}

const pickAnchoredNearBudgetCandidates = ({ candidates, maxCandidates }) => {
  const ordered = Array.isArray(candidates) ? candidates.slice() : []
  if (ordered.length <= 0 || maxCandidates <= 0) {
    return { selectedCandidates: [], anchorLabels: [] }
  }
  if (ordered.length <= maxCandidates) {
    return {
      selectedCandidates: ordered,
      anchorLabels: ordered.map((_, index) => (index === 0 ? 'high-risk' : index === ordered.length - 1 ? 'low-risk' : 'mid-risk')),
    }
  }

  const selected = []
  const used = new Set()
  const lastIndex = ordered.length - 1
  const pushIndex = (index, label) => {
    if (selected.length >= maxCandidates) return
    if (!(index >= 0 && index < ordered.length)) return
    if (used.has(index)) return
    used.add(index)
    selected.push({ candidate: ordered[index], label })
  }

  pushIndex(0, 'high-risk')
  if (maxCandidates > 1) {
    pushIndex(Math.floor(lastIndex / 2), 'mid-risk')
  }
  if (maxCandidates > 2) {
    pushIndex(lastIndex, 'low-risk')
  }
  for (let index = 1; index <= lastIndex && selected.length < maxCandidates; index++) {
    pushIndex(index, 'adjacent-risk')
  }

  return {
    selectedCandidates: selected.map((item) => item.candidate),
    anchorLabels: selected.map((item) => item.label),
  }
}

const buildTargetMatrix = ({ matrix, suiteId, stepsLevels, dirtyRootsRatios }) => {
  const nextMatrix = JSON.parse(JSON.stringify(matrix))
  const suites = Array.isArray(nextMatrix?.suites) ? nextMatrix.suites : []
  const suite = suites.find((item) => item?.id === suiteId)
  if (!suite || typeof suite !== 'object') return nextMatrix

  suite.axes = suite.axes && typeof suite.axes === 'object' ? suite.axes : {}
  suite.axes.steps = toSortedUniqueNumbers(stepsLevels)
  suite.axes.dirtyRootsRatio = toSortedUniqueNumbers(dirtyRootsRatios)

  const convergeModes = Array.isArray(suite.axes.convergeMode) ? suite.axes.convergeMode : []
  const filteredModes = convergeModes.filter((mode) => mode === 'full' || mode === 'auto')
  suite.axes.convergeMode = filteredModes.length > 0 ? filteredModes : ['full', 'auto']

  if (Array.isArray(suite.baselinePoints)) {
    suite.baselinePoints = suite.baselinePoints.filter((point) => {
      const steps = Number(point?.steps)
      const ratio = Number(point?.dirtyRootsRatio)
      const mode = point?.convergeMode
      return (
        Number.isFinite(steps) &&
        Number.isFinite(ratio) &&
        suite.axes.steps.includes(steps) &&
        suite.axes.dirtyRootsRatio.includes(ratio) &&
        suite.axes.convergeMode.includes(mode)
      )
    })
  }

  return nextMatrix
}

const parseArgs = (argv) => {
  const mode = argv[0]
  const kv = {}
  for (let i = 1; i < argv.length; i++) {
    const token = argv[i]
    if (!token.startsWith('--')) continue
    const key = token.slice(2)
    const value = argv[i + 1]
    if (value == null || value.startsWith('--')) {
      kv[key] = 'true'
      continue
    }
    kv[key] = value
    i += 1
  }
  return { mode, kv }
}

const parseRatioOrDefault = (raw, fallback) => {
  if (raw == null || String(raw).trim().length === 0) return fallback
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.min(Math.max(n, 0.5), 0.999)
}

const collectSuiteLevels = (suiteSpec, suiteReport) => {
  const values = []
  if (Array.isArray(suiteSpec?.axes?.steps)) {
    values.push(...suiteSpec.axes.steps)
  }
  if (Array.isArray(suiteReport?.points)) {
    values.push(...suiteReport.points.map((point) => point?.params?.steps))
  }
  return toSortedUniqueNumbers(values)
}

const cmdPlan = (kv) => {
  const beforeFile = kv.before ? path.resolve(process.cwd(), kv.before) : null
  const afterFile = kv.after ? path.resolve(process.cwd(), kv.after) : null
  const matrixFile = kv.matrix ? path.resolve(process.cwd(), kv.matrix) : null
  const outFile = kv.out ? path.resolve(process.cwd(), kv.out) : null
  const matrixOut = kv['matrix-out'] ? path.resolve(process.cwd(), kv['matrix-out']) : null
  const envOut = kv['env-out'] ? path.resolve(process.cwd(), kv['env-out']) : null

  if (!afterFile || !fs.existsSync(afterFile)) {
    throw new Error(`missing --after report: ${String(kv.after ?? '')}`)
  }
  if (!matrixFile || !fs.existsSync(matrixFile)) {
    throw new Error(`missing --matrix file: ${String(kv.matrix ?? '')}`)
  }
  if (!outFile) {
    throw new Error('missing --out file')
  }

  const suiteId = kv['suite-id'] || 'converge.txnCommit'
  const budgetId = kv['budget-id'] || 'auto<=full*1.05'
  const convergeMode = kv['converge-mode'] || 'auto'
  const maxCandidates = Math.max(1, parseIntStrict(kv['max-candidates'], 3))
  const nearBudgetMinRatio = parseRatioOrDefault(kv['near-budget-min-ratio'], 0.92)

  const matrix = readJson(matrixFile)
  const afterReport = readJson(afterFile)
  const beforeReport = beforeFile && fs.existsSync(beforeFile) ? readJson(beforeFile) : null

  const suiteSpec = (Array.isArray(matrix?.suites) ? matrix.suites : []).find((suite) => suite?.id === suiteId)
  if (!suiteSpec) {
    throw new Error(`suite not found in matrix: ${suiteId}`)
  }

  const afterSuite = findSuite(afterReport, suiteId)
  if (!afterSuite) {
    throw new Error(`suite not found in after report: ${suiteId}`)
  }
  const beforeSuite = beforeReport ? findSuite(beforeReport, suiteId) : null

  const budget = findBudget(suiteSpec, afterSuite, budgetId)
  if (!budget || budget.type !== 'relative') {
    throw new Error(`relative budget not found: ${budgetId}`)
  }
  const suiteLevels = collectSuiteLevels(suiteSpec, afterSuite)
  const topSuiteLevel = suiteLevels.length > 0 ? suiteLevels[suiteLevels.length - 1] : null

  const thresholds = Array.isArray(afterSuite.thresholds) ? afterSuite.thresholds : []
  const allCandidates = []
  for (const threshold of thresholds) {
    if (!threshold || typeof threshold !== 'object') continue
    if ((threshold.budget?.id ?? '') !== budgetId) continue
    const thresholdConvergeMode = threshold.where?.convergeMode
    if (thresholdConvergeMode != null && thresholdConvergeMode !== convergeMode) continue
    const dirtyRootsRatio = toFiniteNumberOrNull(threshold.where?.dirtyRootsRatio)
    const firstFailLevel = toFiniteNumberOrNull(threshold.firstFail?.primaryLevel ?? threshold.firstFailLevel)
    const maxLevel = toFiniteNumberOrNull(threshold.maxLevel)
    if (dirtyRootsRatio == null) continue

    const sampleLevel = firstFailLevel ?? maxLevel ?? topSuiteLevel
    if (sampleLevel == null) continue
    const where = { dirtyRootsRatio, convergeMode }
    const afterStats = computeRelativeStatsAt(afterSuite, budget, where, sampleLevel)
    const beforeStats = beforeSuite ? computeRelativeStatsAt(beforeSuite, budget, where, sampleLevel) : null

    let classification = 'unknown'
    let overshootRatio = null
    let overshootMs = null
    let gapToBudgetRatio = null
    if (afterStats.ok) {
      const p95Over = isRelativeBudgetExceeded(budget, afterStats.ratioP95, afterStats.deltaP95Ms)
      const medianOver = isRelativeBudgetExceeded(budget, afterStats.ratioMedian, afterStats.deltaMedianMs)
      if (threshold.reason === 'budgetExceeded' || p95Over || medianOver) {
        classification = medianOver ? 'systemic' : p95Over ? 'tail-only' : 'unknown'
      } else {
        classification = 'near-budget-pass'
      }
      overshootRatio = afterStats.ratioP95 - budget.maxRatio
      overshootMs = afterStats.deltaP95Ms
      gapToBudgetRatio = budget.maxRatio - afterStats.ratioP95
    }

    allCandidates.push({
      dirtyRootsRatio,
      firstFailLevel,
      maxLevel,
      sampleLevel,
      where,
      reason: threshold.reason,
      classification,
      overshootRatio,
      overshootMs,
      gapToBudgetRatio,
      afterStats,
      beforeStats,
    })
  }

  allCandidates.sort((a, b) => {
    const rankDiff = classificationRank(a.classification) - classificationRank(b.classification)
    if (rankDiff !== 0) return rankDiff
    if (a.classification === 'tail-only' || a.classification === 'systemic') {
      const aOver = typeof a.overshootRatio === 'number' ? a.overshootRatio : Number.NEGATIVE_INFINITY
      const bOver = typeof b.overshootRatio === 'number' ? b.overshootRatio : Number.NEGATIVE_INFINITY
      if (aOver !== bOver) return bOver - aOver
    }
    if (a.classification === 'near-budget-pass') {
      const aGap = typeof a.gapToBudgetRatio === 'number' ? a.gapToBudgetRatio : Number.POSITIVE_INFINITY
      const bGap = typeof b.gapToBudgetRatio === 'number' ? b.gapToBudgetRatio : Number.POSITIVE_INFINITY
      if (aGap !== bGap) return aGap - bGap
    }
    return a.dirtyRootsRatio - b.dirtyRootsRatio
  })

  const tailOnlyCandidates = allCandidates.filter((item) => item.classification === 'tail-only')
  const nearBudgetCandidates = allCandidates.filter((item) => {
    if (item.classification !== 'near-budget-pass') return false
    const ratio = item.afterStats?.ratioP95
    if (typeof ratio !== 'number' || !Number.isFinite(ratio)) return false
    return ratio >= budget.maxRatio * nearBudgetMinRatio
  })

  let selectionMode = 'tail-only'
  let selectionStrategy = 'top-overshoot'
  let selectedCandidates = tailOnlyCandidates.slice(0, maxCandidates)
  let selectedAnchorLabels = selectedCandidates.map(() => null)
  if (selectedCandidates.length <= 0) {
    selectionMode = 'near-budget'
    selectionStrategy = 'risk-anchors'
    const anchored = pickAnchoredNearBudgetCandidates({
      candidates: nearBudgetCandidates,
      maxCandidates,
    })
    selectedCandidates = anchored.selectedCandidates
    selectedAnchorLabels = anchored.anchorLabels
  }
  if (selectedCandidates.length <= 0) {
    selectionMode = 'none'
    selectionStrategy = 'none'
    selectedAnchorLabels = []
  }
  const evidenceIntent =
    selectionMode === 'tail-only'
      ? 'regression-recheck'
      : selectionMode === 'near-budget'
      ? 'confidence-supplement'
      : 'none'

  selectedCandidates = selectedCandidates.map((candidate, index) => ({
    ...candidate,
    anchorLabel: selectedAnchorLabels[index] ?? null,
  }))

  const stepsLevels = toSortedUniqueNumbers(
    selectedCandidates.flatMap((item) =>
      [item.sampleLevel, item.firstFailLevel, item.maxLevel].filter((x) => Number.isFinite(x)),
    ),
  )
  const dirtyRootsRatios = toSortedUniqueNumbers(selectedCandidates.map((item) => item.dirtyRootsRatio))
  const shouldRun = selectedCandidates.length > 0 && stepsLevels.length > 0 && dirtyRootsRatios.length > 0

  if (shouldRun && matrixOut) {
    const targetMatrix = buildTargetMatrix({
      matrix,
      suiteId,
      stepsLevels,
      dirtyRootsRatios,
    })
    writeJson(matrixOut, targetMatrix)
  }

  const plan = {
    generatedAt: new Date().toISOString(),
    suiteId,
    budgetId,
    convergeMode,
    maxCandidates,
    nearBudgetMinRatio,
    selectionMode,
    selectionStrategy,
    evidenceIntent,
    selectedAnchorLabels,
    shouldRun,
    matrixOut: shouldRun && matrixOut ? matrixOut : null,
    stepsLevels,
    dirtyRootsRatios,
    budget: {
      id: budget.id,
      metric: budget.metric,
      maxRatio: budget.maxRatio,
      minDeltaMs: getRelativeMinDeltaMs(budget),
      numeratorRef: budget.numeratorRef,
      denominatorRef: budget.denominatorRef,
    },
    selectedCandidates,
    allCandidates,
  }

  writeJson(outFile, plan)
  writeEnv(envOut, {
    PERF_TAIL_RECHECK_SHOULD_RUN: shouldRun ? '1' : '0',
    PERF_TAIL_RECHECK_CANDIDATE_COUNT: selectedCandidates.length,
    PERF_TAIL_RECHECK_SELECTION_MODE: selectionMode,
    PERF_TAIL_RECHECK_EVIDENCE_INTENT: evidenceIntent,
    PERF_TAIL_RECHECK_STEPS_LEVELS: stepsLevels.join(','),
    PERF_TAIL_RECHECK_DIRTY_ROOTS_RATIOS: dirtyRootsRatios.join(','),
    PERF_TAIL_RECHECK_MATRIX: shouldRun && matrixOut ? matrixOut : '',
  })

  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`)
}

const computeCandidateStatus = ({ sampleCount, failCount, systemicCount }) => {
  if (sampleCount <= 0) return 'missing'
  if (failCount <= 0) return 'resolved'
  if (failCount >= sampleCount && systemicCount >= sampleCount) return 'persistent-systemic'
  if (failCount >= sampleCount) return 'persistent-tail'
  return 'flaky'
}

const cmdEvaluate = (kv) => {
  const planFile = kv.plan ? path.resolve(process.cwd(), kv.plan) : null
  const reportDir = kv['report-dir'] ? path.resolve(process.cwd(), kv['report-dir']) : null
  const samplePrefix = kv['sample-prefix'] || 'tail-recheck.head.sample'
  const outFile = kv.out ? path.resolve(process.cwd(), kv.out) : null
  const envOut = kv['env-out'] ? path.resolve(process.cwd(), kv['env-out']) : null
  const beforeFile = kv.before ? path.resolve(process.cwd(), kv.before) : null
  const afterFile = kv.after ? path.resolve(process.cwd(), kv.after) : null

  if (!planFile || !fs.existsSync(planFile)) {
    throw new Error(`missing --plan file: ${String(kv.plan ?? '')}`)
  }
  if (!reportDir || !fs.existsSync(reportDir)) {
    throw new Error(`missing --report-dir: ${String(kv['report-dir'] ?? '')}`)
  }
  if (!outFile) {
    throw new Error('missing --out file')
  }

  const plan = readJson(planFile)
  const suiteId = String(plan.suiteId || 'converge.txnCommit')
  const convergeMode = String(plan.convergeMode || 'auto')
  const budget = plan.budget || null
  if (!budget || typeof budget !== 'object' || budget.id !== plan.budgetId) {
    throw new Error('invalid plan budget payload')
  }

  const beforeReport = beforeFile && fs.existsSync(beforeFile) ? readJson(beforeFile) : null
  const afterReport = afterFile && fs.existsSync(afterFile) ? readJson(afterFile) : null
  const beforeSuite = beforeReport ? findSuite(beforeReport, suiteId) : null
  const afterSuite = afterReport ? findSuite(afterReport, suiteId) : null

  const sampleFiles = fs
    .readdirSync(reportDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.startsWith(samplePrefix) && name.endsWith('.json'))
    .sort()
    .map((name) => path.join(reportDir, name))

  const sampleSuites = sampleFiles
    .map((file) => ({ file, report: readJson(file) }))
    .map((item) => ({ file: item.file, suite: findSuite(item.report, suiteId) }))
    .filter((item) => item.suite != null)

  const candidates = Array.isArray(plan.selectedCandidates) ? plan.selectedCandidates : []
  const candidateResults = candidates.map((candidate) => {
    const dirtyRootsRatio = Number(candidate.dirtyRootsRatio)
    const sampleLevel = Number(candidate.sampleLevel ?? candidate.firstFailLevel ?? candidate.maxLevel)
    const firstFailLevel =
      candidate.firstFailLevel == null || Number.isNaN(Number(candidate.firstFailLevel))
        ? null
        : Number(candidate.firstFailLevel)
    const where = { dirtyRootsRatio, convergeMode }

    const beforeMain = beforeSuite ? computeRelativeStatsAt(beforeSuite, budget, where, sampleLevel) : null
    const afterMain = afterSuite ? computeRelativeStatsAt(afterSuite, budget, where, sampleLevel) : null

    const samples = sampleSuites.map((item) => {
      const stats = computeRelativeStatsAt(item.suite, budget, where, sampleLevel)
      if (!stats.ok) {
        return {
          file: path.basename(item.file),
          ok: false,
          reason: stats.reason,
        }
      }
      const p95Over = isRelativeBudgetExceeded(budget, stats.ratioP95, stats.deltaP95Ms)
      const medianOver = isRelativeBudgetExceeded(budget, stats.ratioMedian, stats.deltaMedianMs)
      return {
        file: path.basename(item.file),
        ok: true,
        ratioP95: stats.ratioP95,
        ratioMedian: stats.ratioMedian,
        deltaP95Ms: stats.deltaP95Ms,
        deltaMedianMs: stats.deltaMedianMs,
        n: stats.n,
        p95Over,
        medianOver,
        classification: medianOver ? 'systemic' : p95Over ? 'tail-only' : 'pass',
      }
    })

    const validSamples = samples.filter((sample) => sample.ok)
    const failSamples = validSamples.filter((sample) => sample.p95Over)
    const systemicSamples = validSamples.filter((sample) => sample.medianOver)

    const ratioP95Values = validSamples.map((sample) => sample.ratioP95)
    const ratioMedianValues = validSamples.map((sample) => sample.ratioMedian)
    const status = computeCandidateStatus({
      sampleCount: validSamples.length,
      failCount: failSamples.length,
      systemicCount: systemicSamples.length,
    })

    return {
      dirtyRootsRatio,
      sampleLevel,
      firstFailLevel,
      initialClassification: candidate.classification,
      anchorLabel: candidate.anchorLabel ?? null,
      mainAfter: afterMain,
      mainBefore: beforeMain,
      sampleCount: validSamples.length,
      failCount: failSamples.length,
      systemicCount: systemicSamples.length,
      status,
      summary: {
        ratioP95Median: ratioP95Values.length > 0 ? quantileCeil(ratioP95Values, 0.5) : null,
        ratioP95P75: ratioP95Values.length > 0 ? quantileCeil(ratioP95Values, 0.75) : null,
        ratioP95P95: ratioP95Values.length > 0 ? quantileCeil(ratioP95Values, 0.95) : null,
        ratioMedianMedian: ratioMedianValues.length > 0 ? quantileCeil(ratioMedianValues, 0.5) : null,
      },
      samples,
    }
  })

  const counts = {
    resolved: candidateResults.filter((item) => item.status === 'resolved').length,
    flaky: candidateResults.filter((item) => item.status === 'flaky').length,
    persistentTail: candidateResults.filter((item) => item.status === 'persistent-tail').length,
    persistentSystemic: candidateResults.filter((item) => item.status === 'persistent-systemic').length,
    missing: candidateResults.filter((item) => item.status === 'missing').length,
  }

  const headSampleCount = sampleSuites.length
  const status = !plan.shouldRun
    ? 'no_candidates'
    : headSampleCount <= 0
    ? 'no_samples'
    : counts.persistentTail + counts.persistentSystemic > 0
    ? 'persistent'
    : counts.flaky > 0
    ? 'flaky'
    : counts.resolved > 0
    ? 'resolved'
    : 'timeout_fail'

  const summary = {
    generatedAt: new Date().toISOString(),
    status,
    suiteId,
    budgetId: plan.budgetId,
    convergeMode,
    selectionMode: plan.selectionMode ?? 'unknown',
    selectionStrategy: plan.selectionStrategy ?? 'unknown',
    evidenceIntent: plan.evidenceIntent ?? 'unknown',
    shouldRun: Boolean(plan.shouldRun),
    candidateCount: candidateResults.length,
    headSampleCount,
    sampleFiles: sampleFiles.map((file) => path.basename(file)),
    selectedAnchorLabels: Array.isArray(plan.selectedAnchorLabels) ? plan.selectedAnchorLabels : [],
    counts,
    candidates: candidateResults,
  }

  writeJson(outFile, summary)
  writeEnv(envOut, {
    PERF_TAIL_RECHECK_EVALUATED: '1',
    PERF_TAIL_RECHECK_STATUS: status,
    PERF_TAIL_RECHECK_COLLECTED_SAMPLE_COUNT: headSampleCount,
    PERF_TAIL_RECHECK_EVIDENCE_INTENT: summary.evidenceIntent,
    PERF_TAIL_RECHECK_RESOLVED_COUNT: counts.resolved,
    PERF_TAIL_RECHECK_FLAKY_COUNT: counts.flaky,
    PERF_TAIL_RECHECK_PERSISTENT_COUNT: counts.persistentTail + counts.persistentSystemic,
  })

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
}

const main = () => {
  const { mode, kv } = parseArgs(process.argv.slice(2))
  if (!mode || mode === '-h' || mode === '--help') {
    // eslint-disable-next-line no-console
    console.error(usage())
    process.exitCode = 2
    return
  }

  if (mode === 'plan') {
    cmdPlan(kv)
    return
  }
  if (mode === 'evaluate') {
    cmdEvaluate(kv)
    return
  }

  throw new Error(`unknown mode: ${mode}`)
}

try {
  main()
} catch (error) {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
