import fs from 'node:fs'

const [beforePath, afterPath] = process.argv.slice(2)
const before = JSON.parse(fs.readFileSync(beforePath, 'utf8'))
const after = JSON.parse(fs.readFileSync(afterPath, 'utf8'))

const makePointKey = (suiteId, params) => `${suiteId}::${JSON.stringify(params)}`
const beforeMap = new Map()
for (const suite of before.suites) {
  for (const point of suite.points) {
    beforeMap.set(makePointKey(suite.id, point.params), point)
  }
}

const rows = []
for (const suite of after.suites) {
  for (const point of suite.points) {
    const prev = beforeMap.get(makePointKey(suite.id, point.params))
    if (!prev) continue
    for (const metric of point.metrics) {
      if (metric.status !== 'ok') continue
      const prevMetric = prev.metrics.find((m) => m.name === metric.name && m.status === 'ok')
      if (!prevMetric) continue
      const beforeP95 = prevMetric.stats?.p95Ms
      const afterP95 = metric.stats?.p95Ms
      if (beforeP95 == null || afterP95 == null) continue
      const delta = afterP95 - beforeP95
      rows.push({
        suiteId: suite.id,
        metric: metric.name,
        params: point.params,
        beforeP95,
        afterP95,
        delta,
      })
    }
  }
}

rows.sort((a, b) => b.delta - a.delta)
console.log(JSON.stringify(rows, null, 2))
