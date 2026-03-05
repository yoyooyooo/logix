import { createHash } from 'node:crypto'

export type Primitive = string | number | boolean

type PointLike = {
  readonly params: Record<string, Primitive | undefined>
}

type SuiteLike = {
  readonly id: string
  readonly points: ReadonlyArray<PointLike>
}

type ReportLike = {
  readonly suites: ReadonlyArray<SuiteLike>
}

type SuiteStepsDescriptor = {
  readonly suiteId: string
  readonly stepsLevels: ReadonlyArray<Primitive>
  readonly dirtyRootsRatioLevels: ReadonlyArray<Primitive>
  readonly convergeModes: ReadonlyArray<Primitive>
}

const comparePrimitive = (a: Primitive, b: Primitive): number => {
  const ta = typeof a
  const tb = typeof b
  if (ta !== tb) return ta < tb ? -1 : 1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)
  return String(a).localeCompare(String(b))
}

export const describeStepsGrid = (report: ReportLike): ReadonlyArray<SuiteStepsDescriptor> =>
  report.suites
    .map((suite) => {
      const stepsLevels = Array.from(
        new Set(
          suite.points
            .map((point) => point.params.steps)
            .filter((value): value is Primitive => value !== undefined),
        ),
      ).sort(comparePrimitive)
      const dirtyRootsRatioLevels = Array.from(
        new Set(
          suite.points
            .map((point) => point.params.dirtyRootsRatio)
            .filter((value): value is Primitive => value !== undefined),
        ),
      ).sort(comparePrimitive)
      const convergeModes = Array.from(
        new Set(
          suite.points
            .map((point) => point.params.convergeMode)
            .filter((value): value is Primitive => value !== undefined),
        ),
      ).sort(comparePrimitive)
      return { suiteId: suite.id, stepsLevels, dirtyRootsRatioLevels, convergeModes }
    })
    .sort((a, b) => a.suiteId.localeCompare(b.suiteId))

export const summarizeStepsGrid = (descriptor: ReadonlyArray<SuiteStepsDescriptor>): string =>
  descriptor
    .map(
      (entry) =>
        `${entry.suiteId}=[steps:${entry.stepsLevels.join(',')}|dirtyRootsRatio:${entry.dirtyRootsRatioLevels.join(',')}|convergeMode:${entry.convergeModes.join(',')}]`,
    )
    .join('; ')

export const computeStepsGridHash = (report: ReportLike): { readonly hash: string; readonly summary: string } => {
  const descriptor = describeStepsGrid(report)
  const text = JSON.stringify(descriptor)
  const hash = createHash('sha256').update(text).digest('hex')
  return { hash, summary: summarizeStepsGrid(descriptor) }
}

export const compareStepsGrid = (
  beforeReport: ReportLike,
  afterReport: ReportLike,
): {
  readonly matched: boolean
  readonly beforeHash: string
  readonly afterHash: string
  readonly beforeSummary: string
  readonly afterSummary: string
} => {
  const before = computeStepsGridHash(beforeReport)
  const after = computeStepsGridHash(afterReport)
  return {
    matched: before.hash === after.hash,
    beforeHash: before.hash,
    afterHash: after.hash,
    beforeSummary: before.summary,
    afterSummary: after.summary,
  }
}
