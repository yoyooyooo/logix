import * as Logix from '@logixjs/core'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'

export type RowIdStoreLike = {
  readonly getRowId: (listPath: string, index: number) => string | undefined
  readonly getIndex?: (listPath: string, rowId: string) => number | undefined
  readonly ensureList?: (listPath: string, items: ReadonlyArray<unknown>, trackBy?: string) => ReadonlyArray<string>
  readonly resetList?: (listPath: string, parentRowId?: string) => void
}

type ListConfigLike = {
  readonly path: string
  readonly trackBy?: string
}

export const makeCleanupSubjectRef = (path: string) => ({
  kind: 'cleanup' as const,
  id: path,
})

export const getRowIdStore = (runtime: unknown): RowIdStoreLike | undefined => {
  if (!runtime || (typeof runtime !== 'object' && typeof runtime !== 'function')) {
    return undefined
  }
  const store = FieldContracts.getRowIdStore(runtime as any)
  if (!store || typeof store !== 'object') return undefined
  const getRowId = (store as Record<string, unknown>).getRowId
  if (typeof getRowId !== 'function') return undefined
  return store as RowIdStoreLike
}

export const getTrackByForListPath = (runtime: unknown, listPath: string): string | undefined => {
  if (!runtime || (typeof runtime !== 'object' && typeof runtime !== 'function')) {
    return undefined
  }
  const configs = FieldContracts.getFieldListConfigs(runtime as any)
  if (!Array.isArray(configs)) return undefined

  for (const cfg of configs as ReadonlyArray<unknown>) {
    if (!cfg || typeof cfg !== 'object') continue
    const typed = cfg as ListConfigLike
    if (typed.path !== listPath) continue
    if (typeof typed.trackBy === 'string' && typed.trackBy.length > 0) {
      return typed.trackBy
    }
  }

  return undefined
}

const readTrackBy = (item: unknown, trackBy: string): unknown => {
  if (!item || typeof item !== 'object') return undefined
  const segments = trackBy.split('.')
  let current: any = item
  for (const seg of segments) {
    if (current == null) return undefined
    current = current[seg as any]
  }
  return current
}

export const getFieldArrayItemId = (params: {
  readonly listPath: string
  readonly item: unknown
  readonly index: number
  readonly trackBy?: string
  readonly rowIds?: ReadonlyArray<string>
  readonly rowIdStore?: RowIdStoreLike
}): string => {
  const k = params.trackBy !== undefined ? readTrackBy(params.item, params.trackBy) : undefined
  if (k !== undefined) return String(k)

  const fromStore = params.rowIds?.[params.index] ?? params.rowIdStore?.getRowId(params.listPath, params.index)
  if (typeof fromStore === 'string' && fromStore.length > 0) return fromStore

  return String(params.index)
}
