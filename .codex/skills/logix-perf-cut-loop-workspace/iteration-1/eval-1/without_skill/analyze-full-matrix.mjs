import fs from 'node:fs'

const [beforePath, afterPath] = process.argv.slice(2)
if (!afterPath) {
  console.error('usage: node analyze-full-matrix.mjs <before.json> <after.json>')
  process.exit(1)
}

const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))
const before = beforePath ? read(beforePath) : null
const after = read(afterPath)

const getMetric = (point, metricName) => point.metrics.find((m) => m.name === metricName)
const getP95 = (point, metricName) => {
  const metric = getMetric(point, metricName)
  if (!metric || metric.status !== 'ok') return null
  return metric.stats?.p95Ms ?? null
}
const normalizeParams = (params, omitKeys = []) =>
  Object.entries(params)
    .filter(([k]) => !omitKeys.includes(k))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')
const parseRef = (ref) => {
  const [key, rawValue] = String(ref).split('=')
  if (!key) return null
  let value = rawValue
  if (value === 'true') value = true
  else if (value === 'false') value = false
  else if (value != null && value !== '' && !Number.isNaN(Number(value))) value = Number(value)
  return { key, value }
}

const beforeSuitesById = before ? new Map(before.suites.map((suite) => [suite.id, suite])) : new Map()

const summary = []
for (const suite of after.suites) {
  const primaryAxis = suite.primaryAxis
  const beforeSuite = beforeSuitesById.get(suite.id)
  const suiteSummary = {
    id: suite.id,
    title: suite.title,
    primaryAxis,
    budgets: [],
  }

  for (const budget of suite.budgets ?? []) {
    const item = {
      id: budget.id,
      type: budget.type,
      metric: budget.metric,
      passes: [],
      fails: [],
      unavailable: [],
      changed: [],
    }

    if (budget.type === 'absolute') {
      for (const point of suite.points) {
        const p95 = getP95(point, budget.metric)
        const axisValue = point.params[primaryAxis]
        const label = normalizeParams(point.params, [primaryAxis])
        if (p95 == null) {
          item.unavailable.push({ axisValue, label, status: getMetric(point, budget.metric)?.status ?? 'missing' })
          continue
        }
        const pass = p95 <= budget.p95Ms
        ;(pass ? item.passes : item.fails).push({ axisValue, label, p95, budget: budget.p95Ms })
        if (beforeSuite) {
          const beforePoint = beforeSuite.points.find((candidate) => JSON.stringify(candidate.params) === JSON.stringify(point.params))
          const beforeP95 = beforePoint ? getP95(beforePoint, budget.metric) : null
          if (beforeP95 != null) {
            const delta = p95 - beforeP95
            if (Math.abs(delta) >= 1) {
              item.changed.push({ axisValue, label, beforeP95, afterP95: p95, delta })
            }
          }
        }
      }
    } else if (budget.type === 'relative') {
      const numRef = parseRef(budget.numeratorRef)
      const denRef = parseRef(budget.denominatorRef)
      for (const point of suite.points) {
        if (!numRef || point.params[numRef.key] !== numRef.value) continue
        const baselineParams = { ...point.params }
        baselineParams[denRef.key] = denRef.value
        const other = suite.points.find((candidate) => JSON.stringify(candidate.params) === JSON.stringify(baselineParams))
        const numerator = getP95(point, budget.metric)
        const denominator = other ? getP95(other, budget.metric) : null
        const axisValue = point.params[primaryAxis]
        const label = normalizeParams(point.params, [primaryAxis, numRef.key])
        if (numerator == null || denominator == null) {
          item.unavailable.push({ axisValue, label, status: 'missingPair' })
          continue
        }
        const ratio = denominator === 0 ? null : numerator / denominator
        const delta = numerator - denominator
        const pass = ratio != null && (ratio <= budget.maxRatio || Math.abs(delta) < (budget.minDeltaMs ?? 0))
        ;(pass ? item.passes : item.fails).push({ axisValue, label, numerator, denominator, ratio, maxRatio: budget.maxRatio, delta, minDeltaMs: budget.minDeltaMs ?? 0 })
        if (beforeSuite) {
          const beforeNum = beforeSuite.points.find((candidate) => JSON.stringify(candidate.params) === JSON.stringify(point.params))
          const beforeDen = beforeSuite.points.find((candidate) => JSON.stringify(candidate.params) === JSON.stringify(baselineParams))
          const beforeNumerator = beforeNum ? getP95(beforeNum, budget.metric) : null
          const beforeDenominator = beforeDen ? getP95(beforeDen, budget.metric) : null
          if (beforeNumerator != null && beforeDenominator != null) {
            const beforeRatio = beforeDenominator === 0 ? null : beforeNumerator / beforeDenominator
            if (beforeRatio != null && ratio != null && Math.abs(ratio - beforeRatio) >= 0.05) {
              item.changed.push({ axisValue, label, beforeRatio, afterRatio: ratio, beforeNumerator, beforeDenominator, afterNumerator: numerator, afterDenominator: denominator })
            }
          }
        }
      }
    }

    item.passes.sort((a, b) => Number(a.axisValue) - Number(b.axisValue) || String(a.label).localeCompare(String(b.label)))
    item.fails.sort((a, b) => Number(a.axisValue) - Number(b.axisValue) || String(a.label).localeCompare(String(b.label)))
    suiteSummary.budgets.push(item)
  }

  summary.push(suiteSummary)
}

console.log(JSON.stringify({ before: before?.meta, after: after.meta, suites: summary }, null, 2))
