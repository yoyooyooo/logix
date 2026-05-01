import {
  getFieldPathId,
  normalizeFieldPath,
  type DirtyAllReason,
  type FieldPath,
  type FieldPathId,
  type PatchReason,
} from '../../field-path.js'
import type {
  StatePatchPath,
  StateTxnContext,
  StateTxnState,
  TxnDirtyEvidenceSnapshot,
} from './StateTransaction.js'

const MAX_INFERRED_LIST_INDICES = 64
const EMPTY_DIRTY_PATH_IDS: ReadonlyArray<FieldPathId> = []

const toListInstanceKey = (listPath: string, parentIndexPathKey: string): string =>
  parentIndexPathKey.length === 0 ? `${listPath}@@` : `${listPath}@@${parentIndexPathKey}`

const parseNonNegativeIntMaybe = (text: string): number | undefined => {
  if (!text) return undefined
  let n = 0
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    if (c < 48 /* '0' */ || c > 57 /* '9' */) return undefined
    n = n * 10 + (c - 48)
    if (n > 2_147_483_647) return undefined
  }
  return n
}

export const recordListIndexEvidenceFromPathString = <S>(state: StateTxnState<S>, path: string): void => {
  if (state.dirtyAllReason) return
  const listPathSet = state.listPathSet
  if (!listPathSet || listPathSet.size === 0) return
  if (!path || path === '*') return

  const dotIdx = path.indexOf('.')
  const bracketIdx = path.indexOf('[')
  if (dotIdx < 0 && bracketIdx < 0 && path.indexOf(']') < 0) {
    if (listPathSet.has(path)) {
      state.listRootTouched.add(toListInstanceKey(path, ''))
    }
    return
  }

  let listPath = ''
  let parentIndexPathKey = ''
  let endedWithNumeric = false

  const parts = path.split('.')
  for (let i = 0; i < parts.length; i++) {
    const raw = parts[i]
    if (!raw) continue
    const seg = raw
    endedWithNumeric = false

    if (seg.endsWith('[]')) {
      const base = seg.slice(0, -2)
      if (base) {
        listPath = listPath.length === 0 ? base : `${listPath}.${base}`
      }
      continue
    }

    const left = seg.indexOf('[')
    if (left > 0 && seg.endsWith(']')) {
      const base = seg.slice(0, left)
      const inside = seg.slice(left + 1, -1)
      const idx = parseNonNegativeIntMaybe(inside)

      if (base) {
        listPath = listPath.length === 0 ? base : `${listPath}.${base}`
      }

      if (idx !== undefined) {
        if (listPath && listPathSet.has(listPath)) {
          const key = toListInstanceKey(listPath, parentIndexPathKey)
          const set = state.listIndexEvidence.get(key) ?? new Set<number>()
          set.add(idx)
          state.listIndexEvidence.set(key, set)

          if (i === parts.length - 1) {
            const touched = state.listItemTouched.get(key) ?? new Set<number>()
            touched.add(idx)
            state.listItemTouched.set(key, touched)
          }
        }

        parentIndexPathKey = parentIndexPathKey.length === 0 ? String(idx) : `${parentIndexPathKey},${idx}`
        endedWithNumeric = true
      }

      continue
    }

    const idx = parseNonNegativeIntMaybe(seg)
    if (idx !== undefined) {
      if (listPath && listPathSet.has(listPath)) {
        const key = toListInstanceKey(listPath, parentIndexPathKey)
        const set = state.listIndexEvidence.get(key) ?? new Set<number>()
        set.add(idx)
        state.listIndexEvidence.set(key, set)

        if (i === parts.length - 1) {
          const touched = state.listItemTouched.get(key) ?? new Set<number>()
          touched.add(idx)
          state.listItemTouched.set(key, touched)
        }
      }

      parentIndexPathKey = parentIndexPathKey.length === 0 ? String(idx) : `${parentIndexPathKey},${idx}`
      endedWithNumeric = true
      continue
    }

    if (seg.includes('[') || seg.includes(']')) {
      continue
    }

    listPath = listPath.length === 0 ? seg : `${listPath}.${seg}`
  }

  if (!endedWithNumeric && listPath && listPathSet.has(listPath)) {
    state.listRootTouched.add(toListInstanceKey(listPath, parentIndexPathKey))
  }
}

export const recordListIndexEvidenceFromPathArray = <S>(
  state: StateTxnState<S>,
  path: ReadonlyArray<string>,
): void => {
  if (state.dirtyAllReason) return
  const listPathSet = state.listPathSet
  if (!listPathSet || listPathSet.size === 0) return
  if (!path || path.length === 0) return

  let listPath = ''
  let parentIndexPathKey = ''
  let endedWithNumeric = false

  for (let i = 0; i < path.length; i++) {
    const raw = path[i]
    if (!raw) continue

    if (raw.endsWith('[]')) {
      const base = raw.slice(0, -2)
      if (base) {
        listPath = listPath.length === 0 ? base : `${listPath}.${base}`
      }
      endedWithNumeric = false
      continue
    }

    const idx = parseNonNegativeIntMaybe(raw)
    if (idx !== undefined) {
      endedWithNumeric = true

      if (listPath && listPathSet.has(listPath)) {
        const key = toListInstanceKey(listPath, parentIndexPathKey)
        const set = state.listIndexEvidence.get(key) ?? new Set<number>()
        set.add(idx)
        state.listIndexEvidence.set(key, set)

        if (i === path.length - 1) {
          const touched = state.listItemTouched.get(key) ?? new Set<number>()
          touched.add(idx)
          state.listItemTouched.set(key, touched)
        }
      }

      parentIndexPathKey = parentIndexPathKey.length === 0 ? String(idx) : `${parentIndexPathKey},${idx}`
      continue
    }

    if (raw.includes('[') || raw.includes(']') || raw.includes('.')) {
      endedWithNumeric = false
      continue
    }

    endedWithNumeric = false
    listPath = listPath.length === 0 ? raw : `${listPath}.${raw}`
  }

  if (!endedWithNumeric && listPath && listPathSet.has(listPath)) {
    state.listRootTouched.add(toListInstanceKey(listPath, parentIndexPathKey))
  }
}

export const materializeDirtyPathSnapshotAndKey = <S>(state: StateTxnState<S>): {
  readonly dirtyPathIds: ReadonlyArray<FieldPathId>
  readonly dirtyPathsKeyHash: number
  readonly dirtyPathsKeySize: number
} => {
  if (state.dirtyPathIds.size === 0) {
    return {
      dirtyPathIds: EMPTY_DIRTY_PATH_IDS,
      dirtyPathsKeyHash: 0,
      dirtyPathsKeySize: 0,
    }
  }

  if (
    state.dirtyPathIdSnapshot.length === state.dirtyPathIds.size &&
    state.dirtyPathIdSnapshot.length > 0 &&
    typeof state.dirtyPathIdsKeyHash === 'number' &&
    Number.isFinite(state.dirtyPathIdsKeyHash)
  ) {
    return {
      dirtyPathIds: state.dirtyPathIdSnapshot,
      dirtyPathsKeyHash: state.dirtyPathIdsKeyHash,
      dirtyPathsKeySize: state.dirtyPathIdsKeySize,
    }
  }

  const snapshot = state.dirtyPathIdSnapshot
  snapshot.length = 0
  for (const id of state.dirtyPathIds) {
    snapshot.push(id)
  }
  let hash = 2166136261 >>> 0
  for (let i = 0; i < snapshot.length; i++) {
    hash ^= snapshot[i]! >>> 0
    hash = Math.imul(hash, 16777619)
  }

  state.dirtyPathIdsKeyHash = hash >>> 0
  state.dirtyPathIdsKeySize = snapshot.length

  return {
    dirtyPathIds: snapshot,
    dirtyPathsKeyHash: hash >>> 0,
    dirtyPathsKeySize: snapshot.length,
  }
}

export const buildDirtyEvidenceSnapshot = <S>(state: StateTxnState<S>): TxnDirtyEvidenceSnapshot => {
  const registry = state.fieldPathIdRegistry
  const dirtyAllReason = state.dirtyAllReason

  if (registry == null) {
    return {
      dirtyAll: true,
      dirtyAllReason: dirtyAllReason ?? 'fallbackPolicy',
      dirtyPathIds: EMPTY_DIRTY_PATH_IDS,
      dirtyPathsKeyHash: 0,
      dirtyPathsKeySize: 0,
    }
  }

  if (dirtyAllReason != null) {
    return {
      dirtyAll: true,
      dirtyAllReason,
      dirtyPathIds: EMPTY_DIRTY_PATH_IDS,
      dirtyPathsKeyHash: 0,
      dirtyPathsKeySize: 0,
    }
  }

  if (state.dirtyPathIds.size === 0) {
    return {
      dirtyAll: true,
      dirtyAllReason: 'unknownWrite',
      dirtyPathIds: EMPTY_DIRTY_PATH_IDS,
      dirtyPathsKeyHash: 0,
      dirtyPathsKeySize: 0,
    }
  }

  const materialized = materializeDirtyPathSnapshotAndKey(state)
  return {
    dirtyAll: false,
    dirtyPathIds: materialized.dirtyPathIds,
    dirtyPathsKeyHash: materialized.dirtyPathsKeyHash,
    dirtyPathsKeySize: materialized.dirtyPathsKeySize,
  }
}

export const inferReplaceEvidence = <S>(ctx: StateTxnContext<S>, state: StateTxnState<S>, finalState: S): void => {
  if (!state.inferReplaceEvidence) return
  if (state.dirtyAllReason) return

  if (state.inferReplaceEvidenceIfEmpty && state.dirtyPathIds.size > 0) return

  const registry = state.fieldPathIdRegistry
  if (!registry) {
    state.dirtyAllReason = 'fallbackPolicy'
    return
  }

  const base = state.baseState as any
  const next = finalState as any

  if (!base || !next) {
    state.dirtyAllReason = 'unknownWrite'
    return
  }
  if (typeof base !== 'object' || typeof next !== 'object') {
    state.dirtyAllReason = 'unknownWrite'
    return
  }
  if (Array.isArray(base) || Array.isArray(next)) {
    state.dirtyAllReason = 'unknownWrite'
    return
  }

  const pathStringToId = registry.pathStringToId
  const listPathSet = state.listPathSet

  const recordKey = (key: string, prevValue: unknown, nextValue: unknown): void => {
    if (state.dirtyAllReason) return
    if (!key) return

    if (!pathStringToId || !pathStringToId.has(key)) {
      return
    }

    if (listPathSet && listPathSet.has(key)) {
      const instanceKey = toListInstanceKey(key, '')

      if (state.listRootTouched.has(instanceKey)) {
        return
      }

      const prevArr = Array.isArray(prevValue) ? (prevValue as ReadonlyArray<unknown>) : undefined
      const nextArr = Array.isArray(nextValue) ? (nextValue as ReadonlyArray<unknown>) : undefined

      if (!prevArr || !nextArr) {
        ctx.recordPatch(`${key}[]`, 'unknown')
        return
      }

      if (prevArr.length !== nextArr.length) {
        ctx.recordPatch(`${key}[]`, 'unknown')
        return
      }

      let changed = 0
      for (let i = 0; i < prevArr.length; i++) {
        if (Object.is(prevArr[i], nextArr[i])) continue
        changed += 1
        ctx.recordPatch([key, String(i)], 'unknown')

        if (changed > MAX_INFERRED_LIST_INDICES) {
          ctx.recordPatch(`${key}[]`, 'unknown')
          break
        }
      }

      if (changed === 0) {
        ctx.recordPatch(`${key}[]`, 'unknown')
      }

      return
    }

    ctx.recordPatch(key, 'unknown')
  }

  const baseKeys = Object.keys(base)
  for (let i = 0; i < baseKeys.length; i++) {
    const key = baseKeys[i]!
    const prevValue = base[key]
    const nextValue = next[key]
    if (!Object.is(prevValue, nextValue) || !Object.prototype.hasOwnProperty.call(next, key)) {
      recordKey(key, prevValue, nextValue)
    }
  }

  const nextKeys = Object.keys(next)
  for (let i = 0; i < nextKeys.length; i++) {
    const key = nextKeys[i]!
    if (Object.prototype.hasOwnProperty.call(base, key)) continue
    recordKey(key, base[key], next[key])
  }

  if (!state.dirtyAllReason && state.dirtyPathIds.size === 0) {
    state.dirtyAllReason = 'unknownWrite'
  }
}

export const resolveAndRecordDirtyPathId = <S>(
  state: StateTxnState<S>,
  path: StatePatchPath | undefined,
  reason: PatchReason,
): FieldPathId | undefined => {
  if (state.dirtyAllReason) return undefined

  if (path === undefined) {
    state.dirtyAllReason = 'customMutation'
    return undefined
  }

  if (path === '*') {
    if (reason === 'perf') {
      state.dirtyAllReason = 'unknownWrite'
      return undefined
    }

    state.inferReplaceEvidence = true
    if (reason === 'reducer') {
      state.inferReplaceEvidenceIfEmpty = false
    }
    return undefined
  }

  const registry = state.fieldPathIdRegistry
  if (!registry) {
    state.dirtyAllReason = reason === 'reducer' ? 'customMutation' : 'fallbackPolicy'
    return undefined
  }

  let id: FieldPathId | undefined

  if (typeof path === 'number') {
    if (!Number.isFinite(path)) {
      state.dirtyAllReason = 'nonTrackablePatch'
      return undefined
    }
    const n = Math.floor(path)
    if (n < 0) {
      state.dirtyAllReason = 'nonTrackablePatch'
      return undefined
    }
    if (!registry.fieldPaths[n]) {
      state.dirtyAllReason = 'fallbackPolicy'
      return undefined
    }
    id = n
  } else if (typeof path === 'string') {
    const direct = registry.pathStringToId?.get(path)
    if (direct != null) {
      id = direct
    } else {
      const dotIdx = path.indexOf('.')
      const bracketIdx = path.indexOf('[')

      if (dotIdx < 0 && bracketIdx > 0) {
        const base = path.slice(0, bracketIdx)
        const baseDirect = registry.pathStringToId?.get(base)
        if (baseDirect != null) {
          id = baseDirect
        }
      }

      if (id == null) {
        let hasStructuralSyntax = bracketIdx >= 0 || path.indexOf(']') >= 0

        if (!hasStructuralSyntax) {
          for (let i = 0; i < path.length; i++) {
            if (path.charCodeAt(i) !== 46 /* '.' */) continue
            let j = i + 1
            if (j >= path.length) break
            const c = path.charCodeAt(j)
            if (c < 48 /* '0' */ || c > 57 /* '9' */) continue

            while (j < path.length) {
              const d = path.charCodeAt(j)
              if (d < 48 /* '0' */ || d > 57 /* '9' */) break
              j += 1
            }

            if (j === path.length || path.charCodeAt(j) === 46 /* '.' */) {
              hasStructuralSyntax = true
              break
            }

            i = j
          }
        }

        if (hasStructuralSyntax) {
          const normalized = normalizeFieldPath(path)
          if (normalized) {
            const next = getFieldPathId(registry, normalized)
            if (next != null) {
              id = next
            }
          }
        }
      }

      if (id == null) {
        state.dirtyAllReason = 'fallbackPolicy'
        return undefined
      }
    }
  } else {
    const normalized = normalizeFieldPath(path)
    if (!normalized) {
      state.dirtyAllReason = 'nonTrackablePatch'
      return undefined
    }

    const next = getFieldPathId(registry, normalized)
    if (next == null) {
      state.dirtyAllReason = 'fallbackPolicy'
      return undefined
    }
    id = next
  }

  state.dirtyPathIds.add(id)
  const afterSize = state.dirtyPathIds.size
  if (afterSize !== state.dirtyPathIdsKeySize) {
    state.dirtyPathIdSnapshot.push(id)
    let h = (state.dirtyPathIdsKeyHash ?? (2166136261 >>> 0)) >>> 0
    h ^= id >>> 0
    h = Math.imul(h, 16777619)
    state.dirtyPathIdsKeyHash = h >>> 0
    state.dirtyPathIdsKeySize = afterSize
  }
  return id
}
