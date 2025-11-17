const fs = require('node:fs')
const path = require('node:path')

const perfDir = process.env.PERF_OUT_DIR || 'perf/ci'
fs.mkdirSync(perfDir, { recursive: true })

const baseShort = (process.env.BASE_SHORT || '').slice(0, 8)
const headShort = (process.env.HEAD_SHORT || '').slice(0, 8)
const baseRef = (process.env.BASE_REF || '').trim()
const headRef = (process.env.HEAD_REF || '').trim()
const envId = process.env.PERF_ENV_ID || ''
const profile = process.env.PERF_PROFILE || 'quick'

const scope = process.env.PERF_FILES || 'test/browser/perf-boundaries/converge-steps.test.tsx'
const artifactName = process.env.PERF_ARTIFACT_NAME || ''

const beforePath =
  baseShort && envId ? path.join(perfDir, `before.${baseShort}.${envId}.${profile}.json`) : null
const afterPath =
  headShort && envId ? path.join(perfDir, `after.${headShort}.${envId}.${profile}.json`) : null
const diffPath =
  baseShort && headShort && envId ? path.join(perfDir, `diff.${baseShort}__${headShort}.${envId}.${profile}.json`) : null

const safeReadJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

const beforeReport = beforePath && fs.existsSync(beforePath) ? safeReadJson(beforePath) : null
const afterReport = afterPath && fs.existsSync(afterPath) ? safeReadJson(afterPath) : null
const diff = diffPath && fs.existsSync(diffPath) ? safeReadJson(diffPath) : null

const files = fs
  .readdirSync(perfDir)
  .filter((f) => f.endsWith('.json') || f.endsWith('.md'))
  .sort()

const code = (x) => `\`${String(x ?? '').replaceAll('`', '')}\``

const stableParamsKey = (p) => {
  if (!p || typeof p !== 'object') return '{}'
  const keys = Object.keys(p).sort()
  return `{${keys.map((k) => `${k}=${String(p[k])}`).join('&')}}`
}

const uniqValuesFromPoints = (suite, key) => {
  const out = new Set()
  for (const p of suite?.points ?? []) {
    const v = p?.params?.[key]
    if (v === undefined || v === null) continue
    out.add(v)
  }
  return Array.from(out).sort((a, b) => {
    const aNum = typeof a === 'number' && Number.isFinite(a)
    const bNum = typeof b === 'number' && Number.isFinite(b)
    if (aNum && bNum) return a - b
    return String(a).localeCompare(String(b))
  })
}

const formatAxisValues = (values) => {
  const xs = (values || []).map(String)
  const limit = 16
  if (xs.length <= limit) return `[${xs.join(', ')}]`
  return `[${xs.slice(0, limit).join(', ')}, … +${xs.length - limit} more]`
}
const budgetKey = (b) => {
  if (!b || typeof b !== 'object') return 'unknownBudget'
  if (typeof b.id === 'string' && b.id.trim()) return b.id
  if (b.type === 'absolute') return `absolute:${b.metric}:p95<=${String(b.p95Ms)}`
  return `relative:${b.metric}:${b.numeratorRef}/${b.denominatorRef}<=${String(b.maxRatio)}`
}

const parseRef = (ref) => {
  const out = {}
  for (const part of String(ref || '').split('&')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const k = trimmed.slice(0, eq).trim()
    const v = trimmed.slice(eq + 1).trim()
    if (!k) continue
    if (v === 'true') out[k] = true
    else if (v === 'false') out[k] = false
    else if (/^-?\\d+(\\.\\d+)?$/.test(v)) out[k] = Number(v)
    else out[k] = v
  }
  return out
}

const findPoint = (suite, expected) => {
  if (!suite || !Array.isArray(suite.points)) return null
  const keys = Object.keys(expected || {})
  return suite.points.find((p) => keys.every((k) => p?.params?.[k] === expected[k])) ?? null
}

const getMetricP95Ms = (point, metric) => {
  if (!point) return { ok: false, reason: 'pointMissing' }
  if (point.status !== 'ok') return { ok: false, reason: point.reason ?? point.status ?? 'notOk' }
  const m = Array.isArray(point.metrics) ? point.metrics.find((x) => x.name === metric) : null
  if (!m) return { ok: false, reason: 'metricMissing' }
  if (m.status !== 'ok') return { ok: false, reason: m.unavailableReason ?? 'metricUnavailable' }
  return { ok: true, p95Ms: m.stats?.p95Ms }
}

const getMetricStatsMs = (point, metric) => {
  if (!point) return { ok: false, reason: 'pointMissing' }
  if (point.status !== 'ok') return { ok: false, reason: point.reason ?? point.status ?? 'notOk' }
  const m = Array.isArray(point.metrics) ? point.metrics.find((x) => x.name === metric) : null
  if (!m) return { ok: false, reason: 'metricMissing' }
  if (m.status !== 'ok') return { ok: false, reason: m.unavailableReason ?? 'metricUnavailable' }
  const n = m.stats?.n
  const medianMs = m.stats?.medianMs
  const p95Ms = m.stats?.p95Ms
  if (typeof n !== 'number' || typeof medianMs !== 'number' || typeof p95Ms !== 'number') {
    return { ok: false, reason: 'statsMissing' }
  }
  return { ok: true, stats: { n, medianMs, p95Ms } }
}

const getEvidenceValue = (point, evidenceName) => {
  if (!point) return { ok: false, reason: 'pointMissing' }
  const e = Array.isArray(point.evidence) ? point.evidence.find((x) => x?.name === evidenceName) : null
  if (!e) return { ok: false, reason: 'evidenceMissing' }
  if (e.status !== 'ok') return { ok: false, reason: e.unavailableReason ?? 'evidenceUnavailable' }
  return { ok: true, value: e.value }
}
const cartesian = (axes) => {
  if (!Array.isArray(axes) || axes.length === 0) return [[]]
  const [head, ...tail] = axes
  const rest = cartesian(tail)
  const out = []
  for (const h of head || []) {
    for (const r of rest) out.push([h, ...r])
  }
  return out
}

const pickChartLevels = (axisLevels) => {
  if (!Array.isArray(axisLevels) || axisLevels.length === 0) return []
  if (axisLevels.length <= 6) return axisLevels.slice()
  const first = axisLevels[0]
  const mid = axisLevels[Math.floor(axisLevels.length / 2)]
  const last = axisLevels[axisLevels.length - 1]
  return Array.from(new Set([first, mid, last]))
}

const getRelativeMinDeltaMs = (budget) => {
  const v = budget?.minDeltaMs
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

const isRelativeBudgetExceeded = (budget, ratio, deltaMs) => {
  const minDeltaMs = getRelativeMinDeltaMs(budget)
  return ratio > budget.maxRatio && deltaMs > minDeltaMs
}

const computeThresholdMaxLevelAbsolute = (suiteSpec, suiteResult, budget, where) => {
  const primary = suiteSpec.primaryAxis
  const axisLevels = suiteSpec.axes?.[primary] ?? []
  let maxLevel = null
  for (const level of axisLevels) {
    const params = { ...(where || {}), [primary]: level }
    const point = findPoint(suiteResult, params)
    if (!point) return { maxLevel, firstFailLevel: level, reason: 'missingPoint' }
    const res = getMetricP95Ms(point, budget.metric)
    if (!res.ok) return { maxLevel, firstFailLevel: level, reason: res.reason }
    if (res.p95Ms <= budget.p95Ms) {
      maxLevel = level
      continue
    }
    return { maxLevel, firstFailLevel: level, reason: 'budgetExceeded' }
  }
  return { maxLevel, firstFailLevel: null }
}

const computeThresholdMaxLevelRelative = (suiteSpec, suiteResult, budget, where) => {
  const primary = suiteSpec.primaryAxis
  const axisLevels = suiteSpec.axes?.[primary] ?? []
  const numeratorRef = parseRef(budget.numeratorRef)
  const denominatorRef = parseRef(budget.denominatorRef)

  let maxLevel = null
  for (const level of axisLevels) {
    const numeratorParams = { ...(where || {}), ...numeratorRef, [primary]: level }
    const denominatorParams = { ...(where || {}), ...denominatorRef, [primary]: level }

    const numeratorPoint = findPoint(suiteResult, numeratorParams)
    if (!numeratorPoint) return { maxLevel, firstFailLevel: level, reason: 'missingNumerator' }
    const denominatorPoint = findPoint(suiteResult, denominatorParams)
    if (!denominatorPoint) return { maxLevel, firstFailLevel: level, reason: 'missingDenominator' }

    const numeratorP95 = getMetricP95Ms(numeratorPoint, budget.metric)
    if (!numeratorP95.ok) return { maxLevel, firstFailLevel: level, reason: `numerator:${numeratorP95.reason}` }

    const denominatorP95 = getMetricP95Ms(denominatorPoint, budget.metric)
    if (!denominatorP95.ok) return { maxLevel, firstFailLevel: level, reason: `denominator:${denominatorP95.reason}` }

    if (!(denominatorP95.p95Ms > 0)) return { maxLevel, firstFailLevel: level, reason: 'denominatorZero' }

    const ratio = numeratorP95.p95Ms / denominatorP95.p95Ms
    const deltaMs = numeratorP95.p95Ms - denominatorP95.p95Ms
    const minDeltaMs =
      typeof budget.minDeltaMs === 'number' && Number.isFinite(budget.minDeltaMs) ? budget.minDeltaMs : 0
    const overBudget = ratio > budget.maxRatio && deltaMs > minDeltaMs

    if (!overBudget) {
      maxLevel = level
      continue
    }

    return { maxLevel, firstFailLevel: level, reason: 'budgetExceeded' }
  }

  return { maxLevel, firstFailLevel: null }
}

const computeRelativeRatioAt = (suiteSpec, suiteResult, budget, where, level) => {
  const primary = suiteSpec.primaryAxis
  const numeratorRef = parseRef(budget.numeratorRef)
  const denominatorRef = parseRef(budget.denominatorRef)
  const numeratorParams = { ...(where || {}), ...numeratorRef, [primary]: level }
  const denominatorParams = { ...(where || {}), ...denominatorRef, [primary]: level }

  const numeratorPoint = findPoint(suiteResult, numeratorParams)
  const denominatorPoint = findPoint(suiteResult, denominatorParams)
  if (!numeratorPoint) return { ok: false, reason: 'missingNumerator' }
  if (!denominatorPoint) return { ok: false, reason: 'missingDenominator' }

  const numeratorP95 = getMetricP95Ms(numeratorPoint, budget.metric)
  const denominatorP95 = getMetricP95Ms(denominatorPoint, budget.metric)
  if (!numeratorP95.ok) return { ok: false, reason: `numerator:${numeratorP95.reason}` }
  if (!denominatorP95.ok) return { ok: false, reason: `denominator:${denominatorP95.reason}` }
  if (!(denominatorP95.p95Ms > 0)) return { ok: false, reason: 'denominatorZero' }

  return {
    ok: true,
    numeratorP95Ms: numeratorP95.p95Ms,
    denominatorP95Ms: denominatorP95.p95Ms,
    ratio: numeratorP95.p95Ms / denominatorP95.p95Ms,
  }
}

const computeRelativeStatsAt = (suiteSpec, suiteResult, budget, where, level) => {
  const primary = suiteSpec.primaryAxis
  const numeratorRef = parseRef(budget.numeratorRef)
  const denominatorRef = parseRef(budget.denominatorRef)
  const numeratorParams = { ...(where || {}), ...numeratorRef, [primary]: level }
  const denominatorParams = { ...(where || {}), ...denominatorRef, [primary]: level }

  const numeratorPoint = findPoint(suiteResult, numeratorParams)
  const denominatorPoint = findPoint(suiteResult, denominatorParams)
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
    deltaP95Ms: numeratorStats.stats.p95Ms - denominatorStats.stats.p95Ms,
    deltaMedianMs: numeratorStats.stats.medianMs - denominatorStats.stats.medianMs,
    ratioP95: numeratorStats.stats.p95Ms / denominatorStats.stats.p95Ms,
    ratioMedian: numeratorStats.stats.medianMs / denominatorStats.stats.medianMs,
    minDeltaMs: getRelativeMinDeltaMs(budget),
  }
}

const computeAbsoluteStatsAt = (suiteSpec, suiteResult, budget, where, level) => {
  const primary = suiteSpec.primaryAxis
  const params = { ...(where || {}), [primary]: level }
  const point = findPoint(suiteResult, params)
  if (!point) return { ok: false, reason: 'missingPoint' }
  const stats = getMetricStatsMs(point, budget.metric)
  if (!stats.ok) return { ok: false, reason: stats.reason }
  return {
    ok: true,
    n: stats.stats.n,
    medianMs: stats.stats.medianMs,
    p95Ms: stats.stats.p95Ms,
  }
}
const renderList = (title, items) => {
  if (!Array.isArray(items) || items.length === 0) return ''
  const shown = items.slice(0, 10)
  let out = `\n**${title}**\n`
  for (const x of shown) out += `- ${code(x)}\n`
  if (items.length > shown.length) out += `- ... +${items.length - shown.length} more\n`
  return out
}

const explainWarning = (w) => {
  const s = String(w || '')
  if (s.startsWith('git.dirty.before=')) return `${s} (before report was collected from a dirty working tree)`
  if (s.startsWith('git.dirty.after=')) return `${s} (after report was collected from a dirty working tree)`
  if (s.startsWith('git.commit:')) return s
  return s
}

let md = ''
md += `### logix-perf (quick)\n`
md += `- scope: ${code(scope)}\n`
md += `- profile: ${code(profile)}\n`
if (envId) md += `- envId: ${code(envId)}\n`
if (baseShort && headShort) md += `- base: ${code(baseShort)}  head: ${code(headShort)}\n`
if (baseRef && headRef) md += `- refs: ${code(baseRef)} -> ${code(headRef)}\n`
if (artifactName) md += `- artifacts: ${code(artifactName)}\n`

md += `\n### What do \`maxLevel\` and \`null\` mean?\n`
md += `- \`maxLevel\` is the highest primary-axis level that still satisfies a budget.\n`
md += `- Example (primary axis = \`steps\`):\n`
md += `  - \`maxLevel=2000\`: budget passes at \`steps=200\`, \`800\`, and \`2000\`.\n`
md += `  - \`maxLevel=800\`: budget passes at \`steps=200\` and \`800\`, but fails at \`steps=2000\`.\n`
md += `  - \`maxLevel=null\`: budget fails already at the first tested level (e.g. \`steps=200\`).\n`

md += `\n### What do \`steps\` and \`dirtyRootsRatio\` mean?\n`
md += `- \`steps\` is the primary axis for this suite: it controls the size of the converge state (more steps = more roots/fields).\n`
md += `- \`dirtyRootsRatio\` controls how many roots/fields are patched per transaction: \`dirtyRoots = max(1, ceil(steps * dirtyRootsRatio))\`.\n`
md += `- Metrics are evaluated on the p95 statistic (\`n = runs - warmupDiscard\`; tail-only failures are often noise unless reproducible).\n`
if (!diff) {
  md += `\n### Diff\n`
  md += `_Diff file not found. Collect or diff step may have failed. Check the Actions logs._\n`
} else {
  const summary = diff.summary ?? {}
  const comparability = diff.meta?.comparability ?? {}
  const comparable = comparability.comparable === true

  md += `\n### Comparability\n`
  md += `- comparable: ${code(String(comparability.comparable ?? '?'))}\n`
  md += `- diffMode: allowConfigDrift=${String(comparability.allowConfigDrift ?? '?')}, allowEnvDrift=${String(comparability.allowEnvDrift ?? '?')}\n`
  md += renderList('configMismatches', comparability.configMismatches)
  md += renderList('envMismatches', comparability.envMismatches)

  if (Array.isArray(comparability.warnings) && comparability.warnings.length > 0) {
    md += `\n**warnings**\n`
    for (const w of comparability.warnings) md += `- ${code(explainWarning(w))}\n`
  }

  md += `\n### Automated interpretation\n`
  md += `- regressions: ${code(summary.regressions ?? '?')}\n`
  md += `- improvements: ${code(summary.improvements ?? '?')}\n`
  if (summary && summary.slices) {
    const s = summary.slices
    md += `- thresholdSlices: compared=${code(s.compared ?? '?')}, afterOnly=${code(s.afterOnly ?? '?')}, beforeOnly=${code(s.beforeOnly ?? '?')}, skippedData=${code(s.skippedData ?? '?')}, total=${code(s.total ?? '?')}\n`
  }
  if (!comparable) {
    md += `\n_Triage-only diff: before/after are not strictly comparable. Treat deltas as hints, not conclusions._\n`
  }

  const matrixPath = '.codex/skills/logix-perf-evidence/assets/matrix.json'
  const matrix = fs.existsSync(matrixPath) ? safeReadJson(matrixPath) : null
  const suiteSpecById = new Map()
  if (matrix && Array.isArray(matrix.suites)) {
    for (const s of matrix.suites) suiteSpecById.set(s.id, s)
  }

  const beforeSuiteById = new Map(
    beforeReport && Array.isArray(beforeReport.suites) ? beforeReport.suites.map((s) => [s.id, s]) : [],
  )
  const afterSuiteById = new Map(
    afterReport && Array.isArray(afterReport.suites) ? afterReport.suites.map((s) => [s.id, s]) : [],
  )

  // Head-only budget status: show current head failures even when base is not comparable.
  if (afterReport && suiteSpecById.size > 0) {
    const headFailures = []
    const headDataIssues = []
    const headBudgetSummaries = []
    const headBudgetMaps = []

    const fmtNum = (n, digits = 4) =>
      typeof n === 'number' && Number.isFinite(n) ? n.toFixed(digits) : 'n/a'
    const fmtMs = (n) => (typeof n === 'number' && Number.isFinite(n) ? n.toFixed(3) : 'n/a')

    for (const [suiteId, afterSuite] of afterSuiteById.entries()) {
      const spec = suiteSpecById.get(suiteId)
      if (!spec || !afterSuite) continue

      const axisLevels = spec.axes?.[spec.primaryAxis] ?? []
      const maxAxis = axisLevels.length > 0 ? axisLevels[axisLevels.length - 1] : null
      if (maxAxis == null) continue

      const priority = spec.priority ? `[${spec.priority}] ` : ''
      const title = spec.title ? ` — ${spec.title}` : ''
      const suiteLabel = `${priority}\`${suiteId}\`${title}`

      const thresholds = Array.isArray(afterSuite.thresholds) ? afterSuite.thresholds : []
      const budgetsById = new Map()

      for (const t of thresholds) {
        const budget = t?.budget
        if (!budget) continue

        const id = budgetKey(budget)
        const agg =
          budgetsById.get(id) ??
          (() => {
            const x = {
              budget,
              total: 0,
              budgetExceeded: 0,
              dataIssues: 0,
              notApplicable: 0,
              maxLevelCounts: new Map(),
            }
            budgetsById.set(id, x)
            return x
          })()

        agg.total += 1
        const maxLevelKey = t.maxLevel == null ? 'null' : String(t.maxLevel)
        agg.maxLevelCounts.set(maxLevelKey, (agg.maxLevelCounts.get(maxLevelKey) ?? 0) + 1)

        if (t.reason === 'budgetExceeded') {
          agg.budgetExceeded += 1
        } else if (t.reason === 'notApplicable') {
          agg.notApplicable += 1
        } else if (t.reason) {
          agg.dataIssues += 1
          headDataIssues.push({
            suiteLabel,
            budget,
            whereKey: stableParamsKey(t.where),
            maxLevel: t.maxLevel ?? null,
            firstFailLevel: t.firstFailLevel ?? null,
            reason: t.reason,
          })
        }

        if (t.reason !== 'budgetExceeded') continue

        const where = t.where && typeof t.where === 'object' ? t.where : {}
        const whereKey = stableParamsKey(where)
        const maxLevel = t.maxLevel ?? null
        const firstFailLevel = t.firstFailLevel ?? (axisLevels[0] ?? null)

        let classification = 'unknown'
        let overshoot = null
        let detail = ''

        if (budget.type === 'relative') {
          const at = firstFailLevel != null ? computeRelativeStatsAt(spec, afterSuite, budget, where, firstFailLevel) : { ok: false }
          if (at.ok) {
            const p95Over = isRelativeBudgetExceeded(budget, at.ratioP95, at.deltaP95Ms)
            const medianOver = isRelativeBudgetExceeded(budget, at.ratioMedian, at.deltaMedianMs)
            classification = medianOver ? 'systemic' : p95Over ? 'tail-only' : 'unknown'
            overshoot = at.ratioP95 - budget.maxRatio
            const minDeltaNote = at.minDeltaMs > 0 ? `, minDeltaMs=${fmtMs(at.minDeltaMs)}ms` : ''
            detail =
              `p95 ratio=${fmtNum(at.ratioP95)} (auto/full=${fmtMs(at.numeratorP95Ms)}/${fmtMs(at.denominatorP95Ms)} ms, Δ=${fmtMs(at.deltaP95Ms)}ms), ` +
              `median ratio=${fmtNum(at.ratioMedian)} (auto/full=${fmtMs(at.numeratorMedianMs)}/${fmtMs(at.denominatorMedianMs)} ms, Δ=${fmtMs(at.deltaMedianMs)}ms), ` +
              `n=${code(at.n)}${minDeltaNote}`
          } else {
            detail = `p95 ratio=n/a (${at.reason || 'unknown'})`
          }
        } else {
          const at = firstFailLevel != null ? computeAbsoluteStatsAt(spec, afterSuite, budget, where, firstFailLevel) : { ok: false }
          if (at.ok) {
            const p95Over = at.p95Ms > budget.p95Ms
            const medianOver = at.medianMs > budget.p95Ms
            classification = medianOver ? 'systemic' : p95Over ? 'tail-only' : 'unknown'
            overshoot = at.p95Ms - budget.p95Ms
            detail =
              `p95=${fmtMs(at.p95Ms)}ms (budget<=${fmtMs(budget.p95Ms)}ms), ` +
              `median=${fmtMs(at.medianMs)}ms, n=${code(at.n)}`
          } else {
            detail = `p95=n/a (${at.reason || 'unknown'})`
          }
        }

        headFailures.push({
          suiteLabel,
          suiteId,
          primaryAxis: spec.primaryAxis,
          budget,
          where,
          whereKey,
          maxLevel,
          firstFailLevel,
          overshoot,
          classification,
          detail,
        })
      }

      for (const [budgetId, agg] of budgetsById.entries()) {
        if (agg.budgetExceeded === 0 && agg.dataIssues === 0 && agg.notApplicable === 0) continue
        const counts = Array.from(agg.maxLevelCounts.entries())
          .sort((a, b) => {
            const aNull = a[0] === 'null'
            const bNull = b[0] === 'null'
            if (aNull !== bNull) return aNull ? 1 : -1
            const aNum = Number(a[0])
            const bNum = Number(b[0])
            if (Number.isFinite(aNum) && Number.isFinite(bNum)) return bNum - aNum
            return String(a[0]).localeCompare(String(b[0]))
          })
          .map(([k, v]) => `${k}×${v}`)
          .join(', ')

        headBudgetSummaries.push(
          `- ${suiteLabel}: ${code(budgetId)} failing=${code(`${agg.budgetExceeded}/${agg.total}`)}, dataIssues=${code(
            `${agg.dataIssues}/${agg.total}`,
          )}, notApplicable=${code(`${agg.notApplicable}/${agg.total}`)}, maxLevel=${code(counts)}`,
        )
      }
      // If this suite has a single "where axis" (e.g. dirtyRootsRatio), render a compact head-only map
      // so readers can see exactly which primary-axis level starts failing.
      const beforeSuite = beforeSuiteById.get(suiteId)
      const axisCoverageLines = []
      if (beforeSuite) {
        for (const axisKey of Object.keys(spec.axes || {})) {
          const beforeVals = uniqValuesFromPoints(beforeSuite, axisKey)
          const afterVals = uniqValuesFromPoints(afterSuite, axisKey)
          if (beforeVals.length === 0 && afterVals.length === 0) continue
          if (beforeVals.length === afterVals.length && beforeVals.every((v, i) => v === afterVals[i])) continue
          axisCoverageLines.push(
            `- ${code(suiteId)} ${code(axisKey)}: base(${beforeVals.length})=${code(
              formatAxisValues(beforeVals),
            )}, head(${afterVals.length})=${code(formatAxisValues(afterVals))}`,
          )
        }
      }

      const budgets =
        (Array.isArray(spec.budgets) && spec.budgets.length > 0
          ? spec.budgets
          : Array.isArray(afterSuite.budgets) && afterSuite.budgets.length > 0
            ? afterSuite.budgets
            : []) || []

      for (const budget of budgets) {
        if (!budget || budget.type !== 'relative') continue
        if (!Array.isArray(axisLevels) || axisLevels.length === 0) continue
        const chartLevels = pickChartLevels(axisLevels)
        if (chartLevels.length === 0) continue
        if (typeof budget.maxRatio !== 'number') continue

        const refAxes = Array.from(
          new Set([
            ...Object.keys(parseRef(budget.numeratorRef)),
            ...Object.keys(parseRef(budget.denominatorRef)),
          ]),
        )
        const otherAxes = Object.keys(spec.axes || {}).filter((k) => k !== spec.primaryAxis && !refAxes.includes(k))
        if (otherAxes.length !== 1) continue

        const xAxisKey = otherAxes[0]
        const xAxisLevels = Array.isArray(spec.axes?.[xAxisKey]) ? spec.axes[xAxisKey] : []
        if (xAxisLevels.length <= 1 || xAxisLevels.length > 32) continue

        const fmtSeries = (values) => values.filter(Boolean).join(', ')

        const rows = []
        for (const x of xAxisLevels) {
          const where = { [xAxisKey]: x }
          const afterRes = computeThresholdMaxLevelRelative(spec, afterSuite, budget, where)
          if (afterRes.reason && afterRes.reason !== 'budgetExceeded' && afterRes.reason !== undefined) {
            continue
          }

          const series = []
          const seriesLevels = axisLevels.length <= 10 ? axisLevels : chartLevels
          for (const level of seriesLevels) {
            const at = computeRelativeStatsAt(spec, afterSuite, budget, where, level)
            if (!at.ok) {
              series.push(`${String(level)}=n/a`)
              continue
            }
            const over = isRelativeBudgetExceeded(budget, at.ratioP95, at.deltaP95Ms) ? '!' : ''
            series.push(`${String(level)}=${fmtNum(at.ratioP95)}${over}`)
          }

          const failLevel = afterRes.firstFailLevel
          let classification = '-'
          let failDetail = '-'
          if (failLevel != null) {
            const at = computeRelativeStatsAt(spec, afterSuite, budget, where, failLevel)
            if (at.ok) {
              const medianOver = isRelativeBudgetExceeded(budget, at.ratioMedian, at.deltaMedianMs)
              classification = medianOver ? 'systemic' : 'tail-only'
              const minDeltaMs = getRelativeMinDeltaMs(budget)
              const minDeltaNote = minDeltaMs > 0 ? `, minDeltaMs=${fmtMs(minDeltaMs)}ms` : ''
              failDetail = `p95=${fmtNum(at.ratioP95)} (auto/full=${fmtMs(at.numeratorP95Ms)}/${fmtMs(
                at.denominatorP95Ms,
              )} ms, Δ=${fmtMs(at.deltaP95Ms)}ms), median=${fmtNum(at.ratioMedian)} (Δ=${fmtMs(
                at.deltaMedianMs,
              )}ms), n=${String(at.n)}${minDeltaNote}`
            }
          }

          rows.push({
            x,
            maxLevel: afterRes.maxLevel,
            firstFail: afterRes.firstFailLevel,
            series: fmtSeries(series),
            classification,
            failDetail,
          })
        }

        if (rows.length === 0) continue

        headBudgetMaps.push({
          suiteLabel,
          suiteId,
          primaryAxis: spec.primaryAxis,
          axisCoverageLines,
          budget,
          xAxisKey,
          axisLevels,
          rows,
        })
      }
    }

    md += `\n### Head budget status (quick warning)\n`
    md += `_Based on head-only thresholds (not a diff). Useful even when comparable=false._\n\n`
    md += `- headBudgetFailures: ${code(headFailures.length)} (reason=budgetExceeded)\n`
    md += `- headDataIssues: ${code(headDataIssues.length)} (missing/timeout/etc)\n`
    md += `- classification: ${code('tail-only')} = p95 over budget but median within; ${code('systemic')} = median also over\n`
    md += `\n_Tip: quick profile still has limited samples vs default; tail-only failures are often noise unless reproducible._\n`

    if (headBudgetSummaries.length > 0) {
      md += `\n**Failing budgets (head-only)**\n`
      for (const line of headBudgetSummaries.sort()) md += `${line}\n`
    }

    if (headFailures.length > 0) {
      const sorted = headFailures
        .slice()
        .sort((a, b) => {
          const aRel = a.budget?.type === 'relative'
          const bRel = b.budget?.type === 'relative'
          if (aRel !== bRel) return aRel ? -1 : 1
          const aOver = typeof a.overshoot === 'number' && Number.isFinite(a.overshoot) ? a.overshoot : -Infinity
          const bOver = typeof b.overshoot === 'number' && Number.isFinite(b.overshoot) ? b.overshoot : -Infinity
          return bOver - aOver
        })

      md += `\n**Top head failures**\n`
      const shown = sorted.slice(0, 10)
      for (const f of shown) {
        const primaryAxis = f.primaryAxis || 'steps'
        md += `- ${f.suiteLabel}: ${code(budgetKey(f.budget))} ${code(f.whereKey)}\n`
        md += `  - after: maxLevel=${code(
          f.maxLevel == null ? 'null' : String(f.maxLevel),
        )} firstFail=${code(
          f.firstFailLevel == null ? 'null' : `${primaryAxis}=${String(f.firstFailLevel)}`,
        )} classification=${code(f.classification)}\n`
        md += `  - ${f.detail}\n`
        if (f.budget?.type === 'relative' && f.firstFailLevel != null) {
          const spec = suiteSpecById.get(f.suiteId)
          const afterSuite = afterSuiteById.get(f.suiteId)
          const where = f.where && typeof f.where === 'object' ? f.where : {}

          if (spec && afterSuite) {
            const level = f.firstFailLevel
            const numeratorRef = parseRef(f.budget.numeratorRef)
            const denominatorRef = parseRef(f.budget.denominatorRef)

            const numeratorParams = { ...where, ...numeratorRef, [spec.primaryAxis]: level }
            const denominatorParams = { ...where, ...denominatorRef, [spec.primaryAxis]: level }

            const numeratorPoint = findPoint(afterSuite, numeratorParams)
            const denominatorPoint = findPoint(afterSuite, denominatorParams)

            const renderEv = (label, p) => {
              const mode = getEvidenceValue(p, 'converge.executedMode')
              const executedSteps = getEvidenceValue(p, 'converge.executedSteps')
              const affectedSteps = getEvidenceValue(p, 'converge.affectedSteps')
              const reasons = getEvidenceValue(p, 'converge.reasons')

              const parts = []
              if (mode.ok) parts.push(`executedMode=${code(mode.value)}`)
              if (executedSteps.ok) parts.push(`executedSteps=${code(executedSteps.value)}`)
              if (affectedSteps.ok) parts.push(`affectedSteps=${code(affectedSteps.value)}`)
              if (reasons.ok) parts.push(`reasons=${code(reasons.value)}`)

              if (parts.length === 0) return null
              return `${label}: ${parts.join(' ')}`
            }

            const autoLine = renderEv('auto', numeratorPoint)
            const fullLine = renderEv('full', denominatorPoint)
            if (autoLine || fullLine) {
              if (autoLine) md += `  - ${autoLine}\n`
              if (fullLine) md += `  - ${fullLine}\n`
            }
          }
        }
      }

      if (sorted.length > shown.length) {
        md += `\n<details>\n<summary>All head failures (${sorted.length})</summary>\n\n`
        for (const f of sorted) {
          const primaryAxis = f.primaryAxis || 'steps'
          md += `- ${f.suiteLabel}: ${code(budgetKey(f.budget))} ${code(f.whereKey)} maxLevel=${code(
            f.maxLevel == null ? 'null' : String(f.maxLevel),
          )} firstFail=${code(
            f.firstFailLevel == null ? 'null' : `${primaryAxis}=${String(f.firstFailLevel)}`,
          )} ${code(f.classification)}\n`
        }
        md += `\n</details>\n`
      }
    }
    if (headBudgetMaps.length > 0) {
      md += `\n<details>\n<summary>Head maps (where -> maxLevel / firstFail / p95 series)</summary>\n\n`
      md += `_Each row shows which primary-axis level starts failing for that ${code('where')} slice. ` +
        `Levels are the discrete test levels (e.g. steps=200/800/2000)._ \n\n`

      for (const m of headBudgetMaps) {
        md += `**${m.suiteLabel} — ${code(budgetKey(m.budget))}**\n`
        md += `- where axis: ${code(m.xAxisKey)} (${m.rows.length} rows)\n`
        md += `- primaryAxis: ${code(m.primaryAxis)} (levels=${code(formatAxisValues(m.axisLevels))})\n`
        if (Array.isArray(m.axisCoverageLines) && m.axisCoverageLines.length > 0) {
          md += `\n_Axis coverage (base vs head)_\n`
          for (const line of m.axisCoverageLines) md += `${line}\n`
        }

        md += `\n| ${m.xAxisKey} | maxLevel | firstFail | classification | p95 ratio series | fail detail |\n`
        md += `| --- | --- | --- | --- | --- | --- |\n`
        for (const r of m.rows) {
          const maxLevel = r.maxLevel == null ? 'null' : String(r.maxLevel)
          const firstFail = r.firstFail == null ? '-' : `${m.primaryAxis}=${String(r.firstFail)}`
          md += `| ${String(r.x)} | ${maxLevel} | ${firstFail} | ${r.classification} | ${r.series} | ${r.failDetail} |\n`
        }
        md += `\n`
      }

      md += `</details>\n`
    }
  }

  const suites = Array.isArray(diff.suites) ? diff.suites : []
  if (summary && summary.slices && (summary.slices.afterOnly > 0 || summary.slices.beforeOnly > 0)) {
    const driftLines = []

    const formatValues = (values) => formatAxisValues(values)

    for (const s of suites) {
      const suiteId = s?.id
      if (!suiteId) continue
      const spec = suiteSpecById.get(suiteId)
      const beforeSuite = beforeSuiteById.get(suiteId)
      const afterSuite = afterSuiteById.get(suiteId)
      if (!spec || !beforeSuite || !afterSuite) continue

      for (const axisKey of Object.keys(spec.axes || {})) {
        const beforeVals = uniqValuesFromPoints(beforeSuite, axisKey)
        const afterVals = uniqValuesFromPoints(afterSuite, axisKey)
        const beforeSet = new Set(beforeVals)
        const afterSet = new Set(afterVals)

        const added = afterVals.filter((v) => !beforeSet.has(v))
        const removed = beforeVals.filter((v) => !afterSet.has(v))
        if (added.length === 0 && removed.length === 0) continue

        driftLines.push(
          `- ${code(suiteId)} ${code(axisKey)}: base(${code(beforeVals.length)})=${code(
            formatValues(beforeVals),
          )} head(${code(afterVals.length)})=${code(formatValues(afterVals))} +${code(formatValues(added))} -${code(
            formatValues(removed),
          )}`,
        )
      }
    }

    if (driftLines.length > 0) {
      md += `\n### Coverage drift (axes values)\n`
      md += `_New/removed axis values in head vs base; not counted as regressions/improvements._\n\n`
      md += `${driftLines.join('\n')}\n`
    }
  }
  const regressive = []
  const progressive = []
  const notes = []

  for (const s of suites) {
    const spec = suiteSpecById.get(s.id)
    const priority = spec?.priority ? `[${spec.priority}] ` : ''
    const title = spec?.title ? ` — ${spec.title}` : ''
    const suiteLabel = `${priority}\`${s.id}\`${title}`

    if (typeof s.notes === 'string' && s.notes.trim().length > 0) {
      notes.push(`- ${suiteLabel}: ${s.notes}`)
    }

    const deltas = Array.isArray(s.thresholdDeltas) ? s.thresholdDeltas : []
    const levels = spec?.primaryAxis && spec?.axes ? spec.axes[spec.primaryAxis] : null
    const idx = (v) => {
      if (!Array.isArray(levels)) return null
      if (v === null || v === undefined) return -1
      const i = levels.indexOf(v)
      return i >= 0 ? i : null
    }

    for (const t of deltas) {
      const before = t.beforeMaxLevel ?? null
      const after = t.afterMaxLevel ?? null
      const beforeIdx = idx(before)
      const afterIdx = idx(after)
      const delta = beforeIdx == null || afterIdx == null ? null : afterIdx - beforeIdx
      const entry = { suiteLabel, delta, threshold: t }
      if (delta != null && delta < 0) regressive.push(entry)
      if (delta != null && delta > 0) progressive.push(entry)
    }
  }

  const renderThresholdDelta = (entry) => {
    const suiteId = entry.threshold?.suiteId ?? null
    const suiteLabel = entry.suiteLabel ?? '`unknown`'
    const t = entry.threshold
    const budget = t?.budget
    const where = t?.where ?? {}
    const spec = suiteSpecById.get(String(t?.budget?.suiteId ?? '')) ?? null
    const suiteSpec = suiteSpecById.get(suiteLabel.replace(/`/g, '')) ?? null

    const suiteIdFromLabel = String((suiteLabel.match(/`([^`]+)`/) || [])[1] || '')
    const spec2 = suiteSpecById.get(suiteIdFromLabel)
    const suiteSpecResolved = spec2 || null

    if (!suiteSpecResolved) {
      return `- ${suiteLabel}: ${t?.message ?? 'unknown delta'}`
    }

    const beforeSuite = beforeSuiteById.get(suiteIdFromLabel)
    const afterSuite = afterSuiteById.get(suiteIdFromLabel)
    const primary = suiteSpecResolved.primaryAxis
    const axisLevels = suiteSpecResolved.axes?.[primary] ?? []

    const refAxes =
      budget?.type === 'relative'
        ? Array.from(
            new Set([
              ...Object.keys(parseRef(budget.numeratorRef)),
              ...Object.keys(parseRef(budget.denominatorRef)),
            ]),
          )
        : []

    const otherAxes = Object.keys(suiteSpecResolved.axes || {}).filter((k) => k !== primary && !refAxes.includes(k))
    const whereKey = stableParamsKey(where)

    const describe = (side, res) => {
      if (!axisLevels.length) return `${side}: maxLevel=${String(res.maxLevel)}`
      const first = axisLevels[0]
      const failAt = res.firstFailLevel == null ? 'pass' : `${primary}=${String(res.firstFailLevel)}`
      const max = res.maxLevel == null ? 'null' : String(res.maxLevel)
      const reason = res.reason ? `, reason=${res.reason}` : ''
      const extra =
        res.maxLevel == null
          ? ` (fails at ${primary}=${String(first)}${reason})`
          : res.firstFailLevel == null
            ? ` (passes all levels${reason})`
            : ` (fails at ${failAt}${reason})`
      return `${side}: maxLevel=${max}${extra}`
    }

    let beforeRes = { maxLevel: t?.beforeMaxLevel ?? null, firstFailLevel: null, reason: undefined }
    let afterRes = { maxLevel: t?.afterMaxLevel ?? null, firstFailLevel: null, reason: undefined }

    if (beforeSuite && budget) {
      beforeRes =
        budget.type === 'absolute'
          ? computeThresholdMaxLevelAbsolute(suiteSpecResolved, beforeSuite, budget, where)
          : computeThresholdMaxLevelRelative(suiteSpecResolved, beforeSuite, budget, where)
    }
    if (afterSuite && budget) {
      afterRes =
        budget.type === 'absolute'
          ? computeThresholdMaxLevelAbsolute(suiteSpecResolved, afterSuite, budget, where)
          : computeThresholdMaxLevelRelative(suiteSpecResolved, afterSuite, budget, where)
    }

    let extra = ''
    if (
      budget &&
      budget.type === 'relative' &&
      beforeSuite &&
      afterSuite &&
      Array.isArray(axisLevels) &&
      axisLevels.length > 0 &&
      typeof budget.maxRatio === 'number'
    ) {
      const fmtRatio = (n) => (typeof n === 'number' && Number.isFinite(n) ? n.toFixed(4) : 'n/a')
      const fmtMs = (n) => (typeof n === 'number' && Number.isFinite(n) ? n.toFixed(3) : 'n/a')

      const first = axisLevels[0]
      const mid = axisLevels[Math.floor(axisLevels.length / 2)]
      const last = axisLevels[axisLevels.length - 1]
      const levelsToShow = Array.from(new Set([first, mid, last]))

      const series = []
      for (const level of levelsToShow) {
        const b = computeRelativeStatsAt(suiteSpecResolved, beforeSuite, budget, where, level)
        const a = computeRelativeStatsAt(suiteSpecResolved, afterSuite, budget, where, level)
        if (!b.ok || !a.ok) continue
        const over = isRelativeBudgetExceeded(budget, a.ratioP95, a.deltaP95Ms) ? ' (over)' : ''
        series.push(`${primary}=${String(level)}: ${fmtRatio(b.ratioP95)}→${fmtRatio(a.ratioP95)}${over}`)
      }
      if (series.length > 0) {
        extra += `\n  - p95 ratio series (auto/full): ${series.join(', ')}`
      }

      const delta = entry.delta ?? 0
      const focus = delta < 0 ? { side: 'after', res: afterRes, suite: afterSuite } : { side: 'before', res: beforeRes, suite: beforeSuite }
      const failLevel = focus.res?.firstFailLevel
      if (failLevel != null) {
        const at = computeRelativeStatsAt(suiteSpecResolved, focus.suite, budget, where, failLevel)
        if (at.ok) {
          const over = isRelativeBudgetExceeded(budget, at.ratioP95, at.deltaP95Ms) ? ' (over)' : ''
          const minDeltaNote = at.minDeltaMs > 0 ? `, minDeltaMs=${fmtMs(at.minDeltaMs)}ms` : ''
          extra += `\n  - ${focus.side} fail @ ${primary}=${String(failLevel)}: p95 ratio=${fmtRatio(at.ratioP95)}${over} (auto/full=${fmtMs(at.numeratorP95Ms)}/${fmtMs(at.denominatorP95Ms)} ms, Δ=${fmtMs(at.deltaP95Ms)}ms), median ratio=${fmtRatio(at.ratioMedian)} (auto/full=${fmtMs(at.numeratorMedianMs)}/${fmtMs(at.denominatorMedianMs)} ms, Δ=${fmtMs(at.deltaMedianMs)}ms), n=${code(at.n)}${minDeltaNote}`
        }
      }
    }

    return `- ${suiteLabel}: ${code(budgetKey(budget))} ${code(whereKey)}\n  - ${describe('before', beforeRes)}\n  - ${describe('after', afterRes)}${extra}`
  }

  if (regressive.length > 0) {
    md += `\n### Top regressions\n`
    const shown = regressive
      .slice()
      .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))
      .slice(0, 10)
    for (const r of shown) md += `${renderThresholdDelta(r)}\n`
  }

  if (progressive.length > 0) {
    md += `\n### Top improvements\n`
    const shown = progressive
      .slice()
      .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))
      .slice(0, 10)
    for (const r of shown) md += `${renderThresholdDelta(r)}\n`
  }

  if (notes.length > 0) {
    md += `\n### Notes\n${notes.join('\n')}\n`
  }

  // Detailed budget analysis (uses matrix + before/after reports).
  if (beforeReport && afterReport && suiteSpecById.size > 0) {
    const suiteIds = Array.from(
      new Set(
        []
          .concat(beforeReport.suites?.map((s) => s.id) || [])
          .concat(afterReport.suites?.map((s) => s.id) || []),
      ),
    ).sort()

    md += `\n### Budget details (computed from points)\n`

    for (const suiteId of suiteIds) {
      const spec = suiteSpecById.get(suiteId)
      const beforeSuite = beforeSuiteById.get(suiteId)
      const afterSuite = afterSuiteById.get(suiteId)
      if (!spec || !beforeSuite || !afterSuite) continue

      const primary = spec.primaryAxis
      const axisLevels = spec.axes?.[primary] ?? []
      const maxAxis = axisLevels.length > 0 ? axisLevels[axisLevels.length - 1] : null
      const priority = spec.priority ? `[${spec.priority}] ` : ''
      const title = spec.title ? ` — ${spec.title}` : ''

      md += `\n#### ${priority}\`${suiteId}\`${title}\n`
      if (maxAxis != null) md += `- primaryAxis: ${code(primary)} (max=${code(maxAxis)})\n`

      const budgets =
        (Array.isArray(spec.budgets) && spec.budgets.length > 0
          ? spec.budgets
          : Array.isArray(beforeSuite.budgets) && beforeSuite.budgets.length > 0
            ? beforeSuite.budgets
            : afterSuite.budgets) || []

      const relativeBudgets = budgets.filter((b) => b && b.type === 'relative')
      if (relativeBudgets.length === 0) {
        md += `- No relative budgets found for detailed ratio view.\n`
        continue
      }

      for (const budget of relativeBudgets) {
        const refAxes = Array.from(
          new Set([
            ...Object.keys(parseRef(budget.numeratorRef)),
            ...Object.keys(parseRef(budget.denominatorRef)),
          ]),
        )
        const otherAxes = Object.keys(spec.axes || {}).filter((k) => k !== primary && !refAxes.includes(k))
        const otherAxisLevels = otherAxes.map((k) => spec.axes?.[k] ?? [])
        const whereCombos = cartesian(otherAxisLevels).map((values) => {
          const where = {}
          for (let i = 0; i < otherAxes.length; i++) where[otherAxes[i]] = values[i]
          return where
        })

        md += `\n**Budget: ${code(budgetKey(budget))}**\n`
        md += `- metric: ${code(budget.metric)}\n`
        md += `- maxRatio: ${code(budget.maxRatio)}\n`
        {
          const minDeltaMs = getRelativeMinDeltaMs(budget)
          if (minDeltaMs > 0) md += `- minDeltaMs: ${code(`${String(minDeltaMs)}ms`)}\n`
        }
        md += `- numeratorRef: ${code(budget.numeratorRef)}\n`
        md += `- denominatorRef: ${code(budget.denominatorRef)}\n`

        if (!axisLevels.length || maxAxis == null) {
          md += `_Missing axis levels for this suite; cannot compute thresholds._\n`
          continue
        }

        const rows = []
        for (const where of whereCombos) {
          const beforeRes = computeThresholdMaxLevelRelative(spec, beforeSuite, budget, where)
          const afterRes = computeThresholdMaxLevelRelative(spec, afterSuite, budget, where)
          const beforeLevel = beforeRes.firstFailLevel ?? maxAxis
          const afterLevel = afterRes.firstFailLevel ?? maxAxis

          const beforeRatio = computeRelativeRatioAt(spec, beforeSuite, budget, where, beforeLevel)
          const afterRatio = computeRelativeRatioAt(spec, afterSuite, budget, where, afterLevel)
          const beforeRatioValue = beforeRatio.ok && Number.isFinite(beforeRatio.ratio) ? beforeRatio.ratio : null
          const afterRatioValue = afterRatio.ok && Number.isFinite(afterRatio.ratio) ? afterRatio.ratio : null

          const fmtRatio = (r, level) => {
            if (!r.ok) return `n/a (${r.reason})`
            const ratio = Number.isFinite(r.ratio) ? r.ratio.toFixed(4) : String(r.ratio)
            const num = Number.isFinite(r.numeratorP95Ms) ? r.numeratorP95Ms.toFixed(3) : String(r.numeratorP95Ms)
            const den = Number.isFinite(r.denominatorP95Ms) ? r.denominatorP95Ms.toFixed(3) : String(r.denominatorP95Ms)
            return `${ratio} (${num}/${den} ms) @ ${primary}=${String(level)}`
          }

          const whereStr =
            otherAxes.length === 0
              ? '{}'
              : otherAxes.map((k) => `${k}=${String(where[k])}`).join(', ')

          rows.push({
            whereStr,
            before: beforeRes,
            after: afterRes,
            beforeRatio: fmtRatio(beforeRatio, beforeLevel),
            afterRatio: fmtRatio(afterRatio, afterLevel),
            beforeRatioValue,
            afterRatioValue,
          })
        }

        const isComparableThreshold = (t) => t && (!t.reason || t.reason === 'budgetExceeded')
        const comparableRows = rows.filter((r) => isComparableThreshold(r.before) && isComparableThreshold(r.after))
        const skippedRows = rows.length - comparableRows.length

        if (skippedRows > 0) {
          md += `\n_Skipped ${skippedRows}/${rows.length} rows due to missing/incomplete base/head data (e.g. matrix drift)._ \n`
        }

        if (comparableRows.length === 0) {
          md += `_No comparable rows for this budget._\n`
          continue
        }

        // Render a compact table for comparable rows only.
        const maxRows = 24
        const shownRows =
          comparableRows.length <= maxRows
            ? comparableRows
            : comparableRows
                .slice()
                .sort((a, b) => {
                  const aFailed = a.after?.firstFailLevel != null
                  const bFailed = b.after?.firstFailLevel != null
                  if (aFailed !== bFailed) return aFailed ? -1 : 1

                  const aExceed =
                    typeof a.afterRatioValue === 'number' ? a.afterRatioValue - (budget.maxRatio ?? 0) : Number.NEGATIVE_INFINITY
                  const bExceed =
                    typeof b.afterRatioValue === 'number' ? b.afterRatioValue - (budget.maxRatio ?? 0) : Number.NEGATIVE_INFINITY
                  if (aExceed !== bExceed) return bExceed - aExceed

                  const aRatio = typeof a.afterRatioValue === 'number' ? a.afterRatioValue : Number.NEGATIVE_INFINITY
                  const bRatio = typeof b.afterRatioValue === 'number' ? b.afterRatioValue : Number.NEGATIVE_INFINITY
                  if (aRatio !== bRatio) return bRatio - aRatio

                  return String(a.whereStr).localeCompare(String(b.whereStr))
                })
                .slice(0, maxRows)

        md += `\n| where | before maxLevel | after maxLevel | before ratio | after ratio |\n`
        md += `| --- | --- | --- | --- | --- |\n`
        for (const r of shownRows) {
          const b = r.before
          const a = r.after
          const bMax = b.maxLevel == null ? 'null' : String(b.maxLevel)
          const aMax = a.maxLevel == null ? 'null' : String(a.maxLevel)
          md += `| ${r.whereStr} | ${bMax} | ${aMax} | ${r.beforeRatio} | ${r.afterRatio} |\n`
        }

        if (comparableRows.length > shownRows.length) {
          md += `\n_Showing ${shownRows.length}/${comparableRows.length} comparable rows (matrix too large for full table)._ \n`
        }

        const canChart =
          otherAxes.length === 1 &&
          axisLevels.length > 0 &&
          Array.isArray(spec.axes?.[otherAxes[0]]) &&
          (spec.axes[otherAxes[0]] ?? []).length > 1 &&
          (spec.axes[otherAxes[0]] ?? []).length <= 32

        if (canChart) {
          const chartLevels = pickChartLevels(axisLevels)
          if (chartLevels.length === 0) continue
          const xAxisKey = otherAxes[0]
          const xAxisLevels = (spec.axes?.[xAxisKey] ?? []).slice()
          md += `\n<details>\n<summary>Charts: p95 ratio across ${code(xAxisKey)}</summary>\n\n`
          md += `Bars: base(before) vs head(after). Line: budget maxRatio=${code(budget.maxRatio)}.\n\n`

          const fmtNum = (n) => {
            if (typeof n !== 'number' || !Number.isFinite(n)) return null
            return Number(n.toFixed(4))
          }

          for (const level of chartLevels) {
            const xs = []
            const beforeBars = []
            const afterBars = []

            for (const x of xAxisLevels) {
              const where = { [xAxisKey]: x }
              const beforeAt = computeRelativeRatioAt(spec, beforeSuite, budget, where, level)
              const afterAt = computeRelativeRatioAt(spec, afterSuite, budget, where, level)

              const b = beforeAt.ok ? fmtNum(beforeAt.ratio) : null
              const a = afterAt.ok ? fmtNum(afterAt.ratio) : null
              if (b == null || a == null) continue

              xs.push(x)
              beforeBars.push(b)
              afterBars.push(a)
            }

            if (xs.length < 2) continue

            const all = [...beforeBars, ...afterBars, budget.maxRatio].filter(
              (n) => typeof n === 'number' && Number.isFinite(n),
            )
            const min = Math.min(...all)
            const max = Math.max(...all)
            const pad = Math.max(0.05, (max - min) * 0.1)
            const yMin = Math.max(0, min - pad)
            const yMax = max + pad

            const title = `${suiteId} ${budgetKey(budget)} @ ${primary}=${String(level)}`
            const xLabels = xs.map((v) => JSON.stringify(String(v))).join(', ')
            const threshold = fmtNum(budget.maxRatio) ?? budget.maxRatio

            md += `\n\`\`\`mermaid\n`
            md += `xychart-beta\n`
            md += `    title ${JSON.stringify(title)}\n`
            md += `    x-axis [${xLabels}]\n`
            md += `    y-axis ${JSON.stringify('ratio')} ${fmtNum(yMin) ?? yMin} --> ${fmtNum(yMax) ?? yMax}\n`
            md += `    bar [${beforeBars.join(', ')}]\n`
            md += `    bar [${afterBars.join(', ')}]\n`
            md += `    line [${xs.map(() => threshold).join(', ')}]\n`
            md += `\`\`\`\n`
          }

          md += `\n</details>\n`
        }
      }
    }
  }
}

if (files.length > 0) {
  md += `\n### Artifacts (files inside the uploaded artifact)\n`
  for (const f of files) md += `- ${code(f)}\n`
}

const summaryPath = path.join(perfDir, 'summary.md')
fs.writeFileSync(summaryPath, `${md}\n`, 'utf8')
const stepSummaryPath = process.env.GITHUB_STEP_SUMMARY
if (stepSummaryPath && stepSummaryPath.trim()) {
  fs.appendFileSync(stepSummaryPath, `${md}\n`)
}
