const fs = require('node:fs')
const path = require('node:path')

const usage = () => `\
Usage:
  node .github/scripts/logix-perf-capacity-model.cjs resolve-target \\
    [--latest <file>] \\
    [--base-floor-min <n>] \\
    [--hard-floor-ratio <float>] \\
    [--profile <profile>] \\
    [--env-id <id>] \\
    [--suite-id <id>] \\
    [--budget-id <id>] \\
    [--where-axis <axis>] \\
    [--converge-mode <mode>] \\
    [--min-history-runs <n>] \\
    [--history-window <n>] \\
    [--env-out <file>] \\
    [--out <file>]

  node .github/scripts/logix-perf-capacity-model.cjs record \\
    --report <after.json> \\
    [--suite-id <id>] \\
    [--budget-id <id>] \\
    [--where-axis <axis>] \\
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

const toNumericLevel = (value, primaryAxisLevels) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const numeric = Number(value)
    if (Number.isFinite(numeric)) return numeric
    const idx = Array.isArray(primaryAxisLevels) ? primaryAxisLevels.indexOf(value) : -1
    if (idx >= 0) return idx + 1
    return 0
  }
  if (typeof value === 'boolean') return value ? 1 : 0
  return 0
}

const resolveScopeFilter = (convergeMode) => {
  if (convergeMode == null) return null
  const text = String(convergeMode).trim()
  if (!text || text === '*' || text.toLowerCase() === 'any') return null
  return text
}

const collectPrimaryAxisLevels = ({ suite, primaryAxis }) => {
  const out = []
  const seen = new Set()
  const points = Array.isArray(suite?.points) ? suite.points : []
  for (const point of points) {
    const level = point?.params?.[primaryAxis]
    if (level === undefined || level === null) continue
    const key = `${typeof level}:${String(level)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(level)
  }
  return out
}

const compareSliceValues = (a, b) => {
  const aNum = typeof a === 'number' && Number.isFinite(a)
  const bNum = typeof b === 'number' && Number.isFinite(b)
  if (aNum && bNum) return a - b
  return String(a).localeCompare(String(b))
}

const collectCapacityRows = ({ report, suiteId, budgetId, whereAxis, convergeMode }) => {
  const suites = Array.isArray(report?.suites) ? report.suites : []
  const suite = suites.find((s) => s?.id === suiteId)
  if (!suite || !Array.isArray(suite.thresholds)) {
    return {
      rows: [],
      primaryAxis: 'steps',
      primaryAxisLevels: [],
      whereAxis: whereAxis || 'dirtyRootsRatio',
    }
  }

  const primaryAxis = typeof suite?.primaryAxis === 'string' && suite.primaryAxis.length > 0 ? suite.primaryAxis : 'steps'
  const primaryAxisLevels = collectPrimaryAxisLevels({ suite, primaryAxis })
  const resolvedWhereAxis = whereAxis && String(whereAxis).trim().length > 0 ? String(whereAxis).trim() : 'dirtyRootsRatio'
  const scopeFilter = resolveScopeFilter(convergeMode)

  const rows = []
  for (const threshold of suite.thresholds) {
    if (!threshold || typeof threshold !== 'object') continue
    if ((threshold.budget?.id ?? '') !== budgetId) continue
    if (scopeFilter != null && (threshold.where?.convergeMode ?? null) !== scopeFilter) continue
    const sliceValue = threshold.where?.[resolvedWhereAxis]
    if (sliceValue === undefined || sliceValue === null) continue
    if (typeof sliceValue !== 'number' && typeof sliceValue !== 'string' && typeof sliceValue !== 'boolean') continue

    const maxLevel = Number(threshold.maxLevel)
    const firstFailRaw = threshold.firstFail?.primaryLevel ?? threshold.firstFailLevel
    rows.push({
      sliceValue,
      maxLevel: Number.isFinite(maxLevel) ? maxLevel : toNumericLevel(threshold.maxLevel, primaryAxisLevels),
      maxLevelRaw: threshold.maxLevel ?? null,
      firstFailLevel: Number.isFinite(Number(firstFailRaw))
        ? Number(firstFailRaw)
        : toNumericLevel(firstFailRaw, primaryAxisLevels) || null,
      firstFailLevelRaw: firstFailRaw ?? null,
      reason: threshold.firstFail?.reason ?? threshold.reason ?? null,
    })
  }

  rows.sort((a, b) => compareSliceValues(a.sliceValue, b.sliceValue))
  return {
    rows,
    primaryAxis,
    primaryAxisLevels,
    whereAxis: resolvedWhereAxis,
  }
}

const detectMaxTestedLevel = ({ report, suiteId, convergeMode, primaryAxis, primaryAxisLevels }) => {
  const suites = Array.isArray(report?.suites) ? report.suites : []
  const suite = suites.find((s) => s?.id === suiteId)
  if (!suite || !Array.isArray(suite.points)) return 0
  const scopeFilter = resolveScopeFilter(convergeMode)
  const levels = []
  for (const point of suite.points) {
    if (!point || typeof point !== 'object') continue
    if (scopeFilter != null && (point.params?.convergeMode ?? null) !== scopeFilter) continue
    const steps = toNumericLevel(point.params?.[primaryAxis], primaryAxisLevels)
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

const filterComparableHistoryRows = ({ rows, profile, envId, suiteId, budgetId, whereAxis, convergeMode }) =>
  rows.filter(
    (row) =>
      row?.profile === profile &&
      row?.envId === envId &&
      row?.suiteId === suiteId &&
      row?.budgetId === budgetId &&
      row?.whereAxis === whereAxis &&
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
  const expectedProfile = kv.profile ? String(kv.profile) : null
  const expectedEnvId = kv['env-id'] ? String(kv['env-id']) : null
  const expectedSuiteId = kv['suite-id'] ? String(kv['suite-id']) : null
  const expectedBudgetId = kv['budget-id'] ? String(kv['budget-id']) : null
  const expectedWhereAxis = kv['where-axis'] ? String(kv['where-axis']) : null
  const expectedConvergeMode = kv['converge-mode'] ? String(kv['converge-mode']) : null

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

  const mismatchReasons = []
  if (latest) {
    if (expectedProfile && latest.profile !== expectedProfile) {
      mismatchReasons.push(`profile:${String(latest.profile ?? 'unknown')}!=${expectedProfile}`)
    }
    if (expectedEnvId && latest.envId !== expectedEnvId) {
      mismatchReasons.push(`env:${String(latest.envId ?? 'unknown')}!=${expectedEnvId}`)
    }
    if (expectedSuiteId && latest.suiteId !== expectedSuiteId) {
      mismatchReasons.push(`suite:${String(latest.suiteId ?? 'unknown')}!=${expectedSuiteId}`)
    }
    if (expectedBudgetId && latest.budgetId !== expectedBudgetId) {
      mismatchReasons.push(`budget:${String(latest.budgetId ?? 'unknown')}!=${expectedBudgetId}`)
    }
    if (expectedWhereAxis && latest.whereAxis !== expectedWhereAxis) {
      mismatchReasons.push(`whereAxis:${String(latest.whereAxis ?? 'unknown')}!=${expectedWhereAxis}`)
    }
    if (expectedConvergeMode && latest.convergeMode !== expectedConvergeMode) {
      mismatchReasons.push(`mode:${String(latest.convergeMode ?? 'unknown')}!=${expectedConvergeMode}`)
    }
  }

  const latestComparable = mismatchReasons.length === 0 ? latest : null
  const stableRuns = Number(latestComparable?.stable?.runs ?? 0)
  const stableP50 = Number(latestComparable?.stable?.p50 ?? 0)
  const currentP50 = Number(latestComparable?.current?.p50 ?? 0)
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
    latestComparable: mismatchReasons.length === 0,
    latestMismatchReasons: mismatchReasons,
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
    PERF_CAPACITY_DYNAMIC_TARGET_LATEST_COMPARABLE: result.latestComparable ? '1' : '0',
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
  const whereAxis = kv['where-axis'] || 'dirtyRootsRatio'
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
  const capacitySlice = collectCapacityRows({ report, suiteId, budgetId, whereAxis, convergeMode })
  const rows = capacitySlice.rows
  const maxTestedLevel = detectMaxTestedLevel({
    report,
    suiteId,
    convergeMode,
    primaryAxis: capacitySlice.primaryAxis,
    primaryAxisLevels: capacitySlice.primaryAxisLevels,
  })
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
    whereAxis: capacitySlice.whereAxis,
    primaryAxis: capacitySlice.primaryAxis,
    convergeMode,
    current,
    timeoutRatios: rows
      .filter((row) => /timeout/i.test(String(row.reason ?? '')))
      .map((row) => row.sliceValue)
      .filter((value) => typeof value === 'number' && Number.isFinite(value)),
    timeoutSlices: rows.filter((row) => /timeout/i.test(String(row.reason ?? ''))).map((row) => row.sliceValue),
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
    whereAxis: runRecord.whereAxis,
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
    whereAxis: runRecord.whereAxis,
    primaryAxis: runRecord.primaryAxis,
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
