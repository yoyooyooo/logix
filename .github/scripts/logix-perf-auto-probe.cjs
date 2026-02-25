const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
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
    [--max-level-cap <n>]

Purpose:
  自动探测 converge steps 上限。脚本会循环执行 perf collect：
  1) 用当前 steps levels 采集一次报告；
  2) 读取指定预算的 capacity floor；
  3) 若 floor 仍处于“顶层区间”，则自动扩容 steps 再采集；
  4) 收敛后输出最终报告，并导出最终 steps CSV。
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
  }

  if (!out.profile || !out.files || !out.out) {
    return null
  }
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
  return out
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')

const quantileCeil = (sorted, q) => {
  if (sorted.length === 0) return 0
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * q) - 1))
  return sorted[index] ?? 0
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

const analyzeReport = ({ report, suiteId, budgetId, convergeMode }) => {
  const suites = Array.isArray(report?.suites) ? report.suites : []
  const suite = suites.find((s) => s?.id === suiteId)
  if (!suite) {
    throw new Error(`suite not found in report: ${suiteId}`)
  }

  const thresholds = Array.isArray(suite.thresholds) ? suite.thresholds : []
  const points = Array.isArray(suite.points) ? suite.points : []
  const selected = thresholds.filter(
    (t) => t?.budget?.id === budgetId && (t?.where?.convergeMode == null || t.where.convergeMode === convergeMode),
  )
  const maxLevels = selected.map((t) => toNumericLevel(t?.maxLevel)).filter((x) => Number.isFinite(x) && x > 0)

  const sorted = maxLevels.slice().sort((a, b) => a - b)
  const floor = sorted.length > 0 ? sorted[0] : 0
  const p50 = quantileCeil(sorted, 0.5)
  const p90 = quantileCeil(sorted, 0.9)

  return {
    thresholdsCount: selected.length,
    floor,
    p50,
    p90,
    maxLevels: sorted,
    timeoutPoints: points.filter((p) => p?.status === 'timeout' && p?.params?.convergeMode === convergeMode),
  }
}

const roundStep = (n) => Math.ceil(n / 100) * 100

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

    for (let index = 1; index <= args.maxIterations; index++) {
      const reportFile = path.join(tempDir, `probe.${String(index)}.json`)
      runCollect({
        profile: args.profile,
        files,
        outFile: reportFile,
        levels,
      })
      const report = readJson(reportFile)
      const summary = analyzeReport({
        report,
        suiteId: args.suiteId,
        budgetId: args.budgetId,
        convergeMode: args.convergeMode,
      })

      const maxLevel = levels[levels.length - 1] ?? 0
      const secondLevel = levels[levels.length - 2] ?? maxLevel
      const topTimeoutCount = summary.timeoutPoints.filter((p) => Number(p?.params?.steps) >= secondLevel).length

      let shouldExtend = false
      let decision = 'envelope_converged'
      if (index >= args.maxIterations) {
        shouldExtend = false
        decision = 'max_iterations_reached'
      } else if (maxLevel >= args.maxLevelCap) {
        shouldExtend = false
        decision = 'max_level_cap_reached'
      } else if (summary.thresholdsCount === 0) {
        shouldExtend = false
        decision = 'missing_thresholds'
      } else if (summary.floor >= secondLevel) {
        shouldExtend = true
        decision = 'floor_near_top_band'
      } else {
        shouldExtend = false
        decision = 'floor_below_top_band'
      }

      iterationLogs.push({
        iteration: index,
        levels,
        maxLevel,
        secondLevel,
        floor: summary.floor,
        p50: summary.p50,
        p90: summary.p90,
        thresholdsCount: summary.thresholdsCount,
        topTimeoutCount,
        decision,
        reportFile,
      })

      finalReportFile = reportFile
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
        stopReason,
        finalLevels: levels,
        iterations: iterationLogs,
      })
    }

    const lastIteration = iterationLogs[iterationLogs.length - 1]
    // eslint-disable-next-line no-console
    console.log(
      `[logix-perf:auto-probe] levels=${levels.join(',')} floor=${String(lastIteration?.floor ?? 0)} p90=${String(
        lastIteration?.p90 ?? 0,
      )} iterations=${String(iterationLogs.length)} stop=${stopReason}`,
    )
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

main()
