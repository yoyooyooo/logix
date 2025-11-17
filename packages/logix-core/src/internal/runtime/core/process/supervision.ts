import type { ProcessErrorPolicy } from './protocol.js'

export type SupervisionDecision = 'stop' | 'restart'

export type SupervisionState = {
  readonly failureTimes: ReadonlyArray<number>
}

export const initialState = (): SupervisionState => ({ failureTimes: [] })

export type FailureDecision = {
  readonly decision: SupervisionDecision
  readonly nextState: SupervisionState
  readonly withinWindowFailures: number
  readonly maxRestarts: number
  readonly windowMs?: number
}

export const onFailure = (policy: ProcessErrorPolicy, state: SupervisionState, nowMs: number): FailureDecision => {
  if (policy.mode === 'failStop') {
    return {
      decision: 'stop',
      nextState: state,
      withinWindowFailures: state.failureTimes.length,
      maxRestarts: 0,
      windowMs: policy.windowMs,
    }
  }

  const maxRestartsRaw = policy.maxRestarts
  const maxRestarts =
    typeof maxRestartsRaw === 'number' && Number.isFinite(maxRestartsRaw) && maxRestartsRaw >= 0
      ? Math.floor(maxRestartsRaw)
      : 0

  if (maxRestarts <= 0) {
    return {
      decision: 'stop',
      nextState: state,
      withinWindowFailures: state.failureTimes.length,
      maxRestarts,
      windowMs: policy.windowMs,
    }
  }

  const windowMsRaw = policy.windowMs
  const windowMs =
    typeof windowMsRaw === 'number' && Number.isFinite(windowMsRaw) && windowMsRaw > 0
      ? Math.floor(windowMsRaw)
      : undefined

  const failureTimesRaw = [...state.failureTimes, nowMs]
  const failureTimes = windowMs ? failureTimesRaw.filter((t) => t >= nowMs - windowMs) : failureTimesRaw

  // Keep at most maxRestarts+1 timestamps to avoid unbounded growth.
  const cap = maxRestarts + 1
  const capped = failureTimes.length > cap ? failureTimes.slice(failureTimes.length - cap) : failureTimes

  const withinWindowFailures = capped.length
  const decision: SupervisionDecision = withinWindowFailures <= maxRestarts ? 'restart' : 'stop'

  return {
    decision,
    nextState: { failureTimes: capped },
    withinWindowFailures,
    maxRestarts,
    windowMs,
  }
}
