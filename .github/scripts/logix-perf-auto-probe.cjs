const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { createBudgetController, nextSampleTarget } = require('./lib/logix-perf-budget-controller.cjs')
const { decideProbeAction } = require('./lib/logix-perf-probe-decision.cjs')

const usage = () => `\
Usage:
  node .github/scripts/logix-perf-auto-probe.cjs \\
    --profile <smoke|quick|default|soak> \\
    --files <csv> \\
    --out <report.json> \\
    [--initial-steps <csv>] \\
    [--steps-out <steps.csv>] \\
    [--meta-out <meta.json>] \\
    [--matrix <matrix.json>] \\
    [--suite-id <id>] \\
    [--budget-id <id>] \\
    [--converge-mode <auto|full|dirty>] \\
    [--max-iterations <n>] \\
    [--growth-factor <float>] \\
    [--extend-count <n>] \\
    [--max-level-cap <n>] \\
    [--samples-per-iteration <n>] \\
    [--min-samples-per-iteration <n>] \\
    [--max-total-collects <n>] \\
    [--time-budget-minutes <n>] \\
    [--time-reserve-minutes <n>] \\
    [--min-collect-estimate-seconds <n>] \\
    [--target-floor-min <n>] \\
    [--min-iterations-before-early-stop <n>] \\
    [--top-saturation-ratio <float>] \\
    [--min-top-headroom <n>] \\
    [--budget-ledger-out <budget-ledger.json>] \\
    [--outlier-rel-tolerance <float>] \\
    [--outlier-abs-tolerance <n>] \\
    [--min-kept-samples <n>] \\
    [--refine-gap-min <n>] \\
    [--refine-max-insertions <n>]

Purpose:
  智能化探测 steps 上限（多样本 + 异常值剔除）：
  1) 每轮对同一组 levels 采样 N 次；
  2) 对每个 dirtyRootsRatio 的 maxLevel 做异常值剔除；
  3) 计算稳健统计（floor/p50/p75/p95）与平均上限（average upper limit）；
  4) 按“floor 或 average 贴近顶层”决定是否继续扩容；
  5) 在 steps 大间隔区间自动补充中间点位（自适应细化）；
  6) 输出数据充分性标记（样本不足/预算触顶可见）；
  7) 达到目标 floor 且顶层包络稳定时可提前收敛（减少无效迭代）。
`

const parseArgs = (argv) => {
  const out = {
    profile: undefined,
    files: undefined,
    out: undefined,
    initialSteps: undefined,
    stepsOut: undefined,
    metaOut: undefined,
    matrix: '.codex/skills/logix-perf-evidence/assets/matrix.json',
    suiteId: 'converge.txnCommit',
    budgetId: 'commit.p95<=50ms',
    convergeMode: 'auto',
    maxIterations: 3,
    growthFactor: 1.25,
    extendCount: 2,
    maxLevelCap: 25600,
    samplesPerIteration: 2,
    minSamplesPerIteration: 1,
    maxTotalCollects: 6,
    timeBudgetMinutes: 150,
    timeReserveMinutes: 5,
    minCollectEstimateSeconds: 45,
    targetFloorMin: 0,
    minIterationsBeforeEarlyStop: 2,
    topSaturationRatio: 0.95,
    minTopHeadroom: 400,
    budgetLedgerOut: undefined,
    outlierRelTolerance: 0.2,
    outlierAbsTolerance: 800,
    minKeptSamples: 2,
    refineGapMin: 2000,
    refineMaxInsertions: 2,
  }

  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]
    const v = argv[i + 1]
    if (k === '--profile') out.profile = v
    if (k === '--files') out.files = v
    if (k === '--out') out.out = v
    if (k === '--initial-steps') out.initialSteps = v
    if (k === '--steps-out') out.stepsOut = v
    if (k === '--meta-out') out.metaOut = v
    if (k === '--matrix') out.matrix = v
    if (k === '--suite-id') out.suiteId = v
    if (k === '--budget-id') out.budgetId = v
    if (k === '--converge-mode') out.convergeMode = v
    if (k === '--max-iterations') out.maxIterations = Number(v)
    if (k === '--growth-factor') out.growthFactor = Number(v)
    if (k === '--extend-count') out.extendCount = Number(v)
    if (k === '--max-level-cap') out.maxLevelCap = Number(v)
    if (k === '--samples-per-iteration') out.samplesPerIteration = Number(v)
    if (k === '--min-samples-per-iteration') out.minSamplesPerIteration = Number(v)
    if (k === '--max-total-collects') out.maxTotalCollects = Number(v)
    if (k === '--time-budget-minutes') out.timeBudgetMinutes = Number(v)
    if (k === '--time-reserve-minutes') out.timeReserveMinutes = Number(v)
    if (k === '--min-collect-estimate-seconds') out.minCollectEstimateSeconds = Number(v)
    if (k === '--target-floor-min') out.targetFloorMin = Number(v)
    if (k === '--min-iterations-before-early-stop') out.minIterationsBeforeEarlyStop = Number(v)
    if (k === '--top-saturation-ratio') out.topSaturationRatio = Number(v)
    if (k === '--min-top-headroom') out.minTopHeadroom = Number(v)
    if (k === '--budget-ledger-out') out.budgetLedgerOut = v
    if (k === '--outlier-rel-tolerance') out.outlierRelTolerance = Number(v)
    if (k === '--outlier-abs-tolerance') out.outlierAbsTolerance = Number(v)
    if (k === '--min-kept-samples') out.minKeptSamples = Number(v)
    if (k === '--refine-gap-min') out.refineGapMin = Number(v)
    if (k === '--refine-max-insertions') out.refineMaxInsertions = Number(v)
  }

  if (!out.profile || !out.files || !out.out) return null
  if (!Number.isFinite(out.maxIterations) || out.maxIterations <= 0) {
    throw new Error(`invalid --max-iterations: ${String(out.maxIterations)}`)
  }
  if (!Number.isFinite(out.growthFactor) || out.growthFactor <= 1) {
    throw new Error(`invalid --growth-factor: ${String(out.growthFactor)}`)
  }
  if (!Number.isFinite(out.extendCount) || out.extendCount <= 0) {
    throw new Error(`invalid --extend-count: ${String(out.extendCount)}`)
  }
  if (!Number.isFinite(out.maxLevelCap) || out.maxLevelCap <= 0) {
    throw new Error(`invalid --max-level-cap: ${String(out.maxLevelCap)}`)
  }
  if (!Number.isFinite(out.samplesPerIteration) || out.samplesPerIteration <= 0) {
    throw new Error(`invalid --samples-per-iteration: ${String(out.samplesPerIteration)}`)
  }
  if (!Number.isFinite(out.minSamplesPerIteration) || out.minSamplesPerIteration <= 0) {
    throw new Error(`invalid --min-samples-per-iteration: ${String(out.minSamplesPerIteration)}`)
  }
  if (!Number.isFinite(out.maxTotalCollects) || out.maxTotalCollects <= 0) {
    throw new Error(`invalid --max-total-collects: ${String(out.maxTotalCollects)}`)
  }
  if (!Number.isFinite(out.timeBudgetMinutes) || out.timeBudgetMinutes <= 0) {
    throw new Error(`invalid --time-budget-minutes: ${String(out.timeBudgetMinutes)}`)
  }
  if (!Number.isFinite(out.timeReserveMinutes) || out.timeReserveMinutes < 0) {
    throw new Error(`invalid --time-reserve-minutes: ${String(out.timeReserveMinutes)}`)
  }
  if (!Number.isFinite(out.minCollectEstimateSeconds) || out.minCollectEstimateSeconds <= 0) {
    throw new Error(`invalid --min-collect-estimate-seconds: ${String(out.minCollectEstimateSeconds)}`)
  }
  if (!Number.isFinite(out.targetFloorMin) || out.targetFloorMin < 0) {
    throw new Error(`invalid --target-floor-min: ${String(out.targetFloorMin)}`)
  }
  if (!Number.isFinite(out.minIterationsBeforeEarlyStop) || out.minIterationsBeforeEarlyStop <= 0) {
    throw new Error(`invalid --min-iterations-before-early-stop: ${String(out.minIterationsBeforeEarlyStop)}`)
  }
  if (!Number.isFinite(out.topSaturationRatio) || out.topSaturationRatio <= 0 || out.topSaturationRatio > 1) {
    throw new Error(`invalid --top-saturation-ratio: ${String(out.topSaturationRatio)}`)
  }
  if (!Number.isFinite(out.minTopHeadroom) || out.minTopHeadroom < 0) {
    throw new Error(`invalid --min-top-headroom: ${String(out.minTopHeadroom)}`)
  }
  if (!Number.isFinite(out.outlierRelTolerance) || out.outlierRelTolerance < 0) {
    throw new Error(`invalid --outlier-rel-tolerance: ${String(out.outlierRelTolerance)}`)
  }
  if (!Number.isFinite(out.outlierAbsTolerance) || out.outlierAbsTolerance < 0) {
    throw new Error(`invalid --outlier-abs-tolerance: ${String(out.outlierAbsTolerance)}`)
  }
  if (!Number.isFinite(out.minKeptSamples) || out.minKeptSamples <= 0) {
    throw new Error(`invalid --min-kept-samples: ${String(out.minKeptSamples)}`)
  }
  if (!Number.isFinite(out.refineGapMin) || out.refineGapMin < 0) {
    throw new Error(`invalid --refine-gap-min: ${String(out.refineGapMin)}`)
  }
  if (!Number.isFinite(out.refineMaxInsertions) || out.refineMaxInsertions < 0) {
    throw new Error(`invalid --refine-max-insertions: ${String(out.refineMaxInsertions)}`)
  }
  return out
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')

const roundStep = (n) => Math.ceil(n / 100) * 100

const quantileCeil = (values, q) => {
  if (!Array.isArray(values) || values.length === 0) return 0
  const sorted = values
    .filter((x) => typeof x === 'number' && Number.isFinite(x))
    .slice()
    .sort((a, b) => a - b)
  if (sorted.length === 0) return 0
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * q) - 1))
  return sorted[index] ?? 0
}

const mean = (values) => {
  if (!Array.isArray(values) || values.length === 0) return 0
  const total = values.reduce((acc, x) => acc + x, 0)
  return total / values.length
}

const parseLevelsCsv = (raw) => {
  if (raw == null || raw.trim().length === 0) return []
  const tokens = raw
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
  const levels = []
  for (const token of tokens) {
    if (!/^[0-9]+$/.test(token)) {
      throw new Error(`invalid steps level: ${token}`)
    }
    const level = Number(token)
    if (!Number.isFinite(level) || level <= 0) {
      throw new Error(`invalid steps level: ${token}`)
    }
    levels.push(level)
  }
  return Array.from(new Set(levels)).sort((a, b) => a - b)
}

const loadMatrixLevels = (matrixFile, suiteId) => {
  const matrix = readJson(matrixFile)
  const suites = Array.isArray(matrix?.suites) ? matrix.suites : []
  const suite = suites.find((s) => s?.id === suiteId)
  const axis = Array.isArray(suite?.axes?.steps) ? suite.axes.steps : []
  const levels = axis.filter((x) => typeof x === 'number' && Number.isFinite(x) && x > 0).map((x) => Number(x))
  return Array.from(new Set(levels)).sort((a, b) => a - b)
}

const toNumericLevel = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return 0
}

const collectThresholdRows = ({ report, suiteId, budgetId, convergeMode }) => {
  const suites = Array.isArray(report?.suites) ? report.suites : []
  const suite = suites.find((s) => s?.id === suiteId)
  if (!suite || !Array.isArray(suite.thresholds)) {
    return []
  }
  const rows = []
  for (const threshold of suite.thresholds) {
    if (!threshold || typeof threshold !== 'object') continue
    if ((threshold.budget?.id ?? '') !== budgetId) continue
    const whereMode = threshold.where?.convergeMode
    if (whereMode != null && whereMode !== convergeMode) continue
    const dirtyRootsRatio = threshold.where?.dirtyRootsRatio
    if (!(typeof dirtyRootsRatio === 'number' && Number.isFinite(dirtyRootsRatio))) continue
    rows.push({
      dirtyRootsRatio,
      maxLevel: toNumericLevel(threshold.maxLevel),
      firstFailLevel: toNumericLevel(threshold.firstFail?.primaryLevel ?? threshold.firstFailLevel),
      reason: threshold.firstFail?.reason ?? threshold.reason,
    })
  }
  return rows.sort((a, b) => a.dirtyRootsRatio - b.dirtyRootsRatio)
}

const summarizeRows = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      floorMaxLevel: 0,
      p50MaxLevel: 0,
      p75MaxLevel: 0,
      p90MaxLevel: 0,
      p95MaxLevel: 0,
      maxObservedLevel: 0,
      averageUpperLimit: 0,
    }
  }
  const maxLevels = rows.map((row) => row.maxLevel)
  return {
    floorMaxLevel: Math.min(...maxLevels),
    p50MaxLevel: quantileCeil(maxLevels, 0.5),
    p75MaxLevel: quantileCeil(maxLevels, 0.75),
    p90MaxLevel: quantileCeil(maxLevels, 0.9),
    p95MaxLevel: quantileCeil(maxLevels, 0.95),
    maxObservedLevel: Math.max(...maxLevels),
    averageUpperLimit: roundStep(mean(maxLevels)),
  }
}

const analyzeReport = ({ report, suiteId, budgetId, convergeMode }) => {
  const rows = collectThresholdRows({
    report,
    suiteId,
    budgetId,
    convergeMode,
  })
  const suites = Array.isArray(report?.suites) ? report.suites : []
  const suite = suites.find((s) => s?.id === suiteId)
  const points = Array.isArray(suite?.points) ? suite.points : []
  return {
    rows,
    summary: summarizeRows(rows),
    timeoutPoints: points.filter((p) => p?.status === 'timeout' && p?.params?.convergeMode === convergeMode),
  }
}

const filterOutliers = ({ values, outlierRelTolerance, outlierAbsTolerance, minKeptSamples }) => {
  const clean = values.filter((x) => typeof x === 'number' && Number.isFinite(x))
  const sorted = clean.slice().sort((a, b) => a - b)
  if (sorted.length === 0) {
    return { kept: [], excluded: [], median: 0, tolerance: 0 }
  }
  if (sorted.length <= 2) {
    return {
      kept: sorted,
      excluded: [],
      median: quantileCeil(sorted, 0.5),
      tolerance: 0,
    }
  }

  const median = quantileCeil(sorted, 0.5)
  const tolerance = Math.max(outlierAbsTolerance, Math.abs(median) * outlierRelTolerance, 200)
  const kept = sorted.filter((x) => Math.abs(x - median) <= tolerance)
  if (kept.length >= Math.min(minKeptSamples, sorted.length)) {
    const keptSet = new Set(kept)
    const excluded = sorted.filter((x) => !keptSet.has(x) || kept.indexOf(x) !== sorted.indexOf(x))
    return { kept, excluded, median, tolerance }
  }

  const ranked = sorted
    .map((x) => ({ x, dist: Math.abs(x - median) }))
    .sort((a, b) => (a.dist !== b.dist ? a.dist - b.dist : a.x - b.x))
  const size = Math.min(Math.max(1, minKeptSamples), sorted.length)
  const rescued = ranked
    .slice(0, size)
    .map((item) => item.x)
    .sort((a, b) => a - b)
  const rescuedSet = new Set(rescued)
  const excluded = sorted.filter((x) => !rescuedSet.has(x) || rescued.indexOf(x) !== sorted.indexOf(x))
  return { kept: rescued, excluded, median, tolerance }
}

const aggregateSampleAnalyses = ({ sampleAnalyses, outlierRelTolerance, outlierAbsTolerance, minKeptSamples }) => {
  const dirtyRatios = Array.from(
    new Set(sampleAnalyses.flatMap((sample) => sample.rows.map((row) => row.dirtyRootsRatio))),
  ).sort((a, b) => a - b)

  const rows = dirtyRatios.map((dirtyRootsRatio) => {
    const sampleValues = sampleAnalyses
      .map((sample) => sample.rows.find((row) => row.dirtyRootsRatio === dirtyRootsRatio)?.maxLevel)
      .filter((x) => typeof x === 'number' && Number.isFinite(x))
      .map((x) => Number(x))
    const filtered = filterOutliers({
      values: sampleValues,
      outlierRelTolerance,
      outlierAbsTolerance,
      minKeptSamples,
    })

    const meanMaxLevel = filtered.kept.length > 0 ? roundStep(mean(filtered.kept)) : 0
    const medianMaxLevel = filtered.kept.length > 0 ? quantileCeil(filtered.kept, 0.5) : 0
    const p75MaxLevel = filtered.kept.length > 0 ? quantileCeil(filtered.kept, 0.75) : 0
    const p90MaxLevel = filtered.kept.length > 0 ? quantileCeil(filtered.kept, 0.9) : 0
    const p95MaxLevel = filtered.kept.length > 0 ? quantileCeil(filtered.kept, 0.95) : 0
    return {
      dirtyRootsRatio,
      sampleValues,
      filteredValues: filtered.kept,
      excludedValues: filtered.excluded,
      medianReference: filtered.median,
      tolerance: filtered.tolerance,
      sampleCount: sampleValues.length,
      keptCount: filtered.kept.length,
      meanMaxLevel,
      medianMaxLevel,
      p75MaxLevel,
      p90MaxLevel,
      p95MaxLevel,
    }
  })

  const meanLevels = rows.map((row) => row.meanMaxLevel).filter((x) => x > 0)
  const medianLevels = rows.map((row) => row.medianMaxLevel).filter((x) => x > 0)
  const outlierRemovedCount = rows.reduce((acc, row) => acc + (row.sampleCount - row.keptCount), 0)

  const summary = {
    floorMeanMaxLevel: meanLevels.length > 0 ? Math.min(...meanLevels) : 0,
    floorMedianMaxLevel: medianLevels.length > 0 ? Math.min(...medianLevels) : 0,
    p50MeanMaxLevel: meanLevels.length > 0 ? quantileCeil(meanLevels, 0.5) : 0,
    p50MedianMaxLevel: medianLevels.length > 0 ? quantileCeil(medianLevels, 0.5) : 0,
    p75MeanMaxLevel: meanLevels.length > 0 ? quantileCeil(meanLevels, 0.75) : 0,
    p75MedianMaxLevel: medianLevels.length > 0 ? quantileCeil(medianLevels, 0.75) : 0,
    p90MeanMaxLevel: meanLevels.length > 0 ? quantileCeil(meanLevels, 0.9) : 0,
    p90MedianMaxLevel: medianLevels.length > 0 ? quantileCeil(medianLevels, 0.9) : 0,
    p95MeanMaxLevel: meanLevels.length > 0 ? quantileCeil(meanLevels, 0.95) : 0,
    p95MedianMaxLevel: medianLevels.length > 0 ? quantileCeil(medianLevels, 0.95) : 0,
    maxObservedMeanLevel: meanLevels.length > 0 ? Math.max(...meanLevels) : 0,
    maxObservedMedianLevel: medianLevels.length > 0 ? Math.max(...medianLevels) : 0,
    averageUpperLimit: meanLevels.length > 0 ? roundStep(mean(meanLevels)) : 0,
    averageUpperLimitMedianBased: medianLevels.length > 0 ? roundStep(mean(medianLevels)) : 0,
    outlierRemovedCount,
    dirtyRootsRatioCount: rows.length,
  }

  return { rows, summary }
}

const isNearTopEnvelopeStable = ({ summary, secondLevel }) => {
  if (!summary || typeof summary !== 'object') return false
  if (!(typeof secondLevel === 'number' && Number.isFinite(secondLevel))) return false
  if (!(typeof summary.dirtyRootsRatioCount === 'number' && summary.dirtyRootsRatioCount > 0)) return false
  const checks = [
    summary.floorMedianMaxLevel,
    summary.p50MedianMaxLevel,
    summary.p75MedianMaxLevel,
    summary.p95MedianMaxLevel,
    summary.averageUpperLimit,
  ]
  return checks.every((value) => typeof value === 'number' && Number.isFinite(value) && value >= secondLevel)
}

const selectRepresentativeSample = ({ sampleAnalyses, aggregatedRows }) => {
  if (!Array.isArray(sampleAnalyses) || sampleAnalyses.length === 0) {
    return { sampleIndex: 0, distance: 0, reportFile: null }
  }
  const ratioTarget = new Map(aggregatedRows.map((row) => [row.dirtyRootsRatio, row.medianMaxLevel]))
  const scored = sampleAnalyses.map((sample, index) => {
    let distance = 0
    for (const row of sample.rows) {
      const target = ratioTarget.get(row.dirtyRootsRatio)
      if (!(typeof target === 'number' && Number.isFinite(target))) continue
      distance += Math.abs(row.maxLevel - target)
    }
    return { sampleIndex: index + 1, distance, reportFile: sample.reportFile }
  })
  scored.sort((a, b) => (a.distance !== b.distance ? a.distance - b.distance : a.sampleIndex - b.sampleIndex))
  return (
    scored[0] ?? {
      sampleIndex: 1,
      distance: 0,
      reportFile: sampleAnalyses[0].reportFile,
    }
  )
}

const extendLevels = ({ levels, growthFactor, extendCount, maxLevelCap }) => {
  const next = levels.slice()
  let last = next[next.length - 1] ?? 0
  for (let i = 0; i < extendCount; i++) {
    const grown = roundStep(last * growthFactor)
    const candidate = Math.min(maxLevelCap, Math.max(last + 100, grown))
    if (candidate <= last) break
    next.push(candidate)
    last = candidate
  }
  return Array.from(new Set(next)).sort((a, b) => a - b)
}

const refineLargestGaps = ({ levels, refineGapMin, refineMaxInsertions }) => {
  if (!Array.isArray(levels) || levels.length < 2 || refineMaxInsertions <= 0) {
    return []
  }
  const gaps = []
  for (let i = 0; i < levels.length - 1; i++) {
    const left = levels[i]
    const right = levels[i + 1]
    const gap = right - left
    if (gap > refineGapMin) {
      gaps.push({ left, right, gap })
    }
  }
  gaps.sort((a, b) => (a.gap !== b.gap ? b.gap - a.gap : a.left - b.left))
  const inserted = []
  const existing = new Set(levels)
  for (const item of gaps) {
    if (inserted.length >= refineMaxInsertions) break
    const mid = roundStep((item.left + item.right) / 2)
    if (mid <= item.left || mid >= item.right) continue
    if (existing.has(mid)) continue
    existing.add(mid)
    inserted.push(mid)
  }
  return inserted.sort((a, b) => a - b)
}

const extendLevelsAdaptive = ({
  levels,
  growthFactor,
  extendCount,
  maxLevelCap,
  refineGapMin,
  refineMaxInsertions,
}) => {
  const refined = refineLargestGaps({
    levels,
    refineGapMin,
    refineMaxInsertions: Math.min(refineMaxInsertions, extendCount),
  })
  let next = Array.from(new Set([...levels, ...refined])).sort((a, b) => a - b)
  const remainingExtension = Math.max(0, extendCount - refined.length)
  if (remainingExtension > 0) {
    next = extendLevels({
      levels: next,
      growthFactor,
      extendCount: remainingExtension,
      maxLevelCap,
    })
  }
  const topExtensions = next.filter((level) => !levels.includes(level) && !refined.includes(level))
  return {
    levels: next,
    refinedInsertions: refined,
    topExtensions,
  }
}

const evaluateDataSufficiency = ({
  aggregatedRows,
  sampleCount,
  minKeptSamples,
  totalCollects,
  maxTotalCollects,
  elapsedMinutes,
  timeBudgetMinutes,
}) => {
  const minKeptRequired = Math.min(Math.max(1, minKeptSamples), Math.max(1, sampleCount))
  const insufficientRows = aggregatedRows.filter((row) => row.keptCount < minKeptRequired)
  const reasonCodes = []
  if (insufficientRows.length > 0) reasonCodes.push('insufficient_kept_samples')
  if (totalCollects >= maxTotalCollects) reasonCodes.push('collect_budget_limit')
  if (elapsedMinutes >= timeBudgetMinutes) reasonCodes.push('time_budget_limit')
  return {
    sampleCount,
    minKeptRequired,
    insufficientDirtyRatioCount: insufficientRows.length,
    insufficientDirtyRatios: insufficientRows.map((row) => row.dirtyRootsRatio),
    hasInsufficientData: reasonCodes.length > 0,
    reasonCodes,
  }
}

const runCollect = ({ profile, files, outFile, levels }) => {
  const args = ['perf', 'collect', '--', '--profile', profile]
  for (const file of files) {
    args.push('--files', file)
  }
  args.push('--out', outFile)

  const env = {
    ...process.env,
    VITE_LOGIX_PERF_STEPS_LEVELS: levels.join(','),
  }

  const res = spawnSync('pnpm', args, { stdio: 'inherit', env })
  if (res.error) throw res.error
  if (res.status !== 0) {
    throw new Error(`pnpm perf collect failed with code=${String(res.status)}`)
  }
}

const formatSeconds = (ms) => Number((ms / 1000).toFixed(2))

const main = () => {
  try {
    const args = parseArgs(process.argv.slice(2))
    if (!args) {
      // eslint-disable-next-line no-console
      console.error(usage())
      process.exitCode = 2
      return
    }

    const outFile = path.resolve(process.cwd(), args.out)
    const outDir = path.dirname(outFile)
    fs.mkdirSync(outDir, { recursive: true })

    const files = args.files
      .split(',')
      .map((x) => x.trim())
      .filter((x) => x.length > 0)
    if (files.length === 0) {
      throw new Error('--files resolved to empty list')
    }

    let levels = parseLevelsCsv(args.initialSteps)
    if (levels.length === 0) {
      levels = loadMatrixLevels(args.matrix, args.suiteId)
    }
    if (levels.length < 2) {
      throw new Error(`insufficient steps levels: ${levels.length}`)
    }
    const initialTopLevel = levels[levels.length - 1] ?? 0

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logix-perf-auto-probe-'))
    let finalReportFile = null
    let stopReason = 'unknown'
    const iterationLogs = []
    const budgetController = createBudgetController({
      timeBudgetMinutes: args.timeBudgetMinutes,
      reserveMinutes: args.timeReserveMinutes,
      maxTotalCollects: args.maxTotalCollects,
      minCollectEstimateSeconds: args.minCollectEstimateSeconds,
    })
    let collectBudgetReached = false
    let lastBudgetRejectReason = 'collect_budget_limit'
    const elapsedMinutes = () => budgetController.snapshot().elapsedMs / 60_000
    // eslint-disable-next-line no-console
    console.log(
      `[logix-perf:auto-probe:start] profile=${args.profile} suite=${args.suiteId} budget=${
        args.budgetId
      } levels=${levels.join(',')} maxIterations=${String(args.maxIterations)} samplesPerIteration=${String(
        args.samplesPerIteration,
      )} minSamplesPerIteration=${String(args.minSamplesPerIteration)} maxTotalCollects=${String(
        args.maxTotalCollects,
      )} timeBudgetMin=${String(args.timeBudgetMinutes)} timeReserveMin=${String(
        args.timeReserveMinutes,
      )} minCollectEstimateSec=${String(args.minCollectEstimateSeconds)} growthFactor=${String(
        args.growthFactor,
      )} extendCount=${String(args.extendCount)} refineGapMin=${String(args.refineGapMin)} refineMaxInsertions=${String(
        args.refineMaxInsertions,
      )} targetFloorMin=${String(args.targetFloorMin)} minIterationsBeforeEarlyStop=${String(
        args.minIterationsBeforeEarlyStop,
      )} topSaturationRatio=${String(args.topSaturationRatio)} minTopHeadroom=${String(args.minTopHeadroom)}`,
    )

    for (let iteration = 1; iteration <= args.maxIterations; iteration++) {
      const sampleAnalyses = []
      const budgetAtIterationStart = budgetController.snapshot()
      const sampleTarget = nextSampleTarget({
        zone: budgetAtIterationStart.zone,
        samplesPerIteration: args.samplesPerIteration,
        minSamplesPerIteration: args.minSamplesPerIteration,
      })
      // eslint-disable-next-line no-console
      console.log(
        `[logix-perf:auto-probe:iteration-start] iteration=${String(iteration)}/${String(
          args.maxIterations,
        )} levels=${levels.join(',')} totalCollects=${String(
          budgetAtIterationStart.totalCollects,
        )}/${String(args.maxTotalCollects)} elapsedMin=${String(
          Number(elapsedMinutes().toFixed(2)),
        )} budgetZone=${budgetAtIterationStart.zone} sampleTarget=${String(sampleTarget)} remainingSec=${String(
          formatSeconds(budgetAtIterationStart.effectiveRemainingMs),
        )}`,
      )
      for (let sample = 1; sample <= sampleTarget; sample++) {
        const budgetGate = budgetController.canRunCollect()
        if (!budgetGate.ok && sampleAnalyses.length >= args.minSamplesPerIteration) {
          collectBudgetReached = true
          lastBudgetRejectReason = budgetGate.reasonCode || 'collect_budget_limit'
          // eslint-disable-next-line no-console
          console.log(
            `[logix-perf:auto-probe:sample-skip] iteration=${String(iteration)} sample=${String(
              sample,
            )} reason=${lastBudgetRejectReason} minSamplesPerIteration=${String(
              args.minSamplesPerIteration,
            )} collectedInIteration=${String(sampleAnalyses.length)}`,
          )
          break
        }
        const reportFile = path.join(tempDir, `probe.${String(iteration)}.${String(sample)}.json`)
        const collectStartedAtMs = Date.now()
        runCollect({
          profile: args.profile,
          files,
          outFile: reportFile,
          levels,
        })
        const collectDurationMs = Date.now() - collectStartedAtMs
        const budgetAfterCollect = budgetController.recordCollect({ durationMs: collectDurationMs })
        const report = readJson(reportFile)
        const analyzed = analyzeReport({
          report,
          suiteId: args.suiteId,
          budgetId: args.budgetId,
          convergeMode: args.convergeMode,
        })
        sampleAnalyses.push({
          sample,
          reportFile,
          rows: analyzed.rows,
          summary: analyzed.summary,
          timeoutPoints: analyzed.timeoutPoints,
          collectDurationMs,
        })
        // eslint-disable-next-line no-console
        console.log(
          `[logix-perf:auto-probe:sample] iteration=${String(iteration)} sample=${String(sample)}/${String(
            sampleTarget,
          )} collectSec=${String(formatSeconds(collectDurationMs))} floor=${String(
            analyzed.summary.floorMaxLevel,
          )} p50=${String(analyzed.summary.p50MaxLevel)} p75=${String(analyzed.summary.p75MaxLevel)} p95=${String(
            analyzed.summary.p95MaxLevel,
          )} timeouts=${String(analyzed.timeoutPoints.length)} totalCollects=${String(
            budgetAfterCollect.totalCollects,
          )}/${String(args.maxTotalCollects)} elapsedMin=${String(
            Number(elapsedMinutes().toFixed(2)),
          )} budgetZone=${budgetAfterCollect.zone} remainingSec=${String(
            formatSeconds(budgetAfterCollect.effectiveRemainingMs),
          )}`,
        )
      }
      if (sampleAnalyses.length === 0) {
        stopReason = `${lastBudgetRejectReason}_before_sampling`
        // eslint-disable-next-line no-console
        console.log(
          `[logix-perf:auto-probe:iteration-stop] iteration=${String(iteration)} reason=${stopReason}`,
        )
        break
      }

      const aggregated = aggregateSampleAnalyses({
        sampleAnalyses,
        outlierRelTolerance: args.outlierRelTolerance,
        outlierAbsTolerance: args.outlierAbsTolerance,
        minKeptSamples: args.minKeptSamples,
      })
      const representative = selectRepresentativeSample({
        sampleAnalyses,
        aggregatedRows: aggregated.rows,
      })
      const elapsedMin = Number(elapsedMinutes().toFixed(2))
      const budgetSnapshot = budgetController.snapshot()
      const sufficiency = evaluateDataSufficiency({
        aggregatedRows: aggregated.rows,
        sampleCount: sampleAnalyses.length,
        minKeptSamples: args.minKeptSamples,
        totalCollects: budgetSnapshot.totalCollects,
        maxTotalCollects: args.maxTotalCollects,
        elapsedMinutes: elapsedMin,
        timeBudgetMinutes: args.timeBudgetMinutes,
      })

      const maxLevel = levels[levels.length - 1] ?? 0
      const secondLevel = levels[levels.length - 2] ?? maxLevel
      const topTimeoutCount = sampleAnalyses.reduce(
        (acc, sample) => acc + sample.timeoutPoints.filter((p) => Number(p?.params?.steps) >= secondLevel).length,
        0,
      )
      const boundaryObserved =
        typeof aggregated.summary.floorMedianMaxLevel === 'number' &&
        Number.isFinite(aggregated.summary.floorMedianMaxLevel) &&
        aggregated.summary.floorMedianMaxLevel < maxLevel
      const topEnvelopeStable = isNearTopEnvelopeStable({ summary: aggregated.summary, secondLevel })
      const action = decideProbeAction({
        summary: aggregated.summary,
        iteration,
        maxIterations: args.maxIterations,
        maxLevel,
        secondLevel,
        maxLevelCap: args.maxLevelCap,
        minIterationsBeforeEarlyStop: args.minIterationsBeforeEarlyStop,
        targetFloorMin: args.targetFloorMin,
        initialTopLevel,
        topEnvelopeStable,
        boundaryObserved,
        topTimeoutCount,
        topSaturationRatio: args.topSaturationRatio,
        minTopHeadroom: args.minTopHeadroom,
      })
      const shouldExtend = action.shouldExtend
      const decision = action.decision

      iterationLogs.push({
        iteration,
        levels,
        maxLevel,
        secondLevel,
        decision,
        topTimeoutCount,
        topSaturated: action.topSaturated,
        topBand: action.topBand,
        representativeSample: representative,
        sampleCount: sampleAnalyses.length,
        totalCollects: budgetSnapshot.totalCollects,
        elapsedMinutes: elapsedMin,
        budget: budgetSnapshot,
        earlyStop: {
          eligible: action.earlyStopEligible,
          targetFloorMin: args.targetFloorMin,
          targetFloorSatisfied: action.targetFloorSatisfied,
          boundaryObserved,
          topEnvelopeStable,
          expansionFloor: action.expansionFloor,
          expandedEnough: action.expandedEnough,
        },
        samples: sampleAnalyses.map((sample) => ({
          sample: sample.sample,
          reportFile: sample.reportFile,
          collectDurationMs: sample.collectDurationMs,
          floor: sample.summary.floorMaxLevel,
          p50: sample.summary.p50MaxLevel,
          p75: sample.summary.p75MaxLevel,
          p90: sample.summary.p90MaxLevel,
          p95: sample.summary.p95MaxLevel,
          maxObserved: sample.summary.maxObservedLevel,
          averageUpperLimit: sample.summary.averageUpperLimit,
        })),
        aggregated: {
          summary: aggregated.summary,
          rows: aggregated.rows,
        },
      })
      const lastLog = iterationLogs[iterationLogs.length - 1]
      if (lastLog) {
        lastLog.dataSufficiency = sufficiency
      }
      // eslint-disable-next-line no-console
      console.log(
        `[logix-perf:auto-probe:iteration-summary] iteration=${String(
          iteration,
        )} decision=${decision} shouldExtend=${String(shouldExtend)} floorMedian=${String(
          aggregated.summary.floorMedianMaxLevel,
        )} p50Median=${String(aggregated.summary.p50MedianMaxLevel)} p75Median=${String(
          aggregated.summary.p75MedianMaxLevel,
        )} p95Median=${String(aggregated.summary.p95MedianMaxLevel)} avgUpper=${String(
          aggregated.summary.averageUpperLimit,
        )} topTimeoutCount=${String(topTimeoutCount)} dataInsufficient=${
          sufficiency.hasInsufficientData ? '1' : '0'
        } reasonCodes=${sufficiency.reasonCodes.join(',') || 'none'} targetFloorMin=${String(
          args.targetFloorMin,
        )} targetFloorSatisfied=${action.targetFloorSatisfied ? '1' : '0'} boundaryObserved=${
          boundaryObserved ? '1' : '0'
        } topStable=${topEnvelopeStable ? '1' : '0'} topSaturated=${action.topSaturated ? '1' : '0'} expandedEnough=${
          action.expandedEnough ? '1' : '0'
        } budgetZone=${budgetSnapshot.zone} remainingSec=${String(formatSeconds(budgetSnapshot.effectiveRemainingMs))}`,
      )

      finalReportFile = representative.reportFile
      stopReason = decision
      if (!shouldExtend) {
        // eslint-disable-next-line no-console
        console.log(`[logix-perf:auto-probe:stop] iteration=${String(iteration)} reason=${stopReason}`)
        break
      }
      if (collectBudgetReached) {
        stopReason = lastBudgetRejectReason || 'collect_budget_limit'
        // eslint-disable-next-line no-console
        console.log(`[logix-perf:auto-probe:stop] iteration=${String(iteration)} reason=${stopReason}`)
        break
      }

      const nextPlan = extendLevelsAdaptive({
        levels,
        growthFactor: args.growthFactor,
        extendCount: args.extendCount,
        maxLevelCap: args.maxLevelCap,
        refineGapMin: args.refineGapMin,
        refineMaxInsertions: args.refineMaxInsertions,
      })
      const nextLevels = nextPlan.levels
      if (nextLevels.length === levels.length) {
        stopReason = 'no_further_extension_possible'
        // eslint-disable-next-line no-console
        console.log(`[logix-perf:auto-probe:stop] iteration=${String(iteration)} reason=${stopReason}`)
        break
      }
      const newLevels = nextLevels.filter((level) => !levels.includes(level))
      const levelGeneration = {
        addedLevels: newLevels,
        refinedInsertions: nextPlan.refinedInsertions,
        topExtensions: nextPlan.topExtensions,
      }
      if (lastLog) {
        lastLog.levelGeneration = levelGeneration
      }
      // eslint-disable-next-line no-console
      console.log(
        `[logix-perf:auto-probe:level-generation] iteration=${String(iteration)} addedLevels=${
          newLevels.join(',') || 'none'
        } refinedInsertions=${nextPlan.refinedInsertions.join(',') || 'none'} topExtensions=${
          nextPlan.topExtensions.join(',') || 'none'
        }`,
      )
      levels = nextLevels
    }

    if (!finalReportFile) {
      throw new Error('auto probe did not produce any report')
    }

    fs.copyFileSync(finalReportFile, outFile)

    if (args.stepsOut) {
      const stepsOut = path.resolve(process.cwd(), args.stepsOut)
      fs.mkdirSync(path.dirname(stepsOut), { recursive: true })
      fs.writeFileSync(stepsOut, `${levels.join(',')}\n`, 'utf8')
    }

    const finalIteration = iterationLogs[iterationLogs.length - 1]
    const finalBudgetSnapshot = budgetController.snapshot()

    if (args.budgetLedgerOut) {
      const ledgerOut = path.resolve(process.cwd(), args.budgetLedgerOut)
      fs.mkdirSync(path.dirname(ledgerOut), { recursive: true })
      writeJson(ledgerOut, {
        generatedAt: new Date().toISOString(),
        generator: '.github/scripts/logix-perf-auto-probe.cjs',
        profile: args.profile,
        suiteId: args.suiteId,
        budgetId: args.budgetId,
        budget: finalBudgetSnapshot,
        events: budgetController.events,
      })
    }

    if (args.metaOut) {
      const metaOut = path.resolve(process.cwd(), args.metaOut)
      fs.mkdirSync(path.dirname(metaOut), { recursive: true })
      writeJson(metaOut, {
        generatedAt: new Date().toISOString(),
        generator: '.github/scripts/logix-perf-auto-probe.cjs',
        profile: args.profile,
        files,
        suiteId: args.suiteId,
        budgetId: args.budgetId,
        convergeMode: args.convergeMode,
        maxIterations: args.maxIterations,
        growthFactor: args.growthFactor,
        extendCount: args.extendCount,
        maxLevelCap: args.maxLevelCap,
        samplesPerIteration: args.samplesPerIteration,
        minSamplesPerIteration: args.minSamplesPerIteration,
        maxTotalCollects: args.maxTotalCollects,
        timeBudgetMinutes: args.timeBudgetMinutes,
        timeReserveMinutes: args.timeReserveMinutes,
        minCollectEstimateSeconds: args.minCollectEstimateSeconds,
        targetFloorMin: args.targetFloorMin,
        minIterationsBeforeEarlyStop: args.minIterationsBeforeEarlyStop,
        topSaturationRatio: args.topSaturationRatio,
        minTopHeadroom: args.minTopHeadroom,
        outlierRelTolerance: args.outlierRelTolerance,
        outlierAbsTolerance: args.outlierAbsTolerance,
        minKeptSamples: args.minKeptSamples,
        refineGapMin: args.refineGapMin,
        refineMaxInsertions: args.refineMaxInsertions,
        stopReason,
        totalCollects: finalBudgetSnapshot.totalCollects,
        elapsedMinutes: Number(elapsedMinutes().toFixed(2)),
        budget: finalBudgetSnapshot,
        finalLevels: levels,
        summary: finalIteration?.aggregated?.summary ?? null,
        representativeSample: finalIteration?.representativeSample ?? null,
        dataSufficiency: finalIteration?.dataSufficiency ?? null,
        iterations: iterationLogs,
      })
    }

    const summary = finalIteration?.aggregated?.summary ?? null
    const dataSufficiency = finalIteration?.dataSufficiency ?? null
    // eslint-disable-next-line no-console
    console.log(
      `[logix-perf:auto-probe] levels=${levels.join(',')} floor=${String(
        summary?.floorMedianMaxLevel ?? 0,
      )} p50=${String(summary?.p50MedianMaxLevel ?? 0)} p75=${String(summary?.p75MedianMaxLevel ?? 0)} p95=${String(
        summary?.p95MedianMaxLevel ?? 0,
      )} avg=${String(summary?.averageUpperLimit ?? 0)} samples=${String(args.samplesPerIteration)} iterations=${String(
        iterationLogs.length,
      )} collects=${String(finalBudgetSnapshot.totalCollects)} elapsedMin=${String(
        Number(elapsedMinutes().toFixed(2)),
      )} stop=${stopReason} insufficient=${dataSufficiency?.hasInsufficientData ? '1' : '0'} budgetZone=${
        finalBudgetSnapshot.zone
      } remainingSec=${String(formatSeconds(finalBudgetSnapshot.effectiveRemainingMs))}`,
    )
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

main()
