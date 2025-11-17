export type FieldPath = ReadonlyArray<string>
export type FieldPathId = number

export type DirtyAllReason = 'unknownWrite' | 'customMutation' | 'nonTrackablePatch' | 'fallbackPolicy'

export type PatchReason =
  | 'reducer'
  | 'trait-computed'
  | 'trait-link'
  | 'source-refresh'
  | 'devtools'
  | 'perf'
  | 'unknown'

export const normalizePatchReason = (reason: unknown): PatchReason => {
  switch (reason) {
    case 'reducer':
    case 'trait-computed':
    case 'trait-link':
    case 'source-refresh':
    case 'devtools':
    case 'perf':
    case 'unknown':
      return reason
    default:
      return typeof reason === 'string' && reason.startsWith('source:') ? 'source-refresh' : 'unknown'
  }
}

export interface DirtySet {
  readonly dirtyAll: boolean
  /**
   * dirtyAll=true 时必须提供稳定原因码；dirtyAll=false 时应省略。
   */
  readonly reason?: DirtyAllReason
  /**
   * FieldPathId（Static IR table index）。
   * - dirtyAll=true 时必须为空数组；
   * - dirtyAll=false 时为去重/prefix-free/稳定排序后的 roots。
   */
  readonly rootIds: ReadonlyArray<FieldPathId>
  readonly rootCount: number
  readonly keySize: number
  readonly keyHash: number
  /**
   * 可选：当输出被 TopK 裁剪（light/full）时标记裁剪。
   * 注意：裁剪不影响 keyHash/keySize/rootCount 的口径（仍指完整 roots）。
   */
  readonly rootIdsTruncated?: boolean
}

interface FieldPathTrieNode {
  id?: FieldPathId
  children: Map<string, FieldPathTrieNode>
}

export interface FieldPathIdRegistry {
  readonly fieldPaths: ReadonlyArray<FieldPath>
  readonly root: FieldPathTrieNode
  /**
   * Fast path: direct lookup for common string inputs (e.g. 'a.b').
   *
   * Note: This map is only safe for "dot-separated" paths. If a schema key itself contains '.',
   * it is ambiguous with nested paths and should not rely on string-path APIs.
   */
  readonly pathStringToId?: ReadonlyMap<string, FieldPathId>
}

export const isFieldPathSegment = (seg: string): boolean => {
  if (!seg) return false
  if (seg === '*') return false
  if (/^\d+$/.test(seg)) return false
  if (seg.includes('[') || seg.includes(']')) return false
  return true
}

export const normalizeFieldPath = (input: string | FieldPath): FieldPath | undefined => {
  if (typeof input === 'string') {
    const segs = splitSegments(input)
    if (!segs || segs.length === 0) return undefined
    const normalized = segs.filter(isFieldPathSegment)
    return normalized.length > 0 ? normalized : undefined
  }

  if (input.length === 0) return undefined

  let needsFilter = false
  for (const seg of input) {
    if (!isFieldPathSegment(seg)) {
      needsFilter = true
      break
    }
  }

  if (!needsFilter) return input

  const normalized = input.filter(isFieldPathSegment)
  return normalized.length > 0 ? normalized : undefined
}

export const compareFieldPath = (a: FieldPath, b: FieldPath): number => {
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const as = a[i]!
    const bs = b[i]!
    if (as === bs) continue
    return as < bs ? -1 : 1
  }
  return a.length - b.length
}

export const isPrefixOf = (prefix: FieldPath, full: FieldPath): boolean => {
  if (prefix.length > full.length) return false
  for (let i = 0; i < prefix.length; i++) {
    if (prefix[i] !== full[i]) return false
  }
  return true
}

export const toKey = (path: FieldPath): string => JSON.stringify(path)

export const toPathString = (path: FieldPath): string => path.join('.')

export const canonicalizeRoots = (roots: Iterable<FieldPath>): ReadonlyArray<FieldPath> => {
  const byKey = new Map<string, FieldPath>()
  for (const root of roots) {
    const key = toKey(root)
    if (!byKey.has(key)) byKey.set(key, root)
  }

  const sorted = Array.from(byKey.values()).sort(compareFieldPath)
  const out: Array<FieldPath> = []
  for (const next of sorted) {
    const prev = out[out.length - 1]
    if (prev && isPrefixOf(prev, next)) {
      continue
    }
    out.push(next)
  }
  return out
}

export const canonicalizeRootsFast = (roots: Iterable<FieldPath>): ReadonlyArray<FieldPath> => {
  const sorted = Array.from(roots).sort(compareFieldPath)
  const out: Array<FieldPath> = []
  for (const next of sorted) {
    const prev = out[out.length - 1]
    if (prev && isPrefixOf(prev, next)) continue
    out.push(next)
  }
  return out
}

export const makeFieldPathIdRegistry = (fieldPaths: ReadonlyArray<FieldPath>): FieldPathIdRegistry => {
  const root: FieldPathTrieNode = { children: new Map() }
  const pathStringToId = new Map<string, FieldPathId>()
  const ambiguousPathStrings = new Set<string>()

  for (let id = 0; id < fieldPaths.length; id++) {
    const path = fieldPaths[id]!
    let node = root
    for (const seg of path) {
      const children = node.children
      let next = children.get(seg)
      if (!next) {
        next = { children: new Map() }
        children.set(seg, next)
      }
      node = next
    }
    node.id = id

    if (path.length > 0 && path.some((seg) => seg.includes('.'))) {
      const key = path.join('.')
      ambiguousPathStrings.add(key)
      pathStringToId.delete(key)
    }

    if (path.length > 0 && path.every((seg) => !seg.includes('.') && !seg.includes('[') && !seg.includes(']'))) {
      const key = path.join('.')
      if (ambiguousPathStrings.has(key)) continue
      if (pathStringToId.has(key)) {
        ambiguousPathStrings.add(key)
        pathStringToId.delete(key)
        continue
      }
      pathStringToId.set(key, id)
    }
  }

  return { fieldPaths, root, pathStringToId }
}

export const getFieldPathId = (registry: FieldPathIdRegistry, path: FieldPath): FieldPathId | undefined => {
  let node = registry.root
  for (const seg of path) {
    const next = node.children.get(seg)
    if (!next) return undefined
    node = next
  }
  return node.id
}

export const getFieldPathIdFromString = (registry: FieldPathIdRegistry, path: string): FieldPathId | undefined => {
  if (!path || path === '*') return undefined
  const normalized = normalizeFieldPath(path)
  if (!normalized) return undefined
  return getFieldPathId(registry, normalized)
}

export const hashFieldPathIds = (ids: ReadonlyArray<number>): number => {
  // FNV-1a (32-bit)
  let hash = 2166136261 >>> 0
  for (const id of ids) {
    hash ^= id >>> 0
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export const dirtyPathsToRootIds = (options: {
  readonly dirtyPaths?: Iterable<string | FieldPath | FieldPathId>
  readonly registry: FieldPathIdRegistry
  readonly dirtyAllReason?: DirtyAllReason
}): DirtySet => {
  if (options.dirtyAllReason) {
    return {
      dirtyAll: true,
      reason: options.dirtyAllReason,
      rootIds: [],
      rootCount: 0,
      keySize: 0,
      keyHash: 0,
    }
  }

  let sawStar = false
  let hasInvalid = false
  let missing = false

  const ids: Array<number> = []
  for (const raw of options.dirtyPaths ?? []) {
    if (raw === '*') {
      sawStar = true
      continue
    }

    if (typeof raw === 'number') {
      if (!Number.isFinite(raw)) {
        hasInvalid = true
        continue
      }
      const id = Math.floor(raw)
      if (id < 0) {
        hasInvalid = true
        continue
      }
      if (!options.registry.fieldPaths[id]) {
        missing = true
        continue
      }
      ids.push(id)
      continue
    }

    if (typeof raw === 'string') {
      const direct = options.registry.pathStringToId?.get(raw)
      if (direct != null) {
        ids.push(direct)
        continue
      }

      // String path is treated as dot-separated boundary input only.
      // If it cannot be mapped directly, it is considered ambiguous/unmappable.
      missing = true
      continue
    }

    const normalized = normalizeFieldPath(raw)
    if (!normalized) {
      hasInvalid = true
      continue
    }

    const id = getFieldPathId(options.registry, normalized)
    if (id == null) {
      missing = true
      continue
    }
    ids.push(id)
  }

  if (hasInvalid) {
    return {
      dirtyAll: true,
      reason: 'nonTrackablePatch',
      rootIds: [],
      rootCount: 0,
      keySize: 0,
      keyHash: 0,
    }
  }

  if (missing) {
    return {
      dirtyAll: true,
      reason: 'fallbackPolicy',
      rootIds: [],
      rootCount: 0,
      keySize: 0,
      keyHash: 0,
    }
  }

  // 任一不可追踪写入都必须显式降级（禁止在 roots 存在时“忽略 *”）。
  if (sawStar) {
    return {
      dirtyAll: true,
      reason: 'unknownWrite',
      rootIds: [],
      rootCount: 0,
      keySize: 0,
      keyHash: 0,
    }
  }

  const fieldPathsById = options.registry.fieldPaths
  ids.sort((a, b) => {
    const ap = fieldPathsById[a]
    const bp = fieldPathsById[b]
    if (!ap || !bp) return a - b
    const cmp = compareFieldPath(ap, bp)
    return cmp !== 0 ? cmp : a - b
  })

  const rootIds: Array<number> = []
  let prev: FieldPath | undefined
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]!
    const path = fieldPathsById[id]
    if (!path) continue
    if (prev && isPrefixOf(prev, path)) continue
    rootIds.push(id)
    prev = path
  }

  const hasSpecific = rootIds.length > 0

  if (!hasSpecific) {
    return {
      dirtyAll: true,
      reason: 'unknownWrite',
      rootIds: [],
      rootCount: 0,
      keySize: 0,
      keyHash: 0,
    }
  }

  rootIds.sort((a, b) => a - b)

  const keyHash = hashFieldPathIds(rootIds)
  return {
    dirtyAll: false,
    rootIds,
    rootCount: rootIds.length,
    keySize: rootIds.length,
    keyHash,
  }
}

const splitSegments = (path: string): Array<string> | undefined => {
  if (!path) return undefined
  if (path === '*') return undefined

  const parts = path.split('.').filter((p) => p.length > 0)
  const segs: Array<string> = []

  for (const part of parts) {
    if (!part) continue
    if (part === '*') {
      return undefined
    }
    if (part.endsWith('[]')) {
      const base = part.slice(0, -2)
      if (base) segs.push(base)
      continue
    }
    const bracket = /^(.+)\[(\d+)\]$/.exec(part)
    if (bracket) {
      segs.push(bracket[1]!)
      continue
    }
    if (/^\d+$/.test(part)) {
      continue
    }
    if (part.includes('[') || part.includes(']')) {
      return undefined
    }
    segs.push(part)
  }

  return segs
}
