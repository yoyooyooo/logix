import { Effect, SubscriptionRef } from 'effect'
import {
  getFieldPathId,
  dirtyPathIdsToRootIds,
  normalizeFieldPath,
  normalizePatchReason,
  type FieldPathIdRegistry,
  type DirtyAllReason,
  type DirtySet,
  type FieldPath,
  type FieldPathId,
  type PatchReason,
} from '../../field-path.js'

export type { PatchReason } from '../../field-path.js'

export type StatePatchPath = string | FieldPath | FieldPathId

export interface TxnPatchRecord {
  readonly opSeq: number
  readonly pathId?: FieldPathId
  readonly reason: PatchReason
  readonly stepId?: number
  readonly traitNodeId?: string
  readonly from?: unknown
  readonly to?: unknown
}

interface MutableTxnPatchRecord {
  opSeq: number
  pathId?: FieldPathId
  reason: PatchReason
  stepId?: number
  traitNodeId?: string
  from?: unknown
  to?: unknown
}

export interface StateTxnOrigin {
  readonly kind: string
  readonly name?: string
  readonly details?: unknown
}

export type StateTxnInstrumentationLevel = 'full' | 'light'

/**
 * TxnListIndexEvidence:
 * - Best-effort list index hints extracted from string patch paths ("value paths") inside the transaction window.
 * - Used by validate/converge to enable list-scope incrementalization even when callers validate by Ref.list(...).
 *
 * Key format must match validate.impl.ts `toListInstanceKey`:
 * - root list: `${listPath}@@`
 * - nested list: `${listPath}@@${parentIndexPath.join(',')}`
 */
export type TxnListIndexEvidence = {
  readonly dirtyAll: boolean
  readonly indexBindings: ReadonlyMap<string, ReadonlySet<number>>
  readonly rootTouched: ReadonlySet<string>
}

export interface StateTxnConfig {
  readonly moduleId?: string
  readonly instanceId?: string
  readonly instrumentation?: StateTxnInstrumentationLevel
  readonly getFieldPathIdRegistry?: () => FieldPathIdRegistry | undefined
  /**
   * Optional: list path set for this module instance (derived from StateTrait.list configs).
   * - When absent/empty, list-index evidence is not recorded (zero overhead for modules without list traits).
   */
  readonly getListPathSet?: () => ReadonlySet<string> | undefined
  /**
   * Whether to capture initial/final state snapshots:
   * - enabled by default in full mode
   * - disabled by default in light mode
   */
  readonly captureSnapshots?: boolean
  /**
   * Time source function (useful for injecting a fake clock in tests).
   */
  readonly now?: () => number
}

export interface StateTransaction<S> {
  readonly txnId: string
  readonly txnSeq: number
  readonly origin: StateTxnOrigin
  readonly startedAt: number
  readonly endedAt: number
  readonly durationMs: number
  readonly dirtySet: DirtySet
  readonly patchCount: number
  readonly patchesTruncated: boolean
  readonly patchesTruncatedReason?: 'max_patches'
  readonly initialStateSnapshot?: S
  readonly finalStateSnapshot?: S
  readonly patches: ReadonlyArray<TxnPatchRecord>
  readonly moduleId?: string
  readonly instanceId?: string
}

export interface StateTransactionCommitResult<S> {
  readonly transaction: StateTransaction<S>
  readonly finalState: S
}

/**
 * StateTxnContext：
 * - Holds transaction state within a single ModuleRuntime.
 * - current is the active transaction (undefined when none).
 *
 * Notes:
 * - The current implementation supports a single active transaction; queueing strategies are added later (US1).
 * - To avoid premature coupling, Context provides only minimal begin/update/record/commit primitives; entry points
 *   (dispatch/source-refresh/devtools) are controlled by higher layers.
 */
export interface StateTxnRuntimeConfig {
  readonly moduleId?: string
  readonly instanceId?: string
  readonly instrumentation: StateTxnInstrumentationLevel
  readonly captureSnapshots: boolean
  readonly now: () => number
  readonly getFieldPathIdRegistry?: () => FieldPathIdRegistry | undefined
  readonly getListPathSet?: () => ReadonlySet<string> | undefined
}

export interface StateTxnContext<S> {
  readonly config: StateTxnRuntimeConfig
  current?: StateTxnState<S>
  nextTxnSeq: number
  readonly scratch: StateTxnState<S>
  /**
   * recordPatch：
   * - makeContext selects the implementation based on instrumentation (full/light).
   * - Avoids branching per patch record inside hot loops (051: branch relocation).
   */
  recordPatch: (
    path: StatePatchPath | undefined,
    reason: PatchReason,
    from?: unknown,
    to?: unknown,
    traitNodeId?: string,
    stepId?: number,
  ) => void
}

interface StateTxnState<S> {
  txnId: string
  txnSeq: number
  origin: StateTxnOrigin
  startedAt: number
  baseState: S
  draft: S
  initialStateSnapshot?: S
  /**
   * listPathSet:
   * - Captured once at transaction start from runtime config.
   * - Used to enable list-index evidence recording only when the module actually declares list traits.
   */
  listPathSet?: ReadonlySet<string>
  readonly patches: Array<TxnPatchRecord>
  patchCount: number
  patchesTruncated: boolean
  fieldPathIdRegistry?: FieldPathIdRegistry
  /**
   * dirtyPathIds：
   * - The set of FieldPathIds for all trackable writes within the transaction window (hot path records only integer anchors).
   * - Any non-mappable/non-trackable write must explicitly degrade to dirtyAll (dirtyAllReason); no silent fallback.
   * - Independent of instrumentation: light mode does not keep patches, but still maintains dirtyPathIds/dirtyAllReason for low-cost semantics (e.g. scheduling/diagnostics).
   */
  readonly dirtyPathIds: Set<FieldPathId>
  /**
   * dirtyPathIdsKeyHash / dirtyPathIdsKeySize:
   * - Incrementally maintained key for the current dirtyPathIds Set (in insertion order),
   *   optimized for ultra-hot converge paths (inline_dirty micro-cache).
   * - Hash: FNV-1a (32-bit) over unique FieldPathIds in Set insertion order.
   * - Size: number of unique ids (mirrors dirtyPathIds.size when no dirtyAllReason).
   */
  dirtyPathIdsKeyHash: number
  dirtyPathIdsKeySize: number
  dirtyAllReason?: DirtyAllReason
  /**
   * listIndexEvidence:
   * - key: listInstanceKey ("<listPath>@@<parentIndexPath>")
   * - value: changed indices for that list instance within the current transaction window.
   */
  readonly listIndexEvidence: Map<string, Set<number>>
  /**
   * listRootTouched:
   * - listInstanceKey set for which a patch directly touched the list root (structure may have changed),
   *   so changedIndices hints must be ignored.
   */
  readonly listRootTouched: Set<string>
}

const MAX_PATCHES_FULL = 256
const EMPTY_DIRTY_PATH_IDS: ReadonlyArray<FieldPathId> = []
const EMPTY_TXN_PATCHES: ReadonlyArray<TxnPatchRecord> = []

interface DirtySetBuildInput {
  readonly registry?: FieldPathIdRegistry
  readonly dirtyAllReason?: DirtyAllReason
  readonly dirtyPathIds?: ReadonlyArray<FieldPathId>
}

const defaultNow = () => {
  const perf = globalThis.performance
  if (perf && typeof perf.now === 'function') {
    return perf.now()
  }
  return Date.now()
}

const normalizePatchStepId = (stepId?: number): number | undefined => {
  if (typeof stepId !== 'number' || !Number.isFinite(stepId) || stepId < 0) {
    return undefined
  }
  return Math.floor(stepId)
}

const toListInstanceKey = (listPath: string, parentIndexPathKey: string): string =>
  parentIndexPathKey.length === 0 ? `${listPath}@@` : `${listPath}@@${parentIndexPathKey}`

const parseNonNegativeIntMaybe = (text: string): number | undefined => {
  if (!text) return undefined
  let n = 0
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    if (c < 48 /* '0' */ || c > 57 /* '9' */) return undefined
    n = n * 10 + (c - 48)
    // Best-effort guard: keep values in a reasonable integer range.
    if (n > 2_147_483_647) return undefined
  }
  return n
}

const recordListIndexEvidenceFromPathString = <S>(state: StateTxnState<S>, path: string): void => {
  if (state.dirtyAllReason) return
  const listPathSet = state.listPathSet
  if (!listPathSet || listPathSet.size === 0) return
  if (!path || path === '*') return

  // Hot path: plain dot/bracket-free path can only contribute list-root touched evidence.
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

    // "foo[]" => list root marker (no index)
    if (seg.endsWith('[]')) {
      const base = seg.slice(0, -2)
      if (base) {
        listPath = listPath.length === 0 ? base : `${listPath}.${base}`
      }
      continue
    }

    // "foo[123]" => list index marker
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
        }

        // Descend into this list item: subsequent nested list bindings should carry this index as parent indexPath.
        parentIndexPathKey = parentIndexPathKey.length === 0 ? String(idx) : `${parentIndexPathKey},${idx}`
        endedWithNumeric = true
      }

      continue
    }

    // ".<digits>" => list index segment
    const idx = parseNonNegativeIntMaybe(seg)
    if (idx !== undefined) {
      if (listPath && listPathSet.has(listPath)) {
        const key = toListInstanceKey(listPath, parentIndexPathKey)
        const set = state.listIndexEvidence.get(key) ?? new Set<number>()
        set.add(idx)
        state.listIndexEvidence.set(key, set)
      }

      parentIndexPathKey = parentIndexPathKey.length === 0 ? String(idx) : `${parentIndexPathKey},${idx}`
      endedWithNumeric = true
      continue
    }

    // Unknown bracket syntax: bail out for this segment (best-effort).
    if (seg.includes('[') || seg.includes(']')) {
      continue
    }

    listPath = listPath.length === 0 ? seg : `${listPath}.${seg}`
  }

  // If the terminal normalized path is a configured list path, treat it as "list root touched" (structure may have changed).
  if (!endedWithNumeric && listPath && listPathSet.has(listPath)) {
    state.listRootTouched.add(toListInstanceKey(listPath, parentIndexPathKey))
  }
}

const buildPatchRecord = (
  opSeq: number,
  pathId: FieldPathId | undefined,
  reason: PatchReason,
  from?: unknown,
  to?: unknown,
  traitNodeId?: string,
  stepId?: number,
): TxnPatchRecord => {
  const record: MutableTxnPatchRecord = {
    opSeq,
    reason: normalizePatchReason(reason),
  }

  if (pathId != null) {
    record.pathId = pathId
  }
  if (from !== undefined) {
    record.from = from
  }
  if (to !== undefined) {
    record.to = to
  }
  if (traitNodeId) {
    record.traitNodeId = traitNodeId
  }

  const normalizedStepId = normalizePatchStepId(stepId)
  if (normalizedStepId !== undefined) {
    record.stepId = normalizedStepId
  }

  return record
}

const captureDirtySetBuildInput = <S>(state: StateTxnState<S>): DirtySetBuildInput => {
  const registry = state.fieldPathIdRegistry
  const dirtyAllReason = state.dirtyAllReason

  if (registry == null) {
    return {
      dirtyAllReason: dirtyAllReason ?? 'fallbackPolicy',
    }
  }

  if (dirtyAllReason != null) {
    return {
      registry,
      dirtyAllReason,
    }
  }

  return {
    registry,
    dirtyPathIds: state.dirtyPathIds.size > 0 ? Array.from(state.dirtyPathIds) : EMPTY_DIRTY_PATH_IDS,
  }
}

const buildDirtySet = (input: DirtySetBuildInput): DirtySet => {
  const registry = input.registry
  if (registry == null) {
    return {
      dirtyAll: true,
      reason: input.dirtyAllReason ?? 'fallbackPolicy',
      rootIds: [],
      rootCount: 0,
      keySize: 0,
      keyHash: 0,
    }
  }

  return dirtyPathIdsToRootIds({
    dirtyPathIds: input.dirtyPathIds,
    registry,
    dirtyAllReason: input.dirtyAllReason,
  })
}

const buildCommittedTransaction = <S>(
  ctx: StateTxnContext<S>,
  state: StateTxnState<S>,
  finalState: S,
  endedAt: number,
): StateTransaction<S> => {
  const { config } = ctx
  const dirtySetInput = captureDirtySetBuildInput(state)
  let dirtySetCache: DirtySet | undefined

  const readDirtySet = (): DirtySet => {
    if (dirtySetCache !== undefined) {
      return dirtySetCache
    }
    const next = buildDirtySet(dirtySetInput)
    dirtySetCache = next
    return next
  }

  return {
    txnId: state.txnId,
    txnSeq: state.txnSeq,
    origin: state.origin,
    startedAt: state.startedAt,
    endedAt,
    durationMs: Math.max(0, endedAt - state.startedAt),
    get dirtySet() {
      return readDirtySet()
    },
    patchCount: state.patchCount,
    patchesTruncated: state.patchesTruncated,
    ...(state.patchesTruncated ? { patchesTruncatedReason: 'max_patches' } : null),
    initialStateSnapshot: state.initialStateSnapshot,
    finalStateSnapshot: config.captureSnapshots ? finalState : undefined,
    patches: config.instrumentation === 'full' ? state.patches.slice() : EMPTY_TXN_PATCHES,
    moduleId: config.moduleId,
    instanceId: config.instanceId,
  }
}

export const makeContext = <S>(config: StateTxnConfig): StateTxnContext<S> => {
  const instrumentation: StateTxnInstrumentationLevel = config.instrumentation ?? 'full'

  const captureSnapshots = config.captureSnapshots ?? instrumentation === 'full'

  const scratch: StateTxnState<S> = {
    txnId: '',
    txnSeq: 0,
    origin: { kind: 'unknown' },
    startedAt: 0,
    baseState: undefined as any,
    draft: undefined as any,
    initialStateSnapshot: undefined,
    listPathSet: undefined,
    patches: [],
    patchCount: 0,
    patchesTruncated: false,
    dirtyPathIds: new Set(),
    dirtyPathIdsKeyHash: 2166136261 >>> 0,
    dirtyPathIdsKeySize: 0,
    dirtyAllReason: undefined,
    listIndexEvidence: new Map(),
    listRootTouched: new Set(),
  }

  const ctx: StateTxnContext<S> = {
    config: {
      instrumentation,
      captureSnapshots,
      now: config.now ?? defaultNow,
      moduleId: config.moduleId,
      instanceId: config.instanceId,
      getFieldPathIdRegistry: config.getFieldPathIdRegistry,
      getListPathSet: config.getListPathSet,
    },
    current: undefined,
    nextTxnSeq: 0,
    scratch,
    recordPatch: () => {},
  }

  const recordPatchLight = (
    path: StatePatchPath | undefined,
    _reason: PatchReason,
    _from?: unknown,
    _to?: unknown,
    _traitNodeId?: string,
    _stepId?: number,
  ): void => {
    const state = ctx.current
    if (!state) return
    state.patchCount += 1
    if (typeof path === 'string') {
      recordListIndexEvidenceFromPathString(state, path)
    }
    resolveAndRecordDirtyPathId(state, path, _reason)
  }

  const recordPatchFull = (
    path: StatePatchPath | undefined,
    reason: PatchReason,
    from?: unknown,
    to?: unknown,
    traitNodeId?: string,
    stepId?: number,
  ): void => {
    const state = ctx.current
    if (!state) return
    state.patchCount += 1
    if (typeof path === 'string') {
      recordListIndexEvidenceFromPathString(state, path)
    }
    const opSeq = state.patchCount - 1
    const pathId = resolveAndRecordDirtyPathId(state, path, reason)
    if (state.patchesTruncated || state.patches.length >= MAX_PATCHES_FULL) {
      state.patchesTruncated = true
      return
    }
    state.patches.push(buildPatchRecord(opSeq, pathId, reason, from, to, traitNodeId, stepId))
  }

  ctx.recordPatch = instrumentation === 'full' ? recordPatchFull : recordPatchLight

  return ctx
}

/**
 * Begins a new transaction:
 * - Default behavior: overrides the current transaction (queueing/nesting are refined in US1).
 * - initialState is provided by the caller (typically the current SubscriptionRef snapshot).
 */
export const beginTransaction = <S>(ctx: StateTxnContext<S>, origin: StateTxnOrigin, initialState: S): void => {
  const { config } = ctx
  const now = config.now
  const startedAt = now()

  ctx.nextTxnSeq += 1
  const txnSeq = ctx.nextTxnSeq
  const anchor = config.instanceId ?? 'unknown'
  const txnId = `${anchor}::t${txnSeq}`

  const initialSnapshot = config.captureSnapshots ? initialState : undefined

  const state = ctx.scratch
  state.txnId = txnId
  state.txnSeq = txnSeq
  state.origin = origin
  state.startedAt = startedAt
  state.baseState = initialState
  state.draft = initialState
  state.initialStateSnapshot = initialSnapshot
  state.patches.length = 0
  state.patchCount = 0
  state.patchesTruncated = false
  state.fieldPathIdRegistry = ctx.config.getFieldPathIdRegistry?.()
  state.dirtyPathIds.clear()
  state.dirtyPathIdsKeyHash = 2166136261 >>> 0
  state.dirtyPathIdsKeySize = 0
  state.dirtyAllReason = undefined
  state.listPathSet = ctx.config.getListPathSet?.()
  state.listIndexEvidence.clear()
  state.listRootTouched.clear()
  ctx.current = state
}

const resolveAndRecordDirtyPathId = <S>(
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
    state.dirtyAllReason = 'unknownWrite'
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
    // Fast path: direct dot-separated lookup.
    const direct = registry.pathStringToId?.get(path)
    if (direct != null) {
      id = direct
    } else {
      // Structural string fallback: support list/index syntax such as:
      // - "b123[456]" / "b123[]"   -> "b123"
      // - "a.0.b" / "a.0.b[3].c"   -> "a.b.c"
      //
      // IMPORTANT: only attempt normalization when the input clearly contains structural syntax
      // (brackets or a numeric segment). This avoids accidentally interpreting literal "." keys
      // (which are intentionally excluded from pathStringToId due to ambiguity).

      const dotIdx = path.indexOf('.')
      const bracketIdx = path.indexOf('[')

      // Extremely hot case in perf boundaries: single-segment "foo[123]" should not allocate.
      if (dotIdx < 0 && bracketIdx > 0) {
        const base = path.slice(0, bracketIdx)
        const baseDirect = registry.pathStringToId?.get(base)
        if (baseDirect != null) {
          id = baseDirect
        }
      }

      if (id == null) {
        let hasStructuralSyntax = bracketIdx >= 0 || path.indexOf(']') >= 0

        // Detect ".<digits>(.|$)" segments without regex allocations.
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
  // Maintain an incremental key for inline_dirty micro-cache without scanning the Set.
  // Only update when the id is newly inserted (Set ignores duplicates but keeps insertion order).
  const afterSize = state.dirtyPathIds.size
  if (afterSize !== state.dirtyPathIdsKeySize) {
    let h = state.dirtyPathIdsKeyHash >>> 0
    h ^= id >>> 0
    h = Math.imul(h, 16777619)
    state.dirtyPathIdsKeyHash = h >>> 0
    state.dirtyPathIdsKeySize = afterSize
  }
  return id
}

/**
 * Updates the draft state:
 * - next is the latest draft.
 * - When instrumentation is full, patch info is recorded into the transaction via recordPatch.
 */
export const updateDraft = <S>(ctx: StateTxnContext<S>, next: S): void => {
  const state = ctx.current
  if (!state) {
    // No active transaction: ignore patch info; higher layers decide whether to start an implicit transaction.
    return
  }

  state.draft = next
}

/**
 * recordPatch：
 * - In full mode, appends a Patch.
 * - In light mode, silently ignores to avoid extra overhead.
 */
export const recordPatch = <S>(
  ctx: StateTxnContext<S>,
  path: StatePatchPath | undefined,
  reason: PatchReason,
  from?: unknown,
  to?: unknown,
  traitNodeId?: string,
  stepId?: number,
): void => {
  ctx.recordPatch(path, reason, from, to, traitNodeId, stepId)
}

export const readListIndexEvidence = <S>(ctx: StateTxnContext<S>): TxnListIndexEvidence | undefined => {
  const state = ctx.current as StateTxnState<S> | undefined
  if (!state) return undefined
  const listPathSet = state.listPathSet
  if (!listPathSet || listPathSet.size === 0) return undefined
  return {
    dirtyAll: state.dirtyAllReason != null,
    indexBindings: state.listIndexEvidence,
    rootTouched: state.listRootTouched,
  }
}

/**
 * commitWithState：
 * - Commits current transaction and returns both aggregated transaction metadata and committed final state.
 * - Used by runtime hot path to avoid an extra stateRef round-trip after commit.
 */
export const commitWithState = <S>(
  ctx: StateTxnContext<S>,
  stateRef: SubscriptionRef.SubscriptionRef<S>,
): Effect.Effect<StateTransactionCommitResult<S> | undefined> =>
  Effect.gen(function* () {
    const state = ctx.current
    if (!state) {
      return undefined
    }

    const { config } = ctx
    const now = config.now

    const finalState = state.draft

    // 0 commit: when there is no change, do not write SubscriptionRef and do not emit state:update.
    if (Object.is(finalState, state.baseState)) {
      ctx.current = undefined
      return undefined
    }

    // Single write to SubscriptionRef: ensures only one external state commit + subscription notification.
    yield* SubscriptionRef.set(stateRef, finalState)

    const endedAt = now()
    const transaction = buildCommittedTransaction(ctx, state, finalState, endedAt)

    // Clear the current transaction.
    ctx.current = undefined

    return {
      transaction,
      finalState,
    }
  })

/**
 * Commits the transaction:
 * - Writes the final draft to SubscriptionRef exactly once.
 * - Returns the aggregated StateTransaction; returns undefined if there is no active transaction.
 *
 * Notes:
 * - Emitting Debug/Devtools events is decided by the caller based on the returned transaction.
 * - This module does not depend on DebugSink to avoid circular dependencies in core.
 */
export const commit = <S>(
  ctx: StateTxnContext<S>,
  stateRef: SubscriptionRef.SubscriptionRef<S>,
): Effect.Effect<StateTransaction<S> | undefined> =>
  commitWithState(ctx, stateRef).pipe(Effect.map((result) => result?.transaction))

/**
 * abort：
 * - Terminates the current transaction and clears context.
 * - Does not write to stateRef.
 * - Higher layers decide whether to record diagnostics/observability events.
 */
export const abort = <S>(ctx: StateTxnContext<S>): void => {
  ctx.current = undefined
}
