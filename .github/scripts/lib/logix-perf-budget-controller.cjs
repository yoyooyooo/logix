const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const detectBudgetZone = ({ remainingRatio }) => {
  const ratio = clamp(Number(remainingRatio) || 0, 0, 1)
  if (ratio > 0.4) return 'green'
  if (ratio > 0.25) return 'yellow'
  if (ratio > 0.15) return 'orange'
  return 'red'
}

const nextSampleTarget = ({ zone, samplesPerIteration, minSamplesPerIteration }) => {
  const maxSamples = Math.max(1, Math.floor(Number(samplesPerIteration) || 1))
  const minSamples = Math.max(1, Math.floor(Number(minSamplesPerIteration) || 1))
  if (zone === 'green') return maxSamples
  if (zone === 'yellow') return Math.max(minSamples, maxSamples - 1)
  return minSamples
}

const createBudgetController = ({
  nowMs = () => Date.now(),
  timeBudgetMinutes,
  reserveMinutes = 5,
  maxTotalCollects,
  minCollectEstimateSeconds = 45,
}) => {
  const totalBudgetMs = Math.max(1, Math.floor(Number(timeBudgetMinutes) * 60_000))
  const reserveMs = Math.max(0, Math.floor(Number(reserveMinutes) * 60_000))
  const maxCollects = Math.max(1, Math.floor(Number(maxTotalCollects)))
  const minCollectEstimateMs = Math.max(1_000, Math.floor(Number(minCollectEstimateSeconds) * 1_000))
  const startedAtMs = nowMs()
  const collectDurationsMs = []
  const events = [
    {
      type: 'budget.init',
      atMs: startedAtMs,
      timeBudgetMinutes,
      reserveMinutes,
      maxTotalCollects,
      minCollectEstimateSeconds,
    },
  ]
  let totalCollects = 0

  const elapsedMs = () => Math.max(0, nowMs() - startedAtMs)
  const remainingMs = () => Math.max(0, totalBudgetMs - elapsedMs())
  const effectiveRemainingMs = () => Math.max(0, remainingMs() - reserveMs)

  const estimateCollectMs = () => {
    if (collectDurationsMs.length === 0) return minCollectEstimateMs
    const last = collectDurationsMs[collectDurationsMs.length - 1] ?? minCollectEstimateMs
    const avg = collectDurationsMs.reduce((acc, value) => acc + value, 0) / collectDurationsMs.length
    return Math.max(minCollectEstimateMs, Math.floor(last * 0.6 + avg * 0.4))
  }

  const snapshot = () => {
    const rem = remainingMs()
    const effectiveRem = effectiveRemainingMs()
    const ratio = totalBudgetMs > 0 ? effectiveRem / totalBudgetMs : 0
    return {
      startedAtMs,
      elapsedMs: elapsedMs(),
      remainingMs: rem,
      effectiveRemainingMs: effectiveRem,
      reserveMs,
      totalBudgetMs,
      remainingRatio: clamp(ratio, 0, 1),
      zone: detectBudgetZone({ remainingRatio: ratio }),
      totalCollects,
      maxCollects,
      collectsRemaining: Math.max(0, maxCollects - totalCollects),
      estimatedCollectMs: estimateCollectMs(),
    }
  }

  const canRunCollect = ({ expectedCollectMs } = {}) => {
    if (totalCollects >= maxCollects) {
      const reason = 'collect_budget_limit'
      events.push({ type: 'budget.reject', atMs: nowMs(), reason })
      return { ok: false, reasonCode: reason, snapshot: snapshot() }
    }
    const expectedMs = Math.max(1_000, Math.floor(Number(expectedCollectMs) || estimateCollectMs()))
    if (effectiveRemainingMs() < expectedMs) {
      const reason = 'time_budget_reserve'
      events.push({ type: 'budget.reject', atMs: nowMs(), reason, expectedMs, effectiveRemainingMs: effectiveRemainingMs() })
      return { ok: false, reasonCode: reason, snapshot: snapshot() }
    }
    return { ok: true, reasonCode: null, snapshot: snapshot(), expectedCollectMs: expectedMs }
  }

  const recordCollect = ({ durationMs }) => {
    const duration = Math.max(0, Math.floor(Number(durationMs) || 0))
    totalCollects += 1
    collectDurationsMs.push(duration)
    events.push({
      type: 'budget.collect',
      atMs: nowMs(),
      totalCollects,
      durationMs: duration,
      estimatedCollectMs: estimateCollectMs(),
    })
    return snapshot()
  }

  return {
    snapshot,
    canRunCollect,
    recordCollect,
    events,
  }
}

module.exports = {
  createBudgetController,
  detectBudgetZone,
  nextSampleTarget,
}
