import { createHash } from 'node:crypto'

import { normalizeAdversarialAxes, stableAdversarialJson } from './adversarial-axis.js'

export type AdversarialCellIdInput = Readonly<{
  readonly hotPath: string
  readonly axes?: Record<string, unknown>
  readonly suiteId?: string
  readonly metric?: string
}>

export type AdversarialMatrixHashInput = Readonly<{
  readonly matrixId: string
  readonly profile?: string
  readonly requiredHotPaths?: ReadonlyArray<string>
  readonly cells?: ReadonlyArray<AdversarialCellIdInput & { readonly cellId?: string }>
}>

export const sha256Hex = (value: string): string => createHash('sha256').update(value).digest('hex')

const normalizeToken = (value: string): string => value.trim().replace(/[^A-Za-z0-9_.:-]+/g, '_') || 'unknown'

export const makeAdversarialCellId = (input: AdversarialCellIdInput): string => {
  const hotPath = normalizeToken(input.hotPath)
  const axes = normalizeAdversarialAxes(input.axes)
  const payload = stableAdversarialJson({ axes, metric: input.metric ?? '', suiteId: input.suiteId ?? '' })
  return `${hotPath}::${sha256Hex(payload).slice(0, 16)}`
}

export const makeAdversarialMatrixHash = (input: AdversarialMatrixHashInput): string => {
  const cells = (input.cells ?? [])
    .map((cell) => ({
      cellId: cell.cellId ?? makeAdversarialCellId(cell),
      hotPath: cell.hotPath,
      axes: normalizeAdversarialAxes(cell.axes),
      metric: cell.metric ?? '',
      suiteId: cell.suiteId ?? '',
    }))
    .sort((a, b) => a.cellId.localeCompare(b.cellId))

  const payload = stableAdversarialJson({
    matrixId: input.matrixId,
    profile: input.profile ?? '',
    requiredHotPaths: [...(input.requiredHotPaths ?? [])].sort(),
    cells,
  })

  return `sha256:${sha256Hex(payload)}`
}
