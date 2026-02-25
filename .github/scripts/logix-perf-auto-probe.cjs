const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

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
    [--outlier-rel-tolerance <float>] \\
    [--outlier-abs-tolerance <n>] \\
    [--min-kept-samples <n>]

Purpose:
  智能化探测 steps 上限（多样本 + 异常值剔除）：
  1) 每轮对同一组 levels 采样 N 次；
  2) 对每个 dirtyRootsRatio 的 maxLevel 做异常值剔除；
  3) 计算稳健统计（floor/p50/p90）与平均上限（average upper limit）；
  4) 按“floor 或 average 贴近顶层”决定是否继续扩容。
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
    outlierRelTolerance: 0.2,
    outlierAbsTolerance: 800,
    minKeptSamples: 2,
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
    if (k === '--outlier-rel-tolerance') out.outlierRelTolerance = Number(v)
    if (k === '--outlier-abs-tolerance') out.outlierAbsTolerance = Number(v)
    if (k === '--min-kept-samples') out.minKeptSamples = Number(v)
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
  if (!Number.isFinite(out.outlierRelTolerance) || out.outlierRelTolerance < 0) {
    throw new Error(`invalid --outlier-rel-tolerance: ${String(out.outlierRelTolerance)}`)
  }
  if (!Number.isFinite(out.outlierAbsTolerance) || out.outlierAbsTolerance < 0) {
    throw new Error(`invalid --outlier-abs-tolerance: ${String(out.outlierAbsTolerance)}`)
  }
  if (!Number.isFinite(out.minKeptSamples) || out.minKeptSamples <= 0) {
    throw new Error(`invalid --min-kept-samples: ${String(out.minKeptSamples)}`)
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
      p90MaxLevel: 0,
      maxObservedLevel: 0,
      averageUpperLimit: 0,
    }
  }
  const maxLevels = rows.map((row) => row.maxLevel)
  return {
    floorMaxLevel: Math.min(...maxLevels),
    p50MaxLevel: quantileCeil(maxLevels, 0.5),
    p90MaxLevel: quantileCeil(maxLevels, 0.9),
    maxObservedLevel: Math.max(...maxLevels),
    averageUpperLimit: roundStep(mean(maxLevels)),
  }
}

const analyzeReport = ({ report, suiteId, budgetId, convergeMode }) => {
  const rows = collectThresholdRows({ report, suiteId, budgetId, convergeMode })
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
    return { kept: sorted, excluded: [], median: quantileCeil(sorted, 0.5), tolerance: 0 }
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
  const rescued = ranked.slice(0, size).map((item) => item.x).sort((a, b) => a - b)
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
    const p90MaxLevel = filtered.kept.length > 0 ? quantileCeil(filtered.kept, 0.9) : 0
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
      p90MaxLevel,
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
    p90MeanMaxLevel: meanLevels.length > 0 ? quantileCeil(meanLevels, 0.9) : 0,
    p90MedianMaxLevel: medianLevels.length > 0 ? quantileCeil(medianLevels, 0.9) : 0,
    maxObservedMeanLevel: meanLevels.length > 0 ? Math.max(...meanLevels) : 0,
    maxObservedMedianLevel: medianLevels.length > 0 ? Math.max(...medianLevels) : 0,
    averageUpperLimit: meanLevels.length > 0 ? roundStep(mean(meanLevels)) : 0,
    averageUpperLimitMedianBased: medianLevels.length > 0 ? roundStep(mean(medianLevels)) : 0,
    outlierRemovedCount,
    dirtyRootsRatioCount: rows.length,
  }

  return { rows, summary }
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
  return scored[0] ?? { sampleIndex: 1, distance: 0, reportFile: sampleAnalyses[0].reportFile }
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

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logix-perf-auto-probe-'))
    let finalReportFile = null
    let stopReason = 'unknown'
    const iterationLogs = []

    for (let iteration = 1; iteration <= args.maxIterations; iteration++) {
      const sampleAnalyses = []
      for (let sample = 1; sample <= args.samplesPerIteration; sample++) {
        const reportFile = path.join(tempDir, `probe.${String(iteration)}.${String(sample)}.json`)
        runCollect({ profile: args.profile, files, outFile: reportFile, levels })
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
        })
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

      const maxLevel = levels[levels.length - 1] ?? 0
      const secondLevel = levels[levels.length - 2] ?? maxLevel
      const topTimeoutCount = sampleAnalyses.reduce(
        (acc, sample) => acc + sample.timeoutPoints.filter((p) => Number(p?.params?.steps) >= secondLevel).length,
        0,
      )

      let shouldExtend = false
      let decision = 'envelope_converged'
      if (iteration >= args.maxIterations) {
        decision = 'max_iterations_reached'
      } else if (maxLevel >= args.maxLevelCap) {
        decision = 'max_level_cap_reached'
      } else if (aggregated.summary.dirtyRootsRatioCount === 0) {
        decision = 'missing_thresholds'
      } else if (aggregated.summary.floorMedianMaxLevel >= secondLevel) {
        shouldExtend = true
        decision = 'floor_near_top_band'
      } else if (aggregated.summary.averageUpperLimit >= secondLevel) {
        shouldExtend = true
        decision = 'average_near_top_band'
      } else if (aggregated.summary.p90MedianMaxLevel >= secondLevel) {
        shouldExtend = true
        decision = 'p90_near_top_band'
      }

      iterationLogs.push({
        iteration,
        levels,
        maxLevel,
        secondLevel,
        decision,
        topTimeoutCount,
        representativeSample: representative,
        sampleCount: sampleAnalyses.length,
        samples: sampleAnalyses.map((sample) => ({
          sample: sample.sample,
          reportFile: sample.reportFile,
          floor: sample.summary.floorMaxLevel,
          p50: sample.summary.p50MaxLevel,
          p90: sample.summary.p90MaxLevel,
          maxObserved: sample.summary.maxObservedLevel,
          averageUpperLimit: sample.summary.averageUpperLimit,
        })),
        aggregated: {
          summary: aggregated.summary,
          rows: aggregated.rows,
        },
      })

      finalReportFile = representative.reportFile
      stopReason = decision
      if (!shouldExtend) {
        break
      }

      const nextLevels = extendLevels({
        levels,
        growthFactor: args.growthFactor,
        extendCount: args.extendCount,
        maxLevelCap: args.maxLevelCap,
      })
      if (nextLevels.length === levels.length) {
        stopReason = 'no_further_extension_possible'
        break
      }
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
        outlierRelTolerance: args.outlierRelTolerance,
        outlierAbsTolerance: args.outlierAbsTolerance,
        minKeptSamples: args.minKeptSamples,
        stopReason,
        finalLevels: levels,
        summary: finalIteration?.aggregated?.summary ?? null,
        representativeSample: finalIteration?.representativeSample ?? null,
        iterations: iterationLogs,
      })
    }

    const summary = finalIteration?.aggregated?.summary ?? null
    // eslint-disable-next-line no-console
    console.log(
      `[logix-perf:auto-probe] levels=${levels.join(',')} floor=${String(
        summary?.floorMedianMaxLevel ?? 0,
      )} avg=${String(summary?.averageUpperLimit ?? 0)} p90=${String(summary?.p90MedianMaxLevel ?? 0)} samples=${String(
        args.samplesPerIteration,
      )} iterations=${String(iterationLogs.length)} stop=${stopReason}`,
    )
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

main()
