export type RowId = string

export interface ListConfig {
  readonly path: string
  readonly trackBy?: string
}

export type ListRemovalListener = (rowId: RowId) => void

type Segment = string | number

const parseSegments = (path: string): ReadonlyArray<Segment> => {
  if (!path) return []
  return path.split('.').map((seg) => (/^[0-9]+$/.test(seg) ? Number(seg) : seg))
}

export const getAtPath = (state: any, path: string): any => {
  if (!path || state == null) return state
  const segments = parseSegments(path)
  let current: any = state
  for (const seg of segments) {
    if (current == null) return undefined
    if (typeof seg === 'number') {
      current = Array.isArray(current) ? current[seg] : current[String(seg)]
      continue
    }
    current = current[seg]
  }
  return current
}

export const setAtPathMutating = (draft: unknown, path: string, value: unknown): void => {
  if (!path) return
  const segments = parseSegments(path)
  if (segments.length === 0) return

  let current: any = draft
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i]!
    const nextKey = segments[i + 1]!

    const next = current?.[key as any]
    if (next == null || typeof next !== 'object') {
      current[key as any] = typeof nextKey === 'number' ? [] : {}
    }
    current = current[key as any]
  }

  const last = segments[segments.length - 1]!
  current[last as any] = value
}

export const unsetAtPathMutating = (draft: unknown, path: string): void => {
  if (!path) return
  const segments = parseSegments(path)
  if (segments.length === 0) return

  let current: any = draft
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i]!
    const next = current?.[key as any]
    if (next == null || typeof next !== 'object') {
      return
    }
    current = next
  }

  const last = segments[segments.length - 1]!
  if (Array.isArray(current) && typeof last === 'number') {
    current[last] = undefined
    return
  }

  if (current && typeof current === 'object') {
    delete current[last as any]
  }
}

export const joinPath = (prefix: string, suffix: string): string => {
  if (!prefix) return suffix
  if (!suffix) return prefix
  return `${prefix}.${suffix}`
}

export interface ListItemFieldPath {
  readonly listPath: string
  readonly itemPath: string
}

/**
 * parseListItemFieldPath：
 * - Recognize a list.item field path like "items[].profileResource".
 * - Supports nested arrays: returns listPath/itemPath for the innermost list.
 */
export const parseListItemFieldPath = (fieldPath: string): ListItemFieldPath | undefined => {
  const raw = typeof fieldPath === 'string' ? fieldPath.trim() : ''
  if (!raw) return undefined

  const segments = raw.split('.').filter(Boolean)
  let lastListSeg = -1
  for (let i = 0; i < segments.length; i++) {
    if (segments[i]!.endsWith('[]')) lastListSeg = i
  }
  if (lastListSeg < 0) return undefined

  const strip = (seg: string): string => (seg.endsWith('[]') ? seg.slice(0, -2) : seg)

  const listPath = segments
    .slice(0, lastListSeg + 1)
    .map(strip)
    .join('.')

  const itemPath = segments
    .slice(lastListSeg + 1)
    .map(strip)
    .join('.')

  return { listPath, itemPath }
}

export const toListItemValuePath = (listPath: string, index: number, itemPath: string): string =>
  itemPath ? `${listPath}.${index}.${itemPath}` : `${listPath}.${index}`

type ListState = {
  readonly listPath: string
  readonly parentRowId?: RowId
  readonly itemsRef: ReadonlyArray<unknown>
  readonly ids: ReadonlyArray<RowId>
  readonly indexById: ReadonlyMap<RowId, number>
  readonly trackBy?: string
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

const didReorderByReference = (prevItems: ReadonlyArray<unknown>, nextItems: ReadonlyArray<unknown>): boolean => {
  const buckets = new Map<unknown, Array<number>>()
  for (let i = 0; i < prevItems.length; i++) {
    const item = prevItems[i]
    const list = buckets.get(item) ?? []
    list.push(i)
    buckets.set(item, list)
  }

  for (let nextIndex = 0; nextIndex < nextItems.length; nextIndex++) {
    const item = nextItems[nextIndex]
    const q = buckets.get(item)
    if (!q || q.length === 0) continue
    const prevIndex = q.shift()!
    if (prevIndex !== nextIndex) {
      return true
    }
  }

  return false
}

const hasStableTrackByKeys = (items: ReadonlyArray<unknown>, trackBy: string): boolean =>
  items.every((item) => readTrackBy(item, trackBy) !== undefined)

const isSameTrackBySequence = (
  prevItems: ReadonlyArray<unknown>,
  nextItems: ReadonlyArray<unknown>,
  trackBy: string,
): boolean => {
  if (prevItems.length !== nextItems.length) return false
  for (let i = 0; i < prevItems.length; i++) {
    if (!Object.is(readTrackBy(prevItems[i], trackBy), readTrackBy(nextItems[i], trackBy))) {
      return false
    }
  }
  return true
}

const reconcileIds = (
  prev: ListState | undefined,
  nextItems: ReadonlyArray<unknown>,
  trackBy?: string,
  makeRowId?: () => RowId,
): { readonly ids: ReadonlyArray<RowId>; readonly removed: ReadonlyArray<RowId> } => {
  const nextRowId =
    makeRowId ??
    (() => {
      let rowSeq = 0
      return () => {
        rowSeq += 1
        return `r${rowSeq}`
      }
    })()

  if (!prev) {
    return {
      ids: nextItems.map(() => nextRowId()),
      removed: [],
    }
  }

  if (prev.itemsRef === nextItems) {
    return {
      ids: prev.ids,
      removed: [],
    }
  }

  // Important: keep RowId stable under "non-structural changes" (field updates / object clones only),
  // otherwise in-flight state and caches would be invalidated needlessly.
  const sameLength = prev.itemsRef.length === nextItems.length
  if (sameLength) {
    // trackBy case: if the key sequence is identical, we can reuse old ids;
    // otherwise we must reconcile by key (avoid misclassifying clone+reorder as "no reorder").
    if (trackBy) {
      const canUseKeys = hasStableTrackByKeys(prev.itemsRef, trackBy) && hasStableTrackByKeys(nextItems, trackBy)
      if (canUseKeys) {
        if (isSameTrackBySequence(prev.itemsRef, nextItems, trackBy)) {
          return {
            ids: prev.ids,
            removed: [],
          }
        }
      } else {
        // If trackBy keys are not available, fall back to reference-level detection (keep stability for "cloned but not reordered").
        if (!didReorderByReference(prev.itemsRef, nextItems)) {
          return {
            ids: prev.ids,
            removed: [],
          }
        }
      }
    } else if (!didReorderByReference(prev.itemsRef, nextItems)) {
      return {
        ids: prev.ids,
        removed: [],
      }
    }
  }

  const keyOf = (item: unknown): unknown => {
    if (!trackBy) return item
    const k = readTrackBy(item, trackBy)
    return k !== undefined ? k : item
  }

  const buckets = new Map<unknown, Array<RowId>>()
  for (let i = 0; i < prev.itemsRef.length; i++) {
    const key = keyOf(prev.itemsRef[i])
    const list = buckets.get(key) ?? []
    list.push(prev.ids[i]!)
    buckets.set(key, list)
  }

  const ids: Array<RowId> = []
  for (let i = 0; i < nextItems.length; i++) {
    const key = keyOf(nextItems[i])
    const list = buckets.get(key)
    if (list && list.length > 0) {
      ids.push(list.shift()!)
    } else {
      ids.push(nextRowId())
    }
  }

  const removed: Array<RowId> = []
  for (const list of buckets.values()) {
    removed.push(...list)
  }

  return { ids, removed }
}

const buildIndexById = (ids: ReadonlyArray<RowId>): ReadonlyMap<RowId, number> => {
  const map = new Map<RowId, number>()
  for (let i = 0; i < ids.length; i++) {
    map.set(ids[i]!, i)
  }
  return map
}

export class RowIdStore {
  private readonly lists = new Map<string, ListState>()
  private readonly removalListeners = new Map<string, Set<ListRemovalListener>>()
  private readonly rowIdIndex = new Map<
    RowId,
    { readonly key: string; readonly listPath: string; readonly index: number }
  >()
  private nextRowSeq = 0

  constructor(private readonly instanceId?: string) {}

  private listKey = (listPath: string, parentRowId?: RowId): string =>
    parentRowId ? `${listPath}@@${parentRowId}` : listPath

  private makeRowId = (): RowId => {
    this.nextRowSeq += 1
    return this.instanceId ? `${this.instanceId}::r${this.nextRowSeq}` : `r${this.nextRowSeq}`
  }

  private notifyRemoved(listPath: string, rowId: RowId): void {
    const listeners = this.removalListeners.get(listPath)
    if (!listeners || listeners.size === 0) return
    for (const fn of listeners) {
      try {
        fn(rowId)
      } catch {
        // listener failures should never break runtime behavior
      }
    }
  }

  private removeDescendants(parentRowId: RowId): void {
    const keys: Array<string> = []
    for (const [k, st] of this.lists.entries()) {
      if (st.parentRowId === parentRowId) keys.push(k)
    }

    for (const key of keys) {
      const st = this.lists.get(key)
      if (!st) continue
      this.lists.delete(key)
      for (let i = 0; i < st.ids.length; i++) {
        const rowId = st.ids[i]!
        this.rowIdIndex.delete(rowId)
        this.notifyRemoved(st.listPath, rowId)
        this.removeDescendants(rowId)
      }
    }
  }

  onRemoved(listPath: string, listener: ListRemovalListener): () => void {
    const set = this.removalListeners.get(listPath) ?? new Set<ListRemovalListener>()
    set.add(listener)
    this.removalListeners.set(listPath, set)
    return () => {
      const current = this.removalListeners.get(listPath)
      if (!current) return
      current.delete(listener)
      if (current.size === 0) this.removalListeners.delete(listPath)
    }
  }

  getRowId(listPath: string, index: number, parentRowId?: RowId): RowId | undefined {
    const state = this.lists.get(this.listKey(listPath, parentRowId))
    return state ? state.ids[index] : undefined
  }

  getIndex(listPath: string, rowId: RowId): number | undefined {
    const info = this.rowIdIndex.get(rowId)
    if (!info) return undefined
    if (info.listPath !== listPath) return undefined
    return info.index
  }

  /**
   * ensureList：
   * - Align RowID mapping for the given listPath with the current items.
   * - Returns the latest ids (index -> RowId).
   */
  ensureList(
    listPath: string,
    items: ReadonlyArray<unknown>,
    trackBy?: string,
    parentRowId?: RowId,
  ): ReadonlyArray<RowId> {
    const key = this.listKey(listPath, parentRowId)
    const prev = this.lists.get(key)
    const { ids, removed } = reconcileIds(prev, items, trackBy ?? prev?.trackBy, this.makeRowId)

    const next: ListState = {
      listPath,
      parentRowId,
      itemsRef: items,
      ids,
      indexById: buildIndexById(ids),
      trackBy: trackBy ?? prev?.trackBy,
    }
    this.lists.set(key, next)

    if (removed.length > 0) {
      for (const rowId of removed) {
        this.rowIdIndex.delete(rowId)
        this.notifyRemoved(listPath, rowId)
        this.removeDescendants(rowId)
      }
    }

    // Refresh the reverse rowId -> index mapping (index changes are allowed).
    for (let i = 0; i < ids.length; i++) {
      const rowId = ids[i]!
      this.rowIdIndex.set(rowId, { key, listPath, index: i })
    }

    return ids
  }

  /**
   * updateAll：
   * - After each commit, align RowID mappings for all known lists.
   * - configs come from list declarations in StateTraitProgram.spec (may include trackBy).
   */
  updateAll(state: unknown, configs: ReadonlyArray<ListConfig>): void {
    const cfgByPath = new Map<string, ListConfig>()
    const paths: Array<string> = []
    for (const cfg of configs) {
      if (!cfg || typeof cfg.path !== 'string') continue
      const p = cfg.path.trim()
      if (!p) continue
      cfgByPath.set(p, cfg)
      paths.push(p)
    }

    const pathSet = new Set(paths)

    const parentOf = (path: string): string | undefined => {
      const segments = path.split('.').filter(Boolean)
      let best: string | undefined
      for (let i = 1; i < segments.length; i++) {
        const prefix = segments.slice(0, i).join('.')
        if (pathSet.has(prefix)) best = prefix
      }
      return best
    }

    const parentByPath = new Map<string, string | undefined>()
    const suffixByPath = new Map<string, string>()
    const childrenByParent = new Map<string | undefined, Array<string>>()

    for (const path of paths) {
      const parent = parentOf(path)
      parentByPath.set(path, parent)
      const suffix = parent ? path.slice(parent.length + 1) : path
      suffixByPath.set(path, suffix)
      const list = childrenByParent.get(parent) ?? []
      list.push(path)
      childrenByParent.set(parent, list)
    }

    // roots first (and deterministic traversal)
    const roots = (childrenByParent.get(undefined) ?? []).slice().sort()

    const visit = (listPath: string, parentRowId: RowId | undefined, listValue: unknown): void => {
      const cfg = cfgByPath.get(listPath)
      const items = Array.isArray(listValue) ? (listValue as ReadonlyArray<unknown>) : []
      const ids = this.ensureList(listPath, items, cfg?.trackBy, parentRowId)

      const children = (childrenByParent.get(listPath) ?? []).slice().sort()
      if (children.length === 0) return

      for (let i = 0; i < items.length; i++) {
        const row = items[i]
        const rowId = ids[i]
        if (!rowId) continue
        for (const childPath of children) {
          const suffix = suffixByPath.get(childPath) ?? ''
          const childValue = suffix ? getAtPath(row as any, suffix) : undefined
          visit(childPath, rowId, childValue)
        }
      }
    }

    for (const root of roots) {
      const value = getAtPath(state as any, root)
      visit(root, undefined, value)
    }
  }
}

export const collectListConfigs = (spec: Record<string, unknown>): ReadonlyArray<ListConfig> => {
  const configs: Array<ListConfig> = []
  for (const key in spec) {
    if (!Object.prototype.hasOwnProperty.call(spec, key)) continue
    const raw = spec[key]
    if (!raw || typeof raw !== 'object') continue
    const tag = (raw as any)._tag
    if (tag !== 'StateTraitList') continue
    const trackBy = (raw as any).identityHint?.trackBy
    configs.push({
      path: key,
      trackBy: typeof trackBy === 'string' ? trackBy : undefined,
    })
  }
  return configs
}
