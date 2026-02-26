const fs = require('node:fs')
const path = require('node:path')

const usage = () => `\
Usage:
  node .github/scripts/logix-perf-capacity-model.cjs resolve-target \\
    [--latest <file>] \\
    [--base-floor-min <n>] \\
    [--hard-floor-ratio <float>] \\
    [--min-history-runs <n>] \\
    [--history-window <n>] \\
    [--env-out <file>] \\
    [--out <file>]

  node .github/scripts/logix-perf-capacity-model.cjs record \\
    --report <after.json> \\
    [--suite-id <id>] \\
    [--budget-id <id>] \\
    [--converge-mode <mode>] \\
    [--history <jsonl>] \\
    [--latest <json>] \\
    [--artifact-history <jsonl>] \\
    [--artifact-latest <json>] \\
    [--base-floor-min <n>] \\
    [--hard-floor-ratio <float>] \\
    [--warn-floor-ratio <float>] \\
    [--min-history-runs <n>] \\
    [--history-window <n>] \\
    [--run-id <id>] \\
    [--run-url <url>] \\
    [--head-sha <sha>] \\
    [--base-sha <sha>] \\
    [--profile <profile>] \\
    [--env-id <id>] \\
    [--env-out <file>] \\
    [--out <file>]
`

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

const parseIntStrict = (value, fallback) => {
  if (value == null || String(value).trim().length === 0) return fallback
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.round(n)
}

const parseNumberStrict = (value, fallback) => {
  if (value == null || String(value).trim().length === 0) return fallback
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return n
}

const roundStep = (n) => Math.ceil(Math.max(0, Number(n) || 0) / 100) * 100

const quantileCeil = (values, q) => {
  if (!Array.isArray(values) || values.length === 0) return 0
  const sorted = values
    .filter((x) => typeof x === 'number' && Number.isFinite(x))
    .slice()
    .sort((a, b) => a - b)
  if (sorted.length === 0) return 0
  const clampedQ = Math.max(0, Math.min(1, q))
  const idx = Math.ceil(clampedQ * (sorted.length - 1))
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))] ?? 0
}

const mean = (values) => {
  if (!Array.isArray(values) || values.length === 0) return 0
  const total = values.reduce((acc, x) => acc + x, 0)
  return total / values.length
}

const pickFinite = (...values) => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return undefined
}

const collectCapacityRows = ({ report, suiteId, budgetId, convergeMode }) => {
  const suites = Array.isArray(report?.suites) ? report.suites : []
  const suite = suites.find((s) => s?.id === suiteId)
  if (!suite || !Array.isArray(suite.thresholds)) return []

  const rows = []
  for (const threshold of suite.thresholds) {
    if (!threshold || typeof threshold !== 'object') continue
    if ((threshold.budget?.id ?? '') !== budgetId) continue
    if ((threshold.where?.convergeMode ?? null) !== convergeMode) continue
    const dirtyRootsRatio = threshold.where?.dirtyRootsRatio
    if (!(typeof dirtyRootsRatio === 'number' && Number.isFinite(dirtyRootsRatio))) continue

    const maxLevel = Number(threshold.maxLevel)
    rows.push({
      dirtyRootsRatio,
      maxLevel: Number.isFinite(maxLevel) ? maxLevel : 0,
      firstFailLevel: Number.isFinite(Number(threshold.firstFail?.primaryLevel ?? threshold.firstFailLevel))
        ? Number(threshold.firstFail?.primaryLevel ?? threshold.firstFailLevel)
        : null,
      reason: threshold.firstFail?.reason ?? threshold.reason ?? null,
    })
  }

  rows.sort((a, b) => a.dirtyRootsRatio - b.dirtyRootsRatio)
  return rows
}

const detectMaxTestedLevel = ({ report, suiteId, convergeMode }) => {
  const suites = Array.isArray(report?.suites) ? report.suites : []
  const suite = suites.find((s) => s?.id === suiteId)
  if (!suite || !Array.isArray(suite.points)) return 0
  const levels = []
  for (const point of suite.points) {
    if (!point || typeof point !== 'object') continue
    if ((point.params?.convergeMode ?? null) !== convergeMode) continue
    const steps = Number(point.params?.steps)
    if (Number.isFinite(steps)) levels.push(steps)
  }
  if (levels.length === 0) return 0
  return Math.max(...levels)
}

const summarizeRows = ({ rows, maxTestedLevel }) => {
  const maxLevels = rows
    .map((row) => row.maxLevel)
    .filter((x) => typeof x === 'number' && Number.isFinite(x) && x > 0)
  const timeoutRows = rows.filter((row) => /timeout/i.test(String(row.reason ?? '')))

  if (maxLevels.length === 0) {
    return {
      ratioCount: rows.length,
      floor: 0,
      p50: 0,
      p75: 0,
      p95: 0,
      max: 0,
      average: 0,
      timeoutCount: timeoutRows.length,
      maxTestedLevel,
      topSaturated: false,
    }
  }

  const p95 = quantileCeil(maxLevels, 0.95)
  return {
    ratioCount: rows.length,
    floor: Math.min(...maxLevels),
    p50: quantileCeil(maxLevels, 0.5),
    p75: quantileCeil(maxLevels, 0.75),
    p95,
    max: Math.max(...maxLevels),
    average: roundStep(mean(maxLevels)),
    timeoutCount: timeoutRows.length,
    maxTestedLevel,
    topSaturated: maxTestedLevel > 0 && p95 >= maxTestedLevel,
  }
}

const parseHistoryJsonl = (file) => {
  if (!file || !fs.existsSync(file)) return []
  const lines = fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const rows = []
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line)
      if (parsed && typeof parsed === 'object') rows.push(parsed)
    } catch {
      // ignore invalid row
    }
  }
  return rows
}

const serializeHistoryJsonl = (file, rows) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const content = rows.map((row) => JSON.stringify(row)).join('\n')
  fs.writeFileSync(file, `${content}${content.length > 0 ? '\n' : ''}`, 'utf8')
}

const dedupeHistoryRows = (rows) => {
  const seen = new Set()
  const out = []
  for (const row of rows) {
    const runId = String(row?.run?.id ?? '')
    const key = runId.length > 0 ? `run:${runId}` : `ts:${String(row?.createdAt ?? '')}:${String(row?.commit?.head ?? '')}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(row)
  }
  return out
}

const filterComparableHistoryRows = ({ rows, profile, envId, suiteId, budgetId, convergeMode }) =>
  rows.filter(
    (row) =>
      row?.profile === profile &&
      row?.envId === envId &&
      row?.suiteId === suiteId &&
      row?.budgetId === budgetId &&
      row?.convergeMode === convergeMode,
  )

const summarizeStableWindow = ({ rows, historyWindow }) => {
  const tail = rows.slice(-historyWindow)
  const p50s = tail.map((row) => Number(row?.current?.p50)).filter((x) => Number.isFinite(x) && x > 0)
  const p75s = tail.map((row) => Number(row?.current?.p75)).filter((x) => Number.isFinite(x) && x > 0)
  const p95s = tail.map((row) => Number(row?.current?.p95)).filter((x) => Number.isFinite(x) && x > 0)
  const floors = tail.map((row) => Number(row?.current?.floor)).filter((x) => Number.isFinite(x) && x > 0)
  const timeouts = tail.map((row) => Number(row?.current?.timeoutCount ?? 0)).filter((x) => Number.isFinite(x) && x >= 0)

  return {
    runs: tail.length,
    p50: p50s.length > 0 ? quantileCeil(p50s, 0.5) : 0,
    p75: p75s.length > 0 ? quantileCeil(p75s, 0.5) : 0,
    p95: p95s.length > 0 ? quantileCeil(p95s, 0.5) : 0,
    floorMedian: floors.length > 0 ? quantileCeil(floors, 0.5) : 0,
    floorP10: floors.length > 0 ? quantileCeil(floors, 0.1) : 0,
    timeoutP50: timeouts.length > 0 ? quantileCeil(timeouts, 0.5) : 0,
    timeoutP95: timeouts.length > 0 ? quantileCeil(timeouts, 0.95) : 0,
  }
}

const computeTargets = ({ baseFloorMin, hardFloorRatio, warnFloorRatio, anchorP50 }) => {
  const safeAnchor = Number.isFinite(anchorP50) && anchorP50 > 0 ? anchorP50 : baseFloorMin
  return {
    anchorP50: safeAnchor,
    hardFloor: Math.max(baseFloorMin, roundStep(safeAnchor * hardFloorRatio)),
    warnFloor: Math.max(baseFloorMin, roundStep(safeAnchor * warnFloorRatio)),
  }
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

const writeEnv = (envOut, kv) => {
  if (!envOut) return
  fs.mkdirSync(path.dirname(envOut), { recursive: true })
  const lines = []
  for (const [k, v] of Object.entries(kv)) {
    if (v == null) continue
    lines.push(`${k}=${String(v)}`)
  }
  if (lines.length > 0) {
    fs.appendFileSync(envOut, `${lines.join('\n')}\n`, 'utf8')
  }
}

const cmdResolveTarget = (kv) => {
  const latestFile = kv.latest ? path.resolve(process.cwd(), kv.latest) : null
  const outFile = kv.out ? path.resolve(process.cwd(), kv.out) : null
  const envOut = kv['env-out'] ? path.resolve(process.cwd(), kv['env-out']) : null

  const baseFloorMin = Math.max(0, parseIntStrict(kv['base-floor-min'], 2000))
  const hardFloorRatio = parseNumberStrict(kv['hard-floor-ratio'], 0.8)
  const minHistoryRuns = Math.max(1, parseIntStrict(kv['min-history-runs'], 3))
  const historyWindow = Math.max(1, parseIntStrict(kv['history-window'], 5))

  let latest = null
  if (latestFile && fs.existsSync(latestFile)) {
    try {
      latest = readJson(latestFile)
    } catch {
      latest = null
    }
  }

  const stableRuns = Number(latest?.stable?.runs ?? 0)
  const stableP50 = Number(latest?.stable?.p50 ?? 0)
  const currentP50 = Number(latest?.current?.p50 ?? 0)
  const canUseStable = stableRuns >= minHistoryRuns && stableP50 > 0
  const anchorP50 = canUseStable ? stableP50 : pickFinite(currentP50, stableP50, baseFloorMin)
  const targets = computeTargets({ baseFloorMin, hardFloorRatio, warnFloorRatio: hardFloorRatio, anchorP50 })

  const result = {
    mode: 'resolve-target',
    resolvedFloorMin: targets.hardFloor,
    baseFloorMin,
    hardFloorRatio,
    anchorP50: targets.anchorP50,
    source: canUseStable ? 'stable_p50' : stableP50 > 0 ? 'latest_current_p50' : 'base_floor_min',
    stableRuns,
    minHistoryRuns,
    historyWindow,
    generatedAt: new Date().toISOString(),
  }

  if (outFile) writeJson(outFile, result)
  writeEnv(envOut, {
    PERF_CAPACITY_FLOOR_MIN: result.resolvedFloorMin,
    PERF_CAPACITY_DYNAMIC_TARGET_SOURCE: result.source,
    PERF_CAPACITY_DYNAMIC_TARGET_ANCHOR_P50: result.anchorP50,
    PERF_CAPACITY_DYNAMIC_TARGET_HISTORY_RUNS: result.stableRuns,
  })

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

const cmdRecord = (kv) => {
  const reportFile = kv.report ? path.resolve(process.cwd(), kv.report) : null
  if (!reportFile || !fs.existsSync(reportFile)) {
    throw new Error(`missing --report: ${String(kv.report ?? '')}`)
  }

  const suiteId = kv['suite-id'] || 'converge.txnCommit'
  const budgetId = kv['budget-id'] || 'commit.p95<=50ms'
  const convergeMode = kv['converge-mode'] || 'auto'
  const historyFile = kv.history ? path.resolve(process.cwd(), kv.history) : null
  const latestFile = kv.latest ? path.resolve(process.cwd(), kv.latest) : null
  const artifactHistory = kv['artifact-history'] ? path.resolve(process.cwd(), kv['artifact-history']) : null
  const artifactLatest = kv['artifact-latest'] ? path.resolve(process.cwd(), kv['artifact-latest']) : null
  const outFile = kv.out ? path.resolve(process.cwd(), kv.out) : null
  const envOut = kv['env-out'] ? path.resolve(process.cwd(), kv['env-out']) : null

  const baseFloorMin = Math.max(0, parseIntStrict(kv['base-floor-min'], 2000))
  const hardFloorRatio = parseNumberStrict(kv['hard-floor-ratio'], 0.8)
  const warnFloorRatio = parseNumberStrict(kv['warn-floor-ratio'], 0.9)
  const minHistoryRuns = Math.max(1, parseIntStrict(kv['min-history-runs'], 3))
  const historyWindow = Math.max(1, parseIntStrict(kv['history-window'], 5))

  const report = readJson(reportFile)
  const rows = collectCapacityRows({ report, suiteId, budgetId, convergeMode })
  const maxTestedLevel = detectMaxTestedLevel({ report, suiteId, convergeMode })
  const current = summarizeRows({ rows, maxTestedLevel })

  const runRecord = {
    createdAt: new Date().toISOString(),
    run: {
      id: kv['run-id'] ?? null,
      url: kv['run-url'] ?? null,
    },
    commit: {
      head: kv['head-sha'] ?? null,
      base: kv['base-sha'] ?? null,
    },
    profile: kv.profile ?? 'unknown',
    envId: kv['env-id'] ?? 'unknown',
    suiteId,
    budgetId,
    convergeMode,
    current,
    timeoutRatios: rows.filter((row) => /timeout/i.test(String(row.reason ?? ''))).map((row) => row.dirtyRootsRatio),
    rows,
  }

  let historyRows = historyFile ? parseHistoryJsonl(historyFile) : []
  historyRows.push(runRecord)
  historyRows = dedupeHistoryRows(historyRows)

  const comparableHistory = filterComparableHistoryRows({
    rows: historyRows,
    profile: runRecord.profile,
    envId: runRecord.envId,
    suiteId,
    budgetId,
    convergeMode,
  })
  const stable = summarizeStableWindow({ rows: comparableHistory, historyWindow })

  const useStable = stable.runs >= minHistoryRuns && stable.p50 > 0
  const anchorP50 = useStable ? stable.p50 : baseFloorMin
  const targets = computeTargets({
    baseFloorMin,
    hardFloorRatio,
    warnFloorRatio,
    anchorP50,
  })

  const evaluation = {
    hardPass: current.floor >= targets.hardFloor,
    warnPass: current.floor >= targets.warnFloor,
    hardFloor: targets.hardFloor,
    warnFloor: targets.warnFloor,
    baseFloorMin,
    hardFloorRatio,
    warnFloorRatio,
    anchorP50: targets.anchorP50,
    anchorSource: useStable ? 'stable_p50' : 'base_floor_min',
    historyWindow,
    minHistoryRuns,
    stableRuns: stable.runs,
    timeoutRetrySuggested: current.timeoutCount > 0,
  }

  const latest = {
    generatedAt: new Date().toISOString(),
    run: runRecord.run,
    commit: runRecord.commit,
    profile: runRecord.profile,
    envId: runRecord.envId,
    suiteId,
    budgetId,
    convergeMode,
    current,
    stable,
    evaluation,
  }

  if (historyFile) serializeHistoryJsonl(historyFile, historyRows)
  if (latestFile) writeJson(latestFile, latest)
  if (artifactHistory && historyFile && fs.existsSync(historyFile)) {
    fs.mkdirSync(path.dirname(artifactHistory), { recursive: true })
    fs.copyFileSync(historyFile, artifactHistory)
  }
  if (artifactLatest) writeJson(artifactLatest, latest)
  if (outFile) writeJson(outFile, latest)

  writeEnv(envOut, {
    PERF_CAPACITY_DYNAMIC_HARD_PASS: evaluation.hardPass ? '1' : '0',
    PERF_CAPACITY_DYNAMIC_WARN_PASS: evaluation.warnPass ? '1' : '0',
    PERF_CAPACITY_DYNAMIC_HARD_FLOOR_TARGET: evaluation.hardFloor,
    PERF_CAPACITY_DYNAMIC_WARN_FLOOR_TARGET: evaluation.warnFloor,
    PERF_CAPACITY_DYNAMIC_ANCHOR_P50: evaluation.anchorP50,
    PERF_CAPACITY_DYNAMIC_STABLE_RUNS: evaluation.stableRuns,
    PERF_CAPACITY_DYNAMIC_TIMEOUT_RETRY_SUGGESTED: evaluation.timeoutRetrySuggested ? '1' : '0',
  })

  process.stdout.write(`${JSON.stringify(latest, null, 2)}\n`)
}

const main = () => {
  const { mode, kv } = parseArgs(process.argv.slice(2))
  if (!mode || mode === '--help' || mode === '-h') {
    // eslint-disable-next-line no-console
    console.error(usage())
    process.exitCode = 2
    return
  }

  if (mode === 'resolve-target') {
    cmdResolveTarget(kv)
    return
  }
  if (mode === 'record') {
    cmdRecord(kv)
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
