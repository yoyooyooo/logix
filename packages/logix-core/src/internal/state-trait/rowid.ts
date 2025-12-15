export type RowId = string

export interface ListConfig {
  readonly path: string
  readonly trackBy?: string
}

export type ListRemovalListener = (rowId: RowId) => void

type Segment = string | number

const parseSegments = (path: string): ReadonlyArray<Segment> => {
  if (!path) return []
  return path.split(".").map((seg) =>
    /^[0-9]+$/.test(seg) ? Number(seg) : seg,
  )
}

export const getAtPath = (state: any, path: string): any => {
  if (!path || state == null) return state
  const segments = parseSegments(path)
  let current: any = state
  for (const seg of segments) {
    if (current == null) return undefined
    if (typeof seg === "number") {
      current = Array.isArray(current) ? current[seg] : current[String(seg)]
      continue
    }
    current = current[seg]
  }
  return current
}

export const setAtPathMutating = (draft: any, path: string, value: any): void => {
  if (!path) return
  const segments = parseSegments(path)
  if (segments.length === 0) return

  let current: any = draft
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i]!
    const nextKey = segments[i + 1]!

    const next = current?.[key as any]
    if (next == null || typeof next !== "object") {
      current[key as any] = typeof nextKey === "number" ? [] : {}
    }
    current = current[key as any]
  }

  const last = segments[segments.length - 1]!
  current[last as any] = value
}

export const unsetAtPathMutating = (draft: any, path: string): void => {
  if (!path) return
  const segments = parseSegments(path)
  if (segments.length === 0) return

  let current: any = draft
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i]!
    const next = current?.[key as any]
    if (next == null || typeof next !== "object") {
      return
    }
    current = next
  }

  const last = segments[segments.length - 1]!
  if (Array.isArray(current) && typeof last === "number") {
    current[last] = undefined
    return
  }

  if (current && typeof current === "object") {
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
 * - 识别形如 "items[].profileResource" 的 list.item 字段路径；
 * - 仅支持单层 "[]"，多层嵌套数组在后续阶段再增强。
 */
export const parseListItemFieldPath = (fieldPath: string): ListItemFieldPath | undefined => {
  const idx = fieldPath.indexOf("[]")
  if (idx < 0) return undefined
  if (fieldPath.indexOf("[]", idx + 2) >= 0) return undefined

  const listPath = fieldPath.slice(0, idx)
  const rest = fieldPath.slice(idx + 2)
  const itemPath = rest.startsWith(".") ? rest.slice(1) : rest
  return { listPath, itemPath }
}

export const toListItemValuePath = (
  listPath: string,
  index: number,
  itemPath: string,
): string =>
  itemPath ? `${listPath}.${index}.${itemPath}` : `${listPath}.${index}`

type ListState = {
  readonly itemsRef: ReadonlyArray<unknown>
  readonly ids: ReadonlyArray<RowId>
  readonly indexById: ReadonlyMap<RowId, number>
  readonly trackBy?: string
}

const makeRowId = (): RowId =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

const readTrackBy = (item: unknown, trackBy: string): unknown => {
  if (!item || typeof item !== "object") return undefined
  const segments = trackBy.split(".")
  let current: any = item
  for (const seg of segments) {
    if (current == null) return undefined
    current = current[seg as any]
  }
  return current
}

const didReorderByReference = (
  prevItems: ReadonlyArray<unknown>,
  nextItems: ReadonlyArray<unknown>,
): boolean => {
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

const hasStableTrackByKeys = (
  items: ReadonlyArray<unknown>,
  trackBy: string,
): boolean => items.every((item) => readTrackBy(item, trackBy) !== undefined)

const isSameTrackBySequence = (
  prevItems: ReadonlyArray<unknown>,
  nextItems: ReadonlyArray<unknown>,
  trackBy: string,
): boolean => {
  if (prevItems.length !== nextItems.length) return false
  for (let i = 0; i < prevItems.length; i++) {
    if (
      !Object.is(
        readTrackBy(prevItems[i], trackBy),
        readTrackBy(nextItems[i], trackBy),
      )
    ) {
      return false
    }
  }
  return true
}

const reconcileIds = (
  prev: ListState | undefined,
  nextItems: ReadonlyArray<unknown>,
  trackBy?: string,
): { readonly ids: ReadonlyArray<RowId>; readonly removed: ReadonlyArray<RowId> } => {
  if (!prev) {
    return {
      ids: nextItems.map(() => makeRowId()),
      removed: [],
    }
  }

  if (prev.itemsRef === nextItems) {
    return {
      ids: prev.ids,
      removed: [],
    }
  }

  // 重要：保持 RowId 在“非结构变更”（仅字段更新/对象克隆）下的稳定性，
  // 否则 in-flight / 缓存 会被无意义地失效。
  const sameLength = prev.itemsRef.length === nextItems.length
  if (sameLength) {
    // trackBy 场景：若 key 序列一致，则可直接复用旧 ids；
    // 否则必须走 key-based reconcile（避免 clone + reorder 时误判为“未重排”）。
    if (trackBy) {
      const canUseKeys =
        hasStableTrackByKeys(prev.itemsRef, trackBy) &&
        hasStableTrackByKeys(nextItems, trackBy)
      if (canUseKeys) {
        if (isSameTrackBySequence(prev.itemsRef, nextItems, trackBy)) {
          return {
            ids: prev.ids,
            removed: [],
          }
        }
      } else {
        // trackBy key 不可用时退回到引用级侦测（尽量保持“克隆但不重排”的稳定性）。
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
      ids.push(makeRowId())
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

  getRowId(listPath: string, index: number): RowId | undefined {
    const state = this.lists.get(listPath)
    return state ? state.ids[index] : undefined
  }

  getIndex(listPath: string, rowId: RowId): number | undefined {
    const state = this.lists.get(listPath)
    if (!state) return undefined
    return state.indexById.get(rowId)
  }

  /**
   * ensureList：
   * - 让指定 listPath 的 RowID 映射与当前 items 对齐；
   * - 返回最新的 ids（index -> RowId）。
   */
  ensureList(
    listPath: string,
    items: ReadonlyArray<unknown>,
    trackBy?: string,
  ): ReadonlyArray<RowId> {
    const prev = this.lists.get(listPath)
    const { ids, removed } = reconcileIds(prev, items, trackBy ?? prev?.trackBy)

    const next: ListState = {
      itemsRef: items,
      ids,
      indexById: buildIndexById(ids),
      trackBy: trackBy ?? prev?.trackBy,
    }
    this.lists.set(listPath, next)

    if (removed.length > 0) {
      const listeners = this.removalListeners.get(listPath)
      if (listeners && listeners.size > 0) {
        for (const rowId of removed) {
          for (const fn of listeners) {
            try {
              fn(rowId)
            } catch {
              // listener failures should never break runtime behavior
            }
          }
        }
      }
    }

    return ids
  }

  /**
   * updateAll：
   * - 在每次提交后对齐所有已知 list 的 RowID 映射；
   * - configs 来自 StateTraitProgram.spec 中的 list 声明（可携带 trackBy）。
   */
  updateAll(state: unknown, configs: ReadonlyArray<ListConfig>): void {
    for (const cfg of configs) {
      const value = getAtPath(state as any, cfg.path)
      const items = Array.isArray(value) ? (value as ReadonlyArray<unknown>) : []
      this.ensureList(cfg.path, items, cfg.trackBy)
    }
  }
}

export const collectListConfigs = (spec: Record<string, unknown>): ReadonlyArray<ListConfig> => {
  const configs: Array<ListConfig> = []
  for (const key in spec) {
    if (!Object.prototype.hasOwnProperty.call(spec, key)) continue
    const raw = spec[key]
    if (!raw || typeof raw !== "object") continue
    const tag = (raw as any)._tag
    if (tag !== "StateTraitList") continue
    const trackBy = (raw as any).identityHint?.trackBy
    configs.push({
      path: key,
      trackBy: typeof trackBy === "string" ? trackBy : undefined,
    })
  }
  return configs
}
