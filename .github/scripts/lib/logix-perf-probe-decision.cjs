const decideProbeAction = ({
  summary,
  iteration,
  maxIterations,
  maxLevel,
  secondLevel,
  maxLevelCap,
  minIterationsBeforeEarlyStop,
  targetFloorMin,
  initialTopLevel,
  topEnvelopeStable,
  boundaryObserved,
  topTimeoutCount,
  topSaturationRatio = 0.95,
  minTopHeadroom = 400,
}) => {
  const floorMedian = Number(summary?.floorMedianMaxLevel) || 0
  const p90Median = Number(summary?.p90MedianMaxLevel) || 0
  const p95Median = Number(summary?.p95MedianMaxLevel) || 0
  const averageUpper = Number(summary?.averageUpperLimit) || 0
  const dirtyRootsRatioCount = Number(summary?.dirtyRootsRatioCount) || 0
  const targetFloor = Math.max(0, Number(targetFloorMin) || 0)
  const earlyStopEligible = iteration >= Math.max(1, Number(minIterationsBeforeEarlyStop) || 1)
  const topBand = Math.max(secondLevel, Math.max(0, Math.floor(maxLevel * Number(topSaturationRatio || 0.95))))
  const nearTopByHeadroom = maxLevel > 0 && (maxLevel - p95Median) <= Math.max(0, Number(minTopHeadroom) || 0)
  const topSaturated = p95Median >= topBand || nearTopByHeadroom || averageUpper >= topBand
  const targetFloorSatisfied = targetFloor > 0 && floorMedian >= targetFloor
  const expansionFloor = initialTopLevel > 0 ? Math.ceil((initialTopLevel * 1.5) / 100) * 100 : 0
  const expandedEnough = expansionFloor <= 0 || maxLevel >= expansionFloor

  let shouldExtend = false
  let decision = 'envelope_converged'

  if (iteration >= maxIterations) {
    decision = 'max_iterations_reached'
  } else if (maxLevel >= maxLevelCap) {
    decision = 'max_level_cap_reached'
  } else if (dirtyRootsRatioCount === 0) {
    decision = 'missing_thresholds'
  } else if (topSaturated && topTimeoutCount <= 0) {
    shouldExtend = true
    decision = 'top_saturated_extend'
  } else if (floorMedian >= secondLevel) {
    shouldExtend = true
    decision = 'floor_near_top_band'
  } else if (averageUpper >= secondLevel) {
    shouldExtend = true
    decision = 'average_near_top_band'
  } else if (p95Median >= secondLevel) {
    shouldExtend = true
    decision = 'p95_near_top_band'
  } else if (p90Median >= secondLevel) {
    shouldExtend = true
    decision = 'p90_near_top_band'
  }

  if (
    decision !== 'max_iterations_reached' &&
    decision !== 'max_level_cap_reached' &&
    decision !== 'missing_thresholds' &&
    earlyStopEligible &&
    targetFloorSatisfied &&
    topEnvelopeStable &&
    expandedEnough &&
    boundaryObserved &&
    !topSaturated
  ) {
    decision = 'target_floor_stable_enough'
    shouldExtend = false
  }

  return {
    shouldExtend,
    decision,
    topSaturated,
    topBand,
    targetFloorSatisfied,
    earlyStopEligible,
    expansionFloor,
    expandedEnough,
  }
}

module.exports = {
  decideProbeAction,
}
