export type ReasonTrajectoryPoint = {
  readonly attemptSeq: number
  readonly reasonCode: string
}

const isPositiveInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 1

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

const parseReasonCode = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

const normalizeReasonTrajectoryInternal = (
  points: ReadonlyArray<ReasonTrajectoryPoint>,
  fallback: ReasonTrajectoryPoint,
): ReadonlyArray<ReasonTrajectoryPoint> => {
  const sorted = Array.from(points).sort((a, b) => a.attemptSeq - b.attemptSeq)
  const deduped = new Map<number, ReasonTrajectoryPoint>()
  for (const point of sorted) {
    deduped.set(point.attemptSeq, point)
  }

  deduped.set(fallback.attemptSeq, fallback)
  return Array.from(deduped.values()).sort((a, b) => a.attemptSeq - b.attemptSeq)
}

export const normalizeReasonTrajectory = (args: {
  readonly points: ReadonlyArray<ReasonTrajectoryPoint>
  readonly fallback: ReasonTrajectoryPoint
}): ReadonlyArray<ReasonTrajectoryPoint> => normalizeReasonTrajectoryInternal(args.points, args.fallback)

export const normalizeReasonTrajectoryFromUnknown = (args: {
  readonly trajectory: unknown
  readonly fallback: ReasonTrajectoryPoint
}): ReadonlyArray<ReasonTrajectoryPoint> => {
  if (!Array.isArray(args.trajectory)) {
    return normalizeReasonTrajectoryInternal([], args.fallback)
  }

  const points: ReasonTrajectoryPoint[] = []
  for (const entry of args.trajectory) {
    if (!isRecord(entry)) continue
    if (!isPositiveInteger(entry.attemptSeq)) continue
    const reasonCode = parseReasonCode(entry.reasonCode)
    if (!reasonCode) continue
    points.push({
      attemptSeq: entry.attemptSeq,
      reasonCode,
    })
  }

  return normalizeReasonTrajectoryInternal(points, args.fallback)
}

export const buildVerifyLoopReasonTrajectory = (args: {
  readonly mode: 'run' | 'resume'
  readonly currentAttemptSeq: number
  readonly currentReasonCode: string
  readonly previousAttemptSeq?: number
  readonly retryTrajectory?: ReadonlyArray<{
    readonly attemptSeq: number
  }>
}): ReadonlyArray<ReasonTrajectoryPoint> => {
  const points: ReasonTrajectoryPoint[] = []

  if (Array.isArray(args.retryTrajectory)) {
    for (const point of args.retryTrajectory) {
      if (!isPositiveInteger(point.attemptSeq)) continue
      points.push({
        attemptSeq: point.attemptSeq,
        reasonCode: args.currentReasonCode,
      })
    }
  }

  if (args.mode === 'resume' && isPositiveInteger(args.previousAttemptSeq)) {
    points.push({
      attemptSeq: args.previousAttemptSeq,
      reasonCode: args.currentReasonCode,
    })
  }

  points.push({
    attemptSeq: args.currentAttemptSeq,
    reasonCode: args.currentReasonCode,
  })

  return normalizeReasonTrajectoryInternal(points, {
    attemptSeq: args.currentAttemptSeq,
    reasonCode: args.currentReasonCode,
  })
}
