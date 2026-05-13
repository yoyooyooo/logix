import {
  dirtyPathIdsToRootIds,
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
  TxnDirtyEvidence,
  TxnDirtyEvidenceSnapshot,
  TxnDirtyEvidenceSnapshotList,
  TxnDirtyPlanSnapshot,
} from './StateTransaction.js'
import {
  countDirtyAllFallbackP1Gate,
  countDirtyPlanListIndexInt32Materialize,
  countDirtyPlanRawPathArrayMaterialize,
  countDirtyPlanRootInt32Materialize,
  countJoinSplitInTxnWindow,
} from './txnHotPathSentinels.js'

const MAX_INFERRED_LIST_INDICES = 64
const EMPTY_DIRTY_PATH_IDS: ReadonlyArray<FieldPathId> = []
const EMPTY_ROOT_IDS = new Int32Array(0)
const EMPTY_STRING_SET: ReadonlySet<string> = new Set()
const EMPTY_INDEX_BINDINGS: ReadonlyMap<string, ReadonlySet<number>> = new Map()
const EMPTY_INDEX_BINDINGS_SORTED: ReadonlyMap<string, Int32Array> = new Map()

const toListInstanceKey = (listPath: string, parentIndexPathKey: string): string =>
  parentIndexPathKey.length === 0 ? `${listPath}@@` : `${listPath}@@${parentIndexPathKey}`

const invalidateDirtyPlanCache = <S>(state: StateTxnState<S>): void => {
  state.dirtyPlanCache = undefined
}

const bumpDirtyVersion = <S>(state: StateTxnState<S>): void => {
  state.dirtyVersion += 1
  invalidateDirtyPlanCache(state)
}

const bumpListEvidenceVersion = <S>(state: StateTxnState<S>): void => {
  state.listEvidenceVersion += 1
  invalidateDirtyPlanCache(state)
}

const setDirtyAllReason = <S>(state: StateTxnState<S>, reason: DirtyAllReason): void => {
  if (state.dirtyAllReason === reason) return
  state.dirtyAllReason = reason
  bumpDirtyVersion(state)
}

const addRootTouched = <S>(state: StateTxnState<S>, key: string): void => {
  const before = state.listRootTouched.size
  state.listRootTouched.add(key)
  if (state.listRootTouched.size !== before) {
    bumpListEvidenceVersion(state)
  }
}

const addIndexEvidence = <S>(state: StateTxnState<S>, key: string, idx: number): void => {
  const set = state.listIndexEvidence.get(key) ?? new Set<number>()
  const before = set.size
  set.add(idx)
  if (!state.listIndexEvidence.has(key)) {
    state.listIndexEvidence.set(key, set)
  }
  if (set.size !== before) {
    bumpListEvidenceVersion(state)
  }
}

const addItemTouched = <S>(state: StateTxnState<S>, key: string, idx: number): void => {
  const set = state.listItemTouched.get(key) ?? new Set<number>()
  const before = set.size
  set.add(idx)
  if (!state.listItemTouched.has(key)) {
    state.listItemTouched.set(key, set)
  }
  if (set.size !== before) {
    bumpListEvidenceVersion(state)
  }
}

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
      addRootTouched(state, toListInstanceKey(path, ''))
    }
    return
  }

  let listPath = ''
  let parentIndexPathKey = ''
  let endedWithNumeric = false

  countJoinSplitInTxnWindow()
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
          addIndexEvidence(state, key, idx)

          if (i === parts.length - 1) {
            addItemTouched(state, key, idx)
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
        addIndexEvidence(state, key, idx)

        if (i === parts.length - 1) {
          addItemTouched(state, key, idx)
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
    addRootTouched(state, toListInstanceKey(listPath, parentIndexPathKey))
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
        addIndexEvidence(state, key, idx)

        if (i === path.length - 1) {
          addItemTouched(state, key, idx)
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
    addRootTouched(state, toListInstanceKey(listPath, parentIndexPathKey))
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
    typeof state.dirtyPathsKeyHash === 'number' &&
    Number.isFinite(state.dirtyPathsKeyHash)
  ) {
    return {
      dirtyPathIds: state.dirtyPathIdSnapshot,
      dirtyPathsKeyHash: state.dirtyPathsKeyHash,
      dirtyPathsKeySize: state.dirtyPathsKeySize,
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

  state.dirtyPathsKeyHash = hash >>> 0
  state.dirtyPathsKeySize = snapshot.length

  return {
    dirtyPathIds: snapshot,
    dirtyPathsKeyHash: hash >>> 0,
    dirtyPathsKeySize: snapshot.length,
  }
}

const cloneSortedIndexMap = (
  source: ReadonlyMap<string, ReadonlySet<number>>,
): {
  readonly sets: ReadonlyMap<string, ReadonlySet<number>>
  readonly sorted: ReadonlyMap<string, Int32Array>
} => {
  if (source.size === 0) {
    return {
      sets: EMPTY_INDEX_BINDINGS,
      sorted: EMPTY_INDEX_BINDINGS_SORTED,
    }
  }

  const sets = new Map<string, ReadonlySet<number>>()
  const sorted = new Map<string, Int32Array>()
  for (const [key, indices] of source) {
    if (indices.size === 0) continue
    const arr = Array.from(indices).sort((a, b) => a - b)
    sets.set(key, new Set(arr))
    countDirtyPlanListIndexInt32Materialize(arr.length)
    sorted.set(key, Int32Array.from(arr))
  }
  return {
    sets,
    sorted,
  }
}

const cloneStringSet = (set: ReadonlySet<string>): ReadonlySet<string> =>
  set.size === 0 ? EMPTY_STRING_SET : new Set(set)

const snapshotListEvidence = <S>(state: StateTxnState<S>): TxnDirtyEvidenceSnapshotList | undefined => {
  if (!state.listPathSet || state.listPathSet.size === 0) return undefined
  const index = cloneSortedIndexMap(state.listIndexEvidence)
  const item = cloneSortedIndexMap(state.listItemTouched)
  return {
    indexBindings: index.sets,
    indexBindingsSorted: index.sorted,
    rootTouched: cloneStringSet(state.listRootTouched),
    itemTouched: item.sets,
    itemTouchedSorted: item.sorted,
  }
}

const dirtyEvidenceSnapshotFromPlanInternal = (plan: TxnDirtyPlanSnapshot): TxnDirtyEvidenceSnapshot => ({
  dirtyAll: plan.dirtyAll,
  ...(plan.dirtyAllReason ? { dirtyAllReason: plan.dirtyAllReason } : null),
  dirtyPathIds: plan.rawPathIds,
  dirtyPathsKeyHash: plan.rawKeyHash,
  dirtyPathsKeySize: plan.rawKeySize,
  ...(plan.list ? { list: plan.list } : null),
})

export const dirtyEvidenceSnapshotFromPlan = dirtyEvidenceSnapshotFromPlanInternal

export const dirtyEvidenceFromPlan = (plan: TxnDirtyPlanSnapshot): TxnDirtyEvidence => ({
  dirtyAll: plan.dirtyAll,
  ...(plan.dirtyAllReason ? { dirtyAllReason: plan.dirtyAllReason } : null),
  dirtyPathIds: plan.rawPathIds.length === 0 ? new Set() : new Set(plan.rawPathIds),
  dirtyPathsKeyHash: plan.rawKeyHash,
  dirtyPathsKeySize: plan.rawKeySize,
  ...(plan.list ? { list: plan.list } : null),
})

const cacheDirtyPlan = <S>(state: StateTxnState<S>, snapshot: TxnDirtyPlanSnapshot): TxnDirtyPlanSnapshot => {
  state.dirtyPlanCache = {
    dirtyVersion: state.dirtyVersion,
    listEvidenceVersion: state.listEvidenceVersion,
    snapshot,
  }
  return snapshot
}

export const materializeDirtyPlanSnapshot = <S>(state: StateTxnState<S>): TxnDirtyPlanSnapshot => {
  const cached = state.dirtyPlanCache
  if (
    cached &&
    cached.dirtyVersion === state.dirtyVersion &&
    cached.listEvidenceVersion === state.listEvidenceVersion
  ) {
    return cached.snapshot
  }

  const materialized = materializeDirtyPathSnapshotAndKey(state)
  const rawPathIds =
    materialized.dirtyPathIds.length === 0
      ? EMPTY_DIRTY_PATH_IDS
      : (() => {
          countDirtyPlanRawPathArrayMaterialize(materialized.dirtyPathIds.length)
          return Array.from(materialized.dirtyPathIds)
        })()
  const list = snapshotListEvidence(state)
  const registry = state.fieldPathIdRegistry
  const base = {
    rawPathIds,
    rawKeyHash: materialized.dirtyPathsKeyHash,
    rawKeySize: materialized.dirtyPathsKeySize,
    rootIds: EMPTY_ROOT_IDS,
    rootKeyHash: 0,
    rootCount: 0,
    fieldPathCount: registry?.fieldPaths.length ?? 0,
    ...(registry?.fieldPathsKey ? { fieldPathsKey: registry.fieldPathsKey } : null),
    ...(list ? { list } : null),
  }

  if (state.dirtyAllReason) {
    countDirtyAllFallbackP1Gate()
    return cacheDirtyPlan(state, {
      dirtyAll: true,
      dirtyAllReason: state.dirtyAllReason,
      authority: 'dirty-all',
      ...base,
    })
  }

  if (!registry) {
    countDirtyAllFallbackP1Gate()
    return cacheDirtyPlan(state, {
      dirtyAll: true,
      dirtyAllReason: 'fallbackPolicy',
      authority: 'missing-registry',
      ...base,
    })
  }

  if (state.inferReplaceEvidence && materialized.dirtyPathsKeySize === 0) {
    countDirtyAllFallbackP1Gate()
    return cacheDirtyPlan(state, {
      dirtyAll: true,
      dirtyAllReason: 'unknownWrite',
      authority: 'dirty-root-fallback',
      ...base,
    })
  }

  if (materialized.dirtyPathsKeySize === 0 && Object.is(state.draft, state.baseState)) {
    return cacheDirtyPlan(state, {
      dirtyAll: false,
      authority: 'field-path-registry',
      ...base,
    })
  }

  if (materialized.dirtyPathsKeySize === 0) {
    countDirtyAllFallbackP1Gate()
    return cacheDirtyPlan(state, {
      dirtyAll: true,
      dirtyAllReason: 'unknownWrite',
      authority: 'dirty-root-fallback',
      ...base,
    })
  }

  const dirty = dirtyPathIdsToRootIds({
    dirtyPathIds: rawPathIds,
    registry,
    dirtyAllReason: state.dirtyAllReason,
  })

  if (dirty.dirtyAll) {
    return cacheDirtyPlan(state, {
      dirtyAll: true,
      dirtyAllReason: dirty.reason ?? 'unknownWrite',
      authority: 'dirty-root-fallback',
      ...base,
    })
  }

  return cacheDirtyPlan(state, {
    dirtyAll: false,
    authority: 'field-path-registry',
    ...base,
    rootIds: (() => {
      countDirtyPlanRootInt32Materialize(dirty.rootIds.length)
      return Int32Array.from(dirty.rootIds)
    })(),
    rootKeyHash: dirty.keyHash,
    rootCount: dirty.rootCount,
  })
}

export const buildDirtyEvidenceSnapshot = <S>(state: StateTxnState<S>): TxnDirtyEvidenceSnapshot =>
  dirtyEvidenceSnapshotFromPlanInternal(materializeDirtyPlanSnapshot(state))

export const inferReplaceEvidence = <S>(ctx: StateTxnContext<S>, state: StateTxnState<S>, finalState: S): void => {
  if (!state.inferReplaceEvidence) return
  if (state.dirtyAllReason) return

  if (state.inferReplaceEvidenceIfEmpty && state.dirtyPathIds.size > 0) return

  const registry = state.fieldPathIdRegistry
  if (!registry) {
    setDirtyAllReason(state, 'fallbackPolicy')
    return
  }

  const base = state.baseState as any
  const next = finalState as any

  if (!base || !next) {
    setDirtyAllReason(state, 'unknownWrite')
    return
  }
  if (typeof base !== 'object' || typeof next !== 'object') {
    setDirtyAllReason(state, 'unknownWrite')
    return
  }
  if (Array.isArray(base) || Array.isArray(next)) {
    setDirtyAllReason(state, 'unknownWrite')
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
    setDirtyAllReason(state, 'unknownWrite')
  }
}

export const resolveAndRecordDirtyPathId = <S>(
  state: StateTxnState<S>,
  path: StatePatchPath | undefined,
  reason: PatchReason,
): FieldPathId | undefined => {
  if (state.dirtyAllReason) return undefined

  if (path === undefined) {
    setDirtyAllReason(state, 'customMutation')
    return undefined
  }

  if (path === '*') {
    if (reason === 'perf') {
      setDirtyAllReason(state, 'unknownWrite')
      return undefined
    }

    const prevInferReplaceEvidence = state.inferReplaceEvidence
    const prevInferReplaceEvidenceIfEmpty = state.inferReplaceEvidenceIfEmpty
    state.inferReplaceEvidence = true
    if (reason === 'reducer') {
      state.inferReplaceEvidenceIfEmpty = false
    }
    if (
      state.inferReplaceEvidence !== prevInferReplaceEvidence ||
      state.inferReplaceEvidenceIfEmpty !== prevInferReplaceEvidenceIfEmpty
    ) {
      bumpDirtyVersion(state)
    }
    return undefined
  }

  const registry = state.fieldPathIdRegistry
  if (!registry) {
    setDirtyAllReason(state, reason === 'reducer' ? 'customMutation' : 'fallbackPolicy')
    return undefined
  }

  let id: FieldPathId | undefined

  if (typeof path === 'number') {
    if (!Number.isFinite(path)) {
      setDirtyAllReason(state, 'nonTrackablePatch')
      return undefined
    }
    const n = Math.floor(path)
    if (n < 0) {
      setDirtyAllReason(state, 'nonTrackablePatch')
      return undefined
    }
    if (!registry.fieldPaths[n]) {
      setDirtyAllReason(state, 'fallbackPolicy')
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
        setDirtyAllReason(state, 'fallbackPolicy')
        return undefined
      }
    }
  } else {
    const normalized = normalizeFieldPath(path)
    if (!normalized) {
      setDirtyAllReason(state, 'nonTrackablePatch')
      return undefined
    }

    const next = getFieldPathId(registry, normalized)
    if (next == null) {
      setDirtyAllReason(state, 'fallbackPolicy')
      return undefined
    }
    id = next
  }

  const beforeSize = state.dirtyPathIds.size
  state.dirtyPathIds.add(id)
  const afterSize = state.dirtyPathIds.size
  if (afterSize !== state.dirtyPathsKeySize) {
    state.dirtyPathIdSnapshot.push(id)
    let h = (state.dirtyPathsKeyHash ?? (2166136261 >>> 0)) >>> 0
    h ^= id >>> 0
    h = Math.imul(h, 16777619)
    state.dirtyPathsKeyHash = h >>> 0
    state.dirtyPathsKeySize = afterSize
  }
  if (afterSize !== beforeSize) {
    bumpDirtyVersion(state)
  }
  return id
}
