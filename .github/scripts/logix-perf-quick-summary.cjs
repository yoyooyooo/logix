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
    if (ratio <= budget.maxRatio) {
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
  md += `- budgetViolations: ${code(summary.budgetViolations ?? '?')}\n`
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

  const suites = Array.isArray(diff.suites) ? diff.suites : []
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

    return `- ${suiteLabel}: ${code(budgetKey(budget))} ${code(whereKey)}\n  - ${describe('before', beforeRes)}\n  - ${describe('after', afterRes)}`
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

        // Render a compact table for small matrices; otherwise show worst rows only.
        const maxRows = 24
        const shownRows =
          rows.length <= maxRows
            ? rows
            : rows
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

        if (rows.length > shownRows.length) {
          md += `\n_Showing ${shownRows.length}/${rows.length} rows (matrix too large for full table)._ \n`
        }

        const canChart =
          otherAxes.length === 1 &&
          axisLevels.length > 0 &&
          axisLevels.length <= 6 &&
          Array.isArray(spec.axes?.[otherAxes[0]]) &&
          (spec.axes[otherAxes[0]] ?? []).length > 1 &&
          (spec.axes[otherAxes[0]] ?? []).length <= 32

        if (canChart) {
          const xAxisKey = otherAxes[0]
          const xAxisLevels = (spec.axes?.[xAxisKey] ?? []).slice()
          md += `\n<details>\n<summary>Charts: p95 ratio across ${code(xAxisKey)}</summary>\n\n`
          md += `Bars: base(before) vs head(after). Line: budget maxRatio=${code(budget.maxRatio)}.\n\n`

          const fmtNum = (n) => {
            if (typeof n !== 'number' || !Number.isFinite(n)) return null
            return Number(n.toFixed(4))
          }

          for (const level of axisLevels) {
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
