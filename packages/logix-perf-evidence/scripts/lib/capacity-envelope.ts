export type Primitive = string | number | boolean

export type ThresholdLike = {
  readonly budget?: {
    readonly id?: string
  }
  readonly where?: Record<string, Primitive>
  readonly maxLevel?: Primitive | null
  readonly firstFailLevel?: Primitive | null
  readonly reason?: string
}

export type CapacityEnvelopeInput = {
  readonly suiteId: string
  readonly budgetId: string
  readonly scope?: Record<string, Primitive>
  readonly stepsLevels: ReadonlyArray<number>
  readonly thresholds: ReadonlyArray<ThresholdLike>
}

export type CapacityEnvelopeRow = {
  readonly dirtyRootsRatio: number
  readonly maxLevel: number
  readonly firstFailLevel: Primitive | null
  readonly reason?: string
}

export type CapacityEnvelopeOutput = {
  readonly suiteId: string
  readonly budgetId: string
  readonly envelope: ReadonlyArray<CapacityEnvelopeRow>
  readonly summary: {
    readonly floorMaxLevel: number
    readonly p50MaxLevel: number
    readonly p90MaxLevel: number
    readonly maxObservedLevel: number
    readonly areaUnderCurveNormalized: number
    readonly bottlenecks: ReadonlyArray<{ readonly dirtyRootsRatio: number; readonly maxLevel: number }>
  }
}

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

const quantileCeil = (sortedValues: ReadonlyArray<number>, q: number): number => {
  if (sortedValues.length === 0) return 0
  const clampedQ = Math.max(0, Math.min(1, q))
  const index = Math.ceil(clampedQ * (sortedValues.length - 1))
  return sortedValues[index] ?? sortedValues[sortedValues.length - 1] ?? 0
}

const equalsScope = (where: Record<string, Primitive> | undefined, scope: Record<string, Primitive>): boolean =>
  Object.keys(scope).every((key) => where?.[key] === scope[key])

const toNumericLevel = (level: Primitive | null | undefined): number =>
  typeof level === 'number' && Number.isFinite(level) ? level : 0

const computeAreaUnderCurveNormalized = (rows: ReadonlyArray<CapacityEnvelopeRow>, maxObservedLevel: number): number => {
  if (rows.length === 0 || maxObservedLevel <= 0) return 0

  const points: Array<{ x: number; y: number }> = rows
    .filter((row) => row.dirtyRootsRatio >= 0 && row.dirtyRootsRatio <= 1)
    .map((row) => ({
      x: row.dirtyRootsRatio,
      y: Math.max(0, Math.min(1, row.maxLevel / maxObservedLevel)),
    }))
    .sort((a, b) => a.x - b.x)

  if (points.length === 0) return 0

  if (points[0]!.x > 0) {
    points.unshift({ x: 0, y: points[0]!.y })
  }
  if (points[points.length - 1]!.x < 1) {
    points.push({ x: 1, y: points[points.length - 1]!.y })
  }

  let area = 0
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1]!
    const current = points[index]!
    const width = current.x - prev.x
    area += width * ((prev.y + current.y) / 2)
  }

  return area
}

export const parseStepsLevelsOverride = (raw: string | undefined): ReadonlyArray<number> | undefined => {
  if (raw == null) return undefined
  const trimmed = raw.trim()
  if (trimmed.length === 0) return undefined

  const values = trimmed.split(',').map((part) => part.trim())
  const parsed: number[] = []

  for (const part of values) {
    if (!part) continue
    if (!/^[0-9]+$/.test(part)) {
      throw new Error(`Invalid steps level: ${part}`)
    }
    const numberValue = Number(part)
    if (!Number.isFinite(numberValue) || numberValue <= 0) {
      throw new Error(`Invalid steps level: ${part}`)
    }
    parsed.push(numberValue)
  }

  if (parsed.length === 0) return undefined
  return Array.from(new Set(parsed)).sort((a, b) => a - b)
}

export const buildCapacityEnvelope = (input: CapacityEnvelopeInput): CapacityEnvelopeOutput => {
  const scope = input.scope ?? {}
  const maxObservedLevel = input.stepsLevels.length > 0 ? Math.max(...input.stepsLevels) : 0

  const envelope = input.thresholds
    .reduce<CapacityEnvelopeRow[]>((rows, threshold) => {
      if (threshold.budget?.id !== input.budgetId) return rows
      if (!equalsScope(threshold.where, scope)) return rows

      const dirtyRootsRatioRaw = threshold.where?.dirtyRootsRatio
      if (!isFiniteNumber(dirtyRootsRatioRaw)) return rows

      rows.push({
        dirtyRootsRatio: dirtyRootsRatioRaw,
        maxLevel: toNumericLevel(threshold.maxLevel),
        firstFailLevel: threshold.firstFailLevel ?? null,
        reason: threshold.reason,
      })
      return rows
    }, [])
    .sort((a, b) => a.dirtyRootsRatio - b.dirtyRootsRatio)

  const maxLevels = envelope.map((row) => row.maxLevel).sort((a, b) => a - b)
  const floorMaxLevel = maxLevels.length > 0 ? maxLevels[0]! : 0
  const p50MaxLevel = quantileCeil(maxLevels, 0.5)
  const p90MaxLevel = quantileCeil(maxLevels, 0.9)

  const bottlenecks = envelope
    .map((row) => ({ dirtyRootsRatio: row.dirtyRootsRatio, maxLevel: row.maxLevel }))
    .sort((a, b) => {
      if (a.maxLevel !== b.maxLevel) return a.maxLevel - b.maxLevel
      return b.dirtyRootsRatio - a.dirtyRootsRatio
    })
    .slice(0, 3)

  return {
    suiteId: input.suiteId,
    budgetId: input.budgetId,
    envelope,
    summary: {
      floorMaxLevel,
      p50MaxLevel,
      p90MaxLevel,
      maxObservedLevel,
      areaUnderCurveNormalized: computeAreaUnderCurveNormalized(envelope, maxObservedLevel),
      bottlenecks,
    },
  }
}
